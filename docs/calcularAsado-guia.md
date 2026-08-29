# CalcularAsado: modo juego para armar el pedido de un asado

**Estado: implementado (v1).** Este documento arrancó como spec antes de programar; ahora que `js/components/catalog/calcularAsado.js` existe, quedó como referencia de cómo funciona y de las decisiones que se tomaron al programarlo (marcadas explícitamente abajo, donde antes decía "falta definir"). Sigue siendo un documento vivo — si el comportamiento cambia, se actualiza acá.

Este modo **todavía no usa a la Orbe** (el componente `js/components/orbe.js` de [rediseno-orbe-guia.md](rediseno-orbe-guia.md) no existe todavía) — hoy sus "cartelitos" son modales de texto plano, con el mismo patrón visual bottom-sheet que ya usa `cards.js`. Ver la sección **"Integración pendiente con la Orbe"** al final: ahí está anotado, punto por punto, qué hay que cambiar cuando se programe la Orbe.

## La idea, en una frase

Un botón nuevo activa un "modo juego": en vez de navegar libremente sumando cortes, el usuario dice cuántas personas van al asado, y un contador flotante le va mostrando cuánta carne le falta todavía — como una barra de progreso — mientras arma el pedido. Al terminar, ese pedido queda separado como su propio "Ticket Asado" dentro del carrito, y lo que compre después ("para la casa") no se mezcla con él.

## Vocabulario para no perdernos

- **CalcularAsado**: nombre del componente (`js/components/catalog/calcularAsado.js`, CSS en `css/components/catalog/calcularAsado.css`) y del modo que activa.
- **Modo Asado**: el estado activado de la página mientras dura el flujo — se nota en el borde exterior de la ventana y en el contador flotante.
- **Contador de carne** (`.ca-widget` en el código): el elemento flotante vertical, pegado a la derecha de la pantalla, que muestra cuánto kg de carne falta para completar lo calculado según la cantidad de personas, más un contador aparte de provoleta sugerida. Se actualiza en vivo.
- **Índice de consumo** (`indiceAsado` en `data/products.json`): cuánto se calcula que come una persona de ese producto en un asado.
- **Ticket Asado**: el ticket del sistema de tickets (ver [rediseno-tickets-pedido.md](rediseno-tickets-pedido.md)) donde vive todo lo que se agrega durante el modo Asado. No es un mecanismo aparte — es el mismo `CartState` de siempre, solo que este componente crea uno, lo nombra "Ticket Asado" y lo deja activo mientras dura el modo.

## Cómo se entra al modo

- El botón (ícono de parrilla con una llama abajo, ver `ICON` en `calcularAsado.js`) vive en `.catalog-toolbar`, a la derecha del toggle Grilla/Lista — mismo lugar donde ya estaban el botón de colapsar todo (izquierda) y el toggle de vista (centro). **Decisión tomada:** se dibujó un ícono de línea nuevo en vez de reusar uno de `icons.js`, porque ese archivo es específicamente para íconos de categoría — este botón sigue el mismo criterio que `ViewToggle`/`CollapseToggle`, que también dibujan su propio ícono inline.
- Al tocarlo, se abre el modal "¿Cuántos son en el asado?" (stepper −/+, arranca en 4). Confirmar prende el modo.
- **Tratamiento visual del "modo activo" (decisión tomada):** un `::after` fijo a la ventana (`position: fixed; inset: 0`, no a la página — así se ve igual sin importar el scroll) con un borde de 4px en el rosa oscuro de la marca, pulsando de opacidad 0.5 a 1 cada 1.8s. Se prende/apaga con la clase `ca-active` en `<body>`.

## Secuencia (qué va preguntando, en orden)

1. **Al activar CalcularAsado** → modal: *"¿Cuántos son en el asado?"* — stepper +/−, arranca en 4 personas, botón "Empezar".
2. **Confirmado el número de personas** → se decide el ticket (ver "Después del asado" abajo), aparece el contador de carne flotante, y el catálogo se reordena: **cerdo pasa a estar antes que pollo** (`CalcularAsado.reorderForAsado`, genérico — mueve "cerdo" justo antes de "pollo" sin tocar el resto del orden, así que si mañana se agregan más categorías siguen donde estaban).
3. **Mientras el usuario va agregando cortes** (desde las cards/filas de siempre, sin ningún flujo especial) → el contador se actualiza en vivo vía `Cart.subscribe`, recalculando cuánto falta (ver fórmula abajo). **No hay "distribución/consejo" automático entre vacuno/cerdo/pollo** — se descartó esa parte de la idea original: el reordenamiento de categorías ya es la forma en que el modo "aconseja" (pone cerdo más arriba), pedirle además que sugiera cortes puntuales quedó fuera del alcance de esta v1.
4. **Botón "Terminar pedido"** (en el contador flotante) → dispara la cadena de preguntas, una a la vez, **solo por lo que falte**:
   - Si no hay ningún **embutido** en el Ticket Asado → *"¿Querés agregar embutidos?"*
   - Si no hay **provoleta** → *"¿Querés agregar provoleta?"*
   - Si no hay **achuras** → *"¿Querés agregar achuras?"*

   **Decisión tomada sobre el "Sí":** decir que sí NO corta el modo — cierra la pregunta, lleva al usuario a esa categoría (scroll + la despliega si estaba colapsada) y ahí se queda, todavía en modo Asado, para que lo que agregue caiga en el Ticket Asado. El usuario vuelve a tocar "Terminar pedido" cuando termine, y la cadena se re-evalúa desde cero — no repite lo que ya está resuelto. Decir que no pasa a la siguiente pregunta.
5. **Sin nada pendiente** (se contestó que no a las tres, o nunca hizo falta preguntar) → se apaga el modo (borde + contador), se abre un ticket nuevo para lo que se compre después ("para la casa"), y se abre el modal del pedido (`Cart.openModal()`) para que el usuario complete nombre/dirección y mande el WhatsApp.

## Salir del modo antes de terminar

**Decisión tomada** (era una de las dos opciones abiertas en la versión anterior de este documento): el botón `×` del contador flotante apaga el modo **sin** pasar por la cadena de preguntas — el borde y el contador desaparecen, pero el Ticket Asado con lo que ya se agregó queda intacto y sigue siendo el ticket activo (no se crea un ticket nuevo). Se eligió esto sobre "perder el progreso" porque es no-destructivo: en el peor caso el usuario vuelve a tocar el botón de CalcularAsado más tarde.

Si en ese momento el ticket seguía vacío (el usuario activó el modo pero no llegó a agregar nada), no queda ningún rastro raro: es el mismo ticket "Pedido 1" de siempre, solo que ya tiene el nombre "Ticket Asado" puesto — inofensivo, y si se vuelve a activar el modo en la misma visita, se reusa (no crea uno nuevo) mientras siga vacío.

**Límite conocido, no resuelto en esta v1:** si mientras el modo está activo el usuario abre el carrito y cambia de ticket activo a mano (con "+ Nuevo pedido" o tocando otro chip), lo que agregue después desde el catálogo va a parar a ESE ticket, no al Ticket Asado — el contador flotante sigue mostrando el progreso del Ticket Asado original (porque lo trackea por id, no por "el ticket activo"), pero deja de reflejar lo que se está agregando. No se bloqueó el selector de tickets durante el modo Asado para no complicar el alcance de esta versión; queda anotado acá por si en algún momento se vuelve un problema real.

## Después del asado: el ticket

- **Al activar el modo:** si el ticket activo en ese momento está vacío, se lo renombra "Ticket Asado" y se reusa (no se crea uno redundante). Si ya tenía productos (el usuario ya había agregado algo antes de activar CalcularAsado), se crea un ticket nuevo llamado "Ticket Asado" y se lo deja activo — así lo que ya estaba ahí no se mezcla.
- **Al terminar** (paso 5 de la secuencia): se crea un ticket nuevo (nombre default, "Pedido N") y se lo deja activo, para que las compras "para la casa" queden aparte.
- **Decisión tomada sobre cómo se "marca" una línea como parte del Ticket Asado:** no hizo falta ningún campo nuevo tipo `origen` — se usa el sistema de tickets tal cual ya está armado (`CartState.createTicket`/`renameTicket`/`setActiveTicketId`, ver [rediseno-tickets-pedido.md](rediseno-tickets-pedido.md)). Una línea "pertenece" al Ticket Asado simplemente porque vive dentro de ese ticket — es el mismo mecanismo que ya usa "Mis pedidos" en el carrito para cualquier otro caso de pedidos separados, CalcularAsado no le agrega nada especial.
- El agrupado en el modal del carrito y las secciones `📦 {nombre del ticket}` del mensaje de WhatsApp **ya existían** (los arma `cart.js` para cualquier caso con más de un ticket no vacío) — CalcularAsado no tuvo que tocar nada ahí, solo usar el sistema de tickets como cualquier otro flujo lo haría.

## Cálculo de cuánto falta

### Índice de consumo por persona — `indiceAsado` en `products.json`

**Decisión tomada sobre el nombre y nivel del campo:** se llama `indiceAsado`, es un número, y va **por producto** (no por `cut` ni por categoría) — necesario porque Chinchulín y Molleja necesitan su propio valor distinto al resto de "Achuras". Se cargó en cada producto de `vacuno`/`pollo`/`cerdo` según su `cut` (magros y "Para milanesa"/"Picada" → 0.5; "Cortes con hueso" → 0.8), y puntualmente en Molleja (0.4), Chinchulín (0.25) y Provoleta (0.5). Embutidos y el resto de Achuras (Riñón, Mondongo, Hígado) **no tienen** `indiceAsado` — no hacía falta, ver "Agregados" abajo.

| Tipo de corte | `indiceAsado` |
|---|---|
| Cortes magros / Para milanesa / Picada | 0.5 kg / persona |
| Cortes con hueso (asado) | 0.8 kg / persona |
| Chinchulín | 0.25 kg / persona |
| Molleja | 0.4 kg / persona |
| Provoleta | 0.5 unidades / persona (o sea, 1 cada 2) |

La unidad del índice (kg vs. unidades) no está declarada aparte en el JSON — se infiere en el código: para Provoleta se interpreta como "unidades por persona" (un caso especial por categoría, `catKey === "provoleta"`, ver `computeProgress` en `calcularAsado.js`); para todo lo demás es "kg por persona", usando `CartState.kgOf(entry)` para normalizar tanto líneas compradas "por kilo" como "por unidad" a kilos antes de dividir por el índice.

### La barra de progreso — fórmula usada

**Decisión tomada** (reemplaza el "falta definir la fórmula" de la versión anterior): cada línea del Ticket Asado con `indiceAsado` (menos Provoleta) suma **"personas que esa cantidad cubre"**: `personasCubiertas += kgDeLaLinea / indiceAsado`. Se suma esto para todas las líneas y se compara contra las personas objetivo. Recién ahí se traduce a un número de kg amigable para mostrar, usando el baseline general de 0.5 kg/persona:

```
kgFaltan = max(0, (personasObjetivo − personasCubiertas) × 0.5)
```

Por qué así: cada corte "rinde" distinto por persona (un chinchulín rinde más que un asado con hueso), así que no tendría sentido restar kilos de cortes distintos directamente unos de otros — se los compara en la misma unidad ("a cuánta gente le alcanza esto"), y solo al final se vuelve a expresar en kg usando el promedio general, que es un número más fácil de leer en el contador que "personas cubiertas". La barra (el alto del relleno vertical) se calcula igual, como `personasCubiertas / personasObjetivo`, tope 100%.

- Son **sugerencias**: no bloquea nada, el usuario puede seguir agregando después de llegar a 100%.

### Agregados (no cuentan como carne)

- **Provoleta**: contador aparte (`🧀 x/y provoletas` en el widget), sugerido `Math.ceil(personas / 2)`. No entra en el cálculo de `kgFaltan`.
- **Embutidos**: no entran en el cálculo en vivo (no tienen `indiceAsado`) — solo se preguntan al final si el Ticket Asado no tiene ninguno. La tabla original tenía "1 unidad/persona" para embutidos, pero como se venden por kilo en `products.json` (no por unidad), no había una cantidad real con la que calcular ese índice — se optó por dejarlos fuera del contador en vez de forzar una conversión inventada.
- **Achuras en general** (Riñón, Mondongo, Hígado): mismo criterio que embutidos, solo presencia al final. Molleja y Chinchulín son la excepción — sí tienen `indiceAsado` y sí cuentan en vivo, porque el pedido original los trató como "carne" — así que si ya se agregó Chinchulín durante el armado, la pregunta final de achuras se salta (ya hay algo de esa categoría).

## Integración pendiente con la Orbe

Esta sección es la que hay que releer cuando se programe `js/components/orbe.js` (ver [rediseno-orbe-guia.md](rediseno-orbe-guia.md) para el vocabulario `Orbe.elevate()` / `Orbe.dock()` / cartelito). Es una lista punto por punto de qué reemplazar en `calcularAsado.js`:

1. **`openPeopleModal()`** — hoy es un modal de texto plano ("¿Cuántos son en el asado?"). Cuando exista la Orbe, este paso debería seguir el mismo patrón que ya usan `openModeModal`/`openPrepModal` en `cards.js`: al abrir el modal, llamar `Orbe.elevate(texto)` con la explicación de este paso puntual, y `Orbe.dock()` al cerrarlo (elegido el número o cancelado). El modal en sí (el stepper de personas) no cambia — lo que cambia es que la Orbe se posa arriba y explica.

2. **El momento de activar el modo (paso 2 de la secuencia)** — hoy no hay ningún cartelito, el contador flotante aparece directo. Sería el lugar para un cartelito de bienvenida al modo, algo como (texto a definir con el criterio del resto de cartelitos, corto y en criollo): *"Te voy guiando: fijate cuánta carne te falta ahí a la derecha, y sumá los cortes que quieras."* Esto necesitaría que la Orbe se muestre en su estado "anclado" con este mensaje disponible al tocarla, no como un modal — ver la tabla de estados de `rediseno-orbe-guia.md` para cuál transición corresponde.

3. **`openYesNoModal()`** (la cadena de embutidos/provoleta/achuras) — mismo criterio que el punto 1: `Orbe.elevate(pregunta)` al abrir cada pregunta, `Orbe.dock()` al cerrarla (sea que contestó sí, no, o cerró tocando afuera).

4. **El contador flotante (`.ca-widget`)** — hoy es un elemento visual sin voz. Un paso posterior (no necesariamente parte de "integrar la Orbe", pero relacionado) podría ser que tocar el contador muestre un cartelito de la Orbe explicando qué significa el número y la barra — mismo mecanismo que "tocar el orbe muestra el cartelito" ya documentado para los demás flujos.

5. **Nada de la lógica de datos cambia** — igual que aclara `rediseno-orbe-guia.md` para el resto del sitio: la Orbe es una capa visual encima de este flujo, no reemplaza `openPeopleModal`/`openYesNoModal` ni la lógica de `computeProgress`/tickets. Los modales siguen siendo los mismos, el cambio es que la Orbe se posa arriba y habla.
