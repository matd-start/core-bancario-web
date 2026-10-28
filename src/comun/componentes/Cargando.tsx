import type { JSX } from 'react';

export function Cargando({ texto = 'Cargando…' }: { texto?: string }): JSX.Element {
  return (
    <div role="status" className="cargando">
      {texto}
    </div>
  );
}
