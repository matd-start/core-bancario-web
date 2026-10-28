import { QueryClientProvider } from '@tanstack/react-query';
import type { JSX } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { crearClienteDeConsultas } from './clienteDeConsultas';
import { rutas } from './rutas';

const clienteDeConsultas = crearClienteDeConsultas();
const router = createBrowserRouter(rutas);

/** La caché de consultas (estado del servidor) y el ruteador. La sesión la pone cada área, dentro de las rutas. */
export function Proveedores(): JSX.Element {
  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
