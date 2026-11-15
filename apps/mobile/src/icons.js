export const P = {
  cam: '<path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  pen: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  chk: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3 11v2h6v-2a6 6 0 00-3-11z"/>',
  pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  book: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  flash: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
  refresh: '<path d="M21 12a9 9 0 00-15.5-6.4L3 8m0-5v5h5M3 12a9 9 0 0015.5 6.4L21 16m0 5v-5h-5"/>',
  chevronRight: '<path d="M9 18l6-6-6-6"/>'
};

export function ic(name, size = 22) {
  const path = P[name] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
