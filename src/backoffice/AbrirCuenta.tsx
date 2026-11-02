import { useState, type JSX, type SubmitEvent } from 'react';
import { comoErrorDeLaApi } from '../api/errores';
import { Boton } from '../comun/componentes/Boton';
import { Campo } from '../comun/componentes/Campo';
import { MensajeDeError } from '../comun/componentes/MensajeDeError';
import { useAbrirCuenta } from './consultas';

type Moneda = 'COP' | 'USD';

function esMoneda(valor: string): valor is Moneda {
  return valor === 'COP' || valor === 'USD';
}

/**
 * RF-02: abrir una cuenta en COP o USD. `Boton enCurso` deshabilita el botón mientras la petición está en vuelo y las
 * mutaciones no se reintentan (CL-15), así que un doble clic envía una sola petición (CA-24). Límite conocido: dos
 * pestañas, o un reintento de red del navegador, aún podrían abrir dos cuentas; lo cierra la idempotencia de S4 y S5.
 */
export function AbrirCuenta({ clienteId }: { clienteId: string }): JSX.Element {
  const abrir = useAbrirCuenta(clienteId);
  const [moneda, setMoneda] = useState<Moneda>('COP');

  function alEnviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    abrir.mutate(moneda);
  }

  return (
    <form aria-label="Abrir cuenta" className="formulario formulario--en-linea" onSubmit={alEnviar}>
      <Campo etiqueta="Moneda">
        {(propiedades) => (
          <select
            {...propiedades}
            value={moneda}
            onChange={(evento) => {
              if (esMoneda(evento.target.value)) setMoneda(evento.target.value);
            }}
          >
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        )}
      </Campo>
      <Boton type="submit" enCurso={abrir.isPending}>
        Abrir cuenta
      </Boton>
      {abrir.error !== null && <MensajeDeError error={comoErrorDeLaApi(abrir.error)} />}
    </form>
  );
}
