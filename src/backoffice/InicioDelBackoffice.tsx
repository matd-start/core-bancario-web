import type { JSX } from 'react';
import { Pagina } from '../comun/componentes/Pagina';
import { BotonCerrarSesion } from '../sesion/BotonCerrarSesion';
import { useSesion } from '../sesion/contextoDeSesion';

/** CA-02: el inicio del operador. La búsqueda de clientes llega en la 004b. */
export function InicioDelBackoffice(): JSX.Element {
  const { datos } = useSesion();
  return (
    <Pagina titulo="Backoffice" acciones={<BotonCerrarSesion />}>
      {datos !== null && (
        <dl className="datos">
          <dt>Usuario</dt>
          <dd>{datos.usuario}</dd>
          <dt>Rol</dt>
          <dd>{datos.rol}</dd>
        </dl>
      )}
    </Pagina>
  );
}
