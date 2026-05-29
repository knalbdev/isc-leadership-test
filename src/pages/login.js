import {
  isWebAuthnAvailable,
  hasRegisteredCredential,
  verifyPassword,
  registerFingerprint,
  authenticateFingerprint,
} from '../utils/auth.js';

let _resolve = null; // resolve callback for the auth promise

// ── Auth modal HTML ───────────────────────────────────────────────────────
function authModalHTML() {
  const hasWA   = isWebAuthnAvailable();
  const hasCred = hasRegisteredCredential();

  return `
    <div id="authOverlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-sm">
      <div class="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-scale-in">

        <!-- Top accent -->
        <div class="h-1 bg-gradient-to-r from-teal-600 to-teal-400"></div>

        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-lg">🔐</div>
            <div>
              <h3 class="font-bold text-stone-900 text-base">Verifikasi Assessor</h3>
              <p class="text-xs text-stone-500 mt-0.5">Masukkan password untuk melanjutkan</p>
            </div>
          </div>

          <!-- Fingerprint option -->
          ${hasWA && hasCred ? `
          <button id="fpBtn"
            class="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-teal-200 bg-teal-50
                   py-3 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors mb-4"
            onclick="authModal.tryFingerprint()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33"/>
            </svg>
            Gunakan Fingerprint / Biometrik
          </button>
          <div class="relative flex items-center gap-3 mb-4">
            <div class="flex-1 h-px bg-stone-200"></div>
            <span class="text-xs text-stone-400 flex-shrink-0">atau dengan password</span>
            <div class="flex-1 h-px bg-stone-200"></div>
          </div>
          ` : ''}

          <!-- Password input -->
          <div class="relative mb-1">
            <input type="password" id="authPasswordInput"
              placeholder="Password assessor"
              autocomplete="current-password"
              class="w-full rounded-xl border border-stone-200 px-4 py-3 pr-10 text-sm text-stone-900
                     placeholder-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                     transition"
              onkeydown="if(event.key==='Enter') authModal.submit()">
            <button type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              onclick="authModal.toggleVisible()" title="Tampilkan/sembunyikan password">
              <svg id="eyeIcon" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>
          </div>

          <!-- Error message -->
          <p id="authError" class="hidden text-xs text-red-600 mt-1.5 mb-3 font-medium"></p>
          <div class="mt-2 mb-4"></div>

          <!-- Fingerprint register hint (first time) -->
          ${hasWA && !hasCred ? `
          <p class="text-xs text-stone-400 mb-3">
            💡 Setelah login, kamu bisa aktifkan fingerprint untuk masuk lebih cepat.
          </p>
          ` : ''}

          <!-- Actions -->
          <div class="flex gap-3">
            <button onclick="authModal.cancel()"
              class="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-semibold
                     text-stone-600 hover:bg-stone-50 transition-colors">
              Batal
            </button>
            <button id="authSubmitBtn" onclick="authModal.submit()"
              class="flex-1 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white
                     hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Masuk
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// ── Modal controller exposed as window.authModal ──────────────────────────
window.authModal = {
  async submit() {
    const input = document.getElementById('authPasswordInput');
    const errEl = document.getElementById('authError');
    const btn   = document.getElementById('authSubmitBtn');
    const pass  = input?.value ?? '';

    if (!pass) { showError('Password tidak boleh kosong.'); return; }

    btn.disabled     = true;
    btn.textContent  = 'Memeriksa…';
    errEl.classList.add('hidden');

    const ok = await verifyPassword(pass);

    if (ok) {
      closeModal();
      _resolve?.(true);
      // Offer fingerprint registration if available and not yet set up
      if (isWebAuthnAvailable() && !hasRegisteredCredential()) {
        setTimeout(() => offerFingerprint(), 500);
      }
    } else {
      btn.disabled    = false;
      btn.textContent = 'Masuk';
      input.value     = '';
      showError('Password salah. Coba lagi.');
      input.focus();
    }
  },

  async tryFingerprint() {
    const btn = document.getElementById('fpBtn');
    if (!btn) return;
    btn.disabled    = true;
    btn.textContent = '⏳ Verifikasi biometrik…';
    try {
      const ok = await authenticateFingerprint();
      if (ok) { closeModal(); _resolve?.(true); }
      else throw new Error('Authentication failed');
    } catch (e) {
      btn.disabled    = false;
      btn.innerHTML   = `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33"/></svg> Gunakan Fingerprint / Biometrik`;
      showError('Verifikasi biometrik gagal. Gunakan password.');
    }
  },

  cancel() { closeModal(); _resolve?.(false); },

  toggleVisible() {
    const input = document.getElementById('authPasswordInput');
    const icon  = document.getElementById('eyeIcon');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>`;
    } else {
      input.type = 'password';
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`;
    }
  },
};

function showError(msg) {
  const el = document.getElementById('authError');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('authOverlay')?.remove();
}

// ── Offer fingerprint setup after successful password login ───────────────
async function offerFingerprint() {
  if (!isWebAuthnAvailable()) return;

  const confirmed = await showConfirm(
    'Aktifkan Fingerprint?',
    'Login lebih cepat dengan fingerprint atau Face ID. Aktifkan sekarang?',
    'Aktifkan', 'Nanti Saja'
  );
  if (!confirmed) return;

  try {
    await registerFingerprint();
    import('../utils/toast.js').then(({ showToast }) => {
      showToast('Fingerprint berhasil diaktifkan!', 'success');
    });
  } catch {
    // user cancelled biometric registration — silent
  }
}

// ── Re-exported confirm util (used by main.js logout too) ─────────────────
export function showConfirm(title, message, confirmLabel = 'Ya', cancelLabel = 'Batal') {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.id    = 'confirmOverlay';
    el.className = 'fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-sm';
    el.innerHTML = `
      <div class="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div class="h-1 bg-gradient-to-r from-stone-400 to-stone-300"></div>
        <div class="p-6">
          <h3 class="font-bold text-stone-900 text-base mb-2">${title}</h3>
          <p class="text-sm text-stone-600 leading-relaxed mb-5">${message}</p>
          <div class="flex gap-3">
            <button id="confirmCancel"
              class="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors">
              ${cancelLabel}
            </button>
            <button id="confirmOk"
              class="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition-colors">
              ${confirmLabel}
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    document.getElementById('confirmOk').onclick     = () => { el.remove(); resolve(true);  };
    document.getElementById('confirmCancel').onclick = () => { el.remove(); resolve(false); };
  });
}

// ── Open auth modal (returns Promise<boolean>) ────────────────────────────
export function openAuthModal() {
  return new Promise(resolve => {
    _resolve = resolve;
    const el = document.createElement('div');
    el.innerHTML = authModalHTML();
    document.body.appendChild(el.firstElementChild);
    setTimeout(() => document.getElementById('authPasswordInput')?.focus(), 100);
  });
}

// ── Main login page render ────────────────────────────────────────────────
export function render(container) {
  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-stone-50 via-white to-teal-50/40 flex flex-col items-center justify-center px-4 py-12">

      <!-- Hero -->
      <div class="mb-10 text-center">
        <div class="relative inline-block mb-5">
          <!-- Logo image (shown if /logo.png exists) -->
          <img src="/logo.png" alt="ISC" onerror="this.style.display='none'"
            class="w-20 h-20 object-contain mx-auto mb-2 drop-shadow-md">
          <!-- Fallback badge (hidden when logo loads) -->
          <div class="logo-fallback inline-flex items-center justify-center w-16 h-16 rounded-2xl
                      bg-gradient-to-br from-teal-500 to-teal-800 text-white text-2xl font-black
                      shadow-lg shadow-teal-200 tracking-tight">
            ISC
          </div>
        </div>
        <h1 class="text-2xl font-bold text-stone-900 tracking-tight">ISC Leadership Test</h1>
        <p class="mt-1 text-sm text-stone-500">Penilaian Wawancara OSIS Akhwat · 2026/2027</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">

        <!-- Assessor -->
        <button onclick="handleRoleSelect('assessor')"
          class="group text-left bg-white border-2 border-stone-100 rounded-2xl p-6 shadow-sm
                 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-50 hover:-translate-y-0.5
                 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100
                        flex items-center justify-center text-teal-700 transition-colors border border-teal-200
                        group-hover:from-teal-100 group-hover:to-teal-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-stone-900 text-[15px]">Assessor</p>
              <p class="text-xs text-stone-500 mt-0.5 leading-relaxed">Input nilai, timer wawancara,<br>akses penuh &amp; leaderboard</p>
            </div>
          </div>
          <div class="mt-5 flex items-center gap-1.5 text-teal-700 text-sm font-semibold">
            Masuk sebagai Assessor
            <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </button>

        <!-- Tim OSIS -->
        <button onclick="handleRoleSelect('osis')"
          class="group text-left bg-white border-2 border-stone-100 rounded-2xl p-6 shadow-sm
                 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-50 hover:-translate-y-0.5
                 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-sky-50 to-sky-100
                        flex items-center justify-center text-sky-700 transition-colors border border-sky-200
                        group-hover:from-sky-100 group-hover:to-sky-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-stone-900 text-[15px]">Tim OSIS</p>
              <p class="text-xs text-stone-500 mt-0.5 leading-relaxed">Pantau hasil &amp; ranking<br>secara real-time</p>
            </div>
          </div>
          <div class="mt-5 flex items-center gap-1.5 text-sky-700 text-sm font-semibold">
            Masuk sebagai Tim OSIS
            <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </button>

      </div>

      <p class="mt-8 text-xs text-stone-400">Tia's Space</p>
    </div>

    <style>
      /* Hide fallback badge when real logo loads */
      img[src="/logo.png"]:not([style*="display:none"]) + .logo-fallback { display: none; }
    </style>
  `;
}
