// Vista de lista de producto: filas de ancho completo, mucho más compactas
// que las cards en grilla (js/components/cards.js) — pensada para cuando el
// usuario prefiere ver más productos por pantalla sin scrollear tanto.
//
// Tiene EXACTAMENTE el mismo comportamiento de compra que Cards (elegir modo
// de venta si hay más de uno, preguntar preparación si el producto tiene
// opciones, saltar al mínimo de compra, permitir varias combinaciones modo+
// preparación a la vez vía el modal de detalle) — es la misma lógica de
// negocio, solo que dibujada como fila en vez de card. Se duplica a
// propósito en vez de compartir código con cards.js para que el componente
// quede 100% autocontenido, mismo criterio que el resto de js/components/.
//
// Reutiliza las clases compartidas .category-section / .category-collapse
// (definidas en css/styles.css) para el título y el colapsado de categoría,
// igual que cards.js — eso NO es específico de card ni de lista.

const ProductList = (function () {
  const STYLE_ID = "rl-styles";

  const CSS = `
    .rl-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .rl-row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
      background: #ffffff;
      border-radius: 14px;
      padding: 10px 14px;
      box-shadow: 0 2px 10px rgba(161, 61, 87, 0.08);
      transition: box-shadow 0.2s ease;
    }

    .rl-row--pulse {
      box-shadow: 0 0 0 2px rgba(193, 79, 107, 0.55), 0 2px 10px rgba(161, 61, 87, 0.08);
    }

    .rl-row--tappable {
      cursor: pointer;
    }

    .rl-info {
      flex: 1;
      min-width: 0;
    }

    .rl-name {
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.88rem;
      color: #2b2224;
      margin: 0 0 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rl-meta {
      font-family: 'Inter', system-ui, sans-serif;
      color: #8a7a7d;
      font-size: 0.68rem;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rl-price {
      font-family: 'Inter', system-ui, sans-serif;
      color: #a53d57;
      font-weight: 700;
      font-size: 0.85rem;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rl-price-alt {
      font-family: 'Inter', system-ui, sans-serif;
      color: #8a7a7d;
      font-size: 0.63rem;
      margin: 2px 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rl-unavailable {
      font-family: 'Inter', system-ui, sans-serif;
      color: #8a7a7d;
      font-style: italic;
      font-size: 0.72rem;
    }

    .rl-action {
      flex-shrink: 0;
      width: 112px;
    }

    .rl-add-btn {
      width: 100%;
      border: none;
      background: #c14f6b;
      color: #fff;
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.74rem;
      padding: 8px 0;
      border-radius: 999px;
      cursor: pointer;
      animation: rl-pop 0.18s ease;
    }

    .rl-add-btn:hover {
      background: #a53d57;
    }

    .rl-add-btn:active {
      transform: scale(0.96);
    }

    .rl-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f7e8ec;
      border-radius: 999px;
      padding: 3px;
      animation: rl-pop 0.18s ease;
    }

    .rl-step-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: none;
      background: #fff;
      color: #a53d57;
      font-size: 0.9rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rl-qty {
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      color: #a53d57;
      font-size: 0.78rem;
    }

    @keyframes rl-pop {
      from { transform: scale(0.9); opacity: 0.4; }
      to { transform: scale(1); opacity: 1; }
    }

    .rl-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(43, 34, 36, 0.55);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 60;
    }

    @media (min-width: 640px) {
      .rl-modal-overlay { align-items: center; }
    }

    .rl-modal {
      background: #fff;
      width: 100%;
      max-width: 420px;
      border-radius: 20px 20px 0 0;
      padding: 20px;
      box-sizing: border-box;
    }

    @media (min-width: 640px) {
      .rl-modal { border-radius: 20px; }
    }

    .rl-modal-title {
      font-family: 'Playfair Display', serif;
      color: #a53d57;
      font-size: 1.1rem;
      margin: 0 0 14px;
    }

    .rl-modal-option {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      border: 1.5px solid #f7e8ec;
      background: #fff;
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 10px;
      cursor: pointer;
      font-family: 'Inter', system-ui, sans-serif;
      text-align: left;
    }

    .rl-modal-option:hover {
      background: #f7e8ec;
    }

    .rl-modal-option-label {
      font-weight: 700;
      color: #2b2224;
      font-size: 0.92rem;
    }

    .rl-modal-option-detail {
      color: #a53d57;
      font-weight: 600;
      font-size: 0.88rem;
      margin-top: 2px;
    }

    .rl-modal-cancel {
      display: block;
      width: 100%;
      border: none;
      background: transparent;
      color: #8a7a7d;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 0.85rem;
      padding: 8px 0 0;
      cursor: pointer;
    }

    .rl-modal-mode-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #f7e8ec;
    }

    .rl-modal-mode-row:last-of-type {
      border-bottom: none;
    }

    .rl-modal-mode-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .rl-modal-mode-name {
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.85rem;
      color: #2b2224;
    }

    .rl-modal-mode-detail {
      font-family: 'Inter', system-ui, sans-serif;
      color: #a53d57;
      font-weight: 600;
      font-size: 0.8rem;
      margin-top: 1px;
    }

    .rl-modal-mode-control {
      flex-shrink: 0;
      width: 108px;
    }

    .rl-modal-item-total {
      display: flex;
      justify-content: space-between;
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      color: #a53d57;
      font-size: 0.95rem;
      padding: 12px 0 4px;
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const money = Pricing.money;

  function pulse(row) {
    row.classList.add("rl-row--pulse");
    setTimeout(() => row.classList.remove("rl-row--pulse"), 220);
  }

  /** Suma de a 1 hasta llegar al mínimo de compra del modo (ver mismo helper en cards.js). */
  function incrementToQty(handlers, catKey, item, modeKey, targetQty, preparacion) {
    let qty = 0;
    while (qty < targetQty) {
      qty = handlers.onIncrement(catKey, item, modeKey, preparacion);
    }
    return qty;
  }

  /** Resta 1, salvo que ya esté en el mínimo: ahí baja directo a 0 (ver mismo helper en cards.js). */
  function decrementRespectingMin(handlers, catKey, item, mode, preparacion, currentQty) {
    if (currentQty > mode.minQty) {
      return handlers.onDecrement(catKey, item, mode.key, preparacion);
    }
    let qty = currentQty;
    while (qty > 0) {
      qty = handlers.onDecrement(catKey, item, mode.key, preparacion);
    }
    return qty;
  }

  function getComboQty(state, modeKey, prep) {
    return (state[modeKey] && state[modeKey][prep]) || 0;
  }

  function setComboQty(state, modeKey, prep, qty) {
    if (!state[modeKey]) state[modeKey] = {};
    state[modeKey][prep] = qty;
  }

  function addOrIncrementCombo(handlers, catKey, item, modes, state, modeKey, prep) {
    const mode = modes.find((m) => m.key === modeKey);
    const existing = getComboQty(state, modeKey, prep);
    const qty =
      existing > 0
        ? handlers.onIncrement(catKey, item, modeKey, prep)
        : incrementToQty(handlers, catKey, item, modeKey, mode.minQty, prep);
    setComboQty(state, modeKey, prep, qty);
    return qty;
  }

  function findAnyActiveCombo(modes, state) {
    for (const mode of modes) {
      const preps = state[mode.key] || {};
      const prep = Object.keys(preps).find((p) => preps[p] > 0);
      if (prep) return { modeKey: mode.key, preparacion: prep };
    }
    return null;
  }

  function openModeModal(item, modes, onChoose) {
    const overlay = document.createElement("div");
    overlay.className = "rl-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "rl-modal";
    modal.innerHTML = `<p class="rl-modal-title">¿Cómo querés comprar "${item.name}"?</p>`;

    modes.forEach((mode) => {
      const optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "rl-modal-option";
      const labelText = mode.aliasName ? `${mode.label} — ${mode.aliasName}` : mode.label;
      optionBtn.innerHTML = `
        <span class="rl-modal-option-label">${labelText}</span>
        <span class="rl-modal-option-detail">${mode.detail}</span>
      `;
      optionBtn.addEventListener("click", () => {
        overlay.remove();
        onChoose(mode.key);
      });
      modal.appendChild(optionBtn);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "rl-modal-cancel";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", () => overlay.remove());
    modal.appendChild(cancelBtn);

    overlay.appendChild(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function openPrepModal(item, onChoose, onCancel) {
    const overlay = document.createElement("div");
    overlay.className = "rl-modal-overlay";

    function close() {
      overlay.remove();
      if (onCancel) onCancel();
    }

    const modal = document.createElement("div");
    modal.className = "rl-modal";
    modal.innerHTML = `<p class="rl-modal-title">¿Cómo querés el corte de "${item.name}"?</p>`;

    Preparation.getOptions(item).forEach((option) => {
      const optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "rl-modal-option";
      optionBtn.innerHTML = `<span class="rl-modal-option-label">${option}</span>`;
      optionBtn.addEventListener("click", () => {
        overlay.remove();
        onChoose(option);
      });
      modal.appendChild(optionBtn);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "rl-modal-cancel";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", close);
    modal.appendChild(cancelBtn);

    overlay.appendChild(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
  }

  function withPrepStep(item, onReady, onCancel) {
    if (Preparation.hasChoice(item)) {
      openPrepModal(item, (preparacion) => onReady(preparacion), onCancel);
    } else {
      onReady(Preparation.DEFAULT_OPTION);
    }
  }

  function openDetailModal(catKey, item, modes, state, handlers, onChange) {
    const overlay = document.createElement("div");
    overlay.className = "rl-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "rl-modal";
    overlay.appendChild(modal);

    function buildRow(mode, prep, qty, labelText) {
      const row = document.createElement("div");
      row.className = "rl-modal-mode-row";
      row.innerHTML = `
        <div class="rl-modal-mode-info">
          <span class="rl-modal-mode-name">${labelText}</span>
          <span class="rl-modal-mode-detail">${mode.detail}</span>
        </div>
      `;

      const controlWrap = document.createElement("div");
      controlWrap.className = "rl-modal-mode-control";

      if (qty === 0) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "rl-add-btn";
        addBtn.textContent = "+ Agregar";
        addBtn.addEventListener("click", () => {
          addOrIncrementCombo(handlers, catKey, item, modes, state, mode.key, prep);
          renderModal();
          onChange();
        });
        controlWrap.appendChild(addBtn);
      } else {
        const qtyText = mode.unitLabel === "kg" ? `${qty} kg` : `${qty} ${qty === 1 ? "unidad" : "unidades"}`;
        const stepper = document.createElement("div");
        stepper.className = "rl-stepper";
        stepper.innerHTML = `
          <button type="button" class="rl-step-btn rl-minus" aria-label="Restar">−</button>
          <span class="rl-qty">${qtyText}</span>
          <button type="button" class="rl-step-btn rl-plus" aria-label="Sumar">+</button>
        `;
        stepper.querySelector(".rl-minus").addEventListener("click", () => {
          setComboQty(state, mode.key, prep, decrementRespectingMin(handlers, catKey, item, mode, prep, qty));
          renderModal();
          onChange();
        });
        stepper.querySelector(".rl-plus").addEventListener("click", () => {
          setComboQty(state, mode.key, prep, handlers.onIncrement(catKey, item, mode.key, prep));
          renderModal();
          onChange();
        });
        controlWrap.appendChild(stepper);
      }

      row.appendChild(controlWrap);
      return row;
    }

    function renderModal() {
      modal.innerHTML = `<p class="rl-modal-title">${item.name}</p>`;

      modes.forEach((mode) => {
        if (modes.length > 1) {
          const modeHeader = document.createElement("p");
          modeHeader.className = "rl-modal-mode-name";
          modeHeader.textContent = mode.aliasName ? `${mode.label} — ${mode.aliasName}` : mode.label;
          modal.appendChild(modeHeader);
        }

        if (!Preparation.hasChoice(item)) {
          const prep = Preparation.DEFAULT_OPTION;
          modal.appendChild(buildRow(mode, prep, getComboQty(state, mode.key, prep), mode.label));
          return;
        }

        const preps = state[mode.key] || {};
        const activePreps = Object.keys(preps).filter((p) => preps[p] > 0);
        activePreps.forEach((prep) => {
          modal.appendChild(buildRow(mode, prep, preps[prep], prep));
        });

        const addPrepRow = document.createElement("div");
        addPrepRow.className = "rl-modal-mode-row";
        const addPrepBtn = document.createElement("button");
        addPrepBtn.type = "button";
        addPrepBtn.className = "rl-add-btn";
        addPrepBtn.textContent = activePreps.length ? "+ Agregar otra preparación" : "+ Agregar";
        addPrepBtn.addEventListener("click", () => {
          overlay.style.visibility = "hidden";
          const restore = () => (overlay.style.visibility = "");
          withPrepStep(
            item,
            (preparacion) => {
              restore();
              addOrIncrementCombo(handlers, catKey, item, modes, state, mode.key, preparacion);
              renderModal();
              onChange();
            },
            restore
          );
        });
        addPrepRow.appendChild(addPrepBtn);
        modal.appendChild(addPrepRow);
      });

      const total = modes.reduce((sum, mode) => {
        const preps = state[mode.key] || {};
        return sum + Object.values(preps).reduce((s, qty) => s + qty * mode.unitPrice, 0);
      }, 0);
      const totalLine = document.createElement("p");
      totalLine.className = "rl-modal-item-total";
      totalLine.innerHTML = `<span>Subtotal</span><span>${money(total)}</span>`;
      modal.appendChild(totalLine);

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "rl-modal-cancel";
      closeBtn.textContent = "Listo";
      closeBtn.addEventListener("click", () => overlay.remove());
      modal.appendChild(closeBtn);
    }

    renderModal();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  /**
   * Crea el elemento DOM de una fila de producto.
   * @param {string} catKey
   * @param {object} item - producto { name, cut, min, venta }
   * @param {object} handlers - { onIncrement(catKey, item, modeKey, preparacion?) -> nuevaQty, onDecrement(catKey, item, modeKey, preparacion?) -> nuevaQty }
   * @returns {HTMLElement}
   */
  function createProductRow(catKey, item, handlers) {
    const row = document.createElement("div");
    row.className = "rl-row";

    const info = document.createElement("div");
    info.className = "rl-info";
    row.appendChild(info);

    const name = document.createElement("p");
    name.className = "rl-name";
    name.textContent = item.name;
    info.appendChild(name);

    const metaParts = [item.cut, item.min ? `Mín: ${item.min}` : null].filter(Boolean);
    if (metaParts.length) {
      const meta = document.createElement("p");
      meta.className = "rl-meta";
      meta.textContent = metaParts.join(" · ");
      info.appendChild(meta);
    }

    const modes = Pricing.getSaleModes(item);

    if (modes.length === 0) {
      const unavailable = document.createElement("p");
      unavailable.className = "rl-unavailable";
      unavailable.textContent = "Consultar precio";
      info.appendChild(unavailable);
      return row;
    }

    const mainMode = modes.find((m) => m.key === "kilo") || modes[0];
    const price = document.createElement("p");
    price.className = "rl-price";
    price.textContent = mainMode.detail;
    info.appendChild(price);

    if (modes.length > 1) {
      const altMode = modes.find((m) => m.key !== mainMode.key);
      const altLabel = altMode.aliasName ? `${altMode.label} (${altMode.aliasName})` : altMode.label;
      const altLine = document.createElement("p");
      altLine.className = "rl-price-alt";
      altLine.textContent = `${altLabel}: ${altMode.detail}`;
      info.appendChild(altLine);
    }

    const action = document.createElement("div");
    action.className = "rl-action";
    row.appendChild(action);

    const state = {};
    modes.forEach((m) => (state[m.key] = {}));

    const hasMultipleCombos = modes.length > 1 || Preparation.hasChoice(item);

    let primary = modes.length === 1 && !Preparation.hasChoice(item) ? { modeKey: modes[0].key, preparacion: Preparation.DEFAULT_OPTION } : null;

    function resolvePrimary() {
      if (primary && getComboQty(state, primary.modeKey, primary.preparacion) > 0) return primary;
      return findAnyActiveCombo(modes, state);
    }

    function addCombo(modeKey, preparacion) {
      primary = { modeKey, preparacion };
      addOrIncrementCombo(handlers, catKey, item, modes, state, modeKey, preparacion);
      renderAction();
      pulse(row);
    }

    function renderAction() {
      action.innerHTML = "";
      primary = resolvePrimary();

      row.classList.toggle("rl-row--tappable", hasMultipleCombos && !!primary);

      if (!primary) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "rl-add-btn";
        addBtn.textContent = "+ Agregar";
        addBtn.addEventListener("click", () => {
          if (modes.length > 1) {
            openModeModal(item, modes, (modeKey) => {
              withPrepStep(item, (preparacion) => addCombo(modeKey, preparacion));
            });
          } else {
            withPrepStep(item, (preparacion) => addCombo(modes[0].key, preparacion));
          }
        });
        action.appendChild(addBtn);
        return;
      }

      const mode = modes.find((m) => m.key === primary.modeKey);
      const qty = getComboQty(state, primary.modeKey, primary.preparacion);
      const qtyText = mode.unitLabel === "kg" ? `${qty} kg` : `${qty} ${qty === 1 ? "unidad" : "unidades"}`;
      const stepper = document.createElement("div");
      stepper.className = "rl-stepper";
      stepper.innerHTML = `
        <button type="button" class="rl-step-btn rl-minus" aria-label="Restar">−</button>
        <span class="rl-qty">${qtyText}</span>
        <button type="button" class="rl-step-btn rl-plus" aria-label="Sumar">+</button>
      `;
      stepper.querySelector(".rl-minus").addEventListener("click", () => {
        setComboQty(
          state,
          primary.modeKey,
          primary.preparacion,
          decrementRespectingMin(handlers, catKey, item, mode, primary.preparacion, qty)
        );
        renderAction();
      });
      stepper.querySelector(".rl-plus").addEventListener("click", () => {
        setComboQty(state, primary.modeKey, primary.preparacion, handlers.onIncrement(catKey, item, mode.key, primary.preparacion));
        renderAction();
        pulse(row);
      });
      action.appendChild(stepper);
    }

    renderAction();

    if (hasMultipleCombos) {
      row.addEventListener("click", (e) => {
        if (!resolvePrimary()) return;
        if (e.target.closest(".rl-stepper") || e.target.closest(".rl-add-btn")) return;
        openDetailModal(catKey, item, modes, state, handlers, renderAction);
      });
    }

    return row;
  }

  /**
   * Crea la sección completa de una categoría (título colapsable + lista de filas).
   * Reutiliza las clases compartidas .category-* de css/styles.css, igual que cards.js.
   * @param {string} catKey
   * @param {object} category - { label, items }
   * @param {object} handlers - ver createProductRow
   */
  function createCategorySection(catKey, category, handlers) {
    injectStyles();

    const section = document.createElement("section");
    section.className = "category-section";
    section.id = `cat-${catKey}`;

    const h2 = document.createElement("h2");
    h2.innerHTML = `
      <span class="category-title"><span class="category-icon">${Icons[catKey] || ""}</span> ${category.label}</span>
      <span class="category-chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    `;
    h2.addEventListener("click", () => {
      section.classList.toggle("category-section--collapsed");
    });
    section.appendChild(h2);

    const list = document.createElement("div");
    list.className = "rl-list";
    category.items.forEach((item) => {
      list.appendChild(createProductRow(catKey, item, handlers));
    });

    const collapseInner = document.createElement("div");
    collapseInner.className = "category-collapse-inner";
    collapseInner.appendChild(list);

    const collapseWrap = document.createElement("div");
    collapseWrap.className = "category-collapse";
    collapseWrap.appendChild(collapseInner);
    section.appendChild(collapseWrap);

    return section;
  }

  return { money, createProductRow, createCategorySection };
})();
