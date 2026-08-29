// Bloque de introducción (título + bajada) arriba del catálogo. Componente
// autocontenido, mismo criterio que el resto de js/components/.

const Intro = (function () {
  const STYLE_ID = "rin-styles";

  const CSS = `
    .intro {
      text-align: center;
      margin: 18px 0 22px;
    }

    .intro h1 {
      font-size: 2rem;
      color: var(--rosita-pink-dark);
      margin: 0 0 8px;
    }

    .intro p {
      color: var(--text-muted);
      font-size: 0.98rem;
      max-width: 520px;
      margin: 0 auto;
      line-height: 1.5;
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /** @returns {HTMLElement} */
  function create() {
    injectStyles();

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
