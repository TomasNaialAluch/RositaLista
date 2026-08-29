// Encabezado del sitio (logo + tagline). Componente autocontenido, mismo
// criterio que el resto de js/components/: inyecta su propio <style> y no
// depende de markup puesto en index.html.

const Header = (function () {
  const STYLE_ID = "rh-styles";

  const CSS = `
    .site-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 28px 16px 10px;
      text-align: center;
    }

    .site-header .logo {
      width: 140px;
      height: auto;
      max-width: 40vw;
    }

    .site-header .tagline {
      color: var(--rosita-pink-dark);
      letter-spacing: 3px;
      font-size: 0.75rem;
      text-transform: uppercase;
      margin: 4px 0 0;
      font-weight: 600;
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
