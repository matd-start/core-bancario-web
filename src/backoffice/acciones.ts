// SDD: esqueleto creado por test-writer
export type EstadoDeCuenta = 'Activa' | 'Bloqueada' | 'Cerrada';
export type AccionDeCuenta = 'Bloquear' | 'Desbloquear' | 'Cerrar';

/** RN-14: Activa → [Bloquear, Cerrar]; Bloqueada → [Desbloquear]; Cerrada → []. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function accionesDeCuenta(_estado: EstadoDeCuenta): AccionDeCuenta[] {
  throw new Error('SDD: no implementado');
}

export type EstadoDelAcceso = 'SinAcceso' | 'Habilitado' | 'Deshabilitado' | 'no-disponible';
export type AccionDeAcceso = 'Habilitar' | 'Restablecer' | 'Deshabilitar';

/** RF-16: SinAcceso → [Habilitar]; Habilitado → [Restablecer, Deshabilitar]; Deshabilitado → [Habilitar]; no-disponible → [] (CL-20). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function accionesDeAcceso(_estado: EstadoDelAcceso): AccionDeAcceso[] {
  throw new Error('SDD: no implementado');
}
