import { getAll } from './utils/storage.js';
import { generatePDF } from './pdf.js';

function $id(id) { return document.getElementById(id); }

function statusBadge(status) {
  if (status === 'Hadir')        return `<span class="badge-hadir">✅ Hadir</span>`;
  if (status === 'Sakit')        return `<span class="badge-sakit">🤒 Sakit</span>`;
  if (status === 'Tidak Hadir')  return `<span class="badge-alpa">❌ Tidak Hadir</span>`;
  return `<span class="text-slate-500">—</span>`;
}

function rankBadge(rank) {
  const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
  return `<span class="rank-badge ${cls}">${rank}</span>`;
}

function scoreCell(value, hadir) {
  if (!hadir) return `<td class="px-4 py-3 text-center text-slate-600">—</td>`;
  return `<td class="px-4 py-3 text-center font-semibold text-brand-300">${value}</td>`;
}

export function render() {
  const scores  = getAll();
  const search  = ($id('searchInput')?.value ?? '').toLowerCase().trim();
  const entries = Object.values(scores);

  // Filter by search
  const filtered = search
    ? entries.filter(e => e.name.toLowerCase().includes(search) || e.kelas.toLowerCase().includes(search))
    : entries;

  // Separate & sort
  const hadir  = filtered.filter(e => e.status === 'Hadir').sort((a, b) => b.totalNilai - a.totalNilai);
  const others = filtered.filter(e => e.status !== 'Hadir');
  const sorted = [...hadir, ...others];

  renderStats(entries);

  const tbody = $id('lb-body');
  if (!tbody) return;

  if (sorted.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-4 py-16 text-center">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <span class="text-5xl">${search ? '🔍' : '📋'}</span>
            <p class="font-semibold text-slate-400">${search ? 'Kandidat tidak ditemukan' : 'Belum ada data penilaian'}</p>
            <p class="text-xs">${search ? `Tidak ada hasil untuk "${search}"` : 'Mulai isi form di halaman Dashboard.'}</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  let hadirRank = 0;
  tbody.innerHTML = sorted.map(entry => {
    const isHadir = entry.status === 'Hadir';
    if (isHadir) hadirRank++;
    const rank = isHadir ? hadirRank : '—';

    return `
      <tr class="border-b border-slate-800/60 transition-colors">
        <td class="px-4 py-3">${isHadir ? rankBadge(hadirRank) : `<span class="text-slate-600 text-sm">—</span>`}</td>
        <td class="px-4 py-3">
          <div class="font-semibold text-slate-100">${entry.name}</div>
          ${entry.catatan ? `<div class="mt-0.5 text-[11px] text-slate-500 truncate max-w-[200px]" title="${entry.catatan}">💬 ${entry.catatan}</div>` : ''}
        </td>
        <td class="px-4 py-3">
          <span class="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">${entry.kelas}</span>
        </td>
        <td class="px-4 py-3">${statusBadge(entry.status)}</td>
        ${scoreCell(entry.inisiatif,    isHadir)}
        ${scoreCell(entry.keputusan,    isHadir)}
        ${scoreCell(entry.menggerakkan, isHadir)}
        <td class="px-4 py-3 text-center">
          ${isHadir
            ? `<span class="text-xl font-black text-brand-300">${entry.totalNilai}</span><span class="text-xs text-slate-600">/30</span>`
            : `<span class="text-slate-600">—</span>`}
        </td>
        <td class="px-4 py-3 text-center">
          <button
            class="btn btn-ghost btn-xs"
            onclick="window.__downloadPDF(${entry.id})"
            title="Download Rapor PDF"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            PDF
          </button>
        </td>
      </tr>`;
  }).join('');

  // global bridge so inline onclick can reach the module function
  window.__downloadPDF = (id) => generatePDF(id);
}

function renderStats(entries) {
  const total = entries.length;
  const hadir  = entries.filter(e => e.status === 'Hadir').length;
  const sakit  = entries.filter(e => e.status === 'Sakit').length;
  const alpa   = entries.filter(e => e.status === 'Tidak Hadir').length;

  const $stats = $id('lb-stats');
  if (!$stats) return;

  $stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon bg-brand-500/10 text-brand-400">📝</div>
      <div>
        <p class="text-2xl font-black text-white">${total}</p>
        <p class="text-xs text-slate-500">Total Dinilai</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon bg-emerald-500/10 text-emerald-400">✅</div>
      <div>
        <p class="text-2xl font-black text-white">${hadir}</p>
        <p class="text-xs text-slate-500">Hadir</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon bg-amber-500/10 text-amber-400">🤒</div>
      <div>
        <p class="text-2xl font-black text-white">${sakit}</p>
        <p class="text-xs text-slate-500">Sakit</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon bg-red-500/10 text-red-400">❌</div>
      <div>
        <p class="text-2xl font-black text-white">${alpa}</p>
        <p class="text-xs text-slate-500">Tidak Hadir</p>
      </div>
    </div>`;
}
