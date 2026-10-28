import { vi } from 'vitest';

/**
 * jsdom no navega: location.assign y location.replace no hacen nada útil. Esta utilidad los sustituye por espías y deja
 * el resto de location (search, pathname…) real. setup.ts deshace el cambio al terminar cada prueba.
 */
export function espiarNavegacion() {
  const real = window.location;
  const assign = vi.fn<(url: string | URL) => void>();
  const replace = vi.fn<(url: string | URL) => void>();
  // El destino del Proxy es un objeto vacío: las propiedades de Location de jsdom no son configurables y un Proxy sobre
  // ellas no podría devolver los espías.
  const falsa = new Proxy({} as Location, {
    get(_destino, propiedad) {
      if (propiedad === 'assign') return assign;
      if (propiedad === 'replace') return replace;
      const valor: unknown = Reflect.get(real, propiedad, real);
      return typeof valor === 'function' ? (valor as (...args: unknown[]) => unknown).bind(real) : valor;
    },
    set(_destino, propiedad, valor) {
      return Reflect.set(real, propiedad, valor, real);
    },
  });
  vi.stubGlobal('location', falsa);
  return { assign, replace };
}

/** Lee el destino de una navegación como URL (acepta rutas relativas) para comparar ruta y parámetros. */
export function comoUrl(destino: string | URL | undefined): URL {
  if (destino === undefined) throw new Error('No hubo ninguna navegación.');
  return new URL(destino, 'http://localhost');
}
