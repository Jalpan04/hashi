import { ic } from '../icons.js';
import { S } from '../state.js';

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

export function renderJournalView(): string {
  const voices = S.entries
    .filter((e) => e.type === 'voice')
    .sort((a, b) => b.t - a.t);

  const cardsHtml = voices.length
    ? voices
        .map((e) => {
          const ptsHtml = e.pts
            ? `<ul class="tk">${e.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`
            : '';

          return `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:500">${esc(e.text)}</span>
                <span class="mono">${fmt(e.t)}</span>
              </div>
              <div class="aud">
                <button class="play" data-p="${e.id}" aria-label="Play recording">
                  ${ic('play', 14)}
                </button>
                <div class="bar"><i style="width:0%" id="b${e.id}"></i></div>
                <span class="mono">0:${String(e.dur || 0).padStart(2, '0')}</span>
              </div>
              ${ptsHtml}
              <div style="margin-top:12px;display:flex;justify-content:space-between">
                <span class="mono" style="font-size:11px">Audio archived on PC</span>
              </div>
            </div>
          `;
        })
        .join('')
    : '<p class="empty">No voice notes yet.</p>';

  return `
    ${cardsHtml}
    <button class="fab" data-c="voice">+ Record</button>
  `;
}
