export type MobileTab = 'home' | 'ideas' | 'health' | 'journal';
export type CaptureSheetKind = 'meal' | 'voice' | 'note' | 'habit' | 'sync' | 'settings';

export interface MobileEntry {
  id: number;
  type: 'meal' | 'voice' | 'note';
  text: string;
  t: number;
  dur?: number;
  pts?: string[];
  kcal?: number;
  pro?: number;
  carbs?: number;
  fat?: number;
  img?: string;
  status?: 'raw' | 'processed' | 'waiting';
}

export type HabitItem = [string, number]; // [name, done (0|1)]

export interface MobileState {
  tab: MobileTab;
  entries: MobileEntry[];
  habits: HabitItem[];
  reading: {
    title: string;
    currentPage: number;
    totalPages: number;
    minutesToday: number;
  };
  syncStatus: {
    pendingCount: number;
    lastSyncText: string;
    pcFound: boolean;
  };
  theme: 'system' | 'light' | 'dark';
}
