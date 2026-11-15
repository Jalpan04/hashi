import { ic } from '../../icons.js';

export function getAutoMealType() {
  const hr = new Date().getHours();
  if (hr < 11) return 'Breakfast';
  if (hr < 16) return 'Lunch';
  if (hr < 19) return 'Snack';
  return 'Dinner';
}

export function renderMealSheet(capturedPhoto, selectedType, flashMode) {
  const types = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const chipsHtml = types
    .map(
      (t) =>
        `<button class="chip ${t === selectedType ? 'on' : ''}" data-meal-type="${t}">${t}</button>`
    )
    .join('');

  const preview = capturedPhoto
    ? `<img src="${capturedPhoto}" class="viewfinder-preview" alt="Captured food">`
    : '';

  const viewfinderControls = capturedPhoto
    ? `
      <div class="viewfinder-top">
        <span class="mono" style="color:#FFF">Captured</span>
        <button class="ghost" id="retake-photo" style="color:#FFF;padding:4px 8px;font-size:13px">Retake</button>
      </div>
    `
    : `
      <div class="viewfinder-top">
        <button class="flash-chip" id="toggle-flash" style="cursor:pointer">
          ${ic('flash', 14)} ${flashMode.toUpperCase()}
        </button>
        <span class="mono" style="color:rgba(255,255,255,0.7)">CameraX</span>
      </div>
      <div class="viewfinder-shutter-bar">
        <button class="shutter-btn" id="shutter-btn" aria-label="Take photo">
          <i></i>
        </button>
      </div>
    `;

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Meal</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>

      <div class="viewfinder" id="vf">
        ${preview}
        ${viewfinderControls}
      </div>
      <input type="file" accept="image/*" capture="environment" id="fi" hidden>

      <div class="lbl" style="margin-left:0">Meal type</div>
      <div class="chips">${chipsHtml}</div>

      <input id="nm" placeholder="What did you eat? (e.g. 200g paneer, 2 rotis)">
      <input id="kc" type="number" inputmode="numeric" placeholder="Calories (optional)">

      <button class="go" data-s="meal">Save meal</button>
    </div>
  `;
}
