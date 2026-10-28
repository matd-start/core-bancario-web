import { http, HttpResponse } from 'msw';
import { describe, expect, test, vi } from 'vitest';
import { crearProblema } from '../pruebas/datos';
import { respuestaDeProblema } from '../pruebas/manejadores';
import { servidor } from '../pruebas/servidor';
import { crearClienteDeLaApi, crearClienteDelBff } from './clientes';

describe('crearMiddlewareDeSesion (por medio de los clientes)', () => {
  test('F004_CA06_ClienteDeLaApi_EnviaElEncabezadoAntiCsrf', async () => {
    let encabezado: string | null = null;
    servidor.use(
      http.get('/api/mis-cuentas', ({ request }) => {
        encabezado = request.headers.get('X-CSRF');
        return HttpResponse.json([]);
      }),
    );
    const cliente = crearClienteDeLaApi(vi.fn());

    await cliente.GET('/mis-cuentas');

    expect(encabezado).toBe('1');
  });

  test('F004_CA06_ClienteDelBff_EnviaElEncabezadoAntiCsrfTambienEnLosPost', async () => {
    let encabezado: string | null = null;
    servidor.use(
      http.post('/bff/actividad', ({ request }) => {
        encabezado = request.headers.get('X-CSRF');
        return HttpResponse.json({
          area: 'clientes',
          usuario: 'cc1',
          rol: 'Cliente',
          segundosHastaInactividad: 300,
          segundosHastaVidaMaxima: 1000,
        });
      }),
    );
    const cliente = crearClienteDelBff(vi.fn());

    await cliente.POST('/bff/actividad');

    expect(encabezado).toBe('1');
  });

  test('F004_RNF01_ClienteDeLaApi_ElBaseUrlEsApiYNoLlamaAOtroOrigen', async () => {
    let origen: string | null = null;
    let ruta: string | null = null;
    servidor.use(
      http.get('/api/mis-cuentas', ({ request }) => {
        const url = new URL(request.url);
        origen = url.origin;
        ruta = url.pathname;
        return HttpResponse.json([]);
      }),
    );
    const cliente = crearClienteDeLaApi(vi.fn());

    await cliente.GET('/mis-cuentas');

    expect(ruta).toBe('/api/mis-cuentas');
    expect(origen).toBe(window.location.origin);
  });

  test.each([
    ['sin-sesion', 'revocada'],
    ['no-autenticado', 'revocada'],
    ['sesion-vencida-por-inactividad', 'inactividad'],
    ['sesion-vencida-por-vida-maxima', 'vida-maxima'],
    ['sesion-revocada', 'revocada'],
  ])('F004_CL13_Respuesta401ConCodigo_%s_TerminaLaSesionConMotivo_%s', async (codigo, motivo) => {
    servidor.use(http.get('/api/mis-cuentas', () => respuestaDeProblema(401, crearProblema(401, codigo))));
    const alTerminarSesion = vi.fn();
    const cliente = crearClienteDeLaApi(alTerminarSesion);

    await cliente.GET('/mis-cuentas');

    expect(alTerminarSesion).toHaveBeenCalledExactlyOnceWith(motivo);
  });

  test('F004_CL13_Respuesta401DelBff_TerminaLaSesionConSuMotivo', async () => {
    servidor.use(
      http.get('/bff/sesion', () => respuestaDeProblema(401, crearProblema(401, 'sesion-vencida-por-inactividad'))),
    );
    const alTerminarSesion = vi.fn();
    const cliente = crearClienteDelBff(alTerminarSesion);

    await cliente.GET('/bff/sesion');

    expect(alTerminarSesion).toHaveBeenCalledExactlyOnceWith('inactividad');
  });

  test.each([403, 404, 500, 503])('F004_CL13_Respuesta%i_NoTerminaLaSesion', async (estado) => {
    servidor.use(
      http.get('/api/mis-cuentas', () => respuestaDeProblema(estado, crearProblema(estado, 'no-encontrado'))),
    );
    const alTerminarSesion = vi.fn();
    const cliente = crearClienteDeLaApi(alTerminarSesion);

    await cliente.GET('/mis-cuentas');

    expect(alTerminarSesion).not.toHaveBeenCalled();
  });

  test('F004_CL13_Respuesta401_NoReintentaNada', async () => {
    let peticiones = 0;
    servidor.use(
      http.get('/api/mis-cuentas', () => {
        peticiones++;
        return respuestaDeProblema(401, crearProblema(401, 'sesion-vencida-por-inactividad'));
      }),
    );
    const cliente = crearClienteDeLaApi(vi.fn());

    await cliente.GET('/mis-cuentas');

    expect(peticiones).toBe(1);
  });
});
