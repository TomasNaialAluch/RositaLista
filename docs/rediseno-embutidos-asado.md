# Embutidos y Achuras en CalcularAsado: selección con cantidad por persona

**Estado: implementado.** Quedó como referencia de cómo funciona y de las decisiones tomadas al programarlo (marcadas abajo donde antes decía "a confirmar"). Complementa [calcularAsado-guia.md](calcularAsado-guia.md) (sección "Secuencia" y "Agregados") — no lo reemplaza.

## Decisiones tomadas al programar (resumen)

- **Chorizo Puro Cerdo** es el default que se auto-agrega para embutidos.
- Ajustar una cantidad distinta a "1×personas" se resuelve con el modal de detalle de siempre (opción (a) de la sección "Modo selección" más abajo) — no se agregó ningún control nuevo.
- La aclaración "(1 x persona)" en el nombre de la línea **no se agregó** — la cantidad de unidades ya es la información que necesita el carnicero, y tocar `lineName()` en `cart.js` hubiera afectado todas las líneas del carrito, no solo estas.
- **Mondongo e Hígado NO tienen `indiceAsado`** (a diferencia de lo que proponía la versión anterior de este documento): al venderse como pieza entera de peso fijo (~5 kg / ~3 kg) sin relación con la cantidad de personas, sumarlos a la fórmula de `computeProgress` (que asume que la cantidad agregada es proporcional a `personas`) distorsionaba la barra de progreso — una sola pieza de Mondongo "cubría" decenas de personas en la cuenta, sin sentido. Riñón sí tiene `indiceAsado` (0.1) porque se vende por kilo suelto, igual que Molleja/Chinchulín, y ahí la proporcionalidad se mantiene.
- **Molleja se corrigió de 0.4 a 0.25 kg/persona** — el valor original daba 3.2 kg para 8 personas al seleccionarla como achura, desproporcionado para un acompañamiento (reportado como bug). Ver la sección Achuras para el detalle y las fuentes consultadas.
- **Achuras no tiene ningún default automático** — decir que sí solo activa el modo selección, sin agregar nada solo (confirmado, no era solo una propuesta).
- **Provoleta también se resolvió** (no quedó fuera como planeaba la primera versión de este documento): al ser un solo producto no necesita modo selección — decir que sí agrega directo la cantidad sugerida (`Math.ceil(personas / 2)`). Ver la sección Provoleta más abajo.
- **Se agregó `CartState.getLineQty`/`Cart.getQty`**, y las cards ahora hidratan su cantidad inicial desde ahí en vez de arrancar siempre en 0 — hacía falta para que la card de Provoleta (y cualquier otra) mostrara bien la cantidad recién agregada por CalcularAsado sin pasar por sus propios botones +/−. De paso corrigió un bug preexistente: cualquier re-render del catálogo (cambiar de vista, entrar/salir del modo asado) hacía que las cards "olvidaran" visualmente su cantidad aunque el carrito la tuviera bien. Ver "Hidratación del estado de las cards" más abajo.
- **Solo funciona en vista Grilla** (`Cards`, no `ProductList`) — si el usuario está en vista Lista cuando activa el modo selección, esa categoría se ve y se agrega con el comportamiento normal de fila, sin el toggle "Seleccionar". Ver "Qué NO se hizo" al final.

## La idea, en una frase

Cuando en la cadena final de CalcularAsado el usuario dice que sí a "¿Querés agregar embutidos?", "¿Querés agregar achuras?" o "¿Querés agregar provoleta?", en vez de solo mandarlo a la categoría a que agregue lo que quiera a mano (como hacía antes), el sistema le agrega automáticamente una cantidad de referencia por persona. Para embutidos y achuras, además lo invita a **seleccionar** qué otros productos de esa categoría quiere sumar — cada uno elegido se agrega también según su propia cantidad por persona; provoleta, al ser un solo producto, no necesita ese paso extra. La cantidad que le queda al carnicero en el ticket ya está expresada en lo que él necesita separar (unidades para embutidos, kilos o piezas para achuras, unidades para provoleta), sin que el cliente tenga que convertir nada.

## Cómo funciona hoy (para contrastar)

Hoy, en `calcularAsado.js` (`askNext`/`CHECKLIST_FINAL`), tanto "¿Querés agregar embutidos?" como "¿Querés agregar achuras?" son preguntas sí/no genéricas (`openYesNoModal`): decir que sí solo hace `goToCategory(key)` — lleva al usuario a esa sección del catálogo y lo deja ahí, todavía en modo Asado, para que agregue lo que quiera **con el comportamiento normal de las cards**. Ninguna de las dos categorías sugiere una cantidad por persona en este paso.

Para embutidos, "Agregados" en calcularAsado-guia.md explícitamente los dejó fuera de cualquier cálculo por no tener una cantidad por unidad con la que trabajar (se venden solo por kilo en `data/products.json`). Para achuras la situación es mixta: Molleja y Chinchulín **ya tienen** `indiceAsado` (0.4 y 0.25 kg/persona) y ya cuentan en vivo en la barra de progreso de carne — son la excepción mencionada en "Agregados"; Riñón, Mondongo e Hígado no tienen `indiceAsado` y hoy son pura presencia/ausencia, igual que los embutidos.

Este documento resuelve ambos huecos: define la cantidad por persona que faltaba en cada categoría, y con eso arma el flujo de selección para las dos.

## Conversión unidad ↔ kilo (dato nuevo, hace falta en `products.json`)

Los embutidos hoy se venden solo `"kilo"` en `data/products.json` (no tienen modo `"unidad"`). Para poder hablar de "1 unidad por persona" con un precio aproximado, cada producto de la categoría `embutidos` necesita declarar cuántas unidades entran en 1 kg:

| Producto | Unidades por kilo | Peso aprox. por unidad |
|---|---|---|
| Chorizo Puro Cerdo | 6 | ~0,167 kg |
| Chorizo Puro Cerdo Premium | 6 | ~0,167 kg |
| Chorizo Puro Cerdo c/ Morrón | 6 | ~0,167 kg |
| Morcilla Tipo Criolla | 6 | ~0,167 kg |
| Morcilla Vasca | 6 | ~0,167 kg |
| Salchicha Fresca | 12 | ~0,083 kg |

**Decisión a confirmar con el usuario antes de programar:** asumí que las tres variantes de chorizo (Puro Cerdo / Premium / c. Morrón) y las dos de morcilla (Tipo Criolla / Vasca) comparten la misma relación unidad↔kilo que su "familia", porque es sobre todo el tamaño físico de la pieza lo que define cuántas entran en un kilo, no el relleno. Si alguna variante puntual tiene un tamaño distinto, esta tabla se ajusta antes de programar.

### Por qué no hace falta un mecanismo nuevo para esto

`js/pricing.js` (`Pricing.getSaleModes`) ya sabe calcular un modo "por unidad" a partir de `venta.unidad = { precioPorKg, pesoAproxKg, nombre? }` — es exactamente el mecanismo que ya usan Peceto, Nalga, Bola de Lomo, etc. (`unitPrice = precioPorKg × pesoAproxKg`). Agregarle `venta.unidad` a cada embutido con el `pesoAproxKg` de la tabla de arriba alcanza para que:

- Cada embutido tenga un modo "Por Unidad" con precio aproximado, mostrado igual que cualquier otro producto (`$X / kg (~0,167 kg) = $Y`).
- El carrito, el total y el mensaje de WhatsApp lo traten como una línea más — sin ningún campo ni cálculo especial. La clave de carrito ya es `categoría|nombre|modo`, así que "Chorizo Puro Cerdo · unidad" es una línea normal.

No hace falta inventar un tipo de línea nuevo ni tocar `cart.js`/`app.js` en su lógica de totales: es reusar el modo "unidad" que ya existe, con un dato nuevo en `products.json`.

## Flujo paso a paso

1. **Cadena final de CalcularAsado llega a "¿Querés agregar embutidos?"** (sin cambios en cuándo se pregunta — ver `startFinishFlow`/`CHECKLIST_FINAL` en `calcularAsado.js`).
2. **Usuario dice que sí** → en vez de solo navegar a la categoría:
   - Se agrega automáticamente **1 unidad de Chorizo Puro Cerdo × cantidad de personas** al Ticket Asado (modo "unidad" de ese producto).
   - Se navega a la categoría Embutidos (mismo `goToCategory` de hoy: scroll + despliega si estaba colapsada).
   - Se activa un **modo selección** sobre las cards de esa categoría (ver siguiente sección).
   - La Orbe se eleva/ancla con un texto explicando lo que pasó, ej.: *"Ya sumamos {personas} chorizos, 1 por persona. Elegí qué otros embutidos querés agregar — cada uno se suma también a razón de 1 por persona."*
3. **Usuario toca las cards de otros embutidos** (Morcilla, Salchicha, etc.) para seleccionarlos — no hace falta elegir cantidad, cada toque sirve como "sí, quiero este" y agrega/quita `1 × personas` unidades de ese producto de una sola vez (ver siguiente sección).
4. **Usuario termina** tocando de nuevo "Terminar pedido" en el contador flotante (mismo botón de siempre) — se desactiva el modo selección de las cards (vuelven a comportarse como cualquier card normal) y se re-evalúa la cadena final desde cero: como el Ticket Asado ya tiene embutidos, esa pregunta no se vuelve a hacer, y sigue con provoleta/achuras si falta algo (comportamiento ya existente, sin cambios).
5. **Usuario dice que no** a la pregunta original → sin cambios respecto a hoy: no se agrega nada, pasa a la siguiente pregunta.

## Modo selección de las cards (nuevo comportamiento visual)

Mientras el modo selección está activo (solo sobre las cards de la categoría Embutidos, solo durante este paso puntual), cada card de esa categoría cambia:

- **El botón "+ Agregar" se convierte en "Seleccionar"** — deja de abrir el flujo normal de compra (nada de elegir kilos/modal); es un toggle: tocarlo selecciona el producto (agrega `1 × personas` unidades) o lo deselecciona (lo saca del Ticket Asado) si se vuelve a tocar.
- **La card seleccionada muestra un efecto de contorno** (borde destacado, en el rosa de la marca — mismo criterio visual que ya usa el modo Asado para su borde de ventana, ver "Tratamiento visual del modo activo" en calcularAsado-guia.md) para que quede claro de un vistazo cuáles ya están elegidos.
- **La card del Chorizo Puro Cerdo** (el que se agregó automáticamente en el paso 2) arranca ya con el efecto de contorno puesto, como si el usuario ya la hubiera tocado — así ve de entrada que ese ya está resuelto, y puede deseleccionarlo si no lo quiere.
- El resto de la categoría (cards que no son embutidos) no se ve afectado — el modo selección es puntual a esta categoría mientras dura este paso.

**Decisión a confirmar:** qué pasa si el usuario, estando en modo selección, quiere una cantidad de embutido distinta a "1 por persona" (por ejemplo, el doble de morcilla). Dos caminos posibles:
- (a) El modo selección es todo o nada (1×personas o nada) y para ajustar cantidades finas el usuario usa el modal de detalle de siempre (tocando la card ya seleccionada) — coherente con el resto de la app, no agrega UI nueva.
- (b) Se agrega algún control de ajuste directamente en el modo selección.

Propongo (a) por ser gratis (ya existe) y no complicar este modo, pero queda para confirmar antes de programar.

## Cómo queda la línea en el ticket / WhatsApp

Al ser una línea normal del carrito (`Chorizo Puro Cerdo`, modo `unidad`, cantidad = personas), el mensaje de WhatsApp y el modal "Tu pedido" ya la arman solos con el mecanismo existente (`lineName()` en `cart.js`, sin tocar nada ahí) — algo como:

```
Chorizo Puro Cerdo (Por Unidad) — 6 unidades — $6.500
```

Como la cantidad de unidades ya es exactamente el número de personas, el carnicero recibe la cantidad correcta de piezas a preparar sin ninguna conversión de su lado. Para que quede explícito que ese número **es** "1 por persona" (y no una cantidad cualquiera que el cliente puso), se puede sumar una aclaración chica en la línea, algo como:

```
Chorizo Puro Cerdo (Por Unidad) — 6 unidades (1 x persona) — $6.500
```

Esto es una aclaración de texto nada más — no cambia el cálculo de precio ni el modelo de datos del carrito.

## Precio aproximado

El precio que se muestra (`unitPrice = precioPorKg × pesoAproxKg`, ya calculado por `Pricing.getSaleModes`) es una **estimación**, igual que ya pasa hoy con Peceto/Nalga/etc. cuando se compran "por unidad" — el peso real de cada chorizo/morcilla varía. No hace falta ninguna aclaración nueva en la UI para esto: ya es el mismo criterio que el resto del catálogo usa para productos vendidos por pieza con precio de referencia por kilo.

## Achuras: mismo mecanismo, pero por kilo (no en unidades chicas)

Las achuras no son "piezas chicas" como un chorizo — se venden por kilo (Molleja, Chinchulín, Riñón) o como pieza entera con precio de referencia por kilo (Mondongo, Hígado). Por eso acá la cantidad por persona no es "unidades", es directamente el mismo `indiceAsado` (kg/persona) que ya usa el contador de carne para Molleja y Chinchulín — se extendió ese campo, que ya existía, a Riñón.

| Producto | Se vende | `indiceAsado` (kg/persona) | Estado |
|---|---|---|---|
| Molleja | Por kilo | **0.25** | Corregido — ver abajo |
| Chinchulín | Por kilo | 0.25 | Ya estaba |
| Riñón | Por kilo | 0.1 | Agregado |
| Mondongo | Pieza ~5 kg | *(sin `indiceAsado`, a propósito — ver abajo)* | — |
| Hígado | Pieza ~3 kg | *(sin `indiceAsado`, a propósito — ver abajo)* | — |

**Molleja se corrigió de 0.4 a 0.25 kg/persona.** El valor original (0.4) fue el que ya traía el proyecto antes de esta feature — pensado solo para el contador de "carne faltante" (donde Molleja se trata como si reemplazara un corte). Al reusar ese mismo campo para calcular cuánto agregar al **seleccionarla como achura**, 0.4×personas resultaba desproporcionado (3.2 kg para 8 personas — reportado como bug). Búsqueda de referencia (notas de asadores/cocina argentina): se recomiendan **250-350 g por persona por cada tipo de achura** comprado puntual, y ni siquiera todos los comensales las comen. Se dejó 0.25 (el piso de ese rango) como valor único — afecta tanto la selección de achuras como el contador de carne, ya que comparten el campo (ver "Por qué Mondongo e Hígado NO tienen indiceAsado" abajo: es justamente el riesgo de compartir un solo campo para dos usos).

**El valor de Riñón (0.1 kg/persona) sigue siendo una estimación mía, no confirmada** — el riñón tiene sabor fuerte y se sirve en porciones más chicas que Molleja/Chinchulín; si el carnicero tiene una referencia mejor, se ajusta directo en `data/products.json`.

### Por qué Mondongo e Hígado NO tienen `indiceAsado` (cambio de plan respecto a la versión anterior)

La versión anterior de este documento proponía agregarles `indiceAsado` también a estos dos. Al programarlo apareció un problema: `computeProgress()` en `calcularAsado.js` suma `kgDeLaLínea / indiceAsado` para CUALQUIER línea que tenga el campo, sin importar la categoría — y esa fórmula asume que la cantidad comprada es proporcional a `personas` (como pasa con Molleja/Chinchulín/Riñón, que se compran sueltos por kilo). Mondongo e Hígado se compran como **pieza entera de peso fijo** (~5 kg / ~3 kg) sin relación con cuánta gente hay — agregarles `indiceAsado` hacía que seleccionar **una sola pieza** "cubriera" varias decenas de personas en la barra de progreso, sin importar cuántas fueran realmente. Se decidió dejarlos sin `indiceAsado`, igual que están hoy: no cuentan en el contador de carne, y su cantidad de referencia para el modo selección (1 pieza) vive directamente en el código (`ACHURA_PIEZA_ENTERA` en `calcularAsado.js`), no en `products.json`.

### Selección: kilos para lo que se vende por kilo, 1 pieza para lo que se vende entero

Mismo modo selección que embutidos (botón "Seleccionar" + contorno destacado en la card), pero la cantidad que agrega cada selección depende de cómo se vende el producto:

- **Molleja, Chinchulín, Riñón** (por kilo): seleccionar agrega `indiceAsado × personas` kg — la misma cuenta que ya hace el contador de carne para Molleja/Chinchulín, extendida a Riñón.
- **Mondongo, Hígado** (pieza entera, "unidad" en `products.json`): no tiene sentido pedir una fracción de la pieza — el local vende la pieza completa. Seleccionar agrega **1 unidad** (la pieza entera), sin multiplicar por personas ni por `indiceAsado`. No se agregó ningún hint de "(alcanza para ~X personas)" — quedó fuera de esta v1 para no inventar una fórmula sin un `indiceAsado` real detrás.

### Sin default automático (confirmado)

En embutidos, el chorizo es casi universal en un asado argentino, así que tiene sentido agregarlo solo. Ninguna achura es tan universal — es más un "algunos invitados comen, otros no". Decir que sí a "¿Querés agregar achuras?" navega a la categoría y activa el modo selección directamente, sin nada pre-seleccionado.

## Provoleta: se agrega directo, sin modo selección

A diferencia de embutidos/achuras, provoleta es un solo producto — no hay "cuál elegir". `computeProgress()` en `calcularAsado.js` ya calculaba `provoletaSugerida = Math.ceil(personas / 2)` y lo mostraba en vivo en el contador flotante (`🧀 x/y provoletas`); lo único que faltaba (reportado como bug: "no me lo agrega automáticamente con la cuenta") era que decir que sí a la pregunta final **hiciera** ese agregado, en vez de solo llevar a la categoría y dejar que el cliente lo sume a mano. `startProvoletaAdd()` agrega directo `provoletaSugerida` unidades vía `CartState.changeQty("provoleta", item, "unidad", sugerida)` + `Cart.refresh()`, y navega a la categoría igual que antes — para que el usuario pueda ajustar la cantidad con el stepper de siempre si quiere más o menos.

## Hidratación del estado de las cards (fix necesario para que Provoleta funcionara bien)

Agregar provoleta directo por `CartState.changeQty` (en vez de por los botones +/− de la card) expuso un bug: `createProductCard` en `cards.js` arrancaba su `state` interno siempre en `{}`, sin mirar qué había realmente en el carrito — funcionaba porque normalmente la única forma de cambiar cantidades era tocando esos mismos botones, que sí actualizan `state` a mano. En cuanto algo agrega cantidades por fuera de la card (CalcularAsado con embutidos/achuras/provoleta), la card seguía mostrando "+ Agregar" aunque el carrito ya tuviera la cantidad — y si el usuario la tocaba, la cuenta local y la del carrito se desincronizaban.

Se agregó `CartState.getLineQty(catKey, item, mode, preparacion)` (expuesto como `Cart.getQty`) y `createProductCard` ahora hidrata `state` desde ahí al crearse, para todas las combinaciones modo+preparación del producto. Esto es un fix general (no específico de provoleta): de paso corrigió que cambiar de vista Grilla/Lista, o entrar/salir del modo Asado, hiciera que **cualquier** card "olvidara" visualmente su cantidad ya puesta, aunque el carrito la tuviera bien — algo que ya pasaba antes de esta feature y que se notó al probarla. Solo se aplicó en `cards.js` (vista Grilla); `productList.js` sigue con el mismo límite que el resto del modo selección (ver "Qué NO se hizo").

## Qué archivos se tocaron

- **`data/products.json`** — se agregó `venta.unidad` (con `precioPorKg` igual al de `kilo`, y `pesoAproxKg` según la tabla de conversión) a cada producto de `embutidos`; se agregó `indiceAsado: 0.1` a Riñón (Mondongo e Hígado quedaron sin `indiceAsado`); se corrigió el `indiceAsado` de Molleja de 0.4 a 0.25.
- **`js/components/cart/cartState.js`** — nueva `getLineQty(catKey, item, mode, preparacion)`, expuesta en el objeto público.
- **`js/components/cart/cart.js`** — nuevo `getQty` que delega en `CartState.getLineQty`, mismo criterio que `increment`/`decrement`.
- **`js/app.js`** — `getQty: Cart.getQty` sumado a los `handlers` que recibe `renderer.createCategorySection`; nuevo callback `refreshCatalog: renderCatalog` pasado a `CalcularAsado.create`, para que CalcularAsado pueda pedir un re-render del catálogo cuando activa/desactiva el modo selección o agrega provoleta (Cards no dispara su propio render).
- **`js/components/catalog/calcularAsado.js`** — `askNext()` distingue `key === "embutidos"`/`"achuras"`/`"provoleta"` de cualquier pregunta futura genérica. `startEmbutidosSelection()`/`startAchurasSelection()` arman el `controller` (`isSelected(item)`/`toggle(item)`) que le pasan a `Cards.enterSelectionMode(catKey, controller)`; `startProvoletaAdd()` agrega directo sin modo selección. Los tres leen/escriben cantidades directo en `CartState.changeQty(...)` + `Cart.refresh()`. `startFinishFlow()` y `teardown()` llaman `Cards.clearSelectionMode()` para no dejar el modo selección pegado si el usuario sale del paso sin terminarlo.
- **`js/components/catalog/cards.js`** — nuevo estado de módulo `selection` + `Cards.enterSelectionMode(catKey, controller)`/`Cards.clearSelectionMode()`. `createProductCard` chequea `selection.catKey === catKey` justo después de armar la zona de acción (`action`) y, si aplica, delega en `renderSelectableAction()` en vez del flujo normal — Cards no sabe nada de personas ni de índices, solo le pregunta al `controller` si el producto está seleccionado y qué hacer al tocarlo. Además, `state` ahora se hidrata desde `handlers.getQty` (ver sección de arriba).
- **`css/components/catalog/cards.css`** — `.rc-card--selected` (contorno + fondo tenue) y `.rc-select-btn`/`.rc-select-btn--selected` (botón toggle, relleno cuando está elegido).

## Qué NO cambia

- El sistema de tickets (`CartState`) y cómo se arma el mensaje de WhatsApp — se reusa tal cual, para embutidos, achuras y provoleta.
- La sugerencia de provoleta (`Math.ceil(personas / 2)`) y el contador flotante — sin cambios, solo se conectó para que el "Sí" la usara.
- El comportamiento normal de las cards fuera de estos pasos puntuales — modo selección es algo que se prende/apaga solo durante ese flujo, sobre la categoría que corresponda (Embutidos o Achuras), nunca sobre el resto del catálogo.

## Qué NO se hizo (límites conocidos de esta v1)

- **Solo funciona en vista Grilla.** El modo selección se implementó únicamente en `cards.js`; `productList.js` (vista Lista) es un componente autocontenido y duplicado a propósito (mismo criterio que el resto del proyecto — ver su propio comentario de cabecera), y no se le agregó el mismo mecanismo. Si el usuario activa el modo selección estando en vista Lista, esa categoría se ve y se agrega con el comportamiento normal de fila (sin el toggle "Seleccionar" ni el contorno). No rompe nada, pero pierde la guía visual.
- **Sin hint de "(alcanza para ~X personas)"** en Mondongo/Hígado — quedó fuera al no tener un `indiceAsado` real para esos dos (ver más arriba).
- **Sin aclaración "(1 x persona)"** en el nombre de la línea del carrito/WhatsApp — la cantidad de unidades ya es la única información que el carnicero necesita.
- **Sin control para pedir una cantidad distinta a "1×personas" o "1 pieza"** dentro del modo selección — para eso está el modal de detalle de siempre (tocar la card ya seleccionada), igual que con cualquier otro producto.

## Checklist (verificado)

**Embutidos:**
- Decir que sí a "¿Querés agregar embutidos?" agrega automáticamente `personas` unidades de Chorizo Puro Cerdo al Ticket Asado y navega a la categoría.
- Las cards de Embutidos entran en modo selección: botón "Seleccionar", contorno destacado al elegir, la card de Chorizo Puro Cerdo arranca ya marcada.
- Seleccionar/deseleccionar otro embutido agrega/quita `personas` unidades de ese producto, y el contorno refleja el estado actual.

**Achuras:**
- Decir que sí a "¿Querés agregar achuras?" navega a la categoría y activa el modo selección sin agregar nada solo.
- Seleccionar Molleja/Chinchulín/Riñón agrega `indiceAsado × personas` kg; seleccionar Mondongo/Hígado agrega 1 pieza entera.
- El contorno destacado refleja el estado de selección de cada card de achuras igual que en embutidos.

**Provoleta:**
- Decir que sí a "¿Querés agregar provoleta?" agrega automáticamente `Math.ceil(personas / 2)` unidades y navega a la categoría.
- La card de Provoleta muestra el stepper con la cantidad correcta apenas se agrega (sin tener que tocarla) — confirma que la hidratación de estado funciona.
- El contador flotante (`🧀 x/y provoletas`) refleja la cantidad recién agregada.

**Común a las tres:**
- Tocar "Terminar pedido" apaga el modo selección de las cards, y la cadena final ya no vuelve a preguntar por lo que ya se resolvió.
- El modal "Tu pedido" y el mensaje de WhatsApp muestran cada línea agregada (embutido, achura o provoleta) con su cantidad y precio correctos.
- Cards de categorías sin modo selección activo no se ven afectadas en ningún momento.
- Cambiar de vista Grilla/Lista, o entrar/salir del modo Asado, no hace que ninguna card "olvide" visualmente una cantidad ya puesta (fix de hidratación, verificado también fuera del modo asado con un producto cualquiera).
