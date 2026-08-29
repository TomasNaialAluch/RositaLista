// Pie del sitio, con el link de WhatsApp de contacto general y el modal de
// "¿Quiénes somos?". Recibe el número de WhatsApp y el contenido de
// "quiénes somos" como parámetros (vienen de data/config.json, no están
// hardcodeados acá). El CSS vive aparte en css/components/chrome/footer.css,
// importado por <link> en index.html.

const Footer = (function () {
  function openAboutModal(quienesSomos) {
    const overlay = document.createElement("div");
    overlay.className = "footer-about-overlay";

    const paragraphs = (quienesSomos.parrafos || []).map((p) => `<p>${p}</p>`).join("");
    const frigorifico = quienesSomos.frigorifico
      ? `
        <p class="footer-about-sub">${quienesSomos.frigorifico.titulo}</p>
        <p>${quienesSomos.frigorifico.texto}</p>
        <p class="footer-about-address">📍 ${quienesSomos.frigorifico.direccion}</p>
      `
      : "";

    const modal = document.createElement("div");
    modal.className = "footer-about-modal";
    modal.innerHTML = `
      <button type="button" class="footer-about-close" aria-label="Cerrar">&times;</button>
      <img src="assets/abuela-rosita-nueva.png" alt="Nuestra abuela Rosita" class="footer-about-photo">
      <p class="footer-about-title">${quienesSomos.titulo}</p>
      <div class="footer-about-text">
        ${paragraphs}
        ${frigorifico}
      </div>
    `;
    modal.querySelector(".footer-about-close").addEventListener("click", () => overlay.remove());

    overlay.appendChild(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  /**
   * @param {string} whatsappNumber
   * @param {object} [quienesSomos] - { titulo, parrafos: string[], frigorifico?: { titulo, texto, direccion } }
   * @returns {HTMLElement}
   */
  function create(whatsappNumber, quienesSomos) {
    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <p>Rosita Carnicería Premium · Pedidos por WhatsApp
        <a href="https://wa.me/${whatsappNumber}" target="_blank" rel="noopener">+${whatsappNumber}</a>
      </p>
      <button type="button" class="site-footer-about">¿Quiénes somos?</button>
    `;
    footer.querySelector(".site-footer-about").addEventListener("click", () => {
      if (quienesSomos) openAboutModal(quienesSomos);
    });
    return footer;
  }

  return { create };
})();
