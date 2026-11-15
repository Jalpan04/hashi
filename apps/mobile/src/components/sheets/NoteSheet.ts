import { ic } from '../../icons.js';

export function renderNoteSheet(selectedTag: string): string {
  const suggestedTags = ['dev', 'poetry', 'film', 'general'];
  const tagsHtml = suggestedTags
    .map(
      (t) =>
        `<button class="chip ${t === selectedTag ? 'on' : ''}" data-note-tag="${t}">${t}</button>`
    )
    .join('');

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Note</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>

      <input id="note-ttl" placeholder="Title (optional)">
      <textarea id="tx" placeholder="What’s on your mind?"></textarea>

      <div class="lbl" style="margin-left:0">Suggested tags</div>
      <div class="chips" style="margin-bottom:20px">${tagsHtml}</div>

      <button class="go" data-s="note">Save</button>
    </div>
  `;
}
