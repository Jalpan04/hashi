import { formatLocalTime } from '../api.js';
import { ic } from '../icons.js';
import { S } from '../state.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function statusLabel(idea) {
  if (idea.status === 'merged') return 'merged';
  if (idea.dirty) return 'edited here';
  return 'synced';
}

function renderIdeaRow(idea) {
  const heading = idea.title || idea.raw_text.split('\n')[0] || 'Untitled';
  const timeStr = formatLocalTime(idea.updated_at, idea.tz_offset_minutes);
  const st = statusLabel(idea);

  return `
    <div class="row" data-open-idea="${esc(idea.id)}">
      <span class="ic">${ic('pen', 18)}</span>
      <div style="flex:1;min-width:0">
        <p>${esc(heading)}</p>
        <span class="mono">${st}${idea.tags?.length ? ' · ' + idea.tags.map(esc).join(', ') : ''}</span>
      </div>
      <span class="mono">${timeStr}</span>
    </div>
  `;
}

export function renderIdeasView() {
  const baseTags = ['all', 'dev', 'poetry', 'film', 'general'];
  const extraTags = new Set();
  for (const i of S.ideas) {
    for (const t of i.tags || []) {
      if (!baseTags.includes(t)) extraTags.add(t);
    }
  }
  const allTags = [...baseTags, ...Array.from(extraTags)];

  const tagChips = allTags
    .map((t) => {
      const label = t === 'all' ? 'All' : t;
      return `<button class="chip ${S.ideasTag === t ? 'on' : ''}" data-idea-filter-tag="${esc(t)}">${esc(label)}</button>`;
    })
    .join('');

  const listHtml = S.ideas.length
    ? `<div class="list">${S.ideas.map(renderIdeaRow).join('')}</div>`
    : '<p class="empty">No ideas yet.</p>';

  return `
    <input id="ideas-search" placeholder="Search ideas" value="${esc(S.ideasSearch)}" style="margin-bottom:10px">
    <div class="chips" style="margin-bottom:12px">${tagChips}</div>
    ${listHtml}
    <button class="fab" data-c="note">+ New idea</button>
  `;
}
