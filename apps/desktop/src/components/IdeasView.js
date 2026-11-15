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

export function renderIdeasView(filteredEntries, composerHtml, filterTag = 'all') {
  const notes = filteredEntries.filter((e) => e.type === 'note');

  const notesHtml = notes.length
    ? notes
        .map((e) => {
          return `
            <div class="card">
              <div class="e" data-e="${e.id}">
                <div class="eb">
                  <span class="mono">${fmt(e.t)}</span>
                  <p class="t">${esc(e.text)}</p>
                </div>
              </div>
            </div>
          `;
        })
        .join('')
    : '<p class="empty">No ideas yet.</p>';

  return `
    <div class="narrow">
      <h2>Ideas</h2>
      <div class="chips">
        <span class="chip ${filterTag === 'all' ? 'on' : ''}" data-filter="all">All</span>
        <span class="chip ${filterTag === 'raw' ? 'on' : ''}" data-filter="raw">Raw</span>
        <span class="chip ${filterTag === 'processed' ? 'on' : ''}" data-filter="processed">Processed</span>
        <span class="chip ${filterTag === 'merged' ? 'on' : ''}" data-filter="merged">Merged</span>
      </div>
      ${composerHtml}
      ${notesHtml}
    </div>
  `;
}
