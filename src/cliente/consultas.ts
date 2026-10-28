import { useQuery } from '@tanstack/react-query';
import { exigirDatos } from '../api/errores';
import { useClienteDeLaApi } from '../sesion/contextoDeSesion';

/** RF-05: las cuentas del cliente con sesión, también las Cerradas. */
export function useMisCuentas() {
  const api = useClienteDeLaApi();
  return useQuery({
    queryKey: ['mis-cuentas'],
    queryFn: async () => exigirDatos(await api.GET('/mis-cuentas')),
  });
}

/** Una cuenta propia. Si es ajena o no existe, la API responde 404 igual (CA-20). */
export function useMiCuenta(cuentaId: string) {
  const api = useClienteDeLaApi();
  return useQuery({
    queryKey: ['mis-cuentas', cuentaId],
    queryFn: async () => exigirDatos(await api.GET('/mis-cuentas/{cuentaId}', { params: { path: { cuentaId } } })),
  });
}
