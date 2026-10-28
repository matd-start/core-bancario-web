import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router';
import { AreaProtegida } from '../sesion/AreaProtegida';
import { ProveedorDeSesion, type AreaDeLaApp } from '../sesion/ProveedorDeSesion';

/** Cada área tiene su propia sesión, su propia protección y su propio error boundary (el `errorElement` de la ruta). */
function Area({ area }: { area: AreaDeLaApp }): JSX.Element {
  return (
    <ProveedorDeSesion area={area}>
      <AreaProtegida>
        <Outlet />
      </AreaProtegida>
    </ProveedorDeSesion>
  );
}

export function AreaDelCliente(): JSX.Element {
  return <Area area="clientes" />;
}

export function AreaDelBackoffice(): JSX.Element {
  return <Area area="empleados" />;
}

/** "/" con sesión → "/mis-cuentas". Sin sesión, AreaProtegida ya mostró la pantalla de inicio y esto no se monta. */
export function RedireccionAMisCuentas(): JSX.Element {
  return <Navigate to="/mis-cuentas" replace />;
}

/** Lo que se ve si una pantalla falla al dibujarse: nunca la pantalla en blanco (CL-24). */
export function ErrorDelArea(): JSX.Element {
  return (
    <main className="pagina">
      <h1>Algo salió mal</h1>
      <p>La pantalla no pudo mostrarse. Recarga la página; si continúa, comunícate con soporte.</p>
      <div>
        <a href="/">Volver al inicio</a>
      </div>
    </main>
  );
}
