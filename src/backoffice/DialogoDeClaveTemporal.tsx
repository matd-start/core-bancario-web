// SDD: esqueleto creado por test-writer
import type { JSX } from 'react';

interface PropiedadesDeClaveTemporal {
  accion: 'Habilitar' | 'Restablecer';
  claveTemporal: string;
  onEntregada: () => void;
}

/**
 * CL-17. Modal con isDismissable={false} e isKeyboardDismissDisabled, role="alertdialog". Título con la ACCIÓN que
 * devolvió la API ("Habilitado" o "Restablecido", CL-21), la clave, "Copiar" (navigator.clipboard) y "Ya la entregué",
 * que llama a onEntregada. El componente que lo usa hace mutation.reset() al cerrarlo: la clave no queda en la caché.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DialogoDeClaveTemporal(_props: PropiedadesDeClaveTemporal): JSX.Element {
  throw new Error('SDD: no implementado');
}
