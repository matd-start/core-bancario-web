import type { Page } from '@playwright/test';

/**
 * Llamadas a la API por el BFF para preparar datos (plan, sección 7): usan `page.request`, que comparte las cookies de
 * la página, así que van con la sesión real del operador. Llevan `X-CSRF: 1` como la propia SPA. El navegador nunca ve
 * un token; la prueba tampoco.
 */

export interface RespuestaDeLaApi {
  estado: number;
  cuerpo: unknown;
}

function comoObjeto(valor: unknown, queEra: string): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null) throw new Error(`La API no devolvió un objeto para ${queEra}.`);
  return Object.fromEntries(Object.entries(valor));
}

function comoTexto(valor: unknown, queEra: string): string {
  if (typeof valor !== 'string' || valor === '') throw new Error(`La API no devolvió ${queEra}.`);
  return valor;
}

export async function llamarALaApi(
  pagina: Page,
  metodo: 'GET' | 'POST',
  ruta: string,
  cuerpo?: unknown,
): Promise<RespuestaDeLaApi> {
  const respuesta = await pagina.request.fetch(`/api${ruta}`, {
    method: metodo,
    headers: { 'X-CSRF': '1' },
    ...(cuerpo === undefined ? {} : { data: cuerpo }),
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status(), cuerpo: texto === '' ? null : (JSON.parse(texto) as unknown) };
}

function exigir(respuesta: RespuestaDeLaApi, estadoEsperado: number, queSeHacia: string): unknown {
  if (respuesta.estado !== estadoEsperado)
    throw new Error(`${queSeHacia}: la API respondió ${String(respuesta.estado)}.`);
  return respuesta.cuerpo;
}

export interface DatosDeCliente {
  tipoDocumento: 'CC';
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
}

export async function registrarCliente(pagina: Page, datos: DatosDeCliente): Promise<string> {
  const cuerpo = exigir(await llamarALaApi(pagina, 'POST', '/clientes', datos), 201, 'Registrar el cliente');
  return comoTexto(comoObjeto(cuerpo, 'el cliente').id, 'el id del cliente');
}

export async function abrirCuenta(pagina: Page, clienteId: string, moneda: 'COP' | 'USD'): Promise<string> {
  const cuerpo = exigir(
    await llamarALaApi(pagina, 'POST', `/clientes/${clienteId}/cuentas`, { moneda }),
    201,
    'Abrir la cuenta',
  );
  return comoTexto(comoObjeto(cuerpo, 'la cuenta').numero, 'el número de la cuenta');
}

/** Habilita el acceso digital y devuelve la clave temporal (se muestra una sola vez, CL-17). */
export async function habilitarAcceso(pagina: Page, clienteId: string): Promise<string> {
  const cuerpo = exigir(
    await llamarALaApi(pagina, 'POST', `/clientes/${clienteId}/acceso-digital/habilitar`),
    200,
    'Habilitar el acceso',
  );
  return comoTexto(comoObjeto(cuerpo, 'el acceso').claveTemporal, 'la clave temporal');
}

/** Cuántas cuentas tiene el cliente, leídas por la API (para comprobar que un ataque no abrió ninguna, CA-06). */
export async function contarCuentas(pagina: Page, clienteId: string): Promise<number> {
  const cuerpo = exigir(await llamarALaApi(pagina, 'GET', `/clientes/${clienteId}`), 200, 'Leer la ficha');
  const cuentas = comoObjeto(cuerpo, 'la ficha').cuentas;
  if (!Array.isArray(cuentas)) throw new Error('La ficha no trae las cuentas.');
  return cuentas.length;
}
