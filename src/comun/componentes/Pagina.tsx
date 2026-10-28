import type { JSX, ReactNode } from 'react';

interface PropiedadesDePagina {
  titulo: string;
  /** Botones de la cabecera (cerrar sesión, cambiar clave…). */
  acciones?: ReactNode;
  children?: ReactNode;
}

/** La estructura común de una pantalla: un <main>, un único <h1> y las acciones de la cabecera. */
export function Pagina({ titulo, acciones, children }: PropiedadesDePagina): JSX.Element {
  return (
    <main className="pagina">
      <header className="pagina__cabecera">
        <h1>{titulo}</h1>
        {acciones && <div className="pagina__acciones">{acciones}</div>}
      </header>
      {children}
    </main>
  );
}
