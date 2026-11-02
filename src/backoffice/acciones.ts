export type EstadoDeCuenta = 'Activa' | 'Bloqueada' | 'Cerrada';
export type AccionDeCuenta = 'Bloquear' | 'Desbloquear' | 'Cerrar';

const ESTADOS_DE_CUENTA: readonly string[] = ['Activa', 'Bloqueada', 'Cerrada'];

/**
 * Frontera de CuentaDto.estado, que el contrato publica como texto libre: un estado que la app no conoce es null, y
 * quien lo recibe lo muestra tal cual y no ofrece acciones (RN-14: no se adivinan transiciones).
 */
export function comoEstadoDeCuenta(texto: string): EstadoDeCuenta | null {
  return ESTADOS_DE_CUENTA.find((estado): estado is EstadoDeCuenta => estado === texto) ?? null;
}

/** RN-14: Activa → [Bloquear, Cerrar]; Bloqueada → [Desbloquear]; Cerrada → []. */
export function accionesDeCuenta(estado: EstadoDeCuenta): AccionDeCuenta[] {
  switch (estado) {
    case 'Activa':
      return ['Bloquear', 'Cerrar'];
    case 'Bloqueada':
      return ['Desbloquear'];
    case 'Cerrada':
      return [];
  }
}

export type EstadoDelAcceso = 'SinAcceso' | 'Habilitado' | 'Deshabilitado' | 'no-disponible';
export type AccionDeAcceso = 'Habilitar' | 'Restablecer' | 'Deshabilitar';

const ESTADOS_CONOCIDOS_DEL_ACCESO: readonly string[] = ['SinAcceso', 'Habilitado', 'Deshabilitado'];

/** Frontera de EstadoDeAccesoDto.estado (texto libre): cualquier valor desconocido es 'no-disponible' y no tiene acciones (CL-20). */
export function comoEstadoDelAcceso(texto: string): EstadoDelAcceso {
  return ESTADOS_CONOCIDOS_DEL_ACCESO.find((estado): estado is EstadoDelAcceso => estado === texto) ?? 'no-disponible';
}

/** RF-16: SinAcceso → [Habilitar]; Habilitado → [Restablecer, Deshabilitar]; Deshabilitado → [Habilitar]; no-disponible → [] (CL-20). */
export function accionesDeAcceso(estado: EstadoDelAcceso): AccionDeAcceso[] {
  switch (estado) {
    case 'SinAcceso':
    case 'Deshabilitado':
      return ['Habilitar'];
    case 'Habilitado':
      return ['Restablecer', 'Deshabilitar'];
    case 'no-disponible':
      return [];
  }
}
