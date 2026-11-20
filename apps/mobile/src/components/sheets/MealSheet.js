import { ic } from '../../icons.js';

export function getAutoMealType() {
  const hr = new Date().getHours();
  if (hr < 11) return 'Breakfast';
  if (hr < 16) return 'Lunch';
  if (hr < 19) return 'Snack';
  return 'Dinner';
}

export function renderMealSheet({
  capturedPhoto,
  selectedType,
  flashMode,
  cameraError,
  noteValue,
  kcalValue,
}) {
  const types = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const chipsHtml = types
    .map(
      (t) =>
        `<button class="chip ${t === selectedType ? 'on' : ''}" data-meal-type="${t}">${t}</button>`
    )
    .join('');

  const viewfinderBody = capturedPhoto
    ? `
      <img src="${capturedPhoto}" class="viewfinder-preview" alt="Captured meal">
      <div class="viewfinder-top">
        <span class="mono" style="color:#FFF;background:rgba(0,0,0,0.5);padding:3px 8px;border-radius:8px">Private storage</span>
        <button id="retake-photo" style="color:#FFF;background:rgba(0,0,0,0.6);padding:6px 12px;border-radius:10px;font-size:13px">Retake</button>
      </div>
    `
    : `
      <video id="vf-video" class="viewfinder-preview" autoplay playsinline muted></video>
      <div class="viewfinder-top">
        <button class="flash-chip" id="toggle-flash" style="cursor:pointer">
          ${ic('flash', 14)} ${flashMode}
        </button>
        <button class="flash-chip" id="pick-photo-file" style="cursor:pointer">
          Choose file
        </button>
      </div>
      ${
        cameraError
          ? `<div style="position:relative;z-index:2;text-align:center;font-size:12px;color:rgba(255,255,255,0.8);padding:0 12px">${cameraError}</div>`
          : ''
      }
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
        <button data-s="close" aria-label="Close" style="min-width:44px;min-height:44px;display:grid;place-items:center">${ic('x')}</button>
      </div>

      <div class="viewfinder" id="vf">
        ${viewfinderBody}
      </div>
      <input type="file" accept="image/*" capture="environment" id="fi" hidden>

      <div class="lbl" style="margin-left:0">Meal type</div>
      <div class="chips">${chipsHtml}</div>

      <input id="nm" placeholder="Note (e.g. 200g paneer, 2 rotis)" value="${escapeAttr(noteValue)}">
      <input id="kc" type="number" inputmode="numeric" placeholder="Calories (optional)" value="${escapeAttr(kcalValue)}">

      <button class="go" data-s="meal">Save</button>
    </div>
  `;
}

function escapeAttr(val) {
  return String(val || '').replace(/"/g, '&quot;');
}
