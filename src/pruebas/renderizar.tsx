import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AreaProtegida } from '../sesion/AreaProtegida';
import { ProveedorDeSesion, type AreaDeLaApp } from '../sesion/ProveedorDeSesion';

export interface OpcionesDeRenderizado {
  /** Ruta con búsqueda con la que se abre la app. */
  ruta?: string;
  /** Patrón de la ruta del componente, por ejemplo "/mis-cuentas/:cuentaId". */
  patron?: string;
  area?: AreaDeLaApp;
}

/**
 * Monta un componente como lo hace la app (ADR-0022): caché de consultas, ruteador y sesión con el área protegida.
 * Las consultas no reintentan, para que un error se vea al instante. La URL real de jsdom y la del ruteador coinciden
 * (leerAviso y limpiarAviso trabajan con la real).
 */
export function renderizarEnElArea(ui: ReactElement, opciones: OpcionesDeRenderizado = {}) {
  const { ruta = '/mis-cuentas', patron = '*', area = 'clientes' } = opciones;
  window.history.replaceState(null, '', ruta);
  const clienteDeConsultas = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: patron,
        element: (
          <ProveedorDeSesion area={area}>
            <AreaProtegida>{ui}</AreaProtegida>
          </ProveedorDeSesion>
        ),
      },
    ],
    { initialEntries: [ruta] },
  );
  const utilidades = render(
    <QueryClientProvider client={clienteDeConsultas}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utilidades, clienteDeConsultas, router };
}
