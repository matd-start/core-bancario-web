import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { crearCliente, crearCuenta, crearFicha, crearProblema, ID_DEL_CLIENTE } from '../pruebas/datos';
import { respuestaDeProblema } from '../pruebas/manejadores';
import { comoUrl, espiarNavegacion } from '../pruebas/navegacion';
import { leerCuerpo } from '../pruebas/manejadoresDelBackoffice';
import { renderizarElBackoffice } from '../pruebas/renderizar';
import { servidor } from '../pruebas/servidor';

// Lo que estas pruebas suponen de la pantalla (los nombres accesibles los fija quien la construye; aquí se documentan):
// - un formulario con el selector "Tipo de documento" (CC por defecto; opciones CC, CE y PA), el campo "Número de
//   documento" y el botón "Buscar";
// - el registro es un formulario con nombre accesible "Registrar cliente", con los campos Nombres, Apellidos, Correo y
//   Teléfono, y un botón que empieza por "Registrar". Un error de un campo lo marca como inválido y lo describe.

const NUMERO_DE_CUENTA = '1000000001';

function documentoNoRegistrado() {
  const consultas: URL[] = [];
  servidor.use(
    http.get('/api/clientes/por-documento', ({ request }) => {
      consultas.push(new URL(request.url));
      return respuestaDeProblema(404, crearProblema(404, 'no-encontrado'));
    }),
  );
  return consultas;
}

async function buscar(numero: string, tipo: 'CC' | 'CE' | 'PA' = 'CC') {
  const campo = await screen.findByRole('textbox', { name: /^Número de documento/ });
  await userEvent.selectOptions(screen.getByRole('combobox', { name: /^Tipo de documento/ }), tipo);
  await userEvent.type(campo, numero);
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
}

function formularioDeRegistro(): HTMLElement {
  return screen.getByRole('form', { name: 'Registrar cliente' });
}

async function abrirElRegistro(numero: string) {
  await buscar(numero);
  await userEvent.click(await screen.findByRole('button', { name: 'Registrarlo' }));
  await screen.findByRole('form', { name: 'Registrar cliente' });
}

async function completarRegistro(
  datos: { nombres: string; apellidos: string; correo: string; telefono: string } = {
    nombres: 'Ana María',
    apellidos: 'Pérez Gómez',
    correo: 'ana.perez@example.com',
    telefono: '+573001234567',
  },
) {
  const formulario = within(formularioDeRegistro());
  await userEvent.type(formulario.getByRole('textbox', { name: /^Nombres/ }), datos.nombres);
  await userEvent.type(formulario.getByRole('textbox', { name: /^Apellidos/ }), datos.apellidos);
  await userEvent.type(formulario.getByRole('textbox', { name: /^Correo/ }), datos.correo);
  await userEvent.type(formulario.getByRole('textbox', { name: /^Teléfono/ }), datos.telefono);
}

async function enviarRegistro() {
  await userEvent.click(within(formularioDeRegistro()).getByRole('button', { name: /^Registrar/ }));
}

describe('BuscarCliente: buscar (RF-12)', () => {
  test('F004_CA02_BuscarCliente_MuestraAlOperadorYOfreceCerrarSesion', async () => {
    renderizarElBackoffice('/backoffice');

    expect(await screen.findByText(/operadora\.maria/)).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Operador');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  test('F004_CA02_BuscarCliente_CerrarSesionVaAlInicioDelBackoffice', async () => {
    const navegacion = espiarNavegacion();
    renderizarElBackoffice('/backoffice');

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(navegacion.replace).toHaveBeenCalledTimes(1);
    });
    expect(comoUrl(navegacion.replace.mock.lastCall?.[0]).pathname).toBe('/backoffice');
  });

  test('F004_CA22_BuscarConPuntos_MuestraLaFichaSinDocumentoEnLaUrl', async () => {
    const consultas: URL[] = [];
    servidor.use(
      http.get('/api/clientes/por-documento', ({ request }) => {
        consultas.push(new URL(request.url));
        return HttpResponse.json(crearFicha([crearCuenta({ numero: NUMERO_DE_CUENTA })]));
      }),
    );
    const { router } = renderizarElBackoffice('/backoffice');

    await buscar('1.234.567');

    expect(await screen.findByText(NUMERO_DE_CUENTA)).toBeInTheDocument();
    expect(consultas).toHaveLength(1);
    expect(consultas[0]?.searchParams.get('tipoDocumento')).toBe('CC');
    // RNF-04: el número de documento nunca pasa por la URL del navegador ni por el estado del historial.
    expect(router.state.location.pathname).toBe(`/backoffice/clientes/${ID_DEL_CLIENTE}`);
    expect(JSON.stringify(router.state.location)).not.toMatch(/1\.?234\.?567/);
    expect(window.location.href).not.toMatch(/1\.?234\.?567/);
    expect(JSON.stringify(window.history.state)).not.toMatch(/1\.?234\.?567/);
  });

  test('F004_CA22_BuscarSinPuntos_TambienMuestraLaFicha', async () => {
    const { router } = renderizarElBackoffice('/backoffice');

    await buscar('1234567');

    expect(await screen.findByText(NUMERO_DE_CUENTA)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/backoffice/clientes/${ID_DEL_CLIENTE}`);
  });

  test('F004_CL22_DocumentoNoRegistrado_OfreceRegistrarConLosDatos', async () => {
    documentoNoRegistrado();
    renderizarElBackoffice('/backoffice');

    await buscar('9876543');

    expect(await screen.findByText('No hay un cliente con ese documento')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Registrarlo' }));
    const formulario = within(await screen.findByRole('form', { name: 'Registrar cliente' }));
    expect(formulario.getByRole('combobox', { name: /^Tipo de documento/ })).toHaveValue('CC');
    expect(formulario.getByRole('textbox', { name: /^Número de documento/ })).toHaveValue('9876543');
  });

  test('F004_CL22_DocumentoNoRegistrado_ElFormularioConservaElTipoElegido', async () => {
    const consultas = documentoNoRegistrado();
    renderizarElBackoffice('/backoffice');

    await buscar('AB12345', 'PA');
    await userEvent.click(await screen.findByRole('button', { name: 'Registrarlo' }));

    const formulario = within(await screen.findByRole('form', { name: 'Registrar cliente' }));
    expect(consultas[0]?.searchParams.get('tipoDocumento')).toBe('PA');
    expect(formulario.getByRole('combobox', { name: /^Tipo de documento/ })).toHaveValue('PA');
    expect(formulario.getByRole('textbox', { name: /^Número de documento/ })).toHaveValue('AB12345');
  });

  test('F004_CL22_DocumentoNoRegistrado_NoPasaElDocumentoPorLaUrl', async () => {
    documentoNoRegistrado();
    const { router } = renderizarElBackoffice('/backoffice');

    await abrirElRegistro('9876543');

    expect(router.state.location.pathname).toBe('/backoffice');
    expect(router.state.location.search).toBe('');
    expect(JSON.stringify(router.state.location)).not.toContain('9876543');
    expect(JSON.stringify(window.history.state)).not.toContain('9876543');
  });

  test('F004_CL24_BuscarConError500_MensajeGenericoConTraceIdYSinOfrecerRegistrar', async () => {
    servidor.use(
      http.get('/api/clientes/por-documento', () =>
        respuestaDeProblema(500, crearProblema(500, 'error-inesperado', '00-trace-busqueda')),
      ),
    );
    renderizarElBackoffice('/backoffice');

    await buscar('1234567');

    expect(await screen.findByText(/00-trace-busqueda/)).toBeInTheDocument();
    expect(screen.queryByText('No hay un cliente con ese documento')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrarlo' })).not.toBeInTheDocument();
  });
});

describe('BuscarCliente: registrar (RF-01)', () => {
  test('F004_CA23_TelefonoSinCodigoDePais_ErrorJuntoAlCampo', async () => {
    documentoNoRegistrado();
    let registros = 0;
    servidor.use(
      http.post('/api/clientes', () => {
        registros++;
        return HttpResponse.json(crearCliente(), { status: 201 });
      }),
    );
    renderizarElBackoffice('/backoffice');
    await abrirElRegistro('9876543');
    await completarRegistro({
      nombres: 'Ana María',
      apellidos: 'Pérez Gómez',
      correo: 'ana.perez@example.com',
      telefono: '3001234567',
    });

    await enviarRegistro();

    const telefono = await within(formularioDeRegistro()).findByRole('textbox', { name: /^Teléfono/ });
    await waitFor(() => {
      expect(telefono).toBeInvalid();
    });
    expect(telefono).toHaveAccessibleDescription(/\S/);
    expect(within(formularioDeRegistro()).getByRole('textbox', { name: /^Correo/ })).toBeValid();
    expect(registros).toBe(0);
  });

  test('F004_CA23_Error400DeLaApi_JuntoASuCampo', async () => {
    documentoNoRegistrado();
    servidor.use(
      http.post('/api/clientes', () =>
        respuestaDeProblema(400, {
          ...crearProblema(400, 'datos-invalidos'),
          errors: { correo: ['La API no acepta este correo (mensaje de prueba).'] },
        }),
      ),
    );
    renderizarElBackoffice('/backoffice');
    await abrirElRegistro('9876543');
    await completarRegistro();

    await enviarRegistro();

    const correo = await within(formularioDeRegistro()).findByRole('textbox', { name: /^Correo/ });
    await waitFor(() => {
      expect(correo).toBeInvalid();
    });
    expect(correo).toHaveAccessibleDescription(/La API no acepta este correo/);
    expect(within(formularioDeRegistro()).getByRole('textbox', { name: /^Teléfono/ })).toBeValid();
  });

  test('F004_CL23_DocumentoDuplicado_OfreceIrALaFicha', async () => {
    // Al buscar no estaba registrado; mientras se llenaba el formulario, otro operador lo registró.
    let busquedas = 0;
    servidor.use(
      http.get('/api/clientes/por-documento', () => {
        busquedas++;
        return busquedas === 1
          ? respuestaDeProblema(404, crearProblema(404, 'no-encontrado'))
          : HttpResponse.json(crearFicha([crearCuenta({ numero: NUMERO_DE_CUENTA })]));
      }),
      http.post('/api/clientes', () => respuestaDeProblema(409, crearProblema(409, 'documento-duplicado'))),
    );
    const { router } = renderizarElBackoffice('/backoffice');
    await abrirElRegistro('1234567');
    await completarRegistro();

    await enviarRegistro();

    expect(await screen.findByText(/Ya existe un cliente con ese documento/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ir a la ficha' }));
    expect(await screen.findByText(NUMERO_DE_CUENTA)).toBeInTheDocument();
    expect(busquedas).toBe(2);
    expect(router.state.location.pathname).toBe(`/backoffice/clientes/${ID_DEL_CLIENTE}`);
    expect(JSON.stringify(router.state.location)).not.toContain('1234567');
  });

  test('F004_CA23_DatosValidos_AbreLaFichaNueva', async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const nuevo = crearCliente({ id: '0199a000-0000-7000-8000-0000000000d2', numeroDocumento: '9876543' });
    servidor.use(
      http.post('/api/clientes', async ({ request }) => {
        cuerpos.push(await leerCuerpo(request));
        return HttpResponse.json(nuevo, { status: 201 });
      }),
      http.get('/api/clientes/:clienteId', () => HttpResponse.json(crearFicha([], nuevo))),
    );
    // Después de :clienteId, que también casaría con 'por-documento': MSW da prioridad al último registrado.
    documentoNoRegistrado();
    const { router } = renderizarElBackoffice('/backoffice');
    await abrirElRegistro('9876543');
    await completarRegistro();

    await enviarRegistro();

    expect(await screen.findByRole('button', { name: 'Abrir cuenta' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/backoffice/clientes/0199a000-0000-7000-8000-0000000000d2');
    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0]).toMatchObject({
      tipoDocumento: 'CC',
      nombres: 'Ana María',
      apellidos: 'Pérez Gómez',
      correo: 'ana.perez@example.com',
      telefono: '+573001234567',
    });
    expect(cuerpos[0]?.numeroDocumento).toMatch(/9\.?876\.?543/);
    expect(JSON.stringify(router.state.location)).not.toContain('9876543');
  });
});
