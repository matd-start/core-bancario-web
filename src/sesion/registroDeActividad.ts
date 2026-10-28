export const INTERVALO_MINIMO_ENTRE_LATIDOS_MS = 15_000;

/** El tiempo y los temporizadores como dependencia: las pruebas pasan un reloj manual. */
export interface Temporizador {
  ahora(): number;
  programar(fn: () => void, ms: number): number;
  cancelar(id: number): void;
}

export interface RegistroDeActividad {
  /** RN-25. Envía ya si pasaron ≥ 15 s desde el último envío; si no, deja uno pendiente para cuando se cumplan. */
  notificarInteraccion(): void;
  /** Envía el pendiente, si lo hay. */
  vaciar(): Promise<void>;
  detener(): void;
}

const temporizadorDelNavegador: Temporizador = {
  ahora: () => Date.now(),
  programar: (fn, ms) => window.setTimeout(fn, ms),
  cancelar: (id) => {
    window.clearTimeout(id);
  },
};

/** Limita los latidos al BFF a uno cada 15 s: las interacciones intermedias se funden en un solo latido pendiente. */
export function crearRegistroDeActividad(
  enviarLatido: () => Promise<void>,
  temporizador: Temporizador = temporizadorDelNavegador,
): RegistroDeActividad {
  let ultimoEnvio: number | null = null;
  let pendiente: number | null = null;

  /** Un latido que falla no debe romper la interfaz: el 401 ya lo trata el middleware y la siguiente interacción reintenta. */
  function enviar(): Promise<void> {
    ultimoEnvio = temporizador.ahora();
    return enviarLatido().catch(() => undefined);
  }

  function descartarPendiente(): boolean {
    if (pendiente === null) return false;
    temporizador.cancelar(pendiente);
    pendiente = null;
    return true;
  }

  return {
    notificarInteraccion() {
      if (pendiente !== null) return;
      const espera =
        ultimoEnvio === null ? 0 : Math.max(0, ultimoEnvio + INTERVALO_MINIMO_ENTRE_LATIDOS_MS - temporizador.ahora());
      if (espera === 0) {
        void enviar();
        return;
      }
      pendiente = temporizador.programar(() => {
        pendiente = null;
        void enviar();
      }, espera);
    },
    async vaciar() {
      if (descartarPendiente()) await enviar();
    },
    detener() {
      descartarPendiente();
    },
  };
}

/** Escucha click y keydown (fase de captura) en destino. NO escucha mousemove, pointermove, wheel ni scroll. */
export function escucharInteraccionesDeliberadas(destino: Document, alInteractuar: () => void): () => void {
  const opciones = { capture: true };
  destino.addEventListener('click', alInteractuar, opciones);
  destino.addEventListener('keydown', alInteractuar, opciones);
  return () => {
    destino.removeEventListener('click', alInteractuar, opciones);
    destino.removeEventListener('keydown', alInteractuar, opciones);
  };
}
