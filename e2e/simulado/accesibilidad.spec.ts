import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { crearCuenta, expect, tabularHasta, test, type BffSimulado } from './entorno';

// CA-35 (RNF-08): cero fallos de nivel AA en cada pantalla y estado. La lista es la de las pantallas de 004a.
interface Pantalla {
  nombre: string;
  ruta: string;
  preparar: (bff: BffSimulado) => void;
  /** Algo que solo se ve cuando la pantalla terminó de pintarse. */
  listo: (pagina: Page) => ReturnType<Page['getByText']>;
}

const IDENTIFICADOR_DE_CUENTA = '0199a000-0000-7000-8000-000000000001';

const pantallas: Pantalla[] = [
  {
    nombre: 'InicioDeSesionDelCliente',
    ruta: '/',
    preparar: (bff) => {
      bff.sinSesion();
    },
    listo: (p) => p.getByRole('button', { name: 'Iniciar sesión' }),
  },
  {
    nombre: 'InicioConAvisoDeInactividad',
    ruta: '/?aviso=inactividad',
    preparar: (bff) => {
      bff.sinSesion();
    },
    listo: (p) => p.getByText('Tu sesión se cerró por inactividad'),
  },
  {
    nombre: 'InicioConAvisoDeInicioFallido',
    ruta: '/?aviso=inicio-fallido',
    preparar: (bff) => {
      bff.sinSesion();
    },
    listo: (p) => p.getByRole('button', { name: 'Empezar de nuevo' }),
  },
  {
    nombre: 'InicioDeSesionDelBackoffice',
    ruta: '/backoffice',
    preparar: (bff) => {
      bff.sinSesion();
    },
    listo: (p) => p.getByRole('button', { name: 'Iniciar sesión' }),
  },
  {
    nombre: 'MisCuentas',
    ruta: '/mis-cuentas',
    preparar: (bff) => {
      bff.cuentas = [
        crearCuenta(),
        crearCuenta({
          id: '0199a000-0000-7000-8000-000000000002',
          numero: '1000000002',
          moneda: 'USD',
          estado: 'Cerrada',
          saldo: { monto: '12345678901234.56', moneda: 'USD' },
        }),
      ];
    },
    listo: (p) => p.getByText('1000000002'),
  },
  {
    nombre: 'MisCuentasSinCuentas',
    ruta: '/mis-cuentas',
    preparar: (bff) => {
      bff.cuentas = [];
    },
    listo: (p) => p.getByText(/no tienes cuentas/i),
  },
  {
    nombre: 'MisCuentasConError',
    ruta: '/mis-cuentas',
    preparar: (bff) => {
      bff.estadoDeLasCuentas = 500;
    },
    listo: (p) => p.getByRole('button', { name: 'Reintentar' }),
  },
  {
    nombre: 'MisCuentasCargando',
    ruta: '/mis-cuentas',
    preparar: (bff) => {
      bff.cuentasSinRespuesta = true;
    },
    listo: (p) => p.getByRole('status'),
  },
  {
    nombre: 'DetalleDeCuenta',
    ruta: `/mis-cuentas/${IDENTIFICADOR_DE_CUENTA}`,
    preparar: () => undefined,
    listo: (p) => p.getByText('1000000001'),
  },
  {
    nombre: 'CuentaNoEncontrada',
    ruta: '/mis-cuentas/0199a000-0000-7000-8000-0000000000ff',
    preparar: () => undefined,
    listo: (p) => p.getByText('Cuenta no encontrada'),
  },
  {
    nombre: 'SinPermiso',
    ruta: '/mis-cuentas',
    preparar: (bff) => {
      bff.rol = null;
    },
    listo: (p) => p.getByText('No tienes permiso para esta área'),
  },
  {
    nombre: 'OtraSesionAbierta',
    ruta: '/backoffice',
    preparar: () => undefined, // la sesión por defecto es de clientes
    listo: (p) => p.getByRole('button', { name: 'Cerrar sesión y continuar' }),
  },
  {
    nombre: 'InicioDelBackoffice',
    ruta: '/backoffice',
    preparar: (bff) => {
      bff.sesionDeOperador();
    },
    listo: (p) => p.getByText(/operadora\.maria/),
  },
];

async function sinFallosAA(pagina: Page) {
  const resultado = await new AxeBuilder({ page: pagina })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)} nodos)`);
}

for (const pantalla of pantallas) {
  test(`F004_CA35_CadaPantalla_SinFallosAA_${pantalla.nombre}`, async ({ page, bff }) => {
    pantalla.preparar(bff);

    await page.goto(pantalla.ruta);
    await expect(pantalla.listo(page)).toBeVisible();

    expect(await sinFallosAA(page)).toEqual([]);
  });
}

test('F004_CA35_CadaPantalla_SinFallosAA_AvisoDeSesion', async ({ page, context }) => {
  await page.goto('/mis-cuentas');
  await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
  await context.clock.runFor(245_000);
  await expect(page.getByRole('alertdialog')).toBeVisible();

  expect(await sinFallosAA(page)).toEqual([]);
});

test.describe('Solo con teclado', () => {
  test('F004_CA35_InicioDeSesionAvisoYClave_SoloConTeclado_IniciarSesion', async ({ page, bff }) => {
    bff.sinSesion();
    await page.goto('/?aviso=inactividad');
    const iniciar = page.getByRole('button', { name: 'Iniciar sesión' });

    await tabularHasta(page, iniciar);
    const foco = await iniciar.evaluate((el) => el.matches(':focus-visible'));
    await page.keyboard.press('Enter');

    expect(foco).toBe(true);
    await expect(page).toHaveURL(/\/bff\/iniciar-sesion\/clientes/);
  });

  test('F004_CA35_InicioDeSesionAvisoYClave_SoloConTeclado_CerrarSesion', async ({ page, bff }) => {
    await page.goto('/mis-cuentas');
    const cerrar = page.getByRole('button', { name: 'Cerrar sesión' });
    await expect(cerrar).toBeVisible();

    await tabularHasta(page, cerrar);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/aviso=sesion-cerrada/);
    expect(bff.salidas).toBe(1);
  });
});
