import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { crearCuenta, expect, ID_DEL_CLIENTE, interactuar, tabularHasta, test, type BffSimulado } from './entorno';

// Las pantallas del operador de 004b en el navegador con /bff y /api simulados:
// - CA-30 (RF-13, CL-17, RNF-04): la clave temporal no queda en la URL, el almacenamiento ni la pantalla;
// - CA-35 (RNF-08): cero fallos AA en cada pantalla y estado, y la clave temporal solo con teclado;
// - CA-36 (RNF-09): el backoffice no tiene scroll horizontal a 1280 px.
// Se supone lo mismo que en las pruebas de Vitest: "Buscar", "Registrarlo", el formulario "Registrar cliente", las
// acciones "Habilitar"/"Restablecer"/"Deshabilitar" y "Cerrar" (cuenta) como botones, y los diálogos como alertdialog.

const RUTA_DE_LA_FICHA = `/backoffice/clientes/${ID_DEL_CLIENTE}`;
const ACTIVA = crearCuenta({ id: '0199a000-0000-7000-8000-000000000001', numero: '1000000001' });
const BLOQUEADA = crearCuenta({
  id: '0199a000-0000-7000-8000-000000000002',
  numero: '1000000002',
  estado: 'Bloqueada',
  moneda: 'USD',
  saldo: { monto: '12345678901234.56', moneda: 'USD' },
});
const CERRADA = crearCuenta({
  id: '0199a000-0000-7000-8000-000000000003',
  numero: '1000000003',
  estado: 'Cerrada',
  saldo: { monto: '0', moneda: 'COP' },
  fechaCierre: '2026-04-20T09:00:00Z',
});

interface Pantalla {
  nombre: string;
  ruta: string;
  preparar: (bff: BffSimulado) => void;
  /** Lo que el operador hace para llegar al estado de la pantalla (escribir, pulsar…). */
  abrir?: (pagina: Page) => Promise<void>;
  /** Algo que solo se ve cuando la pantalla terminó de pintarse. */
  listo: (pagina: Page) => ReturnType<Page['getByText']>;
}

function fichaConTresCuentas(bff: BffSimulado) {
  bff.sesionDeOperador();
  bff.cuentas = [ACTIVA, BLOQUEADA, CERRADA];
}

async function buscarUnDocumentoNoRegistrado(pagina: Page) {
  await pagina.getByRole('textbox', { name: /^Número de documento/ }).fill('9876543');
  await pagina.getByRole('button', { name: 'Buscar' }).click();
  await expect(pagina.getByText('No hay un cliente con ese documento')).toBeVisible();
}

async function confirmar(pagina: Page, nombre: RegExp) {
  await pagina.getByRole('alertdialog').getByRole('button', { name: nombre }).click();
}

const pantallas: Pantalla[] = [
  {
    nombre: 'Buscar',
    ruta: '/backoffice',
    preparar: (bff) => {
      bff.sesionDeOperador();
    },
    listo: (p) => p.getByRole('button', { name: 'Buscar' }),
  },
  {
    nombre: 'BuscarSinResultado',
    ruta: '/backoffice',
    preparar: (bff) => {
      bff.sesionDeOperador();
    },
    abrir: buscarUnDocumentoNoRegistrado,
    listo: (p) => p.getByRole('button', { name: 'Registrarlo' }),
  },
  {
    nombre: 'FormularioDeRegistro',
    ruta: '/backoffice',
    preparar: (bff) => {
      bff.sesionDeOperador();
    },
    abrir: async (pagina) => {
      await buscarUnDocumentoNoRegistrado(pagina);
      await pagina.getByRole('button', { name: 'Registrarlo' }).click();
    },
    listo: (p) => p.getByRole('form', { name: 'Registrar cliente' }),
  },
  {
    nombre: 'FichaSinAcceso',
    ruta: RUTA_DE_LA_FICHA,
    preparar: (bff) => {
      fichaConTresCuentas(bff);
      bff.estadoDeAcceso = 'SinAcceso';
    },
    listo: (p) => p.getByRole('button', { name: 'Habilitar' }),
  },
  {
    nombre: 'FichaHabilitadoConPrimerIngresoPendiente',
    ruta: RUTA_DE_LA_FICHA,
    preparar: (bff) => {
      fichaConTresCuentas(bff);
      bff.estadoDeAcceso = 'Habilitado';
      bff.primerIngresoPendiente = true;
    },
    listo: (p) => p.getByText(/primer ingreso pendiente/i),
  },
  {
    nombre: 'FichaDeshabilitado',
    ruta: RUTA_DE_LA_FICHA,
    preparar: (bff) => {
      fichaConTresCuentas(bff);
      bff.estadoDeAcceso = 'Deshabilitado';
    },
    listo: (p) => p.getByRole('button', { name: 'Habilitar' }),
  },
  {
    nombre: 'FichaConEstadoDelAccesoNoDisponible',
    ruta: RUTA_DE_LA_FICHA,
    preparar: (bff) => {
      fichaConTresCuentas(bff);
      bff.estadoDeAccesoHttp = 503;
    },
    listo: (p) => p.getByText('Estado del acceso no disponible'),
  },
  {
    nombre: 'FichaConError',
    ruta: RUTA_DE_LA_FICHA,
    preparar: (bff) => {
      bff.sesionDeOperador();
      bff.fichaHttp = 500;
    },
    listo: (p) => p.getByRole('button', { name: 'Reintentar' }),
  },
  {
    nombre: 'ConfirmarRestablecer',
    ruta: RUTA_DE_LA_FICHA,
    preparar: (bff) => {
      fichaConTresCuentas(bff);
      bff.estadoDeAcceso = 'Habilitado';
      bff.primerIngresoPendiente = false;
    },
    abrir: async (pagina) => {
      await pagina.getByRole('button', { name: 'Restablecer' }).click();
    },
    listo: (p) => p.getByRole('alertdialog'),
  },
  {
    nombre: 'ConfirmarCerrarCuenta',
    ruta: RUTA_DE_LA_FICHA,
    preparar: fichaConTresCuentas,
    abrir: async (pagina) => {
      await pagina
        .getByRole('listitem')
        .filter({ hasText: '1000000001' })
        .getByRole('button', { name: 'Cerrar', exact: true })
        .click();
    },
    listo: (p) => p.getByRole('alertdialog'),
  },
  {
    nombre: 'DialogoDeLaClaveTemporal',
    ruta: RUTA_DE_LA_FICHA,
    preparar: (bff) => {
      fichaConTresCuentas(bff);
      bff.estadoDeAcceso = 'SinAcceso';
    },
    abrir: async (pagina) => {
      await pagina.getByRole('button', { name: 'Habilitar' }).click();
      await confirmar(pagina, /^Habilitar/);
    },
    listo: (p) => p.getByRole('alertdialog', { name: /Habilitado/ }),
  },
];

async function llegarA(pagina: Page, bff: BffSimulado, pantalla: Pantalla) {
  pantalla.preparar(bff);
  await pagina.goto(pantalla.ruta);
  await pantalla.abrir?.(pagina);
  await expect(pantalla.listo(pagina)).toBeVisible();
}

async function fallosAA(pagina: Page) {
  const resultado = await new AxeBuilder({ page: pagina })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)} nodos)`);
}

test.describe('CA-35: accesibilidad del backoffice', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const pantalla of pantallas) {
    test(`F004_CA35_CadaPantalla_SinFallosAA_Backoffice${pantalla.nombre}`, async ({ page, bff }) => {
      await llegarA(page, bff, pantalla);

      expect(await fallosAA(page)).toEqual([]);
    });
  }

  test('F004_CA35_ClaveTemporal_SoloConTeclado', async ({ page, bff }) => {
    bff.sesionDeOperador();
    bff.estadoDeAcceso = 'SinAcceso';
    await page.goto(RUTA_DE_LA_FICHA);
    const habilitar = page.getByRole('button', { name: 'Habilitar' });
    await expect(habilitar).toBeVisible();

    await tabularHasta(page, habilitar);
    await page.keyboard.press('Enter');
    const confirmacion = page.getByRole('alertdialog').getByRole('button', { name: /^Habilitar/ });
    await tabularHasta(page, confirmacion);
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('alertdialog', { name: /Habilitado/ });
    await expect(dialogo).toContainText(bff.claveTemporal);
    const entregada = dialogo.getByRole('button', { name: 'Ya la entregué' });
    await tabularHasta(page, entregada);
    const focoVisible = await entregada.evaluate((el) => el.matches(':focus-visible'));
    await page.keyboard.press('Enter');

    expect(focoVisible).toBe(true);
    await expect(dialogo).toBeHidden();
    expect(bff.habilitaciones).toBe(1);
  });
});

test.describe('CA-36: el backoffice a 1280 px', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const pantalla of pantallas) {
    test(`F004_CA36_Backoffice1280px_SinScrollHorizontal_${pantalla.nombre}`, async ({ page, bff }) => {
      await llegarA(page, bff, pantalla);

      const sobrante = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(sobrante).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('CA-30: la clave temporal en el navegador', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('F004_CA30_ClaveTemporal_NoQuedaEnUrlNiAlmacenamiento', async ({ page, bff }) => {
    bff.sesionDeOperador();
    bff.estadoDeAcceso = 'SinAcceso';
    await page.goto(RUTA_DE_LA_FICHA);
    await page.getByRole('button', { name: 'Habilitar' }).click();
    await confirmar(page, /^Habilitar/);
    const dialogo = page.getByRole('alertdialog', { name: /Habilitado/ });
    await expect(dialogo).toContainText(bff.claveTemporal);

    // No se cierra con Esc ni con un clic fuera del diálogo.
    await page.keyboard.press('Escape');
    await interactuar(page);
    await expect(dialogo).toBeVisible();
    expect(page.url()).not.toContain(bff.claveTemporal);

    await dialogo.getByRole('button', { name: 'Ya la entregué' }).click();

    await expect(dialogo).toBeHidden();
    const alcanceDelScript = await page.evaluate(() => ({
      url: location.href,
      historial: JSON.stringify(history.state),
      cookies: document.cookie,
      local: JSON.stringify(Object.entries(localStorage)),
      sesion: JSON.stringify(Object.entries(sessionStorage)),
      pantalla: document.documentElement.innerHTML,
    }));
    expect(alcanceDelScript.url).not.toContain(bff.claveTemporal);
    expect(alcanceDelScript.historial).not.toContain(bff.claveTemporal);
    expect(alcanceDelScript.cookies).not.toContain(bff.claveTemporal);
    expect(alcanceDelScript.local).not.toContain(bff.claveTemporal);
    expect(alcanceDelScript.sesion).not.toContain(bff.claveTemporal);
    expect(alcanceDelScript.pantalla).not.toContain(bff.claveTemporal);
    expect(bff.habilitaciones).toBe(1);
  });
});
