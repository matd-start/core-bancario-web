import * as OTPAuth from 'otpauth';

/**
 * El segundo factor de los recorridos reales (RNF-15). Keycloak muestra al inscribirlo un secreto en base32 ("¿No puedes
 * escanear?"); aquí se calcula el mismo código de 6 dígitos que daría un teléfono (TOTP, SHA-1, ventana de 30 s), como
 * hace Otp.NET en Keycloak.Tests (ADR-0018).
 */
const PERIODO_EN_SEGUNDOS = 30;

export function codigoTotp(secretoBase32: string, ahora: number = Date.now()): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secretoBase32.replaceAll(/\s+/g, '')),
    algorithm: 'SHA1',
    digits: 6,
    period: PERIODO_EN_SEGUNDOS,
  });
  return totp.generate({ timestamp: ahora });
}

/**
 * Keycloak no acepta dos veces el mismo código (otpPolicyCodeReusable = false). Antes de un segundo ingreso hay que
 * esperar a la siguiente ventana de 30 s; devuelve cuántos milisegundos faltaban.
 */
export async function esperarSiguienteVentana(ahora: number = Date.now()): Promise<number> {
  const periodo = PERIODO_EN_SEGUNDOS * 1000;
  const falta = periodo - (ahora % periodo) + 500;
  await new Promise<void>((resolver) => setTimeout(resolver, falta));
  return falta;
}
