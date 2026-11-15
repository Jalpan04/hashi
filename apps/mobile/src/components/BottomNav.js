import { ic } from '../icons.js';
import { S } from '../state.js';

export const TABS = [
  ['home', 'Home', 'home'],
  ['ideas', 'Ideas', 'bulb'],
  ['health', 'Health', 'pulse'],
  ['journal', 'Journal', 'book']
];

export function renderBottomNav() {
  return TABS.map(([id, label, iconName]) => {
    const active = S.tab === id ? 'on' : '';
    return `<button data-t="${id}" class="${active}">${ic(iconName)}${label}</button>`;
  }).join('');
}
