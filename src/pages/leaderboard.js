import { getAll } from '../utils/storage.js';

// In-memory cache for Tim OSIS sync — never written to localStorage so
// the assessor's local scores are never overwritten by stale Sheets data.
let _osisCache = null;
import { generatePDF } from '../pdf.js';
import { GROUPS, GROUP_COLORS } from '../data/groups.js';
import { renderHeader } from './groups.js';
import { exportToExcel } from '../utils/excel.js';
import { fetchAll, isConfigured } from '../utils/sheets.js';
import { showConfirm } from './login.js';

// ── Tim OSIS header ───────────────────────────────────────────────────────
function renderOsisHeader() {
  return `
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-2.5">
          <img src="/logo.png" alt="ISC" onerror="this.style.display='none'"
            class="h-10 w-auto max-w-[80px] object-contain">
          <div>
            <span class="text-sm font-semibold text-stone-800">Leadership Test 2026/2027</span>
            <span class="ml-2 inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Tim OSIS</span>
          </div>
        </div>
        <button onclick="handleLogout()"
          class="flex items-center gap-1.5 text-sm text-stone-500 hover:text-rose-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-rose-50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Keluar
        </button>
      </div>
    </header>
  `;
}

export function render(container, role) {
  const isAssessor = role === 'assessor';

  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-stone-50 to-teal-50/20">
      ${isAssessor ? renderHeader('leaderboard') : renderOsisHeader()}

      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">

        <!-- Page header -->
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-xl font-bold text-stone-900">Leaderboard</h2>
            <p class="text-sm text-stone-500 mt-0.5">Ranking total nilai</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="window.__exportExcel()"
              class="btn btn-ghost btn-sm gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              Export Excel
            </button>
            <div class="relative">
              <select id="filterGroup" class="select-sm" onchange="leaderboard.render()">
                <option value="">Semua Kelompok</option>
                ${GROUPS.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
              </select>
            </div>
            <div class="relative">
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input id="searchInput" type="text" placeholder="Cari nama…"
                class="select-sm pl-8 w-40" oninput="leaderboard.render()" />
            </div>
          </div>
        </div>

        ${!isAssessor ? `<div id="syncStatus" class="mb-3 text-xs text-stone-400 flex items-center gap-1.5 min-h-[20px]"></div>` : ''}

        <!-- Stats -->
        <div id="lb-stats" class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"></div>

        <!-- Table -->
        <div class="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-stone-100 bg-stone-50/80">
                  <th class="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide w-12">#</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">Nama</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">Kelompok</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wide">Total Nilai</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wide">Rapor</th>
                </tr>
              </thead>
              <tbody id="lb-body">
                <tr><td colspan="6" class="py-16 text-center text-stone-400">
                  <div class="flex flex-col items-center gap-2">
                    <svg class="w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p class="font-medium text-stone-500">Belum ada data penilaian</p>
                  </div>
                </td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `;

  window.__downloadPDF = async (id, name) => {
    const ok = await showConfirm(
      'Download Rapor?',
      `Unduh rapor PDF untuk <strong>${name}</strong>?`,
      'Download', 'Batal'
    );
    if (ok) generatePDF(id);
  };
  window.__exportExcel = async () => {
    const ok = await showConfirm(
      'Export Excel?',
      'Unduh seluruh data nilai dalam format Excel (.xlsx)?',
      'Export', 'Batal'
    );
    if (ok) exportToExcel(getAll());
  };
  renderTable(role);

  // Tim OSIS: sync from Google Sheets
  if (!isAssessor && isConfigured()) {
    const syncEl = document.getElementById('syncStatus');
    if (syncEl) {
      syncEl.innerHTML = `
        <svg class="w-3 h-3 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Sinkronisasi data dari Google Sheets…
      `;
    }
    fetchAll().then(sheetsData => {
      if (sheetsData && Object.keys(sheetsData).length > 0) {
        _osisCache = sheetsData; // store in memory only — never touch localStorage
        renderTable(role);
        if (syncEl) {
          syncEl.innerHTML = `<span class="text-emerald-600">✓ Data tersinkronisasi</span>`;
          setTimeout(() => { if (syncEl) syncEl.innerHTML = ''; }, 4000);
        }
      } else {
        if (syncEl) syncEl.innerHTML = '';
      }
    }).catch(() => { if (syncEl) syncEl.innerHTML = ''; });
  }
}

export function renderTable(role) {
  const scores      = (role !== 'assessor' && _osisCache !== null) ? _osisCache : getAll();
  const groupFilter = +($id('filterGroup')?.value ?? 0);
  const search      = ($id('searchInput')?.value ?? '').toLowerCase().trim();

  let entries = Object.values(scores);
  if (groupFilter) entries = entries.filter(e => e.groupId === groupFilter);
  if (search)      entries = entries.filter(e => e.name.toLowerCase().includes(search));

  const hadir  = entries.filter(e => e.status === 'Hadir').sort((a, b) => b.totalNilai - a.totalNilai);
  const others = entries.filter(e => e.status !== 'Hadir');
  const sorted = [...hadir, ...others];

  renderStats(Object.values(scores));

  const tbody = $id('lb-body');
  if (!tbody) return;

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-16 text-center">
      <div class="flex flex-col items-center gap-2 text-stone-400">
        <svg class="w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <p class="font-medium text-stone-500">${search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada data'}</p>
      </div>
    </td></tr>`;
    return;
  }

  let hadirRank = 0;
  tbody.innerHTML = sorted.map(entry => {
    const isHadir = entry.status === 'Hadir';
    if (isHadir) hadirRank++;
    const g  = GROUPS.find(g => g.id === entry.groupId);
    const gc = g ? GROUP_COLORS[g.id - 1] : GROUP_COLORS[0];
    const pct = isHadir ? Math.round((entry.totalNilai / 100) * 100) : 0;

    return `
      <tr class="border-b border-stone-50 hover:bg-stone-50/60 transition-colors">
        <td class="px-4 py-3.5">
          ${isHadir ? rankBadge(hadirRank) : `<span class="text-stone-300 text-sm">—</span>`}
        </td>
        <td class="px-4 py-3.5">
          <p class="font-semibold text-stone-900 leading-tight">${entry.name}</p>
          <span class="level-badge level-${entry.level?.toLowerCase() ?? 'smp'} mt-0.5 inline-flex">${entry.level ?? ''}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                style="background:${gc.bg}; border-color:${gc.border}; color:${gc.text}">
            K-${entry.groupId}
          </span>
        </td>
        <td class="px-4 py-3">${statusBadge(entry.status)}</td>
        <td class="px-4 py-3 text-center min-w-[120px]">
          ${isHadir ? `
            <div class="flex flex-col items-center gap-1">
              <div class="flex items-baseline gap-0.5">
                <span class="text-xl font-black text-teal-700">${entry.totalNilai}</span>
                <span class="text-xs text-stone-400">/100</span>
              </div>
              <div class="w-20 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
                     style="width:${pct}%"></div>
              </div>
            </div>
          ` : `<span class="text-stone-300">—</span>`}
        </td>
        <td class="px-4 py-3 text-center">
          <button onclick="window.__downloadPDF(${entry.id}, '${entry.name.replace(/'/g, "\\'")}')"
            class="btn btn-xs btn-ghost hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zm7-16v4a1 1 0 001 1h4M12 11v6m-3-3l3 3 3-3"/>
            </svg>
            PDF
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderStats(entries) {
  const el = $id('lb-stats');
  if (!el) return;
  const total = entries.length;
  const hadir = entries.filter(e => e.status === 'Hadir').length;
  const sakit = entries.filter(e => e.status === 'Sakit').length;
  const alpa  = entries.filter(e => e.status === 'Tidak Hadir').length;

  const items = [
    { v: `${total}/62`, label: 'Sudah Dinilai', bg: 'bg-white',       border: 'border-stone-200',   text: 'text-stone-800'   },
    { v: hadir,         label: 'Hadir',         bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-800' },
    { v: sakit,         label: 'Sakit',         bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-800'   },
    { v: alpa,          label: 'Tidak Hadir',   bg: 'bg-rose-50',     border: 'border-rose-200',    text: 'text-rose-800'    },
  ];
  el.innerHTML = items.map(i => `
    <div class="rounded-xl border ${i.border} ${i.bg} px-4 py-3 flex items-center gap-3">
      <p class="text-2xl font-black ${i.text}">${i.v}</p>
      <p class="text-xs text-stone-500">${i.label}</p>
    </div>
  `).join('');
}

function rankBadge(rank) {
  const cls = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : 'rank-other';
  return `<span class="rank-badge ${cls}">${rank}</span>`;
}

function statusBadge(status) {
  if (status === 'Hadir')       return `<span class="status-badge status-hadir">Hadir</span>`;
  if (status === 'Sakit')       return `<span class="status-badge status-sakit">Sakit</span>`;
  return `<span class="status-badge status-alpa">Tidak Hadir</span>`;
}

function $id(id) { return document.getElementById(id); }
