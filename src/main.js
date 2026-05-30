import { state, setState } from './state.js';
import { GROUPS } from './data/groups.js';
import { showToast } from './utils/toast.js';
import * as timerCtrl from './timer.js';
import * as scoring from './pages/scoring.js';
import * as leaderboard from './pages/leaderboard.js';
import { render as renderLogin, openAuthModal, showConfirm } from './pages/login.js';
import { render as renderGroups } from './pages/groups.js';
import { render as renderScenarios } from './pages/scenarios.js';
import { getScriptUrl, setScriptUrl, isConfigured, ping, resetAll, fetchAll, syncToSheets } from './utils/sheets.js';
import { clearAll, save, getAll } from './utils/storage.js';

const app = () => document.getElementById('app');

// ── Router ───────────────────────────────────────────────────────────────
function navigate(page, params = {}) {
  setState({ page, ...params });
  renderPage();
}

function renderPage() {
  const { page, role, selectedGroup } = state;
  const container = app();

  if (page === 'login') {
    renderLogin(container);
    return;
  }

  if (!role) { navigate('login'); return; }

  if (page === 'groups') {
    if (role !== 'assessor') { navigate('leaderboard'); return; }
    renderGroups(container);
    return;
  }

  if (page === 'scoring') {
    if (role !== 'assessor' || !selectedGroup) { navigate('groups'); return; }
    scoring.render(container, selectedGroup);
    return;
  }

  if (page === 'leaderboard') {
    leaderboard.render(container, role);
    return;
  }

  if (page === 'scenarios') {
    if (role !== 'assessor') { navigate('leaderboard'); return; }
    renderScenarios(container);
    return;
  }
}

// ── Global handlers ───────────────────────────────────────────────────────
window.navigate    = navigate;
window.timerCtrl   = timerCtrl;
window.scoring     = scoring;
window.leaderboard = { render: () => leaderboard.renderTable(state.role) };

window.handleRoleSelect = async (role) => {
  if (role === 'assessor') {
    const authed = await openAuthModal();
    if (!authed) return;
  }
  setState({ role });
  navigate(role === 'assessor' ? 'groups' : 'leaderboard');
};

window.handleGroupSelect = (groupId) => {
  const group = GROUPS.find(g => g.id === +groupId);
  if (!group) return;
  setState({ selectedGroup: group });
  navigate('scoring');
};

window.handleLogout = async () => {
  const confirmed = await showConfirm(
    'Keluar dari sesi?',
    'Apakah kamu yakin ingin keluar? Pastikan semua nilai sudah tersimpan.',
    'Keluar', 'Batal'
  );
  if (!confirmed) return;
  setState({ role: null, selectedGroup: null, page: 'login' });
  timerCtrl.reset();
  navigate('login');
  showToast('Berhasil keluar.', 'info');
};

window.openSettings = () => {
  const current = getScriptUrl();
  const el = document.createElement('div');
  el.id = 'settingsOverlay';
  el.className = 'fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-sm';
  el.innerHTML = `
    <div class="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
      <div class="h-1 bg-gradient-to-r from-teal-600 to-teal-400"></div>
      <div class="p-6">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-lg">⚙️</div>
          <div>
            <h3 class="font-bold text-stone-900 text-base">Pengaturan</h3>
            <p class="text-xs text-stone-500 mt-0.5">Konfigurasi Google Apps Script untuk sinkronisasi</p>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            URL Google Apps Script
          </label>
          <input type="url" id="settingsUrlInput"
            value="${current}"
            placeholder="https://script.google.com/macros/s/…/exec"
            class="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900
                   placeholder-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2
                   focus:ring-teal-500/20 transition">
          <p class="text-xs text-stone-400 mt-1.5">
            Lihat <code class="bg-stone-100 px-1 rounded">apps-script/Code.gs</code> untuk instruksi setup.
          </p>
        </div>

        <div id="pingResult" class="hidden mb-4 text-xs font-medium rounded-lg px-3 py-2 border"></div>

        <div class="flex gap-2">
          <button onclick="window._settingsTest()"
            class="btn btn-ghost btn-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Test Koneksi
          </button>
          <button onclick="window._settingsClose()" class="btn btn-ghost btn-sm">Batal</button>
          <button onclick="window._settingsSave()" class="btn btn-primary btn-sm flex-1">Simpan</button>
        </div>

        <!-- Sync section -->
        <div class="mt-4 pt-4 border-t border-teal-100">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-teal-600 mb-2">Sinkronisasi</p>
          <div class="flex flex-col gap-2">
            <button onclick="window._settingsPush()"
              class="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-200
                     bg-sky-50 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Kirim Data Lokal → Sheets
            </button>
            <button onclick="window._settingsPull()"
              class="w-full flex items-center justify-center gap-2 rounded-xl border border-teal-200
                     bg-teal-50 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Tarik Data Sheets → Lokal
            </button>
          </div>
          <p class="text-[11px] text-stone-400 mt-1.5 text-center">
            Kirim: lokal timpa Sheets. Tarik: Sheets timpa lokal.
          </p>
        </div>

        <!-- Danger zone -->
        <div class="mt-5 pt-4 border-t border-rose-100">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-rose-500 mb-2">Danger Zone</p>
          <button onclick="window._settingsReset()"
            class="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200
                   bg-rose-50 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Reset Semua Data Penilaian
          </button>
          <p class="text-[11px] text-stone-400 mt-1.5 text-center">
            Hapus semua nilai dari perangkat ini &amp; Google Sheets. Tidak bisa dibatalkan.
          </p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  window._settingsSave = () => {
    const url = document.getElementById('settingsUrlInput')?.value.trim() ?? '';
    setScriptUrl(url);
    el.remove();
    showToast(url ? 'URL berhasil disimpan!' : 'URL dihapus.', 'success');
  };

  window._settingsClose = () => el.remove();

  window._settingsPush = async () => {
    el.remove();
    const entries = getAll();
    const count = Object.keys(entries).length;
    if (count === 0) { showToast('Tidak ada data lokal untuk dikirim.', 'warning'); return; }

    const ok = await showConfirm(
      'Kirim Data Lokal ke Sheets?',
      `Semua data di Sheets akan ditimpa dengan <strong>${count} entri</strong> dari perangkat ini. Proses ini mungkin butuh beberapa detik.`,
      'Kirim', 'Batal'
    );
    if (!ok) return;

    showToast(`Mengirim ${count} data ke Sheets… mohon tunggu.`, 'info');
    const result = await syncToSheets(entries);

    if (result === false) {
      showToast('Gagal terhubung ke Sheets. Cek koneksi dan URL.', 'error');
    } else {
      showToast(`${result} data berhasil dikirim ke Sheets!`, 'success');
      navigate(state.page ?? 'groups');
    }
  };

  window._settingsPull = async () => {
    el.remove();
    const ok = await showConfirm(
      'Tarik Data dari Sheets?',
      'Data lokal akan diganti dengan data dari Google Sheets. Entry yang hanya ada di lokal akan terhapus.',
      'Tarik Data', 'Batal'
    );
    if (!ok) return;
    showToast('Menarik data dari Sheets…', 'info');
    const sheetsData = await fetchAll();
    if (!sheetsData || Object.keys(sheetsData).length === 0) {
      showToast('Gagal terhubung ke Sheets atau tidak ada data. Cek koneksi.', 'error');
      return;
    }
    clearAll();
    Object.values(sheetsData).forEach(entry => save(entry));
    showToast(`${Object.keys(sheetsData).length} data berhasil disinkronisasi!`, 'success');
    navigate(state.page ?? 'groups');
  };

  window._settingsReset = async () => {
    el.remove();
    const ok = await showConfirm(
      'Reset Semua Data Penilaian?',
      'Semua nilai akan dihapus permanen dari perangkat ini <strong>dan</strong> Google Sheets. Tindakan ini tidak bisa dibatalkan.',
      'Hapus Semua', 'Batal'
    );
    if (!ok) return;

    clearAll();
    const sheetOk = await resetAll();

    showToast(
      sheetOk
        ? 'Semua data berhasil direset!'
        : 'Data lokal direset. Gagal reset Sheet — pastikan koneksi aktif.',
      sheetOk ? 'success' : 'warning'
    );

    navigate(state.page ?? 'groups');
  };

  window._settingsTest = async () => {
    const urlInput = document.getElementById('settingsUrlInput');
    const url = urlInput?.value.trim() ?? '';
    if (!url) { showToast('Masukkan URL terlebih dahulu.', 'warning'); return; }

    const prev = getScriptUrl();
    setScriptUrl(url);

    const result = document.getElementById('pingResult');
    if (result) {
      result.className = 'mb-4 text-xs font-medium rounded-lg px-3 py-2 border bg-stone-50 text-stone-500 border-stone-200';
      result.textContent = '⏳ Mengecek koneksi…';
    }

    const ok = await ping();
    if (!ok) setScriptUrl(prev);

    if (result) {
      result.className = ok
        ? 'mb-4 text-xs font-medium rounded-lg px-3 py-2 border bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'mb-4 text-xs font-medium rounded-lg px-3 py-2 border bg-rose-50 text-rose-700 border-rose-200';
      result.textContent = ok
        ? '✓ Terhubung! Google Sheets siap digunakan.'
        : '✕ Gagal terhubung. Periksa URL dan deployment Apps Script.';
    }
  };
};

// ── Boot ──────────────────────────────────────────────────────────────────
navigate('login');
