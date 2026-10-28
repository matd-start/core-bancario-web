import type { JSX } from 'react';
import { Link } from 'react-router';
import { comoErrorDeLaApi } from '../api/errores';
import { Cargando } from '../comun/componentes/Cargando';
import { EstadoVacio } from '../comun/componentes/EstadoVacio';
import { MensajeDeError } from '../comun/componentes/MensajeDeError';
import { Pagina } from '../comun/componentes/Pagina';
import { formatearSaldo } from '../comun/dinero';
import { MENSAJES_DE_AVISO } from '../sesion/avisos';
import { BotonCerrarSesion } from '../sesion/BotonCerrarSesion';
import { useAvisoDeLaUrl } from '../sesion/useAvisoDeLaUrl';
import { BotonCambiarClave } from './BotonCambiarClave';
import { useMisCuentas } from './consultas';

function Cuentas(): JSX.Element {
  const { data: cuentas, error, isPending, refetch } = useMisCuentas();

  if (isPending) return <Cargando />;
  if (error)
    return (
      <MensajeDeError
        error={comoErrorDeLaApi(error)}
        alReintentar={() => {
          void refetch();
        }}
      />
    );
  if (cuentas.length === 0) return <EstadoVacio>No tienes cuentas abiertas todavía.</EstadoVacio>;

  return (
    <ul className="lista-de-tarjetas">
      {cuentas.map((cuenta) => (
        <li key={cuenta.id} className="tarjeta">
          <h2>
            <Link to={`/mis-cuentas/${cuenta.id}`}>{cuenta.numero}</Link>
          </h2>
          <dl className="datos">
            <dt>Moneda</dt>
            <dd>{cuenta.moneda}</dd>
            <dt>Estado</dt>
            <dd>{cuenta.estado}</dd>
            <dt>Saldo</dt>
            <dd>{formatearSaldo(cuenta.saldo)}</dd>
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** RF-05: las cuentas del cliente (también las Cerradas) con su saldo exacto, y el acceso a "Cambiar clave" (RF-15). */
export function MisCuentas(): JSX.Element {
  const aviso = useAvisoDeLaUrl();
  return (
    <Pagina
      titulo="Mis cuentas"
      acciones={
        <>
          <BotonCambiarClave />
          <BotonCerrarSesion />
        </>
      }
    >
      {aviso !== null && (
        <p role="status" className="aviso">
          {MENSAJES_DE_AVISO[aviso]}
        </p>
      )}
      <Cuentas />
    </Pagina>
  );
}
