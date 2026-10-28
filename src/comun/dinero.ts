export type Moneda = 'COP' | 'USD';

const DECIMALES: Record<Moneda, number> = { COP: 0, USD: 2 };

/** Texto decimal válido para Intl.NumberFormat: la comprobación estrecha el tipo, así no hace falta `as`. */
function esDecimal(monto: string): monto is `${number}` {
  return /^-?\d+(\.\d+)?$/.test(monto);
}

function esMoneda(texto: string): texto is Moneda {
  return Object.hasOwn(DECIMALES, texto);
}

/**
 * CL-14. Formatea el TEXTO de DineroDto.monto con Intl.NumberFormat (v3 acepta una cadena decimal y la formatea sin
 * convertirla a `number`). Nunca se usa Number, parseFloat ni el + unario: con ellos 9007199254740993 perdería dígitos.
 * @throws Error si el monto no es un decimal.
 */
export function formatearDinero(monto: string, moneda: Moneda): string {
  if (!esDecimal(monto)) throw new Error(`El monto no es un decimal válido: "${monto}".`);
  const decimales = DECIMALES[moneda];
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(monto);
}

/** Para un DineroDto, cuya moneda llega como texto libre: con una moneda que la SPA no conoce muestra el monto tal cual. */
export function formatearSaldo(dinero: { monto: string; moneda: string }): string {
  return esMoneda(dinero.moneda) ? formatearDinero(dinero.monto, dinero.moneda) : `${dinero.monto} ${dinero.moneda}`;
}
