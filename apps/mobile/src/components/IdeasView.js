import { ic } from '../icons.js';
import { S } from '../state.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function fmt(t) {
  return new Date(t)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
}

function renderRow(e) {
  return `
    <div class="row" data-id="${e.id}">
      <span class="ic">${ic('pen', 18)}</span>
      <p>${esc(e.text)}</p>
      <span class="mono">${fmt(e.t)}</span>
    </div>
  `;
}

export function renderIdeasView() {
  const notes = S.entries
    .filter((e) => e.type === 'note')
    .sort((a, b) => b.t - a.t);

  const listHtml = notes.length
    ? `<div class="list">${notes.map(renderRow).join('')}</div>`
    : '<p class="empty">No ideas yet.</p>';

  return `
    ${listHtml}
    <button class="fab" data-c="note">+ New idea</button>
  `;
}
