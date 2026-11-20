export type MobileTab = 'home' | 'ideas' | 'health' | 'journal';
export type CaptureSheetKind = 'meal' | 'voice' | 'note' | 'habit' | 'sync' | 'settings';

export interface Idea {
  id: string;
  created_at: string;
  updated_at: string;
  device_id: string;
  dirty: boolean;
  deleted_at: string | null;
  version: number;
  tz_offset_minutes: number;
  title: string | null;
  raw_text: string;
  structured_bullets: string[] | null;
  tags: string[];
  status: 'raw' | 'processed' | 'merged' | 'pending_merge';
}

export interface IdeaRevision {
  id: string;
  idea_id: string;
  rev_type: 'base' | 'phone' | 'pc' | 'merged' | 'edit';
  content: string;
  timestamp: string;
}

export interface Meal {
  id: string;
  captured_at: string;
  tz_offset_minutes: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  photo_path: string | null;
  photo_sha256: string | null;
  thumbnail_b64: string | null;
  user_note: string | null;
  manual_calories: number | null;
  total_kcal: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
}

export interface VoiceJournalEntry {
  id: string;
  recorded_at: string;
  tz_offset_minutes: number;
  duration_seconds: number;
  audio_file_path: string | null;
  audio_sha256: string | null;
  transcript: string | null;
  edited_transcript: string | null;
  summary_bullets: string[] | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
}

export interface HabitWithStatus {
  id: string;
  name: string;
  schedule: string;
  sort_order: number;
  archived: boolean;
  done: boolean;
}

export interface BookProgress {
  id: string;
  title: string;
  total_pages: number | null;
  status: string;
  pages_read_total: number;
  minutes_today: number;
  pages_today: number;
}

export interface Workout {
  id: string;
  timestamp: string;
  tz_offset_minutes: number;
  workout_type: 'treadmill' | 'strength' | 'mobility' | 'custom';
  duration_minutes: number;
  details_json: string | null;
  notes: string | null;
  source: 'manual' | 'health_connect';
}

export interface StorageStats {
  db_bytes: number;
  media_bytes: number;
  meal_photo_count: number;
  audio_file_count: number;
}
