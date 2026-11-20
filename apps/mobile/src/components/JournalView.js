import { dateStrWithOffset, formatLocalTime } from '../api.js';
import { S } from '../state.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function journalDateLabel() {
  if (S.journalDayOffset === 0) return 'Today';
  if (S.journalDayOffset === -1) return 'Yesterday';
  const d = new Date();
  d.setDate(d.getDate() + S.journalDayOffset);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function renderJournalView() {
  const voices = S.journalEntries;
  const dateVal = dateStrWithOffset(S.journalDayOffset);

  const switcher = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <button class="chip" data-jday="-1" aria-label="Previous day" style="min-width:44px;min-height:36px">‹</button>
      <label style="font-weight:500;cursor:pointer;position:relative">
        <span>${journalDateLabel()}</span>
        <input type="date" id="journal-date-picker" value="${dateVal}" max="${dateStrWithOffset(0)}" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;margin:0;padding:0;cursor:pointer">
      </label>
      <button class="chip" data-jday="1" aria-label="Next day" style="min-width:44px;min-height:36px;${S.journalDayOffset >= 0 ? 'opacity:0.4' : ''}" ${S.journalDayOffset >= 0 ? 'disabled' : ''}>›</button>
    </div>
  `;

  const cardsHtml = voices.length
    ? voices
        .map((e) => {
          const timeStr = formatLocalTime(e.recorded_at, e.tz_offset_minutes);
          const durStr = `0:${String(e.duration_seconds || 0).padStart(2, '0')}`;
          const isPending = e.status === 'pending' || (!e.summary_bullets && !e.transcript);

          const bodyHtml = isPending
            ? `<p class="mono" style="margin:10px 0 0">Summary arrives after tonight’s run</p>`
            : `
              ${e.summary_bullets?.length ? `<ul class="tk">${e.summary_bullets.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
              ${
                e.edited_transcript || e.transcript
                  ? `<details style="margin-top:10px"><summary class="mono" style="cursor:pointer">Full transcript</summary><p style="margin:8px 0 0;font-size:14px">${esc(e.edited_transcript || e.transcript)}</p></details>`
                  : ''
              }
            `;

          const storageHint = e.audio_file_path
            ? 'Saved locally · moves to PC on sync'
            : 'Audio is stored on the PC';

          return `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:500">${timeStr}</span>
                <span class="mono">${durStr}</span>
              </div>
              ${bodyHtml}
              <div style="margin-top:12px">
                <span class="mono" style="font-size:11px">${storageHint}</span>
              </div>
            </div>
          `;
        })
        .join('')
    : '<p class="empty">No voice entries for this day.</p>';

  return `
    ${switcher}
    ${cardsHtml}
    <button class="fab" data-c="voice">+ Record</button>
  `;
}
