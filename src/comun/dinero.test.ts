import { describe, expect, test } from 'vitest';
import { formatearDinero } from './dinero';

// Intl pone un espacio duro (U+00A0) entre el símbolo y el número; se normaliza aquí y no en el código (riesgo 4 del plan).
const normalizar = (texto: string) => texto.replaceAll(String.fromCharCode(160), ' ');

describe('formatearDinero', () => {
  test('F004_CA19_FormatearDinero_UsdLargoExacto', () => {
    const texto = formatearDinero('12345678901234.56', 'USD');

    expect(normalizar(texto)).toBe('US$ 12.345.678.901.234,56');
  });

  test('F004_CA19_FormatearDinero_CopSinDecimales', () => {
    const texto = formatearDinero('1234567', 'COP');

    expect(normalizar(texto)).toBe('$ 1.234.567');
  });

  test('F004_CA19_FormatearDinero_UsdCeroConDosDecimales', () => {
    const texto = formatearDinero('0.00', 'USD');

    expect(normalizar(texto)).toBe('US$ 0,00');
  });

  test('F004_CA19_FormatearDinero_EnteroMayorQueElMaximoSeguroDeNumber_NoPierdeDigitos', () => {
    // 2^53 + 1 no cabe en un number: si pasara por Number saldría ...992.
    const texto = formatearDinero('9007199254740993', 'COP');

    expect(normalizar(texto)).toBe('$ 9.007.199.254.740.993');
  });

  test.each(['', 'abc', '1,5', '1e3', '.5', '12.', '1.2.3', ' 12'])(
    'F004_CA19_FormatearDinero_MontoNoDecimal_Lanza_%j',
    (monto) => {
      expect(() => formatearDinero(monto, 'COP')).toThrow(/monto/i);
    },
  );
});
