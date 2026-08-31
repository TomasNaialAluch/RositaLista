// Orbe: dueño del lugar fijo de la nav en la pantalla. Ver
// docs/rediseno-orbe-guia.md para el vocabulario completo (Barra completa /
// Orbe anclado / Orbe elevado / Viñeta) y la tabla de estados.
//
// Decide, según el estado, si en ese lugar se dibuja la barra completa
// (delegando en Nav.createNav) o el círculo animado. No son dos elementos
// coordinándose por afuera: Orbe es el único dueño de esa posición.
//
// Integración: calcularAsado.js, cards.js, cart.js y footer.js llaman a
// Orbe.elevate()/Orbe.dock() (ver docs/rediseno-orbe-guia.md).
//
// "Posado arriba del modal" (elevate()) no es una posición fija en pantalla:
// los modales son bottom-sheets de altura variable (ver *-modal.css), así
// que cada vez que se eleva, el Orbe busca el modal realmente visible en ese
// momento (ver MODAL_SELECTOR/findVisibleModal) y se ubica con margen justo
// arriba de su borde superior — no en un `top` fijo, que quedaría flotando
// lejos del modal (o encima del logo) cuando el modal es chico. Se
// re-mide con ResizeObserver porque el contenido del modal puede crecer
// (ej: "+ Agregar otra preparación" en cards.js) mientras sigue abierto.

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

  // Selectores de la "hoja" de cada modal de la app (no el overlay que la
  // envuelve) — uno por cada CSS autocontenido (cards.js/calcularAsado.js/
  // cart.js/footer.js siguen el mismo patrón de bottom-sheet a propósito,
  // ver comentario en cada *.css). Se usa para encontrar, en cada elevate(),
  // el modal que está realmente en pantalla y posarse arriba de él.
  const MODAL_SELECTOR = ".rc-modal, .ca-modal, .rl-modal, .cart-modal-content, .footer-about-modal";
  const ELEVATE_MARGIN = 14; // separación entre el borde de abajo del Orbe y el borde de arriba del modal
  const ELEVATE_MIN_TOP = 12; // no dejar que se pegue al borde superior de la ventana en modales muy altos

  let modalObserver = null; // ResizeObserver del modal actualmente trackeado
  let trackedModal = null;
  let repositionHandle = null;

  /** Busca la "hoja" del modal realmente visible (no el overlay que la envuelve). */
  function findVisibleModal() {
    const candidates = document.querySelectorAll(MODAL_SELECTOR);
    let found = null;
    candidates.forEach((el) => {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Si hay más de un candidato válido (p.ej. modal de detalle + modal de
      // preparación anidado), el último en orden de DOM es el más reciente.
      found = el;
    });
    return found;
  }

  /** Deja de trackear el modal actual (al cerrarlo, anclar, o desmontar el círculo). */
  function stopTracking() {
    if (repositionHandle !== null) {
      cancelAnimationFrame(repositionHandle);
      repositionHandle = null;
    }
    if (modalObserver) {
      modalObserver.disconnect();
      modalObserver = null;
    }
    trackedModal = null;
    if (circleWrap) circleWrap.style.removeProperty("--orbe-elevated-top");
  }

  /** Mide el modal visible y posiciona el círculo elevado con margen justo arriba. */
  function positionAboveModal() {
    if (!circleWrap || position !== "elevated") return;
    const modalEl = findVisibleModal();
    if (modalEl !== trackedModal) {
      if (modalObserver) modalObserver.disconnect();
      trackedModal = modalEl;
      if (modalEl) {
        modalObserver = new ResizeObserver(() => positionAboveModal());
        modalObserver.observe(modalEl);
      } else {
        modalObserver = null;
      }
    }
    if (!modalEl) {
      circleWrap.style.removeProperty("--orbe-elevated-top");
      return;
    }
    const modalTop = modalEl.getBoundingClientRect().top;
    const circle = circleWrap.querySelector(".orbe-circle");
    const circleHeight = circle ? circle.offsetHeight : 54;
    const top = Math.max(ELEVATE_MIN_TOP, modalTop - circleHeight - ELEVATE_MARGIN);
    circleWrap.style.setProperty("--orbe-elevated-top", `${top}px`);
  }

  /** Programa una medición para el próximo frame (el modal ya está en el DOM para entonces). */
  function scheduleReposition() {
    if (repositionHandle !== null) cancelAnimationFrame(repositionHandle);
    repositionHandle = requestAnimationFrame(() => {
      repositionHandle = null;
      positionAboveModal();
    });
  }

  let resizeBound = false;
  function ensureResizeListener() {
    if (resizeBound) return;
    resizeBound = true;
    window.addEventListener("resize", () => {
      if (position === "elevated") positionAboveModal();
    });
  }

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
    stopTracking();
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
    ensureResizeListener();
    // El modal recién se termina de armar/appendear en la misma llamada
    // síncrona que disparó este elevate() — para el próximo frame ya está
    // en el DOM, así que ahí recién se puede medir dónde quedó su borde.
    scheduleReposition();
  }

  /** Vuelve a anclar el Orbe (círculo solo, sin modal), después de cerrar uno. */
  function dock(text) {
    if (text) message = text;
    stopTracking();
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
