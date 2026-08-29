// Orquestador raíz: trae los datos y arma todo el árbol de la página a
// partir de los componentes (Header, Intro, ViewToggle, Cart, Nav, Cards /
// ProductList, Footer) — index.html no tiene markup propio, solo importa
// los scripts; este archivo hace el trabajo que en una app React haría el
// componente raíz al montarse.
(function () {
  let PRODUCTS = {};
  let navEl = null;
  let view = "grid"; // 'grid' | 'list' — grid es el default

  const catalogEl = document.createElement("section");
  catalogEl.id = "catalog";

  function renderCatalog() {
    catalogEl.innerHTML = "";
    const renderer = view === "list" ? ProductList : Cards;
    Object.entries(PRODUCTS).forEach(([catKey, cat]) => {
      const section = renderer.createCategorySection(catKey, cat, {
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

    document.body.appendChild(Header.create());

    const main = document.createElement("main");
    main.appendChild(Intro.create());
    main.appendChild(
      ViewToggle.create((newView) => {
        view = newView;
        renderCatalog();
      })
    );
    main.appendChild(catalogEl);
    document.body.appendChild(main);

    document.body.appendChild(Footer.create(data.whatsappNumber));

    navEl = Nav.createNav(PRODUCTS, goToCategory);
    document.body.appendChild(navEl);

    Cart.init(data.whatsappNumber, {
      onVisibilityChange: (visible) => Nav.setLifted(navEl, visible),
    });

    renderCatalog();
  }

  init();
})();
