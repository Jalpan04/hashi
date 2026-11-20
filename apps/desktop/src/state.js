import { api } from './api.js';

export const S = {
  tab: 'today',
  off: 0,
  entries: [],
  habits: [
    ['Read 20 minutes', 1, null],
    ['Workout', 0, null],
    ['Drink 2L water', 1, null],
    ['Meditate', 0, null]
  ],
  reading: {
    title: 'Atomic Habits',
    currentPage: 142,
    totalPages: 320,
    minutesToday: 25,
    bookId: null
  },
  health: {
    restingHeartRate: 58,
    activeCalories: 420,
    steps: 8420,
    sleepMinutes: 435
  },
  workouts: [],
  ideasViewMode: 'board', // 'board' (Kanban) or 'list'
  filterTag: 'all',
  privateUnlocked: false,
  privateEntries: [
    {
      id: 101,
      timestamp: Date.now() - 86400000,
      trigger: 'Late night',
      place: 'Bed',
      note: 'Checked notifications before sleep'
    },
    {
      id: 102,
      timestamp: Date.now() - 86400000 * 3,
      trigger: 'Stress',
      place: 'Desk',
      note: 'Work deadline pressure'
    }
  ],
  phoneConnected: true,
  theme: 'system',
  loading: false,
  pairing: {
    bundle: null,
    status: null,
    isSyncing: false,
    syncSummary: null,
    syncError: null
  }
};

export function loadLocalSettings() {
  try {
    const raw = localStorage.getItem('hashi-desktop-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.theme) S.theme = parsed.theme;
      if (parsed.tab) S.tab = parsed.tab;
      if (parsed.ideasViewMode) S.ideasViewMode = parsed.ideasViewMode;
    }
  } catch (e) {}
}

export function saveLocalSettings() {
  try {
    localStorage.setItem(
      'hashi-desktop-settings',
      JSON.stringify({
        theme: S.theme,
        tab: S.tab,
        ideasViewMode: S.ideasViewMode
      })
    );
  } catch (e) {}
}

export function getSelectedDateString() {
  const d = new Date();
  d.setDate(d.getDate() + S.off);
  return d.toISOString().slice(0, 10);
}

export async function refreshState() {
  if (!api.isTauri()) {
    // If running in browser preview without Tauri backend, use cached or mock entries
    if (S.entries.length === 0) {
      seedMockState();
    }
    return;
  }

  S.loading = true;
  try {
    const dateStr = getSelectedDateString();

    // 1. Home snapshot for the selected date
    const homeSnap = await api.getHomeSnapshot(dateStr);
    const entriesList = [];

    if (homeSnap) {
      if (homeSnap.meals) {
        for (const m of homeSnap.meals) {
          entriesList.push({
            id: m.id,
            type: 'meal',
            text: m.user_note || (m.food_items && m.food_items.map(f => f.name).join(', ')) || 'Meal',
            t: new Date(m.captured_at).getTime(),
            kcal: m.total_kcal || 0,
            pro: m.total_protein || 0,
            carbs: m.total_carbs || 0,
            fat: m.total_fat || 0,
            img: m.thumbnail_b64 || undefined,
            confidence: m.confidence || 0.92,
            status: m.status || 'processed'
          });
        }
      }

      if (homeSnap.voice_entries) {
        for (const v of homeSnap.voice_entries) {
          entriesList.push({
            id: v.id,
            type: 'voice',
            text: v.transcript || 'Voice note',
            t: new Date(v.recorded_at).getTime(),
            dur: v.duration_seconds || 0,
            pts: v.summary_bullets || undefined,
            status: v.status || 'processed'
          });
        }
      }

      if (homeSnap.habits && homeSnap.habits.length > 0) {
        S.habits = homeSnap.habits.map((h) => [h.name, h.done ? 1 : 0, h.id]);
      }

      if (homeSnap.active_book) {
        S.reading = {
          title: homeSnap.active_book.book.title,
          currentPage: homeSnap.active_book.current_page || 0,
          totalPages: homeSnap.active_book.book.total_pages || 100,
          minutesToday: homeSnap.active_book.minutes_read_today || 0,
          bookId: homeSnap.active_book.book.id
        };
      }
    }

    // 2. Fetch all ideas from SQLite
    const ideas = await api.listIdeas();
    if (ideas) {
      for (const i of ideas) {
        entriesList.push({
          id: i.id,
          type: 'note',
          title: i.title || undefined,
          text: i.raw_text,
          t: new Date(i.updated_at || i.created_at).getTime(),
          tags: i.tags || [],
          status: i.status || 'raw'
        });
      }
    }

    // 3. Also fetch all meals if in food tab or timeline to include previous days
    const allMeals = await api.listMeals();
    if (allMeals) {
      for (const m of allMeals) {
        if (!entriesList.some((e) => e.id === m.id)) {
          entriesList.push({
            id: m.id,
            type: 'meal',
            text: m.user_note || (m.food_items && m.food_items.map(f => f.name).join(', ')) || 'Meal',
            t: new Date(m.captured_at).getTime(),
            kcal: m.total_kcal || 0,
            pro: m.total_protein || 0,
            carbs: m.total_carbs || 0,
            fat: m.total_fat || 0,
            img: m.thumbnail_b64 || undefined,
            confidence: m.confidence || 0.92,
            status: m.status || 'processed'
          });
        }
      }
    }

    // 4. Fetch all voice journals
    const allVoices = await api.listVoiceJournals();
    if (allVoices) {
      for (const v of allVoices) {
        if (!entriesList.some((e) => e.id === v.id)) {
          entriesList.push({
            id: v.id,
            type: 'voice',
            text: v.transcript || 'Voice note',
            t: new Date(v.recorded_at).getTime(),
            dur: v.duration_seconds || 0,
            pts: v.summary_bullets || undefined,
            status: v.status || 'processed'
          });
        }
      }
    }

    S.entries = entriesList;

    // 5. Fetch health snapshot
    const healthSnap = await api.getHealthSnapshot(dateStr);
    if (healthSnap) {
      if (healthSnap.today_metrics) {
        S.health = {
          restingHeartRate: healthSnap.today_metrics.resting_heart_rate || 58,
          activeCalories: healthSnap.today_metrics.active_calories || 420,
          steps: healthSnap.today_metrics.steps || 0,
          sleepMinutes: healthSnap.today_metrics.sleep_minutes_total || 0
        };
      }
      if (healthSnap.recent_workouts) {
        S.workouts = healthSnap.recent_workouts;
      }
    }

    // 6. Load pairing status
    await loadPairingInfo();
  } catch (err) {
    console.error('Error refreshing state from DB:', err);
  } finally {
    S.loading = false;
  }
}

export async function addMeal({ meal_type, user_note, calories, thumbnail_b64 }) {
  if (api.isTauri()) {
    await api.createMeal({
      meal_type: meal_type || 'meal',
      user_note: user_note || 'Meal',
      calories: +calories || 0,
      thumbnail_b64: thumbnail_b64 || null
    });
    await refreshState();
    return;
  }

  // Browser preview fallback
  const cal = +calories || 0;
  S.entries.unshift({
    id: 'local-' + Date.now(),
    type: 'meal',
    text: user_note || 'Meal',
    t: Date.now(),
    kcal: cal,
    pro: Math.round(cal * 0.05),
    carbs: Math.round(cal * 0.1),
    fat: Math.round(cal * 0.03),
    img: thumbnail_b64 || undefined,
    status: 'processed'
  });
}

export async function addIdea({ title, raw_text, tags }) {
  if (api.isTauri()) {
    await api.createIdea({
      title: title || null,
      raw_text,
      tags: tags || []
    });
    await refreshState();
    return;
  }

  // Browser preview fallback
  S.entries.unshift({
    id: 'local-' + Date.now(),
    type: 'note',
    title: title || undefined,
    text: raw_text,
    t: Date.now(),
    tags: tags || [],
    status: 'raw'
  });
}

export async function moveIdeaStatus(id, newStatus) {
  if (api.isTauri()) {
    await api.setIdeaStatus(id, newStatus);
    await refreshState();
    return;
  }

  const idea = S.entries.find((e) => e.id === id);
  if (idea) idea.status = newStatus;
}

export async function toggleHabitByIndex(idx) {
  const habit = S.habits[idx];
  if (!habit) return;

  if (api.isTauri() && habit[2]) {
    const dateStr = getSelectedDateString();
    await api.toggleHabit(habit[2], dateStr);
    await refreshState();
    return;
  }

  habit[1] = habit[1] ? 0 : 1;
}

export async function loadPairingInfo() {
  if (api.isTauri()) {
    try {
      const [status, bundle] = await Promise.all([
        api.getPairingStatus(),
        api.getPairingBundle(8765)
      ]);
      S.pairing.status = status;
      S.pairing.bundle = bundle;
    } catch (e) {
      console.error('Failed to load pairing info:', e);
    }
  }
}

export async function triggerDesktopSync() {
  if (api.isTauri()) {
    S.pairing.isSyncing = true;
    S.pairing.syncError = null;
    try {
      const res = await api.triggerSyncNow();
      S.pairing.syncSummary = res;
      await refreshState();
    } catch (e) {
      S.pairing.syncError = String(e);
    } finally {
      S.pairing.isSyncing = false;
    }
  }
}

export async function clearDesktopPairing() {
  if (api.isTauri()) {
    await api.clearPairing();
    await loadPairingInfo();
  }
}

function seedMockState() {
  const now = Date.now();
  S.entries = [
    {
      id: 'mock-1',
      type: 'voice',
      text: 'Product roadmap thoughts for the sync feature',
      t: now - 3600000,
      dur: 48,
      pts: [
        'Move search to the device',
        'Ship offline mode first',
        'Talk to two users this week'
      ],
      status: 'processed'
    },
    {
      id: 'mock-2',
      type: 'meal',
      text: 'Salmon bowl with brown rice and greens',
      t: now - 7200000,
      kcal: 640,
      pro: 44,
      carbs: 52,
      fat: 22,
      confidence: 0.94,
      status: 'processed'
    },
    {
      id: 'mock-3',
      type: 'note',
      title: 'Dieter Rams principles',
      text: 'Dieter Rams’ principles on unobtrusive tools: good design is as little design as possible.',
      t: now - 14400000,
      tags: ['design'],
      status: 'incubating'
    },
    {
      id: 'mock-4',
      type: 'meal',
      text: 'Chicken wrap and salad',
      t: now - 21600000,
      kcal: 680,
      pro: 42,
      carbs: 60,
      fat: 20,
      confidence: 0.91,
      status: 'processed'
    },
    {
      id: 'mock-5',
      type: 'meal',
      text: 'Oats with banana',
      t: now - 28800000,
      kcal: 520,
      pro: 18,
      carbs: 85,
      fat: 10,
      confidence: 0.96,
      status: 'processed'
    }
  ];
}
