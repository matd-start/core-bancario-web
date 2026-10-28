import type { components } from '../api/generado/bff';

export type SesionDto = components['schemas']['SesionDto'];

/** El aviso sale 60 s antes de cada cierre (CL-06). */
export const ANTICIPO_DEL_AVISO_MS = 60_000;

/** Instantes locales (Date.now()) de cada cierre. */
export interface PlazosLocales {
  venceInactividad: number;
  venceVidaMaxima: number;
}

/**
 * .NET 10 declara los enteros del contrato como `number | string`. Se convierte con comprobación: un valor que no es
 * un número finito cuenta como 0, o sea "ya venció" (cerrar la sesión es lo seguro si no se entiende el plazo).
 */
function segundosEnMilisegundos(segundos: number | string): number {
  const valor = typeof segundos === 'number' ? segundos : Number.parseFloat(segundos);
  return Number.isFinite(valor) ? Math.max(0, valor) * 1000 : 0;
}

/** El servidor manda duraciones, no fechas (ADR-0021): se suman a la hora local en que llegó la respuesta. */
export function aPlazosLocales(sesion: SesionDto, recibidoEn: number): PlazosLocales {
  return {
    venceInactividad: recibidoEn + segundosEnMilisegundos(sesion.segundosHastaInactividad),
    venceVidaMaxima: recibidoEn + segundosEnMilisegundos(sesion.segundosHastaVidaMaxima),
  };
}

export type EstadoDelReloj =
  | { tipo: 'normal'; proximoCambioEn: number }
  | { tipo: 'aviso-inactividad'; cierraEn: number }
  | { tipo: 'aviso-vida-maxima'; cierraEn: number }
  | { tipo: 'vencida'; motivo: 'inactividad' | 'vida-maxima' };

/**
 * Vida máxima manda si vence antes o a la vez. Aviso cuando ahora ≥ cierre − 60 s. Vencida cuando ahora ≥ cierre.
 * proximoCambioEn = instante del siguiente cambio de estado (para un único setTimeout).
 */
export function evaluarReloj(plazos: PlazosLocales, ahora: number): EstadoDelReloj {
  const { venceInactividad, venceVidaMaxima } = plazos;
  if (ahora >= venceVidaMaxima) return { tipo: 'vencida', motivo: 'vida-maxima' };
  if (ahora >= venceInactividad) return { tipo: 'vencida', motivo: 'inactividad' };

  const mandaLaVidaMaxima = venceVidaMaxima <= venceInactividad;
  const cierraEn = mandaLaVidaMaxima ? venceVidaMaxima : venceInactividad;
  if (ahora >= cierraEn - ANTICIPO_DEL_AVISO_MS)
    return { tipo: mandaLaVidaMaxima ? 'aviso-vida-maxima' : 'aviso-inactividad', cierraEn };
  return { tipo: 'normal', proximoCambioEn: cierraEn - ANTICIPO_DEL_AVISO_MS };
}
