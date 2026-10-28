import type { JSX, ReactNode } from 'react';

interface PropiedadesDeBoton {
  children: ReactNode;
  onClick?: () => void;
  /** Con la acción en curso queda deshabilitado y anuncia "ocupado": un doble clic envía una sola petición (CA-24). */
  enCurso?: boolean;
  variante?: 'primario' | 'secundario';
  type?: 'button' | 'submit';
  autoFocus?: boolean;
}

export function Boton({
  children,
  onClick,
  enCurso = false,
  variante = 'primario',
  type = 'button',
  autoFocus = false,
}: PropiedadesDeBoton): JSX.Element {
  return (
    <button
      type={type}
      className={`boton boton--${variante}`}
      disabled={enCurso}
      aria-busy={enCurso}
      autoFocus={autoFocus}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
