import type { components as componentesDeLaApi } from '../api/generado/api';
import type { components as componentesDelBff } from '../api/generado/bff';

export type SesionDto = componentesDelBff['schemas']['SesionDto'];
export type CuentaDto = componentesDeLaApi['schemas']['CuentaDto'];

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
