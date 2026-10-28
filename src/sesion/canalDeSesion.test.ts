import { afterEach, describe, expect, test, vi } from 'vitest';
import { crearSesion } from '../pruebas/datos';
import { crearCanalDeSesion, type CanalDeSesion, type MensajeDeSesion } from './canalDeSesion';

const abiertos: { close(): void }[] = [];
const canales: CanalDeSesion[] = [];

afterEach(() => {
  canales.splice(0).forEach((c) => {
    c.cerrar();
  });
  abiertos.splice(0).forEach((c) => {
    c.close();
  });
});

function canal() {
  const nuevo = crearCanalDeSesion();
  canales.push(nuevo);
  return nuevo;
}

describe('crearCanalDeSesion', () => {
  test('F004_RNF07_PublicarEnUnaPestana_LaOtraLoRecibe', async () => {
    const pestanaA = canal();
    const pestanaB = canal();
    const recibidos: MensajeDeSesion[] = [];
    pestanaB.escuchar((m) => recibidos.push(m));
    const mensaje: MensajeDeSesion = { tipo: 'cerrada', motivo: 'usuario' };

    pestanaA.publicar(mensaje);

    await vi.waitFor(() => {
      expect(recibidos).toEqual([mensaje]);
    });
  });

  test('F004_CA11_MensajeDePlazos_LlegaConLaSesionYElInstanteDeRecepcion', async () => {
    const pestanaA = canal();
    const pestanaB = canal();
    const recibidos: MensajeDeSesion[] = [];
    pestanaB.escuchar((m) => recibidos.push(m));
    const mensaje: MensajeDeSesion = { tipo: 'plazos', sesion: crearSesion(), recibidoEn: 1_700_000_000_000 };

    pestanaA.publicar(mensaje);

    await vi.waitFor(() => {
      expect(recibidos).toEqual([mensaje]);
    });
  });

  test('F004_RNF07_QuienPublica_NoRecibeSuPropioMensaje', async () => {
    const pestanaA = canal();
    const pestanaB = canal();
    const propios: MensajeDeSesion[] = [];
    const ajenos: MensajeDeSesion[] = [];
    pestanaA.escuchar((m) => propios.push(m));
    pestanaB.escuchar((m) => ajenos.push(m));

    pestanaA.publicar({ tipo: 'cerrada', motivo: 'inactividad' });

    await vi.waitFor(() => {
      expect(ajenos).toHaveLength(1);
    });
    expect(propios).toHaveLength(0);
  });

  test('F004_RNF07_AlDejarDeEscuchar_YaNoRecibe', async () => {
    const pestanaA = canal();
    const pestanaB = canal();
    const pestanaC = canal();
    const recibidosPorB: MensajeDeSesion[] = [];
    const recibidosPorC: MensajeDeSesion[] = [];
    const dejarDeEscucharB = pestanaB.escuchar((m) => recibidosPorB.push(m));
    pestanaC.escuchar((m) => recibidosPorC.push(m));
    dejarDeEscucharB();

    pestanaA.publicar({ tipo: 'cerrada', motivo: 'usuario' });

    // C actúa de testigo: cuando C ya recibió, B habría recibido también.
    await vi.waitFor(() => {
      expect(recibidosPorC).toHaveLength(1);
    });
    expect(recibidosPorB).toHaveLength(0);
  });

  test('F004_RNF07_UsaElCanalCoreBancarioSesion', async () => {
    const recibidos: unknown[] = [];
    const externo = new BroadcastChannel('core-bancario-sesion');
    abiertos.push(externo);
    externo.onmessage = (e: MessageEvent) => recibidos.push(e.data);
    const pestana = canal();

    pestana.publicar({ tipo: 'cerrada', motivo: 'revocada' });

    await vi.waitFor(() => {
      expect(recibidos).toHaveLength(1);
    });
  });

  test('F004_RNF01_Canal_NoUsaLocalStorageNiSessionStorage', async () => {
    const escribirLocal = vi.spyOn(Storage.prototype, 'setItem');
    const pestanaA = canal();
    const pestanaB = canal();
    const recibidos: MensajeDeSesion[] = [];
    pestanaB.escuchar((m) => recibidos.push(m));

    pestanaA.publicar({ tipo: 'plazos', sesion: crearSesion(), recibidoEn: 1 });

    await vi.waitFor(() => {
      expect(recibidos).toHaveLength(1);
    });
    expect(escribirLocal).not.toHaveBeenCalled();
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
  });
});
