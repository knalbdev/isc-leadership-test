import * as XLSX from 'xlsx';
import { GROUPS } from '../data/groups.js';
import { CRITERIA } from '../data/criteria.js';

function statusLabel(s) {
  if (s === 'Hadir')       return 'Hadir';
  if (s === 'Sakit')       return 'Sakit';
  if (s === 'Tidak Hadir') return 'Tidak Hadir / Alpa';
  return s;
}

function scoreOrDash(entry, key) {
  return entry.status === 'Hadir' ? (entry[key] ?? 0) : '';
}

export function exportToExcel(allScores) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Semua Nilai ─────────────────────────────────────────────
  const entries = Object.values(allScores);
  const hadir   = entries.filter(e => e.status === 'Hadir').sort((a, b) => b.totalNilai - a.totalNilai);
  const others  = entries.filter(e => e.status !== 'Hadir').sort((a, b) => a.groupId - b.groupId);
  const sorted  = [...hadir, ...others];

  let hadirRank = 0;
  const criteriaHeaders = Object.fromEntries(CRITERIA.map(c => [c.label, null]));

  const allRows = sorted.map(e => {
    const isHadir = e.status === 'Hadir';
    if (isHadir) hadirRank++;
    const row = {
      'Ranking':  isHadir ? hadirRank : '-',
      'Nama':     e.name,
      'Level':    e.level,
      'Kelompok': e.groupName,
      'Status':   statusLabel(e.status),
    };
    CRITERIA.forEach(c => {
      row[c.label] = scoreOrDash(e, c.key);
    });
    row['Total Nilai']       = isHadir ? e.totalNilai : '';
    row['Catatan']           = e.catatan ?? '';
    row['Waktu Penilaian']   = e.savedAt ? new Date(e.savedAt).toLocaleString('id-ID') : '';
    return row;
  });

  const ws1 = XLSX.utils.json_to_sheet(allRows);
  const fixedCols = [8, 28, 7, 12, 14];
  const criteriaCols = CRITERIA.map(() => ({ wch: 22 }));
  ws1['!cols'] = [
    ...fixedCols.map(w => ({ wch: w })),
    ...criteriaCols,
    { wch: 11 }, { wch: 40 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Semua Nilai');

  // ── Sheet 2+: Per Kelompok ────────────────────────────────────────────
  GROUPS.forEach(g => {
    const groupEntries = entries.filter(e => e.groupId === g.id);
    if (groupEntries.length === 0) return;

    const rows = groupEntries.map(e => {
      const row = { 'Nama': e.name, 'Level': e.level, 'Status': statusLabel(e.status) };
      CRITERIA.forEach(c => { row[c.shortLabel] = scoreOrDash(e, c.key); });
      row['Total']   = e.status === 'Hadir' ? e.totalNilai : '';
      row['Catatan'] = e.catatan ?? '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [28, 7, 14, ...CRITERIA.map(() => ({ wch: 13 })), { wch: 7 }, { wch: 35 }];
    ws['!cols'] = colWidths.map(w => typeof w === 'number' ? { wch: w } : w);
    XLSX.utils.book_append_sheet(wb, ws, g.name);
  });

  // ── Sheet 3: Statistik ────────────────────────────────────────────────
  const statsRows = GROUPS.map(g => {
    const gEntries = entries.filter(e => e.groupId === g.id);
    const hadirE   = gEntries.filter(e => e.status === 'Hadir');
    const avg      = hadirE.length > 0
      ? (hadirE.reduce((s, e) => s + e.totalNilai, 0) / hadirE.length).toFixed(1)
      : '';
    return {
      'Kelompok':        g.name,
      'Total Peserta':   g.members.length,
      'Sudah Dinilai':   gEntries.length,
      'Hadir':           hadirE.length,
      'Sakit':           gEntries.filter(e => e.status === 'Sakit').length,
      'Tidak Hadir':     gEntries.filter(e => e.status === 'Tidak Hadir').length,
      'Rata-rata Total': avg,
      'Nilai Tertinggi': hadirE.length > 0 ? Math.max(...hadirE.map(e => e.totalNilai)) : '',
      'Nilai Terendah':  hadirE.length > 0 ? Math.min(...hadirE.map(e => e.totalNilai)) : '',
    };
  });

  const ws3 = XLSX.utils.json_to_sheet(statsRows);
  ws3['!cols'] = Array(9).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, ws3, 'Statistik');

  // ── Download ──────────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).replace(/\//g, '-');

  XLSX.writeFile(wb, `ISC_LeadershipTest_${dateStr}.xlsx`);
}
