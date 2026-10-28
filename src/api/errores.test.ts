import { describe, expect, test } from 'vitest';
import contratoDeLaApi from '../../contratos/core-bancario-api.json?raw';
import { interpretarError } from './errores';
import { MENSAJES_DE_ERROR, MENSAJE_GENERICO } from './mensajes';

/** Los códigos del catálogo vigente salen del contrato versionado (RNF-12): si la API agrega uno, esta prueba lo exige. */
function codigosDelContrato(): string[] {
  const contrato: unknown = JSON.parse(contratoDeLaApi);
  const valores = (contrato as { components: { schemas: { CodigoDeError: { enum: unknown } } } }).components.schemas
    .CodigoDeError.enum;
  if (!Array.isArray(valores) || !valores.every((v): v is string => typeof v === 'string'))
    throw new Error('El contrato no trae components.schemas.CodigoDeError.enum.');
  if (valores.length === 0) throw new Error('El catálogo de códigos del contrato está vacío.');
  return valores;
}

const codigos = codigosDelContrato();

describe('interpretarError', () => {
  test.each(codigos)('F004_CA34_CadaCodigoDelCatalogo_TieneMensaje_%s', (codigo) => {
    const error = interpretarError(422, { title: 'x', status: 422, codigo, traceId: '00-t' });

    expect(error.codigo).toBe(codigo);
    expect(error.mensaje).not.toBe('');
    expect(Object.keys(MENSAJES_DE_ERROR)).toContain(codigo);
  });

  test('F004_CA34_CodigoDesconocido_MensajeGenericoConTraceId', () => {
    const error = interpretarError(418, { title: 'x', status: 418, codigo: 'codigo-que-no-existe', traceId: '00-abc' });

    expect(error.codigo).toBeNull();
    expect(error.mensaje).toBe(MENSAJE_GENERICO);
    expect(error.traceId).toBe('00-abc');
  });

  test('F004_CA34_Error500_MensajeGenericoConTraceId', () => {
    const error = interpretarError(500, { title: 'Error', status: 500, traceId: '00-xyz' });

    expect(error.estado).toBe(500);
    expect(error.mensaje).toBe(MENSAJE_GENERICO);
    expect(error.traceId).toBe('00-xyz');
  });

  test('F004_CA34_RespuestaSinCuerpo_MensajeGenericoYSinTraceId', () => {
    const error = interpretarError(502, undefined);

    expect(error.codigo).toBeNull();
    expect(error.mensaje).toBe(MENSAJE_GENERICO);
    expect(error.traceId).toBeNull();
    expect(error.errores).toEqual({});
  });

  test('F004_CA34_MensajeGenerico_PideContactarASoporteConElCodigo', () => {
    expect(MENSAJE_GENERICO).toContain('Algo salió mal');
    expect(MENSAJE_GENERICO).toContain('soporte');
  });

  test('F004_CA34_ConflictoDeConcurrencia_DiceLaCuentaCambioMientrasTanto', () => {
    expect(MENSAJES_DE_ERROR['conflicto-de-concurrencia']).toContain('La cuenta cambió mientras tanto');
  });

  test.each(['identidad-error', 'identidad-sin-respuesta'] as const)(
    'F004_CL19_%s_DiceQuePuedeReintentarSinRiesgo',
    (codigo) => {
      expect(MENSAJES_DE_ERROR[codigo]).toContain('reintentar sin riesgo');
    },
  );

  test('F004_RNF12_InterpretarError_NuncaUsaDetail', () => {
    const conCodigoConocido = interpretarError(404, {
      title: 'x',
      status: 404,
      codigo: 'no-encontrado',
      detail: 'SELECT * FROM cuentas -- traza interna',
      traceId: '00-t',
    });
    const conCodigoDesconocido = interpretarError(500, {
      title: 'x',
      status: 500,
      codigo: 'otro',
      detail: 'System.NullReferenceException en Handler.cs:42',
      traceId: '00-t',
    });

    expect(conCodigoConocido.mensaje).not.toContain('SELECT');
    expect(conCodigoDesconocido.mensaje).not.toContain('NullReference');
    expect(JSON.stringify([conCodigoConocido, conCodigoDesconocido])).not.toContain('traza interna');
  });

  test('F004_CA34_Error400ConErrores_ExponeLosErroresPorCampo', () => {
    const error = interpretarError(400, {
      title: 'x',
      status: 400,
      codigo: 'datos-invalidos',
      errors: { telefono: ['Debe incluir el código de país.'] },
      traceId: '00-t',
    });

    expect(error.errores).toEqual({ telefono: ['Debe incluir el código de país.'] });
  });
});
