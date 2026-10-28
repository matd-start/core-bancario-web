import { http, HttpResponse, type JsonBodyType } from 'msw';
import { crearCuenta, crearSesion } from './datos';

/** Respuesta de error con el formato de ADR-0011 (application/problem+json). */
export function respuestaDeProblema(estado: number, cuerpo: JsonBodyType) {
  return HttpResponse.json(cuerpo, { status: estado, headers: { 'Content-Type': 'application/problem+json' } });
}

/**
 * Manejadores por defecto: un cliente con sesión abierta y una cuenta Activa en COP. Cada prueba los sustituye con
 * servidor.use(...) para su escenario. La URL es relativa: MSW la resuelve contra el origen de jsdom.
 */
export const manejadoresPorDefecto = [
  http.get('/bff/sesion', () => HttpResponse.json(crearSesion())),
  http.post('/bff/actividad', () => HttpResponse.json(crearSesion())),
  http.post('/bff/salir', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/mis-cuentas', () => HttpResponse.json([crearCuenta()])),
];
