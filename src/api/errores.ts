// SDD: esqueleto creado por test-writer
/* eslint-disable @typescript-eslint/no-unused-vars -- esqueleto: los parámetros se usan al implementarlo */
import type { components } from './generado/api';

export type CodigoDeError = components['schemas']['CodigoDeError'];

export interface ErrorDeLaApi {
  estado: number;
  codigo: CodigoDeError | null;
  mensaje: string;
  traceId: string | null;
  errores: Record<string, string[]>;
}

export function interpretarError(_estado: number, _cuerpo: unknown): ErrorDeLaApi {
  throw new Error('SDD: no implementado');
}
