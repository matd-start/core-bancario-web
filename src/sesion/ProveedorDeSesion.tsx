import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { crearClienteDeLaApi, crearClienteDelBff } from '../api/clientes';
import type { Aviso } from './avisos';
import { AvisoDeSesion } from './AvisoDeSesion';
import type { MotivoDeCierre } from './canalDeSesion';
import {
  ContextoDeLaApi,
  ContextoDeSesion,
  type AreaDeLaApp,
  type EstadoDeSesionEnLaApp,
  type Sesion,
} from './contextoDeSesion';
import { crearCoordinadorDeSesion } from './coordinadorDeSesion';
import {
  crearRegistroDeActividad,
  escucharInteraccionesDeliberadas,
  type RegistroDeActividad,
} from './registroDeActividad';
import { aPlazosLocales, evaluarReloj, type EstadoDelReloj, type SesionDto } from './relojDeSesion';

// useSesion vive en contextoDeSesion.ts: react-refresh exige que un archivo de componentes exporte solo componentes.
export type { AreaDeLaApp, EstadoDeSesionEnLaApp, Sesion } from './contextoDeSesion';

/** Lo que la SPA sabe de la sesión. `ahora` lo mueve el único setTimeout del reloj; el resto lo fija cada respuesta del BFF. */
type Carga =
  | { tipo: 'cargando' }
  | { tipo: 'sin-sesion' }
  | { tipo: 'con-sesion'; sesion: SesionDto; recibidoEn: number; ahora: number };

const INICIO_DEL_AREA: Record<AreaDeLaApp, string> = { clientes: '/', empleados: '/backoffice' };

const AVISO_POR_MOTIVO: Record<MotivoDeCierre, Aviso> = {
  usuario: 'sesion-cerrada',
  inactividad: 'inactividad',
  'vida-maxima': 'vida-maxima',
  revocada: 'revocada',
};

function urlParaIniciarSesion(area: AreaDeLaApp, regreso?: string): string {
  const base = `/bff/iniciar-sesion/${area}`;
  return regreso === undefined ? base : `${base}?regreso=${encodeURIComponent(regreso)}`;
}

/**
 * Al montar: GET /bff/sesion. Engancha escucharInteraccionesDeliberadas + crearRegistroDeActividad, el canal de
 * sesión, un único setTimeout al siguiente cambio del reloj y 'pageshow' con persisted (bfcache, CL-11) → vuelve a
 * consultar. Al vencer: cerrarSesion('inactividad' | 'vida-maxima'). Cualquier 401 de /api o /bff termina la sesión
 * con su motivo.
 */
export function ProveedorDeSesion({ area, children }: { area: AreaDeLaApp; children: ReactNode }): JSX.Element {
  const clienteDeConsultas = useQueryClient();
  const { pathname } = useLocation();
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' });
  const [prohibido, setProhibido] = useState(false);
  const [coordinador] = useState(crearCoordinadorDeSesion);
  const registro = useRef<RegistroDeActividad | null>(null);
  const rutaAnterior = useRef(pathname);

  /** Vacía la caché antes de salir (CL-11): ningún saldo queda en memoria si alguien pulsa "atrás". */
  const irAlInicio = useCallback(
    (motivo: MotivoDeCierre, avisarALasOtrasPestanas: boolean) => {
      clienteDeConsultas.clear();
      if (avisarALasOtrasPestanas) coordinador.publicar({ tipo: 'cerrada', motivo });
      window.location.replace(`${INICIO_DEL_AREA[area]}?aviso=${AVISO_POR_MOTIVO[motivo]}`);
    },
    [area, clienteDeConsultas, coordinador],
  );

  /** Un 401: el BFF ya cerró la sesión, así que no hace falta pedirle que la cierre. */
  const alTerminarSesion = useCallback(
    (motivo: MotivoDeCierre) => {
      if (coordinador.iniciarCierre()) irAlInicio(motivo, true);
    },
    [coordinador, irAlInicio],
  );

  const clientes = useMemo(
    () => ({
      api: crearClienteDeLaApi(alTerminarSesion, () => {
        setProhibido(true);
      }),
      bff: crearClienteDelBff(alTerminarSesion),
      // Para consultar la sesión y salir: un 401 aquí es una respuesta esperada, no un cierre inesperado.
      bffSilencioso: crearClienteDelBff(() => undefined),
    }),
    [alTerminarSesion],
  );

  const aplicarSesion = useCallback(
    (sesion: SesionDto) => {
      const recibidoEn = Date.now();
      setCarga({ tipo: 'con-sesion', sesion, recibidoEn, ahora: recibidoEn });
      coordinador.publicar({ tipo: 'plazos', sesion, recibidoEn });
    },
    [coordinador],
  );

  /** null si no hay sesión: un 401, otro error o ni siquiera red. En los tres casos no hay nada que mostrar. */
  const consultarSesion = useCallback(async (): Promise<SesionDto | null> => {
    try {
      const { data } = await clientes.bffSilencioso.GET('/bff/sesion');
      return data ?? null;
    } catch {
      return null;
    }
  }, [clientes]);

  const alConsultarSesion = useCallback(
    (sesion: SesionDto | null) => {
      if (sesion !== null) {
        aplicarSesion(sesion);
      } else {
        clienteDeConsultas.clear();
        setCarga({ tipo: 'sin-sesion' });
      }
    },
    [aplicarSesion, clienteDeConsultas],
  );

  const seguirConectado = useCallback(async () => {
    try {
      const { data } = await clientes.bff.POST('/bff/actividad');
      if (data !== undefined) aplicarSesion(data);
    } catch {
      // Sin red: el aviso sigue en pantalla y el reloj cierra a su hora.
    }
  }, [clientes, aplicarSesion]);

  const salirDelBff = useCallback(async () => {
    try {
      await clientes.bffSilencioso.POST('/bff/salir');
    } catch {
      // Si el BFF no responde, la persona igual sale de la pantalla; la sesión caduca sola en el servidor.
    }
  }, [clientes]);

  const cerrarSesion = useCallback(
    async (motivo: MotivoDeCierre = 'usuario') => {
      if (!coordinador.iniciarCierre()) return;
      await salirDelBff();
      irAlInicio(motivo, true);
    },
    [coordinador, salirDelBff, irAlInicio],
  );

  const iniciarSesion = useCallback(
    (regreso?: string) => {
      window.location.assign(urlParaIniciarSesion(area, regreso));
    },
    [area],
  );

  const cerrarYContinuar = useCallback(
    async (regreso?: string) => {
      if (!coordinador.iniciarCierre()) return;
      await salirDelBff();
      clienteDeConsultas.clear();
      coordinador.publicar({ tipo: 'cerrada', motivo: 'usuario' });
      window.location.assign(urlParaIniciarSesion(area, regreso));
    },
    [area, coordinador, salirDelBff, clienteDeConsultas],
  );

  // ── Derivados ────────────────────────────────────────────────────────────────────────────────────────────────

  const sesionDeEstaArea = carga.tipo === 'con-sesion' && carga.sesion.area === area ? carga : null;

  const reloj = useMemo<EstadoDelReloj | null>(
    () =>
      sesionDeEstaArea === null
        ? null
        : evaluarReloj(aPlazosLocales(sesionDeEstaArea.sesion, sesionDeEstaArea.recibidoEn), sesionDeEstaArea.ahora),
    [sesionDeEstaArea],
  );

  let estado: EstadoDeSesionEnLaApp;
  if (carga.tipo === 'cargando') estado = 'cargando';
  else if (carga.tipo === 'sin-sesion') estado = 'sin-sesion';
  else if (sesionDeEstaArea === null) estado = 'otra-area';
  else estado = carga.sesion.rol === null || prohibido ? 'sin-permiso' : 'abierta';

  // ── Efectos: sincronizan con el navegador (red, eventos, temporizadores) ─────────────────────────────────────────

  useEffect(() => {
    void consultarSesion().then(alConsultarSesion);
  }, [consultarSesion, alConsultarSesion]);

  useEffect(
    () =>
      coordinador.conectar((mensaje) => {
        if (mensaje.tipo === 'plazos') {
          setCarga({ tipo: 'con-sesion', sesion: mensaje.sesion, recibidoEn: mensaje.recibidoEn, ahora: Date.now() });
        } else if (coordinador.iniciarCierre()) {
          irAlInicio(mensaje.motivo, false);
        }
      }),
    [coordinador, irAlInicio],
  );

  useEffect(() => {
    const alVolver = (evento: PageTransitionEvent) => {
      if (evento.persisted) void consultarSesion().then(alConsultarSesion);
    };
    window.addEventListener('pageshow', alVolver);
    return () => {
      window.removeEventListener('pageshow', alVolver);
    };
  }, [consultarSesion, alConsultarSesion]);

  // Un solo setTimeout: espera al siguiente cambio del reloj (aviso o cierre) y entonces vuelve a evaluar.
  useEffect(() => {
    if (reloj === null) return;
    if (reloj.tipo === 'vencida') {
      void cerrarSesion(reloj.motivo);
      return;
    }
    const cambioEn = reloj.tipo === 'normal' ? reloj.proximoCambioEn : reloj.cierraEn;
    const id = window.setTimeout(
      () => {
        setCarga((actual) => (actual.tipo === 'con-sesion' ? { ...actual, ahora: Date.now() } : actual));
      },
      Math.max(0, cambioEn - Date.now()),
    );
    return () => {
      window.clearTimeout(id);
    };
  }, [reloj, cerrarSesion]);

  // RN-25: solo los clics, las teclas y los cambios de pantalla de alguien con la sesión abierta mueven la actividad.
  // Con el aviso en pantalla se deja de escuchar: mover el foco con Tab no es decir "sigo aquí". Lo dice el botón
  // "Seguir conectado" (CL-06), que envía su propio latido.
  const escuchandoActividad = estado === 'abierta' && (reloj === null || reloj.tipo === 'normal');
  useEffect(() => {
    if (!escuchandoActividad) return;
    const nuevo = crearRegistroDeActividad(seguirConectado);
    registro.current = nuevo;
    const dejarDeEscuchar = escucharInteraccionesDeliberadas(document, () => {
      nuevo.notificarInteraccion();
    });
    return () => {
      dejarDeEscuchar();
      nuevo.detener();
      registro.current = null;
    };
  }, [escuchandoActividad, seguirConectado]);

  useEffect(() => {
    if (rutaAnterior.current === pathname) return;
    rutaAnterior.current = pathname;
    registro.current?.notificarInteraccion();
  }, [pathname]);

  const sesion = useMemo<Sesion>(
    () => ({
      area,
      estado,
      datos: carga.tipo === 'con-sesion' ? carga.sesion : null,
      reloj,
      cerrarSesion,
      cerrarYContinuar,
      seguirConectado,
      iniciarSesion,
    }),
    [area, estado, carga, reloj, cerrarSesion, cerrarYContinuar, seguirConectado, iniciarSesion],
  );

  return (
    <ContextoDeLaApi value={clientes.api}>
      <ContextoDeSesion value={sesion}>
        {children}
        <AvisoDeSesion />
      </ContextoDeSesion>
    </ContextoDeLaApi>
  );
}
