import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { crearCuenta, crearProblema } from '../pruebas/datos';
import { respuestaDeProblema } from '../pruebas/manejadores';
import { espiarNavegacion } from '../pruebas/navegacion';
import { renderizarEnElArea } from '../pruebas/renderizar';
import { servidor } from '../pruebas/servidor';
import { MisCuentas } from './MisCuentas';

const ACTIVA_COP = crearCuenta({
  id: '0199a000-0000-7000-8000-000000000001',
  numero: '1000000001',
  moneda: 'COP',
  estado: 'Activa',
  saldo: { monto: '1234567', moneda: 'COP' },
});
const CERRADA_USD = crearCuenta({
  id: '0199a000-0000-7000-8000-000000000002',
  numero: '1000000002',
  moneda: 'USD',
  estado: 'Cerrada',
  saldo: { monto: '12345678901234.56', moneda: 'USD' },
  fechaCierre: '2026-04-20T09:00:00Z',
});

describe('MisCuentas', () => {
  test('F004_CA18_MisCuentas_ActivaCopYCerradaUsdConFormatoEsCo', async () => {
    servidor.use(http.get('/api/mis-cuentas', () => HttpResponse.json([ACTIVA_COP, CERRADA_USD])));

    renderizarEnElArea(<MisCuentas />);

    expect(await screen.findByRole('heading', { name: 'Mis cuentas' })).toBeInTheDocument();
    // Las dos cuentas, también la Cerrada (RF-05), con número, moneda, estado y saldo.
    expect(await screen.findByText('1000000001')).toBeInTheDocument();
    expect(await screen.findByText('1000000002')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('COP');
    expect(document.body).toHaveTextContent('USD');
    expect(document.body).toHaveTextContent('Activa');
    expect(document.body).toHaveTextContent('Cerrada');
    expect(screen.getByText('$ 1.234.567')).toBeInTheDocument();
    expect(screen.getByText('US$ 12.345.678.901.234,56')).toBeInTheDocument();
  });

  test('F004_CA18_MisCuentas_MuestraIndicadorMientrasCarga', async () => {
    servidor.use(http.get('/api/mis-cuentas', () => new Promise<never>(() => undefined)));

    renderizarEnElArea(<MisCuentas />);

    // Primero resuelve la sesión del área; lo que queda en pantalla es la carga de las cuentas.
    expect(await screen.findByRole('heading', { name: 'Mis cuentas' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('1000000001')).not.toBeInTheDocument();
  });

  test('F004_CA18_MisCuentas_SinCuentas_EstadoVacio', async () => {
    servidor.use(http.get('/api/mis-cuentas', () => HttpResponse.json([])));

    renderizarEnElArea(<MisCuentas />);

    expect(await screen.findByText(/no tienes cuentas/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('F004_CA18_ErrorDeLaApi_Reintentar', async () => {
    let llamadas = 0;
    servidor.use(
      http.get('/api/mis-cuentas', () => {
        llamadas++;
        return llamadas === 1
          ? respuestaDeProblema(500, crearProblema(500, 'error-inesperado', '00-trace-500'))
          : HttpResponse.json([ACTIVA_COP]);
      }),
    );
    renderizarEnElArea(<MisCuentas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('1000000001')).toBeInTheDocument();
    expect(llamadas).toBe(2);
  });

  test('F004_CA34_ErrorDeLaApi_MuestraElTraceIdYNuncaElDetalleTecnico', async () => {
    servidor.use(
      http.get('/api/mis-cuentas', () =>
        respuestaDeProblema(500, {
          ...crearProblema(500, 'codigo-que-no-existe', '00-trace-visible'),
          detail: 'System.NullReferenceException en MisCuentasHandler.cs:42',
        }),
      ),
    );

    renderizarEnElArea(<MisCuentas />);

    expect(await screen.findByText(/00-trace-visible/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('NullReferenceException');
  });

  test('F004_CL24_ApiCaida_NoDejaLaPantallaEnBlanco', async () => {
    servidor.use(http.get('/api/mis-cuentas', () => HttpResponse.error()));

    renderizarEnElArea(<MisCuentas />);

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mis cuentas' })).toBeInTheDocument();
  });

  test('F004_CA21_MisCuentas_OfreceCambiarClave', async () => {
    renderizarEnElArea(<MisCuentas />);

    expect(await screen.findByRole('button', { name: 'Cambiar clave' })).toBeInTheDocument();
  });

  test('F004_CA21_AvisoClaveActualizada_MuestraMensajeYLimpiaLaUrl', async () => {
    renderizarEnElArea(<MisCuentas />, { ruta: '/mis-cuentas?aviso=clave-actualizada' });

    expect(await screen.findByText('Clave actualizada')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
    expect(window.location.pathname).toBe('/mis-cuentas');
  });

  test('F004_CA21_MisCuentasSinAviso_NoMuestraElMensajeDeClaveActualizada', async () => {
    renderizarEnElArea(<MisCuentas />);

    await screen.findByText('1000000001');

    expect(screen.queryByText('Clave actualizada')).not.toBeInTheDocument();
  });

  test('F004_CA21_CambiarClave_NavegaAlBffConNavegacionCompleta', async () => {
    const navegacion = espiarNavegacion();
    renderizarEnElArea(<MisCuentas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar clave' }));

    expect(navegacion.assign).toHaveBeenCalledExactlyOnceWith('/bff/cambiar-clave');
  });
});
