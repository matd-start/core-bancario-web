import { zodResolver } from '@hookform/resolvers/zod';
import type { JSX } from 'react';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { useNavigate } from 'react-router';
import type { z } from 'zod';
import { comoErrorDeLaApi } from '../api/errores';
import { Boton } from '../comun/componentes/Boton';
import { Campo } from '../comun/componentes/Campo';
import { MensajeDeError } from '../comun/componentes/MensajeDeError';
import { useBuscarClientePorDocumento, useRegistrarCliente, type DocumentoABuscar } from './consultas';
import { esquemaDeRegistro, TIPOS_DE_DOCUMENTO, type DatosDelFormulario } from './esquemaDeRegistro';

const CAMPOS = ['tipoDocumento', 'numeroDocumento', 'nombres', 'apellidos', 'correo', 'telefono'] as const;
type NombreDeCampo = (typeof CAMPOS)[number];

/** Del `errors` de un 400 (ASP.NET puede escribir los campos con mayúscula inicial) a los campos de este formulario. */
function erroresPorCampo(errores: Record<string, string[]>): Partial<Record<NombreDeCampo, string>> {
  const porCampo: Partial<Record<NombreDeCampo, string>> = {};
  for (const [clave, mensajes] of Object.entries(errores)) {
    const campo = CAMPOS.find((nombre) => nombre.toLowerCase() === clave.toLowerCase());
    if (campo !== undefined) porCampo[campo] = mensajes.join(' ');
  }
  return porCampo;
}

function marcarErroresDelServidor(
  porCampo: Partial<Record<NombreDeCampo, string>>,
  setError: UseFormSetError<DatosDelFormulario>,
) {
  for (const campo of CAMPOS) {
    const message = porCampo[campo];
    if (message !== undefined) setError(campo, { type: 'servidor', message });
  }
}

interface PropiedadesDelFormulario {
  /** Lo que el operador ya había escrito al buscar. */
  documento: DocumentoABuscar;
  alCancelar: () => void;
}

/**
 * RF-01, CA-23. React Hook Form maneja el estado del formulario y Zod (`esquemaDeRegistro`) valida en el navegador. La
 * API sigue decidiendo: un 400 con `errors` se pone junto a su campo (setError) y un 409 `documento-duplicado` ofrece
 * ir a la ficha de quien ya existe (CL-23).
 */
export function FormularioDeRegistro({ documento, alCancelar }: PropiedadesDelFormulario): JSX.Element {
  const navegar = useNavigate();
  const registrar = useRegistrarCliente();
  const buscar = useBuscarClientePorDocumento();
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<DatosDelFormulario, unknown, z.output<typeof esquemaDeRegistro>>({
    resolver: zodResolver(esquemaDeRegistro),
    defaultValues: { ...documento, nombres: '', apellidos: '', correo: '', telefono: '' },
  });

  const fallo = registrar.error === null ? null : comoErrorDeLaApi(registrar.error);
  // Un 400 cuyos campos están en el formulario ya se explicó junto a cada uno: no hace falta repetirlo arriba.
  const yaSeExplicoPorCampo = fallo !== null && Object.keys(erroresPorCampo(fallo.errores)).length > 0;
  const yaExiste = fallo?.codigo === 'documento-duplicado';
  const falloDeLaBusqueda = buscar.error === null ? null : comoErrorDeLaApi(buscar.error);

  const alEnviar = handleSubmit((datos) => {
    registrar.mutate(datos, {
      onSuccess: (cliente) => void navegar(`/backoffice/clientes/${cliente.id}`),
      onError: (error) => {
        marcarErroresDelServidor(erroresPorCampo(comoErrorDeLaApi(error).errores), setError);
      },
    });
  });

  function irALaFicha() {
    const { tipoDocumento, numeroDocumento } = getValues();
    buscar.mutate(
      { tipoDocumento, numeroDocumento },
      { onSuccess: (ficha) => void navegar(`/backoffice/clientes/${ficha.cliente.id}`) },
    );
  }

  return (
    <section className="tarjeta">
      <h2>Registrar cliente</h2>
      <form aria-label="Registrar cliente" className="formulario" noValidate onSubmit={(e) => void alEnviar(e)}>
        <Campo etiqueta="Tipo de documento" error={errors.tipoDocumento?.message}>
          {(propiedades) => (
            <select {...propiedades} {...register('tipoDocumento')}>
              {TIPOS_DE_DOCUMENTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo etiqueta="Número de documento" error={errors.numeroDocumento?.message}>
          {(propiedades) => <input {...propiedades} {...register('numeroDocumento')} type="text" autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Nombres" error={errors.nombres?.message}>
          {(propiedades) => <input {...propiedades} {...register('nombres')} type="text" autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Apellidos" error={errors.apellidos?.message}>
          {(propiedades) => <input {...propiedades} {...register('apellidos')} type="text" autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Correo" error={errors.correo?.message}>
          {(propiedades) => <input {...propiedades} {...register('correo')} type="email" autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Teléfono" error={errors.telefono?.message}>
          {(propiedades) => <input {...propiedades} {...register('telefono')} type="tel" autoComplete="off" />}
        </Campo>
        {fallo !== null && !yaSeExplicoPorCampo && <MensajeDeError error={fallo} />}
        {yaExiste && (
          <div>
            <Boton variante="secundario" enCurso={buscar.isPending} onClick={irALaFicha}>
              Ir a la ficha
            </Boton>
          </div>
        )}
        {falloDeLaBusqueda !== null && <MensajeDeError error={falloDeLaBusqueda} />}
        <div className="formulario__acciones">
          <Boton type="submit" enCurso={registrar.isPending}>
            Registrar cliente
          </Boton>
          <Boton variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </section>
  );
}
