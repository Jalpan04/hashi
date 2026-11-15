import { ic } from '../icons.js';

export function renderFab(menuOpen) {
  const menu = menuOpen
    ? `
      <div class="menu">
        <button data-c="meal">${ic('cam')}Meal</button>
        <button data-c="voice">${ic('mic')}Voice</button>
        <button data-c="note">${ic('pen')}Note</button>
      </div>
    `
    : '';

  return `
    <div class="fab">
      <button data-s="menu">+ New entry</button>
      ${menu}
    </div>
  `;
}
