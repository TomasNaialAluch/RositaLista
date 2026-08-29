# El Orbe: guía animada que reemplaza (a veces) la nav

Documento vivo — lo vamos completando juntos, flujo por flujo. **El componente ya existe** (`js/components/nav/orbe.js`, CSS en `css/components/nav/orbe.css`) y está integrado en `js/components/catalog/calcularAsado.js` (ver "Integración con la Orbe" en [calcularAsado-guia.md](calcularAsado-guia.md)) — `cards.js` y `cart.js` todavía no lo llaman. Este documento sigue siendo la referencia de diseño; cada vez que me cuentes un flujo nuevo, se agrega como una sección más abajo, y cuando se programe se anota acá qué quedó implementado.

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

## Qué dice la viñeta en cada paso (se va completando acá)

### Paso: elegir modo de venta (por kilo / por unidad)
Explica, corto y clarísimo, que tiene que elegir si compra por peso (cortado a pedido) o la pieza entera. *(Falta el texto final — lo definimos cuando lo pidas.)*

### Paso: elegir preparación
Explica qué son las opciones de preparación — que el corte se puede entregar tal cual viene, o cortado de otra forma según la opción (ej: "para milanesa", "en churrascos"). *(Falta el texto final.)*

### Paso: modal de detalle (mezclar modos/preparaciones)
Explica que se pueden mezclar las formas de preparación y de compra — recibir un mismo producto de varias formas a la vez (ej: una parte por kilo y otra por unidad, o distintas preparaciones del mismo modo). *(Falta el texto final.)*

### Paso: "Ver pedido" (modal del carrito)
Al tocar "Ver pedido" se abre el modal con el resumen del pedido (líneas, total, nombre/dirección, botón de WhatsApp) — el Orbe se eleva ahí también, con la misma intención que en los demás modales, y si se lo toca explica qué se puede hacer en esa pantalla puntual (revisar lo que se agregó, completar los datos de entrega, y mandar el pedido por WhatsApp). *(Falta el texto final.)*

### Paso: "¿Quiénes somos?"
No es un paso dentro de un flujo de compra — es una pregunta/link en la página. Al tocarla, la barra se convierte en Orbe y muestra directo la viñeta con el texto de presentación de la carnicería (quiénes son, qué los distingue, etc.). Este texto **no va hardcodeado en el código** — vive en el JSON de configuración (ver "De dónde salen los textos" más abajo), para poder cambiarlo sin tocar `orbe.js`. *(Falta el texto final — lo definimos cuando lo pidas.)*

### Próximos pasos a documentar
*(Acá se van agregando a medida que me cuentes más flujos.)*

## De dónde salen los textos

Ningún texto que dice el Orbe va hardcodeado adentro de `orbe.js` — todos viven en un JSON de configuración, para poder editarlos sin tocar código. Ya existe **`data/config.json`** (con `whatsappNumber` y `ventaMinimaKg`), así que el texto de "¿Quiénes somos?" iría ahí mismo, por ejemplo:

```json
{
  "whatsappNumber": "5491166246009",
  "ventaMinimaKg": 8,
  "quienesSomos": "texto acá..."
}
```

Los textos de las viñetas de cada paso del flujo (elegir modo, elegir preparación, modal de detalle, "Ver pedido") probablemente también convenga que vivan acá, agrupados de alguna forma — ej. un objeto `"orbe": { "quienesSomos": "...", "elegirModo": "...", "elegirPreparacion": "...", ... }` en vez de quedar todos sueltos al mismo nivel. Lo terminamos de definir cuando escribamos los textos finales.

## Cómo se mueve (la sensación, no solo la lógica)

- Los **traslados de posición** (barra → orbe elevado, orbe elevado → orbe anclado, orbe anclado → barra) usan una curva de easing con **rebote en la frenada** — no se detiene seco, "pica" un poco antes de asentarse. Tiene que dar ganas de mirarlo, como una pelotita.
- El **color de adentro del orbe** se mueve todo el tiempo, de forma suave y continua (no rebota, no tiene pausas) — es una animación aparte de la del movimiento/posición, corre siempre mientras el orbe existe, sea que esté anclado o elevado.
- El orbe, posado arriba de un modal, **no se oscurece** como el fondo del modal (el overlay semitransparente que ya usamos en `cards.js`) — vive en el mismo plano de luz que el propio modal, por eso se lee como "parte de la conversación", no como parte del fondo.

## Dónde vive el código (implementado, v1 solo integrada con CalcularAsado)

La idea central: **`Orbe` es un componente contenedor que reserva el lugar fijo de la nav en la pantalla**, y hacia adentro decide si en ese lugar corresponde dibujar la barra completa o el círculo. No son `nav.js` y un `orb.js` coordinándose por afuera — `Orbe` es el único dueño de esa posición, y es él quien llama a `Nav.createNav()` cuando corresponde mostrar la barra, o dibuja el círculo cuando no.

- **Nuevo módulo `js/components/orbe.js`** (autocontenido, mismo criterio que `nav.js`/`cards.js`/`cart.js`): dueño del elemento fijo de abajo y de su máquina de estados (`bar` / `docked` / `elevated`). Es quien se monta en `app.js` (en el lugar donde hoy se monta `Nav` directamente). Expondría algo como:
  - `Orbe.init(...)` — se monta en la página; arranca en estado `bar` (delega en `Nav.createNav()` para dibujarla).
  - `Orbe.elevate(explicacionTexto)` — cambia a modo círculo y lo eleva sobre el modal que se acaba de abrir, con el texto que corresponde a ese paso.
  - `Orbe.dock()` — vuelve a modo círculo anclado (después de cerrar un modal).
  - `Orbe.expandToBar()` — vuelve a dibujar la barra completa (disparado por scroll), delegando de nuevo en `Nav.createNav()`.
  - Internamente maneja el toggle del cartelito al tocar el círculo.
- **`js/components/nav.js`** — sigue siendo el dueño de "cómo se ve y arma la barra con categorías" (`Nav.createNav`), pero deja de ser quien decide *cuándo* se muestra: eso ahora lo decide `Orbe`, que la llama cuando corresponde.
- **`js/components/cards.js`** — cada lugar que hoy abre un modal (`openModeModal`, `openPrepModal`, `openDetailModal`) pasa a llamar `Orbe.elevate(...)` con el texto explicativo de ese paso puntual, y `Orbe.dock()` cuando el modal se cierra (elegir algo, cancelar, o tocar "Listo").
- **`js/components/cart.js`** — mismo criterio en el listener de "Ver pedido" (`#openCart`) y en el cierre del modal del carrito (`#closeCart` / click afuera): llama a `Orbe.elevate(...)` / `Orbe.dock()` igual que los modales de `cards.js`.
- **Scroll** — un listener (podría vivir en `orbe.js` mismo) que dispara `Orbe.expandToBar()` la primera vez que detecta scroll mientras está en modo círculo.
- **Visual del círculo en sí** — técnica parecida a la del vidrio líquido que ya armamos en la nav (manchas de color internas animadas, recortadas por `overflow: hidden` en un círculo en vez de una píldora), pero acá el color se mueve solo (animación continua vía `@keyframes`), no depende de lo que hay detrás.

## Qué NO cambia

- La lógica de datos, precios y el estado del carrito (`pricing.js`, `preparation.js`, y el `changeQty`/total/mensaje de WhatsApp de `cart.js`) no se toca — esto es 100% capa visual/UX. Lo único que se agrega en `cart.js` son las dos llamadas a `Orbe` en abrir/cerrar su modal, nada de la lógica de adentro.
- El contenido y el orden de los modales (`openModeModal`, `openPrepModal`, `openDetailModal`, el modal del carrito) siguen siendo los mismos — el orbe se monta *encima* de ese flujo, no lo reemplaza.
