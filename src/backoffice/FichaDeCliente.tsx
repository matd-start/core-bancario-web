import type { JSX } from 'react';
import { Link, useParams } from 'react-router';
import { comoErrorDeLaApi } from '../api/errores';
import type { components } from '../api/generado/api';
import { Cargando } from '../comun/componentes/Cargando';
import { EstadoVacio } from '../comun/componentes/EstadoVacio';
import { MensajeDeError } from '../comun/componentes/MensajeDeError';
import { Pagina } from '../comun/componentes/Pagina';
import { formatearSaldo } from '../comun/dinero';
import { BotonCerrarSesion } from '../sesion/BotonCerrarSesion';
import { AbrirCuenta } from './AbrirCuenta';
import { AccesoDigital } from './AccesoDigital';
import { AccionesDeCuenta } from './AccionesDeCuenta';
import { useFicha } from './consultas';

type ClienteDto = components['schemas']['ClienteDto'];
type CuentaDto = components['schemas']['CuentaDto'];

function DatosDelCliente({ cliente }: { cliente: ClienteDto }): JSX.Element {
  return (
    <section className="tarjeta">
      <h2>Cliente</h2>
      <dl className="datos">
        <dt>Nombre</dt>
        <dd>{`${cliente.nombres} ${cliente.apellidos}`}</dd>
        <dt>Documento</dt>
        <dd>{`${cliente.tipoDocumento} ${cliente.numeroDocumento}`}</dd>
        <dt>Correo</dt>
        <dd>{cliente.correo}</dd>
        <dt>Teléfono</dt>
        <dd>{cliente.telefono}</dd>
      </dl>
    </section>
  );
}

function FilaDeCuenta({ cuenta }: { cuenta: CuentaDto }): JSX.Element {
  return (
    <li className="tarjeta">
      <h3>{cuenta.numero}</h3>
      <dl className="datos">
        <dt>Moneda</dt>
        <dd>{cuenta.moneda}</dd>
        <dt>Estado</dt>
        <dd>{cuenta.estado}</dd>
        <dt>Saldo</dt>
        <dd>{formatearSaldo(cuenta.saldo)}</dd>
      </dl>
      <AccionesDeCuenta
        clienteId={cuenta.clienteId}
        cuentaId={cuenta.id}
        numero={cuenta.numero}
        estado={cuenta.estado}
      />
    </li>
  );
}

function Contenido({ clienteId }: { clienteId: string }): JSX.Element {
  const { data: ficha, error, isPending, refetch } = useFicha(clienteId);

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

  return (
    <>
      <DatosDelCliente cliente={ficha.cliente} />
      <AccesoDigital clienteId={clienteId} />
      <section className="tarjeta">
        <h2>Cuentas</h2>
        {ficha.cuentas.length === 0 ? (
          <EstadoVacio>Este cliente no tiene cuentas todavía.</EstadoVacio>
        ) : (
          <ul className="lista-de-tarjetas">
            {ficha.cuentas.map((cuenta) => (
              <FilaDeCuenta key={cuenta.id} cuenta={cuenta} />
            ))}
          </ul>
        )}
        <AbrirCuenta clienteId={clienteId} />
      </section>
    </>
  );
}

/** RF-02, RF-03, RF-13 y RF-16: la ficha del cliente con sus cuentas y el estado de su acceso digital (plan 3.4). */
export function FichaDeCliente(): JSX.Element {
  const { clienteId = '' } = useParams();
  return (
    <Pagina titulo="Ficha del cliente" acciones={<BotonCerrarSesion />}>
      <p>
        <Link to="/backoffice">Buscar otro cliente</Link>
      </p>
      <Contenido clienteId={clienteId} />
    </Pagina>
  );
}
