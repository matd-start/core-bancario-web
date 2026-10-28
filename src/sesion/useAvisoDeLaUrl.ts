import { useEffect, useState } from 'react';
import { leerAviso, limpiarAviso, type Aviso } from './avisos';

/**
 * Lee ?aviso= al abrir la pantalla, lo conserva en el estado y lo quita de la URL: así un refresco no vuelve a mostrarlo
 * (CA-21). Se lee de la URL real del navegador, que es donde el BFF dejó el parámetro.
 */
export function useAvisoDeLaUrl(): Aviso | null {
  const [aviso] = useState(() => leerAviso(window.location.search));
  useEffect(() => {
    if (aviso !== null) limpiarAviso();
  }, [aviso]);
  return aviso;
}
