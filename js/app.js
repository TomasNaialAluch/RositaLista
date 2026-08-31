// Orquestador raíz: trae los datos y arma todo el árbol de la página a
// partir de los componentes (Header, Intro, ViewToggle, Cart, Orbe, Cards /
// ProductList, Footer, AsadoFilter) — index.html no tiene markup propio,
// solo importa los scripts; este archivo hace el trabajo que en una app
// React haría el componente raíz al montarse.
//
// AsadoFilter (ver docs/rediseno-filtro-cortes-asado.md) es los chips
// "Cortes de asado"/"Ver todos los cortes" que solo existen durante el modo
// Asado — este archivo es dueño de montarlos/desmontarlos (onEnter/onExit
// de CalcularAsado.create) y de aplicar el filtro/orden que implican sobre
// vacuno/cerdo/achuras (`applyAsadoFilter`, usando `data/asadoOrder.json`);
// AsadoFilter en sí no sabe nada de productos, solo de qué chip está
// elegido.
(function () {
  let PRODUCTS = {};
  let ASADO_ORDER = {}; // vacuno/cerdo/achuras -> nombres en el orden del filtro "Cortes de asado", ver data/asadoOrder.json
  let view = "grid"; // 'grid' | 'list' — grid es el default
  let allCollapsed = false;
  let asadoActive = false; // ver CalcularAsado — reordena las categorías mientras dura el modo
  let asadoFilterEl = null; // chips "Cortes de asado" / "Ver todos los cortes", solo montados durante el modo

  const catalogEl = document.createElement("section");
  catalogEl.id = "catalog";

  /** Aplica (o saca) el colapsado a todas las secciones de categoría ya renderizadas. */
  function applyCollapsedState() {
    catalogEl.querySelectorAll(".category-section").forEach((section) => {
      section.classList.toggle("category-section--collapsed", allCollapsed);
    });
  }

  /**
   * Filtra y reordena los items de una categoría según data/asadoOrder.json
   * — ver docs/rediseno-filtro-cortes-asado.md. Solo aplica a vacuno/cerdo/
   * achuras, mientras el modo Asado está activo Y el chip "Cortes de asado"
   * está elegido (`AsadoFilter.isAsadoOnly()`); en cualquier otro caso
   * devuelve la categoría tal cual viene de products.json, sin tocar nada.
   */
  function applyAsadoFilter(catKey, category) {
    const order = ASADO_ORDER[catKey];
    if (!asadoActive || !AsadoFilter.isAsadoOnly() || !order) return category;
    const byName = {};
    category.items.forEach((item) => (byName[item.name] = item));
    const items = order.map((name) => byName[name]).filter(Boolean);
    return { ...category, items };
  }

  function renderCatalog() {
    catalogEl.innerHTML = "";
    const renderer = view === "list" ? ProductList : Cards;
    const order = asadoActive ? CalcularAsado.reorderForAsado(Object.keys(PRODUCTS)) : Object.keys(PRODUCTS);
    order.forEach((catKey) => {
      const section = renderer.createCategorySection(catKey, applyAsadoFilter(catKey, PRODUCTS[catKey]), {
        onIncrement: Cart.increment,
        onDecrement: Cart.decrement,
        getQty: Cart.getQty,
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
    const [productsRes, configRes, asadoOrderRes] = await Promise.all([
      fetch("data/products.json"),
      fetch("data/config.json"),
      fetch("data/asadoOrder.json"),
    ]);
    const data = await productsRes.json();
    const config = await configRes.json();
    ASADO_ORDER = await asadoOrderRes.json();
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
          // Chips "Cortes de asado" / "Ver todos los cortes" — ver
          // docs/rediseno-filtro-cortes-asado.md. Se montan recién acá (no
          // en init()) porque solo existen mientras dura el modo, siempre
          // arrancando en "Cortes de asado".
          asadoFilterEl = AsadoFilter.create(renderCatalog);
          document.body.insertBefore(asadoFilterEl, catalogEl);
          renderCatalog();
        },
        onExit: () => {
          asadoActive = false;
          AsadoFilter.remove();
          asadoFilterEl = null;
          renderCatalog();
        },
        goToCategory,
        // Para el modo selección de embutidos/achuras (ver
        // docs/rediseno-embutidos-asado.md): CalcularAsado activa/desactiva
        // Cards.enterSelectionMode por su cuenta, pero necesita que el
        // catálogo se vuelva a pintar para que la card lo refleje.
        refreshCatalog: renderCatalog,
      })
    );
    document.body.appendChild(toolbar);

    document.body.appendChild(catalogEl);

    document.body.appendChild(Footer.create(config.whatsappNumber, config.quienesSomos));

    Orbe.init(PRODUCTS, goToCategory);

    Cart.init(config, {
      onVisibilityChange: (visible) => Orbe.setLifted(visible),
    });

    renderCatalog();
  }

  init();
})();
