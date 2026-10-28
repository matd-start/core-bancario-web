import type { JSX } from 'react';
import { Pagina } from '../comun/componentes/Pagina';
import { BotonCerrarSesion } from './BotonCerrarSesion';

/** CL-04: hay sesión, pero sin el rol del área (o la API respondió 403). No se muestra ningún dato. */
export function SinPermiso(): JSX.Element {
  return (
    <Pagina titulo="No tienes permiso para esta área" acciones={<BotonCerrarSesion />}>
      <p>Tu usuario no tiene acceso a esta parte de Core Bancario. Cierra la sesión e ingresa con otro usuario.</p>
    </Pagina>
  );
}
