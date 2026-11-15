import { ic } from '../icons.js';
import { Entry } from '../types.js';

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function fmt(t: number): string {
  return new Date(t)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
}

export function renderJournalView(
  filteredEntries: Entry[],
  composerHtml: string
): string {
  const voices = filteredEntries.filter((e) => e.type === 'voice');

  const voicesHtml = voices.length
    ? voices
        .map((e) => {
          const ptsHtml = e.pts
            ? `<ul class="tk">${e.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`
            : '';

          return `
            <div class="card">
              <div class="e" data-e="${e.id}">
                <div class="eb">
                  <span class="mono">${fmt(e.t)}</span>
                  <p class="t">${esc(e.text)}</p>
                  <div class="aud">
                    <button class="play" data-p="${e.id}" aria-label="Play recording">
                      ${ic('play', 13)}
                    </button>
                    <div class="bar"><i id="b${e.id}" style="width:0%"></i></div>
                    <span class="mono">0:${String(e.dur || 0).padStart(2, '0')}</span>
                  </div>
                  ${ptsHtml}
                  <div style="display:flex;gap:12px;margin-top:12px">
                    <button class="ghost" style="padding:0;font-size:12px" data-action="edit-transcript">Edit transcript</button>
                    <button class="ghost" style="padding:0;font-size:12px" data-action="open-folder">${ic('folder', 13)} Open in folder</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join('')
    : '<p class="empty">No voice notes yet.</p>';

  return `
    <div class="narrow">
      <h2>Journal</h2>
      ${composerHtml}
      ${voicesHtml}
    </div>
  `;
}
