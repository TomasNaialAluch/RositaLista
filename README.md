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
│   ├── app.js                    # ORQUESTADOR: fetch de products.json, arma catálogo y nav, monta el carrito
│   ├── pricing.js                # Cálculo de precios (por kilo / por unidad), compartido por cards y cart
│   ├── preparation.js            # Opciones de preparación (ej: "Para milanesa") — datos + helpers, usado por cards.js y cart.js
│   └── components/
│       ├── cart.js               # Componente: estado del carrito, barra/modal de pedido, WhatsApp (autocontenido, su propio CSS)
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
- **`js/components/`** son piezas de UI autocontenidas: cada una (`cart.js`, `cards.js`, `nav.js`) inyecta su propio `<style>` y crea su propio DOM — no dependen de markup puesto en `index.html` ni de reglas sueltas en `css/styles.css`. Si tenés que tocar cómo se ve o se comporta el carrito, la nav o las cards, el archivo que buscás está ahí adentro — no hay estilos ni HTML escondidos en otro lado.
- **`js/components/cart.js`** es el único que mantiene el estado del pedido (qué hay en el carrito, cantidades, total) y el único que sabe armar el mensaje de WhatsApp. No sabe nada de cómo se dibuja una card — solo expone `Cart.increment` / `Cart.decrement`, con la misma firma que esperan los handlers de `Cards`, y `Cart.init()` para montarse en la página.
- **`js/app.js`** es puro orquestador: no tiene estado propio. Trae los datos, crea la nav (`Nav`), monta el carrito (`Cart.init`) y renderiza el catálogo (`Cards`) pasándole `Cart.increment`/`Cart.decrement` como callbacks.
- **`css/styles.css`** solo tiene estilos de layout general (header, intro, footer) — todo lo que es específico de un componente vive con ese componente.

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

## El carrito (`js/components/cart.js`)

Es un componente autocontenido, igual que `cards.js` y `nav.js`: no hay ningún `<div id="cartBar">` ni `<div id="cartModal">` en `index.html` — `Cart.init()` los crea por JS y los agrega a `document.body`, junto con su propio `<style>` (barra inferior, modal de detalle, botón flotante de WhatsApp).

- **Estado**: el objeto `cart` vive como variable privada dentro del IIFE de `cart.js` — nadie de afuera lo toca directamente. Es un objeto plano en memoria (se pierde al recargar la página), con claves `"categoría|nombreProducto|modo"` y valores `{ qty, unitPrice, unitLabel, modeLabel, preparacion, product, category, mode }`.
- **API pública** (lo único que el resto del código puede usar):
  - `Cart.init(whatsappNumber, { onVisibilityChange })` — monta el DOM del carrito. `onVisibilityChange(visible)` es un callback opcional que `app.js` usa para levantar la nav (`Nav.setLifted`) cuando el carrito pasa a tener productos.
  - `Cart.increment(catKey, item, mode, preparacion)` / `Cart.decrement(catKey, item, mode)` — suman/restan 1 a una línea y devuelven la cantidad resultante. Tienen la misma firma que los handlers `onIncrement`/`onDecrement` que espera `Cards.createCategorySection`, así que `app.js` los pasa directo sin ningún adaptador.
- **Por dentro** usa `Pricing.getMode()` para el precio unitario y `Preparation.hasChoice()` para saber si hay que aclarar la preparación en el resumen — no depende de `cards.js` para nada.

## Flujo de llamadas entre archivos

Orden de carga en [`index.html`](index.html): `icons.js` → `pricing.js` → `preparation.js` → `cart.js` → `cards.js` → `nav.js` → `app.js` (el orden importa: cada módulo usa el global `const X = (function(){...})()` que definió el anterior).

```
index.html
  └─ js/app.js            (arranca todo con init() al final del archivo)
       ├─ fetch("data/products.json")             → llena PRODUCTS
       ├─ Nav.createNav(PRODUCTS, goToCategory)    [js/components/nav.js]
       │    └─ Icons[catKey]                       [js/components/icons.js] → ícono de cada botón
       ├─ Cart.init(whatsappNumber, { onVisibilityChange })  [js/components/cart.js]
       │    └─ crea la barra, el modal y el botón flotante de WhatsApp, y queda escuchando sus propios clicks
       └─ Cards.createCategorySection(catKey, cat, { onIncrement: Cart.increment, onDecrement: Cart.decrement })  [js/components/cards.js]
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
