import { ic } from '../icons.js';
import { S } from '../state.js';

export function renderSyncSheet() {
  const pcStatus = S.syncStatus.pcFound
    ? '<span style="color:#10B981;font-weight:500">Connected on hotspot</span>'
    : '<span style="color:var(--mu)">Searching on hotspot...</span>';

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Sync status</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>

      <div class="card">
        <div class="lbl">Peer laptop</div>
        <div style="font-size:16px;font-weight:500">${pcStatus}</div>
        <div class="mono" style="margin-top:4px">Hotspot IP: 192.168.43.15</div>
      </div>

      <div class="card">
        <div class="lbl">Pending sync queue</div>
        <div class="big">${S.syncStatus.pendingCount}</div>
        <span class="mono">Captures waiting for tonight</span>
      </div>

      <div class="card">
        <div class="lbl">Last sync</div>
        <div style="font-size:15px;font-weight:500">${S.syncStatus.lastSyncText}</div>
        <span class="mono">All captures archived to PC vault</span>
      </div>

      <button class="card" style="display:flex;align-items:center;justify-content:space-between;width:100%;cursor:pointer" data-sheet="settings">
        <span style="font-weight:500">Settings</span>
        <span style="color:var(--mu)">${ic('chevronRight', 18)}</span>
      </button>

      <button class="go" data-action="sync-now">Sync now</button>
    </div>
  `;
}
