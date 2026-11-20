import { ic } from '../icons.js';
import { S } from '../state.js';

export function renderSyncSheet() {
  const isPaired = Boolean(S.pairing?.status?.is_paired);
  const status = S.pairing?.status;
  const pending = S.home.pending_sync_count || 0;

  return `
    <div class="sheet" id="sh">
      <div class="top">
        <h1>Sync status</h1>
        <button data-s="close" aria-label="Close">${ic('x')}</button>
      </div>

      <div class="card">
        <div class="lbl">Peer laptop</div>
        ${
          isPaired
            ? `
          <div style="font-size:16px;font-weight:500;color:#10B981">Paired with PC (${status?.peer_device_id || 'laptop'})</div>
          <div class="mono" style="margin-top:4px">Address: ${status?.peer_address || '192.168.43.1:8765'}</div>
          <div class="mono" style="margin-top:2px">Paired at: ${status?.paired_at || 'Recently'}</div>
        `
            : `
          <div style="font-size:16px;font-weight:500;color:var(--mu)">PC not paired yet</div>
          <p style="color:var(--mu);margin:6px 0 0;font-size:13px">
            Pair with your desktop app to enable hotspot syncing and automatic media offload.
          </p>
        `
        }
      </div>

      ${
        !isPaired
          ? `
        <div class="card">
          <div class="lbl">Pairing setup</div>
          <p style="color:var(--mu);margin:4px 0 10px;font-size:13px">
            Open Settings on your desktop app and copy the pairing payload, or enter the PC's hotspot IP address.
          </p>
          <textarea id="qr-input" placeholder="Paste pairing payload from desktop Settings here..." style="width:100%;height:68px;border-radius:6px;border:1px solid var(--bd);background:var(--s2);color:var(--tx);padding:8px;font-family:monospace;font-size:12px;margin-bottom:8px;box-sizing:border-box"></textarea>
          <button class="go" data-action="submit-qr-payload" style="width:100%;margin-bottom:10px">Pair with payload</button>
          
          <button class="ghost" data-action="toggle-manual-pairing" style="width:100%;font-size:13px">
            ${S.pairing.showManual ? 'Hide manual entry' : 'Manual IP entry'}
          </button>

          ${
            S.pairing.showManual
              ? `
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
              <input id="man-host" placeholder="PC IP (e.g. 192.168.43.1)" value="192.168.43.1" style="border:1px solid var(--bd);background:var(--s2);color:var(--tx);padding:8px;border-radius:6px;font-size:13px">
              <input id="man-port" type="number" placeholder="Port" value="8765" style="border:1px solid var(--bd);background:var(--s2);color:var(--tx);padding:8px;border-radius:6px;font-size:13px">
              <input id="man-secret" placeholder="Pairing Secret from desktop Settings" style="border:1px solid var(--bd);background:var(--s2);color:var(--tx);padding:8px;border-radius:6px;font-size:13px">
              <button class="go" data-action="submit-manual-pairing" style="width:100%">Connect & Pair</button>
            </div>
          `
              : ''
          }
        </div>
      `
          : ''
      }

      <div class="card">
        <div class="lbl">Items waiting</div>
        <div class="big">${pending}</div>
        <span class="mono">Saved locally in SQLite</span>
      </div>

      <div class="card">
        <div class="lbl">Last sync</div>
        <div style="font-size:15px;font-weight:500">${S.syncStatus.lastSyncText}</div>
      </div>

      ${
        S.pairing.syncSummary
          ? `
        <div class="card" style="font-size:13px;background:var(--s2)">
          Sync complete: ${S.pairing.syncSummary.pushed_count} pushed, ${S.pairing.syncSummary.pulled_count} pulled, ${S.pairing.syncSummary.media_transferred_count} media transferred, ${S.pairing.syncSummary.conflicts_count} conflicts.
        </div>
      `
          : ''
      }

      ${
        S.pairing.error
          ? `
        <div class="card" style="border:1px solid var(--ac);color:var(--tx);font-size:13px">
          Notice: ${S.pairing.error}
        </div>
      `
          : ''
      }

      ${
        isPaired
          ? `
        <button class="go" data-action="sync-now" style="width:100%" ${S.pairing.isSyncing ? 'disabled' : ''}>
          ${S.pairing.isSyncing ? 'Syncing...' : 'Sync now'}
        </button>
        <button class="ghost" data-action="clear-mobile-pairing" style="width:100%;font-size:13px;margin-top:8px">
          Unpair laptop
        </button>
      `
          : ''
      }
    </div>
  `;
}
