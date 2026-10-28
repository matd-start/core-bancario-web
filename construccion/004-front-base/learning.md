# Aprendizaje — 004 Front base (bloque 004a)

Para alguien que ve estos patrones de frontend por primera vez. Viene de C#, así que cada concepto trae su equivalente aproximado.

## 1. Mapa del código

```
src/
  main.tsx                     punto de entrada: monta <Proveedores/> y carga los estilos
  app/
    proveedores.tsx            caché de consultas (TanStack Query) + ruteador
    rutas.tsx                  la tabla de rutas: qué pantalla va en cada URL
    areas.tsx                  un "layout" por área (cliente / backoffice) con su sesión y su protección
    clienteDeConsultas.ts      crearClienteDeConsultas(): reglas de reintento y refresco de la caché
  api/
    generado/                  tipos creados desde el OpenAPI (NO se editan)
    clientes.ts                clientes HTTP tipados + middleware (X-CSRF y 401)
    errores.ts / mensajes.ts   traducen un error de la API a un texto para la persona
  comun/
    dinero.ts                  formatearDinero: texto -> "$ 1.234.567" sin perder dígitos
    componentes/               piezas sin dominio: Boton, Dialogo, Pagina, Cargando, MensajeDeError...
    estilos/base.css           estilos base (foco visible, mobile-first)
  sesion/
    relojDeSesion.ts           lógica pura: ¿normal, aviso o vencida?
    registroDeActividad.ts     lógica pura: un latido al BFF cada 15 s como máximo
    canalDeSesion.ts           mensajes entre pestañas (BroadcastChannel)
    coordinadorDeSesion.ts     "cierre único" + canal, fuera de React
    contextoDeSesion.ts        el contexto y los hooks useSesion / useClienteDeLaApi
    ProveedorDeSesion.tsx      el componente que junta todo lo anterior
    AreaProtegida.tsx          decide qué se ve según el estado de la sesión
    PantallaDeInicio, SinPermiso, OtraSesionAbierta, AvisoDeSesion, BotonCerrarSesion
    avisos.ts / useAvisoDeLaUrl.ts   mensajes que llegan en ?aviso=
  cliente/                     MisCuentas, DetalleDeCuenta, BotonCambiarClave, consultas.ts
  backoffice/                  InicioDelBackoffice
  pruebas/                     setup de Vitest y utilidades (MSW)
infra/nginx/                   nginx: SPA, proxy al BFF y CSP
e2e/                           Playwright (simulado y real)
```

Regla de lectura: las carpetas **de abajo hacia arriba** (`comun`, `api`) no conocen a las de arriba (`cliente`, `sesion`). Es la misma idea de capas que en el backend: las dependencias apuntan hacia lo más estable.

## 2. Recorrido de una interacción: de "Iniciar sesión" a ver el saldo

1. **Escribes `http://localhost:5173/mis-cuentas`.** nginx (en Docker) no tiene esa ruta como archivo, así que entrega `index.html` (`try_files` en `default.conf`). El navegador carga el JS.
2. **`main.tsx`** monta `<Proveedores/>`: la caché de consultas y el ruteador de React Router.
3. El ruteador ve `/mis-cuentas` y dibuja el layout `AreaDelCliente` (`areas.tsx`): `ProveedorDeSesion` > `AreaProtegida` > la pantalla.
4. **`ProveedorDeSesion`** al montarse llama `GET /bff/sesion` (cliente del BFF). Mientras espera, `AreaProtegida` muestra `Cargando`.
5. **SPA → nginx → BFF.** El BFF mira la cookie `HttpOnly` (el navegador la manda sola; JavaScript ni la ve). Sin sesión responde 401 y el estado pasa a `sin-sesion`: `AreaProtegida` muestra `PantallaDeInicio`.
6. **Clic en "Iniciar sesión".** `iniciarSesion('/mis-cuentas')` hace `window.location.assign('/bff/iniciar-sesion/clientes?regreso=/mis-cuentas')`: una navegación **completa** (no `fetch`), porque va a salir hacia Keycloak.
7. **BFF → Keycloak.** Documento, clave, segundo factor... Al terminar, Keycloak devuelve un código al BFF; el BFF lo canjea por tokens _por el canal trasero_, los guarda en su memoria y redirige a `/mis-cuentas` con la cookie. **El navegador nunca ve un token.**
8. Ahora `GET /bff/sesion` responde 200 con `SesionDto` (área, usuario, rol y _segundos_ que faltan para cada cierre). `ProveedorDeSesion` guarda la sesión, el estado es `abierta` y `AreaProtegida` deja pasar a `MisCuentas`.
9. **`MisCuentas`** llama `useMisCuentas()` (`cliente/consultas.ts`) -> TanStack Query ejecuta `api.GET('/mis-cuentas')`.
10. El **middleware** del cliente añade `X-CSRF: 1`. La petición va a nginx -> BFF (que añade `Authorization: Bearer ...` y la reenvía) -> API -> PostgreSQL.
11. Vuelve la lista de `CuentaDto`. TanStack Query la guarda en la caché con la clave `['mis-cuentas']`. El componente se redibuja con `data`.
12. Para cada cuenta, `formatearSaldo` llama `formatearDinero`: el **texto** `"1234567"` va a `Intl.NumberFormat('es-CO', ...)` y sale `"$ 1.234.567"`.

Si en el paso 10 la API dijera 401 (sesión vencida), el middleware llama a `alTerminarSesion`; `ProveedorDeSesion` vacía la caché, avisa a las otras pestañas y hace `location.replace('/?aviso=inactividad')`.

## 3. Conceptos clave

### 3.1 Estado del servidor con TanStack Query

- **Qué problema resuelve aquí:** los saldos y las cuentas son de la API; la pantalla solo tiene una _copia_ que puede quedar vieja. Sin una librería habría que escribir a mano `useEffect` + `fetch` + estados de carga/error + reintentos.
- **Dónde:** `cliente/consultas.ts` (`useQuery`), `app/clienteDeConsultas.ts` (reglas globales: 1 reintento salvo 401/403/404; las mutaciones nunca reintentan), `MisCuentas.tsx` (los tres estados: cargando, error con "Reintentar", vacío).
- **Analogía:** un tablero de vuelos en el aeropuerto. No es tuyo; lo consultas, se actualiza solo y si se cae la conexión el tablero lo dice. Y al cerrar sesión se **borra el tablero entero** (`clienteDeConsultas.clear()`), para que "atrás" no muestre saldos.

### 3.2 Middleware de `fetch` (openapi-fetch)

- **Qué problema resuelve:** cada petición debe llevar `X-CSRF: 1`, y cada 401 significa "tu sesión terminó". Repetir eso en cada llamada sería un error esperando a ocurrir.
- **Dónde:** `api/clientes.ts`, `crearMiddlewareDeSesion`. `onRequest` pone el encabezado; `onResponse` mira el 401 y llama al callback con el motivo.
- **Analogía:** el portero de un edificio. Todo el que entra o sale pasa por él: a los que entran les pone la pulsera (`X-CSRF`) y si alguien sale diciendo "me echaron", avisa a administración. En C# sería un `DelegatingHandler` de `HttpClient`.

### 3.3 Sesión sin tokens + reloj en el cliente

- **Qué problema resuelve:** un token que JavaScript puede leer lo puede robar un script malicioso. Aquí la SPA solo tiene una cookie `HttpOnly`, y la **inactividad la mide el BFF**: la SPA solo manda un "latido" (`POST /bff/actividad`) cuando la persona hace clic, pulsa una tecla o cambia de pantalla (nunca por mover el ratón ni por refrescos automáticos).
- **Dónde:** `registroDeActividad.ts` (límite de un latido cada 15 s), `relojDeSesion.ts` (el servidor manda _duraciones_, no fechas, y la SPA las suma a su hora local), `ProveedorDeSesion.tsx` (un solo `setTimeout` que despierta en el siguiente cambio).
- **Analogía:** el reloj de un parqueadero. El BFF tiene el reloj oficial; la SPA es el vigilante que mira un cronómetro y avisa 60 s antes de que se cumpla el tiempo. Cada vez que alguien "se mueve de verdad", el vigilante le pide al reloj oficial que reinicie la cuenta.

### 3.4 Componentes accesibles (React Aria)

- **Qué problema resuelve:** un diálogo bien hecho exige atrapar el foco, devolverlo al cerrar, ocultar el fondo a los lectores de pantalla, funcionar con teclado y poder **no** cerrarse por accidente. Hacerlo a mano es muy fácil de hacer mal.
- **Dónde:** `comun/componentes/Dialogo.tsx` (sobre `ModalOverlay`, `Modal`, `Dialog`) y `sesion/AvisoDeSesion.tsx` (`role="alertdialog"`). Las pruebas con axe (`e2e/simulado/accesibilidad.spec.ts`) verifican WCAG AA.
- **Analogía:** un cinturón de seguridad. No cambia a dónde vas (tus estilos y tu contenido), pero evita los accidentes que sí o sí ocurren si lo improvisas.

### 3.5 Dinero como texto

- **Qué problema resuelve:** `number` en JavaScript es un `double`: `9007199254740993` se vuelve `...992`. En dinero eso es inaceptable.
- **Dónde:** `comun/dinero.ts`. La API manda el monto como `string`, y `Intl.NumberFormat.format` acepta ese texto directamente, sin pasar por `number`. Se valida con una expresión regular y un _type guard_ (`monto is \`${number}\``) para no usar `as`.
- **Analogía:** en C# es la diferencia entre `double` y `decimal`. Aquí el "decimal" es simplemente **no convertir**: el texto viaja intacto hasta el formateador.

### 3.6 Estado fuera de React cuando React no puede tenerlo

- **Qué problema resuelve:** los clientes HTTP se crean durante el render y necesitan saber "¿ya se está cerrando la sesión?". El linter de React no deja leer `useRef` en el render.
- **Dónde:** `sesion/coordinadorDeSesion.ts`: una función que devuelve un objeto con variables privadas (un _closure_) y se guarda con `useState(crearCoordinadorDeSesion)`.
- **Analogía:** en C# sería un objeto pequeño con un campo privado `bool _cerrando` que inyectas por constructor.

## 4. Decisiones de esta implementación que conviene conocer

- `crearClienteDeConsultas()` es el nombre elegido para la configuración de TanStack Query (el plan no daba firma).
- `useSesion` vive en `sesion/contextoDeSesion.ts` y no en `ProveedorDeSesion.tsx`: la regla `react-refresh/only-export-components` exige que un archivo de componentes exporte solo componentes. `ProveedorDeSesion.tsx` re-exporta los tipos, así que las rutas de importación de las pruebas no cambian.
- `Sesion` ganó dos campos respecto al plan: `area` y `cerrarYContinuar` (CL-10: cerrar la sesión de la otra área y seguir hacia el inicio de sesión de esta).
- `crearClienteDeLaApi` y `crearMiddlewareDeSesion` aceptan un segundo parámetro opcional `alSerProhibido`: un 403 de la API pone la pantalla de "sin permiso" (CL-04). Las pruebas siguen funcionando con un solo argumento.
- Con el aviso de sesión abierto la SPA **deja de contar** clics y teclas como actividad: pulsar Tab para moverse por el diálogo no debe renovar la sesión. Solo "Seguir conectado" lo hace.
- Los segundos del `SesionDto` llegan como `number | string` (pattern de .NET 10). `aPlazosLocales` los convierte con `Number.isFinite`; un valor ilegible cuenta como 0 (cierra la sesión: lo más seguro).

## 5. Para practicar (Copiar -> Modificar -> Recrear)

1. **Un mensaje de aviso nuevo.** _Copiar:_ mira cómo `MENSAJES_DE_AVISO` en `sesion/avisos.ts` enlaza un código (`'inactividad'`) con un texto, y cómo lo usa `PantallaDeInicio`. _Modificar:_ cambia el texto de `'sesion-cerrada'` y ejecuta `npm test -- avisos`: ¿qué pruebas siguen verdes y cuáles no? _Recrear:_ agrega un aviso `'mantenimiento'` de punta a punta (tipo, mensaje, prueba) sin mirar el código existente.
2. **Mostrar la moneda en el detalle.** _Copiar:_ lee `formatearSaldo` en `comun/dinero.ts` y su uso en `DetalleDeCuenta.tsx`. _Modificar:_ agrega una línea "Saldo en texto" que muestre `cuenta.saldo.monto` sin formatear y compáralo con el formateado para un saldo grande (`12345678901234.56`). _Recrear:_ escribe desde cero una función `formatearPorcentaje(texto: string)` con `Intl.NumberFormat` que tampoco use `Number`, con dos pruebas.
3. **Un latido más lento.** _Copiar:_ abre `registroDeActividad.ts` y `registroDeActividad.test.ts` y sigue cómo el temporizador falso controla el tiempo. _Modificar:_ cambia `INTERVALO_MINIMO_ENTRE_LATIDOS_MS` a 30 s y observa qué pruebas fallan y por qué (¿qué dicen sobre el diseño?). _Recrear:_ escribe una prueba nueva, con el temporizador falso, que compruebe que `vaciar()` dos veces seguidas envía el pendiente una sola vez.
