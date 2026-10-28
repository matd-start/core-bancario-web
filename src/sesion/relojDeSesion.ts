// SDD: esqueleto creado por test-writer
/* eslint-disable @typescript-eslint/no-unused-vars -- esqueleto: los parámetros se usan al implementarlo */
import type { components } from '../api/generado/bff';

export type SesionDto = components['schemas']['SesionDto'];

export const ANTICIPO_DEL_AVISO_MS = 60_000;

/** Instantes locales (Date.now()) de cada cierre. */
export interface PlazosLocales {
  venceInactividad: number;
  venceVidaMaxima: number;
}

export function aPlazosLocales(_sesion: SesionDto, _recibidoEn: number): PlazosLocales {
  throw new Error('SDD: no implementado');
}

export type EstadoDelReloj =
  | { tipo: 'normal'; proximoCambioEn: number }
  | { tipo: 'aviso-inactividad'; cierraEn: number }
  | { tipo: 'aviso-vida-maxima'; cierraEn: number }
  | { tipo: 'vencida'; motivo: 'inactividad' | 'vida-maxima' };

export function evaluarReloj(_plazos: PlazosLocales, _ahora: number): EstadoDelReloj {
  throw new Error('SDD: no implementado');
}
