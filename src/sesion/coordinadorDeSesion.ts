import { crearCanalDeSesion, type CanalDeSesion, type MensajeDeSesion } from './canalDeSesion';

/**
 * Lo que comparten el cierre de sesión y el canal entre pestañas, y que cambia sin que la pantalla deba dibujarse de
 * nuevo. Vive en una función con variables propias (un cierre, "closure") y no en `useRef`, porque los clientes HTTP lo
 * usan al crearse durante el render y React no permite leer refs ahí.
 */
export interface CoordinadorDeSesion {
  /** true solo la primera vez: evita que dos 401 seguidos (o un 401 y un clic) cierren la sesión dos veces. */
  iniciarCierre(): boolean;
  /** Avisa a las demás pestañas. No hace nada si el canal aún no está abierto. */
  publicar(mensaje: MensajeDeSesion): void;
  /** Abre el canal y escucha. Devuelve la función que lo cierra. */
  conectar(alRecibir: (mensaje: MensajeDeSesion) => void): () => void;
}

export function crearCoordinadorDeSesion(): CoordinadorDeSesion {
  let cerrando = false;
  let canal: CanalDeSesion | null = null;
  return {
    iniciarCierre() {
      if (cerrando) return false;
      cerrando = true;
      return true;
    },
    publicar(mensaje) {
      canal?.publicar(mensaje);
    },
    conectar(alRecibir) {
      const abierto = crearCanalDeSesion();
      canal = abierto;
      const dejarDeEscuchar = abierto.escuchar(alRecibir);
      return () => {
        dejarDeEscuchar();
        abierto.cerrar();
        canal = null;
      };
    },
  };
}
