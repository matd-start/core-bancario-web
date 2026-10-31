import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { http, HttpResponse } from 'msw';
import { crearClienteDeConsultas } from '../app/clienteDeConsultas';
import { BuscarCliente } from '../backoffice/BuscarCliente';
import { FichaDeCliente } from '../backoffice/FichaDeCliente';
import { crearSesionDeOperador } from './datos';
import { servidor } from './servidor';
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

/**
 * La caché de las pruebas del backoffice: las consultas no reintentan (un error se ve al instante) y las mutaciones
 * usan la configuración REAL de la app (sin reintentos y gcTime 0, CL-15 y CL-17): así una clave temporal que siguiera
 * en la caché, o una acción reintentada, se vería en la prueba.
 */
function crearClienteDeConsultasDePruebas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: crearClienteDeConsultas().getDefaultOptions().mutations ?? {},
    },
  });
}

/**
 * Monta las pantallas del operador como lo hace la app, con una sesión de operador: /backoffice (BuscarCliente) y
 * /backoffice/clientes/:clienteId (FichaDeCliente), dentro del área protegida. Devuelve el ruteador para comprobar
 * a dónde se navegó y la caché para comprobar qué quedó guardado en ella.
 */
export function renderizarElBackoffice(ruta = '/backoffice') {
  servidor.use(http.get('/bff/sesion', () => HttpResponse.json(crearSesionDeOperador())));
  window.history.replaceState(null, '', ruta);
  const clienteDeConsultas = crearClienteDeConsultasDePruebas();
  const router = createMemoryRouter(
    [
      {
        element: (
          <ProveedorDeSesion area="empleados">
            <AreaProtegida>
              <Outlet />
            </AreaProtegida>
          </ProveedorDeSesion>
        ),
        children: [
          { path: '/backoffice', element: <BuscarCliente /> },
          { path: '/backoffice/clientes/:clienteId', element: <FichaDeCliente /> },
        ],
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
