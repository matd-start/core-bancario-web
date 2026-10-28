import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { crearProblema, crearSesion } from '../pruebas/datos';
import { respuestaDeProblema } from '../pruebas/manejadores';
import { comoUrl, espiarNavegacion } from '../pruebas/navegacion';
import { renderizarEnElArea } from '../pruebas/renderizar';
import { servidor } from '../pruebas/servidor';
import { MisCuentas } from '../cliente/MisCuentas';
import { MENSAJES_DE_AVISO } from './avisos';

const CONTENIDO = <p>Contenido protegido del área</p>;

function sinSesion() {
  servidor.use(http.get('/bff/sesion', () => respuestaDeProblema(401, crearProblema(401, 'sin-sesion'))));
}

/** Cuenta las llamadas a un endpoint del BFF. */
function contar(
  metodo: 'get' | 'post',
  ruta: string,
  respuesta: () => Response = () => HttpResponse.json(crearSesion()),
) {
  const contador = { llamadas: 0 };
  servidor.use(
    http[metodo](ruta, () => {
      contador.llamadas++;
      return respuesta();
    }),
  );
  return contador;
}

describe('Avisos en la pantalla de inicio', () => {
  test.each([
    ['inactividad', 'Tu sesión se cerró por inactividad'],
    ['vida-maxima', 'Tu sesión terminó; vuelve a iniciar sesión'],
    ['identidad-no-disponible', 'El inicio de sesión no está disponible; intenta más tarde'],
  ] as const)('F004_CL06_AvisoEnElInicio_%s_MuestraSuMensaje', async (aviso, mensaje) => {
    sinSesion();

    renderizarEnElArea(CONTENIDO, { ruta: `/?aviso=${aviso}` });

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  test('F004_CL05_AvisoIdentidadNoDisponible_NoEsUnaPantallaEnBlanco', async () => {
    sinSesion();

    renderizarEnElArea(CONTENIDO, { ruta: '/?aviso=identidad-no-disponible' });

    expect(await screen.findByText('El inicio de sesión no está disponible; intenta más tarde')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('F004_CL01_AvisoDeValorDesconocido_NoMuestraNingunMensajeNiLoEscribeEnLaPagina', async () => {
    sinSesion();

    renderizarEnElArea(CONTENIDO, { ruta: '/?aviso=%3Cb%3Ehola%3C%2Fb%3E' });

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByText(/hola/)).not.toBeInTheDocument();
  });
});

describe('Cerrar la sesión', () => {
  test('F004_CL11_CerrarSesion_VaciaLaCacheDeConsultasAntesDeNavegar', async () => {
    const navegacion = espiarNavegacion();
    const consultasAlNavegar: number[] = [];
    navegacion.replace.mockImplementation(() => {
      consultasAlNavegar.push(clienteDeConsultas.getQueryCache().getAll().length);
    });
    const { clienteDeConsultas } = renderizarEnElArea(<MisCuentas />);
    await screen.findByText('1000000001');
    clienteDeConsultas.setQueryData(['ficha', 'dato-sensible'], { saldo: '9999' });

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(navegacion.replace).toHaveBeenCalledTimes(1);
    });
    expect(consultasAlNavegar).toEqual([0]);
  });

  test('F004_CL11_CerrarSesion_NavegaConReplaceParaQueAtrasNoVuelvaALosDatos', async () => {
    const navegacion = espiarNavegacion();
    renderizarEnElArea(<MisCuentas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(navegacion.replace).toHaveBeenCalledTimes(1);
    });
    expect(navegacion.assign).not.toHaveBeenCalled();
    expect(comoUrl(navegacion.replace.mock.lastCall?.[0]).pathname).toBe('/');
  });

  test('F004_CL12_SesionRevocada_VaAlInicioConMensajeGenerico', async () => {
    const navegacion = espiarNavegacion();
    servidor.use(http.get('/api/mis-cuentas', () => respuestaDeProblema(401, crearProblema(401, 'sesion-revocada'))));
    renderizarEnElArea(<MisCuentas />);

    await waitFor(() => {
      expect(navegacion.replace).toHaveBeenCalledTimes(1);
    });
    const destino = comoUrl(navegacion.replace.mock.lastCall?.[0]);
    expect(destino.pathname).toBe('/');
    expect(destino.searchParams.get('aviso')).toBe('revocada');
  });

  test('F004_CL13_EnvioConSesionVencida_VaAlInicioConMensajeDeInactividad', async () => {
    const navegacion = espiarNavegacion();
    servidor.use(
      http.get('/api/mis-cuentas', () =>
        respuestaDeProblema(401, crearProblema(401, 'sesion-vencida-por-inactividad')),
      ),
    );
    renderizarEnElArea(<MisCuentas />);

    await waitFor(() => {
      expect(navegacion.replace).toHaveBeenCalledTimes(1);
    });
    const destino = comoUrl(navegacion.replace.mock.lastCall?.[0]);
    expect(destino.searchParams.get('aviso')).toBe('inactividad');
  });

  test('F004_CL13_SesionVencidaPorVidaMaxima_VaAlInicioConMensajeDeFinDeSesion', async () => {
    const navegacion = espiarNavegacion();
    servidor.use(
      http.get('/api/mis-cuentas', () =>
        respuestaDeProblema(401, crearProblema(401, 'sesion-vencida-por-vida-maxima')),
      ),
    );
    renderizarEnElArea(<MisCuentas />);

    await waitFor(() => {
      expect(navegacion.replace).toHaveBeenCalledTimes(1);
    });
    expect(comoUrl(navegacion.replace.mock.lastCall?.[0]).searchParams.get('aviso')).toBe('vida-maxima');
  });

  test('F004_CL04_Api403_PantallaSinPermiso', async () => {
    servidor.use(http.get('/api/mis-cuentas', () => respuestaDeProblema(403, crearProblema(403, 'prohibido'))));

    renderizarEnElArea(<MisCuentas />);

    expect(await screen.findByText('No tienes permiso para esta área')).toBeInTheDocument();
    expect(screen.queryByText('1000000001')).not.toBeInTheDocument();
  });
});

describe('Latidos de actividad', () => {
  test('F004_CL11_PageshowDesdeElCache_VuelveAConsultarLaSesion', async () => {
    const consultas = contar('get', '/bff/sesion');
    renderizarEnElArea(CONTENIDO);
    await screen.findByText('Contenido protegido del área');
    const antes = consultas.llamadas;

    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });

    await waitFor(() => {
      expect(consultas.llamadas).toBe(antes + 1);
    });
  });

  test('F004_CL11_PageshowNormal_NoVuelveAConsultar', async () => {
    const consultas = contar('get', '/bff/sesion');
    renderizarEnElArea(CONTENIDO);
    await screen.findByText('Contenido protegido del área');
    const antes = consultas.llamadas;

    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
    });

    expect(consultas.llamadas).toBe(antes);
  });

  test('F004_RN25_CargaInicial_NoEnviaLatidos', async () => {
    const latidos = contar('post', '/bff/actividad');
    renderizarEnElArea(CONTENIDO);

    await screen.findByText('Contenido protegido del área');

    expect(latidos.llamadas).toBe(0);
  });

  test('F004_RN25_ClicEnLaPantalla_EnviaUnLatidoAlBff', async () => {
    const latidos = contar('post', '/bff/actividad');
    renderizarEnElArea(CONTENIDO);
    await screen.findByText('Contenido protegido del área');

    await userEvent.click(screen.getByText('Contenido protegido del área'));

    await waitFor(() => {
      expect(latidos.llamadas).toBe(1);
    });
  });

  test('F004_RN25_TeclaEnLaPantalla_EnviaUnLatidoAlBff', async () => {
    const latidos = contar('post', '/bff/actividad');
    renderizarEnElArea(CONTENIDO);
    await screen.findByText('Contenido protegido del área');

    await userEvent.keyboard('a');

    await waitFor(() => {
      expect(latidos.llamadas).toBe(1);
    });
  });

  test('F004_RN25_CambioDePantalla_EnviaUnLatidoAlBff', async () => {
    const latidos = contar('post', '/bff/actividad');
    const { router } = renderizarEnElArea(CONTENIDO);
    await screen.findByText('Contenido protegido del área');

    await act(() => router.navigate('/mis-cuentas/otra'));

    await waitFor(() => {
      expect(latidos.llamadas).toBe(1);
    });
  });

  test('F004_RN25_MoverElRaton_NoEnviaLatidos', async () => {
    const latidos = contar('post', '/bff/actividad');
    renderizarEnElArea(CONTENIDO);
    await screen.findByText('Contenido protegido del área');

    await userEvent.hover(screen.getByText('Contenido protegido del área'));
    document.dispatchEvent(new Event('scroll'));
    document.dispatchEvent(new WheelEvent('wheel'));

    expect(latidos.llamadas).toBe(0);
  });
});

describe('Mensajes de aviso', () => {
  test('F004_CL12_AvisoRevocada_MuestraElMensajeGenericoEnElInicio', async () => {
    sinSesion();

    renderizarEnElArea(CONTENIDO, { ruta: '/?aviso=revocada' });

    expect(await screen.findByText(MENSAJES_DE_AVISO.revocada)).toBeInTheDocument();
  });
});
