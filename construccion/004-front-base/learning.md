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

---

# Aprendizaje — 004 Front base (bloque 004b: el backoffice)

Lo nuevo de este bloque: formularios con validación, acciones que cambian datos (mutaciones) y un secreto que se muestra una sola vez.

## 1. Mapa del código (lo que añade 004b)

```
src/
  app/rutas.tsx                    ahora /backoffice (búsqueda), /backoffice/clientes/:clienteId (ficha) y una ruta "*" propia
  comun/componentes/Campo.tsx      etiqueta + control + error, unidos por id (accesibilidad de los formularios)
  backoffice/
    BuscarCliente.tsx              tipo y número de documento; el número vive solo en el estado del componente
    FormularioDeRegistro.tsx       React Hook Form + Zod; un 400 de la API se pone junto a su campo
    esquemaDeRegistro.ts           las reglas de validación (Zod): la fuente de verdad del formulario
    FichaDeCliente.tsx             datos del cliente y lista de cuentas
    AbrirCuenta.tsx                selector de moneda y botón con estado "en curso"
    AccionesDeCuenta.tsx           solo los botones que RN-14 permite; "Cerrar" pide confirmación
    AccesoDigital.tsx              estado del acceso, acciones y confirmaciones
    DialogoDeClaveTemporal.tsx     la clave temporal, una sola vez
    acciones.ts                    funciones puras: estado -> acciones permitidas, y la conversión de textos libres a tipos cerrados
    consultas.ts                   todos los hooks de TanStack Query del backoffice (consultas y mutaciones)
infra/nginx/default.conf           una location propia para la búsqueda por documento (RNF-04)
```

## 2. Recorrido de una interacción: de "Buscar" a "Bloquear" una cuenta

1. **Escribes `1.234.567` y pulsas "Buscar".** `BuscarCliente` guarda lo que escribes en su propio estado (`useState`): nunca en la URL, en `history` ni en un almacenamiento.
2. El formulario llama `buscar.mutate(documento)` (`useBuscarClientePorDocumento`, en `consultas.ts`) -> `api.GET('/clientes/por-documento?...')` -> nginx -> BFF (pone el token) -> API.
3. **Si responde 200**, la mutación trae la ficha y `BuscarCliente` navega a `/backoffice/clientes/{id}`: la URL lleva el id del cliente, no su documento. **Si responde 404**, aparece "No hay un cliente con ese documento" y "Registrarlo", que abre `FormularioDeRegistro` con el tipo y el número ya escritos.
4. `FichaDeCliente` lee el `id` de la URL (`useParams`) y `useFicha(id)` pide `GET /clientes/{id}` con la clave `['ficha', id]`. Pinta los datos, y por cada cuenta una fila con `formatearSaldo`.
5. `AccesoDigital` hace **su propia consulta** (`['acceso', id]`): si identidad falla (502/503), la ficha sigue visible y solo esa tarjeta dice "Estado del acceso no disponible".
6. **Pulsas "Bloquear".** `AccionesDeCuenta` llama `cambiar.mutate({ cuentaId, accion: 'Bloquear' })` -> `POST /cuentas/{id}/bloquear`. Mientras viaja, el botón queda `disabled` (`Boton enCurso`).
7. Con éxito, `onSuccess` ejecuta `invalidateQueries(['ficha', id])`: TanStack Query vuelve a pedir la ficha y la fila pasa a "Bloqueada", ahora con el botón "Desbloquear". Si la API dijera 409 (otro operador la cambió antes), se muestra el mensaje y la ficha se recarga igual, para ver el estado real.

## 3. Conceptos clave

### 3.1 Mutaciones: acciones que cambian datos

- **Qué problema resuelve:** una consulta (`useQuery`) pide datos y se puede repetir sin riesgo. Una acción como "bloquear" o "habilitar" cambia algo en el servidor, y repetirla sola podría hacerlo dos veces.
- **Dónde:** `backoffice/consultas.ts` (`useMutation`) y `app/clienteDeConsultas.ts` (`retry: 0` y `gcTime: 0` para todas). `Boton` con `enCurso` impide el doble clic: el segundo clic llega a un botón ya deshabilitado.
- **Analogía:** consultar es mirar un escaparate; mutar es pagar en caja. Mirar dos veces no cuesta nada, pagar dos veces sí: por eso la caja no "reintenta sola" y se cierra mientras cobra.
- **Un detalle no obvio:** `onSuccess` devuelve la promesa de `invalidateQueries`. Así la mutación sigue "en curso" hasta que la ficha se recarga, y el botón no se habilita antes de ver el resultado.

### 3.2 Formularios con React Hook Form y Zod

- **Qué problema resuelve:** un formulario con seis campos necesita guardar lo escrito, validar, mostrar el error junto a cada campo y marcar el campo como inválido para los lectores de pantalla. A mano son muchos `useState`.
- **Dónde:** `esquemaDeRegistro.ts` (las reglas, escritas una sola vez con Zod), `FormularioDeRegistro.tsx` (`useForm` con `zodResolver`; `register('correo')` conecta cada campo) y `Campo.tsx` (etiqueta, `aria-invalid`, `aria-describedby`).
- **Dos fuentes de error, un solo lugar:** Zod avisa en el navegador (por ejemplo, un teléfono sin `+`). Si aun así la API responde 400 con `errors`, `setError` pone ese mensaje en el mismo campo. **El navegador avisa; la API decide.**
- **Analogía:** Zod es el formulario de la ventanilla que revisa que no falte nada antes de pasar; la API es el funcionario que, aunque todo esté completo, todavía puede rechazar el trámite. En C# se parecería a FluentValidation en el cliente más la validación del servidor.
- **Un detalle no obvio:** la regla del número de documento depende del tipo (CC/CE o PA), así que es una regla del objeto entero (`.refine`) con `when: () => true`. Sin eso, Zod no la corre si otro campo ya falló, y el operador vería los errores de a uno.

### 3.3 "Parsear en la frontera": textos libres a tipos cerrados

- **Qué problema resuelve:** el contrato publica `estado` como `string`. Si la API un día manda `"Suspendida"`, la app no debe adivinar qué acciones ofrecer.
- **Dónde:** `acciones.ts` (`comoEstadoDeCuenta` devuelve `null` si no lo conoce; `comoEstadoDelAcceso` devuelve `'no-disponible'`). Un estado desconocido se muestra tal cual y **sin botones**. `primerIngresoPendiente` es `boolean | null`: solo `true` dice algo; `null` significa "no sé", no "no".
- **Analogía:** el portero que solo deja pasar a quien está en la lista. Quien no aparece no entra, aunque tenga cara de invitado.

### 3.4 Un secreto que se muestra una sola vez

- **Qué problema resuelve:** la clave temporal no debe quedar en ningún sitio después de entregarla: ni en pantalla, ni en la caché, ni en la URL, ni en un almacenamiento.
- **Dónde:** `AccesoDigital.tsx` (la clave solo existe en `habilitar.data`), `DialogoDeClaveTemporal.tsx` (sin `alCerrar`: no se cierra con Esc ni con un clic fuera) y "Ya la entregué", que llama `habilitar.reset()`. Con `gcTime: 0` la mutación sale de la caché en cuanto nadie la observa.
- **Analogía:** una nota en un papel que lees y entregas: no la fotocopias. `reset()` es romper el papel y `gcTime: 0` es vaciar la papelera en el acto.
- **Otro detalle:** el título del diálogo usa la `accion` que devolvió la API, no el botón que se pulsó. Si el operador pulsó "Habilitar" con la pantalla desactualizada y la API restableció, el diálogo dice "Restablecido".

### 3.5 Una URL no es un lugar para datos personales

- **Qué problema resuelve:** el número de documento en una URL queda en el historial, en los logs y puede llegar en `Referer`. Por eso el documento vive solo en el estado de `BuscarCliente` y la ficha se abre por `id`.
- **Dónde:** `BuscarCliente.tsx` (el registro se abre **dentro** del componente, no en otra ruta) y `consultas.ts` (la búsqueda es una mutación, no una consulta: el documento no entra en una clave de caché). La petición sí lleva el documento en su consulta (`GET ...?numeroDocumento=`), así que en `infra/nginx/default.conf` esa ruta tiene su propia `location` con el `error_log` en `crit`: sin eso, nginx escribiría la línea completa de la petición cuando el BFF falla.
- **Analogía:** gritar el número de cédula en la fila del banco frente a susurrarlo en la ventanilla. La URL es la fila: todos la oyen.

## 4. Decisiones de esta implementación que conviene conocer

- `/backoffice/*` tiene su propia ruta `*` que lleva a la búsqueda. Sin ella, una ruta mal escrita caía en la `*` del área del cliente y el operador veía la pantalla de "otra sesión abierta".
- El tipo de documento es un `<select>` nativo: ya es accesible y se maneja con teclado; un Select de React Aria no aportaba nada aquí.
- `@hookform/resolvers` es la pieza que une RHF y Zod; ADR-0022 la nombra (6.0.0), pero esa versión declara `effect@^4` como peer opcional y `npm` no la resuelve junto al resto. Se instaló la 7.0.0, que instala limpio con RHF 7.91.0 y Zod 4.6.7. El autor lo aceptó el 2026-11-02 como desviación (opción a), en lugar de forzar la 6.0.0 con `--legacy-peer-deps`, que solo esconde el conflicto y obligaría a repetirlo en cada `npm ci`. ADR-0022 se actualiza en el próximo PR de `core-bancario`.
- `esquemaDeRegistro.ts` llama `z.config({ jitless: true })` antes de crear el primer esquema. Zod 4 intenta `new Function('')` para compilar sus validadores; lo atrapa si falla, pero la CSP de nginx (`script-src 'self'`, sin `unsafe-eval`) hace que el navegador anote una violación en cada carga, y la prueba real `F004_RNF03_*` exige cero violaciones. Una consecuencia de que la CSP sea estricta: cada librería nueva se prueba también contra ella.
- "Habilitar" y "Restablecer" llaman al mismo endpoint (`POST .../acceso-digital/habilitar`): la API decide cuál de las dos hizo y lo dice en `accion`.

## 5. Para practicar (Copiar -> Modificar -> Recrear)

1. **Una regla de validación nueva.** _Copiar:_ lee `esquemaDeRegistro.ts` y la prueba `esquemaDeRegistro.test.ts` del teléfono. _Modificar:_ haz que el teléfono acepte también 7 dígitos tras el `+` y mira qué pruebas fallan y por qué. _Recrear:_ añade un campo "Dirección" opcional (de 0 a 200 caracteres) al esquema, con dos pruebas, sin mirar cómo se hizo con `nombres`.
2. **Otra acción con confirmación.** _Copiar:_ sigue cómo `AccionesDeCuenta` pide confirmar "Cerrar" con `DialogoDeConfirmacion`. _Modificar:_ haz que "Bloquear" también pida confirmación y observa qué prueba de `FichaDeCliente.test.tsx` se rompe (¿qué dice eso de la prueba?). _Recrear:_ escribe un componente `ConfirmarYEjecutar` mínimo que reciba el texto y la acción, y úsalo en las dos.
3. **Un estado nuevo.** _Copiar:_ mira `accionesDeCuenta` y `comoEstadoDeCuenta` en `acciones.ts`. _Modificar:_ añade el estado `'Suspendida'` a `EstadoDeCuenta` y comprueba qué te obliga a cambiar el compilador (el `switch` sin `default` es la pista). _Recrear:_ define qué acciones tendría `Suspendida`, escribe primero la prueba en `acciones.test.ts` y luego el código.
