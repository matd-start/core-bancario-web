import { useState, type JSX } from 'react';
import { Boton } from '../comun/componentes/Boton';
import { Dialogo } from '../comun/componentes/Dialogo';

interface PropiedadesDeClaveTemporal {
  accion: 'Habilitar' | 'Restablecer';
  claveTemporal: string;
  onEntregada: () => void;
}

const TITULO_SEGUN_LA_ACCION = {
  Habilitar: 'Habilitado: clave temporal',
  Restablecer: 'Restablecido: clave temporal',
} as const satisfies Record<PropiedadesDeClaveTemporal['accion'], string>;

type EstadoDeLaCopia = 'sin-copiar' | 'copiada' | 'fallida';

/**
 * CL-17. Modal con isDismissable={false} e isKeyboardDismissDisabled (lo hace `Dialogo` cuando no recibe `alCerrar`),
 * role="alertdialog". Título con la ACCIÓN que devolvió la API ("Habilitado" o "Restablecido", CL-21), la clave,
 * "Copiar" (navigator.clipboard) y "Ya la entregué", que llama a onEntregada. El componente que lo usa hace
 * mutation.reset() al cerrarlo: la clave no queda en la caché.
 */
export function DialogoDeClaveTemporal({
  accion,
  claveTemporal,
  onEntregada,
}: PropiedadesDeClaveTemporal): JSX.Element {
  const [copia, setCopia] = useState<EstadoDeLaCopia>('sin-copiar');

  async function copiar() {
    try {
      await navigator.clipboard.writeText(claveTemporal);
      setCopia('copiada');
    } catch {
      // Sin permiso del navegador para el portapapeles: la clave sigue a la vista para copiarla a mano.
      setCopia('fallida');
    }
  }

  return (
    <Dialogo
      titulo={TITULO_SEGUN_LA_ACCION[accion]}
      rol="alertdialog"
      acciones={
        <>
          <Boton
            variante="secundario"
            onClick={() => {
              void copiar();
            }}
          >
            Copiar
          </Boton>
          <Boton onClick={onEntregada}>Ya la entregué</Boton>
        </>
      }
    >
      <p>Esta es la clave temporal del cliente. Se muestra una sola vez: entrégasela y no podrás volver a verla.</p>
      <p>
        <code className="clave-temporal">{claveTemporal}</code>
      </p>
      {copia === 'copiada' && <p role="status">Clave copiada</p>}
      {copia === 'fallida' && <p role="status">No se pudo copiar: cópiala a mano.</p>}
    </Dialogo>
  );
}
