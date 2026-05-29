import { GROUPS, GROUP_COLORS } from '../data/groups.js';
import { CRITERIA } from '../data/criteria.js';
import { getAll, getById, save } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { renderHeader } from './groups.js';
import * as timerCtrl from '../timer.js';
import { pushEntry } from '../utils/sheets.js';

let _group = null;
let _savedBeforeLock = Object.fromEntries(CRITERIA.map(c => [c.key, 10]));

// ── helpers ──────────────────────────────────────────────────────────────
function $id(id) { return document.getElementById(id); }
function getStatus() { return document.querySelector('input[name="status"]:checked')?.value ?? null; }
function isLocked() { const s = getStatus(); return s === 'Sakit' || s === 'Tidak Hadir'; }

function setTrack(el, value, max = 20) {
  if (!el) return;
  const pct = ((value - 1) / (max - 1)) * 100;
  el.style.backgroundSize = `${Math.max(0, pct)}% 100%`;
}

function recalcTotal() {
  let total = 0;
  CRITERIA.forEach(c => {
    const v = +($id(`val-${c.key}`)?.textContent || 0);
    total += v;
    const bar = $id(`bar-${c.key}`);
    if (bar) bar.style.width = `${(v / c.max) * 100}%`;
  });
  const t = $id('sum-total');
  if (t) t.textContent = total;
  // update total bar width
  const totalBar = $id('total-bar');
  if (totalBar) totalBar.style.width = `${total}%`;
}

function setSliderValue(key, value) {
  const c = CRITERIA.find(x => x.key === key);
  const el = $id(`slider-${key}`);
  if (!el) return;
  el.value = value;
  setTrack(el, value || 1, c?.max ?? 20);
  if ($id(`val-${key}`)) $id(`val-${key}`).textContent = value;
}

function resetSliders(val = 10) {
  CRITERIA.forEach(c => {
    const el = $id(`slider-${c.key}`);
    if (!el) return;
    el.disabled = false;
    el.value = val;
    setTrack(el, val, c.max);
    if ($id(`val-${c.key}`)) $id(`val-${c.key}`).textContent = val;
    if ($id(`bar-${c.key}`)) $id(`bar-${c.key}`).style.width = `${(val / c.max) * 100}%`;
  });
  const t = $id('sum-total');
  if (t) t.textContent = val * CRITERIA.length;
  const totalBar = $id('total-bar');
  if (totalBar) totalBar.style.width = `${val * CRITERIA.length}%`;
}

// ── public handlers ───────────────────────────────────────────────────────
export function onCandidateChange() {
  const raw = $id('candidateSelect')?.value;
  const id  = raw ? +raw : null;
  if (!id) { resetSliders(10); return; }

  const existing = getById(id);
  if (existing) {
    document.querySelectorAll('input[name="status"]').forEach(r => {
      r.checked = r.value === existing.status;
    });
    CRITERIA.forEach(c => setSliderValue(c.key, existing[c.key] ?? 10));
    if ($id('catatanObserver')) $id('catatanObserver').value = existing.catatan ?? '';
    const d = new Date(existing.savedAt).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    if ($id('lastSaved')) $id('lastSaved').textContent = `Tersimpan ${d}`;
  } else {
    document.querySelectorAll('input[name="status"]').forEach(r => r.checked = false);
    resetSliders(10);
    if ($id('catatanObserver')) $id('catatanObserver').value = '';
    if ($id('lastSaved')) $id('lastSaved').textContent = '';
  }
  recalcTotal();
  onStatusChange();
  renderCandidateInfo(id);
}

export function onStatusChange() {
  const locked  = isLocked();
  const overlay = $id('scoringOverlay');

  if (locked) {
    CRITERIA.forEach(c => {
      const v = +($id(`val-${c.key}`)?.textContent ?? 10);
      if (v > 0) _savedBeforeLock[c.key] = v;
    });
    if (overlay) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); }
    CRITERIA.forEach(c => {
      const el = $id(`slider-${c.key}`);
      if (!el) return;
      el.disabled = true;
      el.value = 0;
      setTrack(el, 1, c.max);
      if ($id(`val-${c.key}`)) $id(`val-${c.key}`).textContent = '0';
      if ($id(`bar-${c.key}`)) $id(`bar-${c.key}`).style.width = '0%';
    });
    if ($id('sum-total')) $id('sum-total').textContent = '0';
    if ($id('total-bar')) $id('total-bar').style.width = '0%';
  } else {
    if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
    CRITERIA.forEach(c => {
      const el = $id(`slider-${c.key}`);
      if (!el) return;
      el.disabled = false;
      const v = _savedBeforeLock[c.key] ?? 10;
      el.value = v;
      setTrack(el, v, c.max);
      if ($id(`val-${c.key}`)) $id(`val-${c.key}`).textContent = String(v);
    });
    recalcTotal();
  }
}

export function updateSlider(key, rawValue) {
  const c     = CRITERIA.find(x => x.key === key);
  const value = Math.max(1, Math.min(c?.max ?? 20, +rawValue));
  if ($id(`val-${key}`)) $id(`val-${key}`).textContent = value;
  setTrack($id(`slider-${key}`), value, c?.max ?? 20);
  recalcTotal();
}

export function submit() {
  const id     = +($id('candidateSelect')?.value ?? 0);
  const status = getStatus();
  if (!id)     { showToast('Pilih kandidat dulu ya!', 'warning'); return; }
  if (!status) { showToast('Pilih status kehadirannya dulu!', 'warning'); return; }

  const member = _group.members.find(m => m.id === id);
  const locked = isLocked();

  const scores = {};
  CRITERIA.forEach(c => {
    scores[c.key] = locked ? 0 : +$id(`slider-${c.key}`).value;
  });

  const entry = {
    id, name: member.name, level: member.level,
    groupId: _group.id, groupName: _group.name,
    status,
    ...scores,
    totalNilai: Object.values(scores).reduce((a, b) => a + b, 0),
    catatan: $id('catatanObserver')?.value.trim() ?? '',
  };

  save(entry);
  pushEntry(getById(id));

  showToast(`Nilai <strong>${member.name}</strong> berhasil disimpan!`, 'success');
  clearForm();
  refreshDropdown();
}

export function clearForm() {
  _savedBeforeLock = Object.fromEntries(CRITERIA.map(c => [c.key, 10]));
  if ($id('candidateSelect')) $id('candidateSelect').value = '';
  document.querySelectorAll('input[name="status"]').forEach(r => r.checked = false);
  const overlay = $id('scoringOverlay');
  if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
  resetSliders(10);
  if ($id('catatanObserver')) $id('catatanObserver').value = '';
  if ($id('lastSaved')) $id('lastSaved').textContent = '';
  renderCandidateInfo(null);
}

function renderCandidateInfo(id) {
  const el = $id('candidateInfo');
  if (!el) return;
  if (!id) { el.innerHTML = ''; return; }
  const m = _group.members.find(m => m.id === id);
  if (!m) { el.innerHTML = ''; return; }
  const c = GROUP_COLORS[_group.id - 1];
  el.innerHTML = `
    <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border"
          style="background:${c.bg}; border-color:${c.border}; color:${c.text}">
      ${_group.name}
    </span>
    <span class="level-badge level-${m.level.toLowerCase()}">${m.level}</span>
  `;
}

function refreshDropdown() {
  const sel = $id('candidateSelect');
  if (!sel) return;
  const scores = getAll();
  sel.querySelectorAll('option[data-id]').forEach(opt => {
    const id   = +opt.dataset.id;
    const done = !!scores[id];
    opt.textContent = `${done ? '✓ ' : ''}${opt.dataset.name}`;
  });
}

// ── render ────────────────────────────────────────────────────────────────
export function render(container, group) {
  _group = group;
  const c      = GROUP_COLORS[group.id - 1];
  const scores = getAll();

  // Status options with static peer-checked Tailwind classes (no dynamic class names)
  const statusOpts = [
    {
      value: 'Hadir', label: 'Hadir',
      svgPath: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      divCls: 'peer-checked:border-emerald-400 peer-checked:bg-emerald-50 peer-checked:text-emerald-600',
    },
    {
      value: 'Sakit', label: 'Sakit',
      svgPath: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      divCls: 'peer-checked:border-amber-400 peer-checked:bg-amber-50 peer-checked:text-amber-600',
    },
    {
      value: 'Tidak Hadir', label: 'Tidak Hadir',
      svgPath: '<path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      divCls: 'peer-checked:border-rose-400 peer-checked:bg-rose-50 peer-checked:text-rose-600',
    },
  ];

  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-stone-50 to-teal-50/20">
      ${renderHeader('groups')}

      <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        <!-- Breadcrumb -->
        <div class="mb-6 flex items-center gap-2 text-sm">
          <button onclick="navigate('groups')" class="text-stone-500 hover:text-stone-800 transition-colors flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Kelompok
          </button>
          <span class="text-stone-300">/</span>
          <span class="font-semibold rounded-full px-3 py-0.5 text-xs border"
                style="background:${c.bg}; border-color:${c.border}; color:${c.text}">
            ${group.name}
          </span>
          <span class="text-stone-400 text-xs">· ${group.members.length} peserta</span>
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">

          <!-- ── LEFT: form controls ── -->
          <div class="flex flex-col gap-4">

            <!-- Candidate selector -->
            <div class="form-card">
              <label class="form-label">Siapa yang dinilai?</label>
              <div class="relative">
                <select id="candidateSelect" class="select-field" onchange="scoring.onCandidateChange()">
                  <option value="">— Pilih nama kandidat —</option>
                  ${group.members.map(m => {
                    const done = !!scores[m.id];
                    return `<option value="${m.id}" data-id="${m.id}" data-name="${m.name}">
                      ${done ? '✓ ' : ''}${m.name}
                    </option>`;
                  }).join('')}
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-stone-400">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </div>
              <div id="candidateInfo" class="mt-2 flex items-center gap-2 flex-wrap min-h-[24px]"></div>
            </div>

            <!-- Status kehadiran -->
            <div class="form-card">
              <p class="form-label">Status Kehadiran</p>
              <div class="grid grid-cols-3 gap-2">
                ${statusOpts.map(opt => `
                  <label class="cursor-pointer">
                    <input type="radio" name="status" value="${opt.value}" class="sr-only peer"
                           onchange="scoring.onStatusChange()">
                    <div class="flex flex-col items-center gap-1.5 rounded-xl border-2 border-stone-200 p-3
                                transition-all duration-150 text-center text-stone-400
                                hover:border-stone-300 hover:text-stone-500
                                ${opt.divCls}">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        ${opt.svgPath}
                      </svg>
                      <span class="text-xs font-semibold leading-tight">${opt.label}</span>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Timer -->
            <div class="form-card">
              <p class="form-label">Timer Wawancara</p>
              <div class="flex items-center justify-between gap-4">
                <div class="flex-1">
                  <div id="timerDisplay" class="timer-digits">15:00</div>
                  <div class="mt-2 h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div id="timerProgress" class="timer-bar"></div>
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <button id="timerPlayBtn" class="btn btn-sm btn-primary" onclick="timerCtrl.toggle()">
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Mulai
                  </button>
                  <button class="btn btn-sm btn-ghost" onclick="timerCtrl.reset()">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <!-- Catatan -->
            <div class="form-card">
              <label class="form-label" for="catatanObserver">Catatan Observer</label>
              <textarea id="catatanObserver" rows="3"
                placeholder="Kesan, catatan, atau hal menonjol dari kandidat ini…"
                class="textarea-field"></textarea>
            </div>

          </div><!-- /left -->

          <!-- ── RIGHT: scoring ── -->
          <div class="flex flex-col gap-4">

            <div class="form-card relative">
              <div class="flex items-center justify-between mb-4">
                <p class="form-label mb-0">Penilaian <span class="text-stone-400 font-normal normal-case tracking-normal">(maks. 20 per aspek)</span></p>
                <span id="lastSaved" class="text-[11px] text-stone-400"></span>
              </div>

              <!-- Lock overlay -->
              <div id="scoringOverlay"
                class="hidden absolute inset-0 z-10 items-center justify-center rounded-xl bg-white/85 backdrop-blur-sm">
                <div class="text-center px-6">
                  <div class="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-2">
                    <svg class="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                  <p class="text-sm font-semibold text-stone-700">Penilaian dikunci</p>
                  <p class="text-xs text-stone-400 mt-0.5">Semua nilai otomatis jadi 0</p>
                </div>
              </div>

              <!-- Criteria blocks -->
              <div class="flex flex-col gap-3">
                ${CRITERIA.map(item => `
                  <div class="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5">
                    <div class="flex items-start justify-between mb-2">
                      <div class="flex-1 min-w-0 pr-2">
                        <p class="text-sm font-semibold text-stone-800 leading-tight">${item.label}</p>
                        <p class="text-xs text-stone-400 mt-0.5">${item.desc}</p>
                      </div>
                      <span id="val-${item.key}"
                        class="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg
                               bg-white border border-stone-200 text-base font-black text-stone-800
                               tabular-nums shadow-sm">10</span>
                    </div>

                    <!-- Guiding questions -->
                    <ol class="mb-3 space-y-1">
                      ${item.questions.map((q, i) => `
                        <li class="flex gap-1.5 text-[11px] text-stone-500 leading-snug">
                          <span class="flex-shrink-0 font-bold text-stone-400 mt-px">${i + 1}.</span>
                          <span>${q}</span>
                        </li>
                      `).join('')}
                    </ol>

                    <!-- Bar + slider -->
                    <div class="h-1 rounded-full bg-stone-200 overflow-hidden mb-1.5">
                      <div id="bar-${item.key}" class="h-full rounded-full bg-teal-400 transition-all duration-150"
                           style="width:50%"></div>
                    </div>
                    <input type="range" id="slider-${item.key}" class="slider-input"
                           min="1" max="${item.max}" value="10"
                           oninput="scoring.updateSlider('${item.key}', this.value)">
                    <div class="flex justify-between px-0.5 mt-0.5">
                      <span class="text-[10px] text-stone-400">1</span>
                      <span class="text-[10px] text-stone-400">${Math.ceil(item.max / 2)}</span>
                      <span class="text-[10px] text-stone-400">${item.max}</span>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Grand total -->
              <div class="mt-4 pt-4 border-t border-stone-100">
                <div class="rounded-xl overflow-hidden border border-teal-200">
                  <div class="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2.5 flex items-center justify-between">
                    <span class="text-sm font-semibold text-white">Total Nilai</span>
                    <div class="flex items-baseline gap-1">
                      <span id="sum-total" class="text-2xl font-black text-white tabular-nums">${CRITERIA.length * 10}</span>
                      <span class="text-sm text-teal-200">/ 100</span>
                    </div>
                  </div>
                  <div class="h-2 bg-teal-100">
                    <div id="total-bar" class="h-full bg-teal-500 transition-all duration-300"
                         style="width:${CRITERIA.length * 10}%"></div>
                  </div>
                </div>
              </div>
            </div><!-- /scoring card -->

            <!-- Submit row -->
            <div class="form-card">
              <div class="flex items-center gap-3">
                <button onclick="scoring.clearForm()" class="btn btn-ghost">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Reset
                </button>
                <button onclick="scoring.submit()" class="btn btn-primary flex-1">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  Simpan Nilai
                </button>
              </div>
            </div>

          </div><!-- /right -->
        </div><!-- /grid -->
      </div><!-- /container -->
    </div>
  `;

  timerCtrl.init();
}
