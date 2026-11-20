import { ic } from '../icons.js';
import { S } from '../state.js';

export function renderSyncSheet() {
  const pcStatus = S.syncStatus.pcFound
    ? '<span style="color:#10B981;font-weight:500">PC found on hotspot</span>'
    : '<span style="color:var(--mu)">PC not found yet</span>';

  const pending = S.home.pending_sync_count || 0;

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Sync status</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>

      <div class="card">
        <div class="lbl">Peer laptop</div>
        <div style="font-size:16px;font-weight:500">${pcStatus}</div>
        <div class="mono" style="margin-top:4px">Pairing and hotspot sync arrive in Phase 4</div>
      </div>

      <div class="card">
        <div class="lbl">Items waiting</div>
        <div class="big">${pending}</div>
        <span class="mono">Saved locally in SQLite</span>
      </div>

      <div class="card">
        <div class="lbl">Last sync</div>
        <div style="font-size:15px;font-weight:500">${S.syncStatus.lastSyncText}</div>
      </div>

      <button class="card" style="display:flex;align-items:center;justify-content:space-between;width:100%;cursor:pointer" data-sheet="settings">
        <span style="font-weight:500">Settings</span>
        <span style="color:var(--mu)">${ic('chevronRight', 18)}</span>
      </button>

      <button class="go" data-action="sync-now">Sync now</button>
    </div>
  `;
}
