// Barra de navegación flotante por categorías.
// Componente 100% autocontenido: inyecta su propio <style> acá abajo.
// No depende de styles.css ni de ninguna clase definida en otro archivo,
// así no hay dudas de dónde sale cada regla.

const Nav = (function () {
  const STYLE_ID = "rn-styles";

  const CSS = `
    .rn-bar {
      position: fixed;
      left: 50%;
      bottom: 20px;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      padding: 6px;
      border-radius: 999px;
      z-index: 30;
      max-width: calc(100% - 32px);
      transition: bottom 0.25s ease;

      background: transparent;
      -webkit-backdrop-filter: blur(6px) saturate(150%);
      backdrop-filter: blur(6px) saturate(150%);
      border: 1.5px solid rgba(255, 255, 255, 0.85);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    }

    .rn-bar--lifted {
      bottom: 92px;
    }

    .rn-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      border: none;
      background: transparent;
      color: #a53d57;
      padding: 8px 14px;
      border-radius: 999px;
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .rn-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .rn-btn--active {
      background: #c14f6b;
      color: #fff;
    }

    .rn-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .rn-icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /**
   * Crea la barra de navegación flotante.
   * @param {object} categories - { catKey: { label, items } }
   * @param {(catKey: string) => void} onSelect - se llama al elegir una categoría
   * @returns {HTMLElement}
   */
  function createNav(categories, onSelect) {
    injectStyles();

    const nav = document.createElement("nav");
    nav.className = "rn-bar";
    nav.id = "categoryNav";
    nav.setAttribute("aria-label", "Categorías");

    Object.entries(categories).forEach(([catKey, cat], index) => {
      const btn = document.createElement("button");
      btn.className = "rn-btn" + (index === 0 ? " rn-btn--active" : "");
      btn.dataset.target = catKey;
      btn.innerHTML = `<span class="rn-icon">${Icons[catKey] || ""}</span><span>${cat.label}</span>`;

      btn.addEventListener("click", () => {
        nav.querySelectorAll(".rn-btn").forEach((b) => b.classList.remove("rn-btn--active"));
        btn.classList.add("rn-btn--active");
        onSelect(catKey);
      });

      nav.appendChild(btn);
    });

    return nav;
  }

  /** Levanta o baja la nav para no pisar la barra del carrito cuando está visible. */
  function setLifted(nav, lifted) {
    nav.classList.toggle("rn-bar--lifted", lifted);
  }

  return { createNav, setLifted };
})();
