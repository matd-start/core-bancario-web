import createClient, { type Client, type Middleware } from 'openapi-fetch';
import type { MotivoDeCierre } from '../sesion/canalDeSesion';
import type { paths } from './generado/api';
import type { paths as pathsDelBff } from './generado/bff';

/** Qué hacer cuando el BFF o la API dicen 401 / 403. Los dos los pone ProveedorDeSesion. */
export type AlTerminarSesion = (motivo: MotivoDeCierre) => void;

/** openapi-fetch con baseUrl "/api". Un 403 (la API es la autoridad, ADR-0015) avisa por `alSerProhibido`. */
export function crearClienteDeLaApi(alTerminarSesion: AlTerminarSesion, alSerProhibido?: () => void): Client<paths> {
  const cliente = createClient<paths>({ baseUrl: '/api', credentials: 'same-origin' });
  cliente.use(crearMiddlewareDeSesion(alTerminarSesion, alSerProhibido));
  return cliente;
}

/** openapi-fetch con baseUrl "": las rutas del contrato del BFF ya empiezan por /bff. */
export function crearClienteDelBff(alTerminarSesion: AlTerminarSesion): Client<pathsDelBff> {
  const cliente = createClient<pathsDelBff>({ baseUrl: '', credentials: 'same-origin' });
  cliente.use(crearMiddlewareDeSesion(alTerminarSesion));
  return cliente;
}

/** Códigos de un 401 → motivo del aviso que verá la persona. Lo no reconocido se trata como sesión revocada. */
const MOTIVO_POR_CODIGO: Record<string, MotivoDeCierre> = {
  'sesion-vencida-por-inactividad': 'inactividad',
  'sesion-vencida-por-vida-maxima': 'vida-maxima',
  'sesion-revocada': 'revocada',
  'sin-sesion': 'revocada',
  'no-autenticado': 'revocada',
};

async function motivoDeUn401(respuesta: Response): Promise<MotivoDeCierre> {
  try {
    const cuerpo: unknown = await respuesta.clone().json();
    const codigo = typeof cuerpo === 'object' && cuerpo !== null && 'codigo' in cuerpo ? cuerpo.codigo : null;
    return typeof codigo === 'string' ? (MOTIVO_POR_CODIGO[codigo] ?? 'revocada') : 'revocada';
  } catch {
    return 'revocada'; // un 401 sin cuerpo legible sigue siendo una sesión terminada
  }
}

/**
 * Middleware compartido de openapi-fetch (ADR-0020, ADR-0022): pone "X-CSRF: 1" en cada petición y convierte un 401 en
 * "sesión terminada" con su motivo. No reintenta nada: repetir una petición después de un 401 no la arregla.
 */
export function crearMiddlewareDeSesion(alTerminarSesion: AlTerminarSesion, alSerProhibido?: () => void): Middleware {
  return {
    onRequest({ request }) {
      request.headers.set('X-CSRF', '1');
      return request;
    },
    async onResponse({ response }) {
      if (response.status === 401) alTerminarSesion(await motivoDeUn401(response));
      else if (response.status === 403) alSerProhibido?.();
    },
  };
}
