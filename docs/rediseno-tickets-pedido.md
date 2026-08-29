# Pedidos múltiples (tickets)

Spec para la próxima iteración. Todavía no está implementado — es la referencia para que la leas antes de que lo programe.

## El problema, con el ejemplo que diste

Un cliente quiere comprar carne para él y para su hijo, pero quiere el pedido de cada uno **separado** — no mezclado en un solo total ni en una sola lista. Hoy el carrito (`js/components/cart/cart.js`) es un único pedido: todo lo que agregás cae en la misma bolsa `cart{}`, con un solo total y un solo mensaje de WhatsApp.

## Los tickets son para separar, no para cobrar aparte

Esto es clave y hay que tenerlo presente en todo el diseño: **los tickets no dividen el pago**. El total a pagar siempre es uno solo — la suma de todos los tickets — y así se manda a Rosita. Los tickets existen para que **Rosita sepa cómo armar el pedido físico**: 2 tickets son 2 bolsas separadas (una para cada persona), no dos cuentas distintas.

Por eso:

- El total general (el que importa para el pago) nunca desaparece de la pantalla, esté como esté repartido en tickets.
- El desglose por ticket es información para la carnicería (cómo empaquetar), no una feature de "pagar por separado" ni de facturación dividida.
- El cliente también tiene que poder armarlo así **desde el vamos**, viéndolo en tiempo real — no es algo que se entera recién al mandar el WhatsApp. Mientras agrega productos, tiene que quedar claro en pantalla qué va en cada bolsa/ticket y cuánto suma cada una, además del total general.

## Un pedido = una entrega, un nombre, una dirección

Los tickets reparten **productos**, no la entrega. Nombre y dirección son **generales para todo el pedido**, sin importar en cuántos tickets esté repartido — se entrega en un solo lugar. Si el cliente quiere de verdad dos entregas en direcciones distintas, eso no son tickets: son **dos pedidos separados de cero**, cada uno con su propio mínimo de compra (ver más abajo) y su propio checkout. Esto simplifica bastante el diseño: `cart.js` sigue pidiendo nombre/dirección/timbre una sola vez, como ya hace hoy — no hay que tocar nada ahí.

Hacen falta **dos flujos distintos, y los dos tienen que convivir**:

### Flujo A — Pedidos separados desde el arranque

El cliente arma el pedido de su hijo, lo deja terminado, y en vez de seguir sumando ahí arranca **un pedido nuevo de cero** para él. En una pantalla de "Pedidos" ve los dos, cada uno con su propio nombre (ej: "Para mí", "Para Juan"), y recién al final se manda todo junto por WhatsApp.

### Flujo B — Partir un pedido ya armado

El cliente arma **un solo pedido** como hace hoy, y **después** decide repartir lo que ya compró en 2 (o más) tickets. No es "agregar de nuevo" — es tomar una línea que ya está en el carrito y dividir su cantidad. Ejemplos que diste:

- Un Bife de Chorizo comprado "por unidad" (pieza de ~5 kg) → 3 kg para un ticket, 2 kg para el otro.
- O repartido más parejo: 2.5 kg y 2.5 kg.

Es decir, la división puede ser en **cualquier proporción**, no solo en mitades ni en kilos enteros.

## Por qué el Flujo B es el más delicado

Hoy una línea del carrito es una unidad atómica: tiene una cantidad (`qty`) y un precio unitario (`unitPrice`), y esa cantidad solo se mueve de a 1 kg o de a 1 unidad (`Cart.increment`/`Cart.decrement`). Partirla en tickets significa poder **fraccionar** esa cantidad (2.5 kg, no necesariamente un número entero) y repartirla, mientras el total en $ se mantiene consistente.

La buena noticia: el modelo de precios ya lo permite sin inventar nada. Mirá cómo se calcula cada modo en `js/pricing.js`:

- **"Por Kilo"**: precio = `precioPorKg × cantidad`.
- **"Por Unidad"**: precio = `precioPorKg × pesoAproxKg` — es decir, **también** es plata por kilo, solo que ya multiplicada por el peso de la pieza entera.

O sea que **todo** en el carrito, sea "kilo" o "unidad", en el fondo es "tantos kilos a tal precio por kilo". Partir una línea en tickets es, ni más ni menos, repartir esos kilos totales en la proporción que el cliente quiera — el precio de cada parte sale solo (`precioPorKg × kg de esa parte`), y las partes siempre suman el total original.

## Modelo de datos propuesto

Hoy `Cart` tiene un solo objeto `cart{}` con todas las líneas. Pasa a haber **N tickets**, cada uno con su propio objeto de líneas:

```js
tickets = {
  "t1": { name: "Para mí",   cart: { "vacuno|Bife de Chorizo|kilo|Sin manipular": { qty: 3, ... } } },
  "t2": { name: "Para Juan", cart: { "vacuno|Bife de Chorizo|kilo|Sin manipular": { qty: 2, ... } } },
}
```

- Cada línea sigue siendo la misma clave `categoría|nombre|modo|preparación` que ya existe (ver `rediseno-multi-preparacion.md`) — no cambia cómo se identifica una línea, cambia **en cuál ticket vive**.
- El total, el contador de la barra flotante y el mensaje de WhatsApp pasan a calcularse **por ticket**, más un total general que los suma a todos.
- Un ticket sin nombre puesto usa un default tipo "Pedido 1", "Pedido 2".
- **Sin límite** de tickets a crear — no hay tope duro en el modelo de datos ni en la UI.

## Qué cambia en la UI

### Flujo A (arrancar un pedido nuevo)

- Un botón "Nuevo pedido" (en la barra o el modal del carrito) crea un ticket vacío y lo vuelve el activo — todo lo que se agregue desde el catálogo va a parar ahí.
- Una pantalla o sección "Mis pedidos" lista los tickets abiertos (nombre editable, cantidad de productos, subtotal de cada uno), con la opción de volver a cualquiera para seguir sumando.

### Flujo B (partir una línea existente)

- Sobre una línea ya agregada (desde el modal de detalle del producto, o desde el resumen del carrito) aparece una acción "Dividir en varios pedidos".
- Ese paso pide, para esa línea puntual, cuántos kg/unidades van a cada ticket (incluye los que ya existen + la opción de crear uno nuevo ahí mismo). Mientras la suma de las partes no dé el total original, no deja confirmar.
- Los inputs aceptan decimales cuando el modo es "kg" (ej. 2.5), y solo enteros cuando el modo es "unidad" pura sin equivalencia en peso.

## El mensaje de WhatsApp

Un solo mensaje — un solo pedido, un solo pago — pero con las secciones bien separadas para que Rosita sepa cómo armar cada bolsa. Como los tickets no dividen el pago (ver arriba), esto ya no es una decisión abierta: va **siempre un solo mensaje**, con el total general bien destacado al final, y cada "subtotal" de ticket aclarado como referencia interna de armado, no como un monto a cobrar por separado:

```
¡Hola Rosita! 👋 Quiero hacer este pedido:

📦 Para mí
• Bife de Chorizo (Por Kilo) — 3 kg ($ 81.000)

📦 Para Juan
• Bife de Chorizo (Por Kilo) — 2 kg ($ 54.000)

Total a pagar: $ 135.000

Nombre: ...
Dirección: ...
```

## Qué pasa con el mínimo de compra al dividir

Los mínimos de compra (`minKg` en `data/products.json`, ej. Pechito de Cerdo con mínimo 3 kg) aplican **a la compra total**, no a cada ticket por separado. Si ya se compraron los 3 kg mínimos y se reparten 1.5 kg / 1.5 kg entre dos tickets, eso es válido — el mínimo ya se cumplió al momento de comprar, la carnicería corta un solo pedazo igual y el reparto es solo administrativo para el cliente.

## Borrar un ticket: se puede, con confirmación — y lo que tenía se fusiona

Borrar un ticket con productos adentro pide confirmación (para no perder algo por error), pero **lo que tenía adentro no se pierde**: se fusiona de vuelta con el resto del pedido. El caso que hay que tener resuelto de memoria:

1. Se compra un Bife de Chorizo **por unidad** (pieza de ~5 kg, `pesoAproxKg: 5`).
2. Se divide (Flujo B) en dos tickets: 2.5 kg en el Ticket 1, 2.5 kg en el Ticket 2.
3. Se borra el Ticket 2 → los 2.5 kg que tenía **no desaparecen**, se suman a lo que ya había en el Ticket 1 (o al ticket que quede, si había más de dos).
4. El resultado es **1 sola línea de 2.5 kg de Bife de Chorizo**. Como ya no es "una pieza entera" (era una unidad de 5 kg, ahora es una fracción), el precio de esa línea se recalcula **por kilo** (`precioPorKg × 2.5`), no como una "unidad" — el modo "unidad" solo tiene sentido para la pieza completa.
5. Después de la fusión, se re-chequea el mínimo de pedido general (ver siguiente sección) — puede ser que el pedido, ya reducido, no llegue más al mínimo.

Esto confirma algo importante del modelo: **una vez que una línea se dividió en tickets, deja de importar si originalmente era "kilo" o "unidad"** — para todo lo que pasa después (mover entre tickets, fusionar al borrar) se maneja como cantidad de kilos a `precioPorKg`, tal como se explica en "Por qué el Flujo B es el más delicado".

## Mínimo de pedido general y envío por barrio

Esto conecta directo con `data/config.json`, que ya tiene el campo `ventaMinimaKg` (hoy en 8, cargado sin usar). Ahora sí se usa:

- `ventaMinimaKg` es el **mínimo de kilos de TODO el pedido** (sumando todos los tickets) para que la entrega sea "normal" — no es por producto ni por ticket, es el pedido completo.
- Si el pedido (por armado normal, o después de fusionar tickets al borrar uno) **no llega** a `ventaMinimaKg`, se le pide al cliente que indique **de qué barrio es** — porque en esos casos hay costo de envío, y el costo depende del barrio.
- `data/config.json` va a sumar una lista de barrios con su costo de envío, algo como:

```json
{
  "whatsappNumber": "5491166246009",
  "ventaMinimaKg": 8,
  "barrios": [
    { "nombre": "Centro", "costoEnvio": 1500 },
    { "nombre": "Norte", "costoEnvio": 2000 }
  ]
}
```

(nombres y precios de ejemplo — los barrios reales y sus costos los carga Rosita, como el resto de `config.json`).

- El flujo entonces queda: si el pedido total ≥ `ventaMinimaKg`, no se pregunta nada de envío. Si es menor, aparece el selector de barrio (obligatorio para poder mandar el pedido) y el costo de envío correspondiente se suma al total a pagar y se aclara en el mensaje de WhatsApp.
- **Cuándo avisar**: apenas el pedido está por debajo del mínimo, aparece un aviso temprano (mientras se sigue comprando) tipo *"Te faltan 3.5 kg para no pagar envío"* — no hace falta llegar al checkout para enterarse. El barrio en sí recién se pide al momento de mandar el pedido (si para entonces sigue sin llegar al mínimo).
- **Cómo se elige el barrio**: dropdown con los barrios cargados en `config.json`, más una opción "Otro" con campo de texto libre para cuando el barrio no está en la lista — en ese caso el costo de envío no se calcula solo, se coordina por WhatsApp directamente con Rosita (el mensaje lo aclara).
- Esta parte (selector de barrio + costo de envío) es lo bastante grande como para pensar si conviene su **propio doc de spec** más adelante (UI del aviso temprano, cómo se guarda/actualiza la lista de barrios, cómo se ve el selector en el modal del carrito) — acá quedó enunciada porque el disparador ("el pedido bajó del mínimo al fusionar tickets") es un caso que sí toca directamente esta feature.

## Qué archivos toca (estimado, a confirmar al programarlo)

- **`js/components/cart/cart.js`** — el cambio de fondo: pasar de un `cart{}` único a una colección de tickets, y adaptar `increment`/`decrement`/`getTotal`/`renderCartModal` para operar sobre "el ticket activo" en vez de un solo carrito. Nueva lógica de split (repartir una línea entre tickets) y de fusión (al borrar un ticket). Nombre/dirección/timbre siguen siendo generales, sin cambios ahí.
- **UI de "Mis pedidos"** — probablemente un componente nuevo (`js/components/cart/tickets.js` o similar) para listar/nombrar/cambiar/borrar tickets, separado de `cart.js` para no inflar más ese archivo.
- **`js/app.js`** — sin grandes cambios, sigue pasando los mismos handlers a `Cards`/`ProductList`.
- **`js/pricing.js`, `data/products.json`** — sin cambios; el modelo de precios ya soporta esto tal cual está.
- **`data/config.json`** — suma la lista `barrios` (nombre + costo de envío) para la lógica de mínimo de pedido / envío.

## Qué NO cambia

- Cómo se calcula el precio de una línea (`Pricing.getSaleModes`, `Pricing.getMode`).
- El flujo de agregar un producto por primera vez (elegir modo, preparación, mínimo) — es idéntico, solo que ahora cae en "el ticket activo".
- Un cliente que nunca usa esta función no nota nada distinto: por default hay un solo ticket ("Pedido 1"), igual que el carrito único de hoy.

## Decisiones ya tomadas

- Nombre/dirección/timbre: **generales**, un solo pedido = una sola entrega.
- Tope de tickets: **sin límite**.
- Borrar un ticket con productos: **sí, con confirmación**, y lo que tenía se fusiona con el resto (ver arriba). No puede quedar en cero tickets — si es el único que queda, no se puede borrar (o borrarlo equivale a vaciar el carrito completo, a definir cuál de las dos UX se siente mejor al implementarlo).
- Selector de barrio: **dropdown con los barrios de `config.json` + opción "Otro" con texto libre** (sin cálculo automático de envío en ese caso, se coordina por WhatsApp).
- Cuándo avisar del mínimo/envío: **aviso temprano mientras se arma el pedido** (ej. "Te faltan 3.5 kg para no pagar envío"), y recién se pide el barrio en sí al momento de mandar el pedido.

## Preguntas abiertas antes de implementar

1. La parte de barrios/envío probablemente merezca su **propio doc de spec** cuando se encare de lleno (dónde vive el selector exactamente en la UI, cómo Rosita carga/edita la lista de barrios, redondeo y formato del aviso de "te faltan X kg") — acá quedó enunciada porque el disparador ("el pedido bajó del mínimo al fusionar tickets") toca directo esta feature de tickets.

## Checklist antes de dar por terminado

- Flujo A: armar un pedido, crear uno nuevo de cero, confirmar que quedan separados con sus propios totales y que se puede volver a cualquiera desde "Mis pedidos".
- Flujo B: agregar un Bife de Chorizo por unidad (5 kg), dividirlo en 3 kg / 2 kg entre dos tickets, confirmar que ambos subtotales son correctos y suman el total original.
- Repetir la división con números no enteros (2.5 kg / 2.5 kg) y confirmar que no hay errores de redondeo visibles en el total.
- Confirmar que dividir una línea por debajo del mínimo de compra del producto no bloquea nada (el mínimo ya se cumplió en la compra original).
- Confirmar que el mensaje de WhatsApp final arma bien las secciones por ticket y el total general, y que dice claramente que es un solo pago.
- Confirmar que el total general (a pagar) está siempre visible en pantalla mientras se arma el pedido, sin importar en cuántos tickets esté repartido.
- Confirmar que un uso "normal" (un solo ticket, sin dividir nada) se comporta exactamente igual que el carrito de hoy.
- Borrar un ticket con productos: confirma antes de borrar, y lo que tenía se fusiona en el/los ticket(s) restante(s) sin perder cantidad ni plata.
- Caso puntual: dividir un Bife de Chorizo por unidad (5 kg) en dos tickets de 2.5 kg, borrar uno, confirmar que el que queda tiene 2.5 kg **valuados por kilo** (no como "unidad").
- Armar un pedido que quede por debajo de `ventaMinimaKg` (de `data/config.json`) y confirmar que pide el barrio antes de dejar mandar el pedido, sumando el costo de envío al total.
- Armar un pedido que llegue o supere `ventaMinimaKg` y confirmar que NO pide barrio ni suma envío.
- Confirmar que nombre/dirección/timbre siguen pidiéndose una sola vez para todo el pedido, sin importar cuántos tickets haya.
