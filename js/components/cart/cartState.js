// Estado y matemática del pedido: tickets, líneas, kilos, precios, mínimo
// de compra y envío. NO toca el DOM — es el "modelo" que usan cart.js
// (para pintar la UI) y splitModal.js (para repartir una línea). Cada
// mutación deja el estado consistente pero NO dispara ningún render; quien
// llama es responsable de refrescar la UI después (ver Cart.updateUI() en
// cart.js).
//
// TICKETS — ver rediseno-tickets-pedido.md para la spec completa. Resumen:
// un pedido puede repartirse en varios "tickets" (ej: "Para mí" / "Para
// Juan") para que Rosita sepa cómo armar las bolsas, pero siempre hay UN
// SOLO pago (la suma de todos los tickets) y UN SOLO nombre/dirección de
// entrega. Todo lo que se reparte se maneja en kilos (ver
// mergeKgIntoTicket) — un producto vendido "por unidad" ya es, en el
// fondo, "tantos kilos a tal precio por kilo" (ver js/pricing.js).

const CartState = (function () {
  const OTRO_BARRIO = "__OTRO__";
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // tickets: { [id]: { name, lines: { "cat|nombre|modo|prep": entry } } }
  const tickets = {};
  const ticketOrder = [];
  let activeTicketId = null;
  let ticketIdCounter = 0;

  let CONFIG = { whatsappNumber: "", ventaMinimaKg: 0, barrios: [] };
  const shipping = { choice: null, otro: "" };

  // ---- Tickets: CRUD ------------------------------------------------------

  function createTicket(name) {
    ticketIdCounter += 1;
    const id = `t${ticketIdCounter}`;
    tickets[id] = { name: name || `Pedido ${ticketOrder.length + 1}`, lines: {} };
    ticketOrder.push(id);
    return id;
  }

  function renameTicket(ticketId, name) {
    if (tickets[ticketId]) tickets[ticketId].name = name;
  }

  /**
   * Borra un ticket (con confirmación, ya resuelta por quien llama). Lo que
   * tenía adentro NO se pierde: se fusiona (en kilos) con el ticket
   * anterior en el orden — ver mergeKgIntoTicket. No se puede borrar el
   * único ticket que queda.
   * @returns {boolean} true si se borró
   */
  function deleteTicket(ticketId) {
    if (ticketOrder.length <= 1) return false;
    const idx = ticketOrder.indexOf(ticketId);
    if (idx === -1) return false;
    const targetId = ticketOrder[idx === 0 ? 1 : idx - 1];

    getTicketEntries(ticketId).forEach((entry) => {
      const precioPorKg = entry.unitLabel === "kg" ? entry.unitPrice : entry.product.venta[entry.mode].precioPorKg;
      mergeKgIntoTicket(targetId, entry.product, entry.category, entry.preparacion, kgOf(entry), precioPorKg);
    });

    delete tickets[ticketId];
    ticketOrder.splice(idx, 1);
    if (activeTicketId === ticketId) activeTicketId = targetId;
    return true;
  }

  // ---- Cantidades y kilos ---------------------------------------------------

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
    return next;
  }

  // ---- Lectura de líneas / totales ------------------------------------------

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

  // ---- API pública ------------------------------------------------------------

  return {
    OTRO_BARRIO,

    init(config) {
      CONFIG = config;
      activeTicketId = createTicket();
    },
    getConfig: () => CONFIG,

    createTicket,
    renameTicket,
    deleteTicket,
    applySplit,
    changeQty,

    getActiveTicketId: () => activeTicketId,
    setActiveTicketId: (id) => {
      activeTicketId = id;
    },
    getTicketOrder: () => ticketOrder.slice(),
    getTicket: (id) => tickets[id],

    getShipping: () => ({ ...shipping }),
    setShippingChoice: (choice) => {
      shipping.choice = choice || null;
    },
    setShippingOtro: (text) => {
      shipping.otro = text;
    },

    kgOf,
    getTicketEntries,
    getTicketTotal,
    getAllEntries,
    getTotalKg,
    getGrandSubtotal,
    getGrandTotal,
    isBelowMinimum,
    getShippingCost,
    qtyLabel,
    lineName,
  };
})();
