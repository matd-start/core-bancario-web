import type { JSX, ReactNode } from 'react';

export function EstadoVacio({ children }: { children: ReactNode }): JSX.Element {
  return <p className="estado-vacio">{children}</p>;
}
