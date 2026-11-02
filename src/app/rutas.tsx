import { Navigate, type RouteObject } from 'react-router';
import { BuscarCliente } from '../backoffice/BuscarCliente';
import { FichaDeCliente } from '../backoffice/FichaDeCliente';
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
    children: [
      { index: true, element: <BuscarCliente /> },
      { path: 'clientes/:clienteId', element: <FichaDeCliente /> },
      // CL-08: una ruta mal escrita del operador vuelve a la búsqueda; sin esto caería en la "*" del área del cliente.
      { path: '*', element: <Navigate to="/backoffice" replace /> },
    ],
  },
  { path: '*', element: <RedireccionAMisCuentas /> },
];
