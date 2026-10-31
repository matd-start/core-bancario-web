// SDD: esqueleto creado por test-writer
import type { components } from '../api/generado/api';

export type RegistrarClienteRequest = components['schemas']['RegistrarClienteRequest'];

/**
 * La parte de un esquema de Zod que usan las pruebas (`safeParse`). El plan (3.4) declara `z.ZodType<RegistrarClienteRequest>`;
 * `zod` llega con T25 y entonces esta interfaz se reemplaza por el esquema real, que la cumple tal cual.
 */
export interface EsquemaDeRegistro {
  safeParse(
    datos: unknown,
  ):
    | { success: true; data: RegistrarClienteRequest }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}

/**
 * Las reglas de la spec 002, sección 4. Tipo CC, CE o PA. Número normalizado (sin espacios, puntos ni guiones, en
 * mayúsculas): CC/CE solo dígitos, de 3 a 10, sin empezar por 0; PA letras y dígitos, de 5 a 15. Nombres y apellidos: de
 * 1 a 100 tras recortar, con letras (tildes y ñ), espacios, apóstrofo y guion. Correo usuario@dominio, ≤ 254. Teléfono
 * E.164 tras quitar espacios, guiones y paréntesis: + y de 8 a 15 dígitos. Avisa; la API decide.
 */
export const esquemaDeRegistro: EsquemaDeRegistro = {
  safeParse: () => {
    throw new Error('SDD: no implementado');
  },
};
