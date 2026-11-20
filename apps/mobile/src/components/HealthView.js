import { formatLocalTime } from '../api.js';
import { ic } from '../icons.js';
import { S } from '../state.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function formatSleep(minutes) {
  if (!minutes || minutes <= 0) return '–';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function renderHealthView() {
  const h = S.health;
  const target = h.calorie_target || 2200;
  const pct = Math.min(100, (h.calories_today / target) * 100);
  const calMain =
    h.calories_today > 0
      ? h.calories_today.toLocaleString()
      : h.has_pending_meals
      ? 'Pending'
      : '0';

  const macroLine =
    h.protein_today > 0 || h.carbs_today > 0 || h.fat_today > 0
      ? `Protein ${Math.round(h.protein_today)}g · Carbs ${Math.round(h.carbs_today)}g · Fat ${Math.round(h.fat_today)}g`
      : h.has_pending_meals
      ? 'Macros arrive after tonight’s run'
      : 'No meals logged today';

  const stepsStr = h.metrics?.steps != null ? h.metrics.steps.toLocaleString() : '–';
  const sleepStr = formatSleep(h.metrics?.sleep_minutes_total);

  const habitsHtml = h.habits.length
    ? h.habits
        .map(
          (item) => `
          <button class="chk ${item.done ? 'd' : ''}" data-habit-id="${esc(item.id)}">
            <span class="box">${item.done ? ic('chk', 14) : ''}</span>
            <span>${esc(item.name)}</span>
          </button>
        `
        )
        .join('')
    : '<p class="mono" style="padding:12px 0">No habits yet. Add them from Habit.</p>';

  const activeBook = h.books[0];
  let readingCard = `
    <div class="card">
      <div class="lbl" style="margin-left:0">Reading</div>
      <p class="mono" style="margin:0">No active book yet. Add one in Habit.</p>
    </div>
  `;
  if (activeBook) {
    const readPct = activeBook.total_pages
      ? Math.min(100, (activeBook.pages_read_total / activeBook.total_pages) * 100)
      : 0;
    const progressText = activeBook.total_pages
      ? `Page ${activeBook.pages_read_total} of ${activeBook.total_pages}`
      : `${activeBook.pages_read_total} pages read`;
    readingCard = `
      <div class="card">
        <div class="lbl" style="margin-left:0">Reading · ${esc(activeBook.title)}</div>
        ${activeBook.total_pages ? `<div class="bar"><i style="width:${readPct}%"></i></div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <span class="mono">${progressText}</span>
          <span class="mono">${activeBook.minutes_today} min today</span>
        </div>
      </div>
    `;
  }

  const workoutsHtml = h.recent_workouts.length
    ? `
      <div class="card">
        <div class="lbl" style="margin-left:0">Recent workouts</div>
        ${h.recent_workouts
          .slice(0, 3)
          .map(
            (w) => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">
              <span>${esc(w.workout_type.charAt(0).toUpperCase() + w.workout_type.slice(1))}${w.notes ? ' · ' + esc(w.notes) : ''}</span>
              <span class="mono">${w.duration_minutes} min · ${formatLocalTime(w.timestamp, w.tz_offset_minutes)}</span>
            </div>
          `
          )
          .join('')}
      </div>
    `
    : '';

  const reportCard = h.latest_weekly_report
    ? `
      <div class="card">
        <div class="lbl" style="margin-left:0">Weekly exercise report</div>
        <p style="margin:0;font-size:14px">${esc(h.latest_weekly_report.exercise_analysis)}</p>
      </div>
    `
    : `
      <div class="card">
        <div class="lbl" style="margin-left:0">Weekly exercise report</div>
        <p class="mono" style="margin:0">Compiled on Sunday night after sync.</p>
      </div>
    `;

  return `
    <div class="card">
      <div class="lbl" style="margin-left:0">Calories</div>
      <div class="big">
        ${calMain}
        <span style="font-size:15px;color:var(--mu);font-weight:400">of ${target.toLocaleString()}</span>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <span class="mono">${macroLine}</span>
    </div>

    <div class="two">
      <div class="card">
        <div class="lbl" style="margin-left:0">Steps</div>
        <div class="big">${stepsStr}</div>
      </div>
      <div class="card">
        <div class="lbl" style="margin-left:0">Sleep</div>
        <div class="big">${sleepStr}</div>
      </div>
    </div>

    <div class="card" style="padding-top:8px;padding-bottom:8px">
      ${habitsHtml}
    </div>

    ${readingCard}
    ${workoutsHtml}
    ${reportCard}

    <button class="card" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;color:var(--mu);padding:14px" data-action="refresh-health-connect">
      ${ic('refresh', 16)} Refresh from Health Connect
    </button>
  `;
}
