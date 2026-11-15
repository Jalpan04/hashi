import { ic } from '../../icons.js';

export function renderVoiceSheet(recording, sec, maxSec, hasRecordedAudio) {
  const elapsed = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const maxTime = `${Math.floor(maxSec / 60)}:${String(maxSec % 60).padStart(2, '0')}`;
  const pct = Math.min(100, (sec / maxSec) * 100);

  let controlsHtml = '';
  if (hasRecordedAudio) {
    controlsHtml = `
      <div class="card" style="margin-top:20px">
        <div class="lbl">Recorded voice journal</div>
        <div class="aud">
          <button class="play" id="preview-play">${ic('play', 14)}</button>
          <div class="bar"><i style="width:0%" id="preview-bar"></i></div>
          <span class="mono">${elapsed}</span>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:auto">
        <button class="card" style="flex:1;text-align:center;padding:14px;color:#EF4444" data-action="discard-voice">Discard</button>
        <button class="go" style="flex:2;margin:0" data-action="save-voice">Save journal</button>
      </div>
    `;
  } else {
    const keepGoingBtn =
      sec >= 30 && maxSec === 30
        ? `<button class="keep-going-btn" id="keep-going-btn">Keep going (extend to 1:00)</button>`
        : '';

    controlsHtml = `
      <div class="timer" id="tm">${elapsed}</div>
      <div class="bar" style="margin:24px 0"><i id="rb" style="width:${pct}%"></i></div>
      ${keepGoingBtn}
      <button class="rec ${recording ? 'on' : ''}" id="rc">
        ${ic(recording ? 'stop' : 'mic', 36)}
      </button>
      <p class="mono" style="text-align:center" id="hint">
        ${recording ? 'Tap to finish' : `Tap to start · max ${maxTime}`}
      </p>
      <div style="height:40px"></div>
    `;
  }

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Voice journal</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>
      ${controlsHtml}
    </div>
  `;
}
