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
  pairing: {
    status: null,
    isSyncing: false,
    syncSummary: null,
    error: null,
    showManual: false,
    updateInfo: null,
    updateError: null,
    updatePath: null,
    isCheckingUpdate: false,
    isDownloading: false,
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

  await loadPairingStatus();
}

export async function loadPairingStatus() {
  try {
    const status = await api.getPairingStatus();
    if (status) {
      S.pairing.status = status;
      S.syncStatus.pcFound = status.is_paired;
      if (status.paired_at) {
        S.syncStatus.lastSyncText = status.paired_at.slice(0, 16).replace('T', ' ');
      }
    }
  } catch (e) {
    console.error('Failed to load pairing status:', e);
  }
}

export async function pairWithQrPayload(payload) {
  S.pairing.error = null;
  try {
    const res = await api.pairWithQr(payload);
    await loadPairingStatus();
    await refreshAll();
    return res;
  } catch (e) {
    S.pairing.error = String(e);
    throw e;
  }
}

export async function pairManualHost(host, port, secret) {
  S.pairing.error = null;
  try {
    const res = await api.pairManual(host, port, secret);
    await loadPairingStatus();
    await refreshAll();
    return res;
  } catch (e) {
    S.pairing.error = String(e);
    throw e;
  }
}

export async function clearMobilePairing() {
  S.pairing.error = null;
  try {
    await api.clearPairing();
    await loadPairingStatus();
    await refreshAll();
  } catch (e) {
    S.pairing.error = String(e);
    throw e;
  }
}

export async function triggerMobileSync() {
  S.pairing.isSyncing = true;
  S.pairing.error = null;
  try {
    const summary = await api.discoverAndSync();
    S.pairing.syncSummary = summary;
    S.syncStatus.lastSyncText = 'Just now';
    await refreshAll();
    return summary;
  } catch (e) {
    S.pairing.error = String(e);
    throw e;
  } finally {
    S.pairing.isSyncing = false;
  }
}

export async function checkForAppUpdate() {
  S.pairing.isCheckingUpdate = true;
  S.pairing.updateError = null;
  try {
    const res = await api.checkForUpdate();
    if (res && res.available) {
      S.pairing.updateInfo = res;
    } else {
      S.pairing.updateInfo = null;
      S.pairing.updateError = 'App is up to date (no newer APK on server)';
    }
  } catch (e) {
    S.pairing.updateError = String(e);
  } finally {
    S.pairing.isCheckingUpdate = false;
  }
}

export async function downloadAppUpdate() {
  S.pairing.isDownloading = true;
  S.pairing.updateError = null;
  try {
    const apkPath = await api.downloadUpdate();
    S.pairing.updatePath = apkPath;
    return apkPath;
  } catch (e) {
    S.pairing.updateError = String(e);
  } finally {
    S.pairing.isDownloading = false;
  }
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
