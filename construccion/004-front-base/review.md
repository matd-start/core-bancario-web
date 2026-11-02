# Revisión — 004-front-base, PR 4 de 004b (`core-bancario-web`, rama `feature/004b-backoffice`, T24–T28)

## Veredicto: APROBADO

Todos los comandos pasan, incluido `e2e:real` contra el compose local. No encontré nada obligatorio que corregir. El contrato coincide con `core-bancario` en `main`, el historial de pruebas es correcto y cada ID de la sección tiene implementación y al menos una prueba con prefijo `F004_`. Sí hay dos tareas de documentación que dependen de `core-bancario`; están más abajo, en "Desviaciones".

## Trazabilidad

| ID                | Implementado                                                                                                 | Prueba                                                                                                              | Nota                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| RF-01             | `FormularioDeRegistro.tsx`, `esquemaDeRegistro.ts`                                                           | `F004_CA23_DatosValidos_AbreLaFichaNueva`, `F004_CA23_EsquemaDeRegistro_*`                                          | RHF + Zod                                                                           |
| RF-02             | `AbrirCuenta.tsx`, `useAbrirCuenta`                                                                          | `F004_CA24_DobleClicEnAbrirCuenta_…`                                                                                |                                                                                     |
| RF-03             | `AccionesDeCuenta.tsx`, `useCambiarEstadoDeCuenta`                                                           | `F004_CA25_Bloquear_…`, `F004_CA25_Desbloquear_…`, `F004_CA25_CerrarCuenta_*`                                       |                                                                                     |
| RF-12             | `BuscarCliente.tsx`, `useBuscarClientePorDocumento`                                                          | `F004_CA22_BuscarConPuntos_…`, `F004_CA22_BuscarSinPuntos_…`                                                        |                                                                                     |
| RF-13             | `AccesoDigital.tsx`, `DialogoDeClaveTemporal.tsx`                                                            | `F004_CA30_*`, `F004_CA31_*`, `F004_CA28_Deshabilitar_…`                                                            |                                                                                     |
| RF-16             | `useEstadoDeAcceso`, `comoEstadoDelAcceso`, `accionesDeAcceso`                                               | `F004_CA28_Ficha_MuestraEstadoYAccionesDelAcceso_*`, `F004_CA28_HabilitadoConPrimerIngresoPendiente_LoDice`         |                                                                                     |
| RN-14             | `accionesDeCuenta`                                                                                           | `F004_CA25_AccionesDeCuenta_SegunEstado_*`, `F004_CA25_Ficha_ActivaBloqueadaYCerrada_…`                             | Un estado desconocido no ofrece acciones (`F004_CA25_CuentaConEstadoDesconocido_…`) |
| RN-20             | Texto de la confirmación de "Restablecer"                                                                    | `F004_CA31_Restablecer_ConfirmacionExplicaConsecuencias…`                                                           |                                                                                     |
| CL-15             | `Boton enCurso` y `mutations: { retry: 0, gcTime: 0 }`                                                       | `F004_CA24_*`, `F004_CL15_ErrorAlAbrirCuenta_NoReintentaSola…`                                                      | El límite conocido está en el README                                                |
| CL-16             | `onError` 409 → `invalidateQueries(['ficha', id])`                                                           | `F004_CA27_Conflicto409_MensajeYLaFichaSeRecarga`                                                                   |                                                                                     |
| CL-17             | `Dialogo` sin `alCerrar`, `habilitar.reset`                                                                  | `F004_CA30_DialogoDeClave_NoSeCierraConEscNiClicFuera`, `F004_CA30_YaLaEntregue_…DelDomYDeLaCache`                  |                                                                                     |
| CL-18             | 422 → mensaje de negocio                                                                                     | `F004_CA26_CerrarConSaldo_MensajeDeNegocioYSigueActiva`                                                             |                                                                                     |
| CL-19             | Mensajes `identidad-*`                                                                                       | `F004_CL19_FallaAlHabilitar_%i_…`, `F004_CL19_ReintentoConExito_…`                                                  |                                                                                     |
| CL-20             | 502/503 o estado desconocido → "Estado del acceso no disponible"                                             | `F004_CA32_EstadoNoDisponible_%i_…`, `F004_CA32_EstadoDesconocido_…`                                                | Las acciones se ocultan (ver desviaciones)                                          |
| CL-21             | Título según `respuesta.accion` y aviso en "Habilitar"                                                       | `F004_CL21_BotonHabilitarPeroApiRestablece_DialogoDiceRestablecido`                                                 |                                                                                     |
| CL-22             | 404 → aviso + "Registrarlo" con el documento                                                                 | `F004_CL22_*` (3)                                                                                                   |                                                                                     |
| CL-23             | 409 `documento-duplicado` → "Ir a la ficha"                                                                  | `F004_CL23_DocumentoDuplicado_OfreceIrALaFicha`                                                                     |                                                                                     |
| CL-24             | `MensajeDeError` con "Reintentar" en las consultas y genérico + `traceId` en las acciones                    | `F004_CL24_BuscarConError500_…`, `F004_CL24_FichaConError500_…`, `F004_CL24_BloquearConError500_…`                  |                                                                                     |
| CA-22             | Sí                                                                                                           | `F004_CA22_*` (Vitest y rutas)                                                                                      | URL, `history.state` y ruteador sin el número                                       |
| CA-23             | Sí                                                                                                           | `F004_CA23_TelefonoSinCodigoDePais_…`, `F004_CA23_Error400DeLaApi_JuntoASuCampo`, `F004_CA23_EsquemaDeRegistro_*`   |                                                                                     |
| CA-24             | Sí                                                                                                           | `F004_CA24_DobleClicEnAbrirCuenta_UnaSolaPeticionYCuentaUsdEnCero`                                                  |                                                                                     |
| CA-25             | Sí                                                                                                           | `F004_CA25_*`                                                                                                       |                                                                                     |
| CA-26             | Sí                                                                                                           | `F004_CA26_*`                                                                                                       |                                                                                     |
| CA-27             | Sí                                                                                                           | `F004_CA27_*`                                                                                                       |                                                                                     |
| CA-28             | Sí                                                                                                           | `F004_CA28_*`                                                                                                       |                                                                                     |
| CA-30             | Sí                                                                                                           | Vitest `F004_CA30_*` · simulada `F004_CA30_ClaveTemporal_NoQuedaEnUrlNiAlmacenamiento`                              |                                                                                     |
| CA-31             | Sí                                                                                                           | `F004_CA31_*`                                                                                                       |                                                                                     |
| CA-32             | Sí                                                                                                           | `F004_CA32_*`, `F004_CL19_*`                                                                                        |                                                                                     |
| CA-33             | Sí                                                                                                           | Real `F004_CA33_OperadorBuscaYBloquea_LaFichaMuestraBloqueada` (+2 pasos)                                           | En verde en local                                                                   |
| CA-35             | Sí                                                                                                           | `F004_CA35_CadaPantalla_SinFallosAA_Backoffice*` (11 pantallas y estados), `F004_CA35_ClaveTemporal_SoloConTeclado` |                                                                                     |
| CA-36             | Sí                                                                                                           | `F004_CA36_Backoffice1280px_SinScrollHorizontal_*` (11)                                                             |                                                                                     |
| CA-02 (regresión) | `BuscarCliente` sustituye a `InicioDelBackoffice`                                                            | `F004_CA02_BuscarCliente_*`                                                                                         | Sustituyen a las `F004_CA02_InicioDelBackoffice_*`                                  |
| CL-08 (regresión) | Ruta `*` dentro de `/backoffice`                                                                             | `F004_CL08_RutaMalEscrita…DelBackoffice_*`                                                                          |                                                                                     |
| RNF-04            | Documento solo en el estado del componente; búsqueda como mutación; `location` de nginx con `error_log crit` | `F004_CA22_*`, `F004_CL22_…NoPasaElDocumentoPorLaUrl`, `F004_CA30_*`                                                | Ver la sección RNF                                                                  |
| RNF-08 / RNF-09   | Sí                                                                                                           | CA-35 y CA-36                                                                                                       |                                                                                     |
| RNF-13            | `contratos/` y `src/api/generado/`                                                                           | Paso "Contratos y tipos al día" del CI                                                                              | Comprobado en local                                                                 |
| RNF-14            | Commit `d7ee980` en rojo                                                                                     | —                                                                                                                   | Ver la sección RNF                                                                  |
| RNF-15            | Recorrido del operador                                                                                       | Real CA-33                                                                                                          |                                                                                     |

Todas las pruebas nuevas llevan el prefijo `F004_`. No hay ninguna sin prefijo ni con el de otra feature.

## Hallazgos obligatorios

Ninguno.

Comprobaciones hechas:

- **Integridad de las pruebas.** `git log --grep "pruebas en rojo"` → `d7ee980`. Después de ese commit, los únicos cambios a pruebas (`*.test.tsx`, `src/pruebas/renderizar.tsx` y `e2e/real/recorridoDelOperador.spec.ts`) están en `e1d7e6d`, que es `test(004): …`. El commit `feat` `e3d6aa0` no toca ninguna prueba ni `src/pruebas/` ni `e2e/`.
- **Esqueletos.** No queda ningún `// SDD: esqueleto creado por test-writer` en `src/` ni en `e2e/`.
- **Generados.** Los dos `contratos/*.json` son idénticos a `origin/main` de `core-bancario` (`8e13bd6`). `npm run tipos` no deja cambios en `src/api/generado/`.
- **Seguridad (ADR-0020 y `CLAUDE.md`).**
  - En el código nuevo no hay `fetch` suelto, `localStorage`, `sessionStorage`, `Number`, `parseFloat`, `dangerouslySetInnerHTML`, `detail`, `any`, `!` ni `as` para forzar tipos.
  - Todas las llamadas pasan por `useClienteDeLaApi`.
  - El saldo se muestra con `formatearSaldo`.
- **Inactividad (ADR-0021).** No hay latidos nuevos. Las mutaciones no cuentan como actividad: lo que cuenta es el clic, como ya pasaba en 004a.
- **Construcción (ADR-0022).** RHF + Zod con `setError` para los 400 y React Aria para los diálogos. La excepción es la versión de `@hookform/resolvers` (ver desviaciones).

## Sugerencias opcionales

1. **Foco después de los diálogos de acceso (accesibilidad, no bloquea).** En `AccesoDigital.tsx`, al confirmar, el diálogo de confirmación se cierra mientras el botón "Habilitar" ya está `disabled` por `enCurso`. Al terminar, la acción cambia y sus botones se vuelven a crear con otras claves. Por eso es probable que, al pulsar "Ya la entregué", el foco caiga en `body` en vez de en la tarjeta "Acceso digital". No lo comprobé en el navegador. CA-35 se cumple (el flujo se completa con teclado), pero un usuario de teclado pierde su posición. Una corrección mínima: mover el foco al `h2` "Acceso digital" (con `tabIndex={-1}`) en `onEntregada`. Responsable: coder, y que el test-writer añada una aserción de `document.activeElement` en `F004_CA35_ClaveTemporal_SoloConTeclado`.
2. **Nombres accesibles repetidos.** Cada cuenta tiene botones "Bloquear" y "Cerrar" con el mismo nombre (`AccionesDeCuenta.tsx`). Están dentro de un `li` con el número de la cuenta como `h3`, así que no es un fallo AA. Aun así, con `aria-describedby` hacia el `h3`, el lector de pantalla diría a qué cuenta afecta el botón.
3. **Aviso de "no registrado" desactualizado.** En `BuscarCliente.tsx`, si el operador cambia el número después de un 404, "No hay un cliente con ese documento" sigue a la vista, y "Registrarlo" usa el número nuevo, que nadie buscó. Bastaría con `buscar.reset()` en el `onChange` del número y del tipo.
4. **Mensaje de conflicto.** `MENSAJES_DE_ERROR['conflicto-de-concurrencia']` (de 004a) dice "Actualiza la pantalla e inténtalo de nuevo", pero la ficha ya se recarga sola (CL-16). Se podría acortar a "La cuenta cambió mientras tanto; ya ves su estado actual".
5. **Prueba de CA-22 un poco más precisa.** `F004_CA22_BuscarConPuntos_…` comprueba `tipoDocumento` en la petición, pero no que `numeroDocumento` sí viaje en la consulta de la _petición_. Responsable: test-writer.
6. **Tamaño del paquete.** `vite build` avisa de que `index-*.js` pesa 561 kB (más de 500 kB). Cargar el área del backoffice con `lazy()` sacaría RHF y Zod del paquete del cliente. Puede esperar a otra feature.
7. **Commit fuera de la sección.** `d8447b1` (estabiliza la prueba real del cliente de 004a) no pertenece a T24–T28. Es un `test(...)` legítimo que hacía falta para que `e2e:real` quedara en verde, pero conviene mencionarlo en la descripción del PR.

## Desviaciones entre spec/plan y código

- **`@hookform/resolvers` 7.0.0 en lugar de la 6.0.0 de ADR-0022.** El autor la aceptó y está documentada en `learning.md` §4 y en `avance.md`. **Pendiente: actualizar ADR-0022 en `core-bancario`**, como dice `learning.md`.
- **CA-32 / CL-20.** La spec dice "acciones de acceso desactivadas"; el código las **oculta**, que es lo que fija el plan (`accionesDeAcceso('no-disponible') = []`). Conviene unificar la redacción de la spec con el plan.
- **T24 se hizo en el commit en rojo.** El test-writer sincronizó `contratos/` y `api.d.ts` en `d7ee980` porque las pruebas lo necesitaban para compilar. `avance.md` lo dice.
- **Piezas que el plan no nombraba:**
  - `comun/componentes/Campo.tsx`;
  - `comoEstadoDeCuenta` y `comoEstadoDelAcceso` en `acciones.ts`, que convierten el texto libre del contrato en los tipos cerrados de la app;
  - `z.config({ jitless: true })`, para no provocar una violación de la CSP (RNF-03);
  - la ruta `*` dentro de `/backoffice`;
  - la búsqueda implementada como `useMutation`, para que el documento no entre en una clave de caché;
  - una `location = /api/clientes/por-documento` en `infra/nginx/default.conf`, archivo que T28 no lista. Es un refuerzo justificado de RNF-04.

  Conviene añadir una lista "Añadidos y desviaciones del Build (004b)" en la sección 3.4 del plan, como se hizo con 004a.

- **Casillas de `tasks.md`.** T24–T28 siguen en `[ ]` en `../core-bancario/specs/004-front-base/tasks.md`; `avance.md` sí las marca. Hay que marcarlas en el próximo PR de `core-bancario`.
- **Bitácora.** `construccion/004-front-base/avance.md` (lista T24–T28) y `construccion/004-front-base/learning.md` existen y tienen sección de 004b.

## Resultado de las pruebas

- `npm ci`: correcto, con Node 24.22.1. Hay 15 avisos de `npm audit` de nivel moderado.
- `npm run lint`: sin errores.
- `npm run format:check`: todos los archivos tienen el formato de Prettier.
- `npm run typecheck`: correcto.
- `npm test`: **257 de 257**.
- `npm run build`: correcto, con el aviso de tamaño de la sugerencia 6. El hash del paquete (`index-VA489ZxS.js`) coincide con el que sirve el contenedor `core-bancario-web`, así que `e2e:real` probó exactamente este código.
- `npm run e2e:simulado`: **61 de 61**.
- `npm run e2e:real`: **15 de 15**, contra el compose local ya levantado, con `KC_BOOTSTRAP_ADMIN_*` tomados de `../core-bancario/.env`. Los tres pasos de CA-33 están en verde.
- `npm run tipos`: no deja cambios.

**RNF:**

- **RNF-04: cumple.** Después de `e2e:real`, `docker logs` de web, BFF y API tienen 0 líneas con `numeroDocumento=` y 0 con `claveTemporal`. El `access_log` de nginx registra solo `GET /api/clientes/por-documento`, sin la consulta.
- **RNF-08 y RNF-09: cumplen.** Axe y los anchos en 11 pantallas y estados, más el flujo de la clave solo con teclado.
- **RNF-13: cumple.**
- **RNF-15: cumple en local.** El CI no lo verifiqué.
- **RNF-14:** el commit en rojo existe y es anterior a la implementación. No volví a ejecutar las pruebas sobre `d7ee980` para ver el rojo; me fío de `avance.md`.

## Preguntas de comprensión para el autor

1. La búsqueda por documento es un `GET` que no cambia nada, pero el PR la implementa con `useMutation` y no con `useQuery`. ¿Qué pasaría con el número de documento (dónde quedaría, cuánto tiempo y quién podría verlo) si fuera una consulta con `queryKey: ['cliente', tipo, numero]`? ¿Qué papel cumple `gcTime: 0`?
2. El estado del acceso digital tiene su propia consulta (`['acceso', id]`), separada de la ficha (`['ficha', id]`). ¿Qué requisito obliga a separarlas? ¿Qué vería el operador si estuvieran juntas y Keycloak no respondiera?
3. ¿Por qué el título del diálogo de la clave usa `respuesta.accion` y no el botón que pulsó el operador? Describe el escenario de CL-21 en el que darían resultados distintos.

---

# Revisión — 004-front-base, PR 2 de 004a (`core-bancario-web`, T12–T20)

## Veredicto: APROBADO

No encontré nada que afecte la corrección, la spec, la seguridad, la accesibilidad exigida ni las ADR 0020, 0021 o 0022. Queda una condición, que la protección de `main` ya impone: los recorridos reales (`e2e:real`) no se han visto en verde en ningún sitio, y tampoco la imagen nginx de T18. El job `e2e-real` del CI tiene que pasar antes del merge.

## Trazabilidad

| ID        | Implementado                                                                        | Prueba                                                                                                 | Nota                                                                        |
| --------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| RF-05     | Sí (`MisCuentas`, `DetalleDeCuenta`, `consultas.ts`)                                | Por CA-18 y CA-20                                                                                      | No hay prueba con `RF05` en el título. La spec asigna RF-05 a CA-18 y CA-20 |
| RF-14     | Sí (`ProveedorDeSesion`, `PantallaDeInicio`, `BotonCerrarSesion`)                   | `F004_RF14_LeerAviso_*`, CA-01, CA-02                                                                  |                                                                             |
| RF-15     | Sí (`BotonCambiarClave`, `useAvisoDeLaUrl`)                                         | Por CA-21 (`F004_CA21_*`)                                                                              |                                                                             |
| RN-19     | Sí (`AreaProtegida`, `rol` null o 403 lleva a `SinPermiso`)                         | Por CA-02 y CA-15                                                                                      |                                                                             |
| RN-22     | Sí (`relojDeSesion`)                                                                | Por CA-09 y CL-06/CL-07 (`EvaluarReloj_*`)                                                             | Los 5/30 min los dicta el BFF; su prueba está en el backend                 |
| RN-25     | Sí (`registroDeActividad`, latido por ruta)                                         | `F004_RN25_*` (Vitest), `F004_CA07_RefrescosAutomaticos_NoEnvianLatidos`                               |                                                                             |
| RN-26     | Sí (`OtraSesionAbierta`, `cerrarYContinuar`)                                        | Por CA-14 y CL-10                                                                                      |                                                                             |
| CL-01     | Sí                                                                                  | `F004_CL01_*`, `F004_CA04_*`                                                                           |                                                                             |
| CL-04     | Sí                                                                                  | `F004_CL04_Api403_PantallaSinPermiso`, `F004_CA15_*`                                                   |                                                                             |
| CL-05     | Sí                                                                                  | `F004_CL05_*` (2)                                                                                      |                                                                             |
| CL-06     | Sí                                                                                  | `F004_CL06_*`, `F004_CA08_*`                                                                           |                                                                             |
| CL-07     | Sí                                                                                  | `F004_CL07_*`, `F004_CA09_*`                                                                           |                                                                             |
| CL-10     | Sí                                                                                  | `F004_CL10_*` (3), `F004_CA14_*`                                                                       |                                                                             |
| CL-11     | Sí (`clear()` y después `location.replace`, `pageshow`, `no-store` en `index.html`) | `F004_CL11_*` (4), `F004_CA12_*`                                                                       |                                                                             |
| CL-12     | Sí                                                                                  | `F004_CL12_*` (3)                                                                                      |                                                                             |
| CL-13     | Sí                                                                                  | `F004_CL13_*` (4)                                                                                      |                                                                             |
| CL-14     | Sí (`formatearDinero` con el texto)                                                 | Por CA-19 (`F004_CA19_*`, incluido un entero mayor que `MAX_SAFE_INTEGER`)                             |                                                                             |
| CL-15     | `Boton enCurso` → `disabled` + `aria-busy`                                          | —                                                                                                      | El plan lo prueba en 004b (CA-24)                                           |
| CL-24     | Sí (`MensajeDeError` + "Reintentar", `errorElement` por área)                       | `F004_CL24_*` (2), `F004_CA18_ErrorDeLaApi_Reintentar`                                                 |                                                                             |
| CA-01     | Sí                                                                                  | Vitest `F004_CA01_*` (3) · real `F004_CA01_ClienteIniciaSesionConOtp_…`                                | El real no se ejecutó                                                       |
| CA-02     | Sí                                                                                  | Vitest `F004_CA02_*` (4) · real `F004_CA02_OperadorIniciaSesion_…`                                     | El real no se ejecutó                                                       |
| CA-03     | Keycloak                                                                            | real `F004_CA03_PrimerIngreso_…`                                                                       | No se ejecutó                                                               |
| CA-04     | Sí                                                                                  | simulado `F004_CA04_AvisoInicioFallido_…`                                                              |                                                                             |
| CA-05     | Sí                                                                                  | real `F004_CA05_ConSesion_NingunTokenLegibleDesdeLaPagina`                                             | No se ejecutó                                                               |
| CA-06     | Sí (`X-CSRF: 1`)                                                                    | Vitest `F004_CA06_*` (2) · real `F004_CA06_OtroOrigenDelMismoSitio_…`                                  | El real no se ejecutó                                                       |
| CA-07     | Sí                                                                                  | `F004_RN25_*` · simulado `F004_CA07_*`                                                                 |                                                                             |
| CA-08     | Sí                                                                                  | simulado `F004_CA08_*` (3)                                                                             |                                                                             |
| CA-09     | Sí                                                                                  | Vitest `F004_CA09_*` (3) · simulado `F004_CA09_A29Minutos_…`                                           |                                                                             |
| CA-11     | Sí (`BroadcastChannel`)                                                             | simulado `F004_CA11_*` (2), Vitest `F004_CA11_MensajeDePlazos_…`, `F004_RNF07_*`                       |                                                                             |
| CA-12     | Sí                                                                                  | simulado `F004_CA12_TrasCerrarSesion_AtrasNoMuestraDatos` · real `…NoMuestraSaldos`                    |                                                                             |
| CA-14     | Sí                                                                                  | simulado `F004_CA14_*`                                                                                 |                                                                             |
| CA-15     | Sí                                                                                  | Vitest y simulado `F004_CA15_*`                                                                        |                                                                             |
| CA-16     | Sí (401 `sesion-revocada` lleva al aviso genérico)                                  | `F004_CL12_SesionRevocada_VaAlInicioConMensajeGenerico`                                                | El resto está en Keycloak.Tests                                             |
| CA-17     | Keycloak                                                                            | real `F004_CA17_*`                                                                                     | No se ejecutó                                                               |
| CA-18     | Sí                                                                                  | `F004_CA18_*` (4 de Vitest + 1 real)                                                                   |                                                                             |
| CA-19     | Sí                                                                                  | `F004_CA19_*` (4 de Vitest + 1 simulado)                                                               |                                                                             |
| CA-20     | Sí (el mismo 404 para la cuenta ajena y la inexistente)                             | `F004_CA20_*`                                                                                          |                                                                             |
| CA-21     | Sí                                                                                  | `F004_CA21_*` (7)                                                                                      |                                                                             |
| CA-34     | Sí (`Record<CodigoDeError, string>` sobre el _enum_ del contrato)                   | `F004_CA34_CadaCodigoDelCatalogo_TieneMensaje_%s` (lee el contrato), `F004_CA34_*`, `F004_RNF12_*`     |                                                                             |
| CA-35     | Sí (React Aria, `:focus-visible`)                                                   | simulado: axe en 14 pantallas o estados y en el aviso, teclado (2) · real: axe en el login de Keycloak |                                                                             |
| CA-36     | Sí (_mobile-first_)                                                                 | simulado `F004_CA36_*` (360 y 1280 px)                                                                 |                                                                             |
| RNF-03    | `infra/nginx/encabezados.conf` con la CSP exacta del plan                           | real `F004_RNF03_*`                                                                                    | No se ejecutó                                                               |
| RNF-04    | `log_format` con `$uri`                                                             | —                                                                                                      | Sin prueba automática en el web; el plan la pone en Bff.Tests y 004b        |
| RNF-06/07 | Un solo `setTimeout` y el canal                                                     | CA-08, CA-09 y CA-11 simulados                                                                         |                                                                             |
| RNF-08/09 | Sí                                                                                  | CA-35, CA-36                                                                                           |                                                                             |
| RNF-10    | README y Chromium en el CI                                                          | —                                                                                                      | Se revisó, no se prueba                                                     |
| RNF-11    | Una sola consulta                                                                   | real `F004_RNF11_*`                                                                                    | No se ejecutó                                                               |
| RNF-12    | Sí                                                                                  | CA-34                                                                                                  |                                                                             |
| RNF-13    | `contratos:sincronizar`, `tipos` y el paso del CI                                   | Verificado a mano (abajo)                                                                              |                                                                             |
| RNF-14    | Rojo en `73898f1`                                                                   | Historial                                                                                              |                                                                             |
| RNF-15/16 | Job `e2e-real` y README                                                             | —                                                                                                      | No se pudo verificar en local                                               |
| D-09      | `package.json` con versiones exactas                                                | —                                                                                                      | Ver la desviación 5                                                         |

Las pruebas nuevas llevan todas el prefijo `F004_`. Los títulos sin prefijo son nombres de `test.describe`, no de pruebas.

## Hallazgos obligatorios

Ninguno.

Comprobaciones hechas:

- **Integridad de las pruebas:** después de `73898f1`, los únicos cambios a `*.test.*`, `src/pruebas/` y `e2e/` están en `8db341d`, que es un commit `test(004)`. Arregla la infraestructura del entorno simulado y una espera, y no debilita ninguna aserción. `29f09d6` (`feat`) no toca pruebas.
- **Esqueletos:** no queda ningún `// SDD: esqueleto creado por test-writer`.
- **Generados:** `contratos/*.json` es igual a `../core-bancario` en `main` (64a6090), salvo los finales de línea CRLF de la copia de trabajo de Windows; `.gitattributes` fuerza LF. `src/api/generado/*.d.ts` es idéntico a lo que produce `openapi-typescript` 7.13.0.
- **Seguridad:** nada usa `localStorage` ni `sessionStorage`. Ningún monto pasa por `Number`, `parseFloat` ni `+`; el único `Number.parseFloat` convierte los segundos del `SesionDto`. `detail` no se lee nunca. `?aviso=` solo elige un texto del catálogo y no se escribe en la página. `regreso` va con `encodeURIComponent`. No se usa `any`, y el único `as` es `history.state as unknown` en `avisos.ts:39`, una ampliación para el linter.
- **Alcance:** todo lo que cambió es de T12–T20 o lo sostiene: `areas.tsx`, `Pagina.tsx`, `BotonCerrarSesion.tsx`, `contextoDeSesion.ts`, `coordinadorDeSesion.ts`, `useAvisoDeLaUrl.ts`, `scripts/sincronizar-contratos.js` y `encabezados.conf`.
- **Bitácora:** existen `learning.md` y `avance.md`, y `avance.md` lista T12–T20.

## Sugerencias opcionales

1. **`src/sesion/ProveedorDeSesion.tsx:202-210`** (CL-11): cuando `pageshow` llega con `persisted`, poner `setCarga({ tipo: 'cargando' })` antes de consultar. Así una página que sale del bfcache nunca enseña el DOM viejo mientras espera la respuesta de `/bff/sesion`. Hoy lo protegen el `no-store` de `index.html` y la cookie borrada; esto añadiría una defensa más.
2. **`src/api/clientes.ts:24`**: tipar `MOTIVO_POR_CODIGO` como `Record<CodigoDeErrorDelBff, MotivoDeCierre>`, con `components['schemas']['CodigoDeErrorDelBff']` de `bff.d.ts`. Es lo mismo que hace CA-34 con la API: si el BFF añade un código, no compila. `no-autenticado`, que viene de la API, quedaría en una entrada aparte.
3. **`src/app/rutas.tsx:24`**: la ruta `*` lleva todo a `/mis-cuentas`. Un operador que escribe mal una ruta, por ejemplo `/backoffice/xyz`, cae en el área del cliente y ve "Ya tienes una sesión abierta… Cerrar sesión y continuar". Conviene un `*` hijo dentro de `/backoffice`, sobre todo porque 004b añade rutas.
4. **`src/sesion/PantallaDeInicio.tsx:14`**: lee `?aviso=` pero no lo quita de la URL. Al recargar, "Tu sesión se cerró por inactividad" vuelve a salir. Se puede usar `useAvisoDeLaUrl` como en `MisCuentas`. Ojo: los recorridos reales comprueban `toHaveURL(/aviso=sesion-cerrada/)`, así que el cambio necesita al test-writer.
5. **`src/api/mensajes.ts:4` y `MensajeDeError.tsx`**: si la red cae, `traceId` es `null` y el mensaje genérico termina en "indica este código:" sin ningún código detrás. Además, `MensajeDeError` decide si es genérico comparando el texto. Sería más claro decidirlo por `codigo === null || estado === 500`, con una variante del texto para cuando no hay `traceId`.
6. **`ProveedorDeSesion.tsx`** (277 líneas) junta la consulta, el reloj, los latidos, el canal y la navegación. Por "una responsabilidad" (ts-clean-code) se podrían sacar `useRelojDeSesion` y `useLatidos`. Funciona y está bien comentado, así que no es urgente.
7. **Una prueba de `crearClienteDeConsultas`** (sin reintentos en 401, 403 y 404; mutaciones con `retry: 0`). Las pruebas de pantallas usan su propio `QueryClient` con `retry: false`, así que la configuración real solo se ejercita en el entorno simulado. Responsable: test-writer. En la misma línea, el comentario de `DetalleDeCuenta.test.tsx:86` habla de un "reintento automático" que ese `QueryClient` no tiene.
8. **RNF-04 en 004b:** el `error_log` de nginx incluye `request: "GET …?…"` cuando el upstream falla. Antes de la búsqueda por documento (T28), conviene comprobar que el número no termina ahí.
9. **`avance.md`:** marca T20 como hecha, pero `e2e:real` y la comprobación manual con las herramientas del navegador siguen pendientes. Conviene decirlo en la propia línea de T20.

## Desviaciones entre spec/plan y código

Conviene que se recojan en el plan (spec viva):

1. `Sesion` tiene dos campos más que el plan: `area` y `cerrarYContinuar` (CL-10). `useSesion` vive en `contextoDeSesion.ts` y no en `ProveedorDeSesion.tsx`, por la regla `react-refresh`.
2. `crearClienteDeLaApi` y `crearMiddlewareDeSesion` aceptan un `alSerProhibido?`: un 403 lleva a `SinPermiso`, que es CL-04 por la vía de la API.
3. Mientras el aviso de sesión está abierto, la SPA **no** cuenta clics ni teclas como actividad; solo cuenta "Seguir conectado". Es razonable (un Tab dentro del diálogo no significa "sigo aquí"), pero RN-25 dice "clic o tecla" sin excepción. Conviene escribirlo en el plan o en ADR-0021.
4. Piezas que el plan no nombra: `formatearSaldo` (moneda desconocida → monto tal cual), `FalloDeLaApi`, `exigirDatos`, `comoErrorDeLaApi`, `crearClienteDeConsultas`, `coordinadorDeSesion.ts`, `useAvisoDeLaUrl.ts`, `Pagina.tsx`, `BotonCerrarSesion.tsx` y `areas.tsx`.
5. T12 pide "paquetes de ADR-0022", pero faltan `react-hook-form` y `zod`. 004a no tiene formularios, así que es YAGNI; hay que dejar dicho que llegan en T25.
6. `aPlazosLocales` acepta `number | string`, porque .NET 10 declara así los enteros del contrato. Un valor ilegible cuenta como 0, es decir, la sesión se cierra.
7. El paso de RNF-13 en el CI (comparar contratos y tipos) va en el job de verificación existente, no en `e2e-real`. Cumple T19.

## Resultado de las pruebas

- `npm ci`: el primer intento falló por falta de memoria de Node en esta máquina (exit 134) y dejó `node_modules` sin instalar. Con `NODE_OPTIONS=--max-old-space-size=4096` instaló bien (327 paquetes). Es un problema del entorno, no del proyecto.
- `npm run lint`: el primer intento también se quedó sin memoria (134). Repetido con el heap ampliado: **0 errores**.
- `npm run format:check`: **OK**.
- `npm run typecheck`: **OK**.
- `npm test`: **154 de 154** en 12 archivos.
- `npm run build`: **OK** (JS de 428,85 kB, 134,95 kB con gzip).
- `npm run e2e:simulado`: **37 de 37** en Chromium.
- `npm run e2e:real`: **no se ejecutó**. El compose completo no está levantado: solo corren `core-bancario-postgres` y `core-bancario-keycloak`, sin `bff` ni `web`, y `http://localhost:5173` no responde. Esto deja sin verificar CA-01, CA-02 y CA-03 (partes reales), CA-05, CA-06 (real), CA-12 (real), CA-17, CA-18 (real), CA-35 (login de Keycloak), RNF-03, RNF-11, RNF-15, RNF-16 y la imagen nginx de T18. Tiene que verlos el job `e2e-real` del CI.
- Contratos y tipos: verificados a mano (ver "Hallazgos obligatorios").

## Preguntas de comprensión para el autor

1. Con el aviso de inactividad abierto, la SPA deja de contar clics y teclas como actividad. ¿Qué problema evita? ¿Qué pasaría con RN-25 y con la idea de WCAG 2.2.1 ("avisar y dejar decidir") si un Tab dentro del diálogo alargara la sesión?
2. El BFF manda **duraciones** (`segundosHastaInactividad`) y la SPA las suma a `recibidoEn = Date.now()`. Si el reloj del computador del cliente va 10 minutos adelantado, ¿qué verías con este diseño y qué verías si el BFF mandara la hora exacta del cierre? ¿Y quién manda al final si el temporizador de la pestaña se retrasa?
3. `cerrarSesion` vacía la caché de TanStack Query **antes** de navegar, y navega con `location.replace` y no con `assign` ni con `navigate` de React Router. ¿Qué protege cada una de esas dos decisiones en CL-11, y por qué no basta con una sola?

Archivos relevantes: `C:\Users\miguel\source\repos\core-bancario-web\src\sesion\ProveedorDeSesion.tsx`, `C:\Users\miguel\source\repos\core-bancario-web\src\api\clientes.ts`, `C:\Users\miguel\source\repos\core-bancario-web\src\app\rutas.tsx`, `C:\Users\miguel\source\repos\core-bancario-web\src\sesion\PantallaDeInicio.tsx`, `C:\Users\miguel\source\repos\core-bancario-web\infra\nginx\default.conf`, `C:\Users\miguel\source\repos\core-bancario-web\construccion\004-front-base\avance.md`.
