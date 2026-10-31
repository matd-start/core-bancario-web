import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { accionesVisibles, confirmarEnElDialogo, filaDeCuenta } from '../pruebas/backoffice';
import { crearCuenta, crearFicha, crearProblema, ID_DEL_CLIENTE, type CuentaDto } from '../pruebas/datos';
import { respuestaDeProblema } from '../pruebas/manejadores';
import { leerCuerpo } from '../pruebas/manejadoresDelBackoffice';
import { renderizarElBackoffice } from '../pruebas/renderizar';
import { servidor } from '../pruebas/servidor';

// Lo que estas pruebas suponen de la ficha: cada cuenta es un elemento de lista (o fila) con su número, estado, saldo y
// sus acciones como botones ("Bloquear", "Desbloquear", "Cerrar"); "Cerrar" abre un diálogo de alerta cuyo botón de
// confirmar empieza por "Cerrar"; abrir una cuenta es el selector "Moneda" (COP o USD) y el botón "Abrir cuenta".

const RUTA = `/backoffice/clientes/${ID_DEL_CLIENTE}`;

const ACTIVA = crearCuenta({
  id: '0199a000-0000-7000-8000-000000000001',
  numero: '1000000001',
  estado: 'Activa',
  saldo: { monto: '1234567', moneda: 'COP' },
});
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
  fechaCierre: '2026-04-20T09:00:00Z',
  saldo: { monto: '0', moneda: 'COP' },
});

function fichaConCuentas(...cuentas: CuentaDto[]) {
  servidor.use(http.get('/api/clientes/:clienteId', () => HttpResponse.json(crearFicha(cuentas))));
}

describe('FichaDeCliente: datos y cuentas', () => {
  test('F004_CA19_FichaDeCliente_MuestraElClienteYElSaldoExactoDeCadaCuenta', async () => {
    fichaConCuentas(ACTIVA, BLOQUEADA);

    renderizarElBackoffice(RUTA);

    expect(await screen.findByText('1000000001')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Ana María');
    expect(document.body).toHaveTextContent('Pérez Gómez');
    expect(screen.getByText('$ 1.234.567')).toBeInTheDocument();
    expect(screen.getByText('US$ 12.345.678.901.234,56')).toBeInTheDocument();
  });

  test('F004_CL24_FichaConError500_MuestraReintentarYNuncaQuedaEnBlanco', async () => {
    let consultas = 0;
    servidor.use(
      http.get('/api/clientes/:clienteId', () => {
        consultas++;
        return consultas === 1
          ? respuestaDeProblema(500, crearProblema(500, 'error-inesperado', '00-trace-ficha'))
          : HttpResponse.json(crearFicha([ACTIVA]));
      }),
    );
    renderizarElBackoffice(RUTA);

    expect(await screen.findByText(/00-trace-ficha/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('1000000001')).toBeInTheDocument();
    expect(consultas).toBe(2);
  });
});

describe('FichaDeCliente: abrir cuenta (RF-02, CL-15)', () => {
  test('F004_CA24_DobleClicEnAbrirCuenta_UnaSolaPeticionYCuentaUsdEnCero', async () => {
    const cuentas = [ACTIVA];
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.get('/api/clientes/:clienteId', () => HttpResponse.json(crearFicha([...cuentas]))),
      http.post('/api/clientes/:clienteId/cuentas', async ({ request }) => {
        cuerpos.push(await leerCuerpo(request));
        await delay(50); // la primera petición sigue en curso cuando llega el segundo clic
        const nueva = crearCuenta({
          id: '0199a000-0000-7000-8000-000000000099',
          numero: '1000000099',
          moneda: 'USD',
          estado: 'Activa',
          saldo: { monto: '0.00', moneda: 'USD' },
        });
        cuentas.push(nueva);
        return HttpResponse.json(nueva, { status: 201 });
      }),
    );
    renderizarElBackoffice(RUTA);
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: /^Moneda/ }), 'USD');

    await userEvent.dblClick(screen.getByRole('button', { name: 'Abrir cuenta' }));

    expect(await screen.findByText('1000000099')).toBeInTheDocument();
    const fila = within(filaDeCuenta('1000000099'));
    expect(fila.getByText('US$ 0,00')).toBeInTheDocument();
    expect(fila.getByText('Activa')).toBeInTheDocument();
    expect(cuerpos).toEqual([{ moneda: 'USD' }]);
  });

  test('F004_CL15_ErrorAlAbrirCuenta_NoReintentaSolaYElBotonVuelveAEstarActivo', async () => {
    let peticiones = 0;
    servidor.use(
      http.post('/api/clientes/:clienteId/cuentas', () => {
        peticiones++;
        return respuestaDeProblema(500, crearProblema(500, 'error-inesperado', '00-trace-abrir'));
      }),
    );
    renderizarElBackoffice(RUTA);
    await screen.findByText('1000000001');

    await userEvent.click(screen.getByRole('button', { name: 'Abrir cuenta' }));

    expect(await screen.findByText(/00-trace-abrir/)).toBeInTheDocument();
    expect(peticiones).toBe(1);
    expect(screen.getByRole('button', { name: 'Abrir cuenta' })).toBeEnabled();
  });
});

describe('FichaDeCliente: acciones de la cuenta (RF-03, RN-14)', () => {
  test('F004_CA25_Ficha_ActivaBloqueadaYCerrada_OfrecenSusAcciones', async () => {
    fichaConCuentas(ACTIVA, BLOQUEADA, CERRADA);

    renderizarElBackoffice(RUTA);

    await screen.findByText('1000000003');
    expect(accionesVisibles(filaDeCuenta('1000000001'))).toEqual(['Bloquear', 'Cerrar']);
    expect(accionesVisibles(filaDeCuenta('1000000002'))).toEqual(['Desbloquear']);
    expect(accionesVisibles(filaDeCuenta('1000000003'))).toEqual([]);
  });

  test('F004_CA25_CuentaConEstadoDesconocido_MuestraElEstadoTalCualYSinAcciones', async () => {
    // CuentaDto.estado es texto libre: un estado que la app no conoce no se adivina ni ofrece transiciones (RN-14).
    fichaConCuentas({ ...ACTIVA, estado: 'Suspendida' }, BLOQUEADA);

    renderizarElBackoffice(RUTA);

    await screen.findByText('1000000001');
    expect(within(filaDeCuenta('1000000001')).getByText('Suspendida')).toBeInTheDocument();
    expect(accionesVisibles(filaDeCuenta('1000000001'))).toEqual([]);
    expect(accionesVisibles(filaDeCuenta('1000000002'))).toEqual(['Desbloquear']);
  });

  test('F004_CA25_Bloquear_LaCuentaPasaABloqueadaYOfreceDesbloquear', async () => {
    let bloqueada = false;
    servidor.use(
      http.get('/api/clientes/:clienteId', () =>
        HttpResponse.json(crearFicha([bloqueada ? { ...ACTIVA, estado: 'Bloqueada' } : ACTIVA])),
      ),
      http.post('/api/cuentas/:cuentaId/bloquear', () => {
        bloqueada = true;
        return HttpResponse.json({ ...ACTIVA, estado: 'Bloqueada' });
      }),
    );
    renderizarElBackoffice(RUTA);
    await screen.findByText('1000000001');

    await userEvent.click(within(filaDeCuenta('1000000001')).getByRole('button', { name: 'Bloquear' }));

    await waitFor(() => {
      expect(accionesVisibles(filaDeCuenta('1000000001'))).toEqual(['Desbloquear']);
    });
    expect(within(filaDeCuenta('1000000001')).getByText('Bloqueada')).toBeInTheDocument();
  });

  test('F004_CA25_Desbloquear_LaCuentaVuelveAActivaYOfreceBloquearYCerrar', async () => {
    let bloqueada = true;
    const cuentaBloqueada = { ...ACTIVA, estado: 'Bloqueada' };
    servidor.use(
      http.get('/api/clientes/:clienteId', () => HttpResponse.json(crearFicha([bloqueada ? cuentaBloqueada : ACTIVA]))),
      http.post('/api/cuentas/:cuentaId/desbloquear', () => {
        bloqueada = false;
        return HttpResponse.json(ACTIVA);
      }),
    );
    renderizarElBackoffice(RUTA);
    await screen.findByText('1000000001');

    await userEvent.click(within(filaDeCuenta('1000000001')).getByRole('button', { name: 'Desbloquear' }));

    await waitFor(() => {
      expect(accionesVisibles(filaDeCuenta('1000000001'))).toEqual(['Bloquear', 'Cerrar']);
    });
  });

  test('F004_CA25_CerrarCuenta_PideConfirmacionYSoloAlConfirmarLlamaALaApi', async () => {
    let cerrada = false;
    let peticiones = 0;
    servidor.use(
      http.get('/api/clientes/:clienteId', () =>
        HttpResponse.json(crearFicha([cerrada ? { ...ACTIVA, estado: 'Cerrada' } : ACTIVA])),
      ),
      http.post('/api/cuentas/:cuentaId/cerrar', () => {
        peticiones++;
        cerrada = true;
        return HttpResponse.json({ ...ACTIVA, estado: 'Cerrada' });
      }),
    );
    renderizarElBackoffice(RUTA);
    await screen.findByText('1000000001');

    await userEvent.click(within(filaDeCuenta('1000000001')).getByRole('button', { name: 'Cerrar' }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(peticiones).toBe(0);
    await confirmarEnElDialogo(/^Cerrar/);
    await waitFor(() => {
      expect(accionesVisibles(filaDeCuenta('1000000001'))).toEqual([]);
    });
    expect(within(filaDeCuenta('1000000001')).getByText('Cerrada')).toBeInTheDocument();
    expect(peticiones).toBe(1);
  });

  test('F004_CA25_CerrarCuenta_CancelarNoLlamaALaApi', async () => {
    let peticiones = 0;
    servidor.use(
      http.post('/api/cuentas/:cuentaId/cerrar', () => {
        peticiones++;
        return HttpResponse.json({ ...ACTIVA, estado: 'Cerrada' });
      }),
    );
    renderizarElBackoffice(RUTA);
    await screen.findByText('1000000001');
    await userEvent.click(within(filaDeCuenta('1000000001')).getByRole('button', { name: 'Cerrar' }));

    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(peticiones).toBe(0);
    expect(accionesVisibles(filaDeCuenta('1000000001'))).toEqual(['Bloquear', 'Cerrar']);
  });

  test('F004_CA26_CerrarConSaldo_MensajeDeNegocioYSigueActiva', async () => {
    const conSaldo = { ...ACTIVA, saldo: { monto: '50000', moneda: 'COP' } };
    fichaConCuentas(conSaldo);
    servidor.use(
      http.post('/api/cuentas/:cuentaId/cerrar', () =>
        respuestaDeProblema(422, crearProblema(422, 'saldo-distinto-de-cero')),
      ),
    );
    renderizarElBackoffice(RUTA);
    await screen.findByText('1000000001');
    await userEvent.click(within(filaDeCuenta('1000000001')).getByRole('button', { name: 'Cerrar' }));

    await confirmarEnElDialogo(/^Cerrar/);

    expect(await screen.findByText('No se puede cerrar una cuenta con saldo distinto de cero.')).toBeInTheDocument();
    const fila = within(filaDeCuenta('1000000001'));
    expect(fila.getByText('Activa')).toBeInTheDocument();
    expect(accionesVisibles(filaDeCuenta('1000000001'))).toEqual(['Bloquear', 'Cerrar']);
  });

  test('F004_CA27_Conflicto409_MensajeYLaFichaSeRecarga', async () => {
    let consultasDeLaFicha = 0;
    servidor.use(
      // La primera ficha todavía la ve Activa; después, otro operador ya la bloqueó.
      http.get('/api/clientes/:clienteId', () => {
        consultasDeLaFicha++;
        return HttpResponse.json(crearFicha([consultasDeLaFicha === 1 ? ACTIVA : { ...ACTIVA, estado: 'Bloqueada' }]));
      }),
      http.post('/api/cuentas/:cuentaId/bloquear', () =>
        respuestaDeProblema(409, crearProblema(409, 'conflicto-de-concurrencia')),
      ),
    );
    renderizarElBackoffice(RUTA);
    await screen.findByText('1000000001');

    await userEvent.click(within(filaDeCuenta('1000000001')).getByRole('button', { name: 'Bloquear' }));

    expect(await screen.findByText(/La cuenta cambió mientras tanto/)).toBeInTheDocument();
    await waitFor(() => {
      expect(within(filaDeCuenta('1000000001')).getByText('Bloqueada')).toBeInTheDocument();
    });
    expect(accionesVisibles(filaDeCuenta('1000000001'))).toEqual(['Desbloquear']);
    expect(consultasDeLaFicha).toBe(2);
  });

  test('F004_CL24_BloquearConError500_MensajeGenericoConTraceId', async () => {
    servidor.use(
      http.post('/api/cuentas/:cuentaId/bloquear', () =>
        respuestaDeProblema(500, crearProblema(500, 'error-inesperado', '00-trace-bloquear')),
      ),
    );
    renderizarElBackoffice(RUTA);
    await screen.findByText('1000000001');

    await userEvent.click(within(filaDeCuenta('1000000001')).getByRole('button', { name: 'Bloquear' }));

    expect(await screen.findByText(/00-trace-bloquear/)).toBeInTheDocument();
    expect(within(filaDeCuenta('1000000001')).getByText('Activa')).toBeInTheDocument();
  });
});
