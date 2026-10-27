# Principios con ejemplos en TypeScript y React

Los ejemplos usan un dominio de pedidos (no el de este proyecto), para que se vea el principio y no la solución de una tarea. Cada uno muestra el problema, la versión mejorada y cuándo **no** hace falta aplicarlo.

---

## Una sola responsabilidad (S de SOLID, en componentes)

**Mal:** el componente pide los datos, decide qué mostrar, calcula y pinta. Cambiar la regla del total obliga a tocar el componente y a probarlo con red.

```tsx
function ListaDePedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  useEffect(() => {
    fetch('/api/pedidos')
      .then((r) => r.json())
      .then(setPedidos);
  }, []);
  const total = pedidos.reduce((suma, p) => suma + p.precio * p.cantidad, 0);
  return <p>Total: {total}</p>;
}
```

**Bien:** la consulta vive en un hook, la regla en una función pura y el componente solo pinta.

```tsx
export function totalDelPedido(lineas: readonly Linea[]): number {
  return lineas.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0);
}

export function useMisPedidos() {
  return useQuery({ queryKey: ['pedidos'], queryFn: obtenerPedidos });
}

function ListaDePedidos() {
  const consulta = useMisPedidos();
  if (consulta.isPending) return <Cargando />;
  if (consulta.isError) return <MensajeDeError alReintentar={() => void consulta.refetch()} />;
  return <p>Total: {totalDelPedido(consulta.data)}</p>;
}
```

**No hace falta** separar un componente de 20 líneas que solo pinta lo que recibe.

---

## Uniones discriminadas en vez de booleanos sueltos

**Mal:** cuatro combinaciones posibles, dos de ellas absurdas (`cargando` y `error` a la vez).

```ts
interface EstadoDelEnvio {
  cargando: boolean;
  error?: string;
  numeroDeGuia?: string;
}
```

**Bien:** cada estado trae justo los datos que tiene sentido tener, y el compilador obliga a tratarlos todos.

```ts
type EstadoDelEnvio =
  { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'enviado'; numeroDeGuia: string };

function describir(estado: EstadoDelEnvio): string {
  switch (estado.tipo) {
    case 'cargando':
      return 'Preparando…';
    case 'error':
      return estado.mensaje;
    case 'enviado':
      return `Guía ${estado.numeroDeGuia}`;
    default: {
      const imposible: never = estado; // si mañana aparece otro estado, esto no compila
      return imposible;
    }
  }
}
```

**No hace falta** si de verdad solo hay dos estados independientes (por ejemplo, `abierto` de un menú).

---

## `unknown` en las fronteras, nunca `any`

**Mal:** `any` apaga el compilador en todo lo que toca; el error aparece lejos, en otra pantalla.

```ts
canal.onmessage = (evento: MessageEvent<any>) => {
  cerrarPorMotivo(evento.data.motivo); // ¿y si otro código envía otra cosa?
};
```

**Bien:** lo que llega de fuera es `unknown` hasta comprobarlo.

```ts
const mensajeDeCierre = z.object({ tipo: z.literal('cerrada'), motivo: z.enum(['inactividad', 'manual']) });

canal.onmessage = (evento: MessageEvent<unknown>) => {
  const mensaje = mensajeDeCierre.safeParse(evento.data);
  if (!mensaje.success) return;
  cerrarPorMotivo(mensaje.data.motivo);
};
```

---

## Estado derivado, no sincronizado

**Mal:** un `useEffect` copia un valor que ya se puede calcular. Hay un pintado con el dato viejo y dos fuentes de verdad.

```tsx
const [pedidosAbiertos, setPedidosAbiertos] = useState<Pedido[]>([]);
useEffect(() => {
  setPedidosAbiertos(pedidos.filter((p) => p.estado === 'abierto'));
}, [pedidos]);
```

**Bien:** se calcula al pintar.

```tsx
const pedidosAbiertos = pedidos.filter((p) => p.estado === 'abierto');
```

**Cuándo sí usar `useEffect`:** para sincronizar con algo **externo** a React (un temporizador, un canal, un evento del navegador), siempre con su limpieza.

```tsx
useEffect(() => {
  const id = setTimeout(alVencer, msHastaVencer);
  return () => clearTimeout(id);
}, [msHastaVencer, alVencer]);
```

---

## Depender de interfaces pequeñas (I y D de SOLID)

**Mal:** el componente recibe el cliente HTTP entero y sabe cómo se llama a la API.

```tsx
function BotonCancelar({ api, pedido }: { api: ClienteHttp; pedido: Pedido }) {
  return <button onClick={() => api.post(`/pedidos/${pedido.id}/cancelar`, {})}>Cancelar</button>;
}
```

**Bien:** recibe solo lo que necesita: una función con intención. Se prueba pasando una función falsa.

```tsx
function BotonCancelar({ alCancelar, enCurso }: { alCancelar: () => void; enCurso: boolean }) {
  return (
    <button type="button" onClick={alCancelar} disabled={enCurso} aria-busy={enCurso}>
      Cancelar
    </button>
  );
}
```

---

## KISS

**Mal:** una "fábrica de formateadores" configurable para dos monedas.

```ts
class FabricaDeFormateadores {
  private registro = new Map<string, Formateador>();
  registrar(moneda: string, f: Formateador) {
    this.registro.set(moneda, f);
  }
  obtener(moneda: string) {
    return this.registro.get(moneda) ?? new FormateadorPorDefecto();
  }
}
```

**Bien:** una función y una tabla.

```ts
const DECIMALES: Record<Moneda, number> = { COP: 0, USD: 2 };

export function formatearPrecio(texto: Intl.StringNumericLiteral, moneda: Moneda): string {
  const decimales = DECIMALES[moneda];
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(texto);
}
```

El `Record<Moneda, number>` además obliga a añadir la fila si mañana aparece otra moneda: el compilador avisa. Y `Intl.StringNumericLiteral` es el tipo de texto numérico que acepta `format`, así que no hace falta ningún `as`.

---

## DRY (el conocimiento, no las líneas)

**Mal:** el mismo mapa de códigos de error a mensajes copiado en dos pantallas; un día una lo actualiza y la otra no.

**Bien:** un único `Record<CodigoDeError, string>` en `src/api/mensajes.ts` y una función que lo usa. Si el contrato añade un código, no compila hasta escribir su mensaje.

**No es DRY roto:** dos componentes con un `<p className="ayuda">` parecido. Se parecen por casualidad, no comparten conocimiento.

---

## YAGNI

**Mal:** props "por si acaso" que nadie usa hoy.

```tsx
interface PropsDeTarjeta {
  titulo: string;
  variante?: 'primaria' | 'secundaria' | 'peligro' | 'fantasma';
  tamano?: 'xs' | 's' | 'm' | 'l' | 'xl';
  icono?: ReactNode;
  alPasarElRaton?: () => void;
}
```

**Bien:** solo lo que pide una pantalla de la spec. Añadir una prop cuando haga falta cuesta un minuto; mantener cinco que nadie usa cuesta en cada cambio.

---

## Pruebas: lo que ve el usuario

**Mal:** la prueba conoce la estructura interna; se rompe al cambiar una clase CSS aunque la pantalla funcione.

```tsx
expect(container.querySelector('.pedido-item__total')?.textContent).toBe('$ 10.000');
```

**Bien:** consulta como lo haría una persona (o un lector de pantalla).

```tsx
test('F009_CA03_PedidoConDosLineas_MuestraElTotal', async () => {
  render(<ListaDePedidos />);
  expect(await screen.findByText('Total: $ 10.000')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('status')).toHaveTextContent('Pedido cancelado');
});
```
