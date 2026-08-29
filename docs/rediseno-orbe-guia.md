# El Orbe: guía animada que reemplaza (a veces) la nav

Documento vivo — lo vamos completando juntos, flujo por flujo. **El componente ya existe** (`js/components/nav/orbe.js`, CSS en `css/components/nav/orbe.css`) y está integrado en los cuatro lugares que se habían identificado: `js/components/catalog/calcularAsado.js` (ver "Integración con la Orbe" en [calcularAsado-guia.md](calcularAsado-guia.md)), los cuatro modales de `js/components/catalog/cards.js` (elegir modo, elegir preparación, ajustar cantidad, detalle), `js/components/cart/cart.js` ("Ver pedido") y `js/components/chrome/footer.js` ("¿Quiénes somos?"). Este documento sigue siendo la referencia de diseño; cada vez que me cuentes un flujo nuevo, se agrega como una sección más abajo, y cuando se programe se anota acá qué quedó implementado.

## La idea, en una frase

Cuando se abre un modal (elegir modo de venta, elegir preparación, ver el detalle de un producto), la barra de navegación **deja de ser una barra** y se convierte en un **orbe** — un círculo transparente con reflejos de color de la marca moviéndose adentro, como el ícono de Siri/Gemini cuando te está escuchando. El orbe se "posa" arriba del modal (mismo plano que el modal, no oscurecido como el fondo), sigue animándose todo el tiempo para indicar "esto se puede tocar, estoy activo", y si lo tocás te explica en criollo qué tenés que hacer en el paso en el que estás.

## Vocabulario para no perdernos

- **Orbe**: el nombre del componente nuevo (`js/components/orbe.js`). Es el que **reserva el lugar** de la barra de navegación en la pantalla (la posición fija de abajo) y decide, según el estado, si ahí se muestra la barra completa o el círculo. No son dos elementos separados coordinándose — es un solo dueño de ese lugar en pantalla.
- **Barra (nav completa)**: el pill con los botones de categoría (Vacuno, Pollo, etc.) — lo que ya construye `Nav.createNav()`. El Orbe lo manda a dibujar cuando corresponde.
- **Orbe anclado**: el círculo solo, flotando en el mismo lugar de siempre (abajo), sin modal abierto. No muestra categorías, pero sigue siendo el mismo elemento — solo que "colapsado".
- **Orbe elevado**: el círculo posado arriba de un modal abierto, en el mismo plano que el modal (no tapado por el fondo oscuro).
- **Viñeta**: la forma visual de **toda** comunicación del Orbe — un globo de texto que sale/emerge del propio círculo (como una vinieta de historieta), con el texto de lo que tiene que explicar en ese momento. No es un modal aparte ni un cartel genérico: siempre nace visualmente *del* Orbe. "Cartelito" y "viñeta" se usan como sinónimos en este documento.

## Estados y quién dispara cada transición

| Desde | Disparador | Hacia |
|---|---|---|
| Barra completa | Se abre cualquier modal (elegir modo, elegir preparación, detalle) | Orbe elevado, posado arriba de ese modal |
| Orbe elevado | Se cierra el modal (se eligió algo, o se tocó "Listo"/Cancelar) | Orbe anclado (**no** vuelve a ser la barra completa) |
| Orbe elevado | Dentro del mismo flujo se pasa a un modal siguiente (ej: elegir modo → elegir preparación) | Sigue elevado, pero el cartelito cambia de contenido para explicar el paso nuevo |
| Orbe anclado | El usuario tocá la card de un producto que admite más combinaciones (ej: ya tiene "por kilo" puesto y puede sumar "por unidad") | Se abre el modal de detalle → Orbe elevado de nuevo |
| Orbe anclado / Barra completa | El usuario toca **"Ver pedido"** (se abre el modal del carrito) | Orbe elevado, posado arriba del modal del carrito |
| **Barra completa** | El usuario toca la pregunta **"¿Quiénes somos?"** | Se convierte en Orbe (anclado, sin modal abierto) y muestra directamente la viñeta con el texto de presentación |
| Orbe anclado | El usuario **scrollea** la página | Vuelve a ser la Barra completa (con las categorías) |
| Barra completa | — | Es el estado por default al entrar a la página |

Puntos importantes de esta tabla:
- El orbe **nunca vuelve solo a ser la barra completa** al cerrar un modal — se queda como círculo anclado. La única forma de recuperar la barra con las categorías es que el usuario scrollee (eso es lo que indica "quiero navegar", así que ahí sí se le da la barra para moverse rápido).
- Tocar el orbe (en cualquiera de sus dos posiciones) **nunca cambia su posición** — solo muestra/oculta la viñeta explicativa. El orbe se mueve únicamente por los disparadores de la tabla de arriba.
- "¿Quiénes somos?" es un caso especial: el disparador de conversión a Orbe pasa **solo si en ese momento está la barra completa**. *(Falta definir qué pasa si se toca "¿Quiénes somos?" con el Orbe ya anclado o elevado — lo definimos cuando lo pidas.)*

## Qué dice la viñeta en cada paso (implementado)

### Paso: elegir modo de venta (por kilo / por unidad)
`ORBE_TEXT_MODE` en `cards.js`: *"Elegí si querés que te lo corte a pedido ('Por Kilo') o llevarte la pieza entera ('Por Unidad')."*

### Paso: elegir preparación
`ORBE_TEXT_PREP` en `cards.js`: *"Elegí cómo querés que te lo entreguemos: tal cual viene, o cortado de la forma que prefieras."*

### Paso: ajustar cantidad
Último paso del flujo de "Agregar" (ver `openQuantityModal` en `cards.js`), no estaba contemplado en la primera versión de este documento porque se agregó después. `ORBE_TEXT_QUANTITY`: *"Ajustá la cantidad con los botones, y confirmá cuando estés listo."*

### Paso: modal de detalle (mezclar modos/preparaciones)
`ORBE_TEXT_DETAIL` en `cards.js`: *"Acá podés sumar el otro modo de compra o agregar otra preparación de este mismo producto — se puede mezclar todo lo que quieras."* Este modal puede abrir, adentro suyo, el modal de elegir preparación (botón "+ Agregar otra preparación") — mientras ese nested modal está abierto la Orbe muestra su propio texto (`ORBE_TEXT_PREP`), y al cerrarse (elegir algo o cancelar) el `restore()` que ya existía para sacar el `visibility: hidden` del modal de detalle también vuelve a llamar `Orbe.elevate(ORBE_TEXT_DETAIL)`, para no dejar la Orbe anclada mientras el modal de detalle sigue abierto atrás.

### Paso: "Ver pedido" (modal del carrito)
`ORBE_TEXT_CART` en `cart.js`: *"Repasá lo que agregaste, completá tus datos de entrega, y mandalo por WhatsApp cuando esté listo."* Se eleva al tocar "Ver pedido" o al abrirse programáticamente (`Cart.openModal()`, usado por CalcularAsado al terminar); se ancla al cerrar por cualquiera de los tres caminos (botón "×", tocar afuera, o el gesto de deslizar de `swipeToClose.js`, que ahora acepta un callback `onClose`).

### Paso: "¿Quiénes somos?"
`ORBE_TEXT_ABOUT` en `footer.js`: *"Te contamos quiénes somos y de dónde viene cada corte."* A diferencia de la idea original de este documento, el modal de "¿Quiénes somos?" que ya existía (`footer.js`, con foto y párrafos largos desde `data/config.json`) es demasiado extenso para vivir entero en una viñeta — así que se resolvió igual que cualquier otro modal: la Orbe se eleva con este teaser corto mientras el modal (con su contenido real) está abierto, y ancla al cerrarlo. El texto del teaser sí está hardcodeado en `footer.js` (no en `config.json`) porque es fijo y corto, a diferencia del contenido real de "quiénes somos" que sí vive en el JSON.

### Próximos pasos a documentar
*(Acá se van agregando a medida que me cuentes más flujos.)*

## De dónde salen los textos

Los textos de viñeta quedaron como constantes dentro de cada módulo que las usa (`ORBE_TEXT_MODE`/`ORBE_TEXT_PREP`/`ORBE_TEXT_QUANTITY`/`ORBE_TEXT_DETAIL` en `cards.js`, `ORBE_TEXT_CART` en `cart.js`, `ORBE_TEXT_ABOUT` en `footer.js`) en vez de moverse a `data/config.json` — son textos de UI fijos, del mismo tipo que cualquier otro string hardcodeado en esos archivos (ej. "¿Cómo querés comprar...?"), no contenido editable por el negocio. El único texto de "quiénes somos" que sí vive en `data/config.json` es el contenido real y largo del modal de `footer.js` (`quienesSomos.titulo`/`parrafos`/`frigorifico`), que ya estaba ahí antes de esta integración — la Orbe no lo lee, solo muestra su propio teaser corto mientras ese modal está abierto.

## Cómo se mueve (la sensación, no solo la lógica)

- Los **traslados de posición** (barra → orbe elevado, orbe elevado → orbe anclado, orbe anclado → barra) usan una curva de easing con **rebote en la frenada** — no se detiene seco, "pica" un poco antes de asentarse. Tiene que dar ganas de mirarlo, como una pelotita.
- El **color de adentro del orbe** se mueve todo el tiempo, de forma suave y continua (no rebota, no tiene pausas) — es una animación aparte de la del movimiento/posición, corre siempre mientras el orbe existe, sea que esté anclado o elevado.
- El orbe, posado arriba de un modal, **no se oscurece** como el fondo del modal (el overlay semitransparente que ya usamos en `cards.js`) — vive en el mismo plano de luz que el propio modal, por eso se lee como "parte de la conversación", no como parte del fondo.

## Dónde vive el código (implementado, integrado en los cuatro lugares)

La idea central: **`Orbe` es un componente contenedor que reserva el lugar fijo de la nav en la pantalla**, y hacia adentro decide si en ese lugar corresponde dibujar la barra completa o el círculo. No son `nav.js` y un `orb.js` coordinándose por afuera — `Orbe` es el único dueño de esa posición, y es él quien llama a `Nav.createNav()` cuando corresponde mostrar la barra, o dibuja el círculo cuando no.

- **Nuevo módulo `js/components/orbe.js`** (autocontenido, mismo criterio que `nav.js`/`cards.js`/`cart.js`): dueño del elemento fijo de abajo y de su máquina de estados (`bar` / `docked` / `elevated`). Es quien se monta en `app.js` (en el lugar donde hoy se monta `Nav` directamente). Expondría algo como:
  - `Orbe.init(...)` — se monta en la página; arranca en estado `bar` (delega en `Nav.createNav()` para dibujarla).
  - `Orbe.elevate(explicacionTexto)` — cambia a modo círculo y lo eleva sobre el modal que se acaba de abrir, con el texto que corresponde a ese paso.
  - `Orbe.dock()` — vuelve a modo círculo anclado (después de cerrar un modal).
  - `Orbe.expandToBar()` — vuelve a dibujar la barra completa (disparado por scroll), delegando de nuevo en `Nav.createNav()`.
  - Internamente maneja el toggle del cartelito al tocar el círculo.
- **`js/components/nav.js`** — sigue siendo el dueño de "cómo se ve y arma la barra con categorías" (`Nav.createNav`), pero deja de ser quien decide *cuándo* se muestra: eso ahora lo decide `Orbe`, que la llama cuando corresponde.
- **`js/components/catalog/cards.js`** — los cuatro modales (`openModeModal`, `openPrepModal`, `openQuantityModal`, `openDetailModal`) llaman `Orbe.elevate(...)` con el texto de ese paso al abrirse, y `Orbe.dock()` al cerrarse (elegir algo, cancelar, o tocar "Listo") a través de un `close()` compartido por cada camino de cierre. Caso especial: `openDetailModal` puede abrir `openPrepModal` anidado (botón "+ Agregar otra preparación", ocultando el modal de detalle con `visibility: hidden` mientras tanto) — su `restore()` vuelve a llamar `Orbe.elevate(ORBE_TEXT_DETAIL)` para que la Orbe no quede anclada de más mientras el modal de detalle sigue abierto atrás.
- **`js/components/cart/cart.js`** — mismo criterio en el listener de "Ver pedido" (`#openCart`), en `Cart.openModal()` (usado por CalcularAsado), y en los tres caminos de cierre del modal del carrito (`#closeCart`, click afuera, y el gesto de `swipeToClose.js`, que ahora acepta un callback `onClose`).
- **`js/components/chrome/footer.js`** — el modal de "¿Quiénes somos?" eleva la Orbe con un teaser corto al abrirse y la ancla al cerrarse, dejando el contenido real (foto + párrafos de `data/config.json`) en su propio modal — ver la sección de arriba.
- **Scroll** — un listener (podría vivir en `orbe.js` mismo) que dispara `Orbe.expandToBar()` la primera vez que detecta scroll mientras está en modo círculo.
- **Visual del círculo en sí** — técnica parecida a la del vidrio líquido que ya armamos en la nav (manchas de color internas animadas, recortadas por `overflow: hidden` en un círculo en vez de una píldora), pero acá el color se mueve solo (animación continua vía `@keyframes`), no depende de lo que hay detrás.

## Qué NO cambia

- La lógica de datos, precios y el estado del carrito (`pricing.js`, `preparation.js`, y el `changeQty`/total/mensaje de WhatsApp de `cart.js`) no se toca — esto es 100% capa visual/UX. Lo único que se agrega en `cart.js` son las dos llamadas a `Orbe` en abrir/cerrar su modal, nada de la lógica de adentro.
- El contenido y el orden de los modales (`openModeModal`, `openPrepModal`, `openDetailModal`, el modal del carrito) siguen siendo los mismos — el orbe se monta *encima* de ese flujo, no lo reemplaza.
