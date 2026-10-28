import { useId, type JSX, type ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';

interface PropiedadesDeDialogo {
  titulo: string;
  children: ReactNode;
  /** Botones del pie. */
  acciones: ReactNode;
  /** "alertdialog" exige una respuesta (aviso de sesión, clave temporal); "dialog" es el normal. */
  rol?: 'dialog' | 'alertdialog';
  /**
   * Si se da, el diálogo se puede cerrar con Escape o pulsando fuera. Sin él NO se cierra por accidente (CL-17): hay
   * que usar un botón.
   */
  alCerrar?: () => void;
}

/**
 * Diálogo modal sobre React Aria: atrapa el foco, lo devuelve al cerrar, oculta el resto de la página a los lectores de
 * pantalla y se puede manejar con teclado.
 */
export function Dialogo({ titulo, children, acciones, rol = 'dialog', alCerrar }: PropiedadesDeDialogo): JSX.Element {
  const idDeLaDescripcion = useId();
  const sePuedeDescartar = alCerrar !== undefined;
  return (
    <ModalOverlay
      isOpen
      onOpenChange={(abierto) => {
        if (!abierto) alCerrar?.();
      }}
      isDismissable={sePuedeDescartar}
      isKeyboardDismissDisabled={!sePuedeDescartar}
      className="dialogo-fondo"
    >
      <Modal className="dialogo">
        <Dialog role={rol} aria-describedby={idDeLaDescripcion} className="dialogo__contenido">
          <Heading slot="title" className="dialogo__titulo">
            {titulo}
          </Heading>
          <div id={idDeLaDescripcion} className="dialogo__cuerpo">
            {children}
          </div>
          <div className="dialogo__acciones">{acciones}</div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
