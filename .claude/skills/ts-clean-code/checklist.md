# Checklist de revisión TypeScript y React

## Tipos

- [ ] No hay `any`, ni `!` para callar al compilador, ni `as` que esconda un tipo mal modelado.
- [ ] Lo que entra de fuera (red, `BroadcastChannel`, parámetros de la URL) es `unknown` hasta comprobarlo.
- [ ] Los estados con varias formas son uniones discriminadas, y los `switch` sobre ellas son exhaustivos (`never`).
- [ ] Los tipos del contrato vienen de `src/api/generado/`, sin copias a mano.

## Componentes y hooks

- [ ] Cada componente tiene una sola responsabilidad; la lógica no trivial está en funciones puras o hooks.
- [ ] No hay `useEffect` que copie props o estado a otro estado (estado derivado se calcula al pintar).
- [ ] Cada suscripción (`addEventListener`, `setTimeout`, canal) se limpia al desmontar.
- [ ] El estado del servidor está en TanStack Query, no duplicado en `useState`.
- [ ] Las mutaciones no se reintentan solas (`retry: 0`) y deshabilitan su botón mientras están en curso.
- [ ] No hay props, opciones ni abstracciones sin un requisito actual (YAGNI).

## Seguridad

- [ ] Nada sensible en `localStorage`, `sessionStorage`, rutas, `history.state` ni `console`.
- [ ] No hay `dangerouslySetInnerHTML` ni `fetch` fuera de los clientes de `src/api/`.
- [ ] Los mensajes de error salen de `codigo`, nunca de `detail`.

## Accesibilidad

- [ ] Elementos semánticos (`button` para acciones, `a` para navegación) y nombre accesible en cada control.
- [ ] Los diálogos atrapan el foco y lo devuelven; los que no deben cerrarse por accidente no se cierran con clic fuera ni Escape.
- [ ] Los cambios importantes se anuncian (`status`/`alert`) y el foco es visible.

## Dinero y dominio

- [ ] Los montos se tratan como texto y se formatean con `Intl.NumberFormat`; ninguna conversión a `number`.
- [ ] Vocabulario del dominio en español, igual que la spec de producto.

## Legibilidad

- [ ] Funciones cortas con retornos tempranos, sin anidación profunda (KISS).
- [ ] Nombres completos, verbos en funciones, booleanos como pregunta.
- [ ] Sin números ni textos mágicos: constantes con nombre (`ANTICIPO_DEL_AVISO_MS`).

## Pruebas

- [ ] Las pruebas consultan por rol y nombre, no por clases ni estructura interna.
- [ ] Ninguna prueba depende del tiempo real ni del orden de ejecución.
- [ ] Los casos nuevos tienen al menos el camino feliz y el error esperado.
