// Barra de navegación flotante por categorías.
// El CSS vive aparte en css/components/nav/nav.css, importado por <link>
// en index.html.
//
// En mobile no entran las 5 categorías en una fila: en vez de un scroll
// horizontal continuo (que se siente horrible, con texto cortado a mitad de
// camino mientras arrastrás), se arma por "páginas" de 3 categorías. Deslizar
// hacia la izquierda pasa a la página siguiente (el resto de las categorías,
// ej: Embutidos + Achuras) y la barra se angosta al ancho justo de esa
// página; deslizar hacia la derecha vuelve a la página anterior. En desktop,
// donde entran todas, no hay paginado: se muestran todas juntas como antes.

const Nav = (function () {
  const PAGE_SIZE_MOBILE = 3;
  const SWIPE_THRESHOLD = 30;

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

    /**
     * Si con el texto puesto los botones no entran en el ancho disponible,
     * se sacan los textos y quedan solo los íconos — mismo criterio en
     * cualquier página y en cualquier tamaño de pantalla, sin necesidad de
     * un breakpoint fijo: no importa CUÁNTO ancho tiene el dispositivo,
     * importa si ESTAS palabras puntuales (que varían de largo entre
     * categorías) entran o no en ESE ancho.
     *
     * El "ancho disponible" hay que sacarlo del viewport (`document.
     * documentElement.clientWidth`, menos los 16px de margen de cada lado
     * que ya usa `.rn-wrap` en su `max-width: calc(100% - 32px)`), NO de
     * `nav.clientWidth` ni de `wrap.clientWidth`: ninguno de los dos tiene
     * un ancho propio independiente — `.rn-wrap` no define `width`, así
     * que su ancho renderizado ES el ancho de `.rn-bar` adentro (se ajusta
     * al contenido), y `.rn-bar` es justamente lo que `goToPage` anima de
     * un lado a otro con `nav.style.width`. Comparar contra cualquiera de
     * los dos termina siendo circular: si `nav.style.width` quedó
     * trabado en un valor viejo (ej. a mitad de una transición, o si el
     * `transitionend` no llegó a disparar), `wrap` hereda ese mismo ancho
     * y la cuenta da mal. El viewport, en cambio, no depende de nada de
     * esto — por eso es la única referencia estable.
     */
    function applyIconsOnlyIfNeeded() {
      nav.classList.remove("rn-bar--icons-only");
      const available = document.documentElement.clientWidth - 32;
      if (nav.scrollWidth > available + 0.5) {
        nav.classList.add("rn-bar--icons-only");
      }
    }

    function buildButtons(index) {
      nav.innerHTML = "";
      pages[index].forEach(([catKey, cat]) => {
        const btn = document.createElement("button");
        btn.className = "rn-btn" + (catKey === activeCatKey ? " rn-btn--active" : "");
        btn.dataset.target = catKey;
        btn.setAttribute("aria-label", cat.label);
        btn.title = cat.label;
        btn.innerHTML = `<span class="rn-icon">${Icons[catKey] || ""}</span><span class="rn-label">${cat.label}</span>`;

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
      applyIconsOnlyIfNeeded();
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

    // Girar el teléfono (o, en desktop, achicar la ventana) cambia cuánto
    // ancho hay disponible — vuelve a chequear si el texto de la página
    // actual sigue entrando. Con debounce simple porque "resize" puede
    // disparar muchas veces seguidas mientras se gira.
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyIconsOnlyIfNeeded, 120);
    });

    return wrap;
  }

  /** Levanta o baja la nav para no pisar la barra del carrito cuando está visible. */
  function setLifted(nav, lifted) {
    nav.classList.toggle("rn-wrap--lifted", lifted);
  }

  return { createNav, setLifted };
})();
