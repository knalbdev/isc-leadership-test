import { showToast } from './utils/toast.js';

const TOTAL = 15 * 60;
let seconds  = TOTAL;
let running  = false;
let interval = null;

function $d() { return document.getElementById('timerDisplay'); }
function $p() { return document.getElementById('timerProgress'); }
function $b() { return document.getElementById('timerPlayBtn'); }

function renderDisplay() {
  const m  = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s  = String(seconds % 60).padStart(2, '0');
  const el = $d();
  if (!el) return;
  el.textContent = `${m}:${s}`;

  // color states
  el.className = 'timer-digits';
  if (seconds <= 60) el.classList.add('danger');
  else if (seconds <= 300) el.classList.add('warning');

  // progress bar
  const pct  = (seconds / TOTAL) * 100;
  const prog = $p();
  if (!prog) return;
  prog.style.width = `${pct}%`;
  prog.className = `timer-bar ${seconds <= 60 ? 'timer-bar-danger' : seconds <= 300 ? 'timer-bar-warn' : ''}`;
}

function renderBtn() {
  const btn = $b();
  if (!btn) return;
  btn.innerHTML = running
    ? `<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause`
    : `<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> ${seconds < TOTAL && seconds > 0 ? 'Lanjut' : 'Mulai'}`;
}

export function toggle() {
  if (running) {
    clearInterval(interval);
    running = false;
    renderBtn();
    return;
  }
  if (seconds <= 0) return;
  running = true;
  renderBtn();
  interval = setInterval(() => {
    seconds--;
    renderDisplay();
    if (seconds <= 0) {
      clearInterval(interval);
      running = false;
      renderBtn();
      showToast('Waktu wawancara habis!', 'warning', 5000);
    }
  }, 1000);
}

export function reset() {
  clearInterval(interval);
  running  = false;
  seconds  = TOTAL;
  renderDisplay();
  renderBtn();
}

export function init() {
  // Clear any orphaned interval from the previous DOM mount
  clearInterval(interval);
  interval = null;

  // If the timer was running when the user navigated away, restart counting
  if (running && seconds > 0) {
    interval = setInterval(() => {
      seconds--;
      renderDisplay();
      if (seconds <= 0) {
        clearInterval(interval);
        running = false;
        renderBtn();
        showToast('Waktu wawancara habis!', 'warning', 5000);
      }
    }, 1000);
  }

  renderDisplay();
  renderBtn();
}
