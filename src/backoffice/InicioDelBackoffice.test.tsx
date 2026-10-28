import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { crearSesionDeOperador } from '../pruebas/datos';
import { comoUrl, espiarNavegacion } from '../pruebas/navegacion';
import { renderizarEnElArea } from '../pruebas/renderizar';
import { servidor } from '../pruebas/servidor';
import { InicioDelBackoffice } from './InicioDelBackoffice';

function sesionDeOperador() {
  servidor.use(http.get('/bff/sesion', () => HttpResponse.json(crearSesionDeOperador())));
}

describe('InicioDelBackoffice', () => {
  test('F004_CA02_InicioDelBackoffice_MuestraAlOperadorYSuRol', async () => {
    sesionDeOperador();

    renderizarEnElArea(<InicioDelBackoffice />, { ruta: '/backoffice', area: 'empleados' });

    expect(await screen.findByText(/operadora\.maria/)).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Operador');
  });

  test('F004_CA02_InicioDelBackoffice_OfreceCerrarSesion', async () => {
    sesionDeOperador();

    renderizarEnElArea(<InicioDelBackoffice />, { ruta: '/backoffice', area: 'empleados' });

    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  test('F004_CA02_InicioDelBackoffice_CerrarSesionVaAlInicioDelBackoffice', async () => {
    const navegacion = espiarNavegacion();
    sesionDeOperador();
    renderizarEnElArea(<InicioDelBackoffice />, { ruta: '/backoffice', area: 'empleados' });

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(navegacion.replace).toHaveBeenCalledTimes(1);
    });
    expect(comoUrl(navegacion.replace.mock.lastCall?.[0]).pathname).toBe('/backoffice');
  });
});
