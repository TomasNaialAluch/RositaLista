// Componente de carrito: estado del pedido, barra flotante, botón flotante
// de WhatsApp y modal de detalle con el mensaje final. Autocontenido igual
// que cards.js y nav.js — crea su propio DOM e inyecta su propio <style>,
// no depende de markup ni reglas puestas en index.html/styles.css.
//
// No sabe nada de cómo se dibuja una card: solo expone Cart.increment /
// Cart.decrement (mismas firmas que esperan los handlers de Cards) y
// Cart.init() para montarse en la página.

const Cart = (function () {
  const STYLE_ID = "rcart-styles";

  const CSS = `
    .cart-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--rosita-pink-dark);
      color: #fff;
      padding: 12px 16px;
      transform: translateY(100%);
      transition: transform 0.25s ease;
      z-index: 20;
      box-shadow: 0 -4px 14px rgba(0,0,0,0.15);
    }

    .cart-bar.visible {
      transform: translateY(0);
    }

    .cart-bar-inner {
      max-width: 780px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .cart-summary {
      font-size: 0.95rem;
    }

    .cart-summary strong {
      font-size: 1.1rem;
    }

    .cart-btn-primary {
      background: #fff;
      color: var(--rosita-pink-dark);
      border: none;
      padding: 10px 20px;
      border-radius: 30px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.92rem;
    }

    .cart-modal {
      position: fixed;
      inset: 0;
      background: rgba(43, 34, 36, 0.55);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 50;
    }

    .cart-modal.hidden {
      display: none;
    }

    .cart-modal-content {
      background: #fff;
      width: 100%;
      max-width: 600px;
      border-radius: 20px 20px 0 0;
      padding: 24px 20px 20px;
      max-height: 85vh;
      overflow-y: auto;
      position: relative;
    }

    @media (min-width: 640px) {
      .cart-modal {
        align-items: center;
      }
      .cart-modal-content {
        border-radius: 20px;
      }
    }

    .cart-close-btn {
      position: absolute;
      top: 14px;
      right: 16px;
      background: none;
      border: none;
      font-size: 1.6rem;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
    }

    .cart-modal-content h2 {
      color: var(--rosita-pink-dark);
      margin: 0 0 16px;
    }

    .cart-items {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .cart-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }

    .cart-item-name {
      font-weight: 600;
      font-size: 0.92rem;
    }

    .cart-item-sub {
      color: var(--text-muted);
      font-size: 0.78rem;
    }

    .cart-empty {
      color: var(--text-muted);
      text-align: center;
      padding: 20px 0;
    }

    .cart-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 1.15rem;
      padding: 12px 0;
      border-top: 2px solid var(--rosita-pink-light);
      color: var(--rosita-pink-dark);
    }

    .cart-disclaimer {
      color: var(--text-muted);
      font-size: 0.78rem;
      margin: 4px 0 16px;
    }

    .cart-customer-fields {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 4px 0 16px;
    }

    .cart-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .cart-input {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 0.92rem;
      color: var(--text);
      background: #fff;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .cart-input:focus {
      border-color: var(--rosita-pink);
    }

    .cart-input--error {
      border-color: #d9534f;
    }

    .cart-field-error {
      color: #d9534f;
      font-size: 0.72rem;
      font-weight: 500;
      display: none;
    }

    .cart-field--invalid .cart-field-error {
      display: block;
    }

    .cart-btn-whatsapp {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--whatsapp);
      color: #fff;
      text-decoration: none;
      font-weight: 700;
      padding: 13px;
      border-radius: 30px;
      font-size: 0.98rem;
      transition: background 0.15s ease;
    }

    .cart-btn-whatsapp:hover {
      background: var(--whatsapp-dark);
    }

    .cart-floating-whatsapp {
      position: fixed;
      bottom: 90px;
      right: 18px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--whatsapp);
      color: #fff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      cursor: pointer;
      z-index: 15;
      transition: bottom 0.25s ease;
    }

    .cart-bar.visible ~ .cart-floating-whatsapp {
      bottom: 162px;
    }

    .cart-floating-whatsapp:hover {
      background: var(--whatsapp-dark);
    }
  `;

  const WHATSAPP_ICON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.876.516 3.632 1.412 5.13L2 22l4.995-1.379A9.947 9.947 0 0 0 12.001 22C17.524 22 22 17.523 22 12S17.524 2 12.001 2zm0 18.06a8.03 8.03 0 0 1-4.099-1.122l-.294-.175-3.04.84.821-2.965-.192-.304A8.03 8.03 0 0 1 3.94 12c0-4.444 3.617-8.06 8.061-8.06 4.444 0 8.06 3.616 8.06 8.06 0 4.444-3.616 8.06-8.06 8.06z"/></svg>`;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const money = Pricing.money;

  const cart = {}; // key: "category|name|modo|preparacion" -> { qty, unitPrice, unitLabel, modeLabel, preparacion, product, category, mode }
  let WHATSAPP_NUMBER = "";
  let onVisibilityChange = null;

  let els = {}; // referencias a los elementos creados por buildDOM()

  function getCartEntries() {
    return Object.values(cart).sort((a, b) => a.product.name.localeCompare(b.product.name));
  }

  function getTotal() {
    return getCartEntries().reduce((sum, e) => sum + e.qty * e.unitPrice, 0);
  }

  /** "3 kg" o "2 unidades" según el modo de venta de la línea del carrito. */
  function qtyLabel(entry) {
    if (entry.unitLabel === "kg") return `${entry.qty} kg`;
    return `${entry.qty} ${entry.qty === 1 ? "unidad" : "unidades"}`;
  }

  /** "Vacío (Por Unidad, Cortado a 3 dedos)" — solo agrega lo que realmente hay para aclarar. */
  function lineName(entry) {
    const tags = [];
    if (Pricing.getSaleModes(entry.product).length > 1) tags.push(entry.modeLabel);
    if (Preparation.hasChoice(entry.product)) tags.push(entry.preparacion);
    return tags.length ? `${entry.product.name} (${tags.join(", ")})` : entry.product.name;
  }

  /**
   * Suma/resta cantidad de un producto en un modo de venta ('kilo' | 'unidad') y una
   * preparación puntual, y devuelve la cantidad resultante de esa combinación exacta.
   *
   * La preparación es parte de la identidad de la línea (junto con el modo): así
   * "Peceto · unidad · Entera" y "Peceto · unidad · Para milanesa" son dos líneas
   * independientes, cada una con su propia cantidad, en vez de una sola línea por modo.
   */
  function changeQty(catKey, item, mode, delta, preparacion) {
    const modeInfo = Pricing.getMode(item, mode);
    if (!modeInfo) return 0;

    const prep = preparacion || Preparation.DEFAULT_OPTION;
    const key = `${catKey}|${item.name}|${mode}|${prep}`;
    const current = cart[key]?.qty || 0;
    const next = Math.max(0, current + delta);

    if (next <= 0) {
      delete cart[key];
    } else {
      cart[key] = {
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

  function updateUI() {
    const entries = getCartEntries();
    const totalQty = entries.reduce((s, e) => s + e.qty, 0);
    const total = getTotal();

    els.cartCount.textContent = totalQty;
    els.cartTotal.textContent = money(total);
    els.modalTotal.textContent = money(total);

    const visible = totalQty > 0;
    els.cartBar.classList.toggle("visible", visible);
    if (onVisibilityChange) onVisibilityChange(visible);

    renderCartModal(entries, total);
  }

  function renderCartModal(entries, total) {
    if (entries.length === 0) {
      els.cartItems.innerHTML = `<p class="cart-empty">Todavía no agregaste productos.</p>`;
    } else {
      els.cartItems.innerHTML = entries
        .map(
          (e) => `
        <div class="cart-item-row">
          <div>
            <p class="cart-item-name">${lineName(e)}</p>
            <p class="cart-item-sub">${qtyLabel(e)} × ${money(e.unitPrice)}</p>
          </div>
          <strong>${money(e.qty * e.unitPrice)}</strong>
        </div>
      `
        )
        .join("");
    }

    const lines = entries.map((e) => `• ${lineName(e)} — ${qtyLabel(e)} (${money(e.qty * e.unitPrice)})`);
    const name = els.customerName.value.trim();
    const address = els.customerAddress.value.trim();
    const bell = els.customerBell.value.trim();

    const message = [
      "¡Hola Rosita! 👋 Quiero hacer este pedido:",
      "",
      ...lines,
      "",
      `Total estimado: ${money(total)}`,
      "",
      `Nombre: ${name || "-"}`,
      `Dirección: ${address || "-"}${bell ? ` (Timbre: ${bell})` : ""}`,
    ].join("\n");

    const encoded = encodeURIComponent(message);
    els.whatsappBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  }

  /** Marca (o limpia) el estado de error visual de un campo obligatorio. */
  function setFieldError(fieldEl, hasError) {
    fieldEl.classList.toggle("cart-field--invalid", hasError);
    fieldEl.querySelector(".cart-input").classList.toggle("cart-input--error", hasError);
  }

  /**
   * Valida que nombre y dirección estén completos antes de dejar enviar el
   * pedido. Devuelve true si está todo OK; si falta algo, marca el/los
   * campo(s) en rojo y hace foco en el primero que falte.
   */
  function validateCustomerFields() {
    const nameOk = els.customerName.value.trim().length > 0;
    const addressOk = els.customerAddress.value.trim().length > 0;

    setFieldError(els.nameField, !nameOk);
    setFieldError(els.addressField, !addressOk);

    if (!nameOk) {
      els.customerName.focus();
    } else if (!addressOk) {
      els.customerAddress.focus();
    }

    return nameOk && addressOk;
  }

  /** Crea el DOM del carrito (barra, modal, botón flotante) y lo agrega al body. */
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

    const cartModal = document.createElement("div");
    cartModal.id = "cartModal";
    cartModal.className = "cart-modal hidden";
    cartModal.innerHTML = `
      <div class="cart-modal-content">
        <button id="closeCart" class="cart-close-btn" aria-label="Cerrar">&times;</button>
        <h2>Tu pedido</h2>
        <div id="cartItems" class="cart-items"></div>
        <div class="cart-total-row">
          <span>Total estimado</span>
          <strong id="modalTotal">$0</strong>
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

    const floatingWhatsapp = document.createElement("button");
    floatingWhatsapp.id = "floatingWhatsapp";
    floatingWhatsapp.className = "cart-floating-whatsapp";
    floatingWhatsapp.setAttribute("aria-label", "Contactar por WhatsApp");
    floatingWhatsapp.innerHTML = WHATSAPP_ICON_SVG.replace("<svg ", '<svg width="28" height="28" ');

    document.body.appendChild(cartBar);
    document.body.appendChild(cartModal);
    document.body.appendChild(floatingWhatsapp);

    els = {
      cartBar,
      cartModal,
      floatingWhatsapp,
      cartCount: cartBar.querySelector("#cartCount"),
      cartTotal: cartBar.querySelector("#cartTotal"),
      modalTotal: cartModal.querySelector("#modalTotal"),
      cartItems: cartModal.querySelector("#cartItems"),
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

    // El mensaje de WhatsApp incluye nombre/dirección/timbre, así que se
    // reconstruye en vivo a medida que se escriben (sin tocar el estado del
    // carrito, por eso no pasa por changeQty/updateUI acá).
    [els.customerName, els.customerAddress, els.customerBell].forEach((input) => {
      input.addEventListener("input", () => renderCartModal(getCartEntries(), getTotal()));
    });
    els.customerName.addEventListener("input", () => setFieldError(els.nameField, false));
    els.customerAddress.addEventListener("input", () => setFieldError(els.addressField, false));

    // No deja abrir WhatsApp si falta nombre o dirección.
    els.whatsappBtn.addEventListener("click", (e) => {
      if (!validateCustomerFields()) e.preventDefault();
    });

    // Botón flotante -> contacto general si el carrito está vacío, si no abre el carrito.
    floatingWhatsapp.addEventListener("click", () => {
      if (getCartEntries().length === 0) {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank", "noopener");
      } else {
        cartModal.classList.remove("hidden");
      }
    });
  }

  /**
   * Monta el carrito en la página.
   * @param {string} whatsappNumber
   * @param {object} [options]
   * @param {(visible: boolean) => void} [options.onVisibilityChange] - se llama cuando el carrito pasa de vacío a con items (o viceversa)
   */
  function init(whatsappNumber, options = {}) {
    WHATSAPP_NUMBER = whatsappNumber;
    onVisibilityChange = options.onVisibilityChange || null;
    injectStyles();
    buildDOM();
    updateUI();
  }

  return {
    init,
    increment: (catKey, item, mode, preparacion) => changeQty(catKey, item, mode, 1, preparacion),
    decrement: (catKey, item, mode, preparacion) => changeQty(catKey, item, mode, -1, preparacion),
  };
})();
