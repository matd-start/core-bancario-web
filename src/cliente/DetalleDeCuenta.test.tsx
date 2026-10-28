import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { crearCuenta, crearProblema } from '../pruebas/datos';
import { respuestaDeProblema } from '../pruebas/manejadores';
import { renderizarEnElArea } from '../pruebas/renderizar';
import { servidor } from '../pruebas/servidor';
import { DetalleDeCuenta } from './DetalleDeCuenta';

const ID_PROPIO = '0199a000-0000-7000-8000-000000000002';

describe('DetalleDeCuenta', () => {
  test('F004_CA20_DetalleDeCuentaPropia_MuestraNumeroMonedaEstadoSaldoYFechas', async () => {
    servidor.use(
      http.get('/api/mis-cuentas/:cuentaId', ({ params }) =>
        HttpResponse.json(
          crearCuenta({
            id: String(params.cuentaId),
            numero: '1000000002',
            moneda: 'USD',
            estado: 'Cerrada',
            saldo: { monto: '12345678901234.56', moneda: 'USD' },
            fechaApertura: '2025-03-15T10:30:00Z',
            fechaCierre: '2026-04-20T09:00:00Z',
          }),
        ),
      ),
    );

    renderizarEnElArea(<DetalleDeCuenta />, {
      ruta: `/mis-cuentas/${ID_PROPIO}`,
      patron: '/mis-cuentas/:cuentaId',
    });

    expect(await screen.findByText('1000000002')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('USD');
    expect(document.body).toHaveTextContent('Cerrada');
    expect(screen.getByText('US$ 12.345.678.901.234,56')).toBeInTheDocument();
    // Las dos fechas (el formato exacto lo decide la pantalla; el año no depende de la zona horaria).
    expect(document.body).toHaveTextContent('2025');
    expect(document.body).toHaveTextContent('2026');
  });

  test('F004_CA20_DetalleDeCuenta_PideLaCuentaDeLaRutaAlaApi', async () => {
    let pedida: string | undefined;
    servidor.use(
      http.get('/api/mis-cuentas/:cuentaId', ({ params }) => {
        pedida = String(params.cuentaId);
        return HttpResponse.json(crearCuenta({ id: pedida }));
      }),
    );

    renderizarEnElArea(<DetalleDeCuenta />, {
      ruta: `/mis-cuentas/${ID_PROPIO}`,
      patron: '/mis-cuentas/:cuentaId',
    });

    await screen.findByText('1000000001');
    expect(pedida).toBe(ID_PROPIO);
  });

  test.each([
    ['ajena', '0199a000-0000-7000-8000-0000000000aa'],
    ['inexistente', '0199a000-0000-7000-8000-0000000000ff'],
  ])('F004_CA20_CuentaAjenaEInexistente_MismaPantallaNoEncontrada_%s', async (_caso, id) => {
    servidor.use(
      http.get('/api/mis-cuentas/:cuentaId', () => respuestaDeProblema(404, crearProblema(404, 'no-encontrado'))),
    );

    renderizarEnElArea(<DetalleDeCuenta />, { ruta: `/mis-cuentas/${id}`, patron: '/mis-cuentas/:cuentaId' });

    expect(await screen.findByText('Cuenta no encontrada')).toBeInTheDocument();
    expect(screen.queryByText('1000000001')).not.toBeInTheDocument();
  });

  test('F004_CL24_DetalleConApiCaida_OfreceReintentarEnVezDeNoEncontrada', async () => {
    servidor.use(
      http.get('/api/mis-cuentas/:cuentaId', () => respuestaDeProblema(500, crearProblema(500, 'error-inesperado'))),
    );

    renderizarEnElArea(<DetalleDeCuenta />, {
      ruta: `/mis-cuentas/${ID_PROPIO}`,
      patron: '/mis-cuentas/:cuentaId',
    });

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('Cuenta no encontrada')).not.toBeInTheDocument();
  });
});
