import type { components } from './generado/api';
import { MENSAJES_DE_ERROR, MENSAJE_GENERICO } from './mensajes';

export type CodigoDeError = components['schemas']['CodigoDeError'];

/** Un error de la API (o del BFF) ya traducido para la interfaz. */
export interface ErrorDeLaApi {
  estado: number;
  /** null si el código es desconocido o no hay cuerpo. */
  codigo: CodigoDeError | null;
  /** MENSAJES_DE_ERROR[codigo] o MENSAJE_GENERICO. Nunca `detail` (RNF-12). */
  mensaje: string;
  traceId: string | null;
  /** De ValidationProblemDetails (400); {} si no hay. */
  errores: Record<string, string[]>;
}

/** Excepción para las funciones de consulta de TanStack Query: lleva el error ya interpretado. */
export class FalloDeLaApi extends Error {
  readonly error: ErrorDeLaApi;

  constructor(error: ErrorDeLaApi) {
    super(error.mensaje);
    this.name = 'FalloDeLaApi';
    this.error = error;
  }
}

function comoRegistro(valor: unknown): Record<string, unknown> | null {
  return typeof valor === 'object' && valor !== null ? Object.fromEntries(Object.entries(valor)) : null;
}

function esCodigoConocido(codigo: unknown): codigo is CodigoDeError {
  return typeof codigo === 'string' && Object.hasOwn(MENSAJES_DE_ERROR, codigo);
}

function leerErrores(valor: unknown): Record<string, string[]> {
  const registro = comoRegistro(valor);
  if (registro === null) return {};
  const errores: Record<string, string[]> = {};
  for (const [campo, mensajes] of Object.entries(registro)) {
    if (Array.isArray(mensajes)) errores[campo] = mensajes.filter((m): m is string => typeof m === 'string');
  }
  return errores;
}

/**
 * Traduce el cuerpo de un error HTTP (ADR-0011) al mensaje de la interfaz. Un 500 o un código desconocido muestran el
 * mensaje genérico; el traceId se conserva para que el usuario lo dé a soporte. `detail` no se lee nunca.
 */
export function interpretarError(estado: number, cuerpo: unknown): ErrorDeLaApi {
  const registro = comoRegistro(cuerpo);
  const codigo = esCodigoConocido(registro?.codigo) ? registro.codigo : null;
  const traceId = typeof registro?.traceId === 'string' ? registro.traceId : null;
  const mensaje = codigo !== null && estado !== 500 ? MENSAJES_DE_ERROR[codigo] : MENSAJE_GENERICO;
  return { estado, codigo, mensaje, traceId, errores: leerErrores(registro?.errors) };
}

/** Lo que devuelve una llamada de openapi-fetch: o hay `data`, o hay `error`. */
interface RespuestaDeOpenApi<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/** Para las funciones de consulta: devuelve los datos o lanza el error ya interpretado. */
export function exigirDatos<T>(respuesta: RespuestaDeOpenApi<T>): T {
  if (respuesta.data === undefined)
    throw new FalloDeLaApi(interpretarError(respuesta.response.status, respuesta.error));
  return respuesta.data;
}

/** Cualquier cosa que haya lanzado una consulta → ErrorDeLaApi. Una caída de red (sin respuesta) es estado 0. */
export function comoErrorDeLaApi(causa: unknown): ErrorDeLaApi {
  return causa instanceof FalloDeLaApi ? causa.error : interpretarError(0, undefined);
}
