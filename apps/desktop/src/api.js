/**
 * Tauri IPC Client with graceful browser fallback for Hashi Desktop
 */

function isTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

async function invoke(cmd, args = {}) {
  if (isTauri() && window.__TAURI_INTERNALS__?.invoke) {
    return await window.__TAURI_INTERNALS__.invoke(cmd, args);
  }
  return null;
}

export const api = {
  isTauri,

  async getHomeSnapshot(date = null) {
    if (isTauri()) {
      return await invoke('get_home_snapshot', { date });
    }
    return null;
  },

  async getHealthSnapshot(date = null) {
    if (isTauri()) {
      return await invoke('get_health_snapshot', { date });
    }
    return null;
  },

  async listIdeas(search = null, tag = null, status = null) {
    if (isTauri()) {
      return await invoke('list_ideas', { search, tag, status });
    }
    return null;
  },

  async createIdea({ title = null, raw_text, tags = [], tz_offset_minutes = 330 }) {
    if (isTauri()) {
      return await invoke('create_idea', {
        title,
        raw_text,
        tags,
        tz_offset_minutes,
      });
    }
    return null;
  },

  async updateIdea({ id, title = null, raw_text, tags = [], status = null }) {
    if (isTauri()) {
      return await invoke('update_idea', { id, title, raw_text, tags, status });
    }
    return null;
  },

  async setIdeaStatus(id, status) {
    if (isTauri()) {
      return await invoke('set_idea_status', { id, status });
    }
    return null;
  },

  async deleteIdea(id) {
    if (isTauri()) {
      return await invoke('delete_idea', { id });
    }
    return null;
  },

  async listMeals(date = null) {
    if (isTauri()) {
      return await invoke('list_meals', { date });
    }
    return null;
  },

  async createMeal(payload) {
    if (isTauri()) {
      return await invoke('create_meal', { payload });
    }
    return null;
  },

  async deleteMeal(id) {
    if (isTauri()) {
      return await invoke('delete_meal', { id });
    }
    return null;
  },

  async listVoiceJournals(date = null) {
    if (isTauri()) {
      return await invoke('list_voice_journals', { date });
    }
    return null;
  },

  async deleteVoiceJournal(id) {
    if (isTauri()) {
      return await invoke('delete_voice_journal', { id });
    }
    return null;
  },

  async listHabits(date = null) {
    if (isTauri()) {
      return await invoke('list_habits', { date });
    }
    return null;
  },

  async toggleHabit(habit_id, date = null) {
    if (isTauri()) {
      return await invoke('toggle_habit', { habit_id, date });
    }
    return null;
  },

  async createHabit(name) {
    if (isTauri()) {
      return await invoke('create_habit', { name });
    }
    return null;
  },

  async archiveHabit(habit_id, archived = true) {
    if (isTauri()) {
      return await invoke('archive_habit', { habit_id, archived });
    }
    return null;
  },

  async reorderHabits(ordered_ids) {
    if (isTauri()) {
      return await invoke('reorder_habits', { ordered_ids });
    }
    return null;
  },

  async listBooks(date = null) {
    if (isTauri()) {
      return await invoke('list_books', { date });
    }
    return null;
  },

  async logReading({ book_id, date, pages_read, minutes_read }) {
    if (isTauri()) {
      return await invoke('log_reading', {
        book_id,
        date,
        pages_read,
        minutes_read,
      });
    }
    return null;
  },

  async createWorkout(workout) {
    if (isTauri()) {
      return await invoke('create_workout', workout);
    }
    return null;
  },

  async listWorkouts(date = null) {
    if (isTauri()) {
      return await invoke('list_workouts', { date });
    }
    return null;
  },

  async search(query) {
    if (isTauri()) {
      return await invoke('search', { query });
    }
    return null;
  },

  async getStorageStats() {
    if (isTauri()) {
      return await invoke('get_storage_stats');
    }
    return null;
  },
};
