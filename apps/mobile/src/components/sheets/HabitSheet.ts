import { ic } from '../../icons.js';
import { S } from '../../state.js';

export type HabitSegment = 'habits' | 'reading' | 'workout' | 'private';

export function renderHabitSheet(
  segment: HabitSegment,
  workoutPreset: 'treadmill' | 'strength' | 'mobility' | 'custom',
  privateUnlocked: boolean
): string {
  const segButtons = `
    <div class="segmented">
      <button class="${segment === 'habits' ? 'on' : ''}" data-hseg="habits">Habits</button>
      <button class="${segment === 'reading' ? 'on' : ''}" data-hseg="reading">Reading</button>
      <button class="${segment === 'workout' ? 'on' : ''}" data-hseg="workout">Workout</button>
      <button class="${segment === 'private' ? 'on' : ''}" data-hseg="private">Private</button>
    </div>
  `;

  let contentHtml = '';

  if (segment === 'habits') {
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

    contentHtml = `
      <div class="card" style="padding-top:8px;padding-bottom:8px">
        ${habitsHtml}
      </div>
      <button class="go" data-s="close">Done</button>
    `;
  } else if (segment === 'reading') {
    contentHtml = `
      <div class="card">
        <div class="lbl">Active book</div>
        <div style="font-size:16px;font-weight:500;margin-bottom:12px">${S.reading.title}</div>
        
        <div class="lbl">Pages read today</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
          <input type="number" id="reading-pages" value="15" style="margin:0;max-width:100px">
          <button class="chip" data-reading-add="5">+5</button>
          <button class="chip" data-reading-add="10">+10</button>
          <button class="chip" data-reading-add="25">+25</button>
        </div>

        <div class="lbl">Minutes read</div>
        <input type="number" id="reading-mins" value="25">
      </div>
      <button class="go" data-action="save-reading">Log reading</button>
    `;
  } else if (segment === 'workout') {
    const presets = ['treadmill', 'strength', 'mobility', 'custom'];
    const presetChips = presets
      .map(
        (p) =>
          `<button class="chip ${p === workoutPreset ? 'on' : ''}" data-workout-preset="${p}">
            ${p.charAt(0).toUpperCase() + p.slice(1)}
          </button>`
      )
      .join('');

    let formFields = '';
    if (workoutPreset === 'treadmill') {
      formFields = `
        <input type="number" id="w-dur" placeholder="Duration (minutes)" value="30">
        <input type="number" id="w-speed" placeholder="Speed (km/h)" value="9.5">
        <input type="number" id="w-incline" placeholder="Incline (%)" value="2.0">
      `;
    } else if (workoutPreset === 'strength') {
      formFields = `
        <input id="w-exercise" placeholder="Exercise name (e.g. Bench press)">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <input type="number" id="w-sets" placeholder="Sets" value="4">
          <input type="number" id="w-reps" placeholder="Reps" value="10">
          <input type="number" id="w-weight" placeholder="Weight (kg)" value="60">
        </div>
      `;
    } else {
      formFields = `
        <input type="number" id="w-dur" placeholder="Duration (minutes)" value="20">
        <textarea id="w-notes" placeholder="Workout notes / exercises"></textarea>
      `;
    }

    contentHtml = `
      <div class="lbl" style="margin-left:0">Workout type</div>
      <div class="chips">${presetChips}</div>
      <div class="card">${formFields}</div>
      <button class="go" data-action="save-workout">Log workout</button>
    `;
  } else if (segment === 'private') {
    if (!privateUnlocked) {
      contentHtml = `
        <div class="card" style="display:flex;flex-direction:column;gap:16px;text-align:center;padding:32px 20px">
          <div style="margin:0 auto;color:var(--ac)">${ic('lock', 36)}</div>
          <div style="font-size:16px;font-weight:500">Biometric or PIN required</div>
          <p class="mono" style="margin:0">Encrypted private habit log. Excluded from feeds and sync summaries.</p>
          <button class="go" data-action="unlock-mobile-private">Authenticate</button>
        </div>
      `;
    } else {
      const triggers = ['Boredom', 'Stress', 'Late night', 'Phone in bed', 'Other'];
      const triggerButtons = triggers
        .map((t) => `<button class="chip on" data-priv-trigger="${t}">${t}</button>`)
        .join('');

      contentHtml = `
        <div class="card">
          <div class="lbl">Trigger tag</div>
          <div class="chips" style="flex-wrap:wrap">${triggerButtons}</div>
          <input id="priv-place" placeholder="Location (optional, coarse)">
          <textarea id="priv-note" placeholder="Optional reflection note"></textarea>
        </div>
        <button class="go" data-action="save-private-entry">Save entry</button>
      `;
    }
  }

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Habits</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>
      ${segButtons}
      ${contentHtml}
    </div>
  `;
}
