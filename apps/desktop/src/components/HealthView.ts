import { ic } from '../icons.js';
import { S } from '../state.js';

export function renderHealthView(): string {
  const habitsHtml = S.habits
    .map(([name, done], i) => {
      return `
        <button class="chk ${done ? 'd' : ''}" data-h="${i}">
          <span class="box">${done ? ic('chk', 13) : ''}</span>
          <span>${name}</span>
        </button>
      `;
    })
    .join('');

  const readingPct = Math.min(
    100,
    (S.reading.currentPage / S.reading.totalPages) * 100
  );

  return `
    <div class="narrow">
      <h2>Health</h2>
      
      <!-- Weekly Exercise Report (Sunday night AI result) -->
      <div class="card" style="border-left: 3px solid var(--ac)">
        <div class="lbl">Weekly exercise report · Sun 15 Nov</div>
        <p style="margin:4px 0 8px;font-weight:500">Strong volume consistency. 4 workouts completed (+12% vs last week).</p>
        <p style="color:var(--mu);margin:0 0 10px;font-size:13px">
          Treadmill intervals: 3 sessions, avg 32m. Progressive overload achieved on dumbbell bench press (24kg x 8 reps). Recommendation: add 1 dedicated mobility recovery session on Wednesday.
        </p>
        <span class="mono">Consistency score: 92%</span>
      </div>

      <div class="two" style="margin-top:0">
        <div class="card">
          <div class="lbl">Resting heart rate</div>
          <div class="big">58 bpm</div>
        </div>
        <div class="card">
          <div class="lbl">Active burn</div>
          <div class="big">420 kcal</div>
        </div>
      </div>

      <!-- Habits Card -->
      <div class="card">
        <div class="lbl">Habits</div>
        ${habitsHtml}
      </div>

      <!-- Reading Tracker Card -->
      <div class="card">
        <div class="lbl">Reading · Active book</div>
        <div style="font-size:16px;font-weight:500">${S.reading.title}</div>
        <div class="bar"><i style="width:${readingPct}%"></i></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <span class="mono">Page ${S.reading.currentPage} of ${S.reading.totalPages} (${Math.round(readingPct)}%)</span>
          <span class="mono">${S.reading.minutesToday} min today</span>
        </div>
      </div>
    </div>
  `;
}
