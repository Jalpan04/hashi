import { api, dateStrWithOffset, todayDateStr } from './api.js';

export const S = {
  tab: 'home',
  theme: 'system',
  journalDayOffset: 0,
  ideasSearch: '',
  ideasTag: 'all',

  // Hydrated from SQLite via Tauri backend
  home: {
    recent: [],
    calories_today: 0,
    has_pending_meals: false,
    steps_today: null,
    reading_streak_days: 0,
    habit_streak_days: 0,
    pending_sync_count: 0,
  },
  ideas: [],
  health: {
    date: todayDateStr(),
    calories_today: 0,
    calorie_target: 2200,
    protein_today: 0,
    carbs_today: 0,
    fat_today: 0,
    has_pending_meals: false,
    metrics: null,
    habits: [],
    books: [],
    recent_workouts: [],
    latest_weekly_report: null,
  },
  journalEntries: [],
  storage: {
    db_bytes: 0,
    media_bytes: 0,
    meal_photo_count: 0,
    audio_file_count: 0,
  },
  syncStatus: {
    lastSyncText: 'Not synced yet',
    pcFound: false,
  },
};

export function loadPrefs() {
  try {
    const raw = localStorage.getItem('hashi-mobile-prefs');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.tab) S.tab = parsed.tab;
      if (parsed.theme) S.theme = parsed.theme;
    }
  } catch (_) {}
}

export function savePrefs() {
  try {
    localStorage.setItem(
      'hashi-mobile-prefs',
      JSON.stringify({ tab: S.tab, theme: S.theme })
    );
  } catch (_) {}
}

export async function refreshAll() {
  const today = todayDateStr();
  const journalDate = dateStrWithOffset(S.journalDayOffset);

  const [home, ideas, health, journalEntries, storage] = await Promise.all([
    api.getHomeSnapshot(today),
    api.listIdeas({
      search: S.ideasSearch || null,
      tag: S.ideasTag === 'all' ? null : S.ideasTag,
    }),
    api.getHealthSnapshot(today),
    api.listVoiceJournals(journalDate),
    api.getStorageStats(),
  ]);

  if (home) S.home = home;
  if (Array.isArray(ideas)) S.ideas = ideas;
  if (health) S.health = health;
  if (Array.isArray(journalEntries)) S.journalEntries = journalEntries;
  if (storage) S.storage = storage;
}

export async function refreshIdeas() {
  const ideas = await api.listIdeas({
    search: S.ideasSearch || null,
    tag: S.ideasTag === 'all' ? null : S.ideasTag,
  });
  if (Array.isArray(ideas)) S.ideas = ideas;
}

export async function refreshJournal() {
  const journalDate = dateStrWithOffset(S.journalDayOffset);
  const journalEntries = await api.listVoiceJournals(journalDate);
  if (Array.isArray(journalEntries)) S.journalEntries = journalEntries;
}
