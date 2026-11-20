import { formatLocalTime } from '../api.js';
import { ic } from '../icons.js';
import { S } from '../state.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

const ICON = {
  voice: 'mic',
  meal: 'cam',
  note: 'pen',
};

function renderRow(e) {
  const isWaiting = e.status === 'pending';
  const timeStr = formatLocalTime(e.timestamp, e.tz_offset_minutes);

  let expandedBody = '';
  if (e.kind === 'meal') {
    const thumb = e.thumbnail_b64
      ? `<img src="${e.thumbnail_b64}" alt="" style="width:64px;height:64px;border-radius:10px;object-fit:cover;margin-top:8px;display:block">`
      : '';
    const macroText = e.kcal ? `${e.kcal} kcal` : 'Waiting for tonight';
    expandedBody = `<div class="row-detail">${thumb}<span class="mono">${esc(macroText)}</span></div>`;
  } else if (e.kind === 'voice') {
    const dur = e.duration_seconds ? `0:${String(e.duration_seconds).padStart(2, '0')}` : '';
    const bullets = e.summary_bullets?.length
      ? `<ul class="tk">${e.summary_bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
      : `<span class="mono">Waiting for tonight${dur ? ' · ' + dur : ''}</span>`;
    expandedBody = `<div class="row-detail">${bullets}</div>`;
  } else {
    expandedBody = `<div class="row-detail"><span class="mono">${esc(e.detail)}</span></div>`;
  }

  return `
    <div class="row" data-id="${esc(e.id)}">
      <span class="ic">${ic(ICON[e.kind] || 'pen', 18)}</span>
      <div style="flex:1;min-width:0">
        <p>${esc(e.title)}${isWaiting ? ' <span class="mono">· Waiting for tonight</span>' : ''}</p>
        ${expandedBody}
      </div>
      <span class="mono">${timeStr}</span>
    </div>
  `;
}

export function renderHomeView() {
  const h = S.home;
  const kcalPart =
    h.calories_today > 0
      ? `${h.calories_today.toLocaleString()} kcal`
      : h.has_pending_meals
      ? 'calories pending'
      : '0 kcal';
  const stepsPart = h.steps_today != null ? `${h.steps_today.toLocaleString()} steps` : '– steps';
  const streakPart = `${h.reading_streak_days} day reading streak`;

  const recentHtml = h.recent.length
    ? `<div class="list">${h.recent.map(renderRow).join('')}</div>`
    : '<p class="empty" style="margin-top:24px">Nothing captured yet.</p>';

  return `
    <div class="grid">
      <button class="tile p" data-c="meal">${ic('cam', 28)}Meal</button>
      <button class="tile" data-c="voice">${ic('mic', 28)}Voice</button>
      <button class="tile" data-c="note">${ic('pen', 28)}Note</button>
      <button class="tile" data-c="habit">${ic('chk', 28)}Habit</button>
    </div>
    <p class="today">${kcalPart} · ${stepsPart} · ${streakPart}</p>
    <p class="lbl">Recent</p>
    ${recentHtml}
  `;
}
