// Íconos minimalistas de animales (línea, sin color propio: usan currentColor).
// Se usan tanto en la nav como en los títulos de categoría.

const Icons = {
  vacuno: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7.5 8c-1.6-1.3-1.8-3.2-.8-4.4"/>
      <path d="M16.5 8c1.6-1.3 1.8-3.2.8-4.4"/>
      <path d="M5 10.2c-1.9.4-2.9 1.8-2.5 3.2.4 1.4 2 2 3.4 1.4"/>
      <path d="M19 10.2c1.9.4 2.9 1.8 2.5 3.2-.4 1.4-2 2-3.4 1.4"/>
      <rect x="6" y="7.5" width="12" height="10" rx="5"/>
      <circle cx="9.4" cy="12" r="0.9" fill="currentColor" stroke="none"/>
      <circle cx="14.6" cy="12" r="0.9" fill="currentColor" stroke="none"/>
      <ellipse cx="12" cy="16" rx="3.2" ry="1.7"/>
      <circle cx="10.7" cy="16" r="0.45" fill="currentColor" stroke="none"/>
      <circle cx="13.3" cy="16" r="0.45" fill="currentColor" stroke="none"/>
    </svg>`,

  cerdo: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="7.2"/>
      <path d="M7.3 7.6c-.9-1-.9-2.2 0-2.9"/>
      <path d="M16.7 7.6c.9-1 .9-2.2 0-2.9"/>
      <circle cx="9" cy="10.3" r="0.9" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="10.3" r="0.9" fill="currentColor" stroke="none"/>
      <ellipse cx="12" cy="14.4" rx="3.4" ry="2.3"/>
      <circle cx="10.6" cy="14.4" r="0.5" fill="currentColor" stroke="none"/>
      <circle cx="13.4" cy="14.4" r="0.5" fill="currentColor" stroke="none"/>
    </svg>`,

  pollo: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.3 5.2c.3-1.6 1.7-2.4 2.9-1.9"/>
      <path d="M11.4 5c.2-1.7 1.6-2.6 2.9-2.1"/>
      <path d="M13.4 5.3c.2-1.4 1.4-2.1 2.4-1.7"/>
      <circle cx="11.8" cy="10" r="5.2"/>
      <path d="M16.6 10.5l3.2-0.9-1.3 2.6z"/>
      <circle cx="13.6" cy="8.8" r="0.9" fill="currentColor" stroke="none"/>
      <path d="M8.5 14.5c-.3 2.8 1.1 5.2 3.3 5.2s3.6-2.4 3.3-5.2"/>
    </svg>`,

  embutidos: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <g transform="rotate(-25 12 12)">
        <rect x="3.5" y="9.3" width="17" height="5.4" rx="2.7"/>
        <path d="M9 9.3v5.4"/>
        <path d="M15 9.3v5.4"/>
      </g>
    </svg>`,

  achuras: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3.2c1.7 2.1.9 3.4-.2 4.7-1.5 1.8-2.3 3.2-2.3 5.1a4.6 4.6 0 0 0 9.2 0c0-2-1-3.3-2.1-4.4.4 1.6-.4 2.6-1.2 3 .6-2.2-.3-4.5-1.7-6-.2 1.1-.9 1.9-1.8 2.2.3-1.9.2-3.3.1-4.6z"/>
    </svg>`,

  provoleta: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4.5 12L17 4.5a8 8 0 0 1 0 15z"/>
      <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="14.5" r="1" fill="currentColor" stroke="none"/>
    </svg>`,
};
