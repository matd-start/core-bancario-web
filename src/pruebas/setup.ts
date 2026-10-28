// Se ejecuta antes de cada archivo de pruebas de Vitest (vite.config.ts, setupFiles).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { servidor } from './servidor';

// El fetch de Node (undici) no acepta URL relativas, y la SPA llama a "/api/..." y "/bff/...". Se resuelven contra el
// origen de jsdom ANTES de que MSW intercepte, para que la prueba use las mismas URL que el navegador.
function absoluta(entrada: RequestInfo | URL): RequestInfo | URL {
  return typeof entrada === 'string' && entrada.startsWith('/')
    ? new URL(entrada, window.location.origin).href
    : entrada;
}
const fetchNativo = globalThis.fetch.bind(globalThis);
const RequestNativo = globalThis.Request;
class RequestConOrigen extends RequestNativo {
  constructor(entrada: RequestInfo | URL, init?: RequestInit) {
    super(absoluta(entrada), init);
  }
}
globalThis.Request = RequestConOrigen;
globalThis.fetch = (entrada, init) => fetchNativo(absoluta(entrada), init);

beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' });
});

// Sin "globals" de Vitest, Testing Library no desmonta solo: cada prueba empieza con el DOM vacío.
afterEach(() => {
  cleanup();
  servidor.resetHandlers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

afterAll(() => {
  servidor.close();
});
