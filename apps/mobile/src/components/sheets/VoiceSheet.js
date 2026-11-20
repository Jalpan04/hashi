import { ic } from '../../icons.js';

export function renderVoiceSheet({
  recording,
  sec,
  maxSec,
  hasRecordedAudio,
  audioUrl,
  isPlayingPreview,
  micNotice,
}) {
  const elapsed = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const maxTime = `${Math.floor(maxSec / 60)}:${String(maxSec % 60).padStart(2, '0')}`;
  const pct = Math.min(100, (sec / maxSec) * 100);

  let controlsHtml = '';
  if (hasRecordedAudio) {
    controlsHtml = `
      <div class="card" style="margin-top:20px">
        <div class="lbl" style="margin-left:0">Voice journal · ${elapsed}</div>
        <div class="aud">
          <button class="play" id="preview-play" aria-label="${isPlayingPreview ? 'Pause' : 'Play'}">
            ${ic(isPlayingPreview ? 'pause' : 'play', 14)}
          </button>
          <div class="bar"><i style="width:0%" id="preview-bar"></i></div>
          <span class="mono">${elapsed}</span>
        </div>
        ${audioUrl ? `<audio id="voice-preview-audio" src="${audioUrl}" preload="auto"></audio>` : '<p class="mono" style="margin:10px 0 0">Audio preview unavailable in timer-only mode</p>'}
      </div>
      <div style="display:flex;gap:12px;margin-top:auto">
        <button class="card" style="flex:1;text-align:center;padding:15px;margin:0;color:var(--mu)" data-action="discard-voice">Discard</button>
        <button class="go" style="flex:2;margin:0" data-action="save-voice">Save</button>
      </div>
    `;
  } else {
    const showKeepGoing = recording && maxSec === 30 && sec >= 20;
    const keepGoingBtn = showKeepGoing
      ? `<button class="keep-going-btn" id="keep-going-btn">Keep going (to 1:00)</button>`
      : '';

    controlsHtml = `
      <div class="timer" id="tm">${elapsed} <span style="font-size:20px;color:var(--mu)">/ ${maxTime}</span></div>
      <div class="bar" style="margin:24px 0"><i id="rb" style="width:${pct}%"></i></div>
      ${keepGoingBtn}
      <button class="rec ${recording ? 'on' : ''}" id="rc" aria-label="${recording ? 'Stop recording' : 'Start recording'}">
        ${ic(recording ? 'stop' : 'mic', 36)}
      </button>
      <p class="mono" style="text-align:center" id="hint">
        ${recording ? 'Tap to stop' : 'Tap to start · 0:30 (extendable to 1:00)'}
      </p>
      ${micNotice ? `<p class="mono" style="text-align:center;margin-top:8px">${micNotice}</p>` : ''}
      <div style="height:40px"></div>
    `;
  }

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Voice journal</h1>
        <button data-s="close" aria-label="Close" style="min-width:44px;min-height:44px;display:grid;place-items:center">${ic('x')}</button>
      </div>
      ${controlsHtml}
    </div>
  `;
}
