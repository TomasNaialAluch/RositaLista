// CalcularAsado: modo guiado para armar el pedido de un asado — ver
// calcularAsado-guia.md para la spec completa (vocabulario, secuencia,
// fórmula del cálculo, decisiones tomadas al programar esto).
//
// Resumen de lo que hace: un botón nuevo (junto al toggle Grilla/Lista)
// pregunta cuántas personas van al asado, crea un ticket nuevo llamado
// "Ticket Asado" (reutiliza el sistema de tickets de CartState — ver
// rediseno-tickets-pedido.md, no es un mecanismo aparte) y lo deja activo,
// muestra un contador flotante a la derecha con cuánta carne falta, y
// reordena el catálogo (cerdo antes que pollo) mientras dura el modo. Al
// terminar, pregunta por embutidos/provoleta/achuras si faltan, y abre un
// ticket nuevo y separado para que lo que se siga comprando ("para la
// casa") no se mezcle con el Ticket Asado.
//
// Usa a la Orbe (js/components/nav/orbe.js) en los pasos de este flujo que
// ya estaban listados en la sección "Integración pendiente con la Orbe" de
// docs/calcularAsado-guia.md: se eleva sobre el modal de personas y sobre
// cada pregunta de la cadena final, y queda anclada con un mensaje de
// bienvenida mientras dura el modo. cards.js y cart.js todavía no llaman a
// la Orbe — eso queda para una próxima pasada.

const CalcularAsado = (function () {
  const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="6" rx="8" ry="2.3"></ellipse>
    <path d="M5.2 6.3v1M8.6 6v1.4M12 6v1.4M15.4 6v1.4M18.8 6.3v1"></path>
    <path d="M4.5 7.6l-1 8.4"></path>
    <path d="M19.5 7.6l1 8.4"></path>
    <path d="M6.5 12.3h11"></path>
    <path d="M12 21c-1.6 0-2.8-1.1-2.8-2.6 0-1.1.6-1.8 1-2.6.1.7.5 1.1.9.9-.3-1.1.2-1.9 1-2.5.1 1.2.9 1.9 1.5 2.7.5.7.2 1.6-.4 1.9.6-.1 1-.7.9-1.4.5.6.7 1.3.7 2 0 1.5-1.2 2.6-2.8 2.6z"></path>
  </svg>`;

  // Baseline usado solo para TRADUCIR "personas sin cubrir" a un número de
  // kg amigable en el contador — ver "La barra de progreso" en el readme.
  const KG_BASE_POR_PERSONA = 0.5;

  // Orden en que se pregunta al terminar, si falta alguna.
  const CHECKLIST_FINAL = [
    { key: "embutidos", pregunta: '¿Querés agregar embutidos?' },
    { key: "provoleta", pregunta: '¿Querés agregar provoleta?' },
    { key: "achuras", pregunta: '¿Querés agregar achuras?' },
  ];

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Textos de la Orbe para este flujo — ver "Integración pendiente con la
  // Orbe" en calcularAsado-guia.md (puntos 1 a 3).
  const ORBE_TEXT_PEOPLE =
    "Elegí cuántas personas van al asado — con eso te voy diciendo cuánta carne te falta a medida que sumás cortes.";
  const ORBE_TEXT_WELCOME =
    "Te voy guiando: fijate el contador de la derecha para ver cuánta carne te falta, y sumá los cortes que quieras desde el catálogo.";

  let PRODUCTS = null;
  let callbacks = {};
  let btn = null;
  let widgetEl = null;
  let unsubscribeCart = null;

  let active = false;
  let personas = 0;
  let asadoTicketId = null;

  // ---- Reordenar categorías para el modo asado -----------------------------

  /**
   * Mueve "cerdo" justo antes de "pollo" (si ambas existen), sin tocar el
   * resto del orden. Generico a propósito: si mañana se agregan más
   * categorías, siguen donde estaban.
   * @param {string[]} order - claves de categoría en el orden normal
   * @returns {string[]}
   */
  function reorderForAsado(order) {
    const idxCerdo = order.indexOf("cerdo");
    const idxPollo = order.indexOf("pollo");
    if (idxCerdo === -1 || idxPollo === -1 || idxCerdo < idxPollo) return order;
    const next = order.filter((k) => k !== "cerdo");
    next.splice(next.indexOf("pollo"), 0, "cerdo");
    return next;
  }

  // ---- Modales (bottom-sheet, mismo patrón visual que cards.js) -----------

  /**
   * @param {string} bodyHtml
   * @param {(modal: HTMLElement, close: () => void) => void} wire
   * @param {string} orbeText - lo que dice la Orbe mientras este modal está abierto (Orbe.elevate).
   *   Al cerrarse (por `close()` o tocando afuera), la Orbe vuelve a anclarse sola — sin texto
   *   forzado, así el que llama puede pisarlo después con un mensaje más específico si hace falta
   *   (ver `ORBE_TEXT_WELCOME` en `startAsadoMode`/`askNext`).
   */
  function openSheet(bodyHtml, wire, orbeText) {
    Orbe.elevate(orbeText);

    const overlay = document.createElement("div");
    overlay.className = "ca-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "ca-modal";
    modal.innerHTML = bodyHtml;
    overlay.appendChild(modal);

    let closed = false;
    function finalize() {
      if (closed) return;
      closed = true;
      overlay.remove();
      Orbe.dock();
    }

    document.body.appendChild(overlay);
    wire(modal, finalize);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finalize();
    });
    return overlay;
  }

  /** Primer paso del flujo: cuántas personas van al asado. */
  function openPeopleModal(onConfirm) {
    let n = 4;
    openSheet(
      `
      <p class="ca-modal-title">¿Cuántos son en el asado?</p>
      <div class="ca-stepper">
        <button type="button" class="ca-step-btn ca-minus" aria-label="Restar">−</button>
        <span class="ca-qty" id="caPeopleQty">4 personas</span>
        <button type="button" class="ca-step-btn ca-plus" aria-label="Sumar">+</button>
      </div>
      <button type="button" class="ca-confirm-btn" id="caPeopleConfirm">Empezar</button>
    `,
      (modal, close) => {
        const qtyEl = modal.querySelector("#caPeopleQty");
        const render = () => (qtyEl.textContent = `${n} ${n === 1 ? "persona" : "personas"}`);
        modal.querySelector(".ca-minus").addEventListener("click", () => {
          n = Math.max(1, n - 1);
          render();
        });
        modal.querySelector(".ca-plus").addEventListener("click", () => {
          n += 1;
          render();
        });
        modal.querySelector("#caPeopleConfirm").addEventListener("click", () => {
          close();
          onConfirm(n);
        });
      },
      ORBE_TEXT_PEOPLE
    );
  }

  /** Pregunta sí/no genérica — la usa la cadena del final (embutidos/provoleta/achuras). */
  function openYesNoModal(pregunta, onYes, onNo) {
    openSheet(
      `
      <p class="ca-modal-title">${pregunta}</p>
      <button type="button" class="ca-confirm-btn" id="caYes">Sí, agregar</button>
      <button type="button" class="ca-modal-cancel" id="caNo">No, gracias</button>
    `,
      (modal, close) => {
        modal.querySelector("#caYes").addEventListener("click", () => {
          close();
          onYes();
        });
        modal.querySelector("#caNo").addEventListener("click", () => {
          close();
          onNo();
        });
      },
      pregunta
    );
  }

  // ---- Cálculo de progreso ---------------------------------------------------

  /**
   * Cuánto de lo agregado al Ticket Asado ya "cubre" a las personas.
   * Cada línea cuenta según SU PROPIO índice (`indiceAsado` en
   * products.json), no todas por igual — ver "La barra de progreso" en el
   * readme. La provoleta no cuenta acá (es un "agregado" aparte, se
   * sugiere 1 cada 2 personas).
   */
  function computeProgress() {
    if (!asadoTicketId) return { kgFaltan: 0, pct: 0, provoletaQty: 0, provoletaSugerida: 0 };

    const entries = CartState.getTicketEntries(asadoTicketId);
    let personasCubiertas = 0;
    let provoletaQty = 0;

    entries.forEach((e) => {
      const idx = e.product.indiceAsado;
      if (!idx) return;
      if (e.category === "provoleta") {
        provoletaQty += e.qty;
        return;
      }
      personasCubiertas += CartState.kgOf(e) / idx;
    });

    const kgFaltan = Math.max(0, round2((personas - personasCubiertas) * KG_BASE_POR_PERSONA));
    const pct = personas > 0 ? Math.min(100, Math.round((personasCubiertas / personas) * 100)) : 0;
    const provoletaSugerida = Math.ceil(personas / 2);

    return { kgFaltan, pct, provoletaQty, provoletaSugerida };
  }

  // ---- Widget flotante --------------------------------------------------------

  function buildWidget() {
    widgetEl = document.createElement("div");
    widgetEl.className = "ca-widget";
    widgetEl.innerHTML = `
      <button type="button" class="ca-widget-close" aria-label="Salir del modo asado">&times;</button>
      <div class="ca-widget-rail"><div class="ca-widget-fill"></div></div>
      <p class="ca-widget-kg"></p>
      <p class="ca-widget-label">de carne</p>
      <p class="ca-widget-provoleta"></p>
      <button type="button" class="ca-widget-finish">Terminar pedido</button>
    `;
    document.body.appendChild(widgetEl);

    widgetEl.querySelector(".ca-widget-close").addEventListener("click", exitAsadoMode);
    widgetEl.querySelector(".ca-widget-finish").addEventListener("click", startFinishFlow);
    renderWidget();
  }

  function renderWidget() {
    if (!widgetEl) return;
    const { kgFaltan, pct, provoletaQty, provoletaSugerida } = computeProgress();
    widgetEl.querySelector(".ca-widget-fill").style.height = `${pct}%`;
    widgetEl.querySelector(".ca-widget-kg").textContent = kgFaltan > 0 ? `${kgFaltan} kg` : "¡Listo!";
    widgetEl.querySelector(".ca-widget-provoleta").textContent =
      provoletaSugerida > 0 ? `🧀 ${provoletaQty}/${provoletaSugerida} provoletas` : "";
  }

  // ---- Ciclo de vida del modo --------------------------------------------------

  /**
   * Confirmadas las personas: decide en qué ticket va a vivir el asado
   * (reusa el activo si está vacío, si no crea uno nuevo — ver "Después del
   * asado" en el readme) y prende el modo.
   */
  function startAsadoMode(n) {
    personas = n;
    active = true;

    const currentId = CartState.getActiveTicketId();
    if (CartState.getTicketEntries(currentId).length === 0) {
      CartState.renameTicket(currentId, "Ticket Asado");
      asadoTicketId = currentId;
    } else {
      asadoTicketId = CartState.createTicket("Ticket Asado");
      CartState.setActiveTicketId(asadoTicketId);
    }
    Cart.refresh();

    document.body.classList.add("ca-active");
    btn.classList.add("ca-toggle-btn--hidden");

    buildWidget();
    unsubscribeCart = Cart.subscribe(renderWidget);

    // La Orbe queda anclada (sin modal abierto) con el mensaje de
    // bienvenida al modo — punto 2 de "Integración pendiente con la Orbe"
    // en calcularAsado-guia.md.
    Orbe.dock(ORBE_TEXT_WELCOME);

    if (callbacks.onEnter) callbacks.onEnter();
  }

  function teardown() {
    active = false;
    document.body.classList.remove("ca-active");
    btn.classList.remove("ca-toggle-btn--hidden");
    if (unsubscribeCart) {
      unsubscribeCart();
      unsubscribeCart = null;
    }
    if (widgetEl) {
      widgetEl.remove();
      widgetEl = null;
    }
    Orbe.dock();
    if (callbacks.onExit) callbacks.onExit();
  }

  /**
   * Apaga el modo SIN pasar por la cadena de preguntas del final — lo que
   * ya está en el Ticket Asado queda tal cual, solo se apaga la guía
   * visual (decisión tomada acá, ver "Qué falta definir" del readme
   * original: se eligió esta opción sobre "perder el progreso").
   */
  function exitAsadoMode() {
    teardown();
  }

  /** Botón "Terminar pedido" del widget: dispara la cadena de preguntas del final. */
  function startFinishFlow() {
    const entries = CartState.getTicketEntries(asadoTicketId);
    const yaTiene = new Set(entries.map((e) => e.category));
    const faltantes = CHECKLIST_FINAL.filter((c) => PRODUCTS[c.key] && !yaTiene.has(c.key));
    askNext(faltantes, 0);
  }

  /**
   * Pregunta una por una las categorías que faltan. Si el usuario dice que
   * sí a alguna, la cadena se corta ahí (no sigue preguntando las
   * siguientes): se lo lleva a esa categoría, sigue en modo asado, y puede
   * volver a tocar "Terminar pedido" cuando termine — eso vuelve a evaluar
   * qué falta desde cero, sin repetir lo que ya resolvió.
   */
  function askNext(faltantes, idx) {
    if (idx >= faltantes.length) {
      finishAsadoMode();
      return;
    }
    const { key, pregunta } = faltantes[idx];
    openYesNoModal(
      pregunta,
      () => {
        // Vuelve al home en modo Asado (sigue anclada, no elevada) — que
        // la Orbe diga de nuevo el mensaje general en vez de dejar pegada
        // la pregunta que ya se contestó.
        Orbe.dock(ORBE_TEXT_WELCOME);
        if (callbacks.goToCategory) callbacks.goToCategory(key);
      },
      () => askNext(faltantes, idx + 1)
    );
  }

  /** No falta nada (o el usuario dijo que no a todo): cierra el modo y abre un ticket nuevo para lo que se siga comprando. */
  function finishAsadoMode() {
    teardown();
    CartState.setActiveTicketId(CartState.createTicket());
    Cart.refresh();
    Cart.openModal();
  }

  // ---- API pública --------------------------------------------------------------

  /**
   * @param {object} products - PRODUCTS de app.js (categorías → items), para saber qué categorías existen
   * @param {object} cbs
   * @param {() => void} cbs.onEnter - se llama al prender el modo (app.js reordena el catálogo)
   * @param {() => void} cbs.onExit - se llama al apagar el modo (app.js vuelve al orden normal)
   * @param {(catKey: string) => void} cbs.goToCategory - llevar al usuario a una categoría puntual
   * @returns {HTMLElement} el botón, para sumarlo a la toolbar
   */
  function create(products, cbs) {
    PRODUCTS = products;
    callbacks = cbs || {};

    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ca-toggle-btn";
    btn.setAttribute("aria-label", "Calcular asado");
    btn.title = "Calcular asado";
    btn.innerHTML = ICON;
    btn.addEventListener("click", () => {
      if (active) return;
      openPeopleModal(startAsadoMode);
    });

    return btn;
  }

  return { create, reorderForAsado };
})();
