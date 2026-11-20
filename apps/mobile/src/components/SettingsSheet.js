import { ic } from '../icons.js';
import { S } from '../state.js';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function renderSettingsSheet() {
  const totalBytes = (S.storage.db_bytes || 0) + (S.storage.media_bytes || 0);
  const photos = S.storage.meal_photo_count || 0;
  const audio = S.storage.audio_file_count || 0;

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Settings</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>

      <div class="card">
        <div class="lbl">Pairing</div>
        <p style="margin:4px 0 12px;font-size:13px;color:var(--mu)">
          Not paired yet. Pair over your hotspot in Phase 4.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="chip on" data-action="scan-qr">Scan QR</button>
          <button class="chip" data-action="manual-ip">Manual IP</button>
          <button class="chip" data-action="forget-pc">Forget PC</button>
        </div>
      </div>

      <div class="card">
        <div class="lbl">Health Connect</div>
        <p style="margin:4px 0 10px;font-size:13px;color:var(--mu)">
          Read-only metrics (steps, sleep, heart rate, exercise). Connected in Phase 6.
        </p>
        <button class="chip" data-action="manage-hc-perms">Manage permissions</button>
      </div>

      <div class="card">
        <div class="lbl">Private vault</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:500">App lock for Private</div>
            <div class="mono">SQLCipher encryption enabled in Phase 7</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="lbl">Storage used</div>
        <div style="font-size:16px;font-weight:500">${formatBytes(totalBytes)} on phone</div>
        <span class="mono">${photos} meal photos · ${audio} voice clips · DB ${formatBytes(S.storage.db_bytes)}</span>
      </div>

      <div class="card">
        <div class="lbl">Theme</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="chip ${S.theme === 'system' ? 'on' : ''}" data-theme-val="system">System</button>
          <button class="chip ${S.theme === 'light' ? 'on' : ''}" data-theme-val="light">Light</button>
          <button class="chip ${S.theme === 'dark' ? 'on' : ''}" data-theme-val="dark">Dark</button>
        </div>
      </div>

      <div class="mono" style="text-align:center;margin:16px 0 24px">
        Hashi · Local-first personal capture · v0.1.0
      </div>
    </div>
  `;
}
