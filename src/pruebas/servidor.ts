import { setupServer } from 'msw/node';
import { manejadoresPorDefecto } from './manejadores';

/** La red simulada de Vitest (ADR-0022). El ciclo de vida lo maneja setup.ts. */
export const servidor = setupServer(...manejadoresPorDefecto);
