# Comprar los dos modos de un mismo producto a la vez

Spec para la próxima iteración. Todavía no está implementado — es la referencia para que la leas antes de que lo programe.

## El problema, concretamente

Hoy, si "Asado del Medio" tiene dos modos de venta (Por Kilo / Ventana), la card solo puede tener **un modo activo a la vez**:

1. Tocás "Agregar" → sale el modal → elegís "Ventana" → la card queda con el stepper `− 1 +` de Ventana.
2. Ahí ya no hay forma de sumar 3 kg de Asado "por kilo" también, salvo bajar el stepper de Ventana a 0 (lo que lo saca del carrito) y elegir "Por Kilo" en su lugar. No se pueden tener las dos cosas puestas al mismo tiempo desde esa card.

## Por qué pasa

`js/components/cards.js` guarda **una sola** variable de estado por card (`qty` + `activeMode`), y hay **una sola** zona de acción en el HTML de la card. Esa zona muestra o el botón "Agregar" o un stepper — nunca los dos modos a la vez.

Importante: **el carrito (`js/app.js`) ya soporta esto sin cambios.** La clave de cada línea del carrito ya es `categoría|nombre|modo` (no solo `categoría|nombre`), así que "Asado del Medio · kilo" y "Asado del Medio · unidad" ya son dos líneas independientes en `cart{}`, con su propio `qty`, `unitPrice`, etc. El límite está 100% en la UI de la card, no en la lógica de datos.

## Solución propuesta: una fila de control por modo

Cuando el producto tiene más de un modo de venta, la card deja de tener un único botón/stepper y muestra **una fila compacta por modo**, cada una con su propio control independiente:

**Antes de agregar nada:**
```
┌───────────────────────────┐
│ Asado del Medio            │
│ Cortes con hueso           │
│                             │
│ Por Kilo         [+ Agregar]│
│ Ventana (~7kg)   [+ Agregar]│
└───────────────────────────┘
```

**Después de agregar 3 kg y 1 Ventana:**
```
┌───────────────────────────┐
│ Asado del Medio            │
│ Cortes con hueso           │
│                             │
│ Por Kilo          [− 3 +]  │
│ Ventana (~7kg)    [− 1 +]  │
└───────────────────────────┘
```

Cada fila es su propio mini componente con su propio `qty` — igual que la card de un producto de un solo modo, pero repetido una vez por cada modo. Sumar o restar en una fila no toca la otra.

### Qué pasa con el modal que armamos antes

Deja de hacer falta para este caso. Elegir el modo pasa a ser "tocar la fila que corresponde" en vez de abrir un modal a mitad de camino — es un toque menos y no hay ambigüedad de qué se está agregando. Se puede sacar `openModeModal` de `cards.js`.

### Productos de un solo modo

No cambian en nada — siguen viendo el precio grande + un solo botón "Agregar" ancho, como ahora. Este cambio solo afecta a productos con 2 modos (hoy: Asado del Medio, Vacío, Peceto).

## Un efecto secundario a tener en cuenta: el alto de la grilla

Las cards con 2 modos van a ser un poco más altas (dos filas de control en vez de una). Como la grilla es CSS Grid, por defecto (`align-items: stretch`) **las cards vecinas en la misma fila de la grilla se estiran para igualar a la más alta** — así que en la fila donde cae una card de 2 modos, las cards de al lado van a tener espacio vacío abajo.

Para que cada card mantenga su alto natural sin estirarse, hay que agregar `align-items: start` a `.rc-grid`. Efecto secundario de eso: las cards ya no quedan todas perfectamente alineadas en altura dentro de una fila, pero cada una ocupa solo lo que necesita.

## Qué archivos toca

- **`js/components/cards.js`** — el único que cambia de verdad:
  - `createProductCard` para el caso de 2+ modos arma una fila (`rc-mode-row`) por cada modo en vez de una sola zona de acción.
  - Se puede borrar `openModeModal` y su CSS asociada (`rc-modal-*`) si ya no se usan en ningún lado.
  - CSS nueva para las filas: `rc-mode-row`, `rc-mode-label`, controles mini de +/− por fila (reusando la lógica de `rc-stepper`/`rc-add-btn` pero más compactos).
  - `align-items: start` en `.rc-grid`.
- **`js/app.js`** — **sin cambios.** `changeQty(catKey, item, mode, delta)` ya recibe el modo y ya arma la clave del carrito por separado. El carrito, el total y el mensaje de WhatsApp ya funcionan línea por línea sin importar cuántos modos tenga un mismo producto.
- **`js/pricing.js`** — sin cambios.
- **`data/products.json`** — sin cambios.

## Qué NO cambia

- Cómo se calcula el precio de cada modo (`Pricing.getSaleModes`).
- El total del carrito, el modal "Tu pedido" y el mensaje de WhatsApp: ya muestran una línea por cada combinación producto+modo, así que "Asado del Medio — 3 kg" y "Asado del Medio (Ventana) — 1 unidad" van a aparecer como dos líneas separadas automáticamente, sin tocar nada ahí.

## Alternativa que descarté (y por qué)

Mantener el modal de elección, y agregar un link chiquito tipo "+ agregar también por Kilo" debajo del stepper una vez que ya elegiste un modo. Es más compacto (una sola zona de acción la mayor parte del tiempo), pero es un estado escondido que hay que descubrir, y el usuario termina interactuando con dos mecanismos distintos (modal la primera vez, link la segunda) para lograr lo mismo. Las dos filas independientes son menos "lindas" pero más directas: se ve todo de entrada, sin nada escondido.

## Checklist antes de dar por terminado

- En "Asado del Medio", agregar 3 kg por la fila "Por Kilo" y 1 unidad por la fila "Ventana" **en cualquier orden**, y confirmar que quedan como dos líneas separadas en el carrito con sus totales correctos ($59.700 + $129.500).
- Confirmar que el mensaje de WhatsApp arma las dos líneas por separado.
- Confirmar que un producto de un solo modo (ej. "Roastbeef") se ve y se comporta exactamente igual que hoy.
- Revisar en mobile (375px) que las cards de 2 modos no se corten ni desborden, y que `align-items: start` no rompa el alineado general de la grilla.
