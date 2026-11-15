import { ic } from '../icons.js';

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

function renderFoodTile(e) {
  const thumb = e.img ? `<img src="${e.img}" alt="">` : ic('cam', 28);
  return `
    <div class="ft" data-meal-id="${e.id}">
      <div class="th">${thumb}</div>
      <div class="mono">${fmt(e.t)}</div>
      <div class="fn">${esc(e.text)}</div>
      <div class="mono">${e.kcal || 0} kcal</div>
    </div>
  `;
}

export function renderFoodView(filteredEntries, composerHtml, selectedMeal) {
  const meals = filteredEntries.filter((e) => e.type === 'meal');
  const days = {};
  const keys = [];

  meals.forEach((e) => {
    const k = new Date(e.t).toDateString();
    if (!days[k]) {
      days[k] = [];
      keys.push(k);
    }
    days[k].push(e);
  });

  const todayStr = new Date().toDateString();

  const daysHtml = keys
    .map((k) => {
      const arr = days[k];
      const tot = arr.reduce((a, e) => a + (e.kcal || 0), 0);
      const lab =
        k === todayStr
          ? 'Today'
          : new Date(arr[0].t).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            });

      return `
        <div class="dayh">
          <span>${lab}</span>
          <span class="mono">${tot} kcal</span>
        </div>
        <div class="fg">
          ${arr.slice().reverse().map(renderFoodTile).join('')}
        </div>
      `;
    })
    .join('');

  let detailModal = '';
  if (selectedMeal) {
    const thumb = selectedMeal.img
      ? `<img src="${selectedMeal.img}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;">`
      : `<div style="height:140px;background:var(--hv);border-radius:12px;display:grid;place-items:center;color:var(--mu);">${ic('cam', 36)}</div>`;

    detailModal = `
      <div class="card" style="margin-top:20px;border-color:var(--ac)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="lbl" style="margin:0">Meal detail</div>
          <button class="ghost" data-s="close-meal-detail">${ic('x', 16)}</button>
        </div>
        ${thumb}
        <h3 style="font-size:18px;margin:12px 0 4px">${esc(selectedMeal.text)}</h3>
        <p class="mono" style="color:var(--tx);font-size:14px;margin:4px 0 12px">
          ${selectedMeal.kcal || 0} kcal · ${selectedMeal.pro || 0}g protein · ${selectedMeal.carbs || 0}g carbs · ${selectedMeal.fat || 0}g fat
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
          <button class="go" style="padding:7px 14px;font-size:12px" data-action="edit-macros">Edit macros</button>
          <button class="ghost" style="padding:7px 14px;font-size:12px" data-action="re-analyze">Re-analyze</button>
          <button class="ghost" style="padding:7px 14px;font-size:12px" data-action="open-folder">${ic('folder', 14)} Open in folder</button>
          <button class="ghost" style="padding:7px 14px;font-size:12px;color:#EF4444" data-action="delete-meal">Delete</button>
        </div>
      </div>
    `;
  }

  return `
    <h2>Food</h2>
    ${composerHtml}
    ${detailModal}
    ${daysHtml || '<p class="empty">No meals yet.</p>'}
  `;
}
