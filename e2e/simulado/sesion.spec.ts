import { esperarALasOtrasPestanas, expect, interactuar, mantenerActividad, test } from './entorno';

// El aviso de inactividad sale a los 4 min (300 s − 60 s); el cierre, a los 5 min.
const ANTES_DEL_CIERRE_CON_AVISO = 245_000;

test.describe('Inicio de sesión', () => {
  test('F004_CA04_AvisoInicioFallido_MuestraMensajeYEmpezarDeNuevo', async ({ page, bff }) => {
    bff.sinSesion();

    await page.goto('/?aviso=inicio-fallido');
    await page.getByRole('button', { name: 'Empezar de nuevo' }).click();

    await expect(page).toHaveURL(/\/bff\/iniciar-sesion\/clientes/);
    expect(bff.navegacionesAlBff).toEqual(['/bff/iniciar-sesion/clientes']);
  });

  test('F004_CA14_SesionDeClienteEnBackoffice_OfreceCerrarPrimero', async ({ page, bff }) => {
    await page.goto('/backoffice');

    await page.getByRole('button', { name: 'Cerrar sesión y continuar' }).click();

    await expect(page).toHaveURL(/\/bff\/iniciar-sesion\/empleados/);
    expect(bff.salidas).toBe(1);
  });

  test('F004_CA15_SesionSinRol_PantallaSinPermisoSinDatos', async ({ page, bff }) => {
    bff.rol = null;

    await page.goto('/mis-cuentas');

    await expect(page.getByText('No tienes permiso para esta área')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    expect(bff.consultasDeCuentas).toBe(0);
  });
});

test.describe('Aviso de sesión', () => {
  test('F004_CA08_FaltanSesentaSegundos_AvisoAccesibleManejableConTeclado', async ({ page, context }) => {
    await page.goto('/mis-cuentas');
    await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();

    await context.clock.runFor(ANTES_DEL_CIERRE_CON_AVISO);

    const aviso = page.getByRole('alertdialog');
    await expect(aviso).toBeVisible();
    await expect(aviso.getByRole('button', { name: 'Seguir conectado' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(aviso.getByRole('button', { name: 'Cerrar sesión' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(aviso.getByRole('button', { name: 'Seguir conectado' })).toBeFocused();
  });

  test('F004_CA08_SeguirConectado_EnviaLatidoYCierraElAviso', async ({ page, context, bff }) => {
    await page.goto('/mis-cuentas');
    await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
    await context.clock.runFor(ANTES_DEL_CIERRE_CON_AVISO);
    await expect(page.getByRole('alertdialog')).toBeVisible();

    await page.keyboard.press('Enter'); // el foco está en "Seguir conectado"

    await expect(page.getByRole('alertdialog')).toBeHidden();
    expect(bff.latidos).toBe(1);
    await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
  });

  test('F004_CA08_SinRespuesta_CierraConMensajeDeInactividad', async ({ page, context }) => {
    await page.goto('/mis-cuentas');
    await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
    await context.clock.runFor(ANTES_DEL_CIERRE_CON_AVISO);
    await expect(page.getByRole('alertdialog')).toBeVisible();

    await context.clock.runFor(60_000);

    await expect(page).toHaveURL(/aviso=inactividad/);
    await expect(page.getByText('Tu sesión se cerró por inactividad')).toBeVisible();
  });

  test('F004_CA09_A29Minutos_AvisoSinSeguirConectadoYA30Cierra', async ({ page, context }) => {
    await page.goto('/mis-cuentas');
    await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();

    // Activo sin parar durante 28 min 50 s: todavía no hay aviso de ningún tipo.
    await mantenerActividad(page, context, 1_730_000);
    await expect(page.getByRole('alertdialog')).toBeHidden();

    // Pasados los 29 min: aviso de fin de sesión, sin opción de alargarla.
    await context.clock.runFor(15_000);
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Seguir conectado' })).toHaveCount(0);

    // A los 30 min la sesión se cierra.
    await context.clock.runFor(60_000);
    await expect(page).toHaveURL(/aviso=vida-maxima/);
    await expect(page.getByText('Tu sesión terminó; vuelve a iniciar sesión')).toBeVisible();
  });
});

test.describe('Actividad', () => {
  test('F004_CA07_RefrescosAutomaticos_NoEnvianLatidos', async ({ page, context, bff }) => {
    await page.goto('/mis-cuentas');
    await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
    const consultasAntes = bff.consultasDeCuentas;

    // La pestaña recupera el foco varias veces: TanStack Query refresca solo, sin que nadie haga nada.
    await page.evaluate(() => {
      window.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    await expect.poll(() => bff.consultasDeCuentas).toBeGreaterThan(consultasAntes);
    expect(bff.latidos).toBe(0);
    // Y esas peticiones automáticas no alargan la sesión: el aviso de inactividad sale igual.
    await context.clock.runFor(ANTES_DEL_CIERRE_CON_AVISO);
    await expect(page.getByRole('alertdialog')).toBeVisible();
    expect(bff.latidos).toBe(0);
  });

  test('F004_CA11_DosPestanas_ActividadEnUnaMantieneLaOtra', async ({ page, context, bff }) => {
    const pestanaA = page;
    const pestanaB = await context.newPage();
    await pestanaA.goto('/mis-cuentas');
    await pestanaB.goto('/mis-cuentas');
    await expect(pestanaA.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
    await expect(pestanaB.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
    await context.clock.runFor(200_000);

    // Solo hay interacción en la pestaña A.
    await Promise.all([pestanaA.waitForResponse('**/bff/actividad'), interactuar(pestanaA)]);
    await esperarALasOtrasPestanas(pestanaB);
    // 400 s desde el inicio: sin la actividad de A, la pestaña B habría vencido a los 300 s.
    await context.clock.runFor(200_000);

    expect(bff.latidos).toBe(1);
    await expect(pestanaB.getByRole('alertdialog')).toBeHidden();
    await expect(pestanaB.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
  });

  test('F004_CA11_CerrarEnUna_LaOtraVaAlInicioEnMenosDeCincoSegundos', async ({ page, context }) => {
    const pestanaA = page;
    const pestanaB = await context.newPage();
    await pestanaA.goto('/mis-cuentas');
    await pestanaB.goto('/mis-cuentas');
    await expect(pestanaB.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();

    await pestanaA.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(pestanaB).toHaveURL(/aviso=sesion-cerrada/, { timeout: 5_000 });
    await expect(pestanaB.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });
});

test.describe('Cerrar sesión', () => {
  test('F004_CA12_TrasCerrarSesion_AtrasNoMuestraDatos', async ({ page, bff }) => {
    await page.goto('/mis-cuentas');
    await page.goto('/mis-cuentas/0199a000-0000-7000-8000-000000000001');
    await expect(page.getByText('1000000001')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/aviso=sesion-cerrada/);
    expect(bff.salidas).toBe(1);

    await page.goBack();

    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByText('1000000001')).toHaveCount(0);
    await expect(page.getByText(/\$\s?1\.234\.567/)).toHaveCount(0);
  });
});
