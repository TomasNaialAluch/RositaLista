// Orquestador: trae los datos, arma la nav y el catálogo, y monta el
// carrito (js/components/cart.js). No mantiene estado propio del pedido —
// eso vive enteramente en el componente Cart.
(function () {
  let PRODUCTS = {};
  let navEl = null;

  const catalogEl = document.getElementById("catalog");

  function renderCatalog() {
    catalogEl.innerHTML = "";
    Object.entries(PRODUCTS).forEach(([catKey, cat]) => {
      const section = Cards.createCategorySection(catKey, cat, {
        onIncrement: Cart.increment,
        onDecrement: Cart.decrement,
      });
      catalogEl.appendChild(section);
    });
  }

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

    navEl = Nav.createNav(PRODUCTS, goToCategory);
    document.body.appendChild(navEl);

    Cart.init(data.whatsappNumber, {
      onVisibilityChange: (visible) => Nav.setLifted(navEl, visible),
    });

    renderCatalog();
  }

  init();
})();
