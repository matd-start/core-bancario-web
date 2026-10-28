/**
 * Administración de Keycloak para los recorridos reales. Usa la cuenta de administración de `master` (las variables
 * KC_BOOTSTRAP_ADMIN_USERNAME y KC_BOOTSTRAP_ADMIN_PASSWORD del .env del compose) solo para preparar usuarios de prueba,
 * nunca para lo que se está probando.
 */

const URL_DE_KEYCLOAK = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '')
    throw new Error(`Falta la variable de entorno ${nombre} (la misma del .env del compose de core-bancario).`);
  return valor;
}

function comoObjeto(valor: unknown, queEra: string): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null) throw new Error(`Keycloak no devolvió un objeto para ${queEra}.`);
  return Object.fromEntries(Object.entries(valor));
}

function comoTexto(valor: unknown, queEra: string): string {
  if (typeof valor !== 'string' || valor === '') throw new Error(`Keycloak no devolvió ${queEra}.`);
  return valor;
}

async function tokenDeAdministrador(): Promise<string> {
  const respuesta = await fetch(`${URL_DE_KEYCLOAK}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: requerida('KC_BOOTSTRAP_ADMIN_USERNAME'),
      password: requerida('KC_BOOTSTRAP_ADMIN_PASSWORD'),
    }),
  });
  if (!respuesta.ok) throw new Error(`No se pudo entrar como administrador de Keycloak (${String(respuesta.status)}).`);
  const cuerpo: unknown = await respuesta.json();
  return comoTexto(comoObjeto(cuerpo, 'el token').access_token, 'el access_token del administrador');
}

async function administrar(metodo: 'GET' | 'POST' | 'DELETE', ruta: string, cuerpo?: unknown): Promise<Response> {
  const token = await tokenDeAdministrador();
  const respuesta = await fetch(`${URL_DE_KEYCLOAK}/admin/realms${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
  if (!respuesta.ok) throw new Error(`Keycloak respondió ${String(respuesta.status)} a ${metodo} ${ruta}.`);
  return respuesta;
}

export interface UsuarioDePrueba {
  sub: string;
  nombreDeUsuario: string;
  clave: string;
}

/**
 * Crea un operador en el realm `empleados` con el rol `operador`, clave definitiva y el segundo factor pendiente:
 * en su primer ingreso Keycloak le pide inscribir el OTP (RN-24).
 */
export async function crearOperador(nombreDeUsuario: string, clave: string): Promise<UsuarioDePrueba> {
  const creado = await administrar('POST', '/empleados/users', {
    username: nombreDeUsuario,
    enabled: true,
    requiredActions: ['CONFIGURE_TOTP'],
    credentials: [{ type: 'password', value: clave, temporary: false }],
  });
  const sub = comoTexto(creado.headers.get('Location')?.split('/').at(-1), 'el sub del operador');
  const rol = await administrar('GET', '/empleados/roles/operador');
  await administrar('POST', `/empleados/users/${sub}/role-mappings/realm`, [await rol.json()]);
  return { sub, nombreDeUsuario, clave };
}

export async function eliminarUsuario(realm: 'clientes' | 'empleados', sub: string): Promise<void> {
  await administrar('DELETE', `/${realm}/users/${sub}`);
}

/** Espera a que Keycloak publique el descubrimiento de los dos realms (el compose tarda en arrancar). */
export async function esperarALosRealms(limiteEnMilisegundos = 120_000): Promise<void> {
  const limite = Date.now() + limiteEnMilisegundos;
  for (const realm of ['clientes', 'empleados']) {
    for (;;) {
      const respuesta = await fetch(`${URL_DE_KEYCLOAK}/realms/${realm}/.well-known/openid-configuration`).catch(
        () => null,
      );
      if (respuesta?.ok === true) break;
      if (Date.now() > limite) throw new Error(`El realm ${realm} no respondió a tiempo.`);
      await new Promise<void>((resolver) => setTimeout(resolver, 2000));
    }
  }
}
