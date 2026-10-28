import { QueryClient } from '@tanstack/react-query';
import { FalloDeLaApi } from '../api/errores';

/** Estos errores no se arreglan repitiendo la petición: sesión terminada, sin permiso o no existe. */
const ESTADOS_QUE_NO_SE_REINTENTAN = new Set([401, 403, 404]);

/**
 * Configuración de TanStack Query (plan, sección 3.4):
 * - consultas: 1 reintento, salvo en 401, 403 y 404;
 * - refetchOnWindowFocus activo. Es automático, así que nunca cuenta como actividad (RN-25);
 * - mutaciones: sin reintentos y sin guardar el resultado (CL-15: nunca se repite sola una acción que cambia datos).
 */
export function crearClienteDeConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (intentos, error) =>
          intentos < 1 && !(error instanceof FalloDeLaApi && ESTADOS_QUE_NO_SE_REINTENTAN.has(error.error.estado)),
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0, gcTime: 0 },
    },
  });
}
