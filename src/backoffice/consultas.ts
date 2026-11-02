import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { exigirDatos, FalloDeLaApi } from '../api/errores';
import { useClienteDeLaApi } from '../sesion/contextoDeSesion';
import type { AccionDeCuenta } from './acciones';
import type { RegistrarClienteRequest, TipoDeDocumento } from './esquemaDeRegistro';

/** Las claves de consulta de la ficha y del acceso (plan 3.4). Tras cada acción se invalidan (CL-16). */
const claveDeLaFicha = (clienteId: string) => ['ficha', clienteId] as const;
const claveDelAcceso = (clienteId: string) => ['acceso', clienteId] as const;

/** RF-02, RF-03: el cliente con todas sus cuentas. */
export function useFicha(clienteId: string) {
  const api = useClienteDeLaApi();
  return useQuery({
    queryKey: claveDeLaFicha(clienteId),
    queryFn: async () => exigirDatos(await api.GET('/clientes/{clienteId}', { params: { path: { clienteId } } })),
  });
}

/** RF-16: el estado del acceso digital, en su propia consulta: si falla (502/503), la ficha sigue visible (CL-20). */
export function useEstadoDeAcceso(clienteId: string) {
  const api = useClienteDeLaApi();
  return useQuery({
    queryKey: claveDelAcceso(clienteId),
    queryFn: async () =>
      exigirDatos(await api.GET('/clientes/{clienteId}/acceso-digital', { params: { path: { clienteId } } })),
  });
}

export interface DocumentoABuscar {
  tipoDocumento: TipoDeDocumento;
  numeroDocumento: string;
}

/**
 * RF-12. Es una mutación aunque la petición sea un GET: el número de documento no debe entrar en una clave de consulta
 * (que viviría en la caché) y la búsqueda es un acto del operador, no un dato que se refresque (RNF-04). Con `gcTime: 0`
 * la mutación sale de la caché cuando nadie la observa.
 */
export function useBuscarClientePorDocumento() {
  const api = useClienteDeLaApi();
  return useMutation({
    mutationFn: async ({ tipoDocumento, numeroDocumento }: DocumentoABuscar) =>
      exigirDatos(await api.GET('/clientes/por-documento', { params: { query: { tipoDocumento, numeroDocumento } } })),
  });
}

/** RF-01. */
export function useRegistrarCliente() {
  const api = useClienteDeLaApi();
  return useMutation({
    mutationFn: async (datos: RegistrarClienteRequest) => exigirDatos(await api.POST('/clientes', { body: datos })),
  });
}

/** RF-02. `retry: 0` viene de la configuración de mutaciones de la app (CL-15). */
export function useAbrirCuenta(clienteId: string) {
  const api = useClienteDeLaApi();
  const clienteDeConsultas = useQueryClient();
  return useMutation({
    mutationFn: async (moneda: 'COP' | 'USD') =>
      exigirDatos(
        await api.POST('/clientes/{clienteId}/cuentas', { params: { path: { clienteId } }, body: { moneda } }),
      ),
    // Devolver la promesa hace que la mutación siga "en curso" (y el botón deshabilitado) hasta que la ficha se recargue.
    onSuccess: () => clienteDeConsultas.invalidateQueries({ queryKey: claveDeLaFicha(clienteId) }),
  });
}

const RUTA_DE_CADA_ACCION = {
  Bloquear: '/cuentas/{cuentaId}/bloquear',
  Desbloquear: '/cuentas/{cuentaId}/desbloquear',
  Cerrar: '/cuentas/{cuentaId}/cerrar',
} as const satisfies Record<AccionDeCuenta, string>;

/**
 * RF-03. Con éxito, o con un 409 (la cuenta cambió mientras tanto, CL-16), se recarga la ficha para ver el estado real.
 * Un 422 (CL-18) no cambia nada: la ficha ya está bien.
 */
export function useCambiarEstadoDeCuenta(clienteId: string) {
  const api = useClienteDeLaApi();
  const clienteDeConsultas = useQueryClient();
  const recargarLaFicha = () => clienteDeConsultas.invalidateQueries({ queryKey: claveDeLaFicha(clienteId) });
  return useMutation({
    mutationFn: async ({ cuentaId, accion }: { cuentaId: string; accion: AccionDeCuenta }) =>
      exigirDatos(await api.POST(RUTA_DE_CADA_ACCION[accion], { params: { path: { cuentaId } } })),
    onSuccess: recargarLaFicha,
    onError: (error) => (error instanceof FalloDeLaApi && error.error.estado === 409 ? recargarLaFicha() : undefined),
  });
}

/**
 * RF-13. Habilitar y Restablecer son la misma llamada: la API decide cuál de las dos hizo y lo dice en `accion` (CL-21).
 * La respuesta lleva la clave temporal: la mutación se conserva solo mientras el diálogo la muestra (CL-17).
 */
export function useHabilitarAcceso(clienteId: string) {
  const api = useClienteDeLaApi();
  const clienteDeConsultas = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      exigirDatos(
        await api.POST('/clientes/{clienteId}/acceso-digital/habilitar', { params: { path: { clienteId } } }),
      ),
    onSuccess: () => clienteDeConsultas.invalidateQueries({ queryKey: claveDelAcceso(clienteId) }),
  });
}

/** RF-16. */
export function useDeshabilitarAcceso(clienteId: string) {
  const api = useClienteDeLaApi();
  const clienteDeConsultas = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      exigirDatos(
        await api.POST('/clientes/{clienteId}/acceso-digital/deshabilitar', { params: { path: { clienteId } } }),
      ),
    onSuccess: () => clienteDeConsultas.invalidateQueries({ queryKey: claveDelAcceso(clienteId) }),
  });
}
