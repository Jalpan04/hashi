import { ic } from '../icons.js';
import { S } from '../state.js';

export function renderSettingsView(): string {
  return `
    <div class="narrow2">
      <h2>Settings</h2>

      <!-- Pairing Section -->
      <div class="card">
        <div class="lbl">Phone pairing</div>
        <div style="display:flex;gap:24px;align-items:center;margin-top:12px">
          <div class="qr-box">
            <!-- Simulated QR code pattern using SVG -->
            <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
              <rect x="0" y="0" width="140" height="140" fill="#FFFFFF"/>
              <!-- Position markers -->
              <rect x="10" y="10" width="35" height="35" rx="4" fill="#000000"/>
              <rect x="15" y="15" width="25" height="25" rx="2" fill="#FFFFFF"/>
              <rect x="20" y="20" width="15" height="15" fill="#000000"/>
              <rect x="95" y="10" width="35" height="35" rx="4" fill="#000000"/>
              <rect x="100" y="15" width="25" height="25" rx="2" fill="#FFFFFF"/>
              <rect x="105" y="20" width="15" height="15" fill="#000000"/>
              <rect x="10" y="95" width="35" height="35" rx="4" fill="#000000"/>
              <rect x="15" y="100" width="25" height="25" rx="2" fill="#FFFFFF"/>
              <rect x="20" y="105" width="15" height="15" fill="#000000"/>
              <!-- Random pattern blocks -->
              <rect x="55" y="15" width="10" height="20" fill="#000000"/>
              <rect x="75" y="25" width="10" height="15" fill="#000000"/>
              <rect x="50" y="50" width="40" height="40" rx="4" fill="#FF5A1F"/>
              <rect x="20" y="60" width="15" height="20" fill="#000000"/>
              <rect x="105" y="60" width="15" height="20" fill="#000000"/>
              <rect x="55" y="105" width="25" height="15" fill="#000000"/>
              <rect x="95" y="105" width="30" height="20" fill="#000000"/>
            </svg>
          </div>
          <div style="flex:1">
            <p style="margin:0 0 8px;font-weight:500">Scan with your phone to pair</p>
            <p style="color:var(--mu);margin:0 0 12px;font-size:13px">
              Hotspot discovery uses mDNS and UDP subnet broadcast. Paired sessions use TLS encryption.
            </p>
            <div class="mono" style="margin-bottom:6px">Device ID: pc_v2_f89b3a1</div>
            <div class="mono">Pairing Secret: 8942-0193-4412</div>
          </div>
        </div>
      </div>

      <!-- Vault & Storage Section -->
      <div class="card">
        <div class="lbl">Storage & Vault</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:500">D:\\HashiVault</div>
            <div class="mono" style="margin-top:2px">1.2 GB used (84 photos, 32 audio journals)</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="ghost" style="font-size:12px">${ic('folder', 14)} Open folder</button>
            <button class="ghost" style="font-size:12px">Change</button>
          </div>
        </div>
      </div>

      <!-- Daily Targets -->
      <div class="card">
        <div class="lbl">Daily targets</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:8px">
          <div>
            <span class="mono">Calories</span>
            <input type="number" value="2200" style="margin-top:4px">
          </div>
          <div>
            <span class="mono">Protein (g)</span>
            <input type="number" value="140" style="margin-top:4px">
          </div>
          <div>
            <span class="mono">Carbs (g)</span>
            <input type="number" value="220" style="margin-top:4px">
          </div>
          <div>
            <span class="mono">Fat (g)</span>
            <input type="number" value="65" style="margin-top:4px">
          </div>
        </div>
      </div>

      <!-- Batch Schedule -->
      <div class="card">
        <div class="lbl">Nightly batch worker</div>
        <p style="margin:4px 0 12px;color:var(--mu)">
          Runs daily at 01:00 AM. Processes photos, transcribes voice journals, and compiles weekly summaries.
        </p>
        <div style="display:flex;gap:12px;align-items:center">
          <button class="go" data-action="run-batch-now" style="font-size:13px">Run batch now</button>
          <button class="ghost" data-action="sync-now" style="font-size:13px">${ic('refresh', 14)} Sync now</button>
          <span class="mono" style="margin-left:auto">Last run: Today at 01:00 AM (0 failures)</span>
        </div>
      </div>

      <!-- Theme Switcher -->
      <div class="card">
        <div class="lbl">Appearance</div>
        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="chip ${S.theme === 'system' ? 'on' : ''}" data-theme-val="system">System</button>
          <button class="chip ${S.theme === 'light' ? 'on' : ''}" data-theme-val="light">Light</button>
          <button class="chip ${S.theme === 'dark' ? 'on' : ''}" data-theme-val="dark">Dark</button>
        </div>
      </div>
    </div>
  `;
}
