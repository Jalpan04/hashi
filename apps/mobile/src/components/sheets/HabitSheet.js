import { ic } from '../../icons.js';
import { S } from '../../state.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

export function renderHabitSheet({
  segment,
  editingHabits,
  selectedBookId,
  addingBook,
  workoutPreset,
}) {
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
    const habits = S.health.habits || [];
    if (editingHabits) {
      const editRows = habits
        .map(
          (h) => `
          <div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
            <input data-rename-input="${esc(h.id)}" value="${esc(h.name)}" style="margin:0;padding:8px 10px;font-size:14px">
            <button class="chip" data-action="save-rename-habit" data-habit-id="${esc(h.id)}" style="padding:8px 10px">Save</button>
            <button class="chip" data-action="archive-habit" data-habit-id="${esc(h.id)}" style="padding:8px 10px;color:#EF4444">Archive</button>
          </div>
        `
        )
        .join('');

      contentHtml = `
        <div class="card">
          <div class="lbl" style="margin-left:0">Add habit</div>
          <div style="display:flex;gap:8px;margin-bottom:14px">
            <input id="new-habit-name" placeholder="Habit name" style="margin:0;padding:10px 12px">
            <button class="chip on" data-action="create-habit" style="padding:10px 14px">Add</button>
          </div>
          <div class="lbl" style="margin-left:0">Manage habits</div>
          ${editRows || '<p class="mono">No active habits.</p>'}
        </div>
        <button class="go" data-action="toggle-edit-habits">Done editing</button>
      `;
    } else {
      const habitsHtml = habits.length
        ? habits
            .map(
              (h) => `
              <button class="chk ${h.done ? 'd' : ''}" data-habit-id="${esc(h.id)}">
                <span class="box">${h.done ? ic('chk', 14) : ''}</span>
                <span>${esc(h.name)}</span>
              </button>
            `
            )
            .join('')
        : '<p class="mono" style="padding:12px 0">No habits yet.</p>';

      contentHtml = `
        <div class="card" style="padding-top:8px;padding-bottom:8px">
          ${habitsHtml}
        </div>
        <div style="display:flex;gap:10px;margin-top:auto">
          <button class="card" style="flex:1;text-align:center;padding:15px;margin:0;color:var(--mu)" data-action="toggle-edit-habits">Edit list</button>
          <button class="go" style="flex:1;margin:0" data-s="close">Done</button>
        </div>
      `;
    }
  } else if (segment === 'reading') {
    const books = S.health.books || [];
    const activeId = selectedBookId || (books[0] ? books[0].id : '');

    const addBookPanel = addingBook
      ? `
        <div class="card">
          <div class="lbl" style="margin-left:0">Add book</div>
          <input id="new-book-title" placeholder="Book title">
          <input id="new-book-pages" type="number" inputmode="numeric" placeholder="Total pages (optional)">
          <div style="display:flex;gap:8px">
            <button class="chip on" data-action="create-book" style="padding:10px 16px">Add book</button>
            <button class="chip" data-action="cancel-add-book" style="padding:10px 16px">Cancel</button>
          </div>
        </div>
      `
      : '';

    const bookChips = books
      .map(
        (b) =>
          `<button class="chip ${b.id === activeId ? 'on' : ''}" data-select-book="${esc(b.id)}">${esc(b.title)}</button>`
      )
      .join('');

    contentHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="lbl" style="margin:0">Book</div>
        <button class="chip" data-action="show-add-book" style="padding:5px 10px;font-size:12px">+ Add book</button>
      </div>
      ${addBookPanel}
      <div class="chips">${bookChips || '<span class="mono">Add a book to start logging reading.</span>'}</div>

      <div class="card">
        <div class="lbl" style="margin-left:0">Pages read</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
          <input type="number" inputmode="numeric" id="reading-pages" value="10" style="margin:0;max-width:110px">
          <button class="chip" data-reading-add="5">+5</button>
          <button class="chip" data-reading-add="10">+10</button>
          <button class="chip" data-reading-add="25">+25</button>
        </div>

        <div class="lbl" style="margin-left:0">Minutes read</div>
        <input type="number" inputmode="numeric" id="reading-mins" value="20" style="margin:0">
      </div>
      <button class="go" data-action="save-reading" ${!activeId ? 'disabled style="opacity:0.5"' : ''}>Log</button>
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
        <input type="number" inputmode="numeric" id="w-dur" placeholder="Duration (minutes)" value="30">
        <input type="number" step="0.5" inputmode="decimal" id="w-incline" placeholder="Incline (%)" value="2.0">
        <input type="number" step="0.5" inputmode="decimal" id="w-speed" placeholder="Speed (km/h)" value="8.5" style="margin:0">
      `;
    } else if (workoutPreset === 'strength') {
      formFields = `
        <input id="w-exercise" placeholder="Exercise name (e.g. Dumbbell press)">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <input type="number" inputmode="numeric" id="w-sets" placeholder="Sets" value="3">
          <input type="number" inputmode="numeric" id="w-reps" placeholder="Reps" value="10">
          <input type="number" step="0.5" inputmode="decimal" id="w-weight" placeholder="Weight (kg)" value="20">
        </div>
        <input type="number" inputmode="numeric" id="w-dur" placeholder="Duration (minutes)" value="40" style="margin:0">
      `;
    } else {
      formFields = `
        <input type="number" inputmode="numeric" id="w-dur" placeholder="Duration (minutes)" value="20">
        <textarea id="w-notes" placeholder="Notes" style="min-height:90px;margin:0"></textarea>
      `;
    }

    contentHtml = `
      <div class="lbl" style="margin-left:0">Workout</div>
      <div class="chips">${presetChips}</div>
      <div class="card">${formFields}</div>
      <button class="go" data-action="save-workout">Log workout</button>
    `;
  } else if (segment === 'private') {
    contentHtml = `
      <div class="card" style="display:flex;flex-direction:column;gap:12px;text-align:center;padding:32px 20px">
        <div style="margin:0 auto;color:var(--mu)">${ic('lock', 32)}</div>
        <div style="font-size:16px;font-weight:500">Private vault</div>
        <p class="mono" style="margin:0;line-height:1.6">
          Encrypted SQLCipher storage and biometric unlock are built in Phase 7 so no unencrypted private entries are ever written to disk.
        </p>
      </div>
      <button class="go" data-s="close">Done</button>
    `;
  }

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Habit</h1>
        <button data-s="close" aria-label="Close" style="min-width:44px;min-height:44px;display:grid;place-items:center">${ic('x')}</button>
      </div>
      ${segButtons}
      ${contentHtml}
    </div>
  `;
}
