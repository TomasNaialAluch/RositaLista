// Encabezado del sitio (logo + tagline). Componente autocontenido: crea su
// propio DOM y no depende de markup puesto en index.html. El CSS vive aparte
// en css/components/chrome/header.css, importado por <link> en index.html.

const Header = (function () {
  /** @returns {HTMLElement} */
  function create() {
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <img src="assets/logo.png" alt="Rosita Carnicería Premium" class="logo">
      <p class="tagline">Carnicería Premium</p>
    `;
    return header;
  }

  return { create };
})();
