import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Proveedores } from './app/proveedores';
import './comun/estilos/base.css';

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el elemento #raiz en index.html.');

createRoot(raiz).render(
  <StrictMode>
    <Proveedores />
  </StrictMode>,
);
