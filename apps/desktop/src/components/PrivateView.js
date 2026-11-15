import { ic } from '../icons.js';
import { S } from '../state.js';

export function renderPrivateView() {
  if (!S.privateUnlocked) {
    return `
      <div class="narrow">
        <h2>Private</h2>
        <div class="card" style="display:flex;flex-direction:column;gap:16px;max-width:440px">
          <div style="display:flex;gap:12px;align-items:center;color:var(--mu)">
            ${ic('lock', 24)}
            <div>
              <div style="font-weight:500;color:var(--tx)">Private vault locked</div>
              <div style="font-size:12px">Unlock with Windows Hello or your master passphrase.</div>
            </div>
          </div>
          <input type="password" id="private-pass" placeholder="Enter passphrase">
          <button class="go" data-action="unlock-private">Unlock</button>
        </div>
      </div>
    `;
  }

  const entriesHtml = S.privateEntries
    .map((e) => {
      const d = new Date(e.timestamp).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
      return `
        <div class="card" style="margin-bottom:10px;padding:14px 18px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="mono">${d}</span>
            <span class="chip on" style="font-size:11px;padding:3px 8px">${e.trigger}</span>
          </div>
          ${e.place ? `<p style="font-size:12px;color:var(--mu);margin:6px 0 2px">Location: ${e.place}</p>` : ''}
          ${e.note ? `<p style="margin:4px 0">${e.note}</p>` : ''}
        </div>
      `;
    })
    .join('');

  return `
    <div class="narrow">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <h2>Private</h2>
        <button class="ghost" data-action="lock-private" style="font-size:12px">${ic('lock', 14)} Lock now</button>
      </div>
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="lbl">Clean streak</div>
          <div class="big" style="color:var(--ac)">28 days</div>
        </div>
        <div style="text-align:right">
          <div class="lbl">Auto-lock</div>
          <span class="mono">5 minutes idle</span>
        </div>
      </div>

      <div class="lbl" style="margin-top:20px">Trigger breakdown</div>
      <div class="chips" style="margin-bottom:20px">
        <span class="chip">Late night (4)</span>
        <span class="chip">Boredom (2)</span>
        <span class="chip">Stress (1)</span>
        <span class="chip">Phone in bed (1)</span>
      </div>

      <div class="lbl">Recent log entries</div>
      ${entriesHtml}
    </div>
  `;
}
