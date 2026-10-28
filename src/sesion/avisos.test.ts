import { describe, expect, test } from 'vitest';
import { MENSAJES_DE_AVISO, leerAviso, limpiarAviso } from './avisos';

describe('MENSAJES_DE_AVISO', () => {
  test('F004_CL06_Aviso_Inactividad_DiceQueSeCerroPorInactividad', () => {
    expect(MENSAJES_DE_AVISO.inactividad).toBe('Tu sesión se cerró por inactividad');
  });

  test('F004_CL07_Aviso_VidaMaxima_DiceQueTermino', () => {
    expect(MENSAJES_DE_AVISO['vida-maxima']).toBe('Tu sesión terminó; vuelve a iniciar sesión');
  });

  test('F004_CL05_Aviso_IdentidadNoDisponible_DiceQueIntenteMasTarde', () => {
    expect(MENSAJES_DE_AVISO['identidad-no-disponible']).toBe(
      'El inicio de sesión no está disponible; intenta más tarde',
    );
  });

  test('F004_CA21_Aviso_ClaveActualizada_DiceClaveActualizada', () => {
    expect(MENSAJES_DE_AVISO['clave-actualizada']).toBe('Clave actualizada');
  });

  test('F004_CL12_Aviso_Revocada_EsGenericoYNoDiceElMotivo', () => {
    const mensaje = MENSAJES_DE_AVISO.revocada;

    expect(mensaje).toBeTypeOf('string');
    expect(mensaje).not.toBe('');
    expect(mensaje.toLowerCase()).not.toContain('deshabilit');
    expect(mensaje.toLowerCase()).not.toContain('restablec');
  });
});

describe('leerAviso', () => {
  test.each([
    '?aviso=inicio-fallido',
    '?aviso=identidad-no-disponible',
    '?aviso=otra-sesion-abierta',
    '?aviso=clave-actualizada',
    '?aviso=clave-sin-cambios',
    '?aviso=inactividad',
    '?aviso=vida-maxima',
    '?aviso=revocada',
    '?aviso=sesion-cerrada',
  ])('F004_RF14_LeerAviso_ValorConocido_%s', (busqueda) => {
    expect(leerAviso(busqueda)).toBe(busqueda.replace('?aviso=', ''));
  });

  test('F004_RF14_LeerAviso_ValorDesconocido_Null', () => {
    expect(leerAviso('?aviso=<script>')).toBeNull();
  });

  test('F004_RF14_LeerAviso_SinParametro_Null', () => {
    expect(leerAviso('')).toBeNull();
    expect(leerAviso('?otro=1')).toBeNull();
  });

  test('F004_RF14_LeerAviso_ConOtrosParametros_LoEncuentra', () => {
    expect(leerAviso('?x=1&aviso=inactividad')).toBe('inactividad');
  });
});

describe('limpiarAviso', () => {
  test('F004_CA21_LimpiarAviso_QuitaElParametroSinRecargarYConservaLoDemas', () => {
    window.history.replaceState(null, '', '/mis-cuentas?aviso=clave-actualizada&x=1');
    const entradasAntes = window.history.length;

    limpiarAviso();

    expect(window.location.pathname).toBe('/mis-cuentas');
    expect(window.location.search).toBe('?x=1');
    expect(window.history.length).toBe(entradasAntes);
  });

  test('F004_CA21_LimpiarAviso_SoloElAviso_DejaLaUrlSinBusqueda', () => {
    window.history.replaceState(null, '', '/mis-cuentas?aviso=clave-actualizada');

    limpiarAviso();

    expect(window.location.pathname + window.location.search).toBe('/mis-cuentas');
  });
});
