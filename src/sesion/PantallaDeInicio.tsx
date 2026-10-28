import type { JSX } from 'react';
import { useLocation } from 'react-router';
import { Boton } from '../comun/componentes/Boton';
import { Pagina } from '../comun/componentes/Pagina';
import { leerAviso, MENSAJES_DE_AVISO } from './avisos';
import { useSesion } from './contextoDeSesion';

const TITULO_POR_AREA = { clientes: 'Core Bancario', empleados: 'Core Bancario — Backoffice' } as const;

/** Sin sesión: el aviso (si lo hay) y el botón que lleva a Keycloak a través del BFF, con la ruta actual como regreso. */
export function PantallaDeInicio(): JSX.Element {
  const { area, iniciarSesion } = useSesion();
  const { pathname, search } = useLocation();
  const aviso = leerAviso(search);
  const empezarDeNuevo = aviso === 'inicio-fallido';
  return (
    <Pagina titulo={TITULO_POR_AREA[area]}>
      {aviso !== null && (
        <p role="status" className="aviso">
          {MENSAJES_DE_AVISO[aviso]}
        </p>
      )}
      <div>
        <Boton
          onClick={() => {
            iniciarSesion(pathname);
          }}
        >
          {empezarDeNuevo ? 'Empezar de nuevo' : 'Iniciar sesión'}
        </Boton>
      </div>
    </Pagina>
  );
}
