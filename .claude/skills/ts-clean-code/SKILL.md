---
name: ts-clean-code
description: Principios de diseño para escribir y revisar código TypeScript y React — KISS, YAGNI, SOLID, DRY, tipos estrictos, componentes y hooks, estado del servidor, accesibilidad y pruebas con Testing Library. Usar al crear o refactorizar componentes, hooks, módulos o pruebas en TypeScript, o cuando el usuario pida revisar calidad, "clean code" o buenas prácticas en el frontend.
---

# Código TypeScript y React limpio

## Cuando los principios chocan, este es el orden

1. **Correcto, seguro y accesible** antes que elegante.
2. **KISS**: la solución más simple que resuelve el problema de hoy.
3. **YAGNI**: nada de abstracciones, props ni capas "por si acaso".
4. **SOLID**: aplicarlo cuando hay un motivo real. En React se traduce sobre todo en componentes con una responsabilidad y en depender de interfaces pequeñas (props, funciones) en las fronteras.
5. **DRY**: duplicar dos veces está bien; abstraer a la tercera, y solo si es el mismo _conocimiento_.

## Tipos

- `strict`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` están activos: no se apagan por archivo.
- Nunca `any`. Lo desconocido entra como `unknown` y se estrecha con una comprobación (o con un esquema de Zod en las fronteras).
- Nunca `!` para callar al compilador ni `as` para mentirle. Si un `as` parece necesario, el tipo está mal modelado.
- Estados con **uniones discriminadas** (`{ tipo: 'cargando' } | { tipo: 'error'; … } | { tipo: 'listo'; … }`) en vez de varios booleanos que pueden contradecirse. Un `switch` sobre el discriminante con `never` en el `default` obliga a cubrir cada caso.
- Literales con uniones (`type Moneda = 'COP' | 'USD'`) en vez de `enum`.
- Los tipos del contrato salen de `src/api/generado/`: no se reescriben a mano. Un tipo propio que diga lo mismo que el contrato es DRY roto.

## Componentes y hooks

- Un componente, una responsabilidad. Si mezcla pedir datos, decidir y pintar, separa: la consulta en un hook (`useMisCuentas`), la decisión en una función pura y el pintado en el componente.
- **Funciones puras para la lógica** (`evaluarReloj`, `formatearDinero`): se prueban sin DOM ni red. El componente solo las llama.
- **Estado derivado, no sincronizado:** si un valor se calcula a partir de props o de otro estado, se calcula al pintar. `useEffect` es para sincronizar con algo externo (temporizadores, `BroadcastChannel`, eventos del navegador), no para copiar estado.
- Cada `useEffect` que se suscribe a algo devuelve su limpieza.
- **Estado del servidor en TanStack Query**, nunca copiado a `useState`. El estado de la interfaz (un diálogo abierto, un campo) sí va en `useState`.
- Formularios con React Hook Form + Zod: la forma válida se describe una vez en el esquema.
- Props mínimas y con nombre de intención (`alConfirmar`, no `onClick2`). Nada de pasar objetos enteros cuando el hijo usa un campo.

## Seguridad (ADR-0020)

- Ningún token, documento ni clave temporal en `localStorage`, `sessionStorage`, rutas, `history.state` ni logs.
- Nunca `dangerouslySetInnerHTML`.
- Todas las llamadas pasan por los clientes de `src/api/` (llevan `X-CSRF` y tratan el 401); ningún `fetch` suelto.
- Los mensajes al usuario salen de `codigo` del error, nunca de `detail`.

## Accesibilidad (WCAG 2.1 AA)

- HTML semántico primero (`button`, `a`, `main`, `h1`…); los componentes de React Aria para lo que el HTML no resuelve (diálogos, menús).
- Todo control tiene nombre accesible; todo cambio importante se anuncia (`role="status"` o `alert`); el foco es visible y va a donde el usuario lo espera.
- Una acción en curso deshabilita su botón y lo marca con `aria-busy`.

## Dinero

El monto viaja como **texto** y se formatea con `Intl.NumberFormat` pasando el texto. Nunca `Number`, `parseFloat`, `+monto` ni aritmética en el navegador.

## Nombres

- Vocabulario del dominio en español, igual que la spec de producto: `Cuenta`, `Dinero`, `MisCuentas`, `cerrarSesion`.
- Componentes en `PascalCase`, funciones y variables en `camelCase`, hooks con `use` (`useSesion`), constantes de módulo en `MAYUSCULAS_CON_GUIONES`.
- Verbos en funciones (`formatearDinero`, `interpretarError`), sustantivos en datos. Booleanos que se leen como pregunta (`estaAbierto`, `enCurso`).

## Pruebas

- Probar lo que ve y hace el usuario: consultas por rol y nombre accesible, interacción con `user-event`, red simulada con MSW. Nunca el estado interno ni las clases CSS.
- Temporizadores falsos o el reloj de Playwright: ninguna prueba espera tiempo real.
- Un comportamiento por prueba, Arrange / Act / Assert, título `FNNN_ID_Escenario_Resultado`.

Si `CLAUDE.md` del proyecto tiene otras convenciones, esas mandan sobre esta skill.

## Explicar las decisiones

El usuario está aprendiendo frontend y diseño de software. Cuando tomes una decisión que no sea obvia, explícala en una o dos frases en español nombrando el principio (por ejemplo: "Saqué `evaluarReloj` del componente como función pura: así se prueba con números, sin montar React ni esperar"). No expliques lo trivial.

## Al revisar código

1. Recorre [checklist.md](checklist.md).
2. Reporta los problemas ordenados por impacto, no por orden de aparición.
3. Por cada uno: qué principio rompe, por qué importa aquí y un antes/después mínimo.
4. No reescribas todo el archivo; propone el cambio más pequeño que arregla el problema.
5. Si algo "rompe" un principio pero es la opción más simple y el cambio no se ve venir, dilo y déjalo (KISS/YAGNI ganan).

## Referencias

- [principles.md](principles.md): cada principio con un ejemplo malo y uno bueno en TypeScript y React. Leerlo cuando haya dudas sobre cómo aplicar uno.
- [checklist.md](checklist.md): lista de revisión.
