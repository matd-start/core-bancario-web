import type { JSX } from 'react';
import { useLocation } from 'react-router';
import { Boton } from '../comun/componentes/Boton';
import { Pagina } from '../comun/componentes/Pagina';
import { useSesion } from './contextoDeSesion';

/** CL-10, RN-26: una sola sesión por navegador. Para entrar a esta área hay que cerrar la de la otra. */
export function OtraSesionAbierta(): JSX.Element {
  const { cerrarYContinuar } = useSesion();
  const { pathname } = useLocation();
  return (
    <Pagina titulo="Ya tienes una sesión abierta">
      <p>Hay una sesión abierta en otra área de Core Bancario. Para continuar aquí debes cerrarla primero.</p>
      <div>
        <Boton
          onClick={() => {
            void cerrarYContinuar(pathname);
          }}
        >
          Cerrar sesión y continuar
        </Boton>
      </div>
    </Pagina>
  );
}
