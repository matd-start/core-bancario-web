import type { SesionDto } from './relojDeSesion';

export type MotivoDeCierre = 'usuario' | 'inactividad' | 'vida-maxima' | 'revocada';

export type MensajeDeSesion =
  { tipo: 'plazos'; sesion: SesionDto; recibidoEn: number } | { tipo: 'cerrada'; motivo: MotivoDeCierre };

export interface CanalDeSesion {
  publicar(mensaje: MensajeDeSesion): void;
  escuchar(fn: (m: MensajeDeSesion) => void): () => void;
  cerrar(): void;
}

const NOMBRE_DEL_CANAL = 'core-bancario-sesion';

function esMensajeDeSesion(dato: unknown): dato is MensajeDeSesion {
  if (typeof dato !== 'object' || dato === null || !('tipo' in dato)) return false;
  return dato.tipo === 'plazos' || dato.tipo === 'cerrada';
}

/**
 * RNF-07: las pestañas del mismo navegador se avisan por BroadcastChannel (no usa localStorage). Quien publica no
 * recibe su propio mensaje: es el comportamiento de BroadcastChannel entre instancias distintas.
 */
export function crearCanalDeSesion(): CanalDeSesion {
  const canal = new BroadcastChannel(NOMBRE_DEL_CANAL);
  return {
    publicar(mensaje) {
      canal.postMessage(mensaje);
    },
    escuchar(fn) {
      const alRecibir = (evento: MessageEvent<unknown>) => {
        if (esMensajeDeSesion(evento.data)) fn(evento.data);
      };
      canal.addEventListener('message', alRecibir);
      return () => {
        canal.removeEventListener('message', alRecibir);
      };
    },
    cerrar() {
      canal.close();
    },
  };
}
