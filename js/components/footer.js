// Pie del sitio, con el link de WhatsApp de contacto general. Componente
// autocontenido; recibe el número de WhatsApp como parámetro (viene de
// data/products.json, no está hardcodeado acá).

const Footer = (function () {
  const STYLE_ID = "rf-styles";

  const CSS = `
    .site-footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
      padding: 30px 16px 20px;
    }

    .site-footer a {
      color: var(--rosita-pink-dark);
      font-weight: 600;
      text-decoration: none;
    }

    .site-footer a:hover {
      text-decoration: underline;
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /**
   * @param {string} whatsappNumber
   * @returns {HTMLElement}
   */
  function create(whatsappNumber) {
    injectStyles();

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <p>Rosita Carnicería Premium · Pedidos por WhatsApp
        <a href="https://wa.me/${whatsappNumber}" target="_blank" rel="noopener">+${whatsappNumber}</a>
      </p>
    `;
    return footer;
  }

  return { create };
})();
