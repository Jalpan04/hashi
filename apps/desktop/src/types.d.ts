export type EntryType = 'meal' | 'voice' | 'note';

export interface Entry {
  id: number;
  type: EntryType;
  text: string;
  t: number;
  dur?: number;
  pts?: string[];
  kcal?: number;
  pro?: number;
  carbs?: number;
  fat?: number;
  img?: string;
  status?: 'raw' | 'processed' | 'merged' | 'waiting';
  confidence?: number;
}

export type HabitItem = [string, number]; // [name, done (0|1)]

export interface DesktopState {
  tab: 'today' | 'food' | 'ideas' | 'journal' | 'health' | 'private' | 'settings';
  off: number; // day offset relative to today
  entries: Entry[];
  habits: HabitItem[];
  reading: {
    title: string;
    currentPage: number;
    totalPages: number;
    minutesToday: number;
  };
  privateUnlocked: boolean;
  privateEntries: {
    id: number;
    timestamp: number;
    trigger: string;
    place?: string;
    note?: string;
  }[];
  phoneConnected: boolean;
  theme: 'system' | 'light' | 'dark';
}
