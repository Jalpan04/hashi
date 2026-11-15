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

const ICON = {
  voice: 'mic',
  meal: 'cam',
  note: 'pen'
};

function renderTimelineRow(e) {
  const tab = e.type === 'meal' ? 'food' : e.type === 'voice' ? 'journal' : 'ideas';
  const det =
    e.type === 'meal'
      ? `${e.kcal || 0} kcal`
      : e.type === 'voice'
      ? `0:${String(e.dur || 0).padStart(2, '0')}`
      : '';

  return `
    <button class="tr" data-t="${tab}">
      <span class="mono tm">${fmt(e.t)}</span>
      <span class="ic">${ic(ICON[e.type], 16)}</span>
      <span class="tx">${esc(e.text)}</span>
      <span class="mono">${det}</span>
    </button>
  `;
}

export function renderTodayView(filteredEntries, composerHtml) {
  const isToday = S.off === 0;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + S.off);

  const list = filteredEntries.filter(
    (e) => new Date(e.t).toDateString() === targetDate.toDateString()
  );

  const mk = (t) => list.filter((e) => e.type === t);
  const meals = mk('meal');
  const voices = mk('voice');
  const notes = mk('note');

  const totalKcal = meals.reduce((a, e) => a + (e.kcal || 0), 0);
  const habitsDone = S.habits.filter((x) => x[1]).length;
  const streak = 14 + (S.habits.every((x) => x[1]) ? 1 : 0);

  const timelineHtml = list.length
    ? list.slice().reverse().map(renderTimelineRow).join('')
    : '<p class="empty" style="margin:12px 0">Nothing logged.</p>';

  return `
    <div class="narrow2">
      <h2>Your day</h2>
      <p class="sum">${meals.length} meals · ${voices.length} voice notes · ${notes.length} ideas</p>
      
      <div class="four">
        <div class="card">
          <div class="lbl">Calories</div>
          <div class="big">${totalKcal.toLocaleString()}</div>
          <div class="bar"><i style="width:${Math.min(100, (totalKcal / 2200) * 100)}%"></i></div>
          <span class="mono">of 2,200</span>
        </div>
        <div class="card">
          <div class="lbl">Steps</div>
          <div class="big">${isToday ? '8,420' : '–'}</div>
        </div>
        <div class="card">
          <div class="lbl">Sleep</div>
          <div class="big">${isToday ? '7h 15m' : '–'}</div>
        </div>
        <div class="card">
          <div class="lbl">Habits</div>
          <div class="big">${habitsDone} of ${S.habits.length}</div>
          <span class="mono">${streak} day streak</span>
        </div>
      </div>

      ${composerHtml}

      <div class="lbl">Timeline</div>
      <div class="card tlc">
        ${timelineHtml}
      </div>
    </div>
  `;
}
