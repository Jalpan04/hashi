import { ic } from '../icons.js';
import { S } from '../state.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function fmt(t) {
  return new Date(t)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
}

function renderKanbanCard(e) {
  const tagsHtml = (e.tags && e.tags.length)
    ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        ${e.tags.map(t => `<span class="mono" style="font-size:11px;background:var(--hv);padding:2px 6px;border-radius:4px">#${esc(t)}</span>`).join('')}
       </div>`
    : '';

  const titleHtml = e.title ? `<div style="font-weight:600;margin-bottom:4px;font-size:13px">${esc(e.title)}</div>` : '';

  // Column move buttons
  const isInbox = e.status === 'raw';
  const isIncubating = e.status === 'incubating';
  const isActive = e.status === 'processed';
  const isArchive = e.status === 'merged' || e.status === 'archive';

  const moveOptions = [];
  if (!isInbox) moveOptions.push(`<button class="ghost" style="padding:2px 6px;font-size:11px" data-move-id="${e.id}" data-move-to="raw">Inbox</button>`);
  if (!isIncubating) moveOptions.push(`<button class="ghost" style="padding:2px 6px;font-size:11px" data-move-id="${e.id}" data-move-to="incubating">Incubate</button>`);
  if (!isActive) moveOptions.push(`<button class="ghost" style="padding:2px 6px;font-size:11px" data-move-id="${e.id}" data-move-to="processed">Active</button>`);
  if (!isArchive) moveOptions.push(`<button class="ghost" style="padding:2px 6px;font-size:11px" data-move-id="${e.id}" data-move-to="merged">Archive</button>`);

  return `
    <div class="card" style="margin-bottom:12px;padding:14px;background:var(--card);border:1px solid var(--line);border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="mono">${fmt(e.t)}</span>
        <button class="ghost" style="padding:2px 4px;font-size:12px;color:var(--mu)" data-delete-idea="${e.id}" title="Delete idea">${ic('x', 12)}</button>
      </div>
      ${titleHtml}
      <p style="margin:0;font-size:13px;line-height:1.45;color:var(--tx)">${esc(e.text)}</p>
      ${tagsHtml}
      <div style="display:flex;gap:4px;margin-top:10px;padding-top:8px;border-top:1px solid var(--line);flex-wrap:wrap">
        <span class="mono" style="font-size:10px;margin-right:4px;align-self:center">Move:</span>
        ${moveOptions.join('')}
      </div>
    </div>
  `;
}

function renderKanbanColumn(title, count, cardsHtml, colStatus) {
  return `
    <div style="flex:1;min-width:240px;background:var(--side);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--line)">
        <span style="font-weight:600;font-size:13px;letter-spacing:0.02em;text-transform:uppercase;color:var(--tx)">${title}</span>
        <span class="mono" style="background:var(--card);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${count}</span>
      </div>
      <div style="flex:1;overflow-y:auto">
        ${cardsHtml || `<p class="empty" style="font-size:12px;padding:16px 0;text-align:center;color:var(--mu)">No ideas</p>`}
      </div>
    </div>
  `;
}

export function renderIdeasView(filteredEntries, composerHtml, filterTag = 'all') {
  const notes = filteredEntries.filter((e) => e.type === 'note');

  const inboxNotes = notes.filter((e) => e.status === 'raw');
  const incubatingNotes = notes.filter((e) => e.status === 'incubating');
  const activeNotes = notes.filter((e) => e.status === 'processed');
  const archiveNotes = notes.filter((e) => e.status === 'merged' || e.status === 'archive');

  const isBoard = S.ideasViewMode === 'board';

  let contentHtml = '';

  if (isBoard) {
    contentHtml = `
      <div style="display:flex;gap:16px;align-items:stretch;overflow-x:auto;padding-bottom:16px;min-height:520px">
        ${renderKanbanColumn('Inbox', inboxNotes.length, inboxNotes.map(renderKanbanCard).join(''), 'raw')}
        ${renderKanbanColumn('Incubating', incubatingNotes.length, incubatingNotes.map(renderKanbanCard).join(''), 'incubating')}
        ${renderKanbanColumn('Active', activeNotes.length, activeNotes.map(renderKanbanCard).join(''), 'processed')}
        ${renderKanbanColumn('Archive', archiveNotes.length, archiveNotes.map(renderKanbanCard).join(''), 'merged')}
      </div>
    `;
  } else {
    // List view
    const filteredByTag = notes.filter((e) => {
      if (filterTag === 'all') return true;
      if (filterTag === 'raw') return e.status === 'raw';
      if (filterTag === 'incubating') return e.status === 'incubating';
      if (filterTag === 'processed') return e.status === 'processed';
      if (filterTag === 'merged') return e.status === 'merged' || e.status === 'archive';
      return true;
    });

    const notesHtml = filteredByTag.length
      ? filteredByTag.map(renderKanbanCard).join('')
      : '<p class="empty">No ideas in this view.</p>';

    contentHtml = `
      <div class="narrow">
        <div class="chips" style="margin-bottom:16px">
          <span class="chip ${filterTag === 'all' ? 'on' : ''}" data-filter="all">All</span>
          <span class="chip ${filterTag === 'raw' ? 'on' : ''}" data-filter="raw">Inbox</span>
          <span class="chip ${filterTag === 'incubating' ? 'on' : ''}" data-filter="incubating">Incubating</span>
          <span class="chip ${filterTag === 'processed' ? 'on' : ''}" data-filter="processed">Active</span>
          <span class="chip ${filterTag === 'merged' ? 'on' : ''}" data-filter="merged">Archive</span>
        </div>
        ${notesHtml}
      </div>
    `;
  }

  return `
    <div style="max-width:1200px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0">Ideas board</h2>
        <div class="chips" style="margin:0">
          <span class="chip ${isBoard ? 'on' : ''}" data-action="toggle-ideas-mode" data-mode="board">Kanban</span>
          <span class="chip ${!isBoard ? 'on' : ''}" data-action="toggle-ideas-mode" data-mode="list">List</span>
        </div>
      </div>
      <div style="max-width:640px;margin-bottom:20px">
        ${composerHtml}
      </div>
      ${contentHtml}
    </div>
  `;
}
