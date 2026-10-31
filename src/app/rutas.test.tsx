import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { crearFicha, crearSesionDeOperador, ID_DEL_CLIENTE } from '../pruebas/datos';
import { servidor } from '../pruebas/servidor';
import { rutas } from './rutas';

function montarLaApp(ruta: string) {
  servidor.use(http.get('/bff/sesion', () => HttpResponse.json(crearSesionDeOperador())));
  window.history.replaceState(null, '', ruta);
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('rutas del backoffice', () => {
  test('F004_CL08_RutaMalEscritaDelBackoffice_LlevaALaBusquedaYNoAlAreaDelCliente', async () => {
    const router = montarLaApp('/backoffice/xyz');

    expect(await screen.findByRole('button', { name: 'Buscar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/backoffice');
    expect(screen.queryByText('Cerrar sesión y continuar')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mis cuentas' })).not.toBeInTheDocument();
  });

  test('F004_CL08_RutaMalEscritaMasProfundaDelBackoffice_LlevaALaBusqueda', async () => {
    const router = montarLaApp('/backoffice/clientes/ficha/de/otro/lado');

    expect(await screen.findByRole('button', { name: 'Buscar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/backoffice');
  });

  test('F004_CA22_RutaDeLaFicha_MuestraLaFichaDelCliente', async () => {
    servidor.use(http.get('/api/clientes/:clienteId', () => HttpResponse.json(crearFicha())));

    const router = montarLaApp(`/backoffice/clientes/${ID_DEL_CLIENTE}`);

    expect(await screen.findByRole('button', { name: 'Abrir cuenta' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/backoffice/clientes/${ID_DEL_CLIENTE}`);
  });

  test('F004_CA22_RutaDeLaBusqueda_MuestraElFormularioDeBusqueda', async () => {
    montarLaApp('/backoffice');

    expect(await screen.findByRole('button', { name: 'Buscar' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Número de documento/ })).toBeInTheDocument();
  });
});
