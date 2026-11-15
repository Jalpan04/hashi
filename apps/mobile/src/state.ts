import { MobileEntry, MobileState } from './types.js';

function at(h: number, m: number, o = 0): number {
  const d = new Date();
  d.setDate(d.getDate() + o);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export const initialEntries: MobileEntry[] = [
  {
    id: 1,
    type: 'voice',
    text: 'Product roadmap thoughts for the sync feature',
    t: at(22, 14),
    dur: 42,
    pts: [
      'Move search to the device',
      'Ship offline mode first',
      'Talk to two users this week'
    ],
    status: 'processed'
  },
  {
    id: 2,
    type: 'meal',
    text: 'Salmon bowl with brown rice and greens',
    t: at(19, 30),
    kcal: 640,
    pro: 44,
    carbs: 52,
    fat: 22,
    status: 'processed'
  },
  {
    id: 3,
    type: 'note',
    text: 'Dieter Rams’ principles on unobtrusive tools: good design is as little design as possible.',
    t: at(14, 15),
    status: 'processed'
  },
  {
    id: 4,
    type: 'meal',
    text: 'Chicken wrap and salad',
    t: at(13, 20),
    kcal: 680,
    pro: 42,
    carbs: 60,
    fat: 20,
    status: 'processed'
  },
  {
    id: 5,
    type: 'meal',
    text: 'Oats with banana',
    t: at(8, 30),
    kcal: 520,
    pro: 18,
    carbs: 85,
    fat: 10,
    status: 'processed'
  }
];

export const S: MobileState = {
  tab: 'home',
  entries: initialEntries,
  habits: [
    ['Read 20 minutes', 1],
    ['Workout', 0],
    ['Drink 2L water', 1],
    ['Meditate', 0]
  ],
  reading: {
    title: 'Atomic Habits',
    currentPage: 142,
    totalPages: 320,
    minutesToday: 25
  },
  syncStatus: {
    pendingCount: 2,
    lastSyncText: 'Today at 07:42 AM',
    pcFound: true
  },
  theme: 'system'
};

export function loadState(): void {
  try {
    const raw = localStorage.getItem('hashi-mobile-app');
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(S, parsed);
    }
  } catch (e) {}
}

export function saveState(): void {
  try {
    localStorage.setItem('hashi-mobile-app', JSON.stringify(S));
  } catch (e) {}
}

export function addEntry(e: Omit<MobileEntry, 'id' | 't'>): MobileEntry {
  const newEntry: MobileEntry = {
    ...e,
    id: Date.now(),
    t: Date.now()
  };
  S.entries.unshift(newEntry);
  S.syncStatus.pendingCount += 1;
  saveState();
  return newEntry;
}

export function kcalTotal(): number {
  return S.entries
    .filter((e) => e.type === 'meal')
    .reduce((a, e) => a + (e.kcal || 0), 0);
}

export function streakDays(): number {
  return 14 + (S.habits.every((h) => h[1]) ? 1 : 0);
}
