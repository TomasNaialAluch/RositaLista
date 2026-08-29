// Bloque de introducción (título + bajada) arriba del catálogo. El CSS vive
// aparte en css/components/chrome/intro.css, importado por <link> en index.html.

const Intro = (function () {
  /** @returns {HTMLElement} */
  function create() {
    const section = document.createElement("section");
    section.className = "intro";
    section.innerHTML = `
      <h1>Lista de Precios</h1>
      <p>Elegí tus cortes, sumá cantidades y mirá el total al instante. Cuando estés listo, enviá tu pedido por WhatsApp con un solo toque.</p>
    `;
    return section;
  }

  return { create };
})();
