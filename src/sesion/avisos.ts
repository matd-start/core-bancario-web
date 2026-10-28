// SDD: esqueleto creado por test-writer
/* eslint-disable @typescript-eslint/no-unused-vars -- esqueleto: los parámetros se usan al implementarlo */
export type Aviso =
  | 'inicio-fallido'
  | 'identidad-no-disponible'
  | 'otra-sesion-abierta'
  | 'clave-actualizada'
  | 'clave-sin-cambios'
  | 'inactividad'
  | 'vida-maxima'
  | 'revocada'
  | 'sesion-cerrada';

export const MENSAJES_DE_AVISO = {} as Record<Aviso, string>;

/** Lee ?aviso= (valor desconocido → null). */
export function leerAviso(_busqueda: string): Aviso | null {
  throw new Error('SDD: no implementado');
}

/** Quita ?aviso= de la URL con history.replaceState, sin recargar. */
export function limpiarAviso(): void {
  throw new Error('SDD: no implementado');
}
