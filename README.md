# Core Bancario — Web

Aplicación web (SPA) de [Core Bancario](https://github.com/matd-start/core-bancario): la banca del cliente (`/`) y el backoffice del operador (`/backoffice`).

La spec, el plan y las decisiones de arquitectura viven en el repositorio `core-bancario` ([ADR-0005](https://github.com/matd-start/core-bancario/blob/main/docs/adr/0005-repositorios-separados-backend-y-frontend.md)). Este repositorio contiene el código del frontend y la bitácora de su construcción. La spec de esta funcionalidad es [004-front-base](https://github.com/matd-start/core-bancario/tree/main/specs/004-front-base) y la forma de construir el frontend, [ADR-0022](https://github.com/matd-start/core-bancario/blob/main/docs/adr/0022-construccion-del-frontend.md).

## Cómo funciona

El navegador habla con **un solo origen** (`http://localhost:5173`): la SPA, `/bff/*` y `/api/*`. Detrás está el BFF de `core-bancario`, que guarda la sesión y los tokens en el servidor. **La SPA nunca tiene un token** (ADR-0020): la cookie de sesión es `HttpOnly` y no guarda nada en `localStorage` ni en `sessionStorage`. Cada petición lleva `X-CSRF: 1`.

## Levantar todo con un comando

Requisito: `core-bancario` clonado **al lado** de este repositorio (o la variable `CORE_BANCARIO_WEB_DIR` en el `.env` de `core-bancario`). Desde `core-bancario`:

```bash
docker compose --profile app --profile web up -d --build --wait
# http://localhost:5173
```

El perfil `web` construye la imagen de este repositorio (`Dockerfile`): Node compila la SPA y nginx la sirve con la CSP y reenvía `/bff/` y `/api/` al BFF. Los secretos y los user-secrets están explicados en el README de `core-bancario`, sección "Aplicación web y BFF".

## Desarrollo

```bash
npm ci
npm run dev   # Vite en http://localhost:5173
```

`npm run dev` reenvía `/bff` y `/api` al BFF en `http://localhost:5180` (sin `changeOrigin`, para que el BFF vea `Host: localhost:5173`). Antes hay que tener el BFF y Keycloak funcionando (ver el README de `core-bancario`).

**Por qué en `dev` no hay CSP.** La recarga en caliente de Vite usa scripts en línea, que la CSP prohíbe. La CSP la aplica nginx y se comprueba en los recorridos reales (`F004_RNF03_*`), que corren contra la imagen de nginx.

## Comandos

| Comando                                 | Qué hace                                                                |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `npm run lint` / `npm run format:check` | ESLint (typescript-eslint estricto) y Prettier                          |
| `npm run typecheck`                     | TypeScript en modo estricto                                             |
| `npm test`                              | Vitest + Testing Library + MSW                                          |
| `npm run build`                         | Compila a `dist/`                                                       |
| `npm run e2e:simulado`                  | Playwright en Chromium con `/bff` y `/api` simulados (no necesita nada) |
| `npm run e2e:real`                      | Playwright contra el compose completo (necesita las variables de abajo) |
| `npm run contratos:sincronizar`         | Copia los OpenAPI de `core-bancario` a `contratos/`                     |
| `npm run tipos`                         | Genera `src/api/generado/*.d.ts` desde `contratos/`                     |

### Recorridos reales

Con el compose completo levantado, define las credenciales de administración de Keycloak (las mismas del `.env` de `core-bancario`) para que los recorridos preparen usuarios:

```bash
export KC_BOOTSTRAP_ADMIN_USERNAME=... KC_BOOTSTRAP_ADMIN_PASSWORD=...
npm run e2e:real
```

### Contratos y tipos

Los contratos OpenAPI de la API y del BFF se copian a `contratos/` y los tipos de `src/api/generado/` se generan a partir de ellos; ambos se versionan y **nunca se editan a mano**. Un cambio de contrato va primero en `core-bancario` (ADR-0005). Para traerlo:

```bash
npm run contratos:sincronizar   # CORE_BANCARIO_DIR cambia el origen (por defecto ../core-bancario)
npm run tipos
```

El CI repite los dos comandos y falla si queda algún cambio (`git diff --exit-code`).

## Pantallas del backoffice (004b)

El operador entra por `/backoffice` y lo usa desde 1280 px. Las rutas son `/backoffice` (búsqueda) y `/backoffice/clientes/:clienteId` (ficha); cualquier otra ruta bajo `/backoffice` vuelve a la búsqueda.

| Pantalla                                  | Qué permite                                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buscar cliente (`BuscarCliente`)          | Buscar por tipo (CC, CE, PA) y número de documento, con o sin puntos. Si no existe, ofrece "Registrarlo" con el formulario de registro (React Hook Form + Zod avisan en el navegador; la API sigue decidiendo).      |
| Ficha (`FichaDeCliente`)                  | Datos del cliente y sus cuentas con el saldo exacto. Abrir una cuenta en COP o USD; bloquear, desbloquear y cerrar (con confirmación) solo cuando el estado lo permite (RN-14).                                      |
| Acceso digital (`AccesoDigital`)          | Estado ("Sin habilitar", "Habilitado", "Deshabilitado"), "primer ingreso pendiente" y las acciones Habilitar, Restablecer y Deshabilitar con su confirmación. Si identidad no responde, dice que no está disponible. |
| Clave temporal (`DialogoDeClaveTemporal`) | Se muestra una sola vez en un diálogo que no se cierra con Esc ni con un clic fuera. Con "Ya la entregué" desaparece de la pantalla y de la caché de consultas.                                                      |

**El número de documento nunca va en la URL ni en el almacenamiento.** Vive solo en el estado de `BuscarCliente`; al encontrar al cliente se navega por su id. La búsqueda llega al BFF por `GET` con el documento en la consulta, así que nginx no la escribe en el `access_log` (`log_format sin_consulta`) y `/api/clientes/por-documento` tiene su propia `location` con el `error_log` en nivel `crit`: un fallo del BFF no deja la consulta en el log (RNF-04).

**Límite conocido (CL-15).** `Boton enCurso` y las mutaciones sin reintentos (`retry: 0`) evitan el doble clic, pero no el doble envío entre dos pestañas ni el reintento de red del navegador: ambos pueden abrir dos cuentas. Lo cierra la idempotencia de las especificaciones S4 y S5 del backend.

## Navegadores soportados (RNF-10)

Las dos últimas versiones de Chrome, Edge, Firefox y Safari. La SPA usa `BroadcastChannel`, `Intl.NumberFormat` v3 y `:focus-visible`; el CI prueba en Chromium.

## Verificación manual con las herramientas del navegador

Con una sesión abierta, en la consola: `document.cookie` no debe mostrar la cookie de sesión ni ningún token, `localStorage` y `sessionStorage` deben estar vacíos y ninguna respuesta de la pestaña Red debe contener un `eyJ…` (JWT).
