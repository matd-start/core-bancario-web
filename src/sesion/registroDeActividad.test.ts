import { describe, expect, test, vi } from 'vitest';
import { crearRegistroDeActividad, escucharInteraccionesDeliberadas, type Temporizador } from './registroDeActividad';

/** Reloj manual: el tiempo solo avanza cuando la prueba lo pide, y los temporizadores se disparan en orden. */
function crearTemporizadorFalso() {
  let ahora = 0;
  let siguienteId = 1;
  const programados = new Map<number, { cuando: number; fn: () => void }>();

  const temporizador: Temporizador = {
    ahora: () => ahora,
    programar: (fn, ms) => {
      const id = siguienteId++;
      programados.set(id, { cuando: ahora + ms, fn });
      return id;
    },
    cancelar: (id) => {
      programados.delete(id);
    },
  };

  function avanzar(ms: number) {
    const destino = ahora + ms;
    for (;;) {
      const proximo = [...programados.entries()]
        .filter(([, p]) => p.cuando <= destino)
        .sort(([, a], [, b]) => a.cuando - b.cuando)[0];
      if (proximo === undefined) break;
      const [id, tarea] = proximo;
      programados.delete(id);
      ahora = tarea.cuando;
      tarea.fn();
    }
    ahora = destino;
  }

  return { temporizador, avanzar };
}

describe('crearRegistroDeActividad', () => {
  test('F004_RN25_PrimeraInteraccion_EnviaElLatidoAlInstante', () => {
    const { temporizador } = crearTemporizadorFalso();
    const enviar = vi.fn(() => Promise.resolve());
    const registro = crearRegistroDeActividad(enviar, temporizador);

    registro.notificarInteraccion();

    expect(enviar).toHaveBeenCalledTimes(1);
  });

  test('F004_RN25_InteraccionesSeguidas_UnLatidoCada15Segundos', () => {
    const { temporizador, avanzar } = crearTemporizadorFalso();
    const enviar = vi.fn(() => Promise.resolve());
    const registro = crearRegistroDeActividad(enviar, temporizador);

    registro.notificarInteraccion(); // t = 0: envía
    avanzar(5_000);
    registro.notificarInteraccion(); // t = 5 s: queda pendiente
    avanzar(5_000);
    registro.notificarInteraccion(); // t = 10 s: sigue el mismo pendiente
    avanzar(4_999);

    expect(enviar).toHaveBeenCalledTimes(1); // t = 14,999 s

    avanzar(1);

    expect(enviar).toHaveBeenCalledTimes(2); // t = 15 s: sale el pendiente, uno solo
  });

  test('F004_RN25_VariasInteraccionesPendientes_SeFundenEnUnSoloLatido', () => {
    const { temporizador, avanzar } = crearTemporizadorFalso();
    const enviar = vi.fn(() => Promise.resolve());
    const registro = crearRegistroDeActividad(enviar, temporizador);

    registro.notificarInteraccion();
    registro.notificarInteraccion();
    registro.notificarInteraccion();
    registro.notificarInteraccion();
    avanzar(60_000);

    expect(enviar).toHaveBeenCalledTimes(2);
  });

  test('F004_RN25_InteraccionTrasQuinceSegundosDeCalma_EnviaAlInstante', () => {
    const { temporizador, avanzar } = crearTemporizadorFalso();
    const enviar = vi.fn(() => Promise.resolve());
    const registro = crearRegistroDeActividad(enviar, temporizador);
    registro.notificarInteraccion();

    avanzar(15_000);
    registro.notificarInteraccion();

    expect(enviar).toHaveBeenCalledTimes(2);
  });

  test('F004_RN25_Vaciar_EnviaElPendienteSinEsperar', async () => {
    const { temporizador, avanzar } = crearTemporizadorFalso();
    const enviar = vi.fn(() => Promise.resolve());
    const registro = crearRegistroDeActividad(enviar, temporizador);
    registro.notificarInteraccion();
    avanzar(2_000);
    registro.notificarInteraccion(); // pendiente

    await registro.vaciar();

    expect(enviar).toHaveBeenCalledTimes(2);
  });

  test('F004_RN25_VaciarSinPendiente_NoEnviaNada', async () => {
    const { temporizador } = crearTemporizadorFalso();
    const enviar = vi.fn(() => Promise.resolve());
    const registro = crearRegistroDeActividad(enviar, temporizador);

    await registro.vaciar();

    expect(enviar).not.toHaveBeenCalled();
  });

  test('F004_RN25_Detener_CancelaElLatidoPendiente', () => {
    const { temporizador, avanzar } = crearTemporizadorFalso();
    const enviar = vi.fn(() => Promise.resolve());
    const registro = crearRegistroDeActividad(enviar, temporizador);
    registro.notificarInteraccion();
    avanzar(1_000);
    registro.notificarInteraccion(); // pendiente

    registro.detener();
    avanzar(60_000);

    expect(enviar).toHaveBeenCalledTimes(1);
  });
});

describe('escucharInteraccionesDeliberadas', () => {
  test('F004_RN25_ClicTeclaYCambioDePantalla_Cuentan_ElClicCuenta', () => {
    const alInteractuar = vi.fn();
    const dejarDeEscuchar = escucharInteraccionesDeliberadas(document, alInteractuar);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(alInteractuar).toHaveBeenCalledTimes(1);
    dejarDeEscuchar();
  });

  test('F004_RN25_ClicTeclaYCambioDePantalla_Cuentan_LaTeclaCuenta', () => {
    const alInteractuar = vi.fn();
    const dejarDeEscuchar = escucharInteraccionesDeliberadas(document, alInteractuar);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    expect(alInteractuar).toHaveBeenCalledTimes(1);
    dejarDeEscuchar();
  });

  test.each(['mousemove', 'pointermove', 'wheel', 'scroll', 'mouseover', 'keyup'])(
    'F004_RN25_MoverElRatonYScroll_NoCuentan_%s',
    (tipo) => {
      const alInteractuar = vi.fn();
      const dejarDeEscuchar = escucharInteraccionesDeliberadas(document, alInteractuar);

      document.body.dispatchEvent(new Event(tipo, { bubbles: true }));

      expect(alInteractuar).not.toHaveBeenCalled();
      dejarDeEscuchar();
    },
  );

  test('F004_RN25_ElClicCuentaAunqueUnComponenteDetengaLaPropagacion', () => {
    const alInteractuar = vi.fn();
    const boton = document.createElement('button');
    boton.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    document.body.appendChild(boton);
    const dejarDeEscuchar = escucharInteraccionesDeliberadas(document, alInteractuar);

    boton.click();

    expect(alInteractuar).toHaveBeenCalledTimes(1);
    dejarDeEscuchar();
    boton.remove();
  });

  test('F004_RN25_AlDejarDeEscuchar_YaNoCuenta', () => {
    const alInteractuar = vi.fn();
    const dejarDeEscuchar = escucharInteraccionesDeliberadas(document, alInteractuar);

    dejarDeEscuchar();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(alInteractuar).not.toHaveBeenCalled();
  });
});
