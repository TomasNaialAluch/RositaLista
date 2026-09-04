// Barra de búsqueda de productos, siempre visible entre .catalog-toolbar y
// #catalog (mismo patrón de posicionamiento que AsadoFilter, pero sin
// depender de ningún modo — ver docs/rediseno-buscador.md). Filtra por
// nombre y tipo de corte (`cut`) a la vez. No sabe nada de productos ni de
// cómo se renderiza el catálogo: solo avisa el texto tipeado (crudo y
// normalizado), igual desacople que ViewToggle — quien la creó (app.js)
// decide qué hacer con eso.
// Va en catalog/ y no en chrome/ por el mismo criterio que asadoFilter.js:
// aunque visualmente sea "una fila de la toolbar", conceptualmente es parte
// del catálogo (filtra productos), no un control de layout genérico.

const SearchBar = (function () {
  const ICON_SEARCH = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="7"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  `;

  const DEBOUNCE_MS = 150;

  let debounceTimer = null;
  let inputEl = null;
  let clearBtnEl = null;

  /**
   * Normaliza texto para comparar sin importar mayúsculas ni acentos
   * ("vacio" debe encontrar "Vacío"). Expuesto para que app.js use la misma
   * normalización al filtrar `name`/`cut` de los productos.
   */
  // Rango Unicode de los diacríticos combinantes (U+0300 - U+036F) que deja
  // "normalize('NFD')" al separar una letra acentuada en letra + acento —
  // construido con fromCharCode en vez de escribir los caracteres literales
  // para que quede legible en cualquier editor/encoding.
  const COMBINING_MARKS = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g");

  function normalize(str) {
    return str.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
  }

  function setClearVisible(visible) {
    clearBtnEl.classList.toggle("search-bar-clear--visible", visible);
  }

  /**
   * Monta la barra. `onChange(query, rawQuery)` se dispara con el texto
   * normalizado (para filtrar) y el texto tal cual lo tipeó el usuario (para
   * mostrarlo, ej. en el estado "no encontramos productos para..."), con
   * debounce para no recalcular en cada tecla.
   * @param {(query: string, rawQuery: string) => void} onChange
   * @returns {HTMLElement}
   */
  function create(onChange) {
    const wrap = document.createElement("div");
    wrap.className = "search-bar";
    wrap.innerHTML = `
      <div class="search-bar-field">
        <span class="search-bar-icon">${ICON_SEARCH}</span>
        <input type="text" class="search-bar-input" placeholder="Buscar producto..." aria-label="Buscar producto" />
        <button type="button" class="search-bar-clear" aria-label="Limpiar búsqueda">✕</button>
      </div>
    `;

    inputEl = wrap.querySelector(".search-bar-input");
    clearBtnEl = wrap.querySelector(".search-bar-clear");

    inputEl.addEventListener("input", () => {
      setClearVisible(inputEl.value.length > 0);
      clearTimeout(debounceTimer);
      const raw = inputEl.value;
      debounceTimer = setTimeout(() => onChange(normalize(raw), raw), DEBOUNCE_MS);
    });

    clearBtnEl.addEventListener("click", () => {
      clearTimeout(debounceTimer);
      inputEl.value = "";
      setClearVisible(false);
      onChange("", "");
      inputEl.focus();
    });

    return wrap;
  }

  /** Limpia el input desde afuera (ej. botón "Ver todo el catálogo" del estado vacío) sin disparar onChange. */
  function clear() {
    if (!inputEl) return;
    clearTimeout(debounceTimer);
    inputEl.value = "";
    setClearVisible(false);
  }

  return { create, clear, normalize };
})();
