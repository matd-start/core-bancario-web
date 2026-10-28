import { expect, type Locator, type Page } from '@playwright/test';
import { codigoTotp, esperarSiguienteVentana } from '../ayudas/totp';

/**
 * Los pasos de las pantallas de Keycloak y de la app que repiten los recorridos reales. Se escribe con el teclado
 * (foco + teclas) porque el recorrido del cliente es "solo con teclado" (RNF-08). Los campos se buscan por `name`,
 * como hace NavegadorSimulado en Keycloak.Tests: el tema de la 003 los conserva.
 */

export const URL_DE_LA_APP = 'http://localhost:5173';

/** Escribe en un campo sin ratón: foco, teclas. */
async function escribir(pagina: Page, campo: Locator, texto: string) {
  await campo.focus();
  await pagina.keyboard.type(texto);
}

/** Pulsa Tab hasta que el foco llega al control (máximo 30 veces) y no usa el ratón. */
export async function tabularHasta(pagina: Page, control: Locator, maximo = 30) {
  for (let i = 0; i < maximo; i++) {
    if (await control.evaluate((el) => el === document.activeElement)) return;
    await pagina.keyboard.press('Tab');
  }
  await expect(control).toBeFocused();
}

/** En la pantalla de inicio de la app: llega al botón con Tab y lo activa con Enter. */
export async function iniciarSesionConTeclado(pagina: Page) {
  const boton = pagina.getByRole('button', { name: 'Iniciar sesión' });
  await expect(boton).toBeVisible();
  await tabularHasta(pagina, boton);
  await pagina.keyboard.press('Enter');
}

export async function completarUsuarioYClave(pagina: Page, usuario: string, clave: string) {
  await escribir(pagina, pagina.locator('input[name="username"]'), usuario);
  await escribir(pagina, pagina.locator('input[name="password"]'), clave);
  await pagina.keyboard.press('Enter');
}

/** RN-21: el primer ingreso con clave temporal obliga a elegir una clave nueva. */
export async function completarCambioDeClave(pagina: Page, claveNueva: string) {
  await escribir(pagina, pagina.locator('input[name="password-new"]'), claveNueva);
  await escribir(pagina, pagina.locator('input[name="password-confirm"]'), claveNueva);
  await pagina.keyboard.press('Enter');
}

/**
 * RN-24: inscribe el segundo factor. Lee el secreto en base32 de la pantalla ("¿No puedes escanear?") y escribe el
 * primer código. Devuelve el secreto para los ingresos siguientes.
 */
export async function inscribirOtp(pagina: Page): Promise<string> {
  await pagina.locator('#mode-manual').click();
  const secreto = (await pagina.locator('#kc-totp-secret-key').innerText()).replaceAll(/\s+/g, '');
  expect(secreto).not.toBe('');
  await escribir(pagina, pagina.locator('input[name="totp"]'), codigoTotp(secreto));
  await escribir(pagina, pagina.locator('input[name="userLabel"]'), 'telefono-de-pruebas');
  await pagina.keyboard.press('Enter');
  return secreto;
}

/** Ingreso con segundo factor ya inscrito: espera la siguiente ventana, porque Keycloak no acepta el mismo código dos veces. */
export async function ingresarOtp(pagina: Page, secreto: string) {
  await esperarSiguienteVentana();
  await escribir(pagina, pagina.locator('input[name="otp"]'), codigoTotp(secreto));
  await pagina.keyboard.press('Enter');
}

/** Escribe un número de documento con puntos de miles, como lo escribiría una persona (CA-17). */
export function conPuntosDeMiles(numero: string): string {
  return numero.replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Un documento de 7 dígitos que no empieza por 0, distinto en cada ejecución. */
export function documentoUnico(): string {
  return String(1_000_000 + Math.floor(Math.random() * 8_999_999));
}
