(function () {
  const cart = {}; // key: "category|name|modo" -> { qty, unitPrice, unitLabel, modeLabel, product, category, mode }
  let PRODUCTS = {};
  let WHATSAPP_NUMBER = "";

  let navEl = null;

  const catalogEl = document.getElementById("catalog");
  const cartBar = document.getElementById("cartBar");
  const cartCount = document.getElementById("cartCount");
  const cartTotal = document.getElementById("cartTotal");
  const cartModal = document.getElementById("cartModal");
  const cartItemsEl = document.getElementById("cartItems");
  const modalTotal = document.getElementById("modalTotal");
  const whatsappBtn = document.getElementById("whatsappBtn");

  const money = Cards.money;

  function renderCatalog() {
    catalogEl.innerHTML = "";
    Object.entries(PRODUCTS).forEach(([catKey, cat]) => {
      const section = Cards.createCategorySection(catKey, cat, {
        onIncrement: (catKey, item, mode) => changeQty(catKey, item, mode, 1),
        onDecrement: (catKey, item, mode) => changeQty(catKey, item, mode, -1),
      });
      catalogEl.appendChild(section);
    });
  }

  /** Suma/resta cantidad de un producto en un modo de venta ('kilo' | 'unidad') y devuelve la cantidad resultante. */
  function changeQty(catKey, item, mode, delta) {
    const modeInfo = Pricing.getMode(item, mode);
    if (!modeInfo) return 0;

    const key = `${catKey}|${item.name}|${mode}`;
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
        product: item,
        category: catKey,
        mode,
      };
    }
    updateCartUI();
    return next;
  }

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

  function updateCartUI() {
    const entries = getCartEntries();
    const totalQty = entries.reduce((s, e) => s + e.qty, 0);
    const total = getTotal();

    cartCount.textContent = totalQty;
    cartTotal.textContent = money(total);
    modalTotal.textContent = money(total);

    cartBar.classList.toggle("visible", totalQty > 0);
    if (navEl) Nav.setLifted(navEl, totalQty > 0);

    renderCartModal(entries, total);
  }

  function renderCartModal(entries, total) {
    if (entries.length === 0) {
      cartItemsEl.innerHTML = `<p class="cart-empty">Todavía no agregaste productos.</p>`;
    } else {
      cartItemsEl.innerHTML = entries
        .map((e) => {
          const hasMultipleModes = Pricing.getSaleModes(e.product).length > 1;
          const nameLine = hasMultipleModes ? `${e.product.name} (${e.modeLabel})` : e.product.name;
          return `
        <div class="cart-item-row">
          <div>
            <p class="cart-item-name">${nameLine}</p>
            <p class="cart-item-sub">${qtyLabel(e)} × ${money(e.unitPrice)}</p>
          </div>
          <strong>${money(e.qty * e.unitPrice)}</strong>
        </div>
      `;
        })
        .join("");
    }

    const lines = entries.map((e) => {
      const hasMultipleModes = Pricing.getSaleModes(e.product).length > 1;
      const nameLine = hasMultipleModes ? `${e.product.name} (${e.modeLabel})` : e.product.name;
      return `• ${nameLine} — ${qtyLabel(e)} (${money(e.qty * e.unitPrice)})`;
    });
    const message = [
      "¡Hola Rosita! 👋 Quiero hacer este pedido:",
      "",
      ...lines,
      "",
      `Total estimado: ${money(total)}`,
    ].join("\n");

    const encoded = encodeURIComponent(message);
    whatsappBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  }

  // Modal open/close
  document.getElementById("openCart").addEventListener("click", () => {
    cartModal.classList.remove("hidden");
  });
  document.getElementById("closeCart").addEventListener("click", () => {
    cartModal.classList.add("hidden");
  });
  cartModal.addEventListener("click", (e) => {
    if (e.target === cartModal) cartModal.classList.add("hidden");
  });

  // Floating WhatsApp button -> general contact if cart empty, else opens cart
  document.getElementById("floatingWhatsapp").addEventListener("click", () => {
    const entries = getCartEntries();
    if (entries.length === 0) {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank", "noopener");
    } else {
      cartModal.classList.remove("hidden");
    }
  });

  function goToCategory(catKey) {
    const target = document.getElementById(`cat-${catKey}`);
    if (target) {
      window.scrollTo({ top: target.offsetTop - 16, behavior: "smooth" });
    }
  }

  async function init() {
    const res = await fetch("data/products.json");
    const data = await res.json();
    PRODUCTS = data.categories;
    WHATSAPP_NUMBER = data.whatsappNumber;

    navEl = Nav.createNav(PRODUCTS, goToCategory);
    document.body.appendChild(navEl);

    renderCatalog();
    updateCartUI();
  }

  init();
})();
