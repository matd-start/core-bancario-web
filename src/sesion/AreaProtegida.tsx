import type { JSX, ReactNode } from 'react';
import { Cargando } from '../comun/componentes/Cargando';
import { useSesion } from './contextoDeSesion';
import { OtraSesionAbierta } from './OtraSesionAbierta';
import { PantallaDeInicio } from './PantallaDeInicio';
import { SinPermiso } from './SinPermiso';

/** Decide por useSesion().estado: Cargando, PantallaDeInicio, OtraSesionAbierta, SinPermiso o los hijos. */
export function AreaProtegida({ children }: { children: ReactNode }): JSX.Element {
  const { estado } = useSesion();
  switch (estado) {
    case 'cargando':
      return <Cargando />;
    case 'sin-sesion':
      return <PantallaDeInicio />;
    case 'otra-area':
      return <OtraSesionAbierta />;
    case 'sin-permiso':
      return <SinPermiso />;
    case 'abierta':
      return <>{children}</>;
  }
}
