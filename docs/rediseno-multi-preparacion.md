# Varias preparaciones del mismo producto y modo

Spec para la próxima iteración. Todavía no está implementado — es la referencia para que la leas antes de que lo programe.

## El problema, con los dos ejemplos que diste

**Peceto** (se vende solo "por unidad"): querés **1 unidad entera + 1 unidad cortada para milanesa**. Hoy no se puede: al agregar Peceto elegís una preparación una sola vez, y esa queda fija para toda la cantidad de esa línea. Si ya elegiste "Entera" y después querés una "Para milanesa" del mismo Peceto, no hay dónde ponerla — es la misma línea del carrito.

**Bife de Chorizo** (se vende "por kilo", con opciones "En churrascos" / "Para milanesa"): querés repartir la compra en **tres partes con preparación distinta cada una** (mitad milanesa, mitad churrasco, y 1 kg entero sin tocar). Mismo problema: la línea "Por Kilo" de Bife de Chorizo solo puede tener UNA preparación puesta.

## Por qué pasa

Cada línea del carrito se identifica con la clave `categoría|nombre|modo` (así resolvimos antes que "Por Kilo" y "Por Unidad" del mismo producto pudieran convivir). La preparación, en cambio, **no es parte de la clave** — se guarda como un dato más de esa única línea (`cart[key].preparacion`), elegida la primera vez y fija después. Por eso un mismo modo solo admite una preparación a la vez.

## Solución propuesta: la preparación también entra en la clave del carrito

Igual que hicimos con el modo, la clave pasa a ser:

```
categoría|nombre|modo|preparación
```

Con esto, "Peceto · unidad · Entera" y "Peceto · unidad · Para milanesa" son automáticamente **dos líneas independientes**, cada una con su propia cantidad — sin inventar nada nuevo en el modelo de datos (`opcionesPreparacion` en `data/products.json` ya alcanza).

### Ejemplo Bife de Chorizo resuelto así

El cliente termina con tres líneas en el carrito, cada una "Por Kilo" pero con preparación distinta:

```
• Bife de Chorizo (Por Kilo, Para milanesa) — 1 kg
• Bife de Chorizo (Por Kilo, En churrascos) — 1 kg
• Bife de Chorizo (Por Kilo, Sin manipular) — 1 kg
```

## Qué cambia en la UI

Hoy, una vez agregado un producto, tocar la card abre el modal de detalle que muestra **una fila por modo** (Por Kilo / Por Unidad), cada una con su propio stepper. Ese mismo mecanismo se extiende un nivel más: cuando un modo tiene opciones de preparación, dentro de ese modo puede haber **varias filas, una por cada preparación ya elegida**, más un botón para agregar una preparación nueva.

```
┌─────────────────────────────────┐
│ Bife de Chorizo                  │
│                                   │
│ Por Kilo                         │
│   Para milanesa      [− 1 kg +]  │
│   En churrascos      [− 1 kg +]  │
│   Sin manipular      [− 1 kg +]  │
│   [+ Agregar otra preparación]   │
└─────────────────────────────────┘
```

Para el caso más simple (Peceto, un solo modo): tocar "Agregar" la primera vez sigue preguntando la preparación como ahora. La diferencia aparece cuando el cliente **vuelve a tocar la card** (ya con algo puesto): en vez de solo poder ajustar la cantidad de esa preparación, el modal de detalle ofrece también "+ Agregar otra preparación" para ese mismo modo, que abre de nuevo el selector de preparación y crea una segunda línea.

## Qué archivos toca

- **`js/components/cart.js`** — el cambio de fondo: la clave interna pasa a incluir la preparación (`categoría|nombre|modo|preparación`), y `Cart.increment`/`Cart.decrement` reciben la preparación siempre (hoy es opcional y solo se usa al crear la línea). El cálculo de total, `lineName()` y el mensaje de WhatsApp no cambian su lógica — simplemente van a iterar sobre más líneas cuando corresponda.
- **`js/components/cards.js`** — la parte más grande: el modal de detalle (`openDetailModal`) pasa de "una fila por modo" a "una fila por modo, y dentro de cada modo con preparaciones, una fila por preparación ya elegida + un botón para agregar otra". La card en sí (antes del primer toque) no cambia.
- **`js/pricing.js`, `js/preparation.js`, `data/products.json`** — sin cambios. El modelo de datos ya alcanza; esto es enteramente un tema de cómo se identifica una línea del carrito y cómo se arma la UI para gestionar varias.

## Qué NO cambia

- Cómo se calcula el precio de cada línea (`Pricing.getSaleModes`, `Pricing.getMode`).
- El total del carrito y el mensaje de WhatsApp: ya arman una línea de texto por cada entrada de `cart{}` — solo va a haber más entradas posibles por producto.
- Los productos sin opciones de preparación (la mayoría) no se ven afectados en nada: siguen teniendo una sola línea por modo, como ahora.

## Un límite a tener en cuenta

Esto multiplica la cantidad de líneas posibles por producto (modos × preparaciones), así que el modal de detalle puede llegar a mostrar bastantes filas para un producto con 2 modos y 3-4 preparaciones. Para los casos reales de esta lista (como máximo 2 modos y hasta 4 preparaciones) no debería ser un problema de espacio, pero es algo para tener en cuenta si a futuro se cargan productos con muchas más opciones.

## Checklist antes de dar por terminado

- Peceto: agregar 1 unidad "Entera" y, desde el modal de detalle, agregar 1 unidad más "Para milanesa" del mismo Peceto — confirmar que quedan como dos líneas separadas con sus propios totales.
- Bife de Chorizo: repartir en las tres preparaciones del ejemplo (milanesa / churrasco / entero) y confirmar que el subtotal del modal de detalle y el total del carrito suman las tres líneas correctamente.
- Confirmar que el mensaje de WhatsApp arma las líneas por separado, cada una con su preparación aclarada.
- Confirmar que un producto sin opciones de preparación sigue funcionando exactamente igual que hoy (una sola línea por modo, sin el paso extra de "agregar otra preparación").
