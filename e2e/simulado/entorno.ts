import { expect, test as base, type BrowserContext, type Locator, type Page, type Route } from '@playwright/test';

/**
 * El BFF y la API simulados del proyecto "simulado" (plan, sección 7). Se instalan con context.route, así que valen para
 * todas las pestañas del contexto (CA-11). El tiempo sale del reloj de Playwright: cada respuesta lee Date.now() de la
 * propia página, y por eso context.clock.runFor(...) adelanta también "lo que sabe el servidor".
 */

export type Area = 'clientes' | 'empleados';

export interface CuentaSimulada {
  id: string;
  numero: string;
  clienteId: string;
  moneda: string;
  estado: string;
  saldo: { monto: string; moneda: string };
  fechaApertura: string;
  fechaCierre: string | null;
}

export function crearCuenta(cambios: Partial<CuentaSimulada> = {}): CuentaSimulada {
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

type Vencimiento = 'sesion-vencida-por-inactividad' | 'sesion-vencida-por-vida-maxima';

const HORA_INICIAL = new Date('2026-01-15T10:00:00-05:00');

export class BffSimulado {
  constructor(horaInicial: Date) {
    this.referencia = { navegador: horaInicial.getTime(), real: Date.now() };
  }

  area: Area = 'clientes';
  usuario = 'cc1234567';
  rol: 'Cliente' | 'Operador' | null = 'Cliente';
  inactividadS = 300;
  vidaMaximaS = 1800;
  cuentas: CuentaSimulada[] = [crearCuenta()];
  /** Si no es null, /api/mis-cuentas responde con ese estado HTTP en vez de las cuentas. */
  estadoDeLasCuentas: number | null = null;
  /** Si es true, /api/mis-cuentas no responde nunca (para ver el indicador de carga). */
  cuentasSinRespuesta = false;

  latidos = 0;
  salidas = 0;
  consultasDeCuentas = 0;
  /** Las navegaciones completas al BFF que hizo la SPA (inicio de sesión, cambio de clave). */
  navegacionesAlBff: string[] = [];

  private abierta = true;
  private inicio: number | null = null;
  private ultimaActividad: number | null = null;

  sinSesion() {
    this.abierta = false;
  }

  sesionDeOperador() {
    this.area = 'empleados';
    this.usuario = 'operadora.maria';
    this.rol = 'Operador';
    this.inactividadS = 900;
    this.vidaMaximaS = 32_400;
  }

  async instalar(contexto: BrowserContext) {
    await contexto.route('**/bff/sesion', async (ruta) => {
      await this.responderSesion(ruta, false);
    });
    await contexto.route('**/bff/actividad', async (ruta) => {
      await this.responderSesion(ruta, true);
    });
    await contexto.route('**/bff/salir', async (ruta) => {
      this.salidas++;
      this.abierta = false;
      await ruta.fulfill({ status: 204 });
    });
    await contexto.route(/\/bff\/(iniciar-sesion|cambiar-clave)/, async (ruta) => {
      this.navegacionesAlBff.push(new URL(ruta.request().url()).pathname);
      await ruta.fulfill({ contentType: 'text/html', body: '<h1>Keycloak simulado</h1>' });
    });
    await contexto.route('**/api/**', async (ruta) => {
      await this.responderApi(ruta);
    });
  }

  /** Última lectura conocida del reloj del navegador; al principio, el instante en que se instaló el reloj. */
  private referencia: { navegador: number; real: number };

  /**
   * La hora del navegador (reloj de Playwright). Si el frame que pidió ya no existe (una navegación lo destruyó), se
   * estima con la última lectura más el tiempo real transcurrido, que es como fluye el reloj entre runFor.
   */
  private async ahora(ruta: Route): Promise<number> {
    try {
      const navegador = await ruta
        .request()
        .frame()
        .evaluate(() => Date.now());
      this.referencia = { navegador, real: Date.now() };
      return navegador;
    } catch {
      return this.referencia.navegador + (Date.now() - this.referencia.real);
    }
  }

  /** La política del BFF (RN-22, RN-25): la inactividad solo la mueve el latido; manda la vida máxima. */
  private evaluar(ahora: number): { vigente: true } | { vigente: false; codigo: string } {
    if (!this.abierta) return { vigente: false, codigo: 'sin-sesion' };
    this.inicio ??= ahora;
    this.ultimaActividad ??= ahora;
    const vencimiento = this.vencimiento(ahora);
    if (vencimiento !== null) {
      this.abierta = false;
      return { vigente: false, codigo: vencimiento };
    }
    return { vigente: true };
  }

  private vencimiento(ahora: number): Vencimiento | null {
    if (this.inicio === null || this.ultimaActividad === null) return null;
    if (ahora - this.inicio >= this.vidaMaximaS * 1000) return 'sesion-vencida-por-vida-maxima';
    if (ahora - this.ultimaActividad >= this.inactividadS * 1000) return 'sesion-vencida-por-inactividad';
    return null;
  }

  private sesionDto(ahora: number) {
    return {
      area: this.area,
      usuario: this.usuario,
      rol: this.rol,
      segundosHastaInactividad: Math.floor(
        (this.inactividadS * 1000 - (ahora - (this.ultimaActividad ?? ahora))) / 1000,
      ),
      segundosHastaVidaMaxima: Math.floor((this.vidaMaximaS * 1000 - (ahora - (this.inicio ?? ahora))) / 1000),
    };
  }

  private async responderSesion(ruta: Route, esLatido: boolean) {
    const ahora = await this.ahora(ruta);
    const estado = this.evaluar(ahora);
    if (!estado.vigente) {
      await ruta.fulfill(problema(401, estado.codigo));
      return;
    }
    if (esLatido) {
      this.latidos++;
      this.ultimaActividad = ahora;
    }
    await ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(this.sesionDto(ahora)) });
  }

  private async responderApi(ruta: Route) {
    const ahora = await this.ahora(ruta);
    const estado = this.evaluar(ahora);
    if (!estado.vigente) {
      await ruta.fulfill(problema(401, estado.codigo));
      return;
    }
    const url = new URL(ruta.request().url());
    if (url.pathname === '/api/mis-cuentas') {
      this.consultasDeCuentas++;
      if (this.cuentasSinRespuesta) return; // nunca responde: la pantalla se queda cargando
      if (this.estadoDeLasCuentas !== null) {
        await ruta.fulfill(problema(this.estadoDeLasCuentas, 'error-inesperado'));
        return;
      }
      await ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(this.cuentas) });
      return;
    }
    const detalle = /^\/api\/mis-cuentas\/([^/]+)$/.exec(url.pathname);
    if (detalle !== null) {
      const cuenta = this.cuentas.find((c) => c.id === detalle[1]);
      await ruta.fulfill(
        cuenta === undefined
          ? problema(404, 'no-encontrado')
          : { status: 200, contentType: 'application/json', body: JSON.stringify(cuenta) },
      );
      return;
    }
    await ruta.fulfill(problema(404, 'no-encontrado'));
  }
}

function problema(estado: number, codigo: string) {
  return {
    status: estado,
    contentType: 'application/problem+json',
    body: JSON.stringify({ title: 'Error simulado', status: estado, codigo, traceId: '00-simulado-0001' }),
  };
}

export const test = base.extend<{ bff: BffSimulado }>({
  // El reloj se instala antes de abrir ninguna página: el tiempo fluye solo, y runFor lo adelanta.
  bff: [
    async ({ context }, usar) => {
      await context.clock.install({ time: HORA_INICIAL });
      const bff = new BffSimulado(HORA_INICIAL);
      await bff.instalar(context);
      await usar(bff);
    },
    { auto: true },
  ],
});

export { expect };

// ── Ayudas de las pruebas ─────────────────────────────────────────────────────────────────────────────────────────

/** Un clic en una esquina de la página: una interacción deliberada (RN-25) que no toca ningún control. */
export async function interactuar(pagina: Page) {
  await pagina.mouse.click(2, 2);
}

/**
 * Adelanta el reloj durante `totalMs`, con una interacción cada `pasoMs` (menos que el aviso de inactividad), para
 * simular a alguien activo sin parar. Lo que sobre del último paso se adelanta sin interacción.
 */
export async function mantenerActividad(pagina: Page, contexto: BrowserContext, totalMs: number, pasoMs = 200_000) {
  const pasos = Math.floor(totalMs / pasoMs);
  for (let paso = 0; paso < pasos; paso++) {
    await contexto.clock.runFor(pasoMs);
    // El latido es asíncrono: se espera a que el servidor simulado lo registre antes de seguir adelantando el reloj.
    await Promise.all([pagina.waitForResponse('**/bff/actividad'), interactuar(pagina)]);
  }
  await contexto.clock.runFor(totalMs - pasos * pasoMs);
}

/** El BroadcastChannel entrega los mensajes entre pestañas de forma asíncrona: se da un respiro real. */
export async function esperarALasOtrasPestanas(pagina: Page) {
  await pagina.waitForTimeout(300);
}

/** Pulsa Tab hasta que el foco llega al control (máximo 25 veces): el recorrido solo con teclado. */
export async function tabularHasta(pagina: Page, control: Locator, maximo = 25) {
  for (let i = 0; i < maximo; i++) {
    if (await control.evaluate((el) => el === document.activeElement)) return;
    await pagina.keyboard.press('Tab');
  }
  await expect(control).toBeFocused();
}
