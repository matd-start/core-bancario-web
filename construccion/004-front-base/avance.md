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
