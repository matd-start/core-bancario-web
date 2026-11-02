import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { confirmarEnElDialogo } from '../pruebas/backoffice';
import {
  crearAccesoHabilitado,
  crearEstadoDeAcceso,
  crearProblema,
  ID_DEL_CLIENTE,
  type EstadoDeAccesoDto,
} from '../pruebas/datos';
import { respuestaDeProblema } from '../pruebas/manejadores';
import { renderizarElBackoffice } from '../pruebas/renderizar';
import { servidor } from '../pruebas/servidor';

// AccesoDigital vive dentro de la ficha (su consulta es propia, ['acceso', id]), así que se prueba por la ficha.
// Se supone que las acciones son botones llamados "Habilitar", "Restablecer" y "Deshabilitar" y que cada una abre un
// diálogo de alerta cuyo botón de confirmar empieza por el mismo verbo. Si la acción falla, el diálogo de confirmación
// se cierra y el mensaje queda en la ficha, con el botón otra vez activo.

const RUTA = `/backoffice/clientes/${ID_DEL_CLIENTE}`;
const ACCIONES_DE_ACCESO = ['Habilitar', 'Restablecer', 'Deshabilitar'];

function estadoDeAcceso(cambios: Partial<EstadoDeAccesoDto>) {
  servidor.use(
    http.get('/api/clientes/:clienteId/acceso-digital', () => HttpResponse.json(crearEstadoDeAcceso(cambios))),
  );
}

/** Lo que el operador puede pulsar para gestionar el acceso, sin las acciones de las cuentas. */
function botonesDeAcceso(): string[] {
  return screen
    .queryAllByRole('button')
    .map((boton) => boton.textContent)
    .filter((texto) => ACCIONES_DE_ACCESO.includes(texto));
}

function habilitarDevuelve(accion: 'Habilitar' | 'Restablecer', claveTemporal: string) {
  servidor.use(
    http.post('/api/clientes/:clienteId/acceso-digital/habilitar', () =>
      HttpResponse.json(crearAccesoHabilitado({ accion, claveTemporal })),
    ),
  );
}

describe('AccesoDigital: el estado (RF-16, CA-28)', () => {
  test.each([
    ['SinAcceso', /Sin habilitar/, ['Habilitar']],
    ['Habilitado', /Habilitado/, ['Restablecer', 'Deshabilitar']],
    ['Deshabilitado', /Deshabilitado/, ['Habilitar']],
  ])('F004_CA28_Ficha_MuestraEstadoYAccionesDelAcceso_%s', async (estado, texto, acciones) => {
    estadoDeAcceso({ estado, primerIngresoPendiente: estado === 'Habilitado' ? false : null });

    renderizarElBackoffice(RUTA);

    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(botonesDeAcceso()).toEqual(acciones);
  });

  test('F004_CA28_HabilitadoConPrimerIngresoPendiente_LoDice', async () => {
    estadoDeAcceso({ estado: 'Habilitado', primerIngresoPendiente: true });

    renderizarElBackoffice(RUTA);

    expect(await screen.findByText(/primer ingreso pendiente/i)).toBeInTheDocument();
  });

  test('F004_CA28_HabilitadoQueYaEntro_NoDiceQueElPrimerIngresoEstaPendiente', async () => {
    estadoDeAcceso({ estado: 'Habilitado', primerIngresoPendiente: false });

    renderizarElBackoffice(RUTA);

    await screen.findByText(/Habilitado/);
    expect(screen.queryByText(/primer ingreso pendiente/i)).not.toBeInTheDocument();
  });

  test('F004_CA28_Deshabilitar_ConfirmaYElEstadoPasaADeshabilitado', async () => {
    let deshabilitado = false;
    servidor.use(
      http.get('/api/clientes/:clienteId/acceso-digital', () =>
        HttpResponse.json(
          crearEstadoDeAcceso(
            deshabilitado
              ? { estado: 'Deshabilitado', primerIngresoPendiente: null }
              : { estado: 'Habilitado', primerIngresoPendiente: false },
          ),
        ),
      ),
      http.post('/api/clientes/:clienteId/acceso-digital/deshabilitar', () => {
        deshabilitado = true;
        return HttpResponse.json({ ...crearAccesoHabilitado(), accion: 'Deshabilitar' });
      }),
    );
    renderizarElBackoffice(RUTA);
    await userEvent.click(await screen.findByRole('button', { name: 'Deshabilitar' }));

    await confirmarEnElDialogo(/^Deshabilitar/);

    expect(await screen.findByText(/Deshabilitado/)).toBeInTheDocument();
    await waitFor(() => {
      expect(botonesDeAcceso()).toEqual(['Habilitar']);
    });
  });

  test('F004_CA28_CancelarLaConfirmacion_NoLlamaALaApi', async () => {
    let peticiones = 0;
    estadoDeAcceso({ estado: 'Habilitado', primerIngresoPendiente: false });
    servidor.use(
      http.post('/api/clientes/:clienteId/acceso-digital/deshabilitar', () => {
        peticiones++;
        return HttpResponse.json(crearAccesoHabilitado());
      }),
    );
    renderizarElBackoffice(RUTA);
    await userEvent.click(await screen.findByRole('button', { name: 'Deshabilitar' }));

    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(peticiones).toBe(0);
  });
});

describe('AccesoDigital: habilitar y restablecer (RF-13, RN-20, CL-21)', () => {
  test('F004_CA31_Restablecer_ConfirmacionExplicaConsecuenciasYDialogoDiceRestablecido', async () => {
    estadoDeAcceso({ estado: 'Habilitado', primerIngresoPendiente: false });
    habilitarDevuelve('Restablecer', 'Tmp-Restablecida-77');
    renderizarElBackoffice(RUTA);

    await userEvent.click(await screen.findByRole('button', { name: 'Restablecer' }));

    const confirmacion = await screen.findByRole('alertdialog');
    expect(confirmacion).toHaveTextContent(/clave (temporal )?nueva/i);
    expect(confirmacion).toHaveTextContent(/segundo factor/i);
    expect(confirmacion).toHaveTextContent(/sesiones/i);
    await userEvent.click(within(confirmacion).getByRole('button', { name: /^Restablecer/ }));
    const dialogoDeLaClave = await screen.findByRole('alertdialog', { name: /Restablecido/ });
    expect(dialogoDeLaClave).toHaveTextContent('Tmp-Restablecida-77');
  });

  test('F004_CL21_BotonHabilitarPeroApiRestablece_DialogoDiceRestablecido', async () => {
    // La ficha aún ve "Sin acceso", pero otro operador ya lo habilitó: la API restablece.
    estadoDeAcceso({ estado: 'SinAcceso', primerIngresoPendiente: null });
    habilitarDevuelve('Restablecer', 'Tmp-Desactualizada-88');
    renderizarElBackoffice(RUTA);

    await userEvent.click(await screen.findByRole('button', { name: 'Habilitar' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/ya tuvi(era|ese) acceso|ya tiene acceso/i);
    await confirmarEnElDialogo(/^Habilitar/);
    const dialogoDeLaClave = await screen.findByRole('alertdialog', { name: /Restablecido/ });
    expect(dialogoDeLaClave).toHaveTextContent('Tmp-Desactualizada-88');
    expect(screen.queryByRole('alertdialog', { name: /Habilitado/ })).not.toBeInTheDocument();
  });

  test('F004_CA30_Habilitar_MuestraLaClaveEnUnDialogoConElTituloHabilitado', async () => {
    estadoDeAcceso({ estado: 'SinAcceso', primerIngresoPendiente: null });
    habilitarDevuelve('Habilitar', 'Tmp-Primera-Vez-42');
    renderizarElBackoffice(RUTA);
    await userEvent.click(await screen.findByRole('button', { name: 'Habilitar' }));

    await confirmarEnElDialogo(/^Habilitar/);

    const dialogoDeLaClave = await screen.findByRole('alertdialog', { name: /Habilitado/ });
    expect(dialogoDeLaClave).toHaveTextContent('Tmp-Primera-Vez-42');
    expect(within(dialogoDeLaClave).getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(within(dialogoDeLaClave).getByRole('button', { name: 'Ya la entregué' })).toBeInTheDocument();
  });

  test('F004_CA30_YaLaEntregue_LaClaveDesapareceDelDomYDeLaCache', async () => {
    const clave = 'Tmp-Solo-Una-Vez-9031';
    estadoDeAcceso({ estado: 'SinAcceso', primerIngresoPendiente: null });
    habilitarDevuelve('Habilitar', clave);
    const { clienteDeConsultas, router } = renderizarElBackoffice(RUTA);
    await userEvent.click(await screen.findByRole('button', { name: 'Habilitar' }));
    await confirmarEnElDialogo(/^Habilitar/);
    const dialogoDeLaClave = await screen.findByRole('alertdialog', { name: /Habilitado/ });

    await userEvent.click(within(dialogoDeLaClave).getByRole('button', { name: 'Ya la entregué' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(document.body).not.toHaveTextContent(clave);
    // gcTime 0 y mutation.reset(): la mutación sale de la caché cuando nadie la observa.
    await waitFor(() => {
      expect(
        JSON.stringify(
          clienteDeConsultas
            .getMutationCache()
            .getAll()
            .map((m) => m.state),
        ),
      ).not.toContain(clave);
    });
    expect(
      JSON.stringify(
        clienteDeConsultas
          .getQueryCache()
          .getAll()
          .map((c) => c.state.data),
      ),
    ).not.toContain(clave);
    expect(JSON.stringify(router.state.location)).not.toContain(clave);
    expect(window.location.href).not.toContain(clave);
  });

  test.each([
    [502, 'identidad-error'],
    [503, 'identidad-sin-respuesta'],
  ])('F004_CL19_FallaAlHabilitar_%i_DiceQuePuedeReintentarSinRiesgo', async (estado, codigo) => {
    estadoDeAcceso({ estado: 'SinAcceso', primerIngresoPendiente: null });
    servidor.use(
      http.post('/api/clientes/:clienteId/acceso-digital/habilitar', () =>
        respuestaDeProblema(estado, crearProblema(estado, codigo)),
      ),
    );
    renderizarElBackoffice(RUTA);
    await userEvent.click(await screen.findByRole('button', { name: 'Habilitar' }));

    await confirmarEnElDialogo(/^Habilitar/);

    expect(await screen.findByText(/reintentar sin riesgo/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Habilitar' })).toBeEnabled();
    });
  });

  test('F004_CL19_ReintentoConExito_EntregaUnaClaveTemporalNueva', async () => {
    let intentos = 0;
    estadoDeAcceso({ estado: 'SinAcceso', primerIngresoPendiente: null });
    servidor.use(
      http.post('/api/clientes/:clienteId/acceso-digital/habilitar', () => {
        intentos++;
        return intentos === 1
          ? respuestaDeProblema(503, crearProblema(503, 'identidad-sin-respuesta'))
          : HttpResponse.json(crearAccesoHabilitado({ claveTemporal: 'Tmp-Del-Reintento-55' }));
      }),
    );
    renderizarElBackoffice(RUTA);
    await userEvent.click(await screen.findByRole('button', { name: 'Habilitar' }));
    await confirmarEnElDialogo(/^Habilitar/);
    await screen.findByText(/reintentar sin riesgo/i);

    await userEvent.click(await screen.findByRole('button', { name: 'Habilitar' }));
    await confirmarEnElDialogo(/^Habilitar/);

    const dialogoDeLaClave = await screen.findByRole('alertdialog', { name: /Habilitado/ });
    expect(dialogoDeLaClave).toHaveTextContent('Tmp-Del-Reintento-55');
    expect(intentos).toBe(2);
  });
});

describe('AccesoDigital: sin estado (CL-20, CA-32)', () => {
  test.each([
    [502, 'identidad-error'],
    [503, 'identidad-sin-respuesta'],
  ])('F004_CA32_EstadoNoDisponible_%i_FichaVisibleYAccionesDesactivadas', async (estado, codigo) => {
    servidor.use(
      http.get('/api/clientes/:clienteId/acceso-digital', () =>
        respuestaDeProblema(estado, crearProblema(estado, codigo)),
      ),
    );

    renderizarElBackoffice(RUTA);

    expect(await screen.findByText('Estado del acceso no disponible')).toBeInTheDocument();
    // La ficha se ve igual: el cliente y sus cuentas.
    expect(screen.getByText('1000000001')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Ana María');
    // Ninguna acción de acceso está activa (no se muestran, o se muestran desactivadas).
    const activas = screen
      .queryAllByRole('button', { name: /^(Habilitar|Restablecer|Deshabilitar)$/ })
      .filter((boton) => !boton.hasAttribute('disabled'));
    expect(activas).toEqual([]);
  });

  test('F004_CA32_EstadoDesconocido_SeTrataComoNoDisponibleSinAcciones', async () => {
    // El contrato publica `estado` como texto libre: un valor que la app no conoce no se adivina.
    estadoDeAcceso({ estado: 'Suspendido', primerIngresoPendiente: null });

    renderizarElBackoffice(RUTA);

    expect(await screen.findByText('Estado del acceso no disponible')).toBeInTheDocument();
    expect(botonesDeAcceso()).toEqual([]);
    expect(screen.getByText('1000000001')).toBeInTheDocument();
  });
});
