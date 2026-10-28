import type { JSX } from 'react';
import { Boton } from '../comun/componentes/Boton';

/** RF-15: navegación completa al BFF, que lleva a Keycloak con kc_action=UPDATE_PASSWORD y vuelve a /mis-cuentas. */
export function BotonCambiarClave(): JSX.Element {
  return (
    <Boton
      variante="secundario"
      onClick={() => {
        window.location.assign('/bff/cambiar-clave');
      }}
    >
      Cambiar clave
    </Boton>
  );
}
