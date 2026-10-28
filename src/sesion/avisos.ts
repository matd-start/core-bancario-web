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

export const MENSAJES_DE_AVISO: Record<Aviso, string> = {
  'inicio-fallido': 'No pudimos iniciar tu sesión.',
  'identidad-no-disponible': 'El inicio de sesión no está disponible; intenta más tarde',
  'otra-sesion-abierta': 'Ya tienes una sesión abierta en otra área.',
  'clave-actualizada': 'Clave actualizada',
  'clave-sin-cambios': 'Tu clave no cambió.',
  inactividad: 'Tu sesión se cerró por inactividad',
  'vida-maxima': 'Tu sesión terminó; vuelve a iniciar sesión',
  // CL-12: no dice por qué (un acceso deshabilitado o restablecido no se revela en pantalla).
  revocada: 'Tu sesión ya no está activa. Inicia sesión de nuevo.',
  'sesion-cerrada': 'Cerraste tu sesión.',
};

function esAviso(valor: string | null): valor is Aviso {
  return valor !== null && Object.hasOwn(MENSAJES_DE_AVISO, valor);
}

/** Lee ?aviso= (valor desconocido → null). El valor nunca se escribe en la página: solo elige un mensaje del catálogo. */
export function leerAviso(busqueda: string): Aviso | null {
  const valor = new URLSearchParams(busqueda).get('aviso');
  return esAviso(valor) ? valor : null;
}

/** Quita ?aviso= de la URL con history.replaceState, sin recargar. */
export function limpiarAviso(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('aviso');
  window.history.replaceState(window.history.state as unknown, '', url.pathname + url.search + url.hash);
}
