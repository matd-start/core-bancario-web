# Core Bancario — Web

SPA de Core Bancario: la banca del cliente (`/`) y el backoffice del operador (`/backoffice`). Habla solo con el BFF de `core-bancario` en el mismo origen: el navegador nunca tiene un token (ADR-0020). Es parte de un proyecto de portafolio: además de funcionar, debe dejar evidencia de las decisiones.

## Dónde se trabaja cada fase (leer primero)

Las decisiones viven **solo** en `core-bancario` (`C:\Users\miguel\source\repos\core-bancario`), clonado al lado de este repositorio. Aquí solo se construye y se revisa.

| Fase                                                                    | Dónde           | Qué produce                                        |
| ----------------------------------------------------------------------- | --------------- | -------------------------------------------------- |
| `/sdd-spec`, `/sdd-design`, ADRs, roadmap, spec de producto             | `core-bancario` | `specs/NNN-slug/{spec,plan,tasks}.md`, `docs/adr/` |
| `/sdd-build`, `/sdd-review` de las tareas con `Repo: core-bancario-web` | **este repo**   | código, pruebas y `construccion/NNN-slug/`         |

Regla corta: **decidir → `core-bancario`; construir o revisar → el repo que diga el `Repo:` de la tarea.** Aquí `/sdd-spec` y `/sdd-design` solo redirigen.

- Spec de producto (RN, RF y D-xx globales): `../core-bancario/docs/producto/spec-fase-1.md`.
- ADRs: `../core-bancario/docs/adr/`. Las del frontend: 0005 (repos separados), 0020 (BFF), 0021 (inactividad) y 0022 (cómo se construye el frontend).
- La bitácora de construcción (`avance.md`, `learning.md`, `review.md`) va en `construccion/NNN-slug/` de este repo; ver `construccion/README.md`.

## Stack (ADR-0022)

- Node 24 (`.nvmrc`, y `engine-strict` en `.npmrc`: `npm ci` falla con otra versión). Versiones exactas en `package.json`.
- Vite 8 + React 19 + TypeScript 5.9 en modo `strict`, con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`. TS sigue en 5.9 mientras `openapi-typescript` no acepte 6 o 7.
- Pruebas: Vitest + jsdom + Testing Library (+ MSW desde la 004) para unidades y componentes; Playwright con dos proyectos, `simulado` (`/bff` y `/api` con `page.route`) y `real` (compose completo de `core-bancario`).
- Lint: ESLint 10 con typescript-eslint (`strictTypeChecked`), react-hooks y react-refresh; formato con Prettier. No se usa `eslint-plugin-jsx-a11y`: no declara ESLint 10 y no publica desde 2024. La accesibilidad la cubren axe en Playwright (CA-35), React Aria y las consultas por rol de Testing Library.
- Contratos: copias versionadas en `contratos/` de los OpenAPI de la API y del BFF; los tipos generados en `src/api/generado/` también se versionan y nunca se editan a mano.

## Estructura

```
src/
  main.tsx
  app/          rutas, proveedores y cliente de consultas
  api/          generado/ (tipos del contrato), clientes HTTP, errores y mensajes
  comun/        piezas sin dominio: dinero, componentes y estilos base
  sesion/       reloj, actividad, pestañas y pantallas de sesión
  cliente/      área del cliente
  backoffice/   área del operador
  pruebas/      setup de Vitest y utilidades compartidas de pruebas (MSW)
e2e/
  simulado/     Playwright con /bff y /api simulados
  real/         Playwright contra el compose de core-bancario
  ayudas/       TOTP, admin de Keycloak y llamadas al BFF
contratos/      copias de los OpenAPI (npm run contratos:sincronizar)
infra/nginx/    configuración de nginx con CSP
construccion/   bitácora de construcción por feature
```

Las pruebas de Vitest van **junto al código** que prueban (`dinero.ts` → `dinero.test.ts`).

## Comandos

- Desarrollo: `npm run dev` (Vite en 5173; reenvía `/bff` y `/api` al BFF en `http://localhost:5180`).
- Verificación: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`.
- Navegador: `npm run e2e:simulado` y `npm run e2e:real` (este con el compose de `core-bancario` levantado).
- Contratos: `npm run contratos:sincronizar` y `npm run tipos`.
- Mientras no haya pruebas, `test` y `e2e:*` llevan `--passWithNoTests` / `--pass-with-no-tests`. **Al añadir la primera prueba de cada tipo, quitar el flag** (igual que `--ignore-exit-code 8` en .NET).

## Flujo de trabajo

- SDD como en `core-bancario`: no se escribe código de producción sin `spec.md` y `plan.md` en `Estado: Aprobado` allí.
- GitHub Flow: `main` protegida, solo por PR con el CI en verde. Ramas `feature/NNNx-slug` (las nombra el plan), `fix/slug` y `chore/slug`; se borran tras el merge.
- **Un cambio de contrato va primero en `core-bancario`** (ADR-0005): el PR del web de un bloque empieza cuando el PR del backend de ese bloque está mergeado.
- Commits `tipo(NNN): mensaje` con `docs`, `test`, `feat`, `fix`, `refactor` o `chore`.

## Estilo

- Principios de diseño: skill `ts-clean-code`.
- **Dinero:** el monto llega como texto (`DineroDto.monto`) y se formatea con `Intl.NumberFormat` pasando el texto. Nunca `Number`, `parseFloat` ni `+` unario.
- **Nada sensible en el navegador:** ni `localStorage` ni `sessionStorage`; el documento nunca va en una ruta.
- Nombres de pruebas: el título de cada `test(...)` es `FNNN_ID_Escenario_Resultado` (por ejemplo `F004_CA18_MisCuentas_SinCuentas_EstadoVacio`), con el mismo criterio que en .NET.
- Vocabulario del dominio en español, igual que la spec de producto (`Cuenta`, `Dinero`, `Movimiento`…); los sufijos técnicos pueden ir en inglés.
- El autor está aprendiendo frontend y arquitectura: explica el porqué de las decisiones no obvias y, al cerrar cada fase, di qué debe revisar él.

## Aprendizaje antes de decidir

IMPORTANTE: el autor no es un programador experto y este proyecto también es su entorno de aprendizaje. Antes de pedirle que elija entre opciones técnicas, explica cada concepto que quizá no conoce en 2-4 líneas (qué es, una analogía y por qué importa aquí). Si el concepto es grande, sugiere estudiarlo primero y pregúntale si quiere hacerlo o decidir ya. En decisiones importantes, pídele que explique el porqué con sus palabras.
