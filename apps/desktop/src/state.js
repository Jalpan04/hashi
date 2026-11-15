function at(h, m, o = 0) {
  const d = new Date();
  d.setDate(d.getDate() + o);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export const initialEntries = [
  {
    id: 1,
    type: 'voice',
    text: 'Product roadmap thoughts for the sync feature',
    t: at(22, 14),
    dur: 48,
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
    confidence: 0.94,
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
    confidence: 0.91,
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
    confidence: 0.96,
    status: 'processed'
  },
  {
    id: 6,
    type: 'meal',
    text: 'Poha with peanuts',
    t: at(9, 0, -1),
    kcal: 380,
    pro: 10,
    carbs: 62,
    fat: 12,
    confidence: 0.89,
    status: 'processed'
  },
  {
    id: 7,
    type: 'meal',
    text: 'Dal, rice and sabzi',
    t: at(13, 45, -1),
    kcal: 720,
    pro: 24,
    carbs: 110,
    fat: 18,
    confidence: 0.92,
    status: 'processed'
  },
  {
    id: 8,
    type: 'meal',
    text: 'Paneer wrap',
    t: at(20, 10, -1),
    kcal: 610,
    pro: 28,
    carbs: 55,
    fat: 24,
    confidence: 0.88,
    status: 'processed'
  },
  {
    id: 9,
    type: 'meal',
    text: 'Idli and sambar',
    t: at(12, 50, -2),
    kcal: 450,
    pro: 14,
    carbs: 78,
    fat: 6,
    confidence: 0.95,
    status: 'processed'
  }
];

export const S = {
  tab: 'today',
  off: 0,
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
  privateUnlocked: false,
  privateEntries: [
    {
      id: 101,
      timestamp: at(23, 15, -1),
      trigger: 'Late night',
      place: 'Bed',
      note: 'Checked notifications before sleep'
    },
    {
      id: 102,
      timestamp: at(16, 40, -4),
      trigger: 'Stress',
      place: 'Desk',
      note: 'Work deadline pressure'
    }
  ],
  phoneConnected: true,
  theme: 'system'
};

export function loadState() {
  try {
    const raw = localStorage.getItem('hashi-desktop-app');
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(S, parsed);
    }
  } catch (e) {}
}

export function saveState() {
  try {
    localStorage.setItem('hashi-desktop-app', JSON.stringify(S));
  } catch (e) {}
}

export function addEntry(e) {
  const newEntry = {
    ...e,
    id: Date.now(),
    t: Date.now()
  };
  S.entries.unshift(newEntry);
  saveState();
  return newEntry;
}
