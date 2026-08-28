# Rosita – Carnicería Premium 🥩

Página estática de la lista de precios de **Rosita Carnicería Premium**, pensada para publicarse en **GitHub Pages**.

## Objetivo

Que cualquier cliente pueda:

1. **Entrar al link** desde el celular y ver la lista de precios actualizada, organizada por Vacuno / Cerdo / Pollo.
2. **Agregar productos** con un toque y ajustar cantidades, viendo el **total estimado** en tiempo real, sin necesidad de hacer cuentas.
3. **Enviar el pedido por WhatsApp** con un solo toque: el botón arma automáticamente un mensaje con el detalle de los productos, las cantidades y el total, y lo abre directo en el WhatsApp de la carnicería (**+54 9 11 6624-6009**).

La idea es bajar la fricción entre "ver la lista" y "hacer el pedido", sin necesidad de una app ni de un sistema de pagos: todo el cierre de la venta sigue pasando por WhatsApp, como ya lo hace el negocio.

## Estructura del proyecto

```
├── index.html                    # Estructura de la página, engancha todo lo demás
│
├── data/
│   └── products.json             # LOS DATOS — nuestra "API": precios, categorías, WhatsApp
│
├── css/
│   └── styles.css                # Estilos generales de la página (layout, carrito, footer)
│
├── js/
│   ├── app.js                    # LÓGICA: carrito, totales, fetch de products.json, mensaje de WhatsApp
│   ├── pricing.js                # Cálculo de precios (por kilo / por unidad), compartido por cards y app
│   ├── preparation.js            # Opciones de preparación (ej: "Para milanesa") — datos listos, sin UI todavía
│   └── components/
│       ├── cards.js              # Componente: grilla de cards de producto (autocontenido, su propio CSS)
│       ├── nav.js                # Componente: barra de navegación flotante (autocontenido, su propio CSS)
│       └── icons.js              # Íconos SVG minimalistas de animales, usados por cards y nav
│
├── assets/
│   └── logo.png                  # Logo de Rosita
│
└── rediseno-cards.md             # Spec de diseño de las cards (referencia histórica)
```

### Por qué está organizado así

- **`data/`** es la única fuente de verdad de precios y categorías — pensala como la "API" del sitio, aunque sea un archivo estático. `js/app.js` la lee con `fetch()` al cargar la página.
- **`js/components/`** son piezas de UI autocontenidas: cada una (`cards.js`, `nav.js`) inyecta su propio `<style>` y no depende de reglas sueltas en `css/styles.css`. Si tenés que tocar cómo se ve o se comporta la nav o las cards, el archivo que buscás está ahí adentro — no hay estilos escondidos en otro lado.
- **`js/app.js`** es la lógica de negocio: mantiene el estado del carrito, calcula el total, arma el mensaje de WhatsApp y le pasa handlers (`onIncrement` / `onDecrement`) a los componentes. No sabe nada de cómo se pinta una card, solo de los datos.
- **`css/styles.css`** solo tiene estilos de layout general (header, footer, carrito, modal) — todo lo que es específico de un componente vive con ese componente.

## Cómo actualizar los precios

Todos los precios viven en [`data/products.json`](data/products.json), agrupados por categoría (`vacuno`, `cerdo`, `pollo`). Cada producto tiene esta forma:

```json
{
  "name": "Vacío",
  "cut": "Cortes magros",
  "min": "Pieza ~5 kg",
  "venta": {
    "kilo": { "precioPorKg": 23000 },
    "unidad": { "precioPorKg": 21000, "pesoAproxKg": 5 }
  }
}
```

El objeto `"venta"` define cómo se puede comprar el producto:

- **`"kilo"`** — se vende cortado a pedido, precio por kilogramo (`precioPorKg`). El cliente suma/resta de a 1 kg.
- **`"unidad"`** — se vende la pieza entera, con un precio por kilo (`precioPorKg`) y un peso aproximado de la pieza (`pesoAproxKg`). El precio final por unidad se calcula como `precioPorKg × pesoAproxKg` (ej: pieza de ~5 kg a $21.000/kg = $105.000 la unidad).
- Un producto puede tener **uno solo** de los dos modos (se agrega directo al carrito, como antes) o **ambos** (al tocar "Agregar" aparece un modal para elegir "Por Kilo" o "Por Unidad").
- Un producto **sin precio todavía** se representa con `"venta": {}` — la card muestra "Consultar precio" y no tiene botón de agregar.
- Para agregar o quitar productos, sumar o borrar objetos dentro del array `"items"` de la categoría correspondiente.
- El número de WhatsApp también vive ahí, en `"whatsappNumber"` (arriba del todo del JSON).
- No hace falta tocar ningún archivo `.js` ni `.html` para actualizar precios: todo se renderiza automáticamente desde `data/products.json`. El cálculo de precios (`js/pricing.js`) es compartido entre las cards y el carrito, así que solo hay un lugar donde se define la matemática.

## Opciones de preparación (dato listo, todavía sin selector en la compra)

Algunos productos se pueden pedir de más de una forma además de "tal cual viene" — por ejemplo, el Peceto se puede llevar entero o cortado para milanesa. Eso se declara con `"opcionesPreparacion"`:

```json
{ "name": "Peceto", "cut": "Para milanesa", "min": "Pieza ~2 kg", "venta": { ... }, "opcionesPreparacion": ["Para milanesa"] }
```

- El default es **siempre** "Sin manipular" (la pieza tal cual) — es universal, no hace falta declararlo en cada producto.
- `"opcionesPreparacion"` es un array con las opciones **extra** que tiene ese producto puntual, además del default. Si no está el campo, el producto solo se entrega "Sin manipular".
- `js/preparation.js` lee este dato (`Preparation.getOptions(item)` devuelve el default + las opciones extra; `Preparation.hasChoice(item)` dice si hay algo para elegir).
- **Esto es solo el modelo de datos.** Todavía no hay ningún selector en el flujo de compra para elegirlo — es la base lista para cuando se arme ese paso (que probablemente viva en el mismo modal de detalle que ya existe para elegir "por kilo / por unidad", como un paso posterior y opcional).

## Cómo probarlo en local

Como `js/app.js` usa `fetch()` para leer `data/products.json`, **no alcanza con abrir `index.html` con doble clic** (los navegadores bloquean `fetch` a archivos locales por seguridad). Hace falta un servidor mínimo:

```bash
python -m http.server 8000
```

Y abrir `http://localhost:8000` en el navegador.

## Cómo publicar en GitHub Pages

1. Subí este repositorio a GitHub (si todavía no lo hiciste):
   ```bash
   git add .
   git commit -m "Sitio de lista de precios"
   git push origin main
   ```
2. En GitHub, andá a **Settings → Pages**.
3. En **Source**, elegí la rama `main` y la carpeta `/ (root)`.
4. Guardá. En unos minutos el sitio va a estar disponible en:
   `https://<tu-usuario>.github.io/<nombre-del-repo>/`

No requiere build ni dependencias: es HTML/CSS/JS puro, así que funciona tal cual con GitHub Pages (que sirve archivos estáticos igual que el servidor local de arriba).

## Notas

- Los precios son por kilogramo; el total del pedido es **estimado**, ya que el peso final de cada pieza puede variar (aclarado también dentro del carrito).
- El número de WhatsApp está en `data/products.json` (`whatsappNumber`) y en el footer de `index.html` — actualizarlo en ambos lugares si cambia.
