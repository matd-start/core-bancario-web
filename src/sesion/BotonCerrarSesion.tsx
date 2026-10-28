import type { JSX } from 'react';
import { Boton } from '../comun/componentes/Boton';
import { useSesion } from './contextoDeSesion';

/** "Cerrar sesión": POST /bff/salir, caché vacía y de vuelta al inicio del área con el aviso (CL-11). */
export function BotonCerrarSesion(): JSX.Element {
  const { cerrarSesion } = useSesion();
  return (
    <Boton
      variante="secundario"
      onClick={() => {
        void cerrarSesion();
      }}
    >
      Cerrar sesión
    </Boton>
  );
}
