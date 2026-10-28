import { describe, expect, test } from 'vitest';
import { crearSesion } from '../pruebas/datos';
import { aPlazosLocales, evaluarReloj, type PlazosLocales } from './relojDeSesion';

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;

describe('aPlazosLocales', () => {
  test('F004_CL06_APlazosLocales_SumaLosSegundosDelServidorAlInstanteDeRecepcion', () => {
    const sesion = crearSesion({ segundosHastaInactividad: 300, segundosHastaVidaMaxima: 1794 });

    const plazos = aPlazosLocales(sesion, 1_000_000);

    expect(plazos).toEqual({ venceInactividad: 1_000_000 + 300_000, venceVidaMaxima: 1_000_000 + 1_794_000 });
  });
});

describe('evaluarReloj', () => {
  test('F004_CL06_EvaluarReloj_LejosDeLosLimites_EsNormalYDiceCuandoCambia', () => {
    const plazos: PlazosLocales = { venceInactividad: 5 * MINUTO, venceVidaMaxima: 30 * MINUTO };

    const estado = evaluarReloj(plazos, 0);

    // El siguiente cambio es el aviso: 60 s antes del cierre más cercano.
    expect(estado).toEqual({ tipo: 'normal', proximoCambioEn: 4 * MINUTO });
  });

  test('F004_CL06_EvaluarReloj_UnSegundoAntesDelAviso_SigueNormal', () => {
    const plazos: PlazosLocales = { venceInactividad: 5 * MINUTO, venceVidaMaxima: 30 * MINUTO };

    const estado = evaluarReloj(plazos, 4 * MINUTO - 1);

    expect(estado.tipo).toBe('normal');
  });

  test('F004_CL06_EvaluarReloj_ExactamenteSesentaSegundosAntes_AvisaDeInactividad', () => {
    const plazos: PlazosLocales = { venceInactividad: 5 * MINUTO, venceVidaMaxima: 30 * MINUTO };

    const estado = evaluarReloj(plazos, 4 * MINUTO);

    expect(estado).toEqual({ tipo: 'aviso-inactividad', cierraEn: 5 * MINUTO });
  });

  test('F004_CL06_EvaluarReloj_EnElInstanteDelLimite_YaVencioPorInactividad', () => {
    const plazos: PlazosLocales = { venceInactividad: 5 * MINUTO, venceVidaMaxima: 30 * MINUTO };

    const estado = evaluarReloj(plazos, 5 * MINUTO);

    expect(estado).toEqual({ tipo: 'vencida', motivo: 'inactividad' });
  });

  test('F004_CA09_EvaluarReloj_AvisoDeVidaMaximaSinAlargar', () => {
    // Cliente activo sin parar: la inactividad siempre está lejos, la vida máxima vence a los 30 min.
    const plazos: PlazosLocales = { venceInactividad: 33 * MINUTO, venceVidaMaxima: 30 * MINUTO };

    const estado = evaluarReloj(plazos, 29 * MINUTO);

    expect(estado).toEqual({ tipo: 'aviso-vida-maxima', cierraEn: 30 * MINUTO });
  });

  test('F004_CA09_EvaluarReloj_ALosTreintaMinutos_VenceLaVidaMaxima', () => {
    const plazos: PlazosLocales = { venceInactividad: 33 * MINUTO, venceVidaMaxima: 30 * MINUTO };

    const estado = evaluarReloj(plazos, 30 * MINUTO);

    expect(estado).toEqual({ tipo: 'vencida', motivo: 'vida-maxima' });
  });

  test('F004_CA09_EvaluarReloj_VencenALaVez_GanaLaVidaMaxima', () => {
    const plazos: PlazosLocales = { venceInactividad: 30 * MINUTO, venceVidaMaxima: 30 * MINUTO };

    const aviso = evaluarReloj(plazos, 29 * MINUTO);
    const vencida = evaluarReloj(plazos, 30 * MINUTO);

    expect(aviso).toEqual({ tipo: 'aviso-vida-maxima', cierraEn: 30 * MINUTO });
    expect(vencida).toEqual({ tipo: 'vencida', motivo: 'vida-maxima' });
  });

  test('F004_CL07_EvaluarReloj_LaVidaMaximaVenceAntesQueLaInactividad_ElAvisoEsDeVidaMaxima', () => {
    const plazos: PlazosLocales = { venceInactividad: 5 * MINUTO, venceVidaMaxima: 2 * MINUTO };

    const estado = evaluarReloj(plazos, 1 * MINUTO);

    expect(estado).toEqual({ tipo: 'aviso-vida-maxima', cierraEn: 2 * MINUTO });
  });

  test('F004_CL06_EvaluarReloj_LaInactividadVenceAntesQueLaVidaMaxima_ElAvisoEsDeInactividad', () => {
    const plazos: PlazosLocales = { venceInactividad: 2 * MINUTO, venceVidaMaxima: 5 * MINUTO };

    const estado = evaluarReloj(plazos, 1 * MINUTO);

    expect(estado).toEqual({ tipo: 'aviso-inactividad', cierraEn: 2 * MINUTO });
  });

  test('F004_CL06_EvaluarReloj_ElProximoCambioEsElAvisoMasCercano', () => {
    // La vida máxima da su aviso antes (a los 2 min) que la inactividad (a los 4 min).
    const plazos: PlazosLocales = { venceInactividad: 5 * MINUTO, venceVidaMaxima: 3 * MINUTO };

    const estado = evaluarReloj(plazos, 0);

    expect(estado).toEqual({ tipo: 'normal', proximoCambioEn: 2 * MINUTO });
  });
});
