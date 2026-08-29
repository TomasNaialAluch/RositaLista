// Gesto genérico de "deslizar hacia abajo para cerrar", el patrón típico
// de un bottom-sheet. No sabe nada de carritos ni tickets — solo mueve
// `contentEl` seguido al puntero y, si se soltó pasado el umbral, lo anima
// hacia afuera y agrega "hidden" a `overlayEl`. Arranca únicamente desde
// `handleEl` (no desde cualquier parte del panel) para no pisar el scroll
// del contenido de adentro.

const SwipeToClose = (function () {
  const DEFAULT_THRESHOLD = 100;
  const CLOSE_ANIMATION_MS = 220;

  /**
   * @param {object} els
   * @param {HTMLElement} els.overlay - se le agrega "hidden" al cerrar
   * @param {HTMLElement} els.content - el panel que se arrastra
   * @param {HTMLElement} els.handle - desde dónde se puede empezar a arrastrar
   * @param {() => void} [els.onClose] - se llama cuando el gesto efectivamente cierra el panel
   * @param {number} [threshold] - píxeles de arrastre para considerar "cerrar"
   */
  function attach({ overlay, content, handle, onClose }, threshold = DEFAULT_THRESHOLD) {
    let startY = null;
    let currentDy = 0;

    handle.addEventListener("pointerdown", (e) => {
      startY = e.clientY;
      content.classList.add("cart-modal-content--dragging");
    });

    window.addEventListener("pointermove", (e) => {
      if (startY === null) return;
      currentDy = Math.max(0, e.clientY - startY);
      content.style.transform = `translateY(${currentDy}px)`;
    });

    window.addEventListener("pointerup", () => {
      if (startY === null) return;
      content.classList.remove("cart-modal-content--dragging");

      if (currentDy > threshold) {
        content.style.transform = "translateY(100%)";
        setTimeout(() => {
          overlay.classList.add("hidden");
          content.style.transform = "";
          if (onClose) onClose();
        }, CLOSE_ANIMATION_MS);
      } else {
        content.style.transform = "";
      }
      startY = null;
      currentDy = 0;
    });
  }

  return { attach };
})();
