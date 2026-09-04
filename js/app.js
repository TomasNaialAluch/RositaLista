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
  let searchQuery = ""; // normalizado (sin acentos, minúscula) — ver docs/rediseno-buscador.md
  let searchQueryRaw = ""; // tal cual lo tipeó el usuario, solo para mostrar en el estado vacío

  const EXIT_MS = 180; // debe coincidir con la duración de las animaciones --exiting (cards.css/productList.css/styles.css)

  const catalogEl = document.createElement("section");
  catalogEl.id = "catalog";

  const CART_HANDLERS = {
    onIncrement: Cart.increment,
    onDecrement: Cart.decrement,
    getQty: Cart.getQty,
  };

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

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

  /**
   * Filtra los items de una categoría por lo tipeado en SearchBar — busca en
   * `name` y `cut` a la vez (substring, sin importar mayúsculas/acentos). Ver
   * docs/rediseno-buscador.md.
   */
  function applySearchFilter(category) {
    if (!searchQuery) return category;
    const items = category.items.filter((item) => {
      const haystack = SearchBar.normalize([item.name, item.cut].filter(Boolean).join(" "));
      return haystack.includes(searchQuery);
    });
    return { ...category, items };
  }

  function currentOrder() {
    return asadoActive ? CalcularAsado.reorderForAsado(Object.keys(PRODUCTS)) : Object.keys(PRODUCTS);
  }

  /** Categoría final a mostrar: primero el filtro de Asado, después el de búsqueda (ver docs/rediseno-buscador.md). */
  function filteredCategory(catKey) {
    return applySearchFilter(applyAsadoFilter(catKey, PRODUCTS[catKey]));
  }

  function currentRenderer() {
    return view === "list" ? ProductList : Cards;
  }

  /**
   * Reemplaza #catalog por el mensaje "no encontramos productos" — se usa
   * tanto desde renderCatalog (rebuild completo) como desde
   * updateCatalogForSearch (mientras se tipea).
   */
  function renderSearchEmpty(queryText) {
    catalogEl.innerHTML = "";

    const empty = document.createElement("div");
    empty.className = "search-empty";

    const message = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = queryText;
    message.append('No encontramos productos para "', strong, '"');
    empty.appendChild(message);

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "search-empty-clear";
    clearBtn.textContent = "Ver todo el catálogo";
    clearBtn.addEventListener("click", () => {
      SearchBar.clear();
      searchQuery = "";
      searchQueryRaw = "";
      updateCatalogForSearch();
    });
    empty.appendChild(clearBtn);

    catalogEl.appendChild(empty);
  }

  /**
   * Rebuild completo del catálogo (recrea todas las cards) — para cambios
   * estructurales: cambio de vista, entrar/salir del modo Asado, cambio de
   * chip del AsadoFilter, modo selección de embutidos. Las categorías que
   * quedan sin items tras los filtros no se agregan al DOM.
   */
  function renderCatalog() {
    catalogEl.innerHTML = "";
    const renderer = currentRenderer();
    const order = currentOrder();
    order.forEach((catKey) => {
      const category = filteredCategory(catKey);
      if (category.items.length === 0) return;
      const section = renderer.createCategorySection(catKey, category, CART_HANDLERS);
      catalogEl.appendChild(section);
    });
    applyCollapsedState();
    if (searchQuery && !catalogEl.children.length) {
      renderSearchEmpty(searchQueryRaw);
    }
  }

  /** Config de la vista actual para el diff de búsqueda (ver diffItems). */
  function itemDiffConfig() {
    return view === "list"
      ? { containerSel: ".rl-list", create: ProductList.createProductRow, enterClass: "rl-row--entering", exitClass: "rl-row--exiting" }
      : { containerSel: ".rc-grid", create: Cards.createProductCard, enterClass: "rc-card--entering", exitClass: "rc-card--exiting" };
  }

  function cssEscapeName(name) {
    return window.CSS && CSS.escape ? CSS.escape(name) : name.replace(/["\\]/g, "\\$&");
  }

  /** Inserta `el` en `container` en la posición que le corresponde según `orderedNames`, sin tocar los elementos ya puestos. */
  function insertItemInOrder(container, el, idx, orderedNames) {
    for (let i = idx + 1; i < orderedNames.length; i++) {
      const sibling = container.querySelector(`[data-item-name="${cssEscapeName(orderedNames[i])}"]`);
      if (sibling) {
        container.insertBefore(el, sibling);
        return;
      }
    }
    container.appendChild(el);
  }

  /**
   * Actualiza las cards/filas de una sección de categoría ya montada para
   * que coincidan con `category.items`, animando solo lo que entra/sale
   * (opción C de docs/rediseno-buscador.md) — las que ya estaban visibles
   * quedan intactas, sin recrearse, para no perder su estado (cantidad, modo
   * de venta elegido, etc).
   */
  function diffItems(section, category, catKey) {
    const cfg = itemDiffConfig();
    const container = section.querySelector(cfg.containerSel);
    const wantedNames = category.items.map((item) => item.name);
    const wantedSet = new Set(wantedNames);
    const reduced = prefersReducedMotion();

    Array.from(container.children).forEach((el) => {
      const stillWanted = wantedSet.has(el.dataset.itemName);
      if (!stillWanted) {
        if (el.dataset.exiting) return; // ya se está yendo
        if (reduced) {
          el.remove();
          return;
        }
        el.dataset.exiting = "1";
        el.classList.add(cfg.exitClass);
        setTimeout(() => {
          if (el.dataset.exiting) el.remove();
        }, EXIT_MS);
      } else if (el.dataset.exiting) {
        // Volvió a matchear justo antes de irse del todo: cancelar la salida.
        delete el.dataset.exiting;
        el.classList.remove(cfg.exitClass);
      }
    });

    category.items.forEach((item, idx) => {
      if (container.querySelector(`[data-item-name="${cssEscapeName(item.name)}"]`)) return;
      const el = cfg.create(catKey, item, CART_HANDLERS);
      if (!reduced) el.classList.add(cfg.enterClass);
      insertItemInOrder(container, el, idx, wantedNames);
    });
  }

  function insertSectionInOrder(section, catKey, order) {
    for (let i = order.indexOf(catKey) + 1; i < order.length; i++) {
      const nextEl = document.getElementById(`cat-${order[i]}`);
      if (nextEl) {
        catalogEl.insertBefore(section, nextEl);
        return;
      }
    }
    catalogEl.appendChild(section);
  }

  function removeSectionWithAnimation(section) {
    if (section.dataset.exiting) return;
    if (prefersReducedMotion()) {
      section.remove();
      return;
    }
    section.dataset.exiting = "1";
    section.classList.add("category-section--exiting");
    setTimeout(() => {
      if (section.dataset.exiting) section.remove();
    }, EXIT_MS);
  }

  /**
   * Actualiza #catalog cada vez que cambia el texto de búsqueda, animando
   * individualmente lo que entra/sale en vez de recrear todo (a diferencia
   * de renderCatalog) — ver docs/rediseno-buscador.md.
   */
  function updateCatalogForSearch() {
    const order = currentOrder();
    const categories = order.map((catKey) => ({ catKey, category: filteredCategory(catKey) }));
    const totalCount = categories.reduce((sum, c) => sum + c.category.items.length, 0);

    if (searchQuery && totalCount === 0) {
      renderSearchEmpty(searchQueryRaw);
      return;
    }

    // Si veníamos del estado vacío (o de una carga sin resultados), no hay
    // secciones montadas: se recrean todas frescas, cada una con su propia
    // animación de entrada.
    if (catalogEl.querySelector(".search-empty")) {
      catalogEl.innerHTML = "";
    }

    const renderer = currentRenderer();
    categories.forEach(({ catKey, category }) => {
      let section = document.getElementById(`cat-${catKey}`);

      if (category.items.length === 0) {
        if (section) removeSectionWithAnimation(section);
        return;
      }

      if (section && section.dataset.exiting) {
        delete section.dataset.exiting;
        section.classList.remove("category-section--exiting");
      }

      if (!section) {
        section = renderer.createCategorySection(catKey, category, CART_HANDLERS);
        if (!prefersReducedMotion()) section.classList.add("category-section--entering");
        section.classList.toggle("category-section--collapsed", allCollapsed);
        insertSectionInOrder(section, catKey, order);
        return;
      }

      diffItems(section, category, catKey);
    });
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

    // Siempre montada (a diferencia de AsadoFilter), entre la toolbar y el
    // catálogo — ver docs/rediseno-buscador.md.
    document.body.appendChild(
      SearchBar.create((query, rawQuery) => {
        searchQuery = query;
        searchQueryRaw = rawQuery;
        updateCatalogForSearch();
      })
    );

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
