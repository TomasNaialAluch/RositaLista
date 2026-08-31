# Filtro "Cortes de Asado" en modo Asado (Vacuno/Cerdo/Achuras)

**Estado: implementado.** Quedó como referencia de cómo funciona y de las decisiones tomadas al programarlo (marcadas abajo donde antes decía "a confirmar" — se implementó con las propuestas de este documento, sin más ida y vuelta). Complementa [calcularAsado-guia.md](calcularAsado-guia.md) — no lo reemplaza.

## Decisiones tomadas al programar (resumen)

- **Roastbeef y Paleta se sacaron del filtro**, como proponía este documento.
- **Copy de los chips**: "🔥 Cortes de asado" / "Ver todos los cortes", tal cual se propuso.
- **El orden de Cerdo y Achuras** se implementó tal cual las tablas de este documento (sin más respaldo de fuente del que ya está documentado abajo).
- **"Ver todos los cortes" no se recuerda entre visitas** — cada vez que se activa el modo Asado, los chips arrancan de nuevo en "Cortes de asado".
- **Mondongo/Hígado + modo selección de achuras**: se implementó la propuesta — `AsadoFilter.showAll()` fuerza el chip a "Ver todos" al entrar al modo selección de Achuras, así Mondongo/Hígado quedan visibles y seleccionables aunque el filtro estuviera activo.
- **A diferencia del modo selección de Embutidos/Achuras** (que solo funciona en vista Grilla), **este filtro funciona en Grilla y en Lista** — el filtrado/orden pasa por `category.items` antes de llegar a cualquiera de los dos renderers (`Cards`/`ProductList`), así que ninguno de los dos necesitó cambios.

## La idea, en una frase

Mientras dura el modo Asado, arriba de la categoría Vacuno (debajo de los botones Grilla/Lista) aparecen unos chips de filtro. Con **"Cortes de asado" activo por defecto**, las categorías Vacuno, Cerdo y Achuras dejan de mostrar todos sus productos y pasan a mostrar **solo los que realmente se usan en un asado** (nada de Peceto, Nalga, cortes de milanesa, Mondongo, Hígado, etc.), **reordenados de más a menos importante** según qué tan protagonista es cada uno en un asado argentino. Pollo, Embutidos y Provoleta no se tocan.

## Dónde van los chips y cómo se ven

- Aparecen **solo mientras el modo Asado está activo** (`body.ca-active`) — no existen en el catálogo normal.
- Posición: una fila nueva, debajo de `.catalog-toolbar` (donde están hoy Colapsar / Grilla-Lista / Calcular Asado) y arriba de `#catalog` (donde arranca la sección Vacuno) — así siempre quedan "arriba de Vacuno, abajo de los botones de grilla/lista" sin importar el scroll.
- Dos chips, mutuamente excluyentes (como un toggle, no multi-selección):
  - **"🔥 Cortes de asado"** — seleccionado por defecto al activar el modo.
  - **"Ver todos los cortes"** — vuelve Vacuno/Cerdo a como se ven hoy (todo, sin reordenar), por si el cliente quiera algo fuera de lo típico (ej: un Peceto para llevar de yapa).
- El chip activo se marca con el mismo lenguaje visual que ya usa el resto de la app para "seleccionado" (relleno rosa oscuro, texto blanco — mismo criterio que `.rc-select-btn--selected` del modo selección de embutidos/achuras).

## Qué categorías toca

**Vacuno, Cerdo y Achuras.** Pollo, Embutidos y Provoleta se muestran exactamente igual estén en el modo que estén — no tiene sentido filtrar "cortes de asado" ahí (Pollo ya son 3 productos, todos aptos para la parrilla; Embutidos y Provoleta no son "cortes" en ese sentido, y además Embutidos ya tiene su propio flujo en modo Asado — ver [rediseno-embutidos-asado.md](rediseno-embutidos-asado.md)).

## Investigación: qué corte es "de asado" y cuál no

Se distinguen dos grupos de cortes vacunos en Argentina: los que se preparan **a la parrilla/asador** (asado propiamente dicho) y los que se compran para **milanesa, horno o guisos/estofados** — son preparaciones distintas y en la carnicería es común que el cliente sepa para cuál está comprando. Fuentes consultadas abajo.

### Vacuno — se sacan del filtro (no son cortes de asado)

| Producto | Por qué se saca |
|---|---|
| Peceto | Cut de milanesa por excelencia — magro, tierno, se vende hoy con `opcionesPreparacion: ["Para milanesa"]` como única opción. |
| Nalga | Mismo caso — "de las favoritas para milanesa por su equilibrio entre ternura, sabor y bajo contenido graso" (única opción hoy: `["Milanesa"]`). |
| Bola de Lomo | Corte magro y tierno recomendado específicamente para milanesa (única opción hoy: `["Para milanesa"]`). |
| Cuadrada | Mismo grupo que los tres anteriores — "carne compacta, ideal para quienes prefieren milanesas más firmes" (única opción hoy: `["Para milanesa"]`). |
| Picada Especial | Es carne picada (molida) — se usa para empanadas/hamburguesas/guisos, no se tira a la parrilla en trozo. |
| Tortuguita | Corte del gemelo de la pata trasera, junto al Peceto — duro, se usa para pucheros/estofados/horno de cocción larga, no para asado. |

Estos 6 coinciden con los que hoy tienen `opcionesPreparacion` compuesta **únicamente** por una opción de milanesa (o son directamente picada/no aptos), salvo Tortuguita — que no tiene ese campo en `products.json`, pero la investigación es clara sobre su uso.

### Vacuno — decisión a confirmar (señal mixta en la investigación)

| Producto | Por qué dudo |
|---|---|
| Roastbeef | La mayoría de las fuentes lo asocian a horno/estofado/fiambre casero, no a parrilla — pero hoy en `products.json` tiene `opcionesPreparacion: ["En churrascos", "Picada"]`, o sea que este local ya lo vende pensado también para churrasco (que sí es asado). |
| Paleta | Mismas `opcionesPreparacion` que Roastbeef (`["En churrascos", "Picada"]`) y algunas fuentes lo mencionan para "bifes y asados", pero la mayoría lo ubica en guisos/horno. |

**Mi propuesta:** sacarlos del filtro igual (van a "Ver todos"), porque el uso predominante en las fuentes es horno/milanesa/guiso — pero como este local ya los vende con la opción "En churrascos" (a diferencia de Peceto/Nalga/Bola de Lomo/Cuadrada, que ni siquiera ofrecen esa opción), quedan como la única duda real de la lista. Confirmame si preferís dejarlos adentro.

### Vacuno — quedan en el filtro (cortes de asado), 12 productos

Asado del Medio, Vacío, Colita de Cuadril, Lomo Premium, Ojo de Bife, Entraña, Bife de Chorizo, Bife Angosto, Bife Ancho, Picaña, Palomita, Matambre.

### Cerdo — se saca del filtro

| Producto | Por qué se saca |
|---|---|
| Solomillo | Corte magro (lomo de cerdo) que la mayoría de las fuentes asocia a milanesa/horno — aunque se puede grillar en medallones, no es un corte típico de parrillada de cerdo. Hoy ya se vende con `opcionesPreparacion: ["Para milanesa"]` como única opción, mismo patrón que Peceto/Nalga en vacuno. |

### Cerdo — quedan en el filtro, 6 productos

Matambrito de Cerdo, Bondiola, Pechito de Cerdo, Ribs, Carré de Cerdo, Churrasquito.

### Achuras — se sacan del filtro

| Producto | Por qué se saca |
|---|---|
| Mondongo | Es panza de res — en Argentina se usa mayormente para guiso/locro de invierno; se puede grillar pero no es lo típico. Además ya se vende como pieza entera de ~5 kg (no por ración individual), a diferencia de Molleja/Chinchulín/Riñón — ver la nota sobre esto en [rediseno-embutidos-asado.md](rediseno-embutidos-asado.md) ("Por qué Mondongo e Hígado NO tienen indiceAsado"). |
| Hígado | No es una achura típica de parrillada — se usa más para "hígado a la manteca"/adobado, salteado con cebolla, o paté, no como pieza que se tira a las brasas junto con el resto. Mismo caso que Mondongo: se vende como pieza entera de ~3 kg, no por ración. |

### Achuras — quedan en el filtro, 3 productos

Molleja, Chinchulín, Riñón — las tres ya se venden por kilo suelto (no pieza entera) y ya tienen `indiceAsado` (ver rediseno-embutidos-asado.md), coherente con que sean las tres consideradas "achura de parrilla".

## Orden propuesto (más → menos importante en un asado)

**Ojo:** esto no es una clasificación oficial única — es una combinación de un ranking encontrado en la búsqueda (los primeros 7 de Vacuno, marcados abajo) más criterio propio para completar el resto, avisando dónde tuve que decidir sin una fuente que ordenara explícitamente. Es fácil de ajustar antes de programar si algo no te cierra.

### Vacuno

| # | Producto | Fuente del orden |
|---|---|---|
| 1 | Asado del Medio | #1 del ranking consultado ("Tira de Asado", el corte más emblemático) |
| 2 | Bife de Chorizo | #2 del ranking ("el corte estrella") |
| 3 | Vacío | #3 del ranking |
| 4 | Bife Ancho | Criterio propio — descripto en otra fuente como "extremadamente popular, uno de los más finos y buscados"; lo subí cerca del podio |
| 5 | Ojo de Bife | Criterio propio — es el rib eye/entrecot, muy prestigioso, junto con Bife Ancho |
| 6 | Colita de Cuadril | #4 del ranking |
| 7 | Entraña | #5 del ranking |
| 8 | Matambre | #6 del ranking |
| 9 | Bife Angosto | Criterio propio — descripto como popular pero "un escalón por debajo del Bife de Chorizo" |
| 10 | Picaña | Criterio propio — muy buscada, pero es una incorporación más reciente a la parrilla porteña (moda brasileña) |
| 11 | Lomo Premium | #7 del ranking, pero lo bajé: se lo describe más como corte "elegante"/de ocasión que como protagonista típico del asado de todos los días |
| 12 | Palomita | #9 del ranking |

### Cerdo

Sin un ranking único encontrado para cerdo — orden armado 100% con criterio propio a partir de lo que dice cada fuente sobre popularidad/protagonismo:

| # | Producto | Por qué ahí |
|---|---|---|
| 1 | Matambrito de Cerdo | Una fuente lo nombra explícitamente como el que "lidera la parrilla" de cerdo, por el balance entre sabor, rapidez y practicidad |
| 2 | Bondiola | Descripta como "uno de los cortes de cerdo más populares y apreciados, especialmente para asado" |
| 3 | Pechito de Cerdo | El costillar de cerdo cortado en tiras (banderita/3 dedos/5 dedos, igual que el Asado del Medio) — clásico y muy pedido |
| 4 | Ribs | Mismo grupo que Pechito (costilla) — pieza más chica, sin las opciones de corte de Pechito |
| 5 | Carré de Cerdo | "El corte de cerdo más difundido en los hogares argentinos" — muy versátil, pero por eso menos "especial" que los anteriores |
| 6 | Churrasquito | Corte fino y rápido, más pensado para el día a día que para la ocasión especial |

**Esta tabla de Cerdo tiene menos respaldo de fuente que la de Vacuno** — si tenés otro criterio (por precio, por lo que más se vende en el local, etc.) decime y la cambio antes de programar.

### Achuras

| # | Producto | Por qué ahí |
|---|---|---|
| 1 | Molleja | La más "manjar" de las tres, mayor `indiceAsado` (0.25, empatada con Chinchulín pero considerada más protagonista/festejada en general). |
| 2 | Chinchulín | El otro clásico infaltable de la achura de parrilla, junto con Molleja. |
| 3 | Riñón | Sabor más fuerte y polarizante — ya tiene el `indiceAsado` más bajo de las tres (0.1), coherente con que sea "menos" en esta lista también. |

**Mismo criterio que la tabla de Cerdo: sin ranking único de fuente**, ordenado según lo que ya reflejan los `indiceAsado` existentes (ver [rediseno-embutidos-asado.md](rediseno-embutidos-asado.md)) más el conocimiento general de que Molleja/Chinchulín son "las dos" achuras infaltables y Riñón queda un escalón atrás.

## Comportamiento (implementado)

- **`js/components/catalog/asadoFilter.js`** — dibuja los dos chips, guarda cuál está activo, expone `AsadoFilter.create(onChange)`, `AsadoFilter.remove()`, `AsadoFilter.isAsadoOnly()` y `AsadoFilter.showAll()` (ver más abajo). No sabe nada de productos.
- **Dónde se monta:** `app.js`, insertado con `insertBefore(asadoFilterEl, catalogEl)` — entre `.catalog-toolbar` y `#catalog`. Se monta/desmonta en los mismos callbacks `onEnter`/`onExit` que ya usa `CalcularAsado.create` en `app.js` para reordenar categorías — `CalcularAsado` no sabe nada de esto, es un componente hermano.
- **Filtrado y orden en sí:** `data/asadoOrder.json` tiene, por categoría (`vacuno`/`cerdo`/`achuras`), la lista de nombres de producto en el orden de las tablas de arriba. `applyAsadoFilter(catKey, category)` en `app.js` arma un `category.items` filtrado+ordenado según esa lista cuando `asadoActive && AsadoFilter.isAsadoOnly()`; en cualquier otro caso devuelve la categoría tal cual viene de `products.json`. `renderCatalog()` le pasa el resultado a `Cards`/`ProductList` sin que ninguno de los dos sepa que existe un filtro — por eso funciona igual en Grilla y en Lista.
- **No pisa el reorder de categorías que ya existe:** `CalcularAsado.reorderForAsado` mueve "cerdo" antes que "pollo" (orden de **categorías**); esto es un orden de **productos dentro de** cada categoría — conviven sin conflicto, uno no sabe del otro.
- **Con embutidos sin cambios**, ya que quedó fuera del alcance de este filtro.
- **Con el modo selección de Achuras** (cuando el usuario dice que sí a "¿Querés agregar achuras?" en la cadena final — ver [rediseno-embutidos-asado.md](rediseno-embutidos-asado.md)): `startAchurasSelection()` en `calcularAsado.js` llama `AsadoFilter.showAll()` antes de `Cards.enterSelectionMode(...)`, así que el chip visualmente pasa a "Ver todos los cortes" y Mondongo/Hígado quedan visibles y seleccionables. No hay ningún "modo forzado" invisible — el chip realmente cambia, y el usuario puede volver a tocar "Cortes de asado" si quiere (aunque eso volvería a ocultar Mondongo/Hígado mientras siga en modo selección).

## Qué archivos se tocaron

- **Nuevo `js/components/catalog/asadoFilter.js`** — el componente de los chips.
- **Nuevo `css/components/catalog/asadoFilter.css`** — estilos de los chips (reusando el lenguaje visual de `.rc-select-btn`, con las variables `--rosita-pink`/`--rosita-pink-dark` de `css/styles.css`).
- **Nuevo `data/asadoOrder.json`** — las tres listas ordenadas (Vacuno, Cerdo, Achuras) de las tablas de arriba.
- **`index.html`** — `<link>` y `<script>` nuevos para los dos archivos de arriba.
- **`js/app.js`** — fetch de `data/asadoOrder.json` junto con `products.json`/`config.json`; montar/desmontar `AsadoFilter` en los callbacks `onEnter`/`onExit` de `CalcularAsado.create`; `applyAsadoFilter()` nueva, usada por `renderCatalog()`.
- **`js/components/catalog/calcularAsado.js`** — `startAchurasSelection()` llama `AsadoFilter.showAll()` (ver arriba).

## Qué NO cambia

- El modelo de datos de `products.json` no se toca — el filtro/orden vive aparte, no se le agrega ningún campo nuevo a los productos.
- Pollo, Embutidos, Provoleta — sin cambios en ningún escenario.
- El catálogo fuera del modo Asado — sin cambios, los chips ni existen ahí.
- El modo selección de Embutidos/Achuras (ver [rediseno-embutidos-asado.md](rediseno-embutidos-asado.md)) — la lógica en sí no cambió (sigue siendo `Cards.enterSelectionMode` + los mismos `controller`); lo único nuevo es la llamada a `AsadoFilter.showAll()` antes de activarlo para Achuras.

## Checklist (verificado)

- Activar el modo Asado muestra los chips arriba de Vacuno, con "Cortes de asado" ya seleccionado.
- Con ese chip activo, Vacuno muestra solo los 12 cortes de la tabla, en ese orden; Peceto/Nalga/Bola de Lomo/Cuadrada/Picada Especial/Tortuguita no aparecen.
- Con ese chip activo, Cerdo muestra solo los 6 cortes de la tabla, en ese orden; Solomillo no aparece.
- Con ese chip activo, Achuras muestra solo Molleja/Chinchulín/Riñón, en ese orden; Mondongo/Hígado no aparecen.
- Tocar "Ver todos los cortes" devuelve Vacuno, Cerdo y Achuras a como se ven hoy (todo, orden original de `products.json`) — verificado en Grilla y en Lista.
- Pollo, Embutidos y Provoleta no cambian en ningún estado del filtro.
- El modo selección de Achuras (al decir que sí a "¿Querés agregar achuras?") cambia el chip a "Ver todos" solo y deja ver/seleccionar Mondongo/Hígado.
- Apagar el modo Asado saca los chips y el catálogo vuelve a mostrar todo, sin importar qué chip haya quedado seleccionado.
- El reorder de categorías (cerdo antes que pollo) sigue funcionando igual, sin importar qué chip esté activo.
- Sin errores de consola en todo el flujo.

## Fuentes consultadas

- [10 cortes de carne más utilizados en los asados argentinos](https://www.brasasysabores.com/cortes-de-carne-en-los-asados-argentinos/)
- [Cortes de Carne Argentina: Guía Completa](https://hacerasado.com.ar/cortes-de-carne-argentina/)
- [Peceto, nalga, cuadrada o bola de lomo: qué corte conviene para milanesas — El Cronista](https://www.cronista.com/informacion-gral/peceto-nalga-cuadrada-o-bola-de-lomo-que-corte-de-carne-conviene-comprar-para-hacer-las-mejores-milanesas/)
- [Roast Beef: usos — Carnes.com.ar](https://www.carnes.com.ar/roast-beef-corte-de-carne/)
- [¿Cuál es el mejor corte de carne para empanadas? (carne picada)](https://www.frigorificosada.com.ar/blog/guia-del-asador-cual-es-el-mejor-corte-de-carne-para-empanadas/)
- [Tortuguita al horno — uso en pucheros/guisos](https://www.cronica.com.ar/cocina/Tortuguita-al-horno-con-vegetales-como-preparar-una-carne-tierna-con-este-corte-economico-20211007-0073.html)
- [Cortes de carne argentinos y su equivalente en España — bife angosto/ancho/ojo de bife/picaña](https://www.directoalpaladar.com/cultura-gastronomica/cortes-carne-argentinos-utilizados-asados-como-se-llaman-espana)
- [Cortes de cerdo para asado — matambrito lidera la parrilla](https://www.cronica.com.ar/cocina/Asado-de-cerdo-Cuales-son-los-mejores-cortes-para-hacer-a-la-parrilla-20211022-0023.html)
- [Solomillo de cerdo — usos (milanesa/horno/parrilla en medallones)](https://hacerasado.com.ar/solomillo-a-la-parrilla/)
- [Churrasquito de cerdo — corte fino para parrilla rápida](https://www.hoycerdo.ar/churrasquito/)
- [Mondongo — se usa mayormente para guiso/locro, aunque también se puede grillar](https://www.lanacion.com.ar/lifestyle/cuidado-cuerpo-belleza/las-ventajas-de-comer-mondongo-el-corte-de-carne-que-se-usa-para-guisos-o-locros-nid17072024/)
