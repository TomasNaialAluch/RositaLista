// Componente de carrito: arma el DOM (barra flotante y modal) y lo
// mantiene sincronizado con el estado. No mantiene estado propio — todo
// vive en CartState (js/components/cart/cartState.js), este archivo solo
// lee/escribe ahí y vuelve a pintar. El modal de "Dividir" vive en
// splitModal.js, y el gesto de deslizar-para-cerrar en swipeToClose.js —
// se dividió así porque cart.js se había vuelto gigante manejando todo a
// la vez (estado + UI de tickets + modal de dividir + gesto de cierre).
//
// No sabe nada de cómo se dibuja una card: solo expone Cart.increment /
// Cart.decrement (mismas firmas que esperan los handlers de Cards) y
// Cart.init() para montarse en la página.
//
// TICKETS — ver rediseno-tickets-pedido.md para la spec completa.

const Cart = (function () {
  const WHATSAPP_ICON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.876.516 3.632 1.412 5.13L2 22l4.995-1.379A9.947 9.947 0 0 0 12.001 22C17.524 22 22 17.523 22 12S17.524 2 12.001 2zm0 18.06a8.03 8.03 0 0 1-4.099-1.122l-.294-.175-3.04.84.821-2.965-.192-.304A8.03 8.03 0 0 1 3.94 12c0-4.444 3.617-8.06 8.061-8.06 4.444 0 8.06 3.616 8.06 8.06 0 4.444-3.616 8.06-8.06 8.06z"/></svg>`;

  // Mismo estilo minimalista de línea (stroke, currentColor) que el resto de
  // los íconos de la página (ver js/components/icons.js, category-chevron).
  const EDIT_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15.5 4.5l4 4L7 21H3v-4z"/>
  </svg>`;

  const money = Pricing.money;
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  let onVisibilityChange = null;
  let els = {}; // referencias a los elementos creados por buildDOM()
  let editingTicketId = null; // qué chip de "Mis pedidos" está en modo renombrar, si alguno

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  // ---- Render ---------------------------------------------------------------

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
    const totalQty = CartState.getAllEntries().reduce((s, e) => s + e.qty, 0);
    els.cartCount.textContent = round2(totalQty);
    els.cartTotal.textContent = money(CartState.getGrandTotal());
    const visible = totalQty > 0;
    els.cartBar.classList.toggle("visible", visible);
    if (onVisibilityChange) onVisibilityChange(visible);
  }

  /**
   * Chips de "Mis pedidos" — solo se muestran si hay más de un ticket.
   * Tocar el chip cambia de pedido (área grande, todo el chip); el nombre
   * se ve como texto normal y solo se puede escribir después de tocar el
   * lápiz — separado a propósito de "cambiar de pedido" y de "borrar" para
   * que no haya que acertarle a un margen milimétrico entre el input de
   * nombre y la cruz de borrar.
   */
  function renderTicketsList() {
    const ticketOrder = CartState.getTicketOrder();
    if (ticketOrder.length <= 1) {
      els.cartTicketsList.innerHTML = "";
      els.cartTicketsList.classList.add("hidden");
      editingTicketId = null;
      return;
    }
    const activeTicketId = CartState.getActiveTicketId();
    els.cartTicketsList.classList.remove("hidden");
    els.cartTicketsList.innerHTML = ticketOrder
      .map((id) => {
        const t = CartState.getTicket(id);
        const isActive = id === activeTicketId;
        const nameHtml =
          id === editingTicketId
            ? `<input type="text" class="cart-ticket-name-input" value="${escapeHtml(t.name)}" data-ticket-id="${id}">`
            : `<span class="cart-ticket-name">${escapeHtml(t.name)}</span>`;
        return `
          <div class="cart-ticket-chip${isActive ? " cart-ticket-chip--active" : ""}" data-ticket-id="${id}">
            ${nameHtml}
            <span class="cart-ticket-subtotal">${money(CartState.getTicketTotal(id))}</span>
            <button type="button" class="cart-ticket-edit" data-ticket-id="${id}" aria-label="Renombrar pedido">${EDIT_ICON_SVG}</button>
            <button type="button" class="cart-ticket-delete" data-ticket-id="${id}" aria-label="Borrar pedido">&times;</button>
          </div>
        `;
      })
      .join("");

    els.cartTicketsList.querySelectorAll(".cart-ticket-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        if (
          e.target.closest(".cart-ticket-edit") ||
          e.target.closest(".cart-ticket-delete") ||
          e.target.closest(".cart-ticket-name-input")
        ) {
          return;
        }
        CartState.setActiveTicketId(chip.dataset.ticketId);
        updateUI();
      });
    });

    els.cartTicketsList.querySelectorAll(".cart-ticket-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        editingTicketId = btn.dataset.ticketId;
        renderTicketsList();
        const input = els.cartTicketsList.querySelector(`.cart-ticket-name-input[data-ticket-id="${editingTicketId}"]`);
        input?.focus();
        input?.select();
      });
    });

    els.cartTicketsList.querySelectorAll(".cart-ticket-name-input").forEach((input) => {
      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          input.blur();
        } else if (e.key === "Escape") {
          editingTicketId = null;
          renderTicketsList();
        }
      });
      input.addEventListener("blur", () => {
        CartState.renameTicket(input.dataset.ticketId, input.value.trim() || CartState.getTicket(input.dataset.ticketId).name);
        editingTicketId = null;
        updateUI();
      });
    });

    els.cartTicketsList.querySelectorAll(".cart-ticket-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.ticketId;
        if (confirm(`¿Borrar "${CartState.getTicket(id).name}"? Lo que tenía se suma al pedido anterior.`)) {
          CartState.deleteTicket(id);
          updateUI();
        }
      });
    });
  }

  /** Aviso temprano de "faltan X kg" + selector de barrio cuando corresponde. */
  function renderMinWarningAndShipping() {
    if (!CartState.isBelowMinimum()) {
      els.cartMinWarning.classList.add("hidden");
      els.cartShipping.classList.add("hidden");
      return;
    }
    const falta = round2(CartState.getConfig().ventaMinimaKg - CartState.getTotalKg());
    els.cartMinWarning.classList.remove("hidden");
    els.cartMinWarning.textContent = `Te faltan ${falta} kg para no pagar envío.`;
    els.cartShipping.classList.remove("hidden");
  }

  function renderActiveTicketItems() {
    const activeTicketId = CartState.getActiveTicketId();
    const entries = CartState.getTicketEntries(activeTicketId);
    if (entries.length === 0) {
      const label = CartState.getTicketOrder().length > 1 ? ` a "${CartState.getTicket(activeTicketId).name}"` : "";
      els.cartItems.innerHTML = `<p class="cart-empty">Todavía no agregaste productos${label}.</p>`;
      return;
    }
    els.cartItems.innerHTML = entries
      .map(
        (e) => `
      <div class="cart-item-row">
        <div>
          <p class="cart-item-name">${CartState.lineName(e)}</p>
          <p class="cart-item-sub">${CartState.qtyLabel(e)} × ${money(e.unitPrice)}</p>
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
      btn.addEventListener("click", () => SplitModal.open(activeTicketId, btn.dataset.lineKey, updateUI));
    });
  }

  /** Subtotal del ticket activo — solo tiene sentido mostrarlo si hay más de uno. */
  function renderTicketTotalRow() {
    const ticketOrder = CartState.getTicketOrder();
    const show = ticketOrder.length > 1;
    els.cartTicketTotalRow.classList.toggle("hidden", !show);
    if (show) {
      const activeTicketId = CartState.getActiveTicketId();
      els.cartTicketTotalLabel.textContent = `Subtotal — ${CartState.getTicket(activeTicketId).name}`;
      els.modalTotal.textContent = money(CartState.getTicketTotal(activeTicketId));
    }
  }

  function renderGrandTotal() {
    els.cartGrandTotal.textContent = money(CartState.getGrandTotal());
  }

  function buildShippingLine() {
    if (!CartState.isBelowMinimum()) return null;
    const shipping = CartState.getShipping();
    if (!shipping.choice) return null;
    if (shipping.choice === CartState.OTRO_BARRIO) {
      return `Envío: a coordinar (barrio: ${shipping.otro.trim() || "no especificado"})`;
    }
    const barrio = (CartState.getConfig().barrios || []).find((b) => b.nombre === shipping.choice);
    const cost = barrio ? barrio.costoEnvio : 0;
    return `Envío (${shipping.choice}): ${cost > 0 ? money(cost) : "Gratis"}`;
  }

  function updateWhatsAppLink() {
    const ticketOrder = CartState.getTicketOrder();
    const nonEmptyTickets = ticketOrder.filter((id) => CartState.getTicketEntries(id).length > 0);
    const multiTicket = nonEmptyTickets.length > 1;

    const sections = nonEmptyTickets.map((id) => {
      const lines = CartState.getTicketEntries(id).map(
        (e) => `• ${CartState.lineName(e)} — ${CartState.qtyLabel(e)} (${money(e.qty * e.unitPrice)})`
      );
      return multiTicket ? [`📦 ${CartState.getTicket(id).name}`, ...lines].join("\n") : lines.join("\n");
    });

    const shippingLine = buildShippingLine();
    const name = els.customerName.value.trim();
    const address = els.customerAddress.value.trim();
    const bell = els.customerBell.value.trim();

    const parts = ["¡Hola Rosita! 👋 Quiero hacer este pedido:", "", sections.join("\n\n")];
    if (shippingLine) parts.push("", shippingLine);
    parts.push(
      "",
      `Total a pagar: ${money(CartState.getGrandTotal())}`,
      "",
      `Nombre: ${name || "-"}`,
      `Dirección: ${address || "-"}${bell ? ` (Timbre: ${bell})` : ""}`
    );

    const encoded = encodeURIComponent(parts.join("\n"));
    els.whatsappBtn.href = `https://wa.me/${CartState.getConfig().whatsappNumber}?text=${encoded}`;
  }

  // ---- Validación antes de enviar ---------------------------------------------

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
    if (!CartState.isBelowMinimum()) return true;
    const shipping = CartState.getShipping();

    if (!shipping.choice) {
      els.shippingBarrio.classList.add("cart-input--error");
      els.shippingBarrio.focus();
      return false;
    }
    if (shipping.choice === CartState.OTRO_BARRIO && !shipping.otro.trim()) {
      els.shippingOtroInput.classList.add("cart-input--error");
      els.shippingOtroInput.focus();
      return false;
    }
    return true;
  }

  // ---- DOM --------------------------------------------------------------------

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

    const barrioOptions = (CartState.getConfig().barrios || [])
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
        <div class="cart-modal-handle" aria-hidden="true"></div>
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
              <option value="${CartState.OTRO_BARRIO}">Otro</option>
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
    SwipeToClose.attach({
      overlay: cartModal,
      content: cartModal.querySelector(".cart-modal-content"),
      handle: cartModal.querySelector(".cart-modal-handle"),
    });

    els.newTicketBtn.addEventListener("click", () => {
      CartState.setActiveTicketId(CartState.createTicket());
      updateUI();
    });

    els.shippingBarrio.addEventListener("change", () => {
      CartState.setShippingChoice(els.shippingBarrio.value);
      els.shippingOtroField.classList.toggle("hidden", els.shippingBarrio.value !== CartState.OTRO_BARRIO);
      els.shippingBarrio.classList.remove("cart-input--error");
      renderGrandTotal();
      updateWhatsAppLink();
    });
    els.shippingOtroInput.addEventListener("input", () => {
      CartState.setShippingOtro(els.shippingOtroInput.value);
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
    onVisibilityChange = options.onVisibilityChange || null;
    CartState.init(config);
    buildDOM();
    updateUI();
  }

  return {
    init,
    increment: (catKey, item, mode, preparacion) => {
      const qty = CartState.changeQty(catKey, item, mode, 1, preparacion);
      updateUI();
      return qty;
    },
    decrement: (catKey, item, mode, preparacion) => {
      const qty = CartState.changeQty(catKey, item, mode, -1, preparacion);
      updateUI();
      return qty;
    },
  };
})();
