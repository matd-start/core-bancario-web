import { delay, http, HttpResponse } from 'msw';
import {
  crearAccesoHabilitado,
  crearCliente,
  crearCuenta,
  crearEstadoDeAcceso,
  crearFicha,
  crearProblema,
  ID_DEL_CLIENTE,
} from './datos';
import { respuestaDeProblema } from './manejadores';

/** El cuerpo JSON de una petición como un objeto (o vacío): las pruebas lo usan para comprobar lo que envió la SPA. */
export async function leerCuerpo(peticion: Request): Promise<Record<string, unknown>> {
  const cuerpo: unknown = await peticion.json();
  return typeof cuerpo === 'object' && cuerpo !== null ? Object.fromEntries(Object.entries(cuerpo)) : {};
}

/** Lo que la API entiende como el mismo documento: sin puntos, espacios ni guiones (RN-17). */
function normalizarDocumento(texto: string | null): string {
  return (texto ?? '').replaceAll(/[\s.-]/g, '').toUpperCase();
}

/**
 * Manejadores por defecto de `/api/clientes/**` y `/api/cuentas/**` (004b): el cliente CC 1234567 con una cuenta Activa
 * y sin acceso digital. Cada prueba los sustituye con servidor.use(...) para su escenario. El orden importa: MSW toma
 * el primero que coincide, así que `por-documento` va antes que `/clientes/:clienteId`.
 */
export const manejadoresDelBackoffice = [
  http.get('/api/clientes/por-documento', ({ request }) => {
    const numero = normalizarDocumento(new URL(request.url).searchParams.get('numeroDocumento'));
    return numero === crearCliente().numeroDocumento
      ? HttpResponse.json(crearFicha())
      : respuestaDeProblema(404, crearProblema(404, 'no-encontrado'));
  }),
  http.get('/api/clientes/:clienteId/acceso-digital', () => HttpResponse.json(crearEstadoDeAcceso())),
  http.get('/api/clientes/:clienteId', () => HttpResponse.json(crearFicha())),
  http.post('/api/clientes', () => HttpResponse.json(crearCliente(), { status: 201 })),
  http.post('/api/clientes/:clienteId/cuentas', async () => {
    await delay(10);
    return HttpResponse.json(crearCuenta({ id: '0199a000-0000-7000-8000-000000000099', numero: '1000000099' }), {
      status: 201,
    });
  }),
  http.post('/api/cuentas/:cuentaId/bloquear', () => HttpResponse.json(crearCuenta({ estado: 'Bloqueada' }))),
  http.post('/api/cuentas/:cuentaId/desbloquear', () => HttpResponse.json(crearCuenta({ estado: 'Activa' }))),
  http.post('/api/cuentas/:cuentaId/cerrar', () =>
    HttpResponse.json(crearCuenta({ estado: 'Cerrada', fechaCierre: '2026-04-20T09:00:00Z' })),
  ),
  http.post('/api/clientes/:clienteId/acceso-digital/habilitar', () => HttpResponse.json(crearAccesoHabilitado())),
  http.post('/api/clientes/:clienteId/acceso-digital/deshabilitar', () =>
    HttpResponse.json({
      solicitudId: '0199a000-0000-7000-8000-0000000000a2',
      clienteId: ID_DEL_CLIENTE,
      accion: 'Deshabilitar',
      fecha: '2026-03-15T10:35:00Z',
    }),
  ),
];
