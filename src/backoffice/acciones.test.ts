import { describe, expect, test } from 'vitest';
import {
  accionesDeAcceso,
  accionesDeCuenta,
  type AccionDeAcceso,
  type AccionDeCuenta,
  type EstadoDeCuenta,
  type EstadoDelAcceso,
} from './acciones';

describe('accionesDeCuenta (RN-14)', () => {
  test.each<[EstadoDeCuenta, AccionDeCuenta[]]>([
    ['Activa', ['Bloquear', 'Cerrar']],
    ['Bloqueada', ['Desbloquear']],
    ['Cerrada', []],
  ])('F004_CA25_AccionesDeCuenta_SegunEstado_%s', (estado, esperadas) => {
    expect(accionesDeCuenta(estado)).toEqual(esperadas);
  });
});

describe('accionesDeAcceso (RF-16)', () => {
  test.each<[EstadoDelAcceso, AccionDeAcceso[]]>([
    ['SinAcceso', ['Habilitar']],
    ['Habilitado', ['Restablecer', 'Deshabilitar']],
    ['Deshabilitado', ['Habilitar']],
    ['no-disponible', []],
  ])('F004_CA28_AccionesDeAcceso_SegunEstado_%s', (estado, esperadas) => {
    expect(accionesDeAcceso(estado)).toEqual(esperadas);
  });
});
