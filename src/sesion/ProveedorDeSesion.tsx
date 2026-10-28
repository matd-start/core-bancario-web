// SDD: esqueleto creado por test-writer
/* eslint-disable @typescript-eslint/no-unused-vars -- esqueleto: los parámetros se usan al implementarlo */
import type { JSX, ReactNode } from 'react';
import type { SesionDto, EstadoDelReloj } from './relojDeSesion';
import type { MotivoDeCierre } from './canalDeSesion';

export type AreaDeLaApp = 'clientes' | 'empleados';
export type EstadoDeSesionEnLaApp = 'cargando' | 'sin-sesion' | 'otra-area' | 'sin-permiso' | 'abierta';

export interface Sesion {
  estado: EstadoDeSesionEnLaApp;
  datos: SesionDto | null;
  reloj: EstadoDelReloj | null;
  cerrarSesion(motivo?: MotivoDeCierre): Promise<void>;
  seguirConectado(): Promise<void>;
  iniciarSesion(regreso?: string): void;
}

export function ProveedorDeSesion(_props: { area: AreaDeLaApp; children: ReactNode }): JSX.Element {
  throw new Error('SDD: no implementado');
}

// Mismo archivo que el componente, como pide el plan (sección 3.4); si react-refresh protesta, el coder lo separa.
// eslint-disable-next-line react-refresh/only-export-components
export function useSesion(): Sesion {
  throw new Error('SDD: no implementado');
}
