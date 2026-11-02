# Avance — 004 Front base (bloque 004a, PR 2: `core-bancario-web`)

- [x] T12 — Contratos y tipos
- [x] T13 — Clientes HTTP y errores
- [x] T14 — Comunes
- [x] T15 — Reloj, actividad y pestañas (puros)
- [x] T16 — Sesión en la interfaz
- [x] T17 — Área del cliente e inicio del backoffice
- [x] T18 — Imagen web con CSP
- [x] T19 — CI de los recorridos
- [x] T20 — Documentación y verificación del PR

Notas de la verificación (el detalle está en la respuesta del coder):

- `npm run e2e:real` no se ejecutó: el compose completo no se pudo levantar sin tocar el entorno local del autor (ya hay contenedores `core-bancario-*` en marcha con otros secretos y realms viejos).
- `npm run e2e:simulado`: 37 de 37 (dos corridas seguidas). Las 7 que fallaban por `e2e/simulado/entorno.ts` (fixture `bff` sin `auto` y carrera de CA12) las corrigió el test-writer con el visto bueno del autor, en el commit `8db341d`, junto con la espera de CL24 en Vitest.
- `npm run e2e:real` (CI, job "Recorridos reales"): 12 de 12. Dos rondas hasta llegar ahí:
  - `324e862` (test-writer, aprobado por el autor): CA-03 sigue el orden de las acciones requeridas del realm (CONFIGURE_TOTP antes que UPDATE_PASSWORD).
  - **Bloqueo del backend, resuelto con `core-bancario#14`** (`main` en `8b11614`): el BFF cerraba la sesión de Keycloak con `end_session_endpoint`, publicado con la dirección del navegador (`localhost:8080`). Dentro del contenedor del BFF eso respondía 404, la sesión SSO seguía viva y CA-01 veía la reautenticación en vez del login. Ahora el BFF deriva el cierre de `token_endpoint`. Tras el fix, CA-01 y CA-35 (axe en el login de Keycloak) pasan.

# Avance — 004 Front base (bloque 004b, PR 4: `core-bancario-web`)

- [x] T24 — Contratos y tipos de 004b (`EstadoDeAccesoDto`, `ObtenerEstadoDeAccesoDigital`): ya venían en el commit de las pruebas en rojo; `contratos:sincronizar` + `tipos` no dejan diff
- [x] T25 — Buscar y registrar (`BuscarCliente`, `FormularioDeRegistro`, `esquemaDeRegistro`, `consultas.ts`; `react-hook-form` y `zod` instalados)
- [x] T26 — Ficha y cuentas (`accionesDeCuenta`, `FichaDeCliente`, `AccionesDeCuenta`, `AbrirCuenta`)
- [x] T27 — Acceso digital (`accionesDeAcceso`, `AccesoDigital`, `DialogoDeClaveTemporal`)
- [x] T28 — Cierre del bloque: README y `e2e-real` hechos (el job ya corre todo `e2e/real`). Comprobaciones manuales (sesión principal, 2026-11-02, compose con la imagen web reconstruida):
  - la clave temporal no queda en el DOM, la caché ni el almacenamiento tras "Ya la entregué": lo cubren `F004_CA30_YaLaEntregue_LaClaveDesapareceDelDomYDeLaCache` (Vitest: DOM y caché de mutaciones) y `F004_CA30_ClaveTemporal_NoQuedaEnUrlNiAlmacenamiento` (simulada: URL y almacenamiento), ambas en verde; además, ningún log de nginx, BFF ni API contiene `claveTemporal` tras `e2e:real`;
  - el número de documento no aparece en la URL ni en los logs de nginx, del BFF ni de la API: tras `e2e:real`, 0 líneas con `numeroDocumento=` en los tres; el `access_log` registra solo `GET /api/clientes/por-documento`. Con el BFF parado, `GET /api/clientes/por-documento?…&numeroDocumento=987654321` da 502 y el número no aparece en ningún log de nginx (antes del `error_log … crit` el `error_log` escribía la línea de la petición con el número);
  - el CI corre en el PR, y después `/sdd-review`.

Notas de la verificación del bloque 004b:

- Tres defectos en las pruebas en rojo (cómo se simula o se busca, no qué se exige), corregidos por el test-writer con el visto bueno del autor: el latido `POST /bff/actividad` de `renderizarElBackoffice` devolvía la sesión de clientes (28 fallos); en `F004_CA23_DatosValidos_AbreLaFichaNueva`, `:clienteId` capturaba `por-documento` por el orden de los manejadores de MSW; y en `recorridoDelOperador.spec.ts`, el nombre "Bloquear" también casaba con "Desbloquear" (ahora `exact: true`).
- Resultados: lint, format, typecheck y build en verde; Vitest 257 de 257; `e2e:simulado` 61 de 61; `e2e:real` 15 de 15.
- `@hookform/resolvers` 7.0.0 en lugar de la 6.0.0 de ADR-0022: aceptado por el autor como desviación (ver `learning.md` §4).
