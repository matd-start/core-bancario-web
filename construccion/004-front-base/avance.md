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
