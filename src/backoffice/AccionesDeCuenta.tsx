import { useState, type JSX } from 'react';
import { comoErrorDeLaApi } from '../api/errores';
import { Boton } from '../comun/componentes/Boton';
import { DialogoDeConfirmacion } from '../comun/componentes/DialogoDeConfirmacion';
import { MensajeDeError } from '../comun/componentes/MensajeDeError';
import { accionesDeCuenta, comoEstadoDeCuenta, type AccionDeCuenta } from './acciones';
import { useCambiarEstadoDeCuenta } from './consultas';

interface PropiedadesDeAcciones {
  clienteId: string;
  cuentaId: string;
  numero: string;
  /** Texto libre del contrato: si no es uno de los tres estados conocidos, no se ofrece ninguna acción (RN-14). */
  estado: string;
}

/** RF-03, RN-14: solo las acciones permitidas para el estado. "Cerrar" pide confirmación; 409 y 422 muestran su mensaje. */
export function AccionesDeCuenta({ clienteId, cuentaId, numero, estado }: PropiedadesDeAcciones): JSX.Element | null {
  const cambiar = useCambiarEstadoDeCuenta(clienteId);
  const [confirmandoElCierre, setConfirmandoElCierre] = useState(false);

  const estadoConocido = comoEstadoDeCuenta(estado);
  const acciones = estadoConocido === null ? [] : accionesDeCuenta(estadoConocido);

  function ejecutar(accion: AccionDeCuenta) {
    cambiar.mutate({ cuentaId, accion });
  }

  function alPulsar(accion: AccionDeCuenta) {
    if (accion === 'Cerrar') setConfirmandoElCierre(true);
    else ejecutar(accion);
  }

  if (acciones.length === 0 && cambiar.error === null) return null;

  return (
    <>
      <div className="acciones">
        {acciones.map((accion) => (
          <Boton
            key={accion}
            variante="secundario"
            enCurso={cambiar.isPending}
            onClick={() => {
              alPulsar(accion);
            }}
          >
            {accion}
          </Boton>
        ))}
      </div>
      {cambiar.error !== null && <MensajeDeError error={comoErrorDeLaApi(cambiar.error)} />}
      {confirmandoElCierre && (
        <DialogoDeConfirmacion
          titulo={`Cerrar la cuenta ${numero}`}
          textoDeConfirmar="Cerrar cuenta"
          alCancelar={() => {
            setConfirmandoElCierre(false);
          }}
          alConfirmar={() => {
            setConfirmandoElCierre(false);
            ejecutar('Cerrar');
          }}
        >
          <p>Una cuenta cerrada no se puede volver a abrir. Solo se puede cerrar si su saldo es cero.</p>
        </DialogoDeConfirmacion>
      )}
    </>
  );
}
