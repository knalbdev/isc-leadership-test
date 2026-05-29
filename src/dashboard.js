import { CANDIDATES } from './data/candidates.js';
import { getById, save } from './utils/storage.js';
import { showToast } from './utils/toast.js';

// ── helpers ──────────────────────────────────────────────────────────────

function $id(id) { return document.getElementById(id); }

function getStatus() {
  return document.querySelector('input[name="status"]:checked')?.value ?? null;
}

function isLocked() {
  const s = getStatus();
  return s === 'Sakit' || s === 'Tidak Hadir';
}

// ── slider track fill ─────────────────────────────────────────────────

function setTrack(el, value) {
  const pct = ((value - 1) / 9) * 100;
  el.style.backgroundSize = `${pct}% 100%`;
}

// ── public API ────────────────────────────────────────────────────────

export function onCandidateChange() {
  const id = parseInt($id('candidateSelect').value);
  if (!id) return;

  const existing = getById(id);
  if (existing) {
    // restore saved state
    document.querySelectorAll('input[name="status"]').forEach(r => {
      r.checked = r.value === existing.status;
    });
    setSliderValue('inisiatif',    existing.inisiatif);
    setSliderValue('keputusan',    existing.keputusan);
    setSliderValue('menggerakkan', existing.menggerakkan);
    $id('catatanObserver').value = existing.catatan ?? '';

    const saved = new Date(existing.savedAt).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    $id('lastSavedInfo').textContent = `Tersimpan: ${saved}`;
  } else {
    resetValues();
    $id('lastSavedInfo').textContent = 'Belum ada data tersimpan';
  }
  onStatusChange();
}

export function onStatusChange() {
  const locked = isLocked();
  const overlay = $id('scoringOverlay');

  if (locked) {
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    ['inisiatif', 'keputusan', 'menggerakkan'].forEach(k => {
      const slider = $id(`slider-${k}`);
      slider.disabled = true;
      slider.value = 0;
      $id(`val-${k}`).textContent = '0';
      $id(`sum-${k}`).textContent = '0';
      setTrack(slider, 1);
    });
    $id('sum-total').textContent = '0';
  } else {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    ['inisiatif', 'keputusan', 'menggerakkan'].forEach(k => {
      const slider = $id(`slider-${k}`);
      slider.disabled = false;
      // keep current value; redraw track
      setTrack(slider, parseInt(slider.value) || 5);
    });
    recalcTotal();
  }
}

export function updateSlider(name, rawValue) {
  const value = Math.max(1, Math.min(10, parseInt(rawValue)));
  $id(`val-${name}`).textContent = value;
  $id(`sum-${name}`).textContent = value;
  setTrack($id(`slider-${name}`), value);
  recalcTotal();
}

function setSliderValue(name, value) {
  const el = $id(`slider-${name}`);
  el.value = value;
  $id(`val-${name}`).textContent = value;
  $id(`sum-${name}`).textContent = value;
  setTrack(el, value);
}

function recalcTotal() {
  const i = parseInt($id('val-inisiatif').textContent)    || 0;
  const k = parseInt($id('val-keputusan').textContent)    || 0;
  const m = parseInt($id('val-menggerakkan').textContent) || 0;
  $id('sum-total').textContent = i + k + m;
}

export function submit() {
  const id = parseInt($id('candidateSelect').value);
  if (!id) { showToast('Pilih kandidat terlebih dahulu!', 'warning'); return; }

  const status = getStatus();
  if (!status) { showToast('Pilih status kehadiran!', 'warning'); return; }

  const candidate = CANDIDATES.find(c => c.id === id);
  const locked    = isLocked();

  const inisiatif    = locked ? 0 : parseInt($id('slider-inisiatif').value);
  const keputusan    = locked ? 0 : parseInt($id('slider-keputusan').value);
  const menggerakkan = locked ? 0 : parseInt($id('slider-menggerakkan').value);

  save({
    id,
    name:          candidate.name,
    kelas:         candidate.kelas,
    status,
    inisiatif,
    keputusan,
    menggerakkan,
    totalNilai:    inisiatif + keputusan + menggerakkan,
    catatan:       $id('catatanObserver').value.trim(),
  });

  showToast(`Nilai <strong>${candidate.name}</strong> berhasil disimpan!`, 'success');
  clearForm();
}

export function clearForm() {
  $id('candidateSelect').value = '';
  document.querySelectorAll('input[name="status"]').forEach(r => (r.checked = false));
  $id('scoringOverlay').classList.add('hidden');
  $id('scoringOverlay').classList.remove('flex');
  resetValues();
  $id('catatanObserver').value = '';
  $id('lastSavedInfo').textContent = 'Belum ada data tersimpan';
}

function resetValues() {
  ['inisiatif', 'keputusan', 'menggerakkan'].forEach(k => {
    const slider = $id(`slider-${k}`);
    slider.disabled = false;
    slider.value = 5;
    setTrack(slider, 5);
    $id(`val-${k}`).textContent = '5';
    $id(`sum-${k}`).textContent = '5';
  });
  $id('sum-total').textContent = '15';
}

// ── init ──────────────────────────────────────────────────────────────

export function init() {
  const select = $id('candidateSelect');
  CANDIDATES.forEach(c => {
    const opt = document.createElement('option');
    opt.value       = c.id;
    opt.textContent = `${c.name} — ${c.kelas}`;
    select.appendChild(opt);
  });

  // init slider track fills
  ['inisiatif', 'keputusan', 'menggerakkan'].forEach(k => {
    setTrack($id(`slider-${k}`), 5);
  });
}
