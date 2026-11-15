import { ic } from '../icons.js';
import { S } from '../state.js';

export const NAV: [string, string, string][] = [
  ['today', 'Today', 'home'],
  ['food', 'Food', 'cam'],
  ['ideas', 'Ideas', 'bulb'],
  ['journal', 'Journal', 'book'],
  ['health', 'Health', 'pulse'],
  ['private', 'Private', 'lock']
];

export function renderSidebar(): string {
  const items = NAV.map(([id, label, iconName]) => {
    const active = S.tab === id ? 'on' : '';
    return `<button class="nv ${active}" data-t="${id}">${ic(iconName)}${label}</button>`;
  }).join('');

  const connStatus = S.phoneConnected
    ? `<div class="peer-status"><span class="status-dot active"></span>Phone connected</div>`
    : `<div class="peer-status"><span class="status-dot"></span>Phone offline</div>`;

  return `
    <div class="logo">Hashi</div>
    ${items}
    <div class="foot">
      <div class="foot-settings" data-t="settings">
        ${ic('gear', 16)}Settings
      </div>
      ${connStatus}
      <div>Next summary at 1:00 am</div>
    </div>
  `;
}
