import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { abrirCuenta, contarCuentas, habilitarAcceso, registrarCliente } from '../ayudas/bff';
import { crearOperador, eliminarUsuario, esperarALosRealms, type UsuarioDePrueba } from '../ayudas/keycloak';
import {
  URL_DE_LA_APP,
  completarCambioDeClave,
  completarUsuarioYClave,
  conPuntosDeMiles,
  documentoUnico,
  ingresarOtp,
  iniciarSesionConTeclado,
  inscribirOtp,
} from './pasos';

/**
 * RNF-15, recorrido del cliente (plan, sección 7), contra el compose completo con Keycloak real. Es una secuencia:
 * cada prueba parte de lo que dejó la anterior (el estado vive en este archivo), así que corren en serie.
 *
 *   1. Setup: el operador entra (inscribe su OTP) y, por el BFF, registra un cliente, le abre una cuenta COP y habilita
 *      su acceso. Su sesión queda abierta hasta el final: CA-06 la usa como la "víctima" de un ataque CSRF.
 *   2. El cliente, en otro contexto, entra por `/` escribiendo el documento con puntos, cambia la clave e inscribe el OTP.
 *   3. Comprobaciones de CA-05 y RNF-03; después cierra sesión, pulsa atrás y vuelve a entrar con la clave nueva.
 */
test.describe.configure({ mode: 'serial' });

const CLAVE_DEL_OPERADOR = 'Operador-Seguro-2026!';
const CLAVE_NUEVA_DEL_CLIENTE = 'Clave-Nueva-Segura-2026!';
const PATRON_DE_JWT = /eyJ[\w-]+\.eyJ[\w-]+\./;

const numeroDeDocumento = documentoUnico();
let contextoDelOperador: BrowserContext;
let paginaDelOperador: Page;
let contextoDelCliente: BrowserContext;
let paginaDelCliente: Page;
let operador: UsuarioDePrueba;
let secretoDelOperador: string;
let secretoDelCliente: string;
let clienteId: string;
let numeroDeCuenta: string;
let claveTemporal: string;
let instanteDelRegreso = 0;
let milisegundosDelRegreso = Number.POSITIVE_INFINITY;
const cuerposRecibidos: string[] = [];
const violacionesDeCsp: string[] = [];

test.beforeAll(async ({ browser }) => {
  await esperarALosRealms();
  operador = await crearOperador(`op-e2e-${String(Date.now())}`, CLAVE_DEL_OPERADOR);
  contextoDelOperador = await browser.newContext({ baseURL: URL_DE_LA_APP, locale: 'es-CO' });
  paginaDelOperador = await contextoDelOperador.newPage();

  contextoDelCliente = await browser.newContext({ baseURL: URL_DE_LA_APP, locale: 'es-CO' });
  paginaDelCliente = await contextoDelCliente.newPage();
  // CA-05: se guarda el cuerpo de cada respuesta de la propia app (RNF-01). Las redirecciones no tienen cuerpo.
  paginaDelCliente.on('response', (respuesta) => {
    if (respuesta.url().includes('/bff/signin-oidc/clientes')) instanteDelRegreso = Date.now();
    if (!respuesta.url().startsWith(URL_DE_LA_APP)) return;
    void respuesta.text().then(
      (texto) => cuerposRecibidos.push(texto),
      () => undefined,
    );
  });
  // RNF-03: ninguna violación de la CSP durante los recorridos.
  await paginaDelCliente.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (evento) => {
      console.error(`CSP-VIOLACION ${evento.violatedDirective}`);
    });
  });
  paginaDelCliente.on('console', (mensaje) => {
    if (mensaje.text().startsWith('CSP-VIOLACION')) violacionesDeCsp.push(mensaje.text());
  });
});

test.afterAll(async () => {
  await contextoDelCliente.close();
  await contextoDelOperador.close();
  await eliminarUsuario('empleados', operador.sub);
});

test('F004_CA02_OperadorIniciaSesion_LlegaAlInicioDelBackoffice', async () => {
  await paginaDelOperador.goto('/backoffice');

  await iniciarSesionConTeclado(paginaDelOperador);
  await completarUsuarioYClave(paginaDelOperador, operador.nombreDeUsuario, CLAVE_DEL_OPERADOR);
  secretoDelOperador = await inscribirOtp(paginaDelOperador);

  await expect(paginaDelOperador).toHaveURL(/\/backoffice$/);
  await expect(paginaDelOperador.getByText(operador.nombreDeUsuario)).toBeVisible();
  await expect(paginaDelOperador.getByText('Operador', { exact: true })).toBeVisible();
  await expect(paginaDelOperador.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  expect(secretoDelOperador).not.toBe('');
});

test('F004_CA02_OperadorConSesion_PreparaClienteCuentaYAccesoPorElBff', async () => {
  clienteId = await registrarCliente(paginaDelOperador, {
    tipoDocumento: 'CC',
    numeroDocumento: numeroDeDocumento,
    nombres: 'Ana María',
    apellidos: 'Pérez Gómez',
    correo: `ana.${numeroDeDocumento}@example.com`,
    telefono: '+573001234567',
  });
  numeroDeCuenta = await abrirCuenta(paginaDelOperador, clienteId, 'COP');
  claveTemporal = await habilitarAcceso(paginaDelOperador, clienteId);

  expect(clienteId).not.toBe('');
  expect(numeroDeCuenta).not.toBe('');
  expect(claveTemporal).not.toBe('');
});

test('F004_CA03_PrimerIngreso_CambiaClaveInscribeOtpYLlegaAMisCuentas', async () => {
  const pagina = paginaDelCliente;
  await pagina.goto('/');

  await iniciarSesionConTeclado(pagina);
  // CA-17: el documento se escribe con puntos de miles.
  await completarUsuarioYClave(pagina, conPuntosDeMiles(numeroDeDocumento), claveTemporal);
  await completarCambioDeClave(pagina, CLAVE_NUEVA_DEL_CLIENTE);
  secretoDelCliente = await inscribirOtp(pagina);

  await expect(pagina.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
  // RNF-11: desde la respuesta del regreso del inicio de sesión hasta el encabezado "Mis cuentas".
  milisegundosDelRegreso = Date.now() - instanteDelRegreso;
  await expect(pagina).toHaveURL(/\/mis-cuentas$/);
});

test('F004_CA17_DocumentoConPuntos_EntraComoEseCliente', async () => {
  const respuesta = await paginaDelCliente.request.get('/bff/sesion', { headers: { 'X-CSRF': '1' } });
  const sesion = (await respuesta.json()) as { usuario: string; rol: string | null; area: string };

  expect(respuesta.status()).toBe(200);
  expect(sesion.usuario).toContain(numeroDeDocumento);
  expect(sesion.usuario).not.toContain('.');
  expect(sesion.area).toBe('clientes');
  expect(sesion.rol).toBe('Cliente');
});

test('F004_CA18_RecorridoReal_MisCuentasMuestraLaCuentaAbiertaPorElOperador', async () => {
  await expect(paginaDelCliente.getByText(numeroDeCuenta)).toBeVisible();
  await expect(paginaDelCliente.getByText('Activa')).toBeVisible();
  // Una cuenta recién abierta tiene saldo cero, en formato es-CO (sin decimales para COP).
  await expect(paginaDelCliente.getByText(/^\$\s0$/)).toBeVisible();
});

test('F004_RNF11_TrasElRegreso_MisCuentasVisibleEnDosSegundos', () => {
  expect(milisegundosDelRegreso).toBeLessThanOrEqual(2000);
});

test('F004_CA05_ConSesion_NingunTokenLegibleDesdeLaPagina', async () => {
  const pagina = paginaDelCliente;
  await pagina.reload();
  await expect(pagina.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();

  const visibleParaElScript = await pagina.evaluate(() => ({
    cookies: document.cookie,
    local: Object.keys(localStorage),
    sesion: Object.keys(sessionStorage),
  }));

  expect(visibleParaElScript.cookies).not.toMatch(PATRON_DE_JWT);
  expect(visibleParaElScript.cookies).not.toContain('cb-sesion');
  expect(visibleParaElScript.local).toEqual([]);
  expect(visibleParaElScript.sesion).toEqual([]);
  expect(cuerposRecibidos.length).toBeGreaterThan(0);
  expect(cuerposRecibidos.filter((cuerpo) => PATRON_DE_JWT.test(cuerpo))).toEqual([]);
});

test('F004_RNF03_LaAppSeSirveConCsp_SinScriptsEnLinea', async () => {
  const pagina = paginaDelCliente;
  const respuesta = await pagina.goto('/mis-cuentas');
  const encabezados = respuesta?.headers() ?? {};
  await expect(pagina.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
  const violacionesAntesDeInyectar = [...violacionesDeCsp];

  // Un script en línea inyectado en la página no se ejecuta y dispara securitypolicyviolation.
  const inyeccion = await pagina.evaluate(async () => {
    const violacion = new Promise<string>((resolver) => {
      document.addEventListener('securitypolicyviolation', (e) => {
        resolver(e.violatedDirective);
      });
    });
    const script = document.createElement('script');
    script.textContent = 'document.title = "inyectado"';
    document.head.appendChild(script);
    return { directiva: await violacion, titulo: document.title };
  });

  const csp = encabezados['content-security-policy'] ?? '';
  for (const directiva of [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ])
    expect(csp).toContain(directiva);
  expect(encabezados['x-content-type-options']).toBe('nosniff');
  expect(encabezados['referrer-policy']).toBe('no-referrer');
  expect(inyeccion.directiva).toMatch(/^script-src/);
  expect(inyeccion.titulo).not.toBe('inyectado');
  expect(violacionesAntesDeInyectar).toEqual([]);
});

test('F004_CA06_OtroOrigenDelMismoSitio_NoPuedeCambiarDatos', async () => {
  // La víctima es el operador con sesión abierta; el sitio atacante es otro origen del mismo sitio (puerto 5174).
  await paginaDelOperador.bringToFront();
  await paginaDelOperador.mouse.click(2, 2); // una interacción reciente: la sesión del operador sigue viva
  const cuentasAntes = await contarCuentas(paginaDelOperador, clienteId);
  const destino = `${URL_DE_LA_APP}/api/clientes/${clienteId}/cuentas`;
  const paginaAtacante = `<!doctype html><meta charset="utf-8"><title>Sitio atacante</title>
    <form id="f" method="post" action="${destino}"><input name="moneda" value="USD"></form>
    <script>
      window.resultadoDelFetch = 'pendiente';
      fetch(${JSON.stringify(destino)}, {
        method: 'POST', credentials: 'include',
        headers: { 'X-CSRF': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ moneda: 'USD' }),
      }).then(() => { window.resultadoDelFetch = 'enviado'; }, () => { window.resultadoDelFetch = 'bloqueado'; });
    </script>`;
  const servidor: Server = createServer((_peticion, respuesta) => {
    respuesta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(paginaAtacante);
  });
  await new Promise<void>((resolver) => servidor.listen(5174, resolver));
  const atacante = await contextoDelOperador.newPage();

  try {
    await atacante.goto('http://localhost:5174/');
    // 1) Un fetch con el encabezado anti-CSRF desde otro origen lo frena el preflight: no hay CORS.
    await expect
      .poll(() => atacante.evaluate((): unknown => Reflect.get(window, 'resultadoDelFetch') as unknown))
      .toBe('bloqueado');
    // 2) Un formulario sin el encabezado llega al BFF y este lo rechaza sin llamar a la API.
    const [respuestaDelFormulario] = await Promise.all([
      atacante.waitForResponse((r) => r.url().startsWith(destino)),
      atacante.evaluate(() => {
        document.forms[0]?.submit();
      }),
    ]);

    expect(respuestaDelFormulario.status()).toBe(403);
    expect(await respuestaDelFormulario.json()).toMatchObject({ codigo: 'peticion-no-confiable' });
    expect(await contarCuentas(paginaDelOperador, clienteId)).toBe(cuentasAntes);
  } finally {
    await atacante.close();
    await new Promise<void>((resolver) => {
      servidor.close(() => {
        resolver();
      });
    });
  }
});

test('F004_CA12_TrasCerrarSesion_AtrasNoMuestraSaldos', async () => {
  const pagina = paginaDelCliente;
  await pagina.goto('/mis-cuentas');
  await pagina.goto('/mis-cuentas?paso=2');
  await expect(pagina.getByText(numeroDeCuenta)).toBeVisible();
  await pagina.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(pagina).toHaveURL(/aviso=sesion-cerrada/);

  await pagina.goBack();

  await expect(pagina.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(pagina.getByText(numeroDeCuenta)).toHaveCount(0);
  await expect(pagina.getByText(/^\$\s0$/)).toHaveCount(0);
});

test('F004_CA01_ClienteIniciaSesionConOtp_VeMisCuentasYAlSalirPideCredenciales', async () => {
  const pagina = paginaDelCliente;
  await pagina.goto('/');

  await iniciarSesionConTeclado(pagina);
  // Keycloak pide usuario y clave otra vez: la sesión anterior no se reabre (CL-09).
  await expect(pagina.locator('input[name="username"]')).toBeVisible();
  await completarUsuarioYClave(pagina, conPuntosDeMiles(numeroDeDocumento), CLAVE_NUEVA_DEL_CLIENTE);
  await ingresarOtp(pagina, secretoDelCliente);
  await expect(pagina.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
  await expect(pagina.getByText(numeroDeCuenta)).toBeVisible();
  await pagina.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(pagina).toHaveURL(/aviso=sesion-cerrada/);

  // Después de cerrar, volver a entrar pide credenciales otra vez.
  await iniciarSesionConTeclado(pagina);
  await expect(pagina.locator('input[name="username"]')).toBeVisible();
  await expect(pagina.locator('input[name="password"]')).toBeVisible();
});

test('F004_CA35_PantallaDeLoginDeKeycloak_SinFallosAA', async () => {
  // La prueba anterior dejó la página en el login de Keycloak.
  await expect(paginaDelCliente.locator('input[name="username"]')).toBeVisible();

  const resultado = await new AxeBuilder({ page: paginaDelCliente })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
