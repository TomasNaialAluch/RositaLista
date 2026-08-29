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
   *   kilo?: { precioPorKg, minKg? },  // "minKg" es opcional: cantidad mínima de compra
   *     por kilo (ej: Pechito de Cerdo y Carré de Cerdo se venden con mínimo 3 kg). Si no
   *     se pone, el mínimo es 1 kg (comportamiento normal).
   *   unidad?: { precioPorKg, pesoAproxKg, nombre? }  // "nombre" es opcional: cómo se
   *     llama la pieza entera cuando es distinto del nombre del corte (ej: Asado del
   *     Medio se vende entero como "Ventana"). Si no se pone, no pasa nada — el modo
   *     "unidad" funciona igual, solo que sin alias.
   * }
   * @returns {Array<{key: 'kilo'|'unidad', label: string, aliasName: string|null, unitPrice: number, unitLabel: string, minQty: number, detail: string}>}
   */
  function getSaleModes(item) {
    const venta = item.venta || {};
    const modes = [];

    if (venta.kilo) {
      const minQty = venta.kilo.minKg || 1;
      modes.push({
        key: "kilo",
        label: "Por Kilo",
        aliasName: null,
        unitPrice: venta.kilo.precioPorKg,
        unitLabel: "kg",
        minQty,
        detail:
          minQty > 1
            ? `${money(venta.kilo.precioPorKg)} / kg (mín. ${minQty} kg)`
            : `${money(venta.kilo.precioPorKg)} / kg`,
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
        minQty: 1,
        detail: `${money(venta.unidad.precioPorKg)} / kg (~${venta.unidad.pesoAproxKg} kg) = ${money(unitPrice)}`,
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
