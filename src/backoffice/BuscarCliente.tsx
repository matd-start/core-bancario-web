import { useState, type JSX, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { comoErrorDeLaApi } from '../api/errores';
import { Boton } from '../comun/componentes/Boton';
import { Campo } from '../comun/componentes/Campo';
import { MensajeDeError } from '../comun/componentes/MensajeDeError';
import { Pagina } from '../comun/componentes/Pagina';
import { BotonCerrarSesion } from '../sesion/BotonCerrarSesion';
import { useSesion } from '../sesion/contextoDeSesion';
import { useBuscarClientePorDocumento, type DocumentoABuscar } from './consultas';
import { FormularioDeRegistro } from './FormularioDeRegistro';
import { TIPOS_DE_DOCUMENTO, type TipoDeDocumento } from './esquemaDeRegistro';

const NOMBRE_DE_CADA_TIPO: Record<TipoDeDocumento, string> = {
  CC: 'CC (cédula de ciudadanía)',
  CE: 'CE (cédula de extranjería)',
  PA: 'PA (pasaporte)',
};

function esTipoDeDocumento(valor: string): valor is TipoDeDocumento {
  return TIPOS_DE_DOCUMENTO.some((tipo) => tipo === valor);
}

/**
 * RF-12 y RF-01: buscar un cliente por tipo y número de documento y, si no está registrado, registrarlo (plan 3.4).
 *
 * El documento vive SOLO en el estado de este componente (RNF-04): no va en la URL, ni en `history.state`, ni en un
 * almacenamiento. Por eso el registro se abre aquí dentro y no en una ruta propia, y por eso al encontrar al cliente se
 * navega por su id.
 */
export function BuscarCliente(): JSX.Element {
  const { datos } = useSesion();
  const navegar = useNavigate();
  const buscar = useBuscarClientePorDocumento();
  const [documento, setDocumento] = useState<DocumentoABuscar>({ tipoDocumento: 'CC', numeroDocumento: '' });
  const [registrando, setRegistrando] = useState(false);

  const fallo = buscar.error === null ? null : comoErrorDeLaApi(buscar.error);
  const noEstaRegistrado = fallo?.estado === 404;

  function alBuscar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    buscar.mutate(documento, {
      onSuccess: (ficha) => void navegar(`/backoffice/clientes/${ficha.cliente.id}`),
    });
  }

  return (
    <Pagina titulo="Backoffice" acciones={<BotonCerrarSesion />}>
      {datos !== null && (
        <dl className="datos">
          <dt>Usuario</dt>
          <dd>{datos.usuario}</dd>
          <dt>Rol</dt>
          <dd>{datos.rol}</dd>
        </dl>
      )}
      {registrando ? (
        <FormularioDeRegistro
          documento={documento}
          alCancelar={() => {
            setRegistrando(false);
          }}
        />
      ) : (
        <section className="tarjeta">
          <h2>Buscar cliente</h2>
          <form aria-label="Buscar cliente" className="formulario" onSubmit={alBuscar}>
            <Campo etiqueta="Tipo de documento">
              {(propiedades) => (
                <select
                  {...propiedades}
                  value={documento.tipoDocumento}
                  onChange={(evento) => {
                    const tipo = evento.target.value;
                    if (esTipoDeDocumento(tipo)) setDocumento({ ...documento, tipoDocumento: tipo });
                  }}
                >
                  {TIPOS_DE_DOCUMENTO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {NOMBRE_DE_CADA_TIPO[tipo]}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo etiqueta="Número de documento">
              {(propiedades) => (
                <input
                  {...propiedades}
                  type="text"
                  autoComplete="off"
                  required
                  value={documento.numeroDocumento}
                  onChange={(evento) => {
                    setDocumento({ ...documento, numeroDocumento: evento.target.value });
                  }}
                />
              )}
            </Campo>
            <div>
              <Boton type="submit" enCurso={buscar.isPending}>
                Buscar
              </Boton>
            </div>
          </form>
          {noEstaRegistrado && (
            <div role="status" className="aviso">
              <p>No hay un cliente con ese documento</p>
              <Boton
                onClick={() => {
                  setRegistrando(true);
                }}
              >
                Registrarlo
              </Boton>
            </div>
          )}
          {fallo !== null && !noEstaRegistrado && <MensajeDeError error={fallo} />}
        </section>
      )}
    </Pagina>
  );
}
