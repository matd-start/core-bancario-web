import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Punto de entrada provisional del kit: T16 de la 004 lo sustituye por las rutas y los proveedores de la app.
const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el elemento #raiz en index.html.');

createRoot(raiz).render(
  <StrictMode>
    <main>
      <h1>Core Bancario</h1>
    </main>
  </StrictMode>,
);
