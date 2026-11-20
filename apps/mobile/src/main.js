import { api, dateStrWithOffset, todayDateStr, tzOffsetMinutes } from './api.js';
import {
  captureVideoFrame,
  processImageFile,
  setFlashMode,
  startViewfinder,
  stopViewfinder,
} from './camera.js';
import { renderBottomNav } from './components/BottomNav.js';
import { renderHeader } from './components/Header.js';
import { renderHealthView } from './components/HealthView.js';
import { renderHomeView } from './components/HomeView.js';
import { renderIdeasView } from './components/IdeasView.js';
import { renderJournalView } from './components/JournalView.js';
import { renderSettingsSheet } from './components/SettingsSheet.js';
import { renderHabitSheet } from './components/sheets/HabitSheet.js';
import { getAutoMealType, renderMealSheet } from './components/sheets/MealSheet.js';
import { renderNoteSheet } from './components/sheets/NoteSheet.js';
import { renderVoiceSheet } from './components/sheets/VoiceSheet.js';
import { renderSyncSheet } from './components/SyncSheet.js';
import { ic } from './icons.js';
import {
  blobToBase64,
  cleanupAudioCapture,
  getRecordedAudioUrl,
  getRecordedBlob,
  startAudioCapture,
  stopAudioCapture,
} from './recorder.js';
import {
  checkForAppUpdate,
  clearMobilePairing,
  downloadAppUpdate,
  loadPrefs,
  pairManualHost,
  pairWithQrPayload,
  refreshAll,
  refreshIdeas,
  refreshJournal,
  S,
  savePrefs,
  triggerMobileSync,
} from './state.js';

let activeSheet = null;

// Meal sheet state
let currentMealType = getAutoMealType();
let capturedMealPhoto = '';
let capturedMealThumb = '';
let flashMode = 'auto';
let cameraError = '';
let mealNoteDraft = '';
let mealKcalDraft = '';

// Voice sheet state
let isRecording = false;
let recordSec = 0;
let recordMaxSec = 30;
let recordInterval = null;
let hasRecordedAudio = false;
let isPlayingPreview = false;
let micNotice = '';

// Note / Idea editor state
let editingIdeaId = null;
let noteTitleDraft = '';
let noteTextDraft = '';
let selectedNoteTags = [];
let showIdeaHistory = false;
let ideaRevisions = [];
let confirmDeleteIdea = false;

// Habit sheet state
let activeHabitSegment = 'habits';
let editingHabits = false;
let selectedBookId = '';
let addingBook = false;
let activeWorkoutPreset = 'treadmill';

function applyTheme() {
  const root = document.documentElement;
  if (S.theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else if (S.theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

export function render() {
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

function renderActiveSheet() {
  const existing = document.getElementById('sh');
  if (existing) existing.remove();

  if (!activeSheet) {
    stopViewfinder();
    return;
  }

  const appEl = document.getElementById('app');
  if (!appEl) return;

  const wrapper = document.createElement('div');
  let sheetHtml = '';

  switch (activeSheet) {
    case 'meal':
      sheetHtml = renderMealSheet({
        capturedPhoto: capturedMealPhoto,
        selectedType: currentMealType,
        flashMode,
        cameraError,
        noteValue: mealNoteDraft,
        kcalValue: mealKcalDraft,
      });
      break;
    case 'voice':
      sheetHtml = renderVoiceSheet({
        recording: isRecording,
        sec: recordSec,
        maxSec: recordMaxSec,
        hasRecordedAudio,
        audioUrl: getRecordedAudioUrl(),
        isPlayingPreview,
        micNotice,
      });
      break;
    case 'note':
      sheetHtml = renderNoteSheet({
        editingIdeaId,
        titleValue: noteTitleDraft,
        textValue: noteTextDraft,
        selectedTags: selectedNoteTags,
        showHistory: showIdeaHistory,
        revisions: ideaRevisions,
        confirmDelete: confirmDeleteIdea,
      });
      break;
    case 'habit':
      sheetHtml = renderHabitSheet({
        segment: activeHabitSegment,
        editingHabits,
        selectedBookId,
        addingBook,
        workoutPreset: activeWorkoutPreset,
      });
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

  // Start live camera viewfinder when Meal sheet opens without a captured photo
  if (activeSheet === 'meal' && !capturedMealPhoto) {
    const videoEl = document.getElementById('vf-video');
    if (videoEl) {
      startViewfinder(videoEl).then((res) => {
        if (!res.ok && !cameraError && activeSheet === 'meal' && !capturedMealPhoto) {
          cameraError = res.reason;
          renderActiveSheet();
        }
      });
    }
  } else {
    stopViewfinder();
  }
}

function captureMealDraftFields() {
  const nm = document.getElementById('nm');
  const kc = document.getElementById('kc');
  if (nm) mealNoteDraft = nm.value;
  if (kc) mealKcalDraft = kc.value;
}

function captureNoteDraftFields() {
  const ttl = document.getElementById('note-ttl');
  const tx = document.getElementById('tx');
  if (ttl) noteTitleDraft = ttl.value;
  if (tx) noteTextDraft = tx.value;
}

function closeSheet() {
  stopViewfinder();
  if (recordInterval) {
    clearInterval(recordInterval);
    recordInterval = null;
  }
  cleanupAudioCapture();

  isRecording = false;
  recordSec = 0;
  recordMaxSec = 30;
  hasRecordedAudio = false;
  isPlayingPreview = false;
  micNotice = '';

  capturedMealPhoto = '';
  capturedMealThumb = '';
  cameraError = '';
  mealNoteDraft = '';
  mealKcalDraft = '';

  editingIdeaId = null;
  noteTitleDraft = '';
  noteTextDraft = '';
  selectedNoteTags = [];
  showIdeaHistory = false;
  ideaRevisions = [];
  confirmDeleteIdea = false;

  editingHabits = false;
  addingBook = false;
  activeSheet = null;
  render();
}

async function finishVoiceRecording() {
  if (recordInterval) {
    clearInterval(recordInterval);
    recordInterval = null;
  }
  isRecording = false;
  await stopAudioCapture();
  hasRecordedAudio = true;
  renderActiveSheet();
}

function setupEventListeners() {
  document.addEventListener('click', async (ev) => {
    const target = ev.target;
    if (!target) return;

    const x = target.closest(
      '[data-c],[data-t],[data-s],[data-habit-id],[data-sheet],[data-action],[data-meal-type],[data-hseg],[data-workout-preset],[data-reading-add],[data-theme-val],[data-note-tag],[data-idea-filter-tag],[data-open-idea],[data-select-book],[data-jday],#shutter-btn,#retake-photo,#toggle-flash,#pick-photo-file,#rc,#keep-going-btn,#preview-play,.row'
    );
    if (!x) return;

    const d = x.dataset;

    // Bottom navigation tabs
    if (d.t) {
      S.tab = d.t;
      savePrefs();
      await refreshAll();
      render();
      return;
    }

    // Open capture sheet from Home tiles or FABs
    if (d.c) {
      activeSheet = d.c;
      if (activeSheet === 'meal') {
        currentMealType = getAutoMealType();
        capturedMealPhoto = '';
        capturedMealThumb = '';
        cameraError = '';
        mealNoteDraft = '';
        mealKcalDraft = '';
      } else if (activeSheet === 'note') {
        editingIdeaId = null;
        noteTitleDraft = '';
        noteTextDraft = '';
        selectedNoteTags = [];
        showIdeaHistory = false;
        ideaRevisions = [];
        confirmDeleteIdea = false;
      } else if (activeSheet === 'habit') {
        if (!selectedBookId && S.health.books[0]) {
          selectedBookId = S.health.books[0].id;
        }
      }
      renderActiveSheet();
      return;
    }

    // Open Sync / Settings sheet
    if (d.sheet) {
      activeSheet = d.sheet;
      await refreshAll();
      renderActiveSheet();
      return;
    }

    // Close active sheet
    if (d.s === 'close') {
      closeSheet();
      return;
    }

    // Journal date switcher
    if (d.jday) {
      S.journalDayOffset = Math.min(0, S.journalDayOffset + Number(d.jday));
      await refreshJournal();
      render();
      return;
    }

    // Ideas tag filter
    if (d.ideaFilterTag) {
      S.ideasTag = d.ideaFilterTag;
      await refreshIdeas();
      render();
      return;
    }

    // Open existing idea in editor
    if (d.openIdea) {
      const idea = S.ideas.find((i) => i.id === d.openIdea);
      if (!idea) return;
      editingIdeaId = idea.id;
      noteTitleDraft = idea.title || '';
      noteTextDraft = idea.raw_text || '';
      selectedNoteTags = [...(idea.tags || [])];
      showIdeaHistory = false;
      ideaRevisions = [];
      confirmDeleteIdea = false;
      activeSheet = 'note';
      renderActiveSheet();
      return;
    }

    // Meal sheet interactions
    if (x.id === 'toggle-flash') {
      captureMealDraftFields();
      flashMode = flashMode === 'auto' ? 'on' : flashMode === 'on' ? 'off' : 'auto';
      await setFlashMode(flashMode);
      renderActiveSheet();
      return;
    }

    if (x.id === 'pick-photo-file') {
      const fi = document.getElementById('fi');
      if (fi) fi.click();
      return;
    }

    if (x.id === 'shutter-btn') {
      captureMealDraftFields();
      const videoEl = document.getElementById('vf-video');
      const frame = captureVideoFrame(videoEl);
      if (frame) {
        capturedMealPhoto = frame.photoDataUrl;
        capturedMealThumb = frame.thumbnailDataUrl;
        stopViewfinder();
        renderActiveSheet();
      } else {
        // Fallback to file chooser when no webcam is active
        const fi = document.getElementById('fi');
        if (fi) fi.click();
      }
      return;
    }

    if (x.id === 'retake-photo') {
      captureMealDraftFields();
      capturedMealPhoto = '';
      capturedMealThumb = '';
      cameraError = '';
      renderActiveSheet();
      return;
    }

    if (d.mealType) {
      captureMealDraftFields();
      currentMealType = d.mealType;
      renderActiveSheet();
      return;
    }

    if (d.s === 'meal') {
      captureMealDraftFields();
      const note = mealNoteDraft.trim() || null;
      const kcalRaw = mealKcalDraft.trim();
      const manualCalories = kcalRaw ? Math.max(0, parseInt(kcalRaw, 10)) : null;

      await api.createMeal({
        meal_type: currentMealType.toLowerCase(),
        user_note: note,
        manual_calories: Number.isFinite(manualCalories) ? manualCalories : null,
        photo_b64: capturedMealPhoto || null,
        photo_ext: 'jpg',
        thumbnail_b64: capturedMealThumb || null,
        tz_offset_minutes: tzOffsetMinutes(),
      });
      await refreshAll();
      closeSheet();
      return;
    }

    // Voice journal interactions
    if (x.id === 'rc') {
      if (isRecording) {
        await finishVoiceRecording();
        return;
      }
      recordSec = 0;
      recordMaxSec = 30;
      hasRecordedAudio = false;
      isPlayingPreview = false;
      const res = await startAudioCapture();
      micNotice = res.ok ? '' : res.reason;
      isRecording = true;

      recordInterval = window.setInterval(async () => {
        recordSec++;
        const tm = document.getElementById('tm');
        const rb = document.getElementById('rb');
        const elapsed = `${Math.floor(recordSec / 60)}:${String(recordSec % 60).padStart(2, '0')}`;
        const maxTime = `${Math.floor(recordMaxSec / 60)}:${String(recordMaxSec % 60).padStart(2, '0')}`;
        if (tm) {
          tm.innerHTML = `${elapsed} <span style="font-size:20px;color:var(--mu)">/ ${maxTime}</span>`;
        }
        if (rb) {
          rb.style.width = `${Math.min(100, (recordSec / recordMaxSec) * 100)}%`;
        }
        if (recordSec === 20 && recordMaxSec === 30) {
          renderActiveSheet();
        }
        if (recordSec >= recordMaxSec) {
          await finishVoiceRecording();
        }
      }, 1000);
      renderActiveSheet();
      return;
    }

    if (x.id === 'keep-going-btn') {
      recordMaxSec = 60;
      renderActiveSheet();
      return;
    }

    if (x.id === 'preview-play') {
      const audioEl = document.getElementById('voice-preview-audio');
      const barEl = document.getElementById('preview-bar');
      if (!audioEl) return;

      if (audioEl.paused) {
        isPlayingPreview = true;
        x.innerHTML = ic('pause', 14);
        audioEl.ontimeupdate = () => {
          if (barEl && audioEl.duration) {
            barEl.style.width = `${Math.min(100, (audioEl.currentTime / audioEl.duration) * 100)}%`;
          }
        };
        audioEl.onended = () => {
          isPlayingPreview = false;
          x.innerHTML = ic('play', 14);
          if (barEl) barEl.style.width = '0%';
        };
        audioEl.play().catch(() => {});
      } else {
        audioEl.pause();
        isPlayingPreview = false;
        x.innerHTML = ic('play', 14);
      }
      return;
    }

    if (d.action === 'save-voice') {
      const { blob, ext } = getRecordedBlob();
      const audioB64 = await blobToBase64(blob);
      await api.createVoiceJournal({
        duration_seconds: Math.min(60, Math.max(1, recordSec || 1)),
        audio_b64: audioB64,
        audio_ext: ext || 'opus',
        tz_offset_minutes: tzOffsetMinutes(),
      });
      await refreshAll();
      closeSheet();
      return;
    }

    if (d.action === 'discard-voice') {
      closeSheet();
      return;
    }

    // Note / Idea interactions
    if (d.noteTag) {
      captureNoteDraftFields();
      const tg = d.noteTag;
      if (selectedNoteTags.includes(tg)) {
        selectedNoteTags = selectedNoteTags.filter((t) => t !== tg);
      } else {
        selectedNoteTags = [...selectedNoteTags, tg];
      }
      renderActiveSheet();
      return;
    }

    if (d.action === 'add-custom-tag') {
      captureNoteDraftFields();
      const inp = document.getElementById('custom-tag-input');
      const val = inp?.value.trim().toLowerCase();
      if (val && !selectedNoteTags.includes(val)) {
        selectedNoteTags = [...selectedNoteTags, val];
      }
      renderActiveSheet();
      return;
    }

    if (d.action === 'toggle-idea-history') {
      captureNoteDraftFields();
      showIdeaHistory = !showIdeaHistory;
      if (showIdeaHistory && editingIdeaId) {
        ideaRevisions = await api.listIdeaRevisions(editingIdeaId);
      }
      renderActiveSheet();
      return;
    }

    if (d.action === 'ask-delete-idea') {
      captureNoteDraftFields();
      confirmDeleteIdea = true;
      renderActiveSheet();
      return;
    }

    if (d.action === 'confirm-delete-idea') {
      if (editingIdeaId) {
        await api.deleteIdea(editingIdeaId);
        await refreshAll();
      }
      closeSheet();
      return;
    }

    if (d.s === 'note') {
      captureNoteDraftFields();
      const tx = noteTextDraft.trim();
      if (!tx) return;
      const ttl = noteTitleDraft.trim() || null;

      if (editingIdeaId) {
        await api.updateIdea({
          id: editingIdeaId,
          title: ttl,
          raw_text: tx,
          tags: selectedNoteTags,
        });
      } else {
        await api.createIdea({
          title: ttl,
          raw_text: tx,
          tags: selectedNoteTags,
          tz_offset_minutes: tzOffsetMinutes(),
        });
      }
      await refreshAll();
      closeSheet();
      return;
    }

    // Habit sheet segment switching
    if (d.hseg) {
      activeHabitSegment = d.hseg;
      editingHabits = false;
      addingBook = false;
      if (activeHabitSegment === 'reading' && !selectedBookId && S.health.books[0]) {
        selectedBookId = S.health.books[0].id;
      }
      renderActiveSheet();
      return;
    }

    if (d.action === 'toggle-edit-habits') {
      editingHabits = !editingHabits;
      renderActiveSheet();
      return;
    }

    if (d.action === 'create-habit') {
      const inp = document.getElementById('new-habit-name');
      const name = inp?.value.trim();
      if (!name) return;
      await api.createHabit(name);
      await refreshAll();
      renderActiveSheet();
      return;
    }

    if (d.action === 'save-rename-habit' && d.habitId) {
      const inp = document.querySelector(`[data-rename-input="${d.habitId}"]`);
      const name = inp?.value.trim();
      if (!name) return;
      await api.renameHabit(d.habitId, name);
      await refreshAll();
      renderActiveSheet();
      return;
    }

    if (d.action === 'archive-habit' && d.habitId) {
      await api.archiveHabit(d.habitId, true);
      await refreshAll();
      renderActiveSheet();
      return;
    }

    // Toggle a habit check (works in both Health tab and Habit sheet)
    if (d.habitId && !d.action) {
      await api.toggleHabit(d.habitId, todayDateStr());
      await refreshAll();
      render();
      return;
    }

    // Reading segment interactions
    if (d.action === 'show-add-book') {
      addingBook = true;
      renderActiveSheet();
      return;
    }

    if (d.action === 'cancel-add-book') {
      addingBook = false;
      renderActiveSheet();
      return;
    }

    if (d.action === 'create-book') {
      const title = document.getElementById('new-book-title')?.value.trim();
      if (!title) return;
      const pagesRaw = document.getElementById('new-book-pages')?.value.trim();
      const totalPages = pagesRaw ? parseInt(pagesRaw, 10) : null;
      const created = await api.createBook(title, Number.isFinite(totalPages) ? totalPages : null);
      selectedBookId = created.id;
      addingBook = false;
      await refreshAll();
      renderActiveSheet();
      return;
    }

    if (d.selectBook) {
      selectedBookId = d.selectBook;
      renderActiveSheet();
      return;
    }

    if (d.readingAdd) {
      const inp = document.getElementById('reading-pages');
      if (inp) inp.value = String((parseInt(inp.value, 10) || 0) + parseInt(d.readingAdd, 10));
      return;
    }

    if (d.action === 'save-reading') {
      const activeId = selectedBookId || (S.health.books[0] ? S.health.books[0].id : '');
      if (!activeId) return;
      const pages = parseInt(document.getElementById('reading-pages')?.value || '0', 10) || 0;
      const mins = parseInt(document.getElementById('reading-mins')?.value || '0', 10) || 0;
      if (pages === 0 && mins === 0) return;

      await api.logReading({
        book_id: activeId,
        date: todayDateStr(),
        pages_read: pages,
        minutes_read: mins,
      });
      await refreshAll();
      closeSheet();
      return;
    }

    // Workout segment interactions
    if (d.workoutPreset) {
      activeWorkoutPreset = d.workoutPreset;
      renderActiveSheet();
      return;
    }

    if (d.action === 'save-workout') {
      const dur = parseInt(document.getElementById('w-dur')?.value || '0', 10) || 0;
      if (dur <= 0) return;

      let details = {};
      let notes = null;
      if (activeWorkoutPreset === 'treadmill') {
        details = {
          incline: parseFloat(document.getElementById('w-incline')?.value || '0') || 0,
          speed: parseFloat(document.getElementById('w-speed')?.value || '0') || 0,
        };
      } else if (activeWorkoutPreset === 'strength') {
        const exercise = document.getElementById('w-exercise')?.value.trim() || 'Strength';
        details = {
          exercise,
          sets: parseInt(document.getElementById('w-sets')?.value || '0', 10) || 0,
          reps: parseInt(document.getElementById('w-reps')?.value || '0', 10) || 0,
          weight: parseFloat(document.getElementById('w-weight')?.value || '0') || 0,
        };
        notes = exercise;
      } else {
        notes = document.getElementById('w-notes')?.value.trim() || null;
      }

      await api.createWorkout({
        workout_type: activeWorkoutPreset,
        duration_minutes: dur,
        details_json: Object.keys(details).length ? JSON.stringify(details) : null,
        notes,
        tz_offset_minutes: tzOffsetMinutes(),
      });
      await refreshAll();
      closeSheet();
      return;
    }

    // Sync / Settings actions
    if (d.themeVal) {
      S.theme = d.themeVal;
      savePrefs();
      applyTheme();
      renderActiveSheet();
      return;
    }

    if (d.action === 'sync-now') {
      try {
        await triggerMobileSync();
      } catch (e) {
        console.error('Sync failed:', e);
      }
      renderActiveSheet();
      render();
      return;
    }

    if (d.action === 'submit-qr-payload') {
      const input = document.getElementById('qr-input');
      const payload = input ? input.value.trim() : '';
      if (payload) {
        try {
          await pairWithQrPayload(payload);
        } catch (e) {
          console.error('Pairing failed:', e);
        }
        renderActiveSheet();
        render();
      }
      return;
    }

    if (d.action === 'toggle-manual-pairing') {
      S.pairing.showManual = !S.pairing.showManual;
      renderActiveSheet();
      return;
    }

    if (d.action === 'submit-manual-pairing') {
      const hostInput = document.getElementById('man-host');
      const portInput = document.getElementById('man-port');
      const secretInput = document.getElementById('man-secret');
      const host = hostInput ? hostInput.value.trim() : '10.71.162.203';
      const port = portInput ? parseInt(portInput.value.trim(), 10) || 8765 : 8765;
      const secret = secretInput ? secretInput.value.trim() : '';
      try {
        await pairManualHost(host, port, secret);
      } catch (e) {
        console.error('Manual pairing failed:', e);
      }
      renderActiveSheet();
      render();
      return;
    }

    if (d.action === 'check-update') {
      try {
        await checkForAppUpdate();
      } catch (e) {
        console.error('Update check failed:', e);
      }
      renderActiveSheet();
      return;
    }

    if (d.action === 'download-update') {
      try {
        await downloadAppUpdate();
      } catch (e) {
        console.error('Update download failed:', e);
      }
      renderActiveSheet();
      return;
    }

    if (d.action === 'clear-mobile-pairing') {
      try {
        await clearMobilePairing();
      } catch (e) {
        console.error('Clear pairing failed:', e);
      }
      renderActiveSheet();
      render();
      return;
    }

    // Expand/collapse row in place on Home
    if (x.classList.contains('row') && !d.openIdea) {
      x.classList.toggle('open');
    }
  });

  // File picker fallback for meal photos
  document.addEventListener('change', async (ev) => {
    const target = ev.target;
    if (target && target.id === 'fi' && target.files && target.files[0]) {
      captureMealDraftFields();
      try {
        const { photoDataUrl, thumbnailDataUrl } = await processImageFile(target.files[0]);
        capturedMealPhoto = photoDataUrl;
        capturedMealThumb = thumbnailDataUrl;
        stopViewfinder();
        renderActiveSheet();
      } catch (_) {}
      return;
    }

    // Journal native calendar picker
    if (target && target.id === 'journal-date-picker' && target.value) {
      const picked = new Date(target.value + 'T00:00:00');
      const today = new Date(dateStrWithOffset(0) + 'T00:00:00');
      const diffDays = Math.round((picked - today) / 86400000);
      S.journalDayOffset = Math.min(0, diffDays);
      await refreshJournal();
      render();
    }
  });

  // Ideas live search
  document.addEventListener('input', async (ev) => {
    const target = ev.target;
    if (target && target.id === 'ideas-search') {
      S.ideasSearch = target.value;
      await refreshIdeas();
      const pos = target.selectionStart;
      render();
      const next = document.getElementById('ideas-search');
      if (next) {
        next.focus();
        if (pos != null) next.setSelectionRange(pos, pos);
      }
    }
  });
}

async function init() {
  loadPrefs();
  applyTheme();
  setupEventListeners();
  await refreshAll();
  render();
}

window.addEventListener('DOMContentLoaded', init);
