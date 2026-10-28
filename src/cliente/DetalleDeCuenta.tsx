import type { JSX } from 'react';
import { Link, useParams } from 'react-router';
import { comoErrorDeLaApi } from '../api/errores';
import type { components } from '../api/generado/api';
import { Cargando } from '../comun/componentes/Cargando';
import { MensajeDeError } from '../comun/componentes/MensajeDeError';
import { Pagina } from '../comun/componentes/Pagina';
import { formatearSaldo } from '../comun/dinero';
import { BotonCerrarSesion } from '../sesion/BotonCerrarSesion';
import { useMiCuenta } from './consultas';

const formatoDeFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });

function Ficha({ cuenta }: { cuenta: components['schemas']['CuentaDto'] }): JSX.Element {
  return (
    <dl className="datos">
      <dt>Número</dt>
      <dd>{cuenta.numero}</dd>
      <dt>Moneda</dt>
      <dd>{cuenta.moneda}</dd>
      <dt>Estado</dt>
      <dd>{cuenta.estado}</dd>
      <dt>Saldo</dt>
      <dd>{formatearSaldo(cuenta.saldo)}</dd>
      <dt>Fecha de apertura</dt>
      <dd>{formatoDeFecha.format(new Date(cuenta.fechaApertura))}</dd>
      {cuenta.fechaCierre !== null && (
        <>
          <dt>Fecha de cierre</dt>
          <dd>{formatoDeFecha.format(new Date(cuenta.fechaCierre))}</dd>
        </>
      )}
    </dl>
  );
}

function Contenido({ cuentaId }: { cuentaId: string }): JSX.Element {
  const { data: cuenta, error, isPending, refetch } = useMiCuenta(cuentaId);

  if (isPending) return <Cargando />;
  if (error) {
    const fallo = comoErrorDeLaApi(error);
    // Una cuenta ajena y una inexistente dan el mismo 404: la pantalla no revela cuál de las dos es (CA-20).
    if (fallo.estado === 404) return <p>Cuenta no encontrada</p>;
    return (
      <MensajeDeError
        error={fallo}
        alReintentar={() => {
          void refetch();
        }}
      />
    );
  }
  return <Ficha cuenta={cuenta} />;
}

/** CA-20: el detalle de una cuenta propia, con sus fechas. */
export function DetalleDeCuenta(): JSX.Element {
  const { cuentaId = '' } = useParams();
  return (
    <Pagina titulo="Detalle de la cuenta" acciones={<BotonCerrarSesion />}>
      <p>
        <Link to="/mis-cuentas">Volver a mis cuentas</Link>
      </p>
      <Contenido cuentaId={cuentaId} />
    </Pagina>
  );
}
