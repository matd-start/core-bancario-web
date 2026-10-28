import type { JSX, ReactNode } from 'react';
import { Boton } from './Boton';
import { Dialogo } from './Dialogo';

interface PropiedadesDeConfirmacion {
  titulo: string;
  children: ReactNode;
  textoDeConfirmar: string;
  alConfirmar: () => void;
  alCancelar: () => void;
  enCurso?: boolean;
}

/** Pide confirmar antes de una acción que cambia datos. Cancelar siempre está a mano y Escape equivale a cancelar. */
export function DialogoDeConfirmacion({
  titulo,
  children,
  textoDeConfirmar,
  alConfirmar,
  alCancelar,
  enCurso = false,
}: PropiedadesDeConfirmacion): JSX.Element {
  return (
    <Dialogo
      titulo={titulo}
      rol="alertdialog"
      alCerrar={alCancelar}
      acciones={
        <>
          <Boton variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
          <Boton enCurso={enCurso} onClick={alConfirmar}>
            {textoDeConfirmar}
          </Boton>
        </>
      }
    >
      {children}
    </Dialogo>
  );
}
