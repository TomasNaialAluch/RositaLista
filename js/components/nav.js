// Barra de navegación flotante por categorías.
// Componente 100% autocontenido: inyecta su propio <style> acá abajo.
// No depende de styles.css ni de ninguna clase definida en otro archivo,
// así no hay dudas de dónde sale cada regla.

const Nav = (function () {
  const STYLE_ID = "rn-styles";

  const CSS = `
    .rn-wrap {
      position: fixed;
      left: 50%;
      bottom: 20px;
      transform: translateX(-50%);
      z-index: 30;
      max-width: calc(100% - 32px);
      transition: bottom 0.25s ease;
    }

    .rn-wrap--lifted {
      bottom: 92px;
    }

    .rn-bar {
      display: flex;
      gap: 4px;
      padding: 6px;
      border-radius: 999px;
      max-width: 100%;

      /* Scroll horizontal "de a una": cada botón encastra en su lugar en vez
         de quedar cortado a mitad de camino — eso es lo que se sentía mal. */
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;

      background: transparent;
      -webkit-backdrop-filter: blur(6px) saturate(150%);
      backdrop-filter: blur(6px) saturate(150%);
      border: 1.5px solid rgba(255, 255, 255, 0.85);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    }

    .rn-bar::-webkit-scrollbar {
      display: none;
    }

    /* En mobile solo entran ~3 categorías por vez; el resto queda afuera y
       este degradé avisa que se puede deslizar para ver las que faltan. */
    .rn-wrap::after {
      content: "";
      position: absolute;
      top: 1.5px;
      bottom: 1.5px;
      right: 1.5px;
      width: 28px;
      border-radius: 0 999px 999px 0;
      background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.55));
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.2s ease;
    }

    .rn-wrap--end::after {
      opacity: 0;
    }

    @media (max-width: 599px) {
      .rn-wrap {
        max-width: min(calc(100% - 32px), 300px);
      }
    }

    @media (min-width: 600px) {
      .rn-bar {
        overflow: visible;
      }
      .rn-wrap::after {
        display: none;
      }
    }

    .rn-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      scroll-snap-align: start;
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

    const wrap = document.createElement("div");
    wrap.className = "rn-wrap";
    wrap.id = "categoryNav";

    const nav = document.createElement("nav");
    nav.className = "rn-bar";
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

    wrap.appendChild(nav);

    // Esconde el degradé de "hay más" cuando ya se llegó al final del scroll.
    const updateEndState = () => {
      const atEnd = nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 2;
      wrap.classList.toggle("rn-wrap--end", atEnd);
    };
    nav.addEventListener("scroll", updateEndState, { passive: true });
    updateEndState();

    return wrap;
  }

  /** Levanta o baja la nav para no pisar la barra del carrito cuando está visible. */
  function setLifted(nav, lifted) {
    nav.classList.toggle("rn-wrap--lifted", lifted);
  }

  return { createNav, setLifted };
})();
