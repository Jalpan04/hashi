import { ic } from '../icons.js';
import { S } from '../state.js';

export function renderSettingsSheet(): string {
  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Settings</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>

      <!-- Pairing -->
      <div class="card">
        <div class="lbl">Pairing</div>
        <p style="margin:4px 0 12px;font-size:13px;color:var(--mu)">
          Connected to laptop (pc_v2_f89b3a1).
        </p>
        <div style="display:flex;gap:8px">
          <button class="chip on" data-action="scan-qr">Scan QR</button>
          <button class="chip" data-action="manual-ip">Manual IP</button>
          <button class="chip" style="color:#EF4444" data-action="forget-pc">Forget PC</button>
        </div>
      </div>

      <!-- Health Connect Permissions -->
      <div class="card">
        <div class="lbl">Health Connect</div>
        <p style="margin:4px 0 10px;font-size:13px;color:var(--mu)">
          Steps, sleep, calories and heart rate read permissions are granted.
        </p>
        <button class="chip on" data-action="manage-hc-perms">Manage permissions</button>
      </div>

      <!-- Private Vault Security -->
      <div class="card">
        <div class="lbl">Security</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:500">App lock for Private</div>
            <div class="mono">Biometric / device PIN required</div>
          </div>
          <span class="mono" style="color:#10B981">Enabled</span>
        </div>
      </div>

      <!-- Storage Used -->
      <div class="card">
        <div class="lbl">Phone storage</div>
        <div style="font-size:16px;font-weight:500">42 MB cached</div>
        <span class="mono">Original photos and audio removed after PC sync</span>
      </div>

      <!-- Theme Switcher -->
      <div class="card">
        <div class="lbl">Appearance</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="chip ${S.theme === 'system' ? 'on' : ''}" data-theme-val="system">System</button>
          <button class="chip ${S.theme === 'light' ? 'on' : ''}" data-theme-val="light">Light</button>
          <button class="chip ${S.theme === 'dark' ? 'on' : ''}" data-theme-val="dark">Dark</button>
        </div>
      </div>

      <div class="mono" style="text-align:center;margin:16px 0 24px">
        Hashi for Android · v0.1.0
      </div>
    </div>
  `;
}
