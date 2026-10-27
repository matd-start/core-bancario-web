import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// ADR-0020: el BFF vive en el mismo origen que la SPA. En desarrollo, Vite reenvía /bff y /api al BFF sin
// changeOrigin, para que el BFF vea Host: localhost:5173 y emita la cookie y las redirecciones para ese origen.
const bff = 'http://localhost:5180';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/bff': { target: bff },
      '/api': { target: bff },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/pruebas/setup.ts'],
  },
});
