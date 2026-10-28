// SDD: esqueleto creado por test-writer
import type { SesionDto } from './relojDeSesion';

export type MotivoDeCierre = 'usuario' | 'inactividad' | 'vida-maxima' | 'revocada';

export type MensajeDeSesion =
  { tipo: 'plazos'; sesion: SesionDto; recibidoEn: number } | { tipo: 'cerrada'; motivo: MotivoDeCierre };

export interface CanalDeSesion {
  publicar(mensaje: MensajeDeSesion): void;
  escuchar(fn: (m: MensajeDeSesion) => void): () => void;
  cerrar(): void;
}

/** BroadcastChannel("core-bancario-sesion"). No usa localStorage. */
export function crearCanalDeSesion(): CanalDeSesion {
  throw new Error('SDD: no implementado');
}
