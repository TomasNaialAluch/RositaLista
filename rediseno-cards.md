# Rediseño de las cards de producto

Spec para la próxima iteración. Todavía no está implementado — esto es la referencia para programarlo después.

## Objetivo

Cards más modernas y compactas, en grilla de **2 columnas** en mobile, con altura suficientemente chica como para que entren **2 filas completas en la pantalla sin scrollear** (o sea, 4 productos visibles a la vez apenas se abre una categoría). Y el botón de cantidad pasa de ser dos botones (+/-) sueltos a un solo botón "Agregar" que se transforma en el selector de cantidad recién cuando el producto ya está en el carrito.

## 1. Grilla

- **Mobile (default):** `grid-template-columns: repeat(2, 1fr)`, gap chico (8–10px).
- **Tablet (~600px+):** 3 columnas.
- **Desktop (~900px+):** 4 columnas.
- Cada card apunta a una altura de **~150–170px** (hoy las cards son filas horizontales de ~90px de alto pero ocupan todo el ancho — en 2 columnas de alto similar, deberían entrar 2 filas dentro de la altura visible del celular, restando el header y la nav flotante de abajo).
- Si el nombre del corte es largo (ej. "Chorizo Puro Cerdo c/ Morrón"), que trunque a 2 líneas con `-webkit-line-clamp` en vez de agrandar la card.

```
┌─────────┐ ┌─────────┐
│ Asado   │ │ Vacío   │
│ $19.900 │ │ $21.000 │
│[Agregar]│ │[Agregar]│
└─────────┘ └─────────┘
┌─────────┐ ┌─────────┐
│ Peceto  │ │ Colita  │
│ $23.000 │ │ $21.000 │
│[Agregar]│ │[Agregar]│
└─────────┘ └─────────┘
```

## 2. Anatomía de la card (vertical, no horizontal como ahora)

De arriba hacia abajo:

1. **Nombre del corte** (bold, 1–2 líneas máx.)
2. **Meta corta** (tipo de corte y/o mínimo) — en una sola línea chica, se puede ocultar en pantallas muy chicas si no entra.
3. **Precio** (`$ 19.900 / kg`), destacado.
4. **Acción**: botón "Agregar" o selector de cantidad (ver punto 3).

Si el producto no tiene precio (`price: null`), la acción se reemplaza por el texto "Consultar precio" como ya pasa hoy, sin botón.

## 3. Botón de acción: Agregar → selector de cantidad

**Estado inicial (nada en el carrito):**
Un solo botón ancho, "**+ Agregar**", ocupa el espacio de acción de la card.

**Al tocarlo:**
- Se agrega 1 unidad al carrito (mismo flujo de datos que hoy: `cart[key]`, `updateCartUI`, etc. — no cambia la lógica del carrito, solo la UI del botón).
- El botón "Agregar" se reemplaza, en el mismo lugar, por el selector `− 1 +` (igual al que ya existe hoy, pero ahora es el estado B de este mismo control, no algo que está siempre visible).

**Con el selector visible:**
- `+` suma de a 1.
- `−` resta de a 1; si llega a 0, el selector vuelve a mostrar el botón "Agregar" (se "resetea" la card).

Un solo componente con dos estados, no dos elementos distintos en el DOM compitiendo por espacio.

## 4. Microinteracción (opcional pero recomendado)

- Al tocar "Agregar", una transición corta (~150-200ms) tipo fade/scale entre el botón y el selector, no un cambio brusco.
- Feedback visual breve en la card (ej. un borde o sombra que pulsa un instante) para confirmar que se agregó, ya que no hay más el gesto obvio de "tocaste + y viste el número subir".

## 5. Estilo "moderno"

En línea con lo que ya se armó para la nav (vidrio, sombras suaves, bordes redondeados grandes):
- Cards con `border-radius` más generoso (ej. 16–18px) que el actual.
- Sombra suave, sin bordes duros.
- El botón "Agregar" con el rosa de marca; el selector de cantidad con estilo más neutro (como ya está).
- Tipografía del precio más grande/protagonista que el resto.

## 6. Estructura de archivos (siguiendo el patrón ya usado)

- **`cards.js`**: se reescribe para armar la card nueva (vertical, con el botón de dos estados) y para manejar el toggle Agregar ↔ selector. Mismo criterio que `nav.js`: si tiene sentido, que inyecte su propio `<style>` autocontenido en vez de depender de reglas sueltas en `styles.css`, para que quede claro de dónde sale cada estilo.
- **`styles.css`**: se le saca todo lo de `.product-card`, `.qty-control`, `.qty-btn` etc. si `cards.js` pasa a ser autocontenida (mismo criterio que se aplicó con la nav).
- **`script.js`**: no debería necesitar cambios de lógica, solo que los `handlers` que le pasa a `Cards.createProductCard` (`onIncrement` / `onDecrement`) se sigan usando igual — el cambio es de presentación, no de datos.
- **`icons.js`** y **`products.json`**: sin cambios.

## 7. Qué NO cambia

- La lógica del carrito (`cart`, `getTotal`, `getCartEntries`) en `script.js`.
- El formato del mensaje de WhatsApp.
- La nav flotante (`nav.js`) tal como quedó.
- Que todo siga siendo HTML/CSS/JS estático sin build, compatible con GitHub Pages (nada de esto requiere Node, bundlers ni un backend — sigue siendo `fetch('products.json')` + archivos sueltos servidos tal cual).

## 8. Chequeo antes de dar por terminado

- En un celular real (o el emulador angosto, ~375px de ancho), abrir una categoría y confirmar que se ven 4 cards completas (2x2) sin scrollear.
- Tocar "Agregar" en una card, confirmar que aparece el selector, sumar/restar hasta 0 y confirmar que vuelve a aparecer "Agregar".
- Confirmar que el total del carrito y el mensaje de WhatsApp arman igual que antes.
