import { ic } from '../icons.js';
import { kcalTotal, S, streakDays } from '../state.js';
import { MobileEntry } from '../types.js';

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

const ICON: Record<string, string> = {
  voice: 'mic',
  meal: 'cam',
  note: 'pen'
};

function renderRow(e: MobileEntry): string {
  const waitingHint = e.status === 'waiting' ? '<span class="mono" style="font-size:11px;color:var(--ac)"> · Waiting for tonight</span>' : '';
  return `
    <div class="row" data-id="${e.id}">
      <span class="ic">${ic(ICON[e.type], 18)}</span>
      <p>${esc(e.text)}${waitingHint}</p>
      <span class="mono">${fmt(e.t)}</span>
    </div>
  `;
}

export function renderHomeView(): string {
  const es = S.entries.slice().sort((a, b) => b.t - a.t);
  const recentHtml = es.slice(0, 3).map(renderRow).join('');

  return `
    <div class="grid">
      <button class="tile p" data-c="meal">${ic('cam', 28)}Meal</button>
      <button class="tile" data-c="voice">${ic('mic', 28)}Voice</button>
      <button class="tile" data-c="note">${ic('pen', 28)}Note</button>
      <button class="tile" data-c="habit">${ic('chk', 28)}Habit</button>
    </div>
    <p class="today">${kcalTotal().toLocaleString()} kcal · 8,420 steps · ${streakDays()} day streak</p>
    <p class="lbl">Recent</p>
    <div class="list">
      ${recentHtml || '<p class="mono" style="padding:16px 0">No entries yet.</p>'}
    </div>
  `;
}
