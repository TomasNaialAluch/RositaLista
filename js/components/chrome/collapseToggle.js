// Botón para minimizar o expandir TODAS las categorías del catálogo de una
// sola vez. No sabe nada de cómo se renderiza el catálogo — solo cambia su
// propio ícono/estado y le avisa a quien lo creó si hay que colapsar o
// expandir todo (app.js es quien aplica eso sobre las secciones reales).

const CollapseToggle = (function () {
  const COLLAPSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="7 9 12 5 17 9"></polyline>
    <polyline points="7 15 12 19 17 15"></polyline>
  </svg>`;

  const EXPAND_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="7 5 12 9 17 5"></polyline>
    <polyline points="7 19 12 15 17 19"></polyline>
  </svg>`;

  /**
   * @param {(collapsed: boolean) => void} onToggle - se llama con true al minimizar todo, false al expandir todo
   * @returns {HTMLElement}
   */
  function create(onToggle) {
    let collapsed = false;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "collapse-toggle-btn";

    function render() {
      btn.innerHTML = collapsed ? EXPAND_ICON : COLLAPSE_ICON;
      const label = collapsed ? "Expandir todas las categorías" : "Minimizar todas las categorías";
      btn.setAttribute("aria-label", label);
      btn.title = label;
    }

    btn.addEventListener("click", () => {
      collapsed = !collapsed;
      render();
      onToggle(collapsed);
    });

    render();
    return btn;
  }

  return { create };
})();
