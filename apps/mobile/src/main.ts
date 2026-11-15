import { renderBottomNav } from './components/BottomNav.js';
import { renderHeader } from './components/Header.js';
import { renderHealthView } from './components/HealthView.js';
import { renderHomeView } from './components/HomeView.js';
import { renderIdeasView } from './components/IdeasView.js';
import { renderJournalView } from './components/JournalView.js';
import { renderSettingsSheet } from './components/SettingsSheet.js';
import { HabitSegment, renderHabitSheet } from './components/sheets/HabitSheet.js';
import { getAutoMealType, renderMealSheet } from './components/sheets/MealSheet.js';
import { renderNoteSheet } from './components/sheets/NoteSheet.js';
import { renderVoiceSheet } from './components/sheets/VoiceSheet.js';
import { renderSyncSheet } from './components/SyncSheet.js';
import { ic } from './icons.js';
import { addEntry, loadState, S, saveState } from './state.js';
import { CaptureSheetKind, MobileTab } from './types.js';

let activeSheet: CaptureSheetKind | null = null;
let currentMealType = getAutoMealType();
let capturedMealPhoto = '';
let flashMode: 'auto' | 'on' | 'off' = 'auto';

let isRecording = false;
let recordSec = 0;
let recordMaxSec = 30;
let recordInterval: number | null = null;
let hasRecordedAudio = false;

let selectedNoteTag = 'dev';
let activeHabitSegment: HabitSegment = 'habits';
let activeWorkoutPreset: 'treadmill' | 'strength' | 'mobility' | 'custom' = 'treadmill';
let mobilePrivateUnlocked = false;

function applyTheme(): void {
  const root = document.documentElement;
  if (S.theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else if (S.theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

export function render(): void {
  const headerEl = document.querySelector('header');
  if (headerEl) headerEl.innerHTML = renderHeader();

  const navEl = document.getElementById('nav');
  if (navEl) navEl.innerHTML = renderBottomNav();

  let viewHtml = '';
  switch (S.tab) {
    case 'home':
      viewHtml = renderHomeView();
      break;
    case 'ideas':
      viewHtml = renderIdeasView();
      break;
    case 'health':
      viewHtml = renderHealthView();
      break;
    case 'journal':
      viewHtml = renderJournalView();
      break;
  }

  const viewEl = document.getElementById('view');
  if (viewEl) viewEl.innerHTML = viewHtml;

  renderActiveSheet();
}

function renderActiveSheet(): void {
  const existing = document.getElementById('sh');
  if (existing) existing.remove();

  if (!activeSheet) return;

  const appEl = document.getElementById('app');
  if (!appEl) return;

  const wrapper = document.createElement('div');
  let sheetHtml = '';

  switch (activeSheet) {
    case 'meal':
      sheetHtml = renderMealSheet(capturedMealPhoto, currentMealType, flashMode);
      break;
    case 'voice':
      sheetHtml = renderVoiceSheet(isRecording, recordSec, recordMaxSec, hasRecordedAudio);
      break;
    case 'note':
      sheetHtml = renderNoteSheet(selectedNoteTag);
      break;
    case 'habit':
      sheetHtml = renderHabitSheet(activeHabitSegment, activeWorkoutPreset, mobilePrivateUnlocked);
      break;
    case 'sync':
      sheetHtml = renderSyncSheet();
      break;
    case 'settings':
      sheetHtml = renderSettingsSheet();
      break;
  }

  wrapper.innerHTML = sheetHtml;
  const sheetEl = wrapper.firstElementChild;
  if (sheetEl) appEl.appendChild(sheetEl);
}

function closeSheet(): void {
  if (recordInterval) {
    clearInterval(recordInterval);
    recordInterval = null;
  }
  isRecording = false;
  recordSec = 0;
  recordMaxSec = 30;
  hasRecordedAudio = false;
  capturedMealPhoto = '';
  activeSheet = null;
  render();
}

function setupEventListeners(): void {
  document.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const x = target.closest<HTMLElement>(
      '[data-c],[data-t],[data-s],[data-h],[data-p],[data-sheet],[data-action],[data-meal-type],[data-hseg],[data-workout-preset],[data-priv-trigger],[data-reading-add],[data-theme-val],#shutter-btn,#retake-photo,#toggle-flash,#rc,#keep-going-btn,#preview-play,.row'
    );
    if (!x) return;

    const d = x.dataset;

    if (d.t) {
      S.tab = d.t as MobileTab;
      saveState();
      render();
    } else if (d.c) {
      activeSheet = d.c as CaptureSheetKind;
      if (activeSheet === 'meal') currentMealType = getAutoMealType();
      renderActiveSheet();
    } else if (d.sheet) {
      activeSheet = d.sheet as CaptureSheetKind;
      renderActiveSheet();
    } else if (d.s === 'close') {
      closeSheet();
    } else if (x.id === 'toggle-flash') {
      flashMode = flashMode === 'auto' ? 'on' : flashMode === 'on' ? 'off' : 'auto';
      renderActiveSheet();
    } else if (x.id === 'shutter-btn') {
      // Shutter click simulates CameraX capture to private storage
      capturedMealPhoto = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#26262B"/><text x="50%" y="50%" fill="#FF5A1F" font-family="Inter" font-size="20" font-weight="bold" text-anchor="middle">Meal Photo Captured</text></svg>'
      );
      renderActiveSheet();
    } else if (x.id === 'retake-photo') {
      capturedMealPhoto = '';
      renderActiveSheet();
    } else if (d.mealType) {
      currentMealType = d.mealType;
      renderActiveSheet();
    } else if (d.s === 'meal') {
      const nm = (document.getElementById('nm') as HTMLInputElement | null)?.value.trim() || 'Meal';
      const kc = +(document.getElementById('kc') as HTMLInputElement | null)?.value || 0;
      addEntry({
        type: 'meal',
        text: nm,
        kcal: kc,
        pro: Math.round(kc * 0.05),
        carbs: Math.round(kc * 0.1),
        fat: Math.round(kc * 0.03),
        img: capturedMealPhoto || undefined,
        status: 'waiting'
      });
      closeSheet();
    } else if (x.id === 'rc') {
      if (isRecording) {
        // Stop recording
        if (recordInterval) {
          clearInterval(recordInterval);
          recordInterval = null;
        }
        isRecording = false;
        hasRecordedAudio = true;
        renderActiveSheet();
      } else {
        // Start recording
        isRecording = true;
        hasRecordedAudio = false;
        recordInterval = window.setInterval(() => {
          recordSec++;
          const tm = document.getElementById('tm');
          const rb = document.getElementById('rb');
          if (tm) {
            tm.textContent = `${Math.floor(recordSec / 60)}:${String(recordSec % 60).padStart(2, '0')}`;
          }
          if (rb) {
            rb.style.width = `${Math.min(100, (recordSec / recordMaxSec) * 100)}%`;
          }
          if (recordSec === 30 && recordMaxSec === 30) {
            renderActiveSheet();
          }
          if (recordSec >= recordMaxSec) {
            if (recordInterval) clearInterval(recordInterval);
            recordInterval = null;
            isRecording = false;
            hasRecordedAudio = true;
            renderActiveSheet();
          }
        }, 1000);
        renderActiveSheet();
      }
    } else if (x.id === 'keep-going-btn') {
      recordMaxSec = 60;
      renderActiveSheet();
    } else if (d.action === 'save-voice') {
      addEntry({
        type: 'voice',
        text: 'Voice note',
        dur: recordSec || 1,
        status: 'waiting'
      });
      closeSheet();
    } else if (d.action === 'discard-voice') {
      closeSheet();
    } else if (d.s === 'note') {
      const ttl = (document.getElementById('note-ttl') as HTMLInputElement | null)?.value.trim();
      const tx = (document.getElementById('tx') as HTMLTextAreaElement | null)?.value.trim();
      if (!tx) return;
      addEntry({
        type: 'note',
        text: ttl ? `${ttl}: ${tx}` : tx,
        status: 'raw'
      });
      closeSheet();
    } else if (d.noteTag) {
      selectedNoteTag = d.noteTag;
      renderActiveSheet();
    } else if (d.hseg) {
      activeHabitSegment = d.hseg as HabitSegment;
      renderActiveSheet();
    } else if (d.workoutPreset) {
      activeWorkoutPreset = d.workoutPreset as any;
      renderActiveSheet();
    } else if (d.action === 'unlock-mobile-private') {
      mobilePrivateUnlocked = true;
      renderActiveSheet();
    } else if (d.action === 'save-reading') {
      const p = +(document.getElementById('reading-pages') as HTMLInputElement | null)?.value || 0;
      const m = +(document.getElementById('reading-mins') as HTMLInputElement | null)?.value || 0;
      S.reading.currentPage += p;
      S.reading.minutesToday += m;
      saveState();
      closeSheet();
    } else if (d.readingAdd) {
      const input = document.getElementById('reading-pages') as HTMLInputElement | null;
      if (input) input.value = String(+input.value + +d.readingAdd);
    } else if (d.action === 'save-workout') {
      closeSheet();
    } else if (d.action === 'save-private-entry') {
      closeSheet();
    } else if (d.h !== undefined) {
      const i = +d.h;
      if (S.habits[i]) {
        S.habits[i][1] = S.habits[i][1] ? 0 : 1;
        saveState();
        render();
      }
    } else if (d.p) {
      const btn = x;
      const bar = document.getElementById(`b${d.p}`);
      const entry = S.entries.find((q) => q.id === +d.p!);
      if (!entry) return;

      const anyBtn = btn as any;
      if (anyBtn._t) {
        clearInterval(anyBtn._t);
        anyBtn._t = null;
        btn.innerHTML = ic('play', 14);
        return;
      }
      let s = 0;
      btn.innerHTML = ic('pause', 14);
      anyBtn._t = window.setInterval(() => {
        s++;
        if (bar) bar.style.width = `${Math.min(100, (s / (entry.dur || 30)) * 100)}%`;
        if (s >= (entry.dur || 30)) {
          clearInterval(anyBtn._t);
          anyBtn._t = null;
          btn.innerHTML = ic('play', 14);
          if (bar) bar.style.width = '0%';
        }
      }, 1000);
    } else if (x.classList.contains('row')) {
      x.classList.toggle('open');
    } else if (d.action === 'sync-now') {
      S.syncStatus.pendingCount = 0;
      S.syncStatus.lastSyncText = 'Just now';
      saveState();
      renderActiveSheet();
    } else if (d.themeVal) {
      S.theme = d.themeVal as any;
      saveState();
      applyTheme();
      renderActiveSheet();
    }
  });
}

function init(): void {
  loadState();
  applyTheme();
  setupEventListeners();
  render();
}

window.addEventListener('DOMContentLoaded', init);
