/**
 * Google Sheets integration via Google Apps Script Web App.
 *
 * Architecture:
 *   - All operations go through a single GAS deployment URL
 *   - GET requests with JSONP callback (avoids CORS preflight)
 *   - LocalStorage is always written first (instant UI), then synced to Sheets
 *
 * Setup: see /apps-script/Code.gs and the README inside that file.
 */

// ── Config ────────────────────────────────────────────────────────────────
const CONFIG_KEY = '_isc_sheets_url';

// Paste your deployed Apps Script URL here so all devices (including Tim OSIS)
// can read the leaderboard without manual configuration.
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzauIL46Bqkngg8ykHl-xdjNCeO16d3jeIquBuwhx1buC30uc1Q32PLBcGzzCofuF6v/exec';

export function getScriptUrl() {
  return localStorage.getItem(CONFIG_KEY) || DEFAULT_URL;
}

export function setScriptUrl(url) {
  localStorage.setItem(CONFIG_KEY, url.trim());
}

export function isConfigured() {
  const url = getScriptUrl();
  return url.startsWith('https://script.google.com/');
}

// ── JSONP fetch ──────────────────────────────────────────────────────────
function jsonpFetch(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const cbName = `_isc_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timer  = setTimeout(() => {
      cleanup();
      reject(new Error('Request timed out'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      script.remove();
    }

    window[cbName] = (data) => { cleanup(); resolve(data); };

    script.src    = `${url}&callback=${cbName}`;
    script.onerror = () => { cleanup(); reject(new Error('Network error')); };
    document.head.appendChild(script);
  });
}

// ── Public API ────────────────────────────────────────────────────────────

/** Fetch all score entries from Google Sheets. Returns null on failure. */
export async function fetchAll() {
  if (!isConfigured()) return null;
  try {
    const res = await jsonpFetch(`${getScriptUrl()}?action=getAll`);
    if (res?.status === 'ok') return res.data ?? {};
    return null;
  } catch {
    return null;
  }
}

/** Save one entry to Google Sheets (non-blocking, fails silently). */
export function pushEntry(entry) {
  if (!isConfigured()) return;
  try {
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(entry)))));
    jsonpFetch(`${getScriptUrl()}?action=save&data=${encoded}`).catch(() => {});
  } catch {
    // silent
  }
}

/** Ping the Apps Script to verify connectivity. */
export async function ping() {
  if (!isConfigured()) return false;
  try {
    const res = await jsonpFetch(`${getScriptUrl()}?action=ping`, 6000);
    return res?.status === 'ok';
  } catch {
    return false;
  }
}

/** Delete all data rows from Google Sheets (keeps header row). */
export async function resetAll() {
  if (!isConfigured()) return false;
  try {
    const res = await jsonpFetch(`${getScriptUrl()}?action=resetAll`, 10000);
    return res?.status === 'ok';
  } catch {
    return false;
  }
}

/** Push all local entries to Sheets, replacing whatever is there. Returns count pushed or false on failure. */
export async function syncToSheets(entries) {
  if (!isConfigured()) return false;
  try {
    const resetOk = await resetAll();
    if (!resetOk) return false;

    const list = Object.values(entries);
    // Push in batches of 5 to avoid overwhelming GAS concurrent write limit
    for (let i = 0; i < list.length; i += 5) {
      await Promise.allSettled(
        list.slice(i, i + 5).map(entry => {
          const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(entry)))));
          return jsonpFetch(`${getScriptUrl()}?action=save&data=${encoded}`, 10000);
        })
      );
    }
    return list.length;
  } catch {
    return false;
  }
}
