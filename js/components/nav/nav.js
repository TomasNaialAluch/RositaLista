// Barra de navegación flotante por categorías.
// Componente 100% autocontenido: inyecta su propio <style> acá abajo.
// No depende de styles.css ni de ninguna clase definida en otro archivo,
// así no hay dudas de dónde sale cada regla.
//
// En mobile no entran las 5 categorías en una fila: en vez de un scroll
// horizontal continuo (que se siente horrible, con texto cortado a mitad de
// camino mientras arrastrás), se arma por "páginas" de 3 categorías. Deslizar
// hacia la izquierda pasa a la página siguiente (el resto de las categorías,
// ej: Embutidos + Achuras) y la barra se angosta al ancho justo de esa
// página; deslizar hacia la derecha vuelve a la página anterior. En desktop,
// donde entran todas, no hay paginado: se muestran todas juntas como antes.

const Nav = (function () {
  const STYLE_ID = "rn-styles";
  const PAGE_SIZE_MOBILE = 3;
  const SWIPE_THRESHOLD = 30;

  const CSS = `
    .rn-wrap {
      position: fixed;
      left: 50%;
      bottom: 20px;
      transform: translateX(-50%);
      z-index: 30;
      max-width: calc(100% - 32px);
      transition: bottom 0.25s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      touch-action: pan-y;
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
      width: fit-content;
      overflow: hidden;

      background: transparent;
      -webkit-backdrop-filter: blur(6px) saturate(150%);
      backdrop-filter: blur(6px) saturate(150%);
      border: 1.5px solid rgba(255, 255, 255, 0.85);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      transition: width 0.32s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .rn-bar > * {
      transition: opacity 0.18s ease, transform 0.18s ease;
    }

    .rn-bar--fade > * {
      opacity: 0;
      transform: scale(0.85);
    }

    .rn-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
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

    .rn-dots {
      display: flex;
      gap: 5px;
    }

    .rn-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(165, 61, 87, 0.35);
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .rn-dot--active {
      background: #a53d57;
      transform: scale(1.3);
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function chunk(arr, size) {
    const pages = [];
    for (let i = 0; i < arr.length; i += size) pages.push(arr.slice(i, i + size));
    return pages;
  }

  /**
   * Crea la barra de navegación flotante.
   * @param {object} categories - { catKey: { label, items } }
   * @param {(catKey: string) => void} onSelect - se llama al elegir una categoría
   * @returns {HTMLElement}
   */
  function createNav(categories, onSelect) {
    injectStyles();

    const entries = Object.entries(categories);
    const isDesktop = window.matchMedia("(min-width: 600px)").matches;
    const pages = chunk(entries, isDesktop ? entries.length : PAGE_SIZE_MOBILE);

    let pageIndex = 0;
    let activeCatKey = entries[0][0];

    const wrap = document.createElement("div");
    wrap.className = "rn-wrap";
    wrap.id = "categoryNav";

    const nav = document.createElement("nav");
    nav.className = "rn-bar";
    nav.setAttribute("aria-label", "Categorías");
    wrap.appendChild(nav);

    let dots = null;
    if (pages.length > 1) {
      dots = document.createElement("div");
      dots.className = "rn-dots";
      pages.forEach((_, i) => {
        const dot = document.createElement("span");
        dot.className = "rn-dot" + (i === 0 ? " rn-dot--active" : "");
        dots.appendChild(dot);
      });
      wrap.appendChild(dots);
    }

    function buildButtons(index) {
      nav.innerHTML = "";
      pages[index].forEach(([catKey, cat]) => {
        const btn = document.createElement("button");
        btn.className = "rn-btn" + (catKey === activeCatKey ? " rn-btn--active" : "");
        btn.dataset.target = catKey;
        btn.innerHTML = `<span class="rn-icon">${Icons[catKey] || ""}</span><span>${cat.label}</span>`;

        btn.addEventListener("click", () => {
          nav.querySelectorAll(".rn-btn").forEach((b) => b.classList.remove("rn-btn--active"));
          btn.classList.add("rn-btn--active");
          activeCatKey = catKey;
          onSelect(catKey);
        });

        nav.appendChild(btn);
      });
      if (dots) {
        dots.querySelectorAll(".rn-dot").forEach((d, i) => d.classList.toggle("rn-dot--active", i === index));
      }
    }

    /**
     * Cambia de página animando el ancho de la barra desde su tamaño actual
     * hasta el de la página nueva (técnica FLIP), con los botones viejos
     * encogiéndose/desvaneciéndose y los nuevos apareciendo — así se ve como
     * que la barra "se transforma" en la otra, en vez de saltar de golpe.
     */
    function goToPage(index) {
      if (index === pageIndex || index < 0 || index >= pages.length) return;
      pageIndex = index;

      const startWidth = nav.getBoundingClientRect().width;
      nav.style.width = `${startWidth}px`;

      nav.classList.add("rn-bar--fade");
      setTimeout(() => {
        buildButtons(pageIndex);

        // Para medir el ancho "natural" de la página nueva hay que soltar el
        // ancho fijado (si no, scrollWidth devuelve el ancho viejo bloqueado
        // en vez del que necesita el contenido nuevo).
        nav.style.width = "";
        const endWidth = nav.getBoundingClientRect().width;
        nav.style.width = `${startWidth}px`;
        void nav.offsetWidth; // fuerza el reflow para que el navegador "vea" el ancho viejo antes de animar al nuevo

        requestAnimationFrame(() => {
          nav.style.width = `${endWidth}px`;
          nav.classList.remove("rn-bar--fade");
        });

        nav.addEventListener(
          "transitionend",
          function onWidthDone(e) {
            if (e.propertyName !== "width") return;
            nav.style.width = "";
            nav.removeEventListener("transitionend", onWidthDone);
          }
        );
      }, 160);
    }

    buildButtons(pageIndex);

    if (pages.length > 1) {
      let startX = null;
      wrap.addEventListener("pointerdown", (e) => {
        startX = e.clientX;
      });
      wrap.addEventListener("pointerup", (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (dx <= -SWIPE_THRESHOLD) goToPage(pageIndex + 1);
        else if (dx >= SWIPE_THRESHOLD) goToPage(pageIndex - 1);
      });
      wrap.addEventListener("pointercancel", () => {
        startX = null;
      });
    }

    return wrap;
  }

  /** Levanta o baja la nav para no pisar la barra del carrito cuando está visible. */
  function setLifted(nav, lifted) {
    nav.classList.toggle("rn-wrap--lifted", lifted);
  }

  return { createNav, setLifted };
})();
