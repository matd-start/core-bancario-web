import { useEffect, useState, type JSX } from 'react';
import { Boton } from '../comun/componentes/Boton';
import { Dialogo } from '../comun/componentes/Dialogo';
import { useSesion } from './contextoDeSesion';

function segundosHasta(instante: number): number {
  return Math.max(0, Math.ceil((instante - Date.now()) / 1000));
}

/** Cuenta atrás en pantalla. Solo corre mientras el aviso está abierto. */
function useSegundosRestantes(cierraEn: number): number {
  const [segundos, setSegundos] = useState(() => segundosHasta(cierraEn));
  useEffect(() => {
    const id = window.setInterval(() => {
      setSegundos(segundosHasta(cierraEn));
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [cierraEn]);
  return segundos;
}

function Aviso({ cierraEn, sePuedeAlargar }: { cierraEn: number; sePuedeAlargar: boolean }): JSX.Element {
  const { cerrarSesion, seguirConectado } = useSesion();
  const segundos = useSegundosRestantes(cierraEn);
  return (
    <Dialogo
      rol="alertdialog"
      titulo={sePuedeAlargar ? 'Tu sesión está por cerrarse' : 'Tu sesión está por terminar'}
      acciones={
        <>
          {sePuedeAlargar && (
            <Boton
              autoFocus
              onClick={() => {
                void seguirConectado();
              }}
            >
              Seguir conectado
            </Boton>
          )}
          <Boton
            variante="secundario"
            autoFocus={!sePuedeAlargar}
            onClick={() => {
              void cerrarSesion();
            }}
          >
            Cerrar sesión
          </Boton>
        </>
      }
    >
      <p>
        {sePuedeAlargar
          ? `Por inactividad, se cerrará en ${String(segundos)} segundos.`
          : `Por seguridad, la sesión termina en ${String(segundos)} segundos y no se puede alargar.`}
      </p>
      <p>
        {sePuedeAlargar
          ? 'Pulsa "Seguir conectado" para continuar.'
          : 'Guarda lo que estés haciendo y vuelve a iniciar sesión.'}
      </p>
    </Dialogo>
  );
}

/** CL-06 y CL-07. Diálogo (role="alertdialog") con cuenta atrás; "Seguir conectado" solo en aviso-inactividad. Foco inicial en la primera acción. */
export function AvisoDeSesion(): JSX.Element | null {
  const { estado, reloj } = useSesion();
  if ((estado !== 'abierta' && estado !== 'sin-permiso') || reloj === null) return null;
  if (reloj.tipo === 'aviso-inactividad') return <Aviso cierraEn={reloj.cierraEn} sePuedeAlargar />;
  if (reloj.tipo === 'aviso-vida-maxima') return <Aviso cierraEn={reloj.cierraEn} sePuedeAlargar={false} />;
  return null;
}
