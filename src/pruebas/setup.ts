// Se ejecuta antes de cada archivo de pruebas de Vitest (vite.config.ts, setupFiles).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sin "globals" de Vitest, Testing Library no desmonta solo: cada prueba empieza con el DOM vacío.
afterEach(() => {
  cleanup();
});
