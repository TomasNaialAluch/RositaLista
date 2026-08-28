// Lógica de precios: a partir del objeto "venta" de un producto,
// calcula los modos de compra disponibles (por kilo y/o por unidad).
// La usan tanto cards.js (para mostrar precios y el modal de elección)
// como app.js (para calcular el total del carrito).

const Pricing = (function () {
  const money = (n) =>
    n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  /**
   * Devuelve los modos de venta disponibles de un producto.
   * @param {object} item - producto, con item.venta = {
   *   kilo?: { precioPorKg },
   *   unidad?: { precioPorKg, pesoAproxKg, nombre? }  // "nombre" es opcional: cómo se
   *     llama la pieza entera cuando es distinto del nombre del corte (ej: Asado del
   *     Medio se vende entero como "Ventana"). Si no se pone, no pasa nada — el modo
   *     "unidad" funciona igual, solo que sin alias.
   * }
   * @returns {Array<{key: 'kilo'|'unidad', label: string, aliasName: string|null, unitPrice: number, unitLabel: string, detail: string}>}
   */
  function getSaleModes(item) {
    const venta = item.venta || {};
    const modes = [];

    if (venta.kilo) {
      modes.push({
        key: "kilo",
        label: "Por Kilo",
        aliasName: null,
        unitPrice: venta.kilo.precioPorKg,
        unitLabel: "kg",
        detail: `${money(venta.kilo.precioPorKg)} / kg`,
      });
    }

    if (venta.unidad) {
      const unitPrice = venta.unidad.precioPorKg * venta.unidad.pesoAproxKg;
      modes.push({
        key: "unidad",
        label: "Por Unidad",
        aliasName: venta.unidad.nombre || null,
        unitPrice,
        unitLabel: "unidad",
        detail: `${money(unitPrice)} (~${venta.unidad.pesoAproxKg} kg aprox)`,
      });
    }

    return modes;
  }

  /** Busca un modo de venta puntual ('kilo' | 'unidad') de un producto. */
  function getMode(item, modeKey) {
    return getSaleModes(item).find((m) => m.key === modeKey) || null;
  }

  return { money, getSaleModes, getMode };
})();
