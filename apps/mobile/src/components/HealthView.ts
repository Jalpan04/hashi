import { ic } from '../icons.js';
import { kcalTotal, S } from '../state.js';

export function renderHealthView(): string {
  const k = kcalTotal();
  const pct = Math.min(100, (k / 2200) * 100);

  const habitsHtml = S.habits
    .map(([name, done], i) => {
      return `
        <button class="chk ${done ? 'd' : ''}" data-h="${i}">
          <span class="box">${done ? ic('chk', 14) : ''}</span>
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
    <!-- Calories Card -->
    <div class="card">
      <div class="lbl" style="margin-left:0">Calories</div>
      <div class="big">
        ${k.toLocaleString()}
        <span style="font-size:15px;color:var(--mu);font-weight:400">of 2,200</span>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <span class="mono">Protein 112g · Carbs 190g · Fat 58g</span>
    </div>

    <!-- Steps & Sleep Cards -->
    <div class="two">
      <div class="card">
        <div class="lbl" style="margin-left:0">Steps</div>
        <div class="big">8,420</div>
      </div>
      <div class="card">
        <div class="lbl" style="margin-left:0">Sleep</div>
        <div class="big">7h 15m</div>
      </div>
    </div>

    <!-- Habits Checklist -->
    <div class="card" style="padding-top:8px;padding-bottom:8px">
      ${habitsHtml}
    </div>

    <!-- Reading Progress Card -->
    <div class="card">
      <div class="lbl" style="margin-left:0">Reading · ${S.reading.title}</div>
      <div class="bar"><i style="width:${readingPct}%"></i></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <span class="mono">Page ${S.reading.currentPage} of ${S.reading.totalPages}</span>
        <span class="mono">${S.reading.minutesToday} min today</span>
      </div>
    </div>

    <!-- Health Connect sync action -->
    <button class="card" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;color:var(--mu);padding:14px" data-action="refresh-health-connect">
      ${ic('refresh', 16)} Refresh from Health Connect
    </button>
  `;
}
