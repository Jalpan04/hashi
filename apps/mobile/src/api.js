// Bridge between Hashi Mobile UI and Tauri v2 Rust SQLite backend (hashi-core).
// Falls back to localStorage only when opened outside the Tauri runtime.

export function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke);
}

async function invoke(cmd, args = {}) {
  if (isTauriRuntime()) {
    return window.__TAURI_INTERNALS__.invoke(cmd, args);
  }
  return fallbackInvoke(cmd, args);
}

export function tzOffsetMinutes() {
  return -new Date().getTimezoneOffset();
}

export function dateStrWithOffset(dayOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayDateStr() {
  return dateStrWithOffset(0);
}

export function formatLocalTime(isoTimestamp, tzOffsetMin) {
  if (!isoTimestamp) return '';
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return '';
  if (typeof tzOffsetMin === 'number') {
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const local = new Date(utcMs + tzOffsetMin * 60000);
    return local.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  }
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

export const api = {
  getHomeSnapshot: (date = todayDateStr()) => invoke('get_home_snapshot', { date }),
  getHealthSnapshot: (date = todayDateStr()) => invoke('get_health_snapshot', { date }),

  createIdea: (payload) => invoke('create_idea', { payload }),
  listIdeas: ({ search = null, tag = null, status = null } = {}) =>
    invoke('list_ideas', { search, tag, status }),
  updateIdea: (payload) => invoke('update_idea', { payload }),
  deleteIdea: (id) => invoke('delete_idea', { id }),
  listIdeaRevisions: (ideaId) => invoke('list_idea_revisions', { ideaId }),

  createMeal: (payload) => invoke('create_meal', { payload }),
  listMeals: (date = null) => invoke('list_meals', { date }),
  deleteMeal: (id) => invoke('delete_meal', { id }),

  createVoiceJournal: (payload) => invoke('create_voice_journal', { payload }),
  listVoiceJournals: (date = null) => invoke('list_voice_journals', { date }),
  deleteVoiceJournal: (id) => invoke('delete_voice_journal', { id }),

  listHabits: (date = todayDateStr()) => invoke('list_habits', { date }),
  toggleHabit: (habitId, date = todayDateStr()) => invoke('toggle_habit', { habitId, date }),
  createHabit: (name) => invoke('create_habit', { name }),
  renameHabit: (id, name) => invoke('rename_habit', { id, name }),
  reorderHabits: (orderedIds) => invoke('reorder_habits', { orderedIds }),
  archiveHabit: (id, archived = true) => invoke('archive_habit', { id, archived }),

  listBooks: (date = todayDateStr()) => invoke('list_books', { date }),
  createBook: (title, totalPages = null) => invoke('create_book', { title, totalPages }),
  logReading: (payload) => invoke('log_reading', { payload }),

  createWorkout: (payload) => invoke('create_workout', { payload }),
  listWorkouts: (date = null) => invoke('list_workouts', { date }),

  getStorageStats: () => invoke('get_storage_stats'),

  getPairingStatus: () => invoke('get_pairing_status'),
  clearPairing: () => invoke('clear_pairing'),
  pairWithQr: (qrPayload) => invoke('pair_with_qr', { qrPayload }),
  pairManual: (host, port, secret) => invoke('pair_manual', { host, port, secret }),
  discoverAndSync: () => invoke('discover_and_sync'),
};

// -----------------------------------------------------------------------------
// Browser-only fallback (never used when running inside Tauri v2)
// -----------------------------------------------------------------------------

const STORE_KEY = 'hashi-mobile-browser-fallback-v2';

function loadFallback() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  const now = new Date().toISOString();
  const initial = {
    ideas: [],
    revisions: [],
    meals: [],
    voices: [],
    habits: [
      { id: 'h1', name: 'Read 20 minutes', schedule: 'daily', sort_order: 0, archived: false },
      { id: 'h2', name: 'Workout', schedule: 'daily', sort_order: 1, archived: false },
      { id: 'h3', name: 'Drink 2L water', schedule: 'daily', sort_order: 2, archived: false },
      { id: 'h4', name: 'Meditate', schedule: 'daily', sort_order: 3, archived: false },
    ],
    habit_checks: {},
    books: [],
    reading_logs: [],
    workouts: [],
    created_at: now,
  };
  saveFallback(initial);
  return initial;
}

function saveFallback(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function isoLocalDate(iso, tzMin) {
  const d = new Date(iso);
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  const local = new Date(utcMs + (tzMin ?? tzOffsetMinutes()) * 60000);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fallbackInvoke(cmd, args) {
  const db = loadFallback();
  const now = new Date().toISOString();

  switch (cmd) {
    case 'create_idea': {
      const p = args.payload;
      const id = uid();
      const idea = {
        id,
        created_at: now,
        updated_at: now,
        device_id: 'browser-preview',
        dirty: true,
        deleted_at: null,
        version: 1,
        tz_offset_minutes: p.tz_offset_minutes ?? tzOffsetMinutes(),
        title: p.title?.trim() || null,
        raw_text: p.raw_text.trim(),
        structured_bullets: null,
        tags: (p.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean),
        status: 'raw',
      };
      db.ideas.unshift(idea);
      db.revisions.unshift({ id: uid(), idea_id: id, rev_type: 'base', content: idea.raw_text, timestamp: now });
      saveFallback(db);
      return idea;
    }
    case 'list_ideas': {
      const q = args.search?.trim().toLowerCase();
      const tg = args.tag?.trim().toLowerCase();
      return db.ideas
        .filter((i) => !i.deleted_at)
        .filter((i) => !tg || tg === 'all' || i.tags.includes(tg))
        .filter((i) => !q || (i.title || '').toLowerCase().includes(q) || i.raw_text.toLowerCase().includes(q));
    }
    case 'update_idea': {
      const p = args.payload;
      const idea = db.ideas.find((i) => i.id === p.id && !i.deleted_at);
      if (!idea) throw new Error('Idea not found');
      idea.title = p.title?.trim() || null;
      idea.raw_text = p.raw_text.trim();
      idea.tags = (p.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean);
      idea.updated_at = now;
      idea.version += 1;
      idea.dirty = true;
      db.revisions.unshift({ id: uid(), idea_id: idea.id, rev_type: 'edit', content: idea.raw_text, timestamp: now });
      saveFallback(db);
      return idea;
    }
    case 'delete_idea': {
      const idea = db.ideas.find((i) => i.id === args.id);
      if (idea) idea.deleted_at = now;
      saveFallback(db);
      return null;
    }
    case 'list_idea_revisions':
      return db.revisions.filter((r) => r.idea_id === args.ideaId);

    case 'create_meal': {
      const p = args.payload;
      const meal = {
        id: uid(),
        created_at: now,
        updated_at: now,
        device_id: 'browser-preview',
        dirty: true,
        deleted_at: null,
        version: 1,
        captured_at: now,
        tz_offset_minutes: p.tz_offset_minutes ?? tzOffsetMinutes(),
        meal_type: (p.meal_type || 'snack').toLowerCase(),
        photo_path: p.photo_b64 ? `meals/${Date.now()}.jpg` : null,
        photo_sha256: null,
        thumbnail_b64: p.thumbnail_b64 || null,
        user_note: p.user_note?.trim() || null,
        manual_calories: p.manual_calories ?? null,
        food_items: [],
        total_kcal: p.manual_calories ?? 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        confidence: null,
        user_edited: p.manual_calories != null,
        status: 'pending',
      };
      db.meals.unshift(meal);
      saveFallback(db);
      return meal;
    }
    case 'list_meals':
      return db.meals.filter((m) => !m.deleted_at && (!args.date || isoLocalDate(m.captured_at, m.tz_offset_minutes) === args.date));
    case 'delete_meal': {
      const m = db.meals.find((x) => x.id === args.id);
      if (m) m.deleted_at = now;
      saveFallback(db);
      return null;
    }

    case 'create_voice_journal': {
      const p = args.payload;
      const voice = {
        id: uid(),
        created_at: now,
        updated_at: now,
        device_id: 'browser-preview',
        dirty: true,
        deleted_at: null,
        version: 1,
        recorded_at: now,
        tz_offset_minutes: p.tz_offset_minutes ?? tzOffsetMinutes(),
        duration_seconds: Math.min(60, Math.max(1, p.duration_seconds)),
        audio_file_path: p.audio_b64 ? `audio/${Date.now()}.opus` : null,
        audio_sha256: null,
        transcript: null,
        edited_transcript: null,
        summary_bullets: null,
        status: 'pending',
      };
      db.voices.unshift(voice);
      saveFallback(db);
      return voice;
    }
    case 'list_voice_journals':
      return db.voices.filter((v) => !v.deleted_at && (!args.date || isoLocalDate(v.recorded_at, v.tz_offset_minutes) === args.date));
    case 'delete_voice_journal': {
      const v = db.voices.find((x) => x.id === args.id);
      if (v) v.deleted_at = now;
      saveFallback(db);
      return null;
    }

    case 'list_habits': {
      const date = args.date;
      return db.habits
        .filter((h) => !h.archived)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((h) => ({ ...h, done: Boolean(db.habit_checks[`${h.id}:${date}`]) }));
    }
    case 'toggle_habit': {
      const key = `${args.habitId}:${args.date}`;
      db.habit_checks[key] = !db.habit_checks[key];
      saveFallback(db);
      return db.habit_checks[key];
    }
    case 'create_habit': {
      const h = { id: uid(), name: args.name.trim(), schedule: 'daily', sort_order: db.habits.length, archived: false };
      db.habits.push(h);
      saveFallback(db);
      return h;
    }
    case 'rename_habit': {
      const h = db.habits.find((x) => x.id === args.id);
      if (h) h.name = args.name.trim();
      saveFallback(db);
      return null;
    }
    case 'archive_habit': {
      const h = db.habits.find((x) => x.id === args.id);
      if (h) h.archived = Boolean(args.archived);
      saveFallback(db);
      return null;
    }

    case 'create_book': {
      const b = { id: uid(), title: args.title.trim(), total_pages: args.totalPages || null, status: 'reading' };
      db.books.unshift(b);
      saveFallback(db);
      return b;
    }
    case 'list_books': {
      const date = args.date;
      return db.books.map((b) => {
        const logs = db.reading_logs.filter((r) => r.book_id === b.id);
        const todayLogs = logs.filter((r) => r.date === date);
        return {
          ...b,
          pages_read_total: logs.reduce((s, r) => s + r.pages_read, 0),
          pages_today: todayLogs.reduce((s, r) => s + r.pages_read, 0),
          minutes_today: todayLogs.reduce((s, r) => s + r.minutes_read, 0),
        };
      });
    }
    case 'log_reading': {
      const p = args.payload;
      const log = { id: uid(), book_id: p.book_id, date: p.date, pages_read: p.pages_read, minutes_read: p.minutes_read };
      db.reading_logs.push(log);
      saveFallback(db);
      return log;
    }

    case 'create_workout': {
      const p = args.payload;
      const w = {
        id: uid(),
        timestamp: now,
        tz_offset_minutes: p.tz_offset_minutes ?? tzOffsetMinutes(),
        workout_type: p.workout_type,
        duration_minutes: p.duration_minutes,
        details_json: p.details_json || null,
        notes: p.notes || null,
        source: 'manual',
      };
      db.workouts.unshift(w);
      saveFallback(db);
      return w;
    }
    case 'list_workouts':
      return db.workouts;

    case 'get_home_snapshot': {
      const date = args.date;
      const mealsToday = db.meals.filter((m) => !m.deleted_at && isoLocalDate(m.captured_at, m.tz_offset_minutes) === date);
      const calories_today = mealsToday.reduce((s, m) => s + (m.manual_calories ?? m.total_kcal ?? 0), 0);
      const has_pending_meals = mealsToday.some((m) => m.status === 'pending' && m.manual_calories == null);

      const recent = [
        ...db.meals.filter((m) => !m.deleted_at).map((m) => ({
          id: m.id,
          kind: 'meal',
          title: m.user_note || m.meal_type,
          detail: m.manual_calories ? `${m.manual_calories} kcal` : 'Waiting for tonight',
          timestamp: m.captured_at,
          tz_offset_minutes: m.tz_offset_minutes,
          status: m.status,
          kcal: m.manual_calories,
          thumbnail_b64: m.thumbnail_b64,
        })),
        ...db.voices.filter((v) => !v.deleted_at).map((v) => ({
          id: v.id,
          kind: 'voice',
          title: 'Voice note',
          detail: 'Waiting for tonight',
          timestamp: v.recorded_at,
          tz_offset_minutes: v.tz_offset_minutes,
          status: v.status,
          duration_seconds: v.duration_seconds,
        })),
        ...db.ideas.filter((i) => !i.deleted_at).map((i) => ({
          id: i.id,
          kind: 'note',
          title: i.title || i.raw_text,
          detail: i.raw_text,
          timestamp: i.created_at,
          tz_offset_minutes: i.tz_offset_minutes,
          status: i.status,
        })),
      ]
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 3);

      const readToday = db.reading_logs.some((r) => r.date === date);
      return {
        recent,
        calories_today,
        has_pending_meals,
        steps_today: null,
        reading_streak_days: readToday ? 1 : 0,
        habit_streak_days: 0,
        pending_sync_count: db.ideas.length + db.meals.length + db.voices.length + db.workouts.length + db.reading_logs.length,
      };
    }

    case 'get_health_snapshot': {
      const date = args.date;
      const mealsToday = db.meals.filter((m) => !m.deleted_at && isoLocalDate(m.captured_at, m.tz_offset_minutes) === date);
      const calories_today = mealsToday.reduce((s, m) => s + (m.manual_calories ?? m.total_kcal ?? 0), 0);
      const has_pending_meals = mealsToday.some((m) => m.status === 'pending' && m.manual_calories == null);
      return {
        date,
        calories_today,
        calorie_target: 2200,
        protein_today: 0,
        carbs_today: 0,
        fat_today: 0,
        has_pending_meals,
        metrics: null,
        habits: await fallbackInvoke('list_habits', { date }),
        books: await fallbackInvoke('list_books', { date }),
        recent_workouts: db.workouts.slice(0, 10),
        latest_weekly_report: null,
      };
    }

    case 'get_storage_stats':
      return {
        db_bytes: (localStorage.getItem(STORE_KEY) || '').length,
        media_bytes: 0,
        meal_photo_count: db.meals.filter((m) => !m.deleted_at && m.photo_path).length,
        audio_file_count: db.voices.filter((v) => !v.deleted_at && v.audio_file_path).length,
      };

    default:
      return null;
  }
}
