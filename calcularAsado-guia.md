# CalcularAsado: modo juego para armar el pedido de un asado

Documento vivo — se va completando a medida que lo definimos juntos. Todavía no está implementado nada de esto; es la referencia para diseñarlo antes de tocar código. Este modo usa a **la Orbe** (ver [rediseno-orbe-guia.md](rediseno-orbe-guia.md)) como la voz que va guiando al usuario paso a paso, así que conviene leer ese documento primero — acá se documentan los cartelitos y disparadores nuevos que le suma este flujo.

## La idea, en una frase

Un botón nuevo activa un "modo juego": en vez de navegar libremente sumando cortes, el usuario le dice a la Orbe cuántas personas van al asado, y la Orbe lo guía corte por corte con un contador flotante que le va mostrando cuánta carne le falta todavía — como una barra de progreso — hasta que arma el pedido completo.

## Vocabulario para no perdernos

- **CalcularAsado**: nombre del componente nuevo y del modo que activa. Vive donde vivan los demás componentes autocontenidos (mismo criterio que `cards.js`, `nav.js`, etc.).
- **Modo Asado**: el estado activado de la página mientras dura el flujo — se nota en el borde exterior de la página y en el contador flotante (ver abajo).
- **Contador de carne**: el elemento flotante vertical, pegado a la derecha de la pantalla, que muestra cuánto kg de carne falta para completar lo calculado según la cantidad de personas. Se actualiza en vivo a medida que el usuario va agregando cortes.
- **Índice de consumo**: el dato nuevo que se agrega a cada producto en `data/products.json`, que dice cuánto se calcula que come una persona de ese corte en un asado (ver más abajo).

## Cómo se entra al modo

- Un ícono nuevo (parrilla/asado) se suma pegado a la derecha de los íconos existentes de "Ver en grilla" / "Ver en lista" (el `ViewToggle` que ya existe).
- Al tocarlo:
  1. Toda la página recibe un **borde exterior visible** — una señal explícita de "estás en modo asistido, todo lo que elijas se está siguiendo". *(Falta definir el tratamiento visual exacto: color, grosor, si pulsa o es fijo — tiene que leerse claramente distinto del resto de la UI, no un detalle sutil.)*
  2. Se abre el modal de siempre (desde abajo, mismo componente que ya usan `openModeModal` / `openPrepModal`), con la primera pregunta de la Orbe.

## Secuencia de la Orbe (qué va preguntando, en orden)

1. **Al activar CalcularAsado** → modal: *"¿Cuántos son en el asado?"* (un número — a definir si es un input numérico simple o un stepper +/− como los que ya existen en el resto del sitio).
2. **Confirmado el número de personas** → se cierra el modal, aparece el contador de carne flotante (arranca el "juego"), y el catálogo se reordena para el modo asado: **vacuno → cerdo → pollo** (cerdo sube por encima de pollo respecto al orden normal).
3. **Mientras el usuario va agregando cortes** → el contador de carne se actualiza en vivo, restando lo agregado del objetivo total. La Orbe va distribuyendo/aconsejando entre los cortes de vacuno, cerdo y pollo a medida que el usuario elige (el detalle de qué dice en cada momento queda pendiente, ver "Cartelitos" más abajo).
4. **Al tocar "Hacer pedido"** (el cierre del flujo), antes de proceder, la Orbe pregunta — como pasos encadenados, uno a la vez, solo si falta:
   - Si no se agregó ningún **embutido** → *"¿Querés agregar embutidos?"*
   - Si no se agregó **provoleta** → *"¿Querés agregar provoleta?"*
   - Si no se agregaron **achuras** → *"¿Querés agregar achuras?"*

   Cada pregunta es opcional — si el usuario dice que no (o cierra), pasa a la siguiente.

5. **Terminadas esas tres preguntas** → todo lo que se agregó durante el modo Asado (los cortes de carne más lo que se haya sumado de embutidos/provoleta/achuras) queda marcado como **"Ticket Asado"** dentro del carrito. El modo Asado se apaga (se saca el borde exterior y el contador flotante), pero el carrito sigue abierto para que el usuario pueda seguir agregando productos sueltos "para la casa" — esos se ven como algo aparte, no se mezclan con el Ticket Asado.

## Después del asado: el carrito queda separado en dos

- Una vez cerrado el flujo (paso 5 de arriba), el modal del carrito muestra **dos grupos** en vez de una sola lista plana: el **Ticket Asado** (todo lo elegido durante el modo guiado) y el resto de líneas normales que el usuario agregue después navegando el catálogo como siempre.
- Esto es puramente una forma de **agrupar y mostrar** las líneas que ya existen en el carrito — no es un carrito ni un total aparte. El total general sigue siendo uno solo.
- El mensaje que se arma para **WhatsApp** respeta esa misma separación: el texto del pedido sale con las líneas del Ticket Asado agrupadas bajo su propio encabezado, y después las demás líneas ("para la casa") bajo el suyo — así el que recibe el pedido en la carnicería también ve la distinción de un vistazo.
- *(Falta definir: cómo se "marca" una línea del carrito como parte del Ticket Asado a nivel de datos — lo más simple sería una propiedad extra en cada línea, ej. `origen: "asado"`, que ya viaja con el resto de la línea (producto, modo, preparación, cantidad) y no toca el cálculo de precios/total. Falta también el texto exacto de los encabezados en el modal del carrito y en el mensaje de WhatsApp.)*

## Cálculo de cuánto falta

### Índice de consumo por persona (nuevo campo en `products.json`)

Cada producto (o tipo de corte) suma un índice de cuánto se calcula que come una persona en un asado:

| Tipo de corte | Índice sugerido |
|---|---|
| Cortes magros | 0.5 kg / persona |
| Asado (con hueso) | 0.8 kg / persona |
| Embutidos | 1 unidad / persona |
| Chinchulín | 0.25 kg / persona |
| Molleja | 0.4 kg / persona |

*(Falta definir: el nombre final del campo en el JSON, y si el índice se asigna por producto individual, por `cut` (el campo que ya existe, ej. "Cortes magros", "Achuras"), o por categoría entera — hoy `cut` es el campo que más se parece a estos grupos, pero achuras individuales como Chinchulín y Molleja necesitan su propio índice distinto al resto de "Achuras", así que probablemente el índice va por producto, con estos valores como default sugerido por tipo de corte.)*

### La barra de progreso

- El objetivo total no es una simple regla de "medio kilo por persona" aplicada a todo — cada corte que el usuario va sumando descuenta del objetivo según SU PROPIO índice, no todos por igual. *(Falta definir la fórmula exacta: cómo se combina en una sola barra de "kg que faltan" cuando hay cortes que se miden en kg y otros en unidades — ej. embutidos, que son 1 unidad/persona, no kg.)*
- Son **sugerencias**: el usuario elige libremente y puede agregar más o menos de lo que la barra sugiere — la barra no bloquea nada, solo informa.

### Agregados (no cuentan como carne)

- **Provoleta**: se sugiere 1 cada 2 personas. No descuenta de la barra de carne — es un contador/sugerencia aparte.
- Achuras y embutidos en general: se preguntan al final si no se agregaron (ver paso 4), no forman parte del contador principal de carne salvo Chinchulín y Molleja, que sí tienen su propio índice (ver tabla) porque son parte de lo que se sirve como "carne" en muchos asados.

## Qué falta definir todavía

- Texto exacto de cada cartelito de la Orbe en este flujo (arranque, mientras se eligen cortes, las tres preguntas del final).
- Tratamiento visual del borde exterior de "modo activo".
- Diseño del contador de carne flotante (qué tan literal es el "juego" — número y barra, o algo más visual).
- Fórmula exacta para combinar kg y unidades en una sola barra de progreso.
- Nombre final del campo de índice de consumo en `products.json` y a qué nivel se asigna (producto vs. `cut`).
- Qué pasa si el usuario desactiva el modo Asado a mitad de camino: ¿se pierde el progreso o el carrito ya armado queda igual (solo se apaga la guía visual)?
- Ícono de parrilla/asado a usar — crear uno nuevo en el mismo estilo línea de `icons.js`, o buscar alguno existente que sirva.
- Cómo se marca a nivel de datos que una línea del carrito pertenece al Ticket Asado (propuesta: campo `origen` en la línea, ver sección "Después del asado").
- Si el usuario vuelve a activar CalcularAsado más tarde en la misma visita (ej. se olvidó algo), ¿arranca un Ticket Asado nuevo, suma al mismo, o no se puede reabrir una vez cerrado?
- Texto exacto de los encabezados "Ticket Asado" / resto de productos, tanto en el modal del carrito como en el mensaje de WhatsApp.
