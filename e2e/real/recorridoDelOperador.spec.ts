import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { abrirCuenta, registrarCliente } from '../ayudas/bff';
import { crearOperador, eliminarUsuario, esperarALosRealms, type UsuarioDePrueba } from '../ayudas/keycloak';
import {
  URL_DE_LA_APP,
  completarUsuarioYClave,
  conPuntosDeMiles,
  documentoUnico,
  inscribirOtp,
  iniciarSesionConTeclado,
} from './pasos';

/**
 * RNF-15, recorrido del operador (plan, sección 7), contra el compose completo con Keycloak real: el operador inicia
 * sesión, busca al cliente escribiendo su documento con puntos, abre la ficha, bloquea la cuenta Activa y la ficha la
 * muestra Bloqueada (CA-33). Es una secuencia: cada prueba parte de lo que dejó la anterior, así que corren en serie.
 *
 *   1. El operador entra por /backoffice (inscribe su OTP).
 *   2. Por el BFF, con su sesión, registra un cliente CC y le abre una cuenta COP (los datos del escenario).
 *   3. Busca el documento con puntos, abre la ficha y bloquea la cuenta.
 */
test.describe.configure({ mode: 'serial' });

const CLAVE_DEL_OPERADOR = 'Operador-Seguro-2026!';

const numeroDeDocumento = documentoUnico();
let contexto: BrowserContext;
let pagina: Page;
let operador: UsuarioDePrueba;
let clienteId: string;
let numeroDeCuenta: string;

test.beforeAll(async ({ browser }) => {
  await esperarALosRealms();
  operador = await crearOperador(`op-e2e-b-${String(Date.now())}`, CLAVE_DEL_OPERADOR);
  contexto = await browser.newContext({ baseURL: URL_DE_LA_APP, locale: 'es-CO' });
  pagina = await contexto.newPage();
});

test.afterAll(async () => {
  await contexto.close();
  await eliminarUsuario('empleados', operador.sub);
});

test('F004_CA33_OperadorIniciaSesion_LlegaALaBusquedaDeClientes', async () => {
  await pagina.goto('/backoffice');

  await iniciarSesionConTeclado(pagina);
  await completarUsuarioYClave(pagina, operador.nombreDeUsuario, CLAVE_DEL_OPERADOR);
  await inscribirOtp(pagina);

  await expect(pagina).toHaveURL(/\/backoffice$/);
  await expect(pagina.getByRole('button', { name: 'Buscar' })).toBeVisible();
  await expect(pagina.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
});

test('F004_CA33_OperadorConSesion_PreparaClienteConCuentaActivaPorElBff', async () => {
  clienteId = await registrarCliente(pagina, {
    tipoDocumento: 'CC',
    numeroDocumento: numeroDeDocumento,
    nombres: 'Luis Alberto',
    apellidos: 'Ramírez Torres',
    correo: `luis.${numeroDeDocumento}@example.com`,
    telefono: '+573001234567',
  });
  numeroDeCuenta = await abrirCuenta(pagina, clienteId, 'COP');

  expect(clienteId).not.toBe('');
  expect(numeroDeCuenta).not.toBe('');
});

test('F004_CA33_OperadorBuscaYBloquea_LaFichaMuestraBloqueada', async () => {
  await pagina.getByRole('textbox', { name: /^Número de documento/ }).fill(conPuntosDeMiles(numeroDeDocumento));
  await pagina.getByRole('button', { name: 'Buscar' }).click();

  // RF-12 y RNF-04: se abre la ficha del cliente y el documento no aparece en la URL.
  await expect(pagina).toHaveURL(new RegExp(`/backoffice/clientes/${clienteId}$`));
  expect(pagina.url()).not.toContain(numeroDeDocumento);
  const cuenta = pagina.getByRole('listitem').filter({ hasText: numeroDeCuenta });
  await expect(cuenta.getByText('Activa')).toBeVisible();

  // RF-03: Bloquear no pide confirmación; la ficha recarga y muestra la cuenta Bloqueada con solo "Desbloquear".
  await cuenta.getByRole('button', { name: 'Bloquear', exact: true }).click();

  await expect(cuenta.getByText('Bloqueada')).toBeVisible();
  await expect(cuenta.getByRole('button', { name: 'Desbloquear' })).toBeVisible();
  await expect(cuenta.getByRole('button', { name: 'Bloquear', exact: true })).toHaveCount(0);
});
