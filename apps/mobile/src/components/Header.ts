import { ic } from '../icons.js';
import { S } from '../state.js';

export function getGreeting(): string {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

export function renderHeader(): string {
  let title = '';
  switch (S.tab) {
    case 'home':
      title = getGreeting();
      break;
    case 'ideas':
      title = 'Ideas';
      break;
    case 'health':
      title = 'Health';
      break;
    case 'journal':
      title = 'Journal';
      break;
  }

  return `
    <h1 id="ttl">${title}</h1>
    <div class="av" id="av" data-sheet="sync" aria-label="Sync and Profile">
      ${ic('user', 18)}
    </div>
  `;
}
