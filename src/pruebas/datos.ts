import type { components as componentesDeLaApi } from '../api/generado/api';
import type { components as componentesDelBff } from '../api/generado/bff';

export type SesionDto = componentesDelBff['schemas']['SesionDto'];
export type CuentaDto = componentesDeLaApi['schemas']['CuentaDto'];
export type ClienteDto = componentesDeLaApi['schemas']['ClienteDto'];
export type FichaClienteDto = componentesDeLaApi['schemas']['FichaClienteDto'];
export type EstadoDeAccesoDto = componentesDeLaApi['schemas']['EstadoDeAccesoDto'];
export type AccesoHabilitadoDto = componentesDeLaApi['schemas']['AccesoHabilitadoDto'];

/** Sesión de un cliente recién activa: 5 min de inactividad y casi 30 min de vida máxima (RN-22). */
export function crearSesion(cambios: Partial<SesionDto> = {}): SesionDto {
  return {
    area: 'clientes',
    usuario: 'cc1234567',
    rol: 'Cliente',
    segundosHastaInactividad: 300,
    segundosHastaVidaMaxima: 1794,
    ...cambios,
  };
}

export function crearSesionDeOperador(cambios: Partial<SesionDto> = {}): SesionDto {
  return crearSesion({
    area: 'empleados',
    usuario: 'operadora.maria',
    rol: 'Operador',
    segundosHastaInactividad: 900,
    segundosHastaVidaMaxima: 32_394,
    ...cambios,
  });
}

export function crearCuenta(cambios: Partial<CuentaDto> = {}): CuentaDto {
  return {
    id: '0199a000-0000-7000-8000-000000000001',
    numero: '1000000001',
    clienteId: '0199a000-0000-7000-8000-0000000000c1',
    moneda: 'COP',
    estado: 'Activa',
    saldo: { monto: '1234567', moneda: 'COP' },
    fechaApertura: '2026-03-15T10:30:00Z',
    fechaCierre: null,
    ...cambios,
  };
}

/** Cuerpo de error de la API y del BFF (ADR-0011): ProblemDetails con codigo y traceId. */
export function crearProblema(estado: number, codigo: string, traceId = '00-abc123-def456-01') {
  return { title: 'Error de prueba', status: estado, codigo, traceId };
}

/** El cliente de las pruebas del backoffice: Ana María, CC 1234567, con una sola cuenta Activa por defecto. */
export const ID_DEL_CLIENTE = '0199a000-0000-7000-8000-0000000000c1';

export function crearCliente(cambios: Partial<ClienteDto> = {}): ClienteDto {
  return {
    id: ID_DEL_CLIENTE,
    tipoDocumento: 'CC',
    numeroDocumento: '1234567',
    nombres: 'Ana María',
    apellidos: 'Pérez Gómez',
    correo: 'ana.perez@example.com',
    telefono: '+573001234567',
    fechaRegistro: '2026-03-10T09:00:00Z',
    ...cambios,
  };
}

/** La ficha del operador (GET /clientes/{id} y /clientes/por-documento): el cliente y todas sus cuentas. */
export function crearFicha(cuentas?: CuentaDto[], cliente: ClienteDto = crearCliente()): FichaClienteDto {
  return { cliente, cuentas: cuentas ?? [crearCuenta({ clienteId: cliente.id })] };
}

/** RF-16. `estado` llega como texto libre: "SinAcceso", "Habilitado" o "Deshabilitado". */
export function crearEstadoDeAcceso(cambios: Partial<EstadoDeAccesoDto> = {}): EstadoDeAccesoDto {
  return { clienteId: ID_DEL_CLIENTE, estado: 'SinAcceso', primerIngresoPendiente: null, ...cambios };
}

/** Respuesta de "habilitar": `accion` es lo que la API hizo de verdad, "Habilitar" o "Restablecer" (CL-21). */
export function crearAccesoHabilitado(cambios: Partial<AccesoHabilitadoDto> = {}): AccesoHabilitadoDto {
  return {
    solicitudId: '0199a000-0000-7000-8000-0000000000a1',
    clienteId: ID_DEL_CLIENTE,
    accion: 'Habilitar',
    claveTemporal: 'Tmp-8fKq-2026-Zx',
    fecha: '2026-03-15T10:30:00Z',
    ...cambios,
  };
}
