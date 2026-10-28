import type { RouteObject } from 'react-router';
import { InicioDelBackoffice } from '../backoffice/InicioDelBackoffice';
import { DetalleDeCuenta } from '../cliente/DetalleDeCuenta';
import { MisCuentas } from '../cliente/MisCuentas';
import { AreaDelBackoffice, AreaDelCliente, ErrorDelArea, RedireccionAMisCuentas } from './areas';

/** Rutas de la SPA (plan, sección 3.4). Un layout por área; el documento del cliente nunca va en una ruta. */
export const rutas: RouteObject[] = [
  {
    element: <AreaDelCliente />,
    errorElement: <ErrorDelArea />,
    children: [
      { path: '/', element: <RedireccionAMisCuentas /> },
      { path: '/mis-cuentas', element: <MisCuentas /> },
      { path: '/mis-cuentas/:cuentaId', element: <DetalleDeCuenta /> },
    ],
  },
  {
    path: '/backoffice',
    element: <AreaDelBackoffice />,
    errorElement: <ErrorDelArea />,
    children: [{ index: true, element: <InicioDelBackoffice /> }],
  },
  { path: '*', element: <RedireccionAMisCuentas /> },
];
