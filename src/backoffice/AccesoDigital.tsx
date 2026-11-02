import { useState, type JSX } from 'react';
import { comoErrorDeLaApi } from '../api/errores';
import { Boton } from '../comun/componentes/Boton';
import { Cargando } from '../comun/componentes/Cargando';
import { DialogoDeConfirmacion } from '../comun/componentes/DialogoDeConfirmacion';
import { MensajeDeError } from '../comun/componentes/MensajeDeError';
import { accionesDeAcceso, comoEstadoDelAcceso, type AccionDeAcceso, type EstadoDelAcceso } from './acciones';
import { useDeshabilitarAcceso, useEstadoDeAcceso, useHabilitarAcceso } from './consultas';
import { DialogoDeClaveTemporal } from './DialogoDeClaveTemporal';

const ETIQUETA_DEL_ESTADO: Record<Exclude<EstadoDelAcceso, 'no-disponible'>, string> = {
  SinAcceso: 'Sin habilitar',
  Habilitado: 'Habilitado',
  Deshabilitado: 'Deshabilitado',
};

/** Qué pasa al confirmar cada acción: el operador decide con esto delante (RN-20, CL-21). */
const CONFIRMACION: Record<AccionDeAcceso, { titulo: string; texto: string }> = {
  Habilitar: {
    titulo: 'Habilitar el acceso digital',
    texto:
      'Se creará una clave temporal para el cliente. Si el cliente ya tuviera acceso, se restablece: su clave anterior deja de servir, se borra su segundo factor y se cierran sus sesiones.',
  },
  Restablecer: {
    titulo: 'Restablecer el acceso digital',
    texto:
      'Se generará una clave temporal nueva. El cliente tendrá que configurar de nuevo su segundo factor (el actual se borra) y se cerrarán todas sus sesiones abiertas.',
  },
  Deshabilitar: {
    titulo: 'Deshabilitar el acceso digital',
    texto: 'El cliente no podrá iniciar sesión y se cerrarán sus sesiones abiertas.',
  },
};

/**
 * RF-13, RF-16, RN-20. El estado del acceso es una consulta aparte de la ficha (['acceso', id]): si el sistema de
 * identidad no responde, la ficha se ve igual y aquí solo se dice que el estado no está disponible, sin acciones (CL-20).
 */
export function AccesoDigital({ clienteId }: { clienteId: string }): JSX.Element {
  const consulta = useEstadoDeAcceso(clienteId);
  const habilitar = useHabilitarAcceso(clienteId);
  const deshabilitar = useDeshabilitarAcceso(clienteId);
  const [confirmando, setConfirmando] = useState<AccionDeAcceso | null>(null);

  function confirmar(accion: AccionDeAcceso) {
    setConfirmando(null);
    if (accion === 'Deshabilitar') deshabilitar.mutate();
    else habilitar.mutate();
  }

  const fallo = consulta.error === null ? null : comoErrorDeLaApi(consulta.error);
  const estado = consulta.data === undefined ? null : comoEstadoDelAcceso(consulta.data.estado);
  const enCurso = habilitar.isPending || deshabilitar.isPending;

  function contenido(): JSX.Element {
    if (fallo?.estado === 502 || fallo?.estado === 503 || estado === 'no-disponible')
      return (
        <div className="aviso">
          <p>Estado del acceso no disponible</p>
          <Boton
            variante="secundario"
            onClick={() => {
              void consulta.refetch();
            }}
          >
            Reintentar
          </Boton>
        </div>
      );
    if (fallo !== null)
      return (
        <MensajeDeError
          error={fallo}
          alReintentar={() => {
            void consulta.refetch();
          }}
        />
      );
    if (estado === null) return <Cargando />;
    return (
      <>
        <dl className="datos">
          <dt>Estado</dt>
          <dd>{ETIQUETA_DEL_ESTADO[estado]}</dd>
        </dl>
        {/* `primerIngresoPendiente` puede ser null (no se sabe): solo `true` afirma algo. */}
        {estado === 'Habilitado' && consulta.data?.primerIngresoPendiente === true && (
          <p>Primer ingreso pendiente: el cliente aún no usa su clave temporal.</p>
        )}
        <div className="acciones">
          {accionesDeAcceso(estado).map((accion) => (
            <Boton
              key={accion}
              variante="secundario"
              enCurso={enCurso}
              onClick={() => {
                setConfirmando(accion);
              }}
            >
              {accion}
            </Boton>
          ))}
        </div>
      </>
    );
  }

  return (
    <section className="tarjeta">
      <h2>Acceso digital</h2>
      {contenido()}
      {habilitar.error !== null && <MensajeDeError error={comoErrorDeLaApi(habilitar.error)} />}
      {deshabilitar.error !== null && <MensajeDeError error={comoErrorDeLaApi(deshabilitar.error)} />}
      {confirmando !== null && (
        <DialogoDeConfirmacion
          titulo={CONFIRMACION[confirmando].titulo}
          textoDeConfirmar={confirmando}
          alCancelar={() => {
            setConfirmando(null);
          }}
          alConfirmar={() => {
            confirmar(confirmando);
          }}
        >
          <p>{CONFIRMACION[confirmando].texto}</p>
        </DialogoDeConfirmacion>
      )}
      {habilitar.data !== undefined && (
        <DialogoDeClaveTemporal
          // La API dice qué hizo de verdad (CL-21); un valor que no es "Restablecer" se trata como habilitación.
          accion={habilitar.data.accion === 'Restablecer' ? 'Restablecer' : 'Habilitar'}
          claveTemporal={habilitar.data.claveTemporal}
          onEntregada={habilitar.reset}
        />
      )}
    </section>
  );
}
