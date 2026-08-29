// Componente de carrito: estado del pedido (repartido en uno o más
// "tickets"), barra flotante y modal de detalle con el mensaje final. Crea
// su propio DOM, no depende de markup puesto en index.html. El CSS vive
// aparte en css/components/cart/cart.css, importado por <link> en
// index.html.
//
// No sabe nada de cómo se dibuja una card: solo expone Cart.increment /
// Cart.decrement (mismas firmas que esperan los handlers de Cards) y
// Cart.init() para montarse en la página.
//
// TICKETS — ver rediseno-tickets-pedido.md para la spec completa. Resumen:
// un pedido puede repartirse en varios "tickets" (ej: "Para mí" / "Para
// Juan") para que Rosita sepa cómo armar las bolsas, pero siempre hay UN
// SOLO pago (la suma de todos los tickets) y UN SOLO nombre/dirección de
// entrega. Dos flujos conviven: arrancar un ticket nuevo de cero (botón
// "+ Nuevo pedido"), o partir una línea ya agregada en varios tickets
// (botón "Dividir" en cada línea). Todo lo que se reparte se maneja en
// kilos (ver mergeKgIntoTicket) — un producto vendido "por unidad" ya es,
// en el fondo, "tantos kilos a tal precio por kilo" (ver js/pricing.js).

const Cart = (function () {
  const WHATSAPP_ICON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.876.516 3.632 1.412 5.13L2 22l4.995-1.379A9.947 9.947 0 0 0 12.001 22C17.524 22 22 17.523 22 12S17.524 2 12.001 2zm0 18.06a8.03 8.03 0 0 1-4.099-1.122l-.294-.175-3.04.84.821-2.965-.192-.304A8.03 8.03 0 0 1 3.94 12c0-4.444 3.617-8.06 8.061-8.06 4.444 0 8.06 3.616 8.06 8.06 0 4.444-3.616 8.06-8.06 8.06z"/></svg>`;
  const OTRO_BARRIO = "__OTRO__";

  const money = Pricing.money;
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // tickets: { [id]: { name, lines: { "cat|nombre|modo|prep": entry } } }
  const tickets = {};
  const ticketOrder = [];
  let activeTicketId = null;
  let ticketIdCounter = 0;

  let CONFIG = { whatsappNumber: "", ventaMinimaKg: 0, barrios: [] };
  let onVisibilityChange = null;
  const shipping = { choice: null, otro: "" };

  let els = {}; // referencias a los elementos creados por buildDOM()

  // ---- Tickets: CRUD ----------------------------------------------------

  function createTicket(name) {
    ticketIdCounter += 1;
    const id = `t${ticketIdCounter}`;
    tickets[id] = { name: name || `Pedido ${ticketOrder.length + 1}`, lines: {} };
    ticketOrder.push(id);
    return id;
  }

  /**
   * Borra un ticket (con confirmación, ya resuelta por quien llama). Lo que
   * tenía adentro NO se pierde: se fusiona (en kilos) con el ticket
   * anterior en el orden — ver mergeKgIntoTicket. No se puede borrar el
   * único ticket que queda.
   */
  function deleteTicket(ticketId) {
    if (ticketOrder.length <= 1) return;
    const idx = ticketOrder.indexOf(ticketId);
    if (idx === -1) return;
    const targetId = ticketOrder[idx === 0 ? 1 : idx - 1];

    getTicketEntries(ticketId).forEach((entry) => {
      const precioPorKg = entry.unitLabel === "kg" ? entry.unitPrice : entry.product.venta[entry.mode].precioPorKg;
      mergeKgIntoTicket(targetId, entry.product, entry.category, entry.preparacion, kgOf(entry), precioPorKg);
    });

    delete tickets[ticketId];
    ticketOrder.splice(idx, 1);
    if (activeTicketId === ticketId) activeTicketId = targetId;
    updateUI();
  }

  // ---- Cantidades y kilos -------------------------------------------------

  /** Cuántos kilos representa una línea, sea "kilo" o "unidad" (unidad = qty × pesoAproxKg). */
  function kgOf(entry) {
    if (entry.unitLabel === "kg") return entry.qty;
    const modeData = entry.product.venta[entry.mode];
    return entry.qty * (modeData ? modeData.pesoAproxKg : 1);
  }

  /**
   * Suma `kg` de un producto+preparación a un ticket, siempre como línea
   * "Por Kilo" (si ya había algo de esa misma combinación en ese ticket, se
   * suma). Es la operación de fondo tanto para "Dividir" una línea como
   * para fusionar al borrar un ticket — una vez que algo se reparte entre
   * tickets, deja de importar si originalmente era "kilo" o "unidad".
   */
  function mergeKgIntoTicket(targetTicketId, product, category, preparacion, kg, precioPorKg) {
    const key = `${category}|${product.name}|kilo|${preparacion}`;
    const lines = tickets[targetTicketId].lines;
    const existingKg = lines[key] ? lines[key].qty : 0;
    lines[key] = {
      qty: round2(existingKg + kg),
      unitPrice: precioPorKg,
      unitLabel: "kg",
      modeLabel: "Por Kilo",
      preparacion,
      product,
      category,
      mode: "kilo",
    };
  }

  /**
   * Reparte la cantidad total (en kg) de una línea ya agregada entre varios
   * tickets (existentes y/o uno nuevo). `allocations` es un array de
   * { targetId, kg } para tickets existentes; `newTicket` es opcional
   * { name, kg } para crear uno al vuelo.
   */
  function applySplit(sourceTicketId, lineKey, allocations, newTicket) {
    const entry = tickets[sourceTicketId].lines[lineKey];
    if (!entry) return;
    const precioPorKg = entry.unitLabel === "kg" ? entry.unitPrice : entry.product.venta[entry.mode].precioPorKg;

    delete tickets[sourceTicketId].lines[lineKey];

    allocations.forEach(({ targetId, kg }) => {
      if (kg > 0) mergeKgIntoTicket(targetId, entry.product, entry.category, entry.preparacion, kg, precioPorKg);
    });
    if (newTicket && newTicket.kg > 0) {
      const newId = createTicket(newTicket.name);
      mergeKgIntoTicket(newId, entry.product, entry.category, entry.preparacion, newTicket.kg, precioPorKg);
    }

    updateUI();
  }

  // ---- Lectura de líneas / totales ---------------------------------------

  function getTicketEntries(ticketId) {
    return Object.entries(tickets[ticketId].lines)
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => a.product.name.localeCompare(b.product.name));
  }

  function getTicketTotal(ticketId) {
    return getTicketEntries(ticketId).reduce((sum, e) => sum + e.qty * e.unitPrice, 0);
  }

  function getAllEntries() {
    return ticketOrder.flatMap((id) => getTicketEntries(id));
  }

  function getTotalKg() {
    return getAllEntries().reduce((sum, e) => sum + kgOf(e), 0);
  }

  function getGrandSubtotal() {
    return ticketOrder.reduce((sum, id) => sum + getTicketTotal(id), 0);
  }

  function isBelowMinimum() {
    return getAllEntries().length > 0 && getTotalKg() < CONFIG.ventaMinimaKg;
  }

  /** Costo de envío según el barrio elegido — 0 si no aplica (llega al mínimo) o si es "Otro" (se coordina). */
  function getShippingCost() {
    if (!isBelowMinimum()) return 0;
    if (!shipping.choice || shipping.choice === OTRO_BARRIO) return 0;
    const barrio = (CONFIG.barrios || []).find((b) => b.nombre === shipping.choice);
    return barrio ? barrio.costoEnvio : 0;
  }

  function getGrandTotal() {
    return getGrandSubtotal() + getShippingCost();
  }

  /** "3 kg" o "2 unidades" según el modo de venta de la línea. */
  function qtyLabel(entry) {
    if (entry.unitLabel === "kg") return `${entry.qty} kg`;
    return `${entry.qty} ${entry.qty === 1 ? "unidad" : "unidades"}`;
  }

  /**
   * "Vacío (Por Unidad, Cortado a 3 dedos)" — solo agrega lo que realmente
   * hay para aclarar. Una línea "Por Kilo" que viene de dividir/fusionar un
   * producto que también se vende por unidad muestra igual la etiqueta
   * "Por Kilo", para dejar claro que ya no es la pieza entera.
   */
  function lineName(entry) {
    const tags = [];
    const modes = Pricing.getSaleModes(entry.product);
    const showMode = modes.length > 1 || (entry.product.venta?.unidad && entry.mode === "kilo");
    if (showMode) tags.push(entry.modeLabel);
    if (Preparation.hasChoice(entry.product)) tags.push(entry.preparacion);
    return tags.length ? `${entry.product.name} (${tags.join(", ")})` : entry.product.name;
  }

  /**
   * Suma/resta cantidad de un producto en un modo de venta ('kilo' | 'unidad') y una
   * preparación puntual, sobre el TICKET ACTIVO, y devuelve la cantidad resultante.
   */
  function changeQty(catKey, item, mode, delta, preparacion) {
    const modeInfo = Pricing.getMode(item, mode);
    if (!modeInfo) return 0;

    const prep = preparacion || Preparation.DEFAULT_OPTION;
    const key = `${catKey}|${item.name}|${mode}|${prep}`;
    const lines = tickets[activeTicketId].lines;
    const current = lines[key]?.qty || 0;
    const next = Math.max(0, current + delta);

    if (next <= 0) {
      delete lines[key];
    } else {
      lines[key] = {
        qty: next,
        unitPrice: modeInfo.unitPrice,
        unitLabel: modeInfo.unitLabel,
        modeLabel: modeInfo.aliasName || modeInfo.label,
        preparacion: prep,
        product: item,
        category: catKey,
        mode,
      };
    }
    updateUI();
    return next;
  }

  // ---- Render -------------------------------------------------------------

  function updateUI() {
    renderTicketsList();
    renderMinWarningAndShipping();
    renderActiveTicketItems();
    renderTicketTotalRow();
    renderGrandTotal();
    updateBarChip();
    updateWhatsAppLink();
  }

  function updateBarChip() {
    const totalQty = getAllEntries().reduce((s, e) => s + e.qty, 0);
    els.cartCount.textContent = round2(totalQty);
    els.cartTotal.textContent = money(getGrandTotal());
    const visible = totalQty > 0;
    els.cartBar.classList.toggle("visible", visible);
    if (onVisibilityChange) onVisibilityChange(visible);
  }

  /** Chips de "Mis pedidos" — solo se muestran si hay más de un ticket. */
  function renderTicketsList() {
    if (ticketOrder.length <= 1) {
      els.cartTicketsList.innerHTML = "";
      els.cartTicketsList.classList.add("hidden");
      return;
    }
    els.cartTicketsList.classList.remove("hidden");
    els.cartTicketsList.innerHTML = ticketOrder
      .map((id) => {
        const t = tickets[id];
        const isActive = id === activeTicketId;
        return `
          <div class="cart-ticket-chip${isActive ? " cart-ticket-chip--active" : ""}" data-ticket-id="${id}">
            <input type="text" class="cart-ticket-name-input" value="${t.name}" data-ticket-id="${id}">
            <span class="cart-ticket-subtotal">${money(getTicketTotal(id))}</span>
            <button type="button" class="cart-ticket-delete" data-ticket-id="${id}" aria-label="Borrar pedido">&times;</button>
          </div>
        `;
      })
      .join("");

    els.cartTicketsList.querySelectorAll(".cart-ticket-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        if (e.target.closest(".cart-ticket-name-input") || e.target.closest(".cart-ticket-delete")) return;
        activeTicketId = chip.dataset.ticketId;
        updateUI();
      });
    });
    els.cartTicketsList.querySelectorAll(".cart-ticket-name-input").forEach((input) => {
      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("input", (e) => {
        tickets[e.target.dataset.ticketId].name = e.target.value;
        updateWhatsAppLink();
      });
    });
    els.cartTicketsList.querySelectorAll(".cart-ticket-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.ticketId;
        if (confirm(`¿Borrar "${tickets[id].name}"? Lo que tenía se suma al pedido anterior.`)) {
          deleteTicket(id);
        }
      });
    });
  }

  /** Aviso temprano de "faltan X kg" + selector de barrio cuando corresponde. */
  function renderMinWarningAndShipping() {
    if (!isBelowMinimum()) {
      els.cartMinWarning.classList.add("hidden");
      els.cartShipping.classList.add("hidden");
      return;
    }
    const falta = round2(CONFIG.ventaMinimaKg - getTotalKg());
    els.cartMinWarning.classList.remove("hidden");
    els.cartMinWarning.textContent = `Te faltan ${falta} kg para no pagar envío.`;
    els.cartShipping.classList.remove("hidden");
  }

  function renderActiveTicketItems() {
    const entries = getTicketEntries(activeTicketId);
    if (entries.length === 0) {
      const label = ticketOrder.length > 1 ? ` a "${tickets[activeTicketId].name}"` : "";
      els.cartItems.innerHTML = `<p class="cart-empty">Todavía no agregaste productos${label}.</p>`;
      return;
    }
    els.cartItems.innerHTML = entries
      .map(
        (e) => `
      <div class="cart-item-row">
        <div>
          <p class="cart-item-name">${lineName(e)}</p>
          <p class="cart-item-sub">${qtyLabel(e)} × ${money(e.unitPrice)}</p>
        </div>
        <div class="cart-item-right">
          <strong>${money(e.qty * e.unitPrice)}</strong>
          <button type="button" class="cart-item-split-btn" data-line-key="${e.key}">Dividir</button>
        </div>
      </div>
    `
      )
      .join("");

    els.cartItems.querySelectorAll(".cart-item-split-btn").forEach((btn) => {
      btn.addEventListener("click", () => openSplitModal(activeTicketId, btn.dataset.lineKey));
    });
  }

  /** Subtotal del ticket activo — solo tiene sentido mostrarlo si hay más de uno. */
  function renderTicketTotalRow() {
    const show = ticketOrder.length > 1;
    els.cartTicketTotalRow.classList.toggle("hidden", !show);
    if (show) {
      els.cartTicketTotalLabel.textContent = `Subtotal — ${tickets[activeTicketId].name}`;
      els.modalTotal.textContent = money(getTicketTotal(activeTicketId));
    }
  }

  function renderGrandTotal() {
    els.cartGrandTotal.textContent = money(getGrandTotal());
  }

  function buildShippingLine() {
    if (!isBelowMinimum()) return null;
    if (!shipping.choice) return null;
    if (shipping.choice === OTRO_BARRIO) {
      return `Envío: a coordinar (barrio: ${shipping.otro.trim() || "no especificado"})`;
    }
    const barrio = (CONFIG.barrios || []).find((b) => b.nombre === shipping.choice);
    const cost = barrio ? barrio.costoEnvio : 0;
    return `Envío (${shipping.choice}): ${cost > 0 ? money(cost) : "Gratis"}`;
  }

  function updateWhatsAppLink() {
    const nonEmptyTickets = ticketOrder.filter((id) => getTicketEntries(id).length > 0);
    const multiTicket = nonEmptyTickets.length > 1;

    const sections = nonEmptyTickets.map((id) => {
      const lines = getTicketEntries(id).map((e) => `• ${lineName(e)} — ${qtyLabel(e)} (${money(e.qty * e.unitPrice)})`);
      return multiTicket ? [`📦 ${tickets[id].name}`, ...lines].join("\n") : lines.join("\n");
    });

    const shippingLine = buildShippingLine();
    const name = els.customerName.value.trim();
    const address = els.customerAddress.value.trim();
    const bell = els.customerBell.value.trim();

    const parts = ["¡Hola Rosita! 👋 Quiero hacer este pedido:", "", sections.join("\n\n")];
    if (shippingLine) parts.push("", shippingLine);
    parts.push(
      "",
      `Total a pagar: ${money(getGrandTotal())}`,
      "",
      `Nombre: ${name || "-"}`,
      `Dirección: ${address || "-"}${bell ? ` (Timbre: ${bell})` : ""}`
    );

    const encoded = encodeURIComponent(parts.join("\n"));
    els.whatsappBtn.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encoded}`;
  }

  // ---- Validación antes de enviar -----------------------------------------

  function setFieldError(fieldEl, hasError) {
    fieldEl.classList.toggle("cart-field--invalid", hasError);
    fieldEl.querySelector(".cart-input")?.classList.toggle("cart-input--error", hasError);
  }

  function validateCustomerFields() {
    const nameOk = els.customerName.value.trim().length > 0;
    const addressOk = els.customerAddress.value.trim().length > 0;

    setFieldError(els.nameField, !nameOk);
    setFieldError(els.addressField, !addressOk);

    if (!nameOk) els.customerName.focus();
    else if (!addressOk) els.customerAddress.focus();

    return nameOk && addressOk;
  }

  /** Si el pedido no llega al mínimo, exige que se haya elegido un barrio (y el texto libre si es "Otro"). */
  function validateShipping() {
    if (!isBelowMinimum()) return true;

    if (!shipping.choice) {
      els.shippingBarrio.classList.add("cart-input--error");
      els.shippingBarrio.focus();
      return false;
    }
    if (shipping.choice === OTRO_BARRIO && !shipping.otro.trim()) {
      els.shippingOtroInput.classList.add("cart-input--error");
      els.shippingOtroInput.focus();
      return false;
    }
    return true;
  }

  // ---- Modal de "Dividir en varios pedidos" -------------------------------

  function openSplitModal(sourceTicketId, lineKey) {
    const entry = tickets[sourceTicketId].lines[lineKey];
    if (!entry) return;
    const totalKg = round2(kgOf(entry));

    const overlay = document.createElement("div");
    overlay.className = "cart-split-overlay";

    const rowsHtml = ticketOrder
      .map(
        (id) => `
        <div class="cart-split-row" data-ticket-id="${id}">
          <span class="cart-split-row-name">${tickets[id].name}</span>
          <input type="number" class="cart-split-input" min="0" step="0.1" value="${id === sourceTicketId ? totalKg : 0}">
        </div>
      `
      )
      .join("");

    const modal = document.createElement("div");
    modal.className = "cart-split-modal";
    modal.innerHTML = `
      <p class="cart-split-title">Dividir "${lineName(entry)}"</p>
      <p class="cart-split-total">Total a repartir: ${totalKg} kg</p>
      <div class="cart-split-rows">${rowsHtml}</div>
      <button type="button" class="cart-split-add-new">+ Repartir a un pedido nuevo</button>
      <div class="cart-split-new-row hidden">
        <input type="text" class="cart-split-new-name" placeholder="Nombre del pedido nuevo">
        <input type="number" class="cart-split-input cart-split-new-kg" min="0" step="0.1" value="0">
      </div>
      <p class="cart-split-progress"></p>
      <div class="cart-split-actions">
        <button type="button" class="cart-split-cancel">Cancelar</button>
        <button type="button" class="cart-split-confirm" disabled>Confirmar</button>
      </div>
    `;

    const getInputs = () => [...modal.querySelectorAll(".cart-split-input")];
    const newRowEl = modal.querySelector(".cart-split-new-row");
    const addNewBtn = modal.querySelector(".cart-split-add-new");
    const progressEl = modal.querySelector(".cart-split-progress");
    const confirmBtn = modal.querySelector(".cart-split-confirm");

    function updateProgress() {
      const sum = round2(getInputs().reduce((s, i) => s + (parseFloat(i.value) || 0), 0));
      const ok = Math.abs(sum - totalKg) < 0.01;
      progressEl.textContent = `Repartido: ${sum} / ${totalKg} kg`;
      progressEl.classList.toggle("cart-split-progress--error", !ok);
      confirmBtn.disabled = !ok;
    }

    getInputs().forEach((input) => input.addEventListener("input", updateProgress));

    addNewBtn.addEventListener("click", () => {
      newRowEl.classList.remove("hidden");
      addNewBtn.classList.add("hidden");
      updateProgress();
    });

    modal.querySelector(".cart-split-cancel").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    confirmBtn.addEventListener("click", () => {
      const allocations = ticketOrder.map((id) => ({
        targetId: id,
        kg: parseFloat(modal.querySelector(`.cart-split-row[data-ticket-id="${id}"] .cart-split-input`).value) || 0,
      }));
      const newKg = parseFloat(modal.querySelector(".cart-split-new-kg").value) || 0;
      const newName = modal.querySelector(".cart-split-new-name").value.trim();

      applySplit(sourceTicketId, lineKey, allocations, newKg > 0 ? { name: newName, kg: newKg } : null);
      overlay.remove();
    });

    updateProgress();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ---- DOM ------------------------------------------------------------------

  /** Crea el DOM del carrito (barra y modal) y lo agrega al body. */
  function buildDOM() {
    const cartBar = document.createElement("div");
    cartBar.id = "cartBar";
    cartBar.className = "cart-bar";
    cartBar.innerHTML = `
      <div class="cart-bar-inner">
        <div class="cart-summary">
          <span id="cartCount">0</span> productos ·
          <strong id="cartTotal">$0</strong>
        </div>
        <button id="openCart" class="cart-btn-primary">Ver pedido</button>
      </div>
    `;

    const barrioOptions = (CONFIG.barrios || [])
      .map(
        (b) =>
          `<option value="${b.nombre}">${b.nombre}${b.costoEnvio > 0 ? ` (+${money(b.costoEnvio)} de envío)` : " (envío gratis)"}</option>`
      )
      .join("");

    const cartModal = document.createElement("div");
    cartModal.id = "cartModal";
    cartModal.className = "cart-modal hidden";
    cartModal.innerHTML = `
      <div class="cart-modal-content">
        <button id="closeCart" class="cart-close-btn" aria-label="Cerrar">&times;</button>
        <h2>Tu pedido</h2>

        <div class="cart-tickets">
          <div id="cartTicketsList" class="cart-tickets-list hidden"></div>
          <button type="button" id="newTicketBtn" class="cart-new-ticket-btn">+ Nuevo pedido</button>
        </div>

        <p id="cartMinWarning" class="cart-min-warning hidden"></p>

        <div id="cartItems" class="cart-items"></div>

        <div id="cartTicketTotalRow" class="cart-total-row hidden">
          <span id="cartTicketTotalLabel">Subtotal</span>
          <strong id="modalTotal">$0</strong>
        </div>

        <div id="cartShipping" class="cart-shipping hidden">
          <label class="cart-field">
            <span>¿De qué barrio sos?</span>
            <select id="shippingBarrio" class="cart-input">
              <option value="">Elegí un barrio…</option>
              ${barrioOptions}
              <option value="${OTRO_BARRIO}">Otro</option>
            </select>
          </label>
          <label class="cart-field hidden" id="shippingOtroField">
            <span>¿Cuál?</span>
            <input type="text" id="shippingOtroInput" class="cart-input" placeholder="Tu barrio">
          </label>
        </div>

        <div class="cart-grand-total-row">
          <span>Total a pagar</span>
          <strong id="cartGrandTotal">$0</strong>
        </div>

        <p class="cart-disclaimer">* Precios y pesos aproximados. El total final puede variar según el peso real de cada pieza.</p>
        <div class="cart-customer-fields">
          <label class="cart-field" id="nameField">
            <span>Nombre y apellido *</span>
            <input type="text" id="customerName" class="cart-input" placeholder="Tu nombre">
            <span class="cart-field-error">Falta tu nombre</span>
          </label>
          <label class="cart-field" id="addressField">
            <span>Dirección de entrega *</span>
            <input type="text" id="customerAddress" class="cart-input" placeholder="Calle, número, piso/depto">
            <span class="cart-field-error">Falta la dirección</span>
          </label>
          <label class="cart-field">
            <span>Timbre (si hace falta)</span>
            <input type="text" id="customerBell" class="cart-input" placeholder="Ej: 3B, portero eléctrico...">
          </label>
        </div>
        <a id="whatsappBtn" href="#" target="_blank" rel="noopener" class="cart-btn-whatsapp">
          ${WHATSAPP_ICON_SVG.replace("<svg ", '<svg width="20" height="20" ')}
          Enviar pedido por WhatsApp
        </a>
      </div>
    `;

    document.body.appendChild(cartBar);
    document.body.appendChild(cartModal);

    els = {
      cartBar,
      cartModal,
      cartCount: cartBar.querySelector("#cartCount"),
      cartTotal: cartBar.querySelector("#cartTotal"),
      cartTicketsList: cartModal.querySelector("#cartTicketsList"),
      newTicketBtn: cartModal.querySelector("#newTicketBtn"),
      cartMinWarning: cartModal.querySelector("#cartMinWarning"),
      cartItems: cartModal.querySelector("#cartItems"),
      cartTicketTotalRow: cartModal.querySelector("#cartTicketTotalRow"),
      cartTicketTotalLabel: cartModal.querySelector("#cartTicketTotalLabel"),
      modalTotal: cartModal.querySelector("#modalTotal"),
      cartShipping: cartModal.querySelector("#cartShipping"),
      shippingBarrio: cartModal.querySelector("#shippingBarrio"),
      shippingOtroField: cartModal.querySelector("#shippingOtroField"),
      shippingOtroInput: cartModal.querySelector("#shippingOtroInput"),
      cartGrandTotal: cartModal.querySelector("#cartGrandTotal"),
      whatsappBtn: cartModal.querySelector("#whatsappBtn"),
      nameField: cartModal.querySelector("#nameField"),
      addressField: cartModal.querySelector("#addressField"),
      customerName: cartModal.querySelector("#customerName"),
      customerAddress: cartModal.querySelector("#customerAddress"),
      customerBell: cartModal.querySelector("#customerBell"),
    };

    cartBar.querySelector("#openCart").addEventListener("click", () => {
      cartModal.classList.remove("hidden");
    });
    cartModal.querySelector("#closeCart").addEventListener("click", () => {
      cartModal.classList.add("hidden");
    });
    cartModal.addEventListener("click", (e) => {
      if (e.target === cartModal) cartModal.classList.add("hidden");
    });

    els.newTicketBtn.addEventListener("click", () => {
      activeTicketId = createTicket();
      updateUI();
    });

    els.shippingBarrio.addEventListener("change", () => {
      shipping.choice = els.shippingBarrio.value || null;
      els.shippingOtroField.classList.toggle("hidden", shipping.choice !== OTRO_BARRIO);
      els.shippingBarrio.classList.remove("cart-input--error");
      renderGrandTotal();
      updateWhatsAppLink();
    });
    els.shippingOtroInput.addEventListener("input", () => {
      shipping.otro = els.shippingOtroInput.value;
      els.shippingOtroInput.classList.remove("cart-input--error");
      updateWhatsAppLink();
    });

    // El mensaje de WhatsApp incluye nombre/dirección/timbre, así que se
    // reconstruye en vivo a medida que se escriben (sin tocar el estado del
    // carrito, por eso no pasa por changeQty/updateUI acá).
    [els.customerName, els.customerAddress, els.customerBell].forEach((input) => {
      input.addEventListener("input", updateWhatsAppLink);
    });
    els.customerName.addEventListener("input", () => setFieldError(els.nameField, false));
    els.customerAddress.addEventListener("input", () => setFieldError(els.addressField, false));

    // No deja abrir WhatsApp si falta nombre/dirección, o si falta elegir barrio cuando corresponde.
    els.whatsappBtn.addEventListener("click", (e) => {
      const customerOk = validateCustomerFields();
      const shippingOk = validateShipping();
      if (!customerOk || !shippingOk) e.preventDefault();
    });
  }

  /**
   * Monta el carrito en la página.
   * @param {{whatsappNumber: string, ventaMinimaKg: number, barrios?: Array<{nombre: string, costoEnvio: number}>}} config
   * @param {object} [options]
   * @param {(visible: boolean) => void} [options.onVisibilityChange] - se llama cuando el carrito pasa de vacío a con items (o viceversa)
   */
  function init(config, options = {}) {
    CONFIG = config;
    onVisibilityChange = options.onVisibilityChange || null;
    activeTicketId = createTicket();
    buildDOM();
    updateUI();
  }

  return {
    init,
    increment: (catKey, item, mode, preparacion) => changeQty(catKey, item, mode, 1, preparacion),
    decrement: (catKey, item, mode, preparacion) => changeQty(catKey, item, mode, -1, preparacion),
  };
})();
