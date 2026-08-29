# Rosita – Carnicería Premium 🥩

Página estática de la lista de precios de **Rosita Carnicería Premium**, pensada para publicarse en **GitHub Pages**.

## Objetivo

Que cualquier cliente pueda:

1. **Entrar al link** desde el celular y ver la lista de precios actualizada, organizada por Vacuno / Cerdo / Pollo.
2. **Agregar productos** con un toque y ajustar cantidades, viendo el **total estimado** en tiempo real, sin necesidad de hacer cuentas.
3. **Completar nombre y dirección de entrega** (con timbre si hace falta) antes de enviar — son obligatorios, no deja mandar el pedido si faltan.
4. **Enviar el pedido por WhatsApp** con un solo toque: el botón arma automáticamente un mensaje con el detalle de los productos, las cantidades, el total y los datos de entrega, y lo abre directo en el WhatsApp de la carnicería (**+54 9 11 6624-6009**).

La idea es bajar la fricción entre "ver la lista" y "hacer el pedido", sin necesidad de una app ni de un sistema de pagos: todo el cierre de la venta sigue pasando por WhatsApp, como ya lo hace el negocio.

## Estructura del proyecto

`index.html` no tiene markup propio — es un shell que solo importa scripts. Cada pedazo de la página es un componente en `js/components/` que crea su propio DOM y su propio `<style>` al montarse; `js/app.js` es la raíz que arma todo el árbol, parecido a como un root component monta una app React.

```
├── index.html                    # Shell: solo <head> + <script> tags, sin markup propio
│
├── data/
│   └── products.json             # LOS DATOS — nuestra "API": precios, categorías, WhatsApp
│
├── css/
│   └── styles.css                # Solo lo genuinamente COMPARTIDO: variables, reset, layout de categoría
│
├── js/
│   ├── app.js                    # RAÍZ: fetch de products.json, monta todos los componentes en orden
│   ├── pricing.js                # Cálculo de precios (por kilo / por unidad) — no es componente, no toca el DOM
│   ├── preparation.js            # Opciones de preparación (ej: "Para milanesa") — tampoco toca el DOM
│   └── components/
│       ├── icons.js              # Íconos SVG minimalistas, compartido por catalog/ y nav/
│       ├── chrome/                # Piezas de "cáscara" de la página (no dependen del catálogo)
│       │   ├── header.js         # Logo + tagline
│       │   ├── intro.js          # Título + bajada
│       │   ├── viewToggle.js     # Botones Grid/Lista — administra su propio estado "activo"
│       │   └── footer.js         # Pie con el link de WhatsApp (recibe el número por parámetro)
│       ├── catalog/               # Las dos formas de mostrar los productos
│       │   ├── cards.js          # Vista en grilla (2-4 columnas según ancho)
│       │   └── productList.js    # Vista en lista (filas de ancho completo, más compacta)
│       ├── nav/
│       │   └── nav.js            # Barra de navegación flotante por categoría (paginada en mobile)
│       └── cart/
│           └── cart.js           # Estado del carrito, barra/modal de pedido, mensaje de WhatsApp
│
├── assets/
│   └── logo.png                  # Logo de Rosita
│
└── docs/                          # Specs de diseño de features (implementadas o futuras) — referencia histórica
    ├── rediseno-cards.md
    ├── rediseno-dual-modo.md
    ├── rediseno-multi-preparacion.md
    ├── rediseno-orbe-guia.md
    ├── rediseno-tickets-pedido.md
    └── calcularAsado-guia.md
```

### Por qué está organizado así

- **`data/`** es la única fuente de verdad de precios y categorías — pensala como la "API" del sitio, aunque sea un archivo estático. `js/app.js` la lee con `fetch()` al cargar la página.
- **Cada componente es un archivo autocontenido**: inyecta su propio `<style>` y crea su propio DOM — no depende de markup puesto en `index.html` ni de reglas sueltas en `css/styles.css`. Si tenés que tocar cómo se ve o se comporta algo, el archivo que buscás está ahí adentro, no hay estilos ni HTML escondidos en otro lado.
- **Las carpetas dentro de `js/components/`** agrupan por feature (`chrome/`, `catalog/`, `nav/`, `cart/`), no por tipo de archivo — cada carpeta es "todo lo relacionado con esa parte de la página". Con pocos componentes esto sería exceso de estructura, pero ya hay 9 archivos y va a seguir creciendo, así que conviene tenerlo agrupado desde ahora. `icons.js` queda suelto en `js/components/` porque no es una "vista" propia, es un recurso compartido entre `catalog/` y `nav/`.
- **`js/components/catalog/cards.js`** y **`productList.js`** son intercambiables: ambas exponen `createCategorySection(catKey, category, handlers)` con la misma firma, así que `app.js` puede usar una u otra según la vista elegida sin que el resto del código se entere.
- **`js/components/cart/cart.js`** es el único que mantiene el estado del pedido (qué hay en el carrito, cantidades, total, datos de entrega) y el único que sabe armar el mensaje de WhatsApp. No sabe nada de cómo se dibuja una card — solo expone `Cart.increment` / `Cart.decrement`, con la misma firma que esperan los handlers de `Cards`/`ProductList`, y `Cart.init()` para montarse en la página.
- **`js/app.js`** es puro orquestador: no tiene estado propio. Monta `Header`, `Intro`, `ViewToggle`, el catálogo, `Footer`, `Nav` y `Cart`, y conecta los callbacks entre ellos — parecido a un componente raíz de React armando el árbol.
- **`css/styles.css`** quedó reducido a lo genuinamente compartido: variables CSS, reset, `main`, y las reglas de categoría (título colapsable) que usan tanto `cards.js` como `productList.js` — eso sí se comparte a propósito, para no duplicar la animación de abrir/cerrar en las dos vistas.

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

## Opciones de preparación

Algunos productos se pueden pedir de más de una forma además de "tal cual viene" — por ejemplo, el Peceto se puede llevar entero o cortado para milanesa. Eso se declara con `"opcionesPreparacion"`:

```json
{ "name": "Peceto", "cut": "Para milanesa", "min": "Pieza ~2 kg", "venta": { ... }, "opcionesPreparacion": ["Para milanesa"] }
```

- El default es **siempre** "Sin manipular" (la pieza tal cual) — es universal, no hace falta declararlo en cada producto.
- `"opcionesPreparacion"` es un array con las opciones **extra** que tiene ese producto puntual, además del default. Si no está el campo, el producto solo se entrega "Sin manipular".
- `js/preparation.js` expone `Preparation.getOptions(item)` (default + extras) y `Preparation.hasChoice(item)` (si hay algo para elegir).
- Cuando el producto tiene opciones (`hasChoice` = true), `cards.js` abre un modal (`openPrepModal`) para elegir la preparación **justo antes** de agregar la línea al carrito — ver `withPrepStep()` en `js/components/cards.js`. Este paso corre después de elegir el modo de venta (kilo/unidad) si el producto tiene los dos.
- La preparación elegida queda guardada en la línea del carrito (`cart[key].preparacion`) y se muestra junto al nombre del producto en el resumen del pedido y en el mensaje de WhatsApp (ej: `Vacío (Por Unidad, Cortado a 3 dedos)`), vía `lineName()` en `js/components/cart.js`.
- Una vez que la línea ya existe en el carrito, sumar/restar cantidad con los botones −/+ **no vuelve a preguntar** la preparación: se respeta la que ya se eligió.

## El carrito (`js/components/cart/cart.js`)

Es un componente autocontenido, igual que `cards.js` y `nav.js`: no hay ningún `<div id="cartBar">` ni `<div id="cartModal">` en `index.html` — `Cart.init()` los crea por JS y los agrega a `document.body`, junto con su propio `<style>` (barra inferior, modal de detalle).

- **Estado**: el pedido puede repartirse en varios **tickets** (ej: "Para mí" / "Para Juan") — ver `rediseno-tickets-pedido.md` para la spec completa. `tickets` es un objeto `{ [id]: { name, lines } }` privado dentro del IIFE de `cart.js`, con `activeTicketId` marcando cuál recibe lo que se agrega desde el catálogo. Cada línea (`lines`) usa la misma clave `"categoría|nombre|modo|preparación"` de siempre. Hay **un solo pago**: los tickets son para que Rosita sepa cómo armar las bolsas, no para dividir la cuenta — el total siempre es la suma de todos los tickets.
- **API pública** (lo único que el resto del código puede usar):
  - `Cart.init(config, { onVisibilityChange })` — monta el DOM del carrito. `config` es el JSON de `data/config.json` completo (`whatsappNumber`, `ventaMinimaKg`, `barrios`). `onVisibilityChange(visible)` es un callback opcional que `app.js` usa para levantar la nav (`Nav.setLifted`) cuando el carrito pasa a tener productos.
  - `Cart.increment(catKey, item, mode, preparacion)` / `Cart.decrement(catKey, item, mode, preparacion)` — suman/restan 1 a una línea **del ticket activo** y devuelven la cantidad resultante. Misma firma que los handlers `onIncrement`/`onDecrement` que esperan `Cards`/`ProductList`, así que `app.js` los pasa directo sin ningún adaptador — ninguno de los dos sabe que existen los tickets.
- **Dividir una línea entre tickets** ("Dividir" en cada línea del modal) y **fusionar al borrar un ticket** siempre operan en kilos (`mergeKgIntoTicket`) — un producto "por unidad" ya es, en el fondo, plata por kilo (`Pricing.getSaleModes` expone `precioPorKg`/`pesoAproxKg` para esto).
- **Mínimo de pedido y envío**: si el total de kilos de todos los tickets no llega a `config.ventaMinimaKg`, aparece un aviso ("Te faltan X kg…") y, al enviar, un selector de barrio obligatorio (`config.barrios`, + opción "Otro") que suma el costo de envío al total.
- **Por dentro** usa `Pricing.getMode()`/`Pricing.getSaleModes()` para los precios y `Preparation.hasChoice()` para saber si hay que aclarar la preparación en el resumen — no depende de `cards.js` para nada.

## Flujo de llamadas entre archivos

Orden de carga en [`index.html`](index.html): `icons.js` → `pricing.js` → `preparation.js` → `chrome/*.js` → `cart/cart.js` → `catalog/cards.js` → `catalog/productList.js` → `nav/nav.js` → `app.js` (el orden importa: cada módulo usa el global `const X = (function(){...})()` que definió el anterior).

```
index.html
  └─ js/app.js            (arranca todo con init() al final del archivo)
       ├─ fetch("data/products.json") + fetch("data/config.json")  → llena PRODUCTS y config
       ├─ Nav.createNav(PRODUCTS, goToCategory)    [js/components/nav/nav.js]
       │    └─ Icons[catKey]                       [js/components/icons.js] → ícono de cada botón
       ├─ Cart.init(config, { onVisibilityChange })  [js/components/cart/cart.js]
       │    └─ crea la barra y el modal (con sus tickets), y queda escuchando sus propios clicks
       └─ Cards.createCategorySection(catKey, cat, { onIncrement: Cart.increment, onDecrement: Cart.decrement })  [js/components/catalog/cards.js]
            ├─ Icons[catKey]                        → ícono del título de categoría
            └─ Cards.createProductCard(catKey, item, handlers) — por cada producto
                 ├─ Pricing.getSaleModes(item)       [js/pricing.js] → arma los modos de compra (kilo/unidad) y sus precios
                 ├─ Preparation.hasChoice(item) / getOptions(item)  [js/preparation.js] → si hay que preguntar preparación
                 ├─ openModeModal()   → si el producto tiene 2 modos, pregunta "¿Por Kilo o por Unidad?"
                 ├─ openPrepModal()   → si el producto tiene opcionesPreparacion, pregunta cómo lo quiere
                 ├─ openDetailModal() → al tocar una card ya agregada, deja sumar el otro modo de venta
                 └─ al confirmar, llama handlers.onIncrement/onDecrement → o sea Cart.increment/Cart.decrement
                      └─ cart.js: changeQty(catKey, item, mode, delta, preparacion)
                           ├─ Pricing.getMode(item, mode)  → valida el modo y trae el precio unitario
                           └─ actualiza `cart` (estado privado de cart.js) y llama updateUI()
                                ├─ getTotal() / getCartEntries()  → recorren `cart`
                                ├─ Pricing.money(n)               → formatea $ ARS
                                ├─ onVisibilityChange(visible)    → app.js usa esto para llamar Nav.setLifted(navEl, ...)
                                └─ renderCartModal(entries, total)
                                     ├─ lineName(entry) → usa Pricing.getSaleModes() y Preparation.hasChoice()
                                     └─ arma el texto del pedido y el link `whatsappBtn.href = https://wa.me/...`
```

Puntos clave de quién sabe qué:

- **`data/products.json`** no sabe nada de JS — es solo datos, leídos una vez con `fetch()` en `app.js`.
- **`js/pricing.js`** es la única fuente de la matemática de precios. No toca el DOM ni sabe qué es un carrito; solo transforma `item.venta` en modos de compra (`getSaleModes`) o formatea moneda (`money`). Lo usan tanto `cards.js` (para mostrar precios) como `cart.js` (para calcular el total).
- **`js/preparation.js`** tampoco toca el DOM: solo lee `item.opcionesPreparacion` y expone `getOptions`/`hasChoice`. Lo usa `cards.js` (para decidir si abre el modal) y `cart.js` (para armar el texto de la línea del carrito).
- **`js/components/cart.js`, `cards.js` y `nav.js`** son los únicos que tocan el DOM; son autocontenidos (cada uno inyecta su propio `<style>` y crea su propio markup) y no se conocen entre sí — `cards.js` no sabe que existe un carrito, solo llama a los callbacks `onIncrement`/`onDecrement` que le pasaron. `cart.js` no sabe que existen las cards, solo expone `increment`/`decrement`.
- **`js/app.js`** no mantiene ningún estado propio: solo conecta las piezas (`Nav`, `Cart`, `Cards`) pasándoles los datos y los callbacks que necesitan.

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
