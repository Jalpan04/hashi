import { ic } from '../icons.js';
import { S } from '../state.js';
import { MobileTab } from '../types.js';

export const TABS: [MobileTab, string, string][] = [
  ['home', 'Home', 'home'],
  ['ideas', 'Ideas', 'bulb'],
  ['health', 'Health', 'pulse'],
  ['journal', 'Journal', 'book']
];

export function renderBottomNav(): string {
  return TABS.map(([id, label, iconName]) => {
    const active = S.tab === id ? 'on' : '';
    return `<button data-t="${id}" class="${active}">${ic(iconName)}${label}</button>`;
  }).join('');
}
