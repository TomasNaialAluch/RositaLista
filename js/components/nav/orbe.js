// Orbe: dueño del lugar fijo de la nav en la pantalla. Ver
// docs/rediseno-orbe-guia.md para el vocabulario completo (Barra completa /
// Orbe anclado / Orbe elevado / Viñeta) y la tabla de estados.
//
// Decide, según el estado, si en ese lugar se dibuja la barra completa
// (delegando en Nav.createNav) o el círculo animado. No son dos elementos
// coordinándose por afuera: Orbe es el único dueño de esa posición.
//
// Integración actual (v1): solo `js/components/catalog/calcularAsado.js`
// llama a Orbe.elevate()/Orbe.dock() por ahora (ver la sección "Integración
// pendiente con la Orbe" en docs/calcularAsado-guia.md). cards.js y cart.js
// todavía no están conectados — sus modales abren sin que el Orbe reaccione,
// eso queda para una próxima pasada.

const Orbe = (function () {
  const DEFAULT_MESSAGE = "Tocame cuando quieras que te explique qué está pasando acá.";

  let categories = null;
  let onSelectCategory = null;

  let navEl = null; // elemento de Nav, montado solo en modo 'bar'
  let circleWrap = null; // elemento del círculo, montado en modo 'circle'

  let mode = "bar"; // 'bar' | 'circle'
  let position = "anchored"; // 'anchored' | 'elevated' — solo importa en modo 'circle'
  let lifted = false; // evitar tapar la barra del carrito cuando está visible
  let message = DEFAULT_MESSAGE;
  let vignetteOpen = false;
  let scrollBound = false;

  function onScroll() {
    if (mode === "circle" && position === "anchored") {
      window.removeEventListener("scroll", onScroll);
      scrollBound = false;
      expandToBar();
    }
  }

  function ensureScrollListener() {
    if (scrollBound) return;
    scrollBound = true;
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function renderVignette() {
    if (!circleWrap) return;
    const vignette = circleWrap.querySelector(".orbe-vignette");
    vignette.textContent = message;
    vignette.classList.toggle("orbe-vignette--visible", vignetteOpen);
  }

  function applyPositionClasses() {
    if (!circleWrap) return;
    circleWrap.classList.toggle("orbe-wrap--elevated", position === "elevated");
    circleWrap.classList.toggle("orbe-wrap--lifted", lifted && position === "anchored");
  }

  function buildCircle() {
    const wrap = document.createElement("div");
    wrap.className = "orbe-wrap";
    wrap.id = "categoryNav";
    wrap.innerHTML = `
      <button type="button" class="orbe-circle orbe-circle--enter" aria-label="Asistente">
        <span class="orbe-circle-swirl" aria-hidden="true"></span>
      </button>
      <div class="orbe-vignette"></div>
    `;

    const circle = wrap.querySelector(".orbe-circle");
    circle.addEventListener("click", () => {
      vignetteOpen = !vignetteOpen;
      renderVignette();
    });
    circle.addEventListener(
      "animationend",
      () => circle.classList.remove("orbe-circle--enter"),
      { once: true }
    );

    return wrap;
  }

  function removeCurrent() {
    if (navEl) {
      navEl.remove();
      navEl = null;
    }
    if (circleWrap) {
      circleWrap.remove();
      circleWrap = null;
    }
  }

  function mountBar() {
    if (mode === "bar" && navEl) return;
    removeCurrent();
    mode = "bar";
    position = "anchored";
    vignetteOpen = false;
    navEl = Nav.createNav(categories, onSelectCategory);
    document.body.appendChild(navEl);
    Nav.setLifted(navEl, lifted);
  }

  function mountCircleIfNeeded() {
    if (mode === "circle" && circleWrap) return;
    removeCurrent();
    mode = "circle";
    circleWrap = buildCircle();
    document.body.appendChild(circleWrap);
    applyPositionClasses();
    renderVignette();
    ensureScrollListener();
  }

  /** Eleva el Orbe sobre el modal recién abierto, con el texto de ese paso. */
  function elevate(text) {
    if (text) message = text;
    mountCircleIfNeeded();
    position = "elevated";
    vignetteOpen = false;
    applyPositionClasses();
    renderVignette();
  }

  /** Vuelve a anclar el Orbe (círculo solo, sin modal), después de cerrar uno. */
  function dock(text) {
    if (text) message = text;
    mountCircleIfNeeded();
    position = "anchored";
    vignetteOpen = false;
    applyPositionClasses();
    renderVignette();
    ensureScrollListener();
  }

  /** Vuelve a mostrar la barra completa con categorías (disparado por scroll). */
  function expandToBar() {
    mountBar();
  }

  /** Igual que antes con Nav.setLifted: evita que el carrito abierto tape la nav/Orbe. */
  function setLifted(isLifted) {
    lifted = isLifted;
    if (mode === "bar" && navEl) {
      Nav.setLifted(navEl, lifted);
    } else {
      applyPositionClasses();
    }
  }

  /**
   * Monta el Orbe en la página. Arranca siempre en modo barra completa.
   * @param {object} cats - PRODUCTS de app.js (categorías → items)
   * @param {(catKey: string) => void} onSelect - se llama al elegir una categoría desde la barra
   */
  function init(cats, onSelect) {
    categories = cats;
    onSelectCategory = onSelect;
    mountBar();
  }

  return { init, elevate, dock, expandToBar, setLifted };
})();
