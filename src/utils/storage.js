const KEY = 'isc_scores_v2';

export function getAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

export function save(entry) {
  const all = getAll();
  all[entry.id] = { ...entry, savedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getById(id) {
  return getAll()[id] ?? null;
}

export function clearAll() {
  localStorage.removeItem(KEY);
}

/**
 * @typedef {{
 *   id: number; name: string; level: string;
 *   groupId: number; groupName: string;
 *   status: 'Hadir'|'Sakit'|'Tidak Hadir';
 *   inisiatif: number; keputusan: number; menggerakkan: number;
 *   totalNilai: number; catatan: string; savedAt: string;
 * }} ScoreEntry
 */
