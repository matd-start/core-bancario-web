// SDD: esqueleto creado por test-writer
/* eslint-disable @typescript-eslint/no-unused-vars -- esqueleto: los parámetros se usan al implementarlo */
import type { Client, Middleware } from 'openapi-fetch';
import type { paths } from './generado/api';
import type { paths as pathsDelBff } from './generado/bff';
import type { MotivoDeCierre } from '../sesion/canalDeSesion';

/** openapi-fetch con baseUrl "/api". */
export function crearClienteDeLaApi(_alTerminarSesion: (motivo: MotivoDeCierre) => void): Client<paths> {
  throw new Error('SDD: no implementado');
}

/** openapi-fetch con baseUrl "". */
export function crearClienteDelBff(_alTerminarSesion: (motivo: MotivoDeCierre) => void): Client<pathsDelBff> {
  throw new Error('SDD: no implementado');
}

/** Pone "X-CSRF: 1" y credentials "same-origin"; un 401 llama a alTerminarSesion con el motivo de su codigo. */
export function crearMiddlewareDeSesion(_alTerminarSesion: (motivo: MotivoDeCierre) => void): Middleware {
  throw new Error('SDD: no implementado');
}
