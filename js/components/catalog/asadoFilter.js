// Chips de filtro "Cortes de asado" / "Ver todos los cortes", visibles solo
// mientras dura el modo Asado — ver docs/rediseno-filtro-cortes-asado.md.
// No sabe nada de productos ni de categorías: solo dibuja el toggle y le
// avisa a quien lo creó qué modo quedó elegido. Es `app.js` quien decide,
// con esa info, qué le pasa a Cards/ProductList como `category.items` de
// vacuno/cerdo/achuras (ver `applyAsadoFilter` en app.js).

const AsadoFilter = (function () {
  const CHIP_ASADO = "asado";
  const CHIP_TODOS = "todos";

  let mode = CHIP_ASADO;
  let wrapEl = null;
  let onChange = null;

  function applyActive() {
    if (!wrapEl) return;
    wrapEl.querySelectorAll(".asado-filter-chip").forEach((btn) => {
      btn.classList.toggle("asado-filter-chip--active", btn.dataset.mode === mode);
    });
  }

  /**
   * Monta los chips. Arranca siempre en "Cortes de asado" — se llama de
   * nuevo cada vez que se prende el modo (ver `onEnter` en app.js), así que
   * no hace falta acordarse del estado entre una activación y la próxima.
   * @param {() => void} cb - se llama cuando el usuario cambia de chip (para que app.js vuelva a pintar el catálogo)
   * @returns {HTMLElement}
   */
  function create(cb) {
    onChange = cb;
    mode = CHIP_ASADO;

    wrapEl = document.createElement("div");
    wrapEl.className = "asado-filter";
    wrapEl.innerHTML = `
      <button type="button" class="asado-filter-chip" data-mode="${CHIP_ASADO}">🔥 Cortes de asado</button>
      <button type="button" class="asado-filter-chip" data-mode="${CHIP_TODOS}">Ver todos los cortes</button>
    `;
    wrapEl.querySelectorAll(".asado-filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.mode === mode) return;
        mode = btn.dataset.mode;
        applyActive();
        if (onChange) onChange();
      });
    });
    applyActive();
    return wrapEl;
  }

  function remove() {
    if (wrapEl) {
      wrapEl.remove();
      wrapEl = null;
    }
    onChange = null;
  }

  /**
   * Fuerza el chip a "Ver todos" sin disparar `onChange` — lo usa
   * CalcularAsado cuando entra al modo selección de Achuras, porque
   * Mondongo/Hígado quedan afuera del filtro "Cortes de asado" y si no
   * se ven no se pueden elegir (ver "Preguntas para confirmar" #5 en
   * docs/rediseno-filtro-cortes-asado.md). Quien llama es responsable de
   * volver a pintar el catálogo después de esto.
   */
  function showAll() {
    mode = CHIP_TODOS;
    applyActive();
  }

  function isAsadoOnly() {
    return mode === CHIP_ASADO;
  }

  return { create, remove, showAll, isAsadoOnly };
})();
