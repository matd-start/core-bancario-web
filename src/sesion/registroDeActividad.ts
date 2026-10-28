// SDD: esqueleto creado por test-writer
/* eslint-disable @typescript-eslint/no-unused-vars -- esqueleto: los parámetros se usan al implementarlo */
export const INTERVALO_MINIMO_ENTRE_LATIDOS_MS = 15_000;

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

export function crearRegistroDeActividad(
  _enviarLatido: () => Promise<void>,
  _temporizador?: Temporizador,
): RegistroDeActividad {
  throw new Error('SDD: no implementado');
}

/** Escucha click y keydown (fase de captura) en destino. Devuelve la función para dejar de escuchar. */
export function escucharInteraccionesDeliberadas(_destino: Document, _alInteractuar: () => void): () => void {
  throw new Error('SDD: no implementado');
}
