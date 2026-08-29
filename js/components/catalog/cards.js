// Cards de producto: grilla compacta (2 columnas en mobile) + botón de
// acción de dos estados ("Agregar" -> selector − qty +). Si el producto
// tiene dos modos de venta (por kilo y por unidad), "Agregar" abre un
// modal para elegir cuál antes de sumarlo, y si además tiene opciones de
// preparación (js/preparation.js, ej: "Cortado a 3 dedos"), se pregunta
// como paso extra justo después — ver withPrepStep(). El último paso es
// siempre un modal de cantidad (ver openQuantityModal) para poder ajustar
// cuánto se quiere sin volver al home ni tocar la card de nuevo.
//
// Cada combinación (modo, preparación) es una línea independiente del
// carrito: se puede tener, por ejemplo, "Peceto · unidad · Entera" y
// "Peceto · unidad · Para milanesa" al mismo tiempo, cada una con su
// propia cantidad. Por eso el estado de cada card no es "una cantidad por
// modo" sino "una cantidad por cada combinación modo+preparación ya
// agregada" (ver el objeto `state` en createProductCard). Una vez que hay
// algo agregado, tocar la card abre el modal de detalle, que permite tanto
// sumar el otro modo (ej: "por Kilo" además de "Ventana") como agregar
// otra preparación dentro del mismo modo (ej: otro Peceto, esta vez para
// milanesa).
// Crea su propio DOM, no depende de markup puesto en index.html. El CSS
// vive aparte en css/components/catalog/cards.css, importado por <link>
// en index.html. Usa Pricing (js/pricing.js) para los cálculos de precio.

const Cards = (function () {
  const money = Pricing.money;

  // Textos de la Orbe para cada modal de este archivo — ver
  // docs/rediseno-orbe-guia.md ("Qué dice la viñeta en cada paso").
  const ORBE_TEXT_MODE = 'Elegí si querés que te lo corte a pedido ("Por Kilo") o llevarte la pieza entera ("Por Unidad").';
  const ORBE_TEXT_PREP = "Elegí cómo querés que te lo entreguemos: tal cual viene, o cortado de la forma que prefieras.";
  const ORBE_TEXT_QUANTITY = "Ajustá la cantidad con los botones, y confirmá cuando estés listo.";
  const ORBE_TEXT_DETAIL =
    "Acá podés sumar el otro modo de compra o agregar otra preparación de este mismo producto — se puede mezclar todo lo que quieras.";

  function pulse(card) {
    card.classList.add("rc-card--pulse");
    setTimeout(() => card.classList.remove("rc-card--pulse"), 220);
  }

  /**
   * Suma de a 1 hasta llegar al mínimo de compra del modo (ej: Pechito de
   * Cerdo por kilo tiene mínimo 3 kg — al agregar, salta directo a 3 kg
   * en vez de arrancar en 1). Para modos sin mínimo (minQty 1) es un solo paso.
   */
  function incrementToQty(handlers, catKey, item, modeKey, targetQty, preparacion) {
    let qty = 0;
    while (qty < targetQty) {
      qty = handlers.onIncrement(catKey, item, modeKey, preparacion);
    }
    return qty;
  }

  /**
   * Resta 1, salvo que ya esté en el mínimo de compra: ahí baja directo a 0
   * (saca la línea del carrito) en vez de dejarla en una cantidad inválida
   * por debajo del mínimo.
   */
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

  /** Lee la cantidad de una combinación (modo, preparación) del estado de una card. */
  function getComboQty(state, modeKey, prep) {
    return (state[modeKey] && state[modeKey][prep]) || 0;
  }

  /** Guarda la cantidad de una combinación (modo, preparación) en el estado de una card. */
  function setComboQty(state, modeKey, prep, qty) {
    if (!state[modeKey]) state[modeKey] = {};
    state[modeKey][prep] = qty;
  }

  /**
   * Agrega 1 a una combinación (modo, preparación): si ya existía, suma
   * normal; si es nueva, salta directo al mínimo de compra del modo.
   */
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

  /** Busca cualquier combinación (modo, preparación) con cantidad puesta, la que sea. */
  function findAnyActiveCombo(modes, state) {
    for (const mode of modes) {
      const preps = state[mode.key] || {};
      const prep = Object.keys(preps).find((p) => preps[p] > 0);
      if (prep) return { modeKey: mode.key, preparacion: prep };
    }
    return null;
  }

  /**
   * Abre un modal para elegir el modo de venta de un producto con más de uno.
   * @param {object} item
   * @param {Array} modes - salida de Pricing.getSaleModes(item)
   * @param {(modeKey: string) => void} onChoose
   */
  function openModeModal(item, modes, onChoose) {
    Orbe.elevate(ORBE_TEXT_MODE);

    const overlay = document.createElement("div");
    overlay.className = "rc-modal-overlay";

    function close() {
      overlay.remove();
      Orbe.dock();
    }

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
        close();
        onChoose(mode.key);
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
   * Abre un modal para elegir cómo quiere recibir la mercadería el cliente
   * (ej: "Cortado a 3 dedos"). Solo se llama si Preparation.hasChoice(item).
   * @param {object} item
   * @param {(preparacion: string) => void} onChoose
   * @param {() => void} [onCancel] - se llama si se cierra sin elegir nada
   */
  function openPrepModal(item, onChoose, onCancel) {
    Orbe.elevate(ORBE_TEXT_PREP);

    const overlay = document.createElement("div");
    overlay.className = "rc-modal-overlay";

    function close(cancelled) {
      overlay.remove();
      Orbe.dock();
      if (cancelled && onCancel) onCancel();
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
        close(false);
        onChoose(option);
      });
      modal.appendChild(optionBtn);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "rc-modal-cancel";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", () => close(true));
    modal.appendChild(cancelBtn);

    overlay.appendChild(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(true);
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
      // Sin opciones: la preparación siempre es el default, como valor
      // concreto (no undefined) para que coincida con la clave que usa
      // el modal de detalle al leer/escribir el estado de esta combinación.
      onReady(Preparation.DEFAULT_OPTION);
    }
  }

  /**
   * Último paso del flujo de "Agregar": una vez elegidos modo y preparación,
   * ya se sumó el mínimo de compra al carrito (ver addCombo) — este modal
   * deja ajustar esa cantidad con el mismo stepper del modal de detalle
   * antes de volver al home, en vez de que el usuario tenga que volver a
   * tocar la card para recién ahí subir la cantidad.
   * @param {string} catKey
   * @param {object} item
   * @param {Array} modes
   * @param {object} state
   * @param {object} handlers
   * @param {string} modeKey
   * @param {string} preparacion
   * @param {() => void} onChange - se llama después de cada cambio (para refrescar la card de atrás)
   */
  function openQuantityModal(catKey, item, modes, state, handlers, modeKey, preparacion, onChange) {
    const mode = modes.find((m) => m.key === modeKey);
    Orbe.elevate(ORBE_TEXT_QUANTITY);

    const overlay = document.createElement("div");
    overlay.className = "rc-modal-overlay";

    function close() {
      overlay.remove();
      Orbe.dock();
    }

    const modal = document.createElement("div");
    modal.className = "rc-modal";
    overlay.appendChild(modal);

    function render() {
      const qty = getComboQty(state, modeKey, preparacion);

      const titleParts = [item.name];
      if (modes.length > 1) titleParts.push(mode.aliasName ? `${mode.label} — ${mode.aliasName}` : mode.label);
      if (preparacion !== Preparation.DEFAULT_OPTION) titleParts.push(preparacion);

      modal.innerHTML = `
        <p class="rc-modal-title">${titleParts.join(" · ")}</p>
        <p class="rc-modal-mode-detail">${mode.detail}</p>
      `;

      const qtyText = mode.unitLabel === "kg" ? `${qty} kg` : `${qty} ${qty === 1 ? "unidad" : "unidades"}`;
      const stepper = document.createElement("div");
      stepper.className = "rc-stepper";
      stepper.style.marginTop = "14px";
      stepper.innerHTML = `
        <button type="button" class="rc-step-btn rc-minus" aria-label="Restar">−</button>
        <span class="rc-qty">${qtyText}</span>
        <button type="button" class="rc-step-btn rc-plus" aria-label="Sumar">+</button>
      `;
      stepper.querySelector(".rc-minus").addEventListener("click", () => {
        const newQty = decrementRespectingMin(handlers, catKey, item, mode, preparacion, qty);
        setComboQty(state, modeKey, preparacion, newQty);
        onChange();
        if (newQty === 0) {
          close();
          return;
        }
        render();
      });
      stepper.querySelector(".rc-plus").addEventListener("click", () => {
        setComboQty(state, modeKey, preparacion, handlers.onIncrement(catKey, item, modeKey, preparacion));
        onChange();
        render();
      });
      modal.appendChild(stepper);

      const totalLine = document.createElement("p");
      totalLine.className = "rc-modal-item-total";
      totalLine.innerHTML = `<span>Subtotal</span><span>${money(qty * mode.unitPrice)}</span>`;
      modal.appendChild(totalLine);

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "rc-add-btn";
      confirmBtn.textContent = "Agregar al carrito";
      confirmBtn.addEventListener("click", close);
      modal.appendChild(confirmBtn);
    }

    render();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
  }

  /**
   * Abre el modal de detalle de un producto ya agregado: para cada modo de
   * venta muestra sus preparaciones ya agregadas (o la cantidad simple, si
   * el producto no tiene preparaciones) y deja sumar tanto el otro modo
   * (ej: ya tenés "Ventana" y acá sumás "Por Kilo") como otra preparación
   * dentro del mismo modo (ej: ya tenés Peceto "Entera" y acá sumás uno
   * "Para milanesa").
   * @param {string} catKey
   * @param {object} item
   * @param {Array} modes - salida de Pricing.getSaleModes(item)
   * @param {object} state - { [modeKey]: { [preparacion]: qty } } — se muta en el lugar
   * @param {object} handlers - onIncrement/onDecrement(catKey, item, modeKey, preparacion)
   * @param {() => void} onChange - se llama después de cada cambio (para refrescar la card de atrás)
   */
  function openDetailModal(catKey, item, modes, state, handlers, onChange) {
    Orbe.elevate(ORBE_TEXT_DETAIL);

    const overlay = document.createElement("div");
    overlay.className = "rc-modal-overlay";

    function close() {
      overlay.remove();
      Orbe.dock();
    }

    const modal = document.createElement("div");
    modal.className = "rc-modal";
    overlay.appendChild(modal);

    function buildRow(mode, prep, qty, labelText) {
      const row = document.createElement("div");
      row.className = "rc-modal-mode-row";
      row.innerHTML = `
        <div class="rc-modal-mode-info">
          <span class="rc-modal-mode-name">${labelText}</span>
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
          addOrIncrementCombo(handlers, catKey, item, modes, state, mode.key, prep);
          renderModal();
          onChange();
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
          setComboQty(state, mode.key, prep, decrementRespectingMin(handlers, catKey, item, mode, prep, qty));
          renderModal();
          onChange();
        });
        stepper.querySelector(".rc-plus").addEventListener("click", () => {
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
      modal.innerHTML = `<p class="rc-modal-title">${item.name}</p>`;

      modes.forEach((mode) => {
        if (modes.length > 1) {
          const modeHeader = document.createElement("p");
          modeHeader.className = "rc-modal-mode-name";
          modeHeader.textContent = mode.aliasName ? `${mode.label} — ${mode.aliasName}` : mode.label;
          modal.appendChild(modeHeader);
        }

        if (!Preparation.hasChoice(item)) {
          // Sin opciones de preparación: una sola fila simple para el modo.
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
        addPrepRow.className = "rc-modal-mode-row";
        const addPrepBtn = document.createElement("button");
        addPrepBtn.type = "button";
        addPrepBtn.className = "rc-add-btn rc-add-btn--mini";
        addPrepBtn.textContent = activePreps.length ? "+ Agregar otra preparación" : "+ Agregar";
        addPrepBtn.addEventListener("click", () => {
          // Se oculta el modal de detalle mientras se pregunta la preparación,
          // para no tener dos fondos oscuros superpuestos; se restaura después.
          overlay.style.visibility = "hidden";
          const restore = () => {
            overlay.style.visibility = "";
            Orbe.elevate(ORBE_TEXT_DETAIL);
          };
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
      totalLine.className = "rc-modal-item-total";
      totalLine.innerHTML = `<span>Subtotal</span><span>${money(total)}</span>`;
      modal.appendChild(totalLine);

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "rc-modal-cancel";
      closeBtn.textContent = "Listo";
      closeBtn.addEventListener("click", close);
      modal.appendChild(closeBtn);
    }

    renderModal();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
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

    // Cantidad de cada combinación (modo, preparación) por separado: así
    // "Por Kilo" y "Ventana" del mismo producto pueden convivir, y dentro de
    // un mismo modo también pueden convivir varias preparaciones (ej: un
    // Peceto "Entera" y otro "Para milanesa"). La card solo muestra un
    // stepper grande a la vez (el de la combinación "principal"); el resto
    // se administra desde el modal de detalle.
    const state = {};
    modes.forEach((m) => (state[m.key] = {}));

    // Si hay más de un modo, o el producto tiene opciones de preparación,
    // puede haber más de una combinación puesta a la vez — ahí es donde
    // tiene sentido que tocar la card abra el modal de detalle.
    const hasMultipleCombos = modes.length > 1 || Preparation.hasChoice(item);

    // La combinación principal es "pegajosa": queda siendo la que el usuario
    // eligió en la card (no cambia solo porque se sumó otra desde el modal
    // de detalle). Si se vacía, se promueve cualquier otra que siga activa;
    // si no queda ninguna, vuelve a "+ Agregar".
    let primary = modes.length === 1 && !Preparation.hasChoice(item) ? { modeKey: modes[0].key, preparacion: Preparation.DEFAULT_OPTION } : null;

    function resolvePrimary() {
      if (primary && getComboQty(state, primary.modeKey, primary.preparacion) > 0) return primary;
      return findAnyActiveCombo(modes, state);
    }

    function addCombo(modeKey, preparacion) {
      primary = { modeKey, preparacion };
      addOrIncrementCombo(handlers, catKey, item, modes, state, modeKey, preparacion);
      renderAction();
      pulse(card);
      openQuantityModal(catKey, item, modes, state, handlers, modeKey, preparacion, renderAction);
    }

    function renderAction() {
      action.innerHTML = "";
      primary = resolvePrimary();

      card.classList.toggle("rc-card--tappable", hasMultipleCombos && !!primary);

      if (!primary) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "rc-add-btn";
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
      stepper.className = "rc-stepper";
      stepper.innerHTML = `
        <button type="button" class="rc-step-btn rc-minus" aria-label="Restar">−</button>
        <span class="rc-qty">${qtyText}</span>
        <button type="button" class="rc-step-btn rc-plus" aria-label="Sumar">+</button>
      `;
      stepper.querySelector(".rc-minus").addEventListener("click", () => {
        setComboQty(
          state,
          primary.modeKey,
          primary.preparacion,
          decrementRespectingMin(handlers, catKey, item, mode, primary.preparacion, qty)
        );
        renderAction();
      });
      stepper.querySelector(".rc-plus").addEventListener("click", () => {
        setComboQty(state, primary.modeKey, primary.preparacion, handlers.onIncrement(catKey, item, mode.key, primary.preparacion));
        renderAction();
        pulse(card);
      });
      action.appendChild(stepper);
    }

    renderAction();

    // Una vez que ya hay algo agregado, tocar la card (fuera del selector
    // −/+) abre el modal de detalle, con la opción de sumar el otro modo
    // y/o otra preparación del mismo modo.
    if (hasMultipleCombos) {
      card.addEventListener("click", (e) => {
        if (!resolvePrimary()) return;
        if (e.target.closest(".rc-stepper") || e.target.closest(".rc-add-btn")) return;
        openDetailModal(catKey, item, modes, state, handlers, renderAction);
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

    const grid = document.createElement("div");
    grid.className = "rc-grid";
    category.items.forEach((item) => {
      grid.appendChild(createProductCard(catKey, item, handlers));
    });

    const collapseInner = document.createElement("div");
    collapseInner.className = "category-collapse-inner";
    collapseInner.appendChild(grid);

    const collapseWrap = document.createElement("div");
    collapseWrap.className = "category-collapse";
    collapseWrap.appendChild(collapseInner);
    section.appendChild(collapseWrap);

    return section;
  }

  return { money, createProductCard, createCategorySection };
})();
