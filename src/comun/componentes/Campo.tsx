import { useId, type JSX, type ReactNode } from 'react';

/** Lo que el control (input, select) debe recibir para quedar asociado a su etiqueta y a su error. */
export interface PropiedadesDelControl {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface PropiedadesDeCampo {
  etiqueta: string;
  /** El mensaje del error del campo, si lo hay: se anuncia con el campo (aria-describedby) y lo marca inválido. */
  error?: string | undefined;
  /** Recibe las propiedades de accesibilidad para ponerlas en el control: `{...propiedades}`. */
  children: (propiedades: PropiedadesDelControl) => ReactNode;
}

/** Etiqueta + control + error, asociados por id (RNF-08). El control lo pone quien lo usa: así sirve con RHF y sin él. */
export function Campo({ etiqueta, error, children }: PropiedadesDeCampo): JSX.Element {
  const id = useId();
  const idDelError = `${id}-error`;
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': error === undefined ? undefined : idDelError,
      })}
      {error !== undefined && (
        <p id={idDelError} className="campo__error">
          {error}
        </p>
      )}
    </div>
  );
}
