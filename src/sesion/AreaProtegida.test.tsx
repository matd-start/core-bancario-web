import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { crearProblema, crearSesion, crearSesionDeOperador } from '../pruebas/datos';
import { respuestaDeProblema } from '../pruebas/manejadores';
import { comoUrl, espiarNavegacion } from '../pruebas/navegacion';
import { renderizarEnElArea } from '../pruebas/renderizar';
import { servidor } from '../pruebas/servidor';

const CONTENIDO = <p>Contenido protegido del área</p>;

function sinSesion(codigo = 'sin-sesion') {
  servidor.use(http.get('/bff/sesion', () => respuestaDeProblema(401, crearProblema(401, codigo))));
}

describe('AreaProtegida', () => {
  test('F004_CA01_SesionAbierta_MuestraElContenidoDelArea', async () => {
    renderizarEnElArea(CONTENIDO);

    expect(await screen.findByText('Contenido protegido del área')).toBeInTheDocument();
  });

  test('F004_CA01_MientrasConsultaLaSesion_NoMuestraElContenido', () => {
    servidor.use(http.get('/bff/sesion', () => new Promise<never>(() => undefined)));

    renderizarEnElArea(CONTENIDO);

    expect(screen.queryByText('Contenido protegido del área')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('F004_CA01_SinSesion_MuestraLaPantallaDeInicioSinNavegarNiMostrarElContenido', async () => {
    const navegacion = espiarNavegacion();
    sinSesion();

    renderizarEnElArea(CONTENIDO);

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido del área')).not.toBeInTheDocument();
    expect(navegacion.replace).not.toHaveBeenCalled();
    expect(navegacion.assign).not.toHaveBeenCalled();
  });

  test('F004_CA13_SinSesionEnRutaProfunda_IniciarSesionLlevaLaRutaComoRegreso', async () => {
    const navegacion = espiarNavegacion();
    sinSesion();
    renderizarEnElArea(CONTENIDO, { ruta: '/mis-cuentas/0199a000-0000-7000-8000-000000000001' });

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }));

    const destino = comoUrl(navegacion.assign.mock.lastCall?.[0]);
    expect(destino.pathname).toBe('/bff/iniciar-sesion/clientes');
    expect(destino.searchParams.get('regreso')).toBe('/mis-cuentas/0199a000-0000-7000-8000-000000000001');
  });

  test('F004_CA02_BackofficeSinSesion_IniciarSesionVaAlRealmDeEmpleados', async () => {
    const navegacion = espiarNavegacion();
    sinSesion();
    renderizarEnElArea(CONTENIDO, { ruta: '/backoffice', area: 'empleados' });

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }));

    const destino = comoUrl(navegacion.assign.mock.lastCall?.[0]);
    expect(destino.pathname).toBe('/bff/iniciar-sesion/empleados');
    expect(destino.searchParams.get('regreso')).toBe('/backoffice');
  });

  test('F004_CA15_SesionSinRol_PantallaSinPermisoSinDatos', async () => {
    servidor.use(http.get('/bff/sesion', () => HttpResponse.json(crearSesion({ rol: null }))));

    renderizarEnElArea(CONTENIDO);

    expect(await screen.findByText('No tienes permiso para esta área')).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido del área')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  test('F004_CA15_SinPermiso_CerrarSesion_CierraEnElBffYVaAlInicio', async () => {
    const navegacion = espiarNavegacion();
    let salidas = 0;
    servidor.use(
      http.get('/bff/sesion', () => HttpResponse.json(crearSesion({ rol: null }))),
      http.post('/bff/salir', () => {
        salidas++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderizarEnElArea(CONTENIDO);

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(navegacion.replace).toHaveBeenCalledTimes(1);
    });
    expect(salidas).toBe(1);
    const destino = comoUrl(navegacion.replace.mock.lastCall?.[0]);
    expect(destino.pathname).toBe('/');
    expect(destino.searchParams.get('aviso')).toBe('sesion-cerrada');
  });

  test('F004_CL10_SesionDeClienteEnElBackoffice_OfreceCerrarPrimero', async () => {
    renderizarEnElArea(CONTENIDO, { ruta: '/backoffice', area: 'empleados' });
    // La sesión por defecto es de clientes: el área pedida es otra.

    expect(await screen.findByRole('button', { name: 'Cerrar sesión y continuar' })).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido del área')).not.toBeInTheDocument();
  });

  test('F004_CL10_CerrarSesionYContinuar_SaleDelBffYVaAIniciarEnElAreaPedida', async () => {
    const navegacion = espiarNavegacion();
    let salidas = 0;
    servidor.use(
      http.post('/bff/salir', () => {
        salidas++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderizarEnElArea(CONTENIDO, { ruta: '/backoffice', area: 'empleados' });

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión y continuar' }));

    await waitFor(() => {
      expect(navegacion.assign).toHaveBeenCalledTimes(1);
    });
    expect(salidas).toBe(1);
    expect(comoUrl(navegacion.assign.mock.lastCall?.[0]).pathname).toBe('/bff/iniciar-sesion/empleados');
  });

  test('F004_CL10_SesionDeOperadorEnLaRaiz_OfreceCerrarPrimero', async () => {
    servidor.use(http.get('/bff/sesion', () => HttpResponse.json(crearSesionDeOperador())));

    renderizarEnElArea(CONTENIDO, { ruta: '/', area: 'clientes' });

    expect(await screen.findByRole('button', { name: 'Cerrar sesión y continuar' })).toBeInTheDocument();
  });
});
