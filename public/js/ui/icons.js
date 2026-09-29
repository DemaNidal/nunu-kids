// كل الأيقونات بمكان واحد. الاستخدام: icon('cart') أو icon('wa', 'ic--sm')

const PATHS = {
  // أيقونات الواجهة (24×24، خط)
  bag: '<path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  leaf: '<path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15zM5 19l7-7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  pin: '<path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1a4 4 0 0 1-2-2l1-1-1-2z"/>',
  gift: '<rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M3 7h18v3H3zM12 7v13M12 7C9 3 6 4 7.5 6.5 8 7 12 7 12 7s4 0 4.5-.5C18 4 15 3 12 7z"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};

// شعارات السوشال ميديا (معبّاة)
const BRANDS = {
  facebook: '<path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z"/>',
  instagram: '<path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 4.6c2.4 0 2.7 0 3.6.1 2.4.1 3.6 1.3 3.7 3.7.1.9.1 1.2.1 3.6s0 2.7-.1 3.6c-.1 2.4-1.3 3.6-3.7 3.7-.9.1-1.2.1-3.6.1s-2.7 0-3.6-.1c-2.4-.1-3.6-1.3-3.7-3.7-.1-.9-.1-1.2-.1-3.6s0-2.7.1-3.6C4.8 6 6 4.8 8.4 4.7c.9-.1 1.2-.1 3.6-.1zM12 3c-2.4 0-2.8 0-3.7.1C5 3.2 3.2 5 3.1 8.3 3 9.2 3 9.6 3 12s0 2.8.1 3.7c.1 3.3 1.9 5.1 5.2 5.2.9.1 1.3.1 3.7.1s2.8 0 3.7-.1c3.3-.1 5.1-1.9 5.2-5.2.1-.9.1-1.3.1-3.7s0-2.8-.1-3.7C20.8 5 19 3.2 15.7 3.1 14.8 3 14.4 3 12 3z"/>',
};

// رسومات الأقسام (64×64)
const GARMENTS = {
  onesie: '<path d="M22 8h20l12 8-5 9-6-3v18c0 6-4 10-8 14h-6c-4-4-8-8-8-14V22l-6 3-5-9z"/><path d="M26 8q6 7 12 0"/><path d="M29 54h6"/>',
  sleeper: '<path d="M24 6h16l14 10-4 14-6-2v16l2 14H36l-4-12-4 12H18l2-14V28l-6 2-4-14z"/><path d="M28 6q4 5 8 0M32 12v14"/>',
  hat: '<path d="M16 44q0-28 16-28t16 28"/><rect x="13" y="44" width="38" height="9" rx="4"/><circle cx="32" cy="12" r="4"/>',
  socks: '<path d="M20 8h12v26l10 8q5 7-2 12H26q-8 0-8-9z"/><path d="M20 15h12"/>',
  bib: '<path d="M22 12q10 14 20 0q12 6 12 22a22 22 0 0 1-44 0q0-16 12-22z"/><path d="M26 38q6 5 12 0"/>',
  blanket: '<rect x="10" y="14" width="44" height="36" rx="6"/><path d="M10 36h44M22 14v36"/>',
};

export const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`;
export const brandIcon = (name, cls = '') => `<svg class="brand ${cls}" viewBox="0 0 24 24" aria-hidden="true">${BRANDS[name]}</svg>`;
export const garment = (name) => `<svg class="garment" viewBox="0 0 64 64" aria-hidden="true">${GARMENTS[name]}</svg>`;
