import { defineConfig, devices } from '@playwright/test';

// Dos proyectos (ADR-0022): "simulado" sustituye /bff y /api con page.route; "real" corre contra el compose completo
// con Keycloak. La 004 completa esta configuración (webServer, globalSetup y la parte del CI).
export default defineConfig({
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'simulado', testDir: 'e2e/simulado', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'real',
      testDir: 'e2e/real',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
    },
  ],
});
