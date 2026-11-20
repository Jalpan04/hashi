import { formatLocalTime } from '../../api.js';
import { ic } from '../../icons.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

export function renderNoteSheet({
  editingIdeaId,
  titleValue,
  textValue,
  selectedTags,
  showHistory,
  revisions,
  confirmDelete,
}) {
  const baseTags = ['dev', 'poetry', 'film', 'general'];
  const allTags = Array.from(new Set([...baseTags, ...(selectedTags || [])]));

  const tagsHtml = allTags
    .map((t) => {
      const on = (selectedTags || []).includes(t) ? 'on' : '';
      return `<button class="chip ${on}" data-note-tag="${esc(t)}">${esc(t)}</button>`;
    })
    .join('');

  let historyPanel = '';
  if (editingIdeaId && showHistory) {
    const revItems = (revisions || [])
      .map(
        (r) => `
        <div class="card" style="padding:12px 14px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span class="mono">${esc(r.rev_type)}</span>
            <span class="mono">${formatLocalTime(r.timestamp)}</span>
          </div>
          <p style="margin:0;font-size:13px;white-space:pre-wrap">${esc(r.content)}</p>
        </div>
      `
      )
      .join('');
    historyPanel = `
      <div style="margin-bottom:12px">
        <div class="lbl" style="margin-left:0">Revision history</div>
        ${revItems || '<p class="mono">No revisions recorded.</p>'}
      </div>
    `;
  }

  const headerActions = editingIdeaId
    ? `
      <div style="display:flex;gap:8px;align-items:center">
        <button class="chip ${showHistory ? 'on' : ''}" data-action="toggle-idea-history" style="padding:6px 10px;font-size:12px">History</button>
        <button data-s="close" aria-label="Close" style="min-width:44px;min-height:44px;display:grid;place-items:center">${ic('x')}</button>
      </div>
    `
    : `<button data-s="close" aria-label="Close" style="min-width:44px;min-height:44px;display:grid;place-items:center">${ic('x')}</button>`;

  const footerHtml = editingIdeaId
    ? `
      <div style="display:flex;gap:10px;margin-top:auto">
        ${
          confirmDelete
            ? `<button class="card" style="flex:1;text-align:center;padding:15px;margin:0;color:#EF4444;border-color:#EF4444" data-action="confirm-delete-idea">Confirm delete</button>`
            : `<button class="card" style="flex:1;text-align:center;padding:15px;margin:0;color:var(--mu)" data-action="ask-delete-idea">Delete</button>`
        }
        <button class="go" style="flex:2;margin:0" data-s="note">Save</button>
      </div>
    `
    : `<button class="go" data-s="note">Save</button>`;

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>${editingIdeaId ? 'Edit idea' : 'Note'}</h1>
        ${headerActions}
      </div>

      ${historyPanel}

      <input id="note-ttl" placeholder="Title (optional)" value="${esc(titleValue)}">
      <textarea id="tx" placeholder="What’s on your mind?">${esc(textValue)}</textarea>

      <div class="lbl" style="margin-left:0">Tags</div>
      <div class="chips" style="margin-bottom:8px">${tagsHtml}</div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input id="custom-tag-input" placeholder="Add custom tag" style="margin:0;padding:10px 12px;font-size:13px">
        <button class="chip" data-action="add-custom-tag" style="padding:10px 14px">Add</button>
      </div>

      ${footerHtml}
    </div>
  `;
}
