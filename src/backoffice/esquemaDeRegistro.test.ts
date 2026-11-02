import { describe, expect, test } from 'vitest';
import { esquemaDeRegistro } from './esquemaDeRegistro';

// CA-23 (RF-01): el formulario avisa en el navegador con las reglas de la spec 002, sección 4. La API sigue decidiendo.

const VALIDO = {
  tipoDocumento: 'CC',
  numeroDocumento: '1234567',
  nombres: 'Ana María',
  apellidos: 'Pérez Gómez',
  correo: 'ana.perez@example.com',
  telefono: '+573001234567',
};

/** Los campos que el esquema rechaza, sin repetir. */
function camposRechazados(datos: unknown): string[] {
  const resultado = esquemaDeRegistro.safeParse(datos);
  return resultado.success ? [] : [...new Set(resultado.error.issues.map((problema) => String(problema.path[0])))];
}

describe('esquemaDeRegistro: lo que acepta', () => {
  test('F004_CA23_EsquemaDeRegistro_DatosValidos_Acepta', () => {
    expect(esquemaDeRegistro.safeParse(VALIDO).success).toBe(true);
  });

  test.each([
    ['CC con puntos', { tipoDocumento: 'CC', numeroDocumento: '1.234.567' }],
    ['CC con espacios y guion', { tipoDocumento: 'CC', numeroDocumento: ' 1 234-567 ' }],
    ['CC de 3 dígitos', { tipoDocumento: 'CC', numeroDocumento: '123' }],
    ['CC de 10 dígitos', { tipoDocumento: 'CC', numeroDocumento: '1234567890' }],
    ['CE de 8 dígitos', { tipoDocumento: 'CE', numeroDocumento: '12345678' }],
    ['PA en minúsculas', { tipoDocumento: 'PA', numeroDocumento: 'ab12345' }],
    ['PA con guion', { tipoDocumento: 'PA', numeroDocumento: 'AB-12345' }],
    ['PA de 15 caracteres', { tipoDocumento: 'PA', numeroDocumento: 'AB1234567890123' }],
  ])('F004_CA23_EsquemaDeRegistro_NumeroDeDocumentoValido_%s', (_caso, cambios) => {
    expect(esquemaDeRegistro.safeParse({ ...VALIDO, ...cambios }).success).toBe(true);
  });

  test.each([
    ['con tilde y ñ', { nombres: 'Núñez Ángel', apellidos: 'Peña' }],
    ['con apóstrofo y guion', { nombres: "D'Angelo Mary-Jane", apellidos: "O'Neill" }],
    ['con espacios al inicio y al final', { nombres: '  Ana  ', apellidos: '  Pérez ' }],
    ['de un solo carácter', { nombres: 'A', apellidos: 'B' }],
    ['de 100 caracteres', { nombres: 'a'.repeat(100), apellidos: 'b'.repeat(100) }],
  ])('F004_CA23_EsquemaDeRegistro_NombreYApellidoValidos_%s', (_caso, cambios) => {
    expect(esquemaDeRegistro.safeParse({ ...VALIDO, ...cambios }).success).toBe(true);
  });

  test.each([
    ['con espacios, guiones y paréntesis', '+57 (300) 123-4567'],
    ['de 8 dígitos', '+12345678'],
    ['de 15 dígitos', '+123456789012345'],
  ])('F004_CA23_EsquemaDeRegistro_TelefonoValido_%s', (_caso, telefono) => {
    expect(esquemaDeRegistro.safeParse({ ...VALIDO, telefono }).success).toBe(true);
  });
});

describe('esquemaDeRegistro: lo que rechaza, con el campo', () => {
  test.each([
    ['sin el código de país', '3001234567'],
    ['con menos de 8 dígitos', '+1234567'],
    ['con más de 15 dígitos', '+1234567890123456'],
    ['con letras', '+57 300 abc 4567'],
    ['vacío', ''],
  ])('F004_CA23_EsquemaDeRegistro_TelefonoInvalido_%s_ReportaElCampo', (_caso, telefono) => {
    expect(camposRechazados({ ...VALIDO, telefono })).toEqual(['telefono']);
  });

  test.each([
    ['CC de 2 dígitos', { tipoDocumento: 'CC', numeroDocumento: '12' }],
    ['CC de 11 dígitos', { tipoDocumento: 'CC', numeroDocumento: '12345678901' }],
    ['CC que empieza por 0', { tipoDocumento: 'CC', numeroDocumento: '0123456' }],
    ['CC con letras', { tipoDocumento: 'CC', numeroDocumento: '12A4567' }],
    ['CE que empieza por 0', { tipoDocumento: 'CE', numeroDocumento: '0123456' }],
    ['PA de 4 caracteres', { tipoDocumento: 'PA', numeroDocumento: 'AB12' }],
    ['PA de 16 caracteres', { tipoDocumento: 'PA', numeroDocumento: 'AB12345678901234' }],
    ['PA con símbolos', { tipoDocumento: 'PA', numeroDocumento: 'AB#12345' }],
    ['vacío', { tipoDocumento: 'CC', numeroDocumento: '' }],
  ])('F004_CA23_EsquemaDeRegistro_NumeroDeDocumentoInvalido_%s_ReportaElCampo', (_caso, cambios) => {
    expect(camposRechazados({ ...VALIDO, ...cambios })).toEqual(['numeroDocumento']);
  });

  test('F004_CA23_EsquemaDeRegistro_TipoDeDocumentoDesconocido_ReportaElCampo', () => {
    expect(camposRechazados({ ...VALIDO, tipoDocumento: 'TI' })).toContain('tipoDocumento');
  });

  test.each([
    ['vacíos', ''],
    ['solo espacios', '   '],
    ['con números', 'Ana3'],
    ['con símbolos', 'Ana@'],
    ['de más de 100 caracteres', 'a'.repeat(101)],
  ])('F004_CA23_EsquemaDeRegistro_NombresInvalidos_%s_ReportaElCampo', (_caso, nombres) => {
    expect(camposRechazados({ ...VALIDO, nombres })).toEqual(['nombres']);
  });

  test.each([
    ['vacíos', ''],
    ['con números', 'Pérez2'],
    ['de más de 100 caracteres', 'b'.repeat(101)],
  ])('F004_CA23_EsquemaDeRegistro_ApellidosInvalidos_%s_ReportaElCampo', (_caso, apellidos) => {
    expect(camposRechazados({ ...VALIDO, apellidos })).toEqual(['apellidos']);
  });

  test.each([
    ['sin arroba', 'ana.perez.example.com'],
    ['sin usuario', '@example.com'],
    ['sin dominio', 'ana@'],
    ['con espacios', 'ana perez@example.com'],
    ['de más de 254 caracteres', `${'a'.repeat(250)}@b.co`],
    ['vacío', ''],
  ])('F004_CA23_EsquemaDeRegistro_CorreoInvalido_%s_ReportaElCampo', (_caso, correo) => {
    expect(camposRechazados({ ...VALIDO, correo })).toEqual(['correo']);
  });

  test('F004_CA23_EsquemaDeRegistro_VariosCamposInvalidos_LosReportaTodosALaVez', () => {
    const campos = camposRechazados({
      ...VALIDO,
      numeroDocumento: '12',
      correo: 'sin-arroba',
      telefono: '3001234567',
    });

    expect(campos.toSorted()).toEqual(['correo', 'numeroDocumento', 'telefono']);
  });
});
