// Opciones de preparación: cómo quiere recibir el cliente la mercadería
// (ej: Peceto entero o cortado para milanesa). Es un paso OPCIONAL y
// posterior a elegir el modo de venta (kilo/unidad) — no afecta el precio.
//
// Por defecto, todo se entrega "Sin manipular" (la pieza tal cual, sin
// cortar/preparar). Eso es universal y no hace falta declararlo en cada
// producto. Un producto solo necesita "opcionesPreparacion" en products.json
// cuando además del default puede pedirse de otra forma:
//
//   { "name": "Peceto", ..., "opcionesPreparacion": ["Para milanesa"] }
//
// Esto todavía NO tiene UI (no hay selector en la compra todavía) — es
// la base de datos + lectura, lista para cuando se arme ese paso.

const Preparation = (function () {
  const DEFAULT_OPTION = "Sin manipular";

  /**
   * Devuelve todas las opciones de preparación disponibles para un producto,
   * con el default siempre primero.
   * @param {object} item - producto, puede tener item.opcionesPreparacion: string[]
   * @returns {string[]}
   */
  function getOptions(item) {
    const extra = item.opcionesPreparacion || [];
    return [DEFAULT_OPTION, ...extra];
  }

  /** True si el producto tiene alguna opción además del default (o sea, si hay algo para elegir). */
  function hasChoice(item) {
    return getOptions(item).length > 1;
  }

  return { DEFAULT_OPTION, getOptions, hasChoice };
})();
