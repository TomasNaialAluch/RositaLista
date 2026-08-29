// Toggle Grilla/Lista para elegir cómo se ve el catálogo. Componente
// autocontenido: administra su propio estado visual (cuál botón queda
// marcado como activo) y solo le avisa a quien lo creó qué vista se eligió
// — no sabe nada de cómo se renderiza el catálogo.

const ViewToggle = (function () {
  const STYLE_ID = "rvt-styles";

  const CSS = `
    .view-toggle {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin: 0 0 16px;
    }

    .view-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1.5px solid var(--border);
      background: #fff;
      color: var(--text-muted);
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }

    .view-toggle-btn svg {
      width: 18px;
      height: 18px;
    }

    .view-toggle-btn:hover {
      border-color: var(--rosita-pink);
      color: var(--rosita-pink-dark);
    }

    .view-toggle-btn--active {
      background: var(--rosita-pink-dark);
      border-color: var(--rosita-pink-dark);
      color: #fff;
    }
  `;

  const GRID_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
    <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
    <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
    <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
  </svg>`;

  const LIST_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"></line>
    <line x1="4" y1="12" x2="20" y2="12"></line>
    <line x1="4" y1="18" x2="20" y2="18"></line>
  </svg>`;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /**
   * @param {(view: 'grid'|'list') => void} onChange - se llama cuando el usuario elige una vista
   * @returns {HTMLElement}
   */
  function create(onChange) {
    injectStyles();

    const wrap = document.createElement("div");
    wrap.className = "view-toggle";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Vista del catálogo");

    const gridBtn = document.createElement("button");
    gridBtn.type = "button";
    gridBtn.className = "view-toggle-btn view-toggle-btn--active";
    gridBtn.setAttribute("aria-label", "Ver en grilla");
    gridBtn.title = "Grilla";
    gridBtn.innerHTML = GRID_ICON;

    const listBtn = document.createElement("button");
    listBtn.type = "button";
    listBtn.className = "view-toggle-btn";
    listBtn.setAttribute("aria-label", "Ver en lista");
    listBtn.title = "Lista";
    listBtn.innerHTML = LIST_ICON;

    function setActive(view) {
      gridBtn.classList.toggle("view-toggle-btn--active", view === "grid");
      listBtn.classList.toggle("view-toggle-btn--active", view === "list");
    }

    gridBtn.addEventListener("click", () => {
      setActive("grid");
      onChange("grid");
    });
    listBtn.addEventListener("click", () => {
      setActive("list");
      onChange("list");
    });

    wrap.appendChild(gridBtn);
    wrap.appendChild(listBtn);
    return wrap;
  }

  return { create };
})();
