# Buscador de productos en el Home

**Estado: propuesta, no implementado.** Investigación de dónde metería el buscador en el código actual, cómo se integraría con lo que ya existe (toolbar, `AsadoFilter`, `Cards`/`ProductList`) y el detalle de las animaciones. Pensado para programarse después de leer esto, sin más ida y vuelta — pero marco abajo los puntos donde conviene confirmar antes de tocar código.

## La idea, en una frase

Una barra de búsqueda que vive **debajo de la fila de botones Colapsar / Grilla-Lista / Calcular Asado** (`.catalog-toolbar`) y arriba de `#catalog`, que filtra los productos visibles por nombre (y opcionalmente por tipo de corte) a medida que el usuario escribe, con transiciones suaves en vez de saltos bruscos.

## Dónde se engancha en el código actual

Repasando cómo está armado hoy (todo en [app.js](../js/app.js)):

```
Header
main > Intro
.catalog-toolbar (CollapseToggle + ViewToggle + CalcularAsado)
[AsadoFilter]           <- solo existe durante el modo Asado, se inserta acá
#catalog                <- Cards o ProductList, según `view`
Footer
```

`AsadoFilter` ya resuelve el mismo problema de posicionamiento que tiene el buscador (una fila que va "debajo de la toolbar, arriba del catálogo") con `document.body.insertBefore(asadoFilterEl, catalogEl)`. El buscador puede copiar exactamente ese patrón, pero **siempre visible** (no condicionado a `asadoActive` como `AsadoFilter`).

Esto da dos opciones de dónde montarlo:

1. **Como fila fija, agregada una sola vez en `init()`**, justo después de `document.body.appendChild(toolbar)` y antes de `document.body.appendChild(catalogEl)`. Es la opción más simple y la que recomiendo — el buscador no depende de ningún modo, así que no necesita montarse/desmontarse como `AsadoFilter`.
2. Vivir *dentro* de `.catalog-toolbar` (como una fila extra del grid). Lo descarto: la toolbar hoy es un grid de 3 columnas (`1fr auto 1fr`) pensado para 3 botones chicos centrados — meter un input ahí rompe ese layout y no es lo que pediste (vos dijiste "abajo de los botones", no "al lado").

**Elijo la opción 1.**

### Componente nuevo: `js/components/catalog/searchBar.js`

Va en `catalog/` y no en `chrome/` (donde están `viewToggle.js`/`collapseToggle.js`) porque, a diferencia de esos dos, el buscador necesita conocer los nombres de los productos para dar sugerencias/resaltado — mismo criterio que ya se usó para `asadoFilter.js`, que también vive en `catalog/` aunque visualmente sea "un chip de toolbar". Sigue el mismo patrón `IIFE + create()` que todos los demás componentes:

```js
const SearchBar = (function () {
  function create(onChange) { /* ...devuelve el <div> montado... */ }
  return { create };
})();
```

`onChange(query)` se dispara con el texto normalizado (trim + lowercase + sin acentos) cada vez que cambia, con debounce (ver animaciones más abajo). El componente **no sabe nada de productos ni de cómo se renderiza el catálogo** — mismo desacople que `ViewToggle`: solo avisa qué se tipeó, quien lo creó (`app.js`) decide qué hacer con eso.

### CSS nuevo: `css/components/catalog/searchBar.css`

Importado por `<link>` en `index.html`, mismo criterio que el resto (nada de estilos inyectados por JS).

### Cambios en `app.js`

- Nuevo estado: `let searchQuery = "";`
- Montaje en `init()`:
  ```js
  document.body.appendChild(toolbar);
  document.body.appendChild(
    SearchBar.create((query) => {
      searchQuery = query;
      renderCatalog();
    })
  );
  document.body.appendChild(catalogEl);
  ```
- Nueva función `applySearchFilter(category)`, con la misma forma que `applyAsadoFilter` ya usa:
  ```js
  function applySearchFilter(category) {
    if (!searchQuery) return category;
    const items = category.items.filter((item) => normalize(item.name).includes(searchQuery));
    return { ...category, items };
  }
  ```
- En `renderCatalog()`, encadenar los dos filtros: `applySearchFilter(applyAsadoFilter(catKey, PRODUCTS[catKey]))`. Así conviven sin que ninguno sepa del otro — mismo principio que ya usa el archivo con el filtro de Asado.
- Las categorías que quedan con 0 items después de filtrar **no se agregan al DOM** (en vez de agregarlas vacías) — evita mostrar encabezados de categoría sin productos debajo.
- Si **ninguna** categoría tiene resultados, mostrar un estado vacío (ver animación más abajo) en vez de dejar `#catalog` en blanco sin explicación.

### `index.html`

Un `<link>` nuevo junto a los demás `css/components/catalog/*.css`, y un `<script>` nuevo junto a los demás `js/components/catalog/*.js` — antes de `app.js`, después de `cards.js`/`productList.js` (no depende de ellos, pero mantiene el agrupamiento por carpeta que ya existe).

## Qué campo(s) buscar

Mirando [products.json](../data/products.json), cada item tiene `name` (ej. "Bife de Chorizo") y `cut` (ej. "Cortes magros"). Propuesta:

- **Buscar solo por `name`** en la versión inicial — es lo que el usuario realmente tipea ("bife", "vacío", "chori"). `cut` es una categoría interna (solo 4-5 valores distintos: "Cortes magros", "Cortes con hueso", "Para milanesa", "Picada") y buscar por ahí sería confuso ("magros" no es algo que alguien tipee buscando un producto).
- Normalización: `toLowerCase()` + sacar acentos (`.normalize("NFD").replace(/[̀-ͯ]/g, "")`), para que "vacio" encuentre "Vacío" y "chori" no dependa de mayúsculas.
- Coincidencia por **substring**, no por palabra exacta ni por prefijo — "chori" debe encontrar "Bife de Chorizo" aunque no empiece con "chori".

## Interacción con el modo Asado y con `AsadoFilter`

- El buscador queda **siempre montado**, incluso durante el modo Asado — no es parte de lo que `CalcularAsado` monta/desmonta. Si el usuario busca "vacío" estando en modo Asado con el chip "Cortes de asado" activo, debería seguir respetando ese filtro (buscar dentro de lo que el chip ya dejó visible) — de ahí el orden `applySearchFilter(applyAsadoFilter(...))` de arriba, no al revés.
- Durante el **modo selección de Embutidos/Achuras** (`Cards.enterSelectionMode`, ver [rediseno-embutidos-asado.md](rediseno-embutidos-asado.md)), dejaría el buscador activo también — buscar "chorizo" ahí ayuda a encontrar el embutido rápido en vez de scrollear. No debería hacer falta ningún cambio en `cards.js` para esto: el buscador filtra `category.items` *antes* de que `Cards`/`ProductList` los reciba, así que ninguno de los dos necesita enterarse de que existe (mismo principio que ya vale para `AsadoFilter`).
- **A confirmar:** ¿el buscador debería deshabilitarse/ocultarse durante `CalcularAsado` (el modo guiado paso a paso), ya que ahí el catálogo no es lo que se está mirando? Mi propuesta es dejarlo tal cual, sin ocultar nada — es información de más, no estorba, y sacarlo/meterlo agregaría un salto de layout innecesario.

## Las animaciones, en detalle

Todas con `prefers-reduced-motion` respetado (`@media (prefers-reduced-motion: reduce) { transition: none !important; }` en `searchBar.css`, mismo criterio de accesibilidad que ya debería aplicarse en el resto de la app).

### 1. Entrada de la barra al cargar la página

Fade + slight slide-down al montarse (una sola vez, en `init()`):

```css
.search-bar {
  opacity: 0;
  transform: translateY(-6px);
  animation: search-bar-in 0.35s ease-out 0.1s forwards;
}
@keyframes search-bar-in {
  to { opacity: 1; transform: translateY(0); }
}
```

El `0.1s` de delay es para que no compita visualmente con lo que ya anima arriba (si `Intro`/`Header` tienen alguna entrada propia) — a ajustar mirándolo en pantalla.

### 2. Focus / hover del input

Transición de borde y sombra, mismo lenguaje visual que ya usan `.view-toggle-btn:hover` y `.collapse-toggle-btn:hover` (`border-color: var(--rosita-pink)`), para que se sienta parte de la misma familia de controles:

```css
.search-bar-input {
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.search-bar-input:focus {
  border-color: var(--rosita-pink);
  box-shadow: 0 0 0 3px rgba(193, 79, 107, 0.15);
  outline: none;
}
```

### 3. Ícono de lupa → ícono de borrar (✕)

Cuando hay texto, aparece un botón "✕" para limpiar, con scale+fade en vez de aparecer de golpe:

```css
.search-bar-clear {
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.15s ease, transform 0.15s ease;
  pointer-events: none;
}
.search-bar-clear--visible {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
```

Controlado por JS (`toggle`) en el mismo `input` listener que dispara `onChange`.

### 4. Filtrado del catálogo (lo más importante)

Acá es donde vale la pena cuidar el detalle, porque es lo que el usuario va a ver cada vez que tipea. Opciones, de más simple a más elaborada:

- **A — sin animación de salida, solo re-render.** Es lo que ya hace `renderCatalog()` hoy (`catalogEl.innerHTML = ""` y vuelve a armar todo). Simple, cero riesgo, pero se siente "cortado" — productos que desaparecen de golpe.
- **B — debounce + fade breve en `#catalog` completo.** En vez de vaciar y rearmar instantáneo, al tipear se espera ~150-200ms sin más tecleo (debounce, para no recalcular en cada letra), y el contenedor entero hace un fade-out/fade-in corto (~120ms) alrededor del `renderCatalog()`. Barato de implementar (una clase CSS + un `setTimeout`), se siente animado sin tocar cómo se arma el DOM.
- **C — animar cada card/fila individualmente** (las que se van, achican altura y se desvanecen; las que quedan, no se mueven). Es lo más pulido visualmente, pero pide que `Cards`/`ProductList` dejen de destruir y recrear todo el DOM en cada `renderCatalog()` — hoy ambos arrancan de cero (`innerHTML = ""`) en cada render, así que el navegador no tiene "el mismo nodo" para animar una transición de salida. Implementarlo bien pediría un diff de qué nodos entran/salen, que es un cambio más grande a `cards.js`/`productList.js` y no solo al buscador.

**Propongo B para esta primera versión** — buen balance entre "se siente animado" y "no reescribe cómo renderiza el resto del catálogo". C queda anotado como mejora futura si después de verlo andando se siente que hace falta más pulido.

```js
// en app.js, reemplazando el renderCatalog() directo del listener de búsqueda
let searchDebounce;
function onSearchChange(query) {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchQuery = query;
    catalogEl.classList.add("catalog--filtering");
    setTimeout(() => {
      renderCatalog();
      catalogEl.classList.remove("catalog--filtering");
    }, 120);
  }, 150);
}
```

```css
#catalog {
  transition: opacity 0.12s ease;
}
#catalog.catalog--filtering {
  opacity: 0.35;
}
```

### 5. Categoría que desaparece por completo (0 resultados)

Como se decidió arriba no agregarla al DOM si queda vacía, su "salida" ya la cubre la animación de fade del punto 4 — no hace falta una transición aparte por sección.

### 6. Estado vacío ("no se encontró nada")

Si `searchQuery` no vacío y **ninguna** categoría tiene resultados, mostrar un mensaje centrado dentro de `#catalog` (reemplazando las secciones) con el mismo fade-in que el resto:

```html
<div class="search-empty">
  <p>No encontramos productos para "<strong>bife de avestruz</strong>"</p>
  <button class="search-empty-clear">Ver todo el catálogo</button>
</div>
```

```css
.search-empty {
  opacity: 0;
  animation: search-bar-in 0.25s ease-out forwards; /* reusa el mismo keyframe del punto 1 */
  text-align: center;
  color: var(--text-muted);
  padding: 40px 16px;
}
```

El botón "Ver todo el catálogo" limpia el input (mismo efecto que tocar la ✕) — evita que el usuario quede atascado sin saber cómo volver.

## Mobile

`.catalog-toolbar` y el resto del layout ya son responsive (`main { max-width: 780px }`, con todo lo demás fluido). El input de búsqueda debería ir a `width: 100%` dentro del mismo padding lateral que usa `.catalog-toolbar` (`padding: 0 16px`), sin necesitar su propio breakpoint. Si el teclado virtual mueve el viewport en mobile al hacer foco, no hace falta compensar nada manualmente — es comportamiento nativo del browser y no algo que la barra deba manejar.

## Qué archivos se tocarían

- **Nuevo `js/components/catalog/searchBar.js`** — el componente del input.
- **Nuevo `css/components/catalog/searchBar.css`** — estilos + animaciones de arriba.
- **`index.html`** — `<link>` y `<script>` nuevos.
- **`js/app.js`** — estado `searchQuery`, montaje de `SearchBar` entre `toolbar` y `catalogEl`, `applySearchFilter()`, debounce, y el estado vacío dentro de `renderCatalog()`.

## Qué NO cambiaría

- `products.json` no se toca — el buscador no agrega ni necesita ningún campo nuevo en los datos.
- `Cards`/`ProductList` no se tocan (en la propuesta B) — reciben `category.items` ya filtrado, igual que hoy reciben lo que sale de `applyAsadoFilter`.
- `AsadoFilter`, `CalcularAsado`, `Cart`, `Orbe` — sin cambios; el buscador es un filtro más que se aplica antes de renderizar, no algo que ellos necesiten saber que existe.

## Puntos a confirmar antes de programar

1. ¿Buscar solo por `name`, o también por `cut` (categoría del corte)? Propuesta: solo `name` (ver razón arriba).
2. ¿Nivel de animación del filtrado — B (fade del contenedor, más simple) o vale la pena ir directo a C (animar cada card individualmente, más laburo en `cards.js`/`productList.js`)? Propuesta: arrancar con B.
3. ¿El buscador queda visible/activo durante el modo `CalcularAsado` guiado, o se oculta mientras dura? Propuesta: queda visible, sin ocultarse.
4. Placeholder del input — algo como "Buscar producto..." (a confirmar el texto exacto/tono, mismo que usa el resto de la copy del sitio).
