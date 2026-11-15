import { S } from '../state.js';

export function dateLabel() {
  const d = new Date();
  d.setDate(d.getDate() + S.off);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

export function renderTopbar() {
  return `
    <div class="date">
      <button id="pv" aria-label="Previous day">‹</button>
      <span id="dl">${dateLabel()}</span>
      <button id="nx" aria-label="Next day">›</button>
    </div>
    <input id="q" placeholder="Search (Ctrl+K)" aria-label="Search">
  `;
}
