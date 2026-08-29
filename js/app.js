// Orquestador raíz: trae los datos y arma todo el árbol de la página a
// partir de los componentes (Header, Intro, ViewToggle, Cart, Nav, Cards /
// ProductList, Footer) — index.html no tiene markup propio, solo importa
// los scripts; este archivo hace el trabajo que en una app React haría el
// componente raíz al montarse.
(function () {
  let PRODUCTS = {};
  let navEl = null;
  let view = "grid"; // 'grid' | 'list' — grid es el default
  let allCollapsed = false;
  let asadoActive = false; // ver CalcularAsado — reordena las categorías mientras dura el modo

  const catalogEl = document.createElement("section");
  catalogEl.id = "catalog";

  /** Aplica (o saca) el colapsado a todas las secciones de categoría ya renderizadas. */
  function applyCollapsedState() {
    catalogEl.querySelectorAll(".category-section").forEach((section) => {
      section.classList.toggle("category-section--collapsed", allCollapsed);
    });
  }

  function renderCatalog() {
    catalogEl.innerHTML = "";
    const renderer = view === "list" ? ProductList : Cards;
    const order = asadoActive ? CalcularAsado.reorderForAsado(Object.keys(PRODUCTS)) : Object.keys(PRODUCTS);
    order.forEach((catKey) => {
      const section = renderer.createCategorySection(catKey, PRODUCTS[catKey], {
        onIncrement: Cart.increment,
        onDecrement: Cart.decrement,
      });
      catalogEl.appendChild(section);
    });
    applyCollapsedState();
  }

  function goToCategory(catKey) {
    const target = document.getElementById(`cat-${catKey}`);
    if (target) {
      target.classList.remove("category-section--collapsed");
      window.scrollTo({ top: target.offsetTop - 16, behavior: "smooth" });
    }
  }

  async function init() {
    const [productsRes, configRes] = await Promise.all([fetch("data/products.json"), fetch("data/config.json")]);
    const data = await productsRes.json();
    const config = await configRes.json();
    PRODUCTS = data.categories;

    document.body.appendChild(Header.create());

    const main = document.createElement("main");
    main.appendChild(Intro.create());
    document.body.appendChild(main);

    // Fuera de <main> a propósito: main tiene max-width:780px y queda
    // centrado, pero el botón de minimizar/expandir tiene que pegar contra
    // el borde real de la pantalla en vez de quedar centrado dentro de esa
    // columna — por eso esta fila es hija directa de <body>, con ancho 100%
    // real (sin el truco 100vw, que en Chrome no descuenta el scrollbar y
    // mete un scroll horizontal de más). Por la misma razón, #catalog
    // también queda como hijo directo de <body> (con su propio max-width
    // centrado) en vez de adentro de <main>, para que quede después de la
    // toolbar en el orden visual.
    const toolbar = document.createElement("div");
    toolbar.className = "catalog-toolbar";
    toolbar.appendChild(
      CollapseToggle.create((collapsed) => {
        allCollapsed = collapsed;
        applyCollapsedState();
      })
    );
    toolbar.appendChild(
      ViewToggle.create((newView) => {
        view = newView;
        renderCatalog();
      })
    );
    toolbar.appendChild(
      CalcularAsado.create(PRODUCTS, {
        onEnter: () => {
          asadoActive = true;
          renderCatalog();
        },
        onExit: () => {
          asadoActive = false;
          renderCatalog();
        },
        goToCategory,
      })
    );
    document.body.appendChild(toolbar);

    document.body.appendChild(catalogEl);

    document.body.appendChild(Footer.create(config.whatsappNumber, config.quienesSomos));

    navEl = Nav.createNav(PRODUCTS, goToCategory);
    document.body.appendChild(navEl);

    Cart.init(config, {
      onVisibilityChange: (visible) => Nav.setLifted(navEl, visible),
    });

    renderCatalog();
  }

  init();
})();
