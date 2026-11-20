import { ic } from '../icons.js';

export function renderComposer(comp, photo, rt, sec) {
  if (!comp) return '';

  let h = `<div class="card"><div class="lbl">New ${comp === 'note' ? 'idea' : comp}</div>`;

  if (comp === 'meal') {
    h += `
      <div class="row2" style="margin-top:0">
        <div class="th" id="ph" style="cursor:pointer" title="Click to upload image">
          ${photo ? `<img src="${photo}" alt="">` : ic('cam', 24)}
        </div>
        <div style="flex:1;display:grid;gap:10px">
          <input id="nm" placeholder="What did you eat?">
          <div style="display:flex;gap:8px">
            <input id="kc" type="number" placeholder="Calories (e.g. 520)" style="flex:1">
            <select id="mt" style="flex:1;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px 10px;font:inherit;color:var(--tx)">
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="breakfast">Breakfast</option>
              <option value="snack">Snack</option>
            </select>
          </div>
        </div>
      </div>
      <input type="file" accept="image/*" id="fi" hidden>
    `;
  }

  if (comp === 'note') {
    h += `
      <div style="display:grid;gap:10px">
        <input id="ti" placeholder="Title (optional, e.g. Local sync architecture)">
        <textarea id="tx" rows="3" placeholder="What's on your mind?"></textarea>
        <input id="tg" placeholder="Tags (comma separated, e.g. architecture, sync)">
      </div>
    `;
  }

  if (comp === 'voice') {
    const elapsed = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const pct = Math.min(100, (sec / 60) * 100);
    h += `
      <div class="row2" style="margin-top:0">
        <button class="play" id="rc" style="width:44px;height:44px">
          ${ic(rt ? 'stop' : 'mic', 20)}
        </button>
        <div class="bar" style="flex:1;margin:0">
          <i id="rb" style="width:${pct}%"></i>
        </div>
        <span class="mono" id="tm">${elapsed} / 1:00</span>
      </div>
    `;
  }

  return (
    h +
    `
      <div class="row2" style="margin-top:12px">
        <button class="go" data-s="save">Save</button>
        <button class="ghost" data-s="cancel">Cancel</button>
      </div>
    </div>
  `
  );
}
