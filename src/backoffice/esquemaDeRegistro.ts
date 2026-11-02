import { z } from 'zod';
import type { components } from '../api/generado/api';

// RNF-03: la CSP (script-src 'self') prohíbe evaluar texto como código. Zod 4 prueba `new Function('')` para compilar sus
// validadores y, aunque lo atrapa, el navegador registra una violación de la CSP en cada carga. Sin compilación (jitless)
// no lo intenta: validar un formulario de seis campos no necesita esa velocidad. Debe ir antes de crear el primer esquema.
z.config({ jitless: true });

export type RegistrarClienteRequest = components['schemas']['RegistrarClienteRequest'];

export const TIPOS_DE_DOCUMENTO = ['CC', 'CE', 'PA'] as const;
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

/** Sin espacios, puntos ni guiones y en mayúsculas: la forma en que la API compara documentos (RN-17). */
function normalizarNumero(numero: string): string {
  return numero.replaceAll(/[\s.-]/g, '').toUpperCase();
}

/** `numero` es unknown porque la regla corre también cuando otro campo falló y el valor podría no ser un texto. */
function numeroValido(tipo: string, numero: unknown): boolean {
  if (typeof numero !== 'string') return false;
  const normalizado = normalizarNumero(numero);
  return tipo === 'PA' ? /^[A-Z0-9]{5,15}$/.test(normalizado) : /^[1-9]\d{2,9}$/.test(normalizado);
}

const NOMBRE = z
  .string()
  .trim()
  .min(1, 'Este campo es obligatorio.')
  .max(100, 'Escribe como máximo 100 caracteres.')
  .regex(/^[\p{L}\s'-]+$/u, 'Solo letras, espacios, apóstrofo y guion.');

/** E.164 tras quitar espacios, guiones y paréntesis: "+" y de 8 a 15 dígitos. */
const TELEFONO = z
  .string()
  .transform((telefono) => telefono.replaceAll(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^\+\d{8,15}$/, 'Escribe el teléfono con código de país, por ejemplo +573001234567.'));

/**
 * Las reglas de la spec 002, sección 4. Tipo CC, CE o PA. Número normalizado (sin espacios, puntos ni guiones, en
 * mayúsculas): CC/CE solo dígitos, de 3 a 10, sin empezar por 0; PA letras y dígitos, de 5 a 15. Nombres y apellidos: de
 * 1 a 100 tras recortar, con letras (tildes y ñ), espacios, apóstrofo y guion. Correo usuario@dominio, ≤ 254. Teléfono
 * E.164 tras quitar espacios, guiones y paréntesis: + y de 8 a 15 dígitos. Avisa; la API decide.
 *
 * El número de documento sale tal como se escribió: la API lo normaliza ella misma (RN-17).
 */
export const esquemaDeRegistro = z
  .object({
    tipoDocumento: z.enum(TIPOS_DE_DOCUMENTO, 'Elige CC, CE o PA.'),
    numeroDocumento: z.string(),
    nombres: NOMBRE,
    apellidos: NOMBRE,
    correo: z
      .string()
      .trim()
      .max(254, 'Escribe como máximo 254 caracteres.')
      .regex(/^[^\s@]+@[^\s@]+$/, 'Escribe un correo como usuario@dominio.'),
    telefono: TELEFONO,
  })
  // `when`: por defecto Zod no corre esta regla si otro campo ya falló, y el operador vería los errores de a uno.
  .refine((datos) => numeroValido(datos.tipoDocumento, datos.numeroDocumento), {
    path: ['numeroDocumento'],
    message: 'Revisa el número: CC y CE llevan de 3 a 10 dígitos sin empezar por 0; PA, de 5 a 15 letras o dígitos.',
    when: () => true,
  }) satisfies z.ZodType<RegistrarClienteRequest>;

/** Lo que escribe el operador en el formulario (antes de validar y normalizar). */
export type DatosDelFormulario = z.input<typeof esquemaDeRegistro>;
