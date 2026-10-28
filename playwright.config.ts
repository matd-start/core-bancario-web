import { defineConfig, devices } from '@playwright/test';

// Dos proyectos (ADR-0022):
// - "simulado": Chromium contra la SPA compilada y servida con `vite preview`; /bff y /api los sustituye cada prueba con
//   page.route (e2e/simulado/entorno.ts) y el tiempo lo controla el reloj de Playwright.
// - "real": contra el compose completo de core-bancario (perfiles app y web, la SPA en http://localhost:5173) con
//   Keycloak real. No levanta nada: `docker compose --profile app --profile web up -d --build --wait`.

const PUERTO_DE_VISTA_PREVIA = 4173;
// `vite preview` solo hace falta para el proyecto simulado: con --project=real no se compila ni se levanta nada.
const soloReal = process.argv.includes('--project=real');

export default defineConfig({
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure', locale: 'es-CO', timezoneId: 'America/Bogota' },
  projects: [
    {
      name: 'simulado',
      testDir: 'e2e/simulado',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${String(PUERTO_DE_VISTA_PREVIA)}` },
    },
    {
      name: 'real',
      testDir: 'e2e/real',
      // Los recorridos reales son largos (Keycloak, ventanas de 30 s del segundo factor) y comparten estado entre pasos.
      timeout: 180_000,
      fullyParallel: false,
      workers: 1,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
    },
  ],
  ...(soloReal
    ? {}
    : {
        webServer: {
          command: `npm run build && npx vite preview --port ${String(PUERTO_DE_VISTA_PREVIA)} --strictPort`,
          url: `http://localhost:${String(PUERTO_DE_VISTA_PREVIA)}`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
