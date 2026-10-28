import type { Page } from '@playwright/test';
import { crearCuenta, expect, test, type BffSimulado } from './entorno';

// CA-36 (RNF-09): sin scroll horizontal en el área del cliente a 360 px y en el backoffice a 1280 px.
interface Pantalla {
  nombre: string;
  ruta: string;
  preparar: (bff: BffSimulado) => void;
  listo: (pagina: Page) => ReturnType<Page['getByText']>;
}

async function anchoDeContenidoSobrante(pagina: Page) {
  return await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

const cuentaConSaldoLargo = crearCuenta({
  id: '0199a000-0000-7000-8000-000000000002',
  numero: '1000000002',
  moneda: 'USD',
  saldo: { monto: '12345678901234.56', moneda: 'USD' },
});

const areaDelCliente: Pantalla[] = [
  {
    nombre: 'InicioDeSesion',
    ruta: '/?aviso=vida-maxima',
    preparar: (bff) => {
      bff.sinSesion();
    },
    listo: (p) => p.getByRole('button', { name: 'Iniciar sesión' }),
  },
  {
    nombre: 'MisCuentas',
    ruta: '/mis-cuentas',
    preparar: (bff) => {
      bff.cuentas = [crearCuenta(), cuentaConSaldoLargo];
    },
    listo: (p) => p.getByText('1000000002'),
  },
  {
    nombre: 'DetalleDeCuenta',
    ruta: `/mis-cuentas/${cuentaConSaldoLargo.id}`,
    preparar: (bff) => {
      bff.cuentas = [cuentaConSaldoLargo];
    },
    listo: (p) => p.getByText('1000000002'),
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
    preparar: () => undefined,
    listo: (p) => p.getByRole('button', { name: 'Cerrar sesión y continuar' }),
  },
];

const backoffice: Pantalla[] = [
  {
    nombre: 'InicioDeSesion',
    ruta: '/backoffice',
    preparar: (bff) => {
      bff.sinSesion();
    },
    listo: (p) => p.getByRole('button', { name: 'Iniciar sesión' }),
  },
  {
    nombre: 'InicioDelBackoffice',
    ruta: '/backoffice',
    preparar: (bff) => {
      bff.sesionDeOperador();
    },
    listo: (p) => p.getByText(/operadora\.maria/),
  },
  {
    nombre: 'SinPermiso',
    ruta: '/backoffice',
    preparar: (bff) => {
      bff.sesionDeOperador();
      bff.rol = null;
    },
    listo: (p) => p.getByText('No tienes permiso para esta área'),
  },
];

test.describe('Área del cliente a 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  for (const pantalla of areaDelCliente) {
    test(`F004_CA36_AreaDelCliente360px_SinScrollHorizontal_${pantalla.nombre}`, async ({ page, bff }) => {
      pantalla.preparar(bff);

      await page.goto(pantalla.ruta);
      await expect(pantalla.listo(page)).toBeVisible();

      expect(await anchoDeContenidoSobrante(page)).toBeLessThanOrEqual(0);
    });
  }

  test('F004_CA36_AreaDelCliente360px_SinScrollHorizontal_AvisoDeSesion', async ({ page, context }) => {
    await page.goto('/mis-cuentas');
    await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
    await context.clock.runFor(245_000);
    await expect(page.getByRole('alertdialog')).toBeVisible();

    expect(await anchoDeContenidoSobrante(page)).toBeLessThanOrEqual(0);
    await expect(page.getByRole('button', { name: 'Seguir conectado' })).toBeInViewport();
  });
});

test.describe('Backoffice a 1280 px', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const pantalla of backoffice) {
    test(`F004_CA36_Backoffice1280px_SinScrollHorizontal_${pantalla.nombre}`, async ({ page, bff }) => {
      pantalla.preparar(bff);

      await page.goto(pantalla.ruta);
      await expect(pantalla.listo(page)).toBeVisible();

      expect(await anchoDeContenidoSobrante(page)).toBeLessThanOrEqual(0);
    });
  }
});
