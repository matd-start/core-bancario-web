import type { JSX } from 'react';
import type { ErrorDeLaApi } from '../../api/errores';
import { MENSAJE_GENERICO } from '../../api/mensajes';
import { Boton } from './Boton';

interface PropiedadesDeMensajeDeError {
  error: ErrorDeLaApi;
  /** Si se da, aparece el botón "Reintentar". */
  alReintentar?: () => void;
}

/** CL-24, RNF-12: el mensaje del catálogo y el traceId para soporte; nunca el detalle técnico. */
export function MensajeDeError({ error, alReintentar }: PropiedadesDeMensajeDeError): JSX.Element {
  const esGenerico = error.mensaje === MENSAJE_GENERICO;
  return (
    <div role="alert" className="mensaje-de-error">
      <p>
        {error.mensaje}
        {esGenerico && error.traceId !== null && (
          <>
            {' '}
            <code>{error.traceId}</code>
          </>
        )}
      </p>
      {!esGenerico && error.traceId !== null && (
        <p className="mensaje-de-error__referencia">
          Código para soporte: <code>{error.traceId}</code>
        </p>
      )}
      {alReintentar && (
        <Boton variante="secundario" onClick={alReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}
