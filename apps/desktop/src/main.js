import { renderComposer } from './components/Composer.js';
import { renderFab } from './components/FabMenu.js';
import { renderFoodView } from './components/FoodView.js';
import { renderHealthView } from './components/HealthView.js';
import { renderIdeasView } from './components/IdeasView.js';
import { renderJournalView } from './components/JournalView.js';
import { renderPrivateView } from './components/PrivateView.js';
import { renderSettingsView } from './components/SettingsView.js';
import { renderSidebar } from './components/Sidebar.js';
import { renderTodayView } from './components/TodayView.js';
import { dateLabel, renderTopbar } from './components/Topbar.js';
import { ic } from './icons.js';
import { api } from './api.js';
import {
  addIdea,
  addMeal,
  loadLocalSettings,
  moveIdeaStatus,
  refreshState,
  S,
  saveLocalSettings,
  toggleHabitByIndex
} from './state.js';

let comp = null;
let menuOpen = false;
let recordInterval = null;
let recordSec = 0;
let photoData = '';
let searchQuery = '';
let selectedMeal = null;

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
  const sideEl = document.getElementById('side');
  if (sideEl) sideEl.innerHTML = renderSidebar();

  const dlEl = document.getElementById('dl');
  if (dlEl) dlEl.textContent = dateLabel();

  const q = searchQuery.toLowerCase();
  const filtered = S.entries
    .slice()
    .sort((a, b) => b.t - a.t)
    .filter((e) => !q || e.text.toLowerCase().includes(q) || (e.title && e.title.toLowerCase().includes(q)));

  const composerHtml = renderComposer(comp, photoData, recordInterval, recordSec);
  const fabHtml = renderFab(menuOpen);

  let viewHtml = '';
  switch (S.tab) {
    case 'today':
      viewHtml = renderTodayView(filtered, composerHtml) + fabHtml;
      break;
    case 'food':
      viewHtml = renderFoodView(filtered, composerHtml, selectedMeal) + fabHtml;
      break;
    case 'ideas':
      viewHtml = renderIdeasView(filtered, composerHtml, S.filterTag) + fabHtml;
      break;
    case 'journal':
      viewHtml = renderJournalView(filtered, composerHtml) + fabHtml;
      break;
    case 'health':
      viewHtml = renderHealthView();
      break;
    case 'private':
      viewHtml = renderPrivateView();
      break;
    case 'settings':
      viewHtml = renderSettingsView();
      break;
    default:
      viewHtml = renderTodayView(filtered, composerHtml) + fabHtml;
  }

  const viewEl = document.getElementById('view');
  if (viewEl) viewEl.innerHTML = viewHtml;
}

function doneComposer() {
  comp = null;
  menuOpen = false;
  photoData = '';
  if (recordInterval) {
    clearInterval(recordInterval);
    recordInterval = null;
  }
  recordSec = 0;
  render();
}

function setupEventListeners() {
  document.addEventListener('click', async (ev) => {
    const target = ev.target;
    if (!target) return;

    const x = target.closest(
      '[data-c],[data-t],[data-s],[data-h],[data-p],[data-e],[data-filter],[data-theme-val],[data-action],[data-meal-id],[data-move-id],[data-delete-idea],#ph,#rc,#pv,#nx'
    );

    if (!x) {
      if (menuOpen) {
        menuOpen = false;
        render();
      }
      return;
    }

    const d = x.dataset;

    if (d.t) {
      S.tab = d.t;
      comp = null;
      menuOpen = false;
      saveLocalSettings();
      render();
    } else if (x.id === 'pv' || x.id === 'nx') {
      S.off += x.id === 'pv' ? -1 : 1;
      if (S.off > 0) S.off = 0;
      await refreshState();
      render();
    } else if (d.s === 'menu') {
      menuOpen = !menuOpen;
      render();
    } else if (d.c) {
      comp = d.c;
      menuOpen = false;
      if (comp === 'voice' && S.tab !== 'journal' && S.tab !== 'today') S.tab = 'today';
      if (comp === 'note' && ['health', 'journal', 'private', 'food', 'settings'].includes(S.tab)) S.tab = 'ideas';
      if (comp === 'meal' && S.tab !== 'food' && S.tab !== 'today') S.tab = 'food';
      render();
    } else if (x.id === 'ph') {
      const fi = document.getElementById('fi');
      if (fi) fi.click();
    } else if (x.id === 'rc') {
      if (recordInterval) {
        clearInterval(recordInterval);
        recordInterval = null;
        render();
        return;
      }
      recordInterval = window.setInterval(() => {
        recordSec++;
        const tm = document.getElementById('tm');
        const rb = document.getElementById('rb');
        if (tm) {
          tm.textContent = `${Math.floor(recordSec / 60)}:${String(recordSec % 60).padStart(2, '0')} / 1:00`;
        }
        if (rb) {
          rb.style.width = `${Math.min(100, (recordSec / 60) * 100)}%`;
        }
        if (recordSec >= 60) {
          clearInterval(recordInterval);
          recordInterval = null;
          render();
        }
      }, 1000);
      render();
    } else if (d.s === 'cancel') {
      doneComposer();
    } else if (d.s === 'save') {
      if (comp === 'meal') {
        const nm = document.getElementById('nm')?.value.trim() || 'Meal';
        const kc = +document.getElementById('kc')?.value || 0;
        const mt = document.getElementById('mt')?.value || 'lunch';
        await addMeal({
          meal_type: mt,
          user_note: nm,
          calories: kc,
          thumbnail_b64: photoData || null
        });
      } else if (comp === 'note') {
        const ti = document.getElementById('ti')?.value.trim();
        const tx = document.getElementById('tx')?.value.trim();
        const tg = document.getElementById('tg')?.value.split(',').map((s) => s.trim()).filter(Boolean);
        if (!tx && !ti) return;
        await addIdea({
          title: ti || null,
          raw_text: tx || ti,
          tags: tg || []
        });
      } else if (comp === 'voice') {
        if (!recordSec) return;
        // Mock voice save on desktop
        S.entries.unshift({
          id: 'v-' + Date.now(),
          type: 'voice',
          text: 'Voice note recorded on desktop',
          t: Date.now(),
          dur: recordSec,
          status: 'processed'
        });
      }
      doneComposer();
    } else if (d.moveId && d.moveTo) {
      await moveIdeaStatus(d.moveId, d.moveTo);
      render();
    } else if (d.deleteIdea) {
      if (api.isTauri()) {
        await api.deleteIdea(d.deleteIdea);
        await refreshState();
      } else {
        S.entries = S.entries.filter((e) => e.id !== d.deleteIdea);
      }
      render();
    } else if (d.action === 'toggle-ideas-mode') {
      S.ideasViewMode = d.mode;
      saveLocalSettings();
      render();
    } else if (d.filter) {
      S.filterTag = d.filter;
      render();
    } else if (d.h !== undefined) {
      await toggleHabitByIndex(+d.h);
      render();
    } else if (d.p) {
      const btn = x;
      const bar = document.getElementById(`b${d.p}`);
      const entry = S.entries.find((q) => String(q.id) === String(d.p));
      if (!entry) return;

      if (btn._t) {
        clearInterval(btn._t);
        btn._t = null;
        btn.innerHTML = ic('play', 13);
        return;
      }
      let s = 0;
      btn.innerHTML = ic('pause', 13);
      btn._t = window.setInterval(() => {
        s++;
        if (bar) bar.style.width = `${Math.min(100, (s / (entry.dur || 30)) * 100)}%`;
        if (s >= (entry.dur || 30)) {
          clearInterval(btn._t);
          btn._t = null;
          btn.innerHTML = ic('play', 13);
          if (bar) bar.style.width = '0%';
        }
      }, 1000);
    } else if (d.e && !target.closest('.play') && !target.closest('button')) {
      x.classList.toggle('open');
    } else if (d.mealId) {
      selectedMeal = S.entries.find((e) => String(e.id) === String(d.mealId)) || null;
      render();
    } else if (d.s === 'close-meal-detail') {
      selectedMeal = null;
      render();
    } else if (d.action === 'unlock-private') {
      S.privateUnlocked = true;
      render();
    } else if (d.action === 'lock-private') {
      S.privateUnlocked = false;
      render();
    } else if (d.themeVal) {
      S.theme = d.themeVal;
      saveLocalSettings();
      applyTheme();
      render();
    }
  });

  document.addEventListener('change', (ev) => {
    const target = ev.target;
    if (target && target.id === 'fi' && target.files && target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        photoData = reader.result;
        const ph = document.getElementById('ph');
        if (ph) ph.innerHTML = `<img src="${photoData}" alt="">`;
      };
      reader.readAsDataURL(target.files[0]);
    }
  });

  const qInput = document.getElementById('q');
  if (qInput) {
    qInput.addEventListener('input', (ev) => {
      searchQuery = ev.target.value.trim();
      render();
    });
  }
}

export async function init() {
  loadLocalSettings();
  applyTheme();

  const topEl = document.getElementById('top');
  if (topEl) topEl.innerHTML = renderTopbar();

  setupEventListeners();

  await refreshState();
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
