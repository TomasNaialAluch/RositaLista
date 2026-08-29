// Cards de producto: grilla compacta (2 columnas en mobile) + botón de
// acción de dos estados ("Agregar" -> selector − qty +). Si el producto
// tiene dos modos de venta (por kilo y por unidad), "Agregar" abre un
// modal para elegir cuál antes de sumarlo. Una vez que ya hay algo puesto,
// tocar la card abre un modal de detalle con la opción de sumar también
// el otro modo (ej: 3 kg "por Kilo" + 1 "Ventana" del mismo producto).
// Si además el producto tiene opciones de preparación (js/preparation.js,
// ej: "Cortado a 3 dedos"), se pregunta como paso extra justo antes de
// agregar — ver withPrepStep().
// Componente 100% autocontenido: inyecta su propio <style>, no depende de
// styles.css. Usa Pricing (js/pricing.js) para los cálculos de precio.

const Cards = (function () {
  const STYLE_ID = "rc-styles";

  const CSS = `
    .rc-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    @media (min-width: 600px) {
      .rc-grid { grid-template-columns: repeat(3, 1fr); }
    }

    @media (min-width: 900px) {
      .rc-grid { grid-template-columns: repeat(4, 1fr); }
    }

    .rc-card {
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 18px;
      padding: 12px;
      min-height: 150px;
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(161, 61, 87, 0.1);
      transition: box-shadow 0.2s ease;
    }

    .rc-card--pulse {
      box-shadow: 0 0 0 2px rgba(193, 79, 107, 0.55), 0 2px 10px rgba(161, 61, 87, 0.1);
    }

    .rc-name {
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.88rem;
      color: #2b2224;
      margin: 0 0 4px;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .rc-meta {
      font-family: 'Inter', system-ui, sans-serif;
      color: #8a7a7d;
      font-size: 0.68rem;
      margin: 0 0 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rc-price {
      font-family: 'Inter', system-ui, sans-serif;
      color: #a53d57;
      font-weight: 700;
      font-size: 0.9rem;
      margin: 0 0 2px;
    }

    .rc-price small {
      font-weight: 500;
      color: #8a7a7d;
      font-size: 0.63rem;
    }

    .rc-price-alt {
      font-family: 'Inter', system-ui, sans-serif;
      color: #8a7a7d;
      font-size: 0.65rem;
      margin: 0 0 8px;
    }

    .rc-unavailable {
      font-family: 'Inter', system-ui, sans-serif;
      color: #8a7a7d;
      font-style: italic;
      font-size: 0.72rem;
      margin-top: auto;
    }

    .rc-action {
      margin-top: auto;
    }

    .rc-add-btn {
      width: 100%;
      border: none;
      background: #c14f6b;
      color: #fff;
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.78rem;
      padding: 9px 0;
      border-radius: 999px;
      cursor: pointer;
      animation: rc-pop 0.18s ease;
    }

    .rc-add-btn:hover {
      background: #a53d57;
    }

    .rc-add-btn:active {
      transform: scale(0.96);
    }

    .rc-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f7e8ec;
      border-radius: 999px;
      padding: 4px;
      animation: rc-pop 0.18s ease;
    }

    .rc-step-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: none;
      background: #fff;
      color: #a53d57;
      font-size: 0.95rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rc-qty {
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      color: #a53d57;
      font-size: 0.85rem;
    }

    @keyframes rc-pop {
      from { transform: scale(0.9); opacity: 0.4; }
      to { transform: scale(1); opacity: 1; }
    }

    .rc-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(43, 34, 36, 0.55);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 60;
    }

    @media (min-width: 640px) {
      .rc-modal-overlay { align-items: center; }
    }

    .rc-modal {
      background: #fff;
      width: 100%;
      max-width: 420px;
      border-radius: 20px 20px 0 0;
      padding: 20px;
      box-sizing: border-box;
    }

    @media (min-width: 640px) {
      .rc-modal { border-radius: 20px; }
    }

    .rc-modal-title {
      font-family: 'Playfair Display', serif;
      color: #a53d57;
      font-size: 1.1rem;
      margin: 0 0 14px;
    }

    .rc-modal-option {
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

    .rc-modal-option:hover {
      background: #f7e8ec;
    }

    .rc-modal-option-label {
      font-weight: 700;
      color: #2b2224;
      font-size: 0.92rem;
    }

    .rc-modal-option-detail {
      color: #a53d57;
      font-weight: 600;
      font-size: 0.88rem;
      margin-top: 2px;
    }

    .rc-modal-cancel {
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

    .rc-card--tappable {
      cursor: pointer;
    }

    .rc-modal-mode-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #f7e8ec;
    }

    .rc-modal-mode-row:last-of-type {
      border-bottom: none;
    }

    .rc-modal-mode-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .rc-modal-mode-name {
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.85rem;
      color: #2b2224;
    }

    .rc-modal-mode-detail {
      font-family: 'Inter', system-ui, sans-serif;
      color: #a53d57;
      font-weight: 600;
      font-size: 0.8rem;
      margin-top: 1px;
    }

    .rc-modal-mode-control {
      flex-shrink: 0;
      width: 108px;
    }

    .rc-add-btn--mini {
      padding: 7px 0;
      font-size: 0.72rem;
    }

    .rc-stepper--mini {
      padding: 3px;
    }

    .rc-stepper--mini .rc-step-btn {
      width: 22px;
      height: 22px;
      font-size: 0.85rem;
    }

    .rc-stepper--mini .rc-qty {
      font-size: 0.72rem;
    }

    .rc-modal-item-total {
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

  function pulse(card) {
    card.classList.add("rc-card--pulse");
    setTimeout(() => card.classList.remove("rc-card--pulse"), 220);
  }

  /**
   * Abre un modal para elegir el modo de venta de un producto con más de uno.
   * @param {object} item
   * @param {Array} modes - salida de Pricing.getSaleModes(item)
   * @param {(modeKey: string) => void} onChoose
   */
  function openModeModal(item, modes, onChoose) {
    const overlay = document.createElement("div");
    overlay.className = "rc-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "rc-modal";
    modal.innerHTML = `<p class="rc-modal-title">¿Cómo querés comprar "${item.name}"?</p>`;

    modes.forEach((mode) => {
      const optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "rc-modal-option";
      const labelText = mode.aliasName ? `${mode.label} — ${mode.aliasName}` : mode.label;
      optionBtn.innerHTML = `
        <span class="rc-modal-option-label">${labelText}</span>
        <span class="rc-modal-option-detail">${mode.detail}</span>
      `;
      optionBtn.addEventListener("click", () => {
        overlay.remove();
        onChoose(mode.key);
      });
      modal.appendChild(optionBtn);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "rc-modal-cancel";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", () => overlay.remove());
    modal.appendChild(cancelBtn);

    overlay.appendChild(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  /**
   * Abre un modal para elegir cómo quiere recibir la mercadería el cliente
   * (ej: "Cortado a 3 dedos"). Solo se llama si Preparation.hasChoice(item).
   * @param {object} item
   * @param {(preparacion: string) => void} onChoose
   * @param {() => void} [onCancel] - se llama si se cierra sin elegir nada
   */
  function openPrepModal(item, onChoose, onCancel) {
    const overlay = document.createElement("div");
    overlay.className = "rc-modal-overlay";

    function close() {
      overlay.remove();
      if (onCancel) onCancel();
    }

    const modal = document.createElement("div");
    modal.className = "rc-modal";
    modal.innerHTML = `<p class="rc-modal-title">¿Cómo querés el corte de "${item.name}"?</p>`;

    Preparation.getOptions(item).forEach((option) => {
      const optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "rc-modal-option";
      optionBtn.innerHTML = `<span class="rc-modal-option-label">${option}</span>`;
      optionBtn.addEventListener("click", () => {
        overlay.remove();
        onChoose(option);
      });
      modal.appendChild(optionBtn);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "rc-modal-cancel";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", close);
    modal.appendChild(cancelBtn);

    overlay.appendChild(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
  }

  /**
   * Si el producto tiene opciones de preparación, abre ese modal y recién
   * después agrega; si no tiene, agrega directo. Centraliza el "paso extra"
   * para no repetirlo en cada lugar que agrega una línea nueva al carrito.
   * @param {object} item
   * @param {(preparacion: string|undefined) => void} onReady - se llama con la preparación elegida (o undefined si no aplica)
   * @param {() => void} [onCancel] - se llama si el usuario cierra el modal de preparación sin elegir
   */
  function withPrepStep(item, onReady, onCancel) {
    if (Preparation.hasChoice(item)) {
      openPrepModal(item, (preparacion) => onReady(preparacion), onCancel);
    } else {
      onReady(undefined);
    }
  }

  /**
   * Abre el modal de detalle de un producto ya agregado: muestra cada modo
   * de venta con su cantidad actual y permite sumar el/los modo(s) que
   * todavía no se agregaron (ej: ya tenés "Ventana" y acá sumás "Por Kilo").
   * @param {string} catKey
   * @param {object} item
   * @param {Array} modes - salida de Pricing.getSaleModes(item)
   * @param {object} qtyByMode - { [modeKey]: qty } — se muta en el lugar
   * @param {object} handlers - onIncrement/onDecrement(catKey, item, modeKey)
   * @param {() => void} onChange - se llama después de cada cambio (para refrescar la card de atrás)
   */
  function openDetailModal(catKey, item, modes, qtyByMode, handlers, onChange) {
    const overlay = document.createElement("div");
    overlay.className = "rc-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "rc-modal";
    overlay.appendChild(modal);

    function renderModal() {
      modal.innerHTML = `<p class="rc-modal-title">${item.name}</p>`;

      modes.forEach((mode) => {
        const qty = qtyByMode[mode.key];
        const modeName = mode.aliasName ? `${mode.label} — ${mode.aliasName}` : mode.label;

        const row = document.createElement("div");
        row.className = "rc-modal-mode-row";
        row.innerHTML = `
          <div class="rc-modal-mode-info">
            <span class="rc-modal-mode-name">${modeName}</span>
            <span class="rc-modal-mode-detail">${mode.detail}</span>
          </div>
        `;

        const controlWrap = document.createElement("div");
        controlWrap.className = "rc-modal-mode-control";

        if (qty === 0) {
          const addBtn = document.createElement("button");
          addBtn.type = "button";
          addBtn.className = "rc-add-btn rc-add-btn--mini";
          addBtn.textContent = "+ Agregar";
          addBtn.addEventListener("click", () => {
            // Se oculta el modal de detalle mientras se pregunta la preparación,
            // para no tener dos fondos oscuros superpuestos; se restaura después.
            overlay.style.visibility = "hidden";
            const restore = () => (overlay.style.visibility = "");
            withPrepStep(
              item,
              (preparacion) => {
                restore();
                qtyByMode[mode.key] = handlers.onIncrement(catKey, item, mode.key, preparacion);
                renderModal();
                onChange();
              },
              restore
            );
          });
          controlWrap.appendChild(addBtn);
        } else {
          const qtyText = mode.unitLabel === "kg" ? `${qty} kg` : `${qty} ${qty === 1 ? "unidad" : "unidades"}`;
          const stepper = document.createElement("div");
          stepper.className = "rc-stepper rc-stepper--mini";
          stepper.innerHTML = `
            <button type="button" class="rc-step-btn rc-minus" aria-label="Restar">−</button>
            <span class="rc-qty">${qtyText}</span>
            <button type="button" class="rc-step-btn rc-plus" aria-label="Sumar">+</button>
          `;
          stepper.querySelector(".rc-minus").addEventListener("click", () => {
            qtyByMode[mode.key] = handlers.onDecrement(catKey, item, mode.key);
            renderModal();
            onChange();
          });
          stepper.querySelector(".rc-plus").addEventListener("click", () => {
            qtyByMode[mode.key] = handlers.onIncrement(catKey, item, mode.key);
            renderModal();
            onChange();
          });
          controlWrap.appendChild(stepper);
        }

        row.appendChild(controlWrap);
        modal.appendChild(row);
      });

      const total = modes.reduce((sum, m) => sum + qtyByMode[m.key] * m.unitPrice, 0);
      const totalLine = document.createElement("p");
      totalLine.className = "rc-modal-item-total";
      totalLine.innerHTML = `<span>Subtotal</span><span>${money(total)}</span>`;
      modal.appendChild(totalLine);

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "rc-modal-cancel";
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
   * Crea el elemento DOM de una tarjeta de producto.
   * @param {string} catKey - clave de la categoría (vacuno, cerdo, pollo)
   * @param {object} item - producto { name, cut, min, venta }
   * @param {object} handlers - { onIncrement(catKey, item, modeKey, preparacion?) -> nuevaQty, onDecrement(catKey, item, modeKey) -> nuevaQty }
   * @returns {HTMLElement}
   */
  function createProductCard(catKey, item, handlers) {
    const card = document.createElement("div");
    card.className = "rc-card";

    const name = document.createElement("p");
    name.className = "rc-name";
    name.textContent = item.name;
    card.appendChild(name);

    const metaParts = [item.cut, item.min ? `Mín: ${item.min}` : null].filter(Boolean);
    if (metaParts.length) {
      const meta = document.createElement("p");
      meta.className = "rc-meta";
      meta.textContent = metaParts.join(" · ");
      card.appendChild(meta);
    }

    const modes = Pricing.getSaleModes(item);

    if (modes.length === 0) {
      const unavailable = document.createElement("p");
      unavailable.className = "rc-unavailable";
      unavailable.textContent = "Consultar precio";
      card.appendChild(unavailable);
      return card;
    }

    // Precio principal: el de "por kilo" si existe, si no el único que haya.
    const mainMode = modes.find((m) => m.key === "kilo") || modes[0];
    const price = document.createElement("p");
    price.className = "rc-price";
    price.textContent = mainMode.detail;
    card.appendChild(price);

    if (modes.length > 1) {
      const altMode = modes.find((m) => m.key !== mainMode.key);
      const altLabel = altMode.aliasName ? `${altMode.label} (${altMode.aliasName})` : altMode.label;
      const altLine = document.createElement("p");
      altLine.className = "rc-price-alt";
      altLine.textContent = `${altLabel}: ${altMode.detail}`;
      card.appendChild(altLine);
    }

    const action = document.createElement("div");
    action.className = "rc-action";
    card.appendChild(action);

    // Cantidad de cada modo por separado: así "Por Kilo" y "Ventana" del mismo
    // producto pueden estar los dos puestos al mismo tiempo, aunque la card
    // solo muestre un stepper grande a la vez (el del modo "principal").
    const qtyByMode = {};
    modes.forEach((m) => (qtyByMode[m.key] = 0));

    // El modo principal es "pegajoso": queda siendo el que el usuario eligió
    // en la card (no cambia solo porque se sumó el otro modo desde el modal
    // de detalle). Si se vacía, se promueve el otro modo si todavía tiene
    // cantidad puesta; si no queda ninguno, vuelve a "+ Agregar".
    let primaryModeKey = modes.length === 1 ? modes[0].key : null;

    function resolvePrimaryMode() {
      if (primaryModeKey && qtyByMode[primaryModeKey] > 0) return primaryModeKey;
      const fallback = modes.find((m) => qtyByMode[m.key] > 0);
      return fallback ? fallback.key : null;
    }

    function addWithMode(modeKey, preparacion) {
      primaryModeKey = modeKey;
      qtyByMode[modeKey] = handlers.onIncrement(catKey, item, modeKey, preparacion);
      renderAction();
      pulse(card);
    }

    function renderAction() {
      action.innerHTML = "";
      primaryModeKey = resolvePrimaryMode();
      const current = primaryModeKey ? modes.find((m) => m.key === primaryModeKey) : null;

      card.classList.toggle("rc-card--tappable", modes.length > 1 && !!current);

      if (!current) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "rc-add-btn";
        addBtn.textContent = "+ Agregar";
        addBtn.addEventListener("click", () => {
          if (modes.length > 1) {
            openModeModal(item, modes, (modeKey) => {
              withPrepStep(item, (preparacion) => addWithMode(modeKey, preparacion));
            });
          } else {
            withPrepStep(item, (preparacion) => addWithMode(modes[0].key, preparacion));
          }
        });
        action.appendChild(addBtn);
        return;
      }

      const qty = qtyByMode[current.key];
      const qtyText = current.unitLabel === "kg" ? `${qty} kg` : `${qty} ${qty === 1 ? "unidad" : "unidades"}`;
      const stepper = document.createElement("div");
      stepper.className = "rc-stepper";
      stepper.innerHTML = `
        <button type="button" class="rc-step-btn rc-minus" aria-label="Restar">−</button>
        <span class="rc-qty">${qtyText}</span>
        <button type="button" class="rc-step-btn rc-plus" aria-label="Sumar">+</button>
      `;
      stepper.querySelector(".rc-minus").addEventListener("click", () => {
        qtyByMode[current.key] = handlers.onDecrement(catKey, item, current.key);
        renderAction();
      });
      stepper.querySelector(".rc-plus").addEventListener("click", () => {
        qtyByMode[current.key] = handlers.onIncrement(catKey, item, current.key);
        renderAction();
        pulse(card);
      });
      action.appendChild(stepper);
    }

    renderAction();

    // Una vez que ya hay algo agregado, tocar la card (fuera del selector
    // −/+) abre el modal de detalle, con la opción de sumar el otro modo.
    if (modes.length > 1) {
      card.addEventListener("click", (e) => {
        if (!resolvePrimaryMode()) return;
        if (e.target.closest(".rc-stepper") || e.target.closest(".rc-add-btn")) return;
        openDetailModal(catKey, item, modes, qtyByMode, handlers, renderAction);
      });
    }

    return card;
  }

  /**
   * Crea la sección completa de una categoría (título + grilla de cards).
   * @param {string} catKey
   * @param {object} category - { label, items }
   * @param {object} handlers - ver createProductCard
   */
  function createCategorySection(catKey, category, handlers) {
    injectStyles();

    const section = document.createElement("section");
    section.className = "category-section";
    section.id = `cat-${catKey}`;

    const h2 = document.createElement("h2");
    h2.innerHTML = `<span class="category-icon">${Icons[catKey] || ""}</span> ${category.label}`;
    section.appendChild(h2);

    const grid = document.createElement("div");
    grid.className = "rc-grid";
    category.items.forEach((item) => {
      grid.appendChild(createProductCard(catKey, item, handlers));
    });
    section.appendChild(grid);

    return section;
  }

  return { money, createProductCard, createCategorySection };
})();
