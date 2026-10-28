import type { Client } from 'openapi-fetch';
import { createContext, useContext } from 'react';
import type { paths } from '../api/generado/api';
import type { MotivoDeCierre } from './canalDeSesion';
import type { EstadoDelReloj, SesionDto } from './relojDeSesion';

export type AreaDeLaApp = 'clientes' | 'empleados';
export type EstadoDeSesionEnLaApp = 'cargando' | 'sin-sesion' | 'otra-area' | 'sin-permiso' | 'abierta';

export interface Sesion {
  /** El área que muestra esta parte de la app (no la de la sesión, que puede ser la otra: CL-10). */
  area: AreaDeLaApp;
  estado: EstadoDeSesionEnLaApp;
  datos: SesionDto | null;
  reloj: EstadoDelReloj | null;
  /** POST /bff/salir → vacía la caché de consultas → publica 'cerrada' → va al inicio del área con el aviso del motivo. */
  cerrarSesion: (motivo?: MotivoDeCierre) => Promise<void>;
  /** CL-10: cierra la sesión de la otra área y va a iniciar sesión en esta. */
  cerrarYContinuar: (regreso?: string) => Promise<void>;
  /** POST /bff/actividad (CL-06). */
  seguirConectado: () => Promise<void>;
  /** Navegación completa a /bff/iniciar-sesion/{area}?regreso=… (window.location.assign). */
  iniciarSesion: (regreso?: string) => void;
}

export const ContextoDeSesion = createContext<Sesion | null>(null);

/** El cliente de la API que ProveedorDeSesion creó: ya sabe terminar la sesión ante un 401 y marcar un 403. */
export const ContextoDeLaApi = createContext<Client<paths> | null>(null);

export function useSesion(): Sesion {
  const sesion = useContext(ContextoDeSesion);
  if (sesion === null) throw new Error('useSesion se usa dentro de <ProveedorDeSesion>.');
  return sesion;
}

export function useClienteDeLaApi(): Client<paths> {
  const cliente = useContext(ContextoDeLaApi);
  if (cliente === null) throw new Error('useClienteDeLaApi se usa dentro de <ProveedorDeSesion>.');
  return cliente;
}
