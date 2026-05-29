import { GROUPS, GROUP_COLORS } from '../data/groups.js';
import { getAll } from '../utils/storage.js';

function progressBadge(group, scores) {
  const done = group.members.filter(m => scores[m.id]).length;
  const total = group.members.length;
  return { done, total };
}

export function render(container) {
  const scores = getAll();

  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-stone-50 to-teal-50/20">
      ${renderHeader('groups')}
      <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        <div class="mb-6">
          <h2 class="text-xl font-bold text-stone-900">Pilih Kelompok</h2>
          <p class="mt-1 text-sm text-stone-500">Pilih kelompok untuk mulai sesi penilaian.</p>
        </div>

        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          ${GROUPS.map((g, i) => {
            const c = GROUP_COLORS[i];
            const { done, total } = progressBadge(g, scores);
            const complete = done === total;
            return `
              <button onclick="handleGroupSelect(${g.id})"
                class="group relative text-left rounded-2xl border-2 p-5 transition-all duration-200
                       hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style="background:${c.bg}; border-color:${complete ? c.accent : c.border}; --tw-ring-color:${c.accent}">

                <!-- Number badge -->
                <div class="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black text-white mb-3 shadow-sm"
                     style="background:${c.accent}">
                  ${g.id}
                </div>

                <p class="text-sm font-semibold" style="color:${c.text}">${g.name}</p>
                <p class="text-xs mt-0.5 text-stone-500">${total} anggota</p>

                <!-- Progress -->
                <div class="mt-3 flex items-center gap-2">
                  <div class="h-1.5 flex-1 rounded-full bg-stone-200 overflow-hidden">
                    <div class="h-full rounded-full transition-all"
                         style="width:${(done/total)*100}%; background:${c.accent}"></div>
                  </div>
                  <span class="text-[11px] font-medium" style="color:${c.text}">${done}/${total}</span>
                </div>

                ${complete ? `
                  <div class="absolute top-3 right-3 text-xs font-semibold px-1.5 py-0.5 rounded-full text-white" style="background:${c.accent}">✓</div>
                ` : ''}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Summary -->
        <div class="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-3">
          ${renderSummary(scores)}
        </div>

      </div>
    </div>
  `;
}

function renderSummary(scores) {
  const entries = Object.values(scores);
  const total   = entries.length;
  const hadir   = entries.filter(e => e.status === 'Hadir').length;
  const lainnya = entries.filter(e => e.status !== 'Hadir').length;

  const items = [
    { label: 'Sudah Dinilai', value: `${total}/62`, color: 'text-stone-700', bg: 'bg-white', border: 'border-stone-200' },
    { label: 'Hadir',         value: hadir,          color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Sakit / Alpa',  value: lainnya,        color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  ];

  return items.map(it => `
    <div class="rounded-xl border ${it.border} ${it.bg} px-5 py-4">
      <p class="text-2xl font-black ${it.color}">${it.value}</p>
      <p class="text-xs text-stone-500 mt-0.5">${it.label}</p>
    </div>
  `).join('');
}

export function renderHeader(activePage) {
  return `
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm">
      <div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-2.5">
          <img src="/logo.png" alt="ISC" onerror="this.style.display='none'"
            class="h-10 w-auto max-w-[80px] object-contain">
          <span class="text-sm font-semibold text-stone-800 hidden sm:block">Leadership Test 2026/2027</span>
        </div>
        <nav class="flex items-center gap-1">
          <button onclick="navigate('groups')"
            class="nav-link ${activePage === 'groups' ? 'nav-link-active' : ''}">
            Kelompok
          </button>
          <button onclick="navigate('leaderboard')"
            class="nav-link ${activePage === 'leaderboard' ? 'nav-link-active' : ''}">
            Leaderboard
          </button>
          <button onclick="navigate('scenarios')"
            class="nav-link ${activePage === 'scenarios' ? 'nav-link-active' : ''}">
            Skenario FGD
          </button>
        </nav>
        <div class="flex items-center gap-1">
          <button onclick="openSettings()" title="Pengaturan"
            class="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-stone-100">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button onclick="handleLogout()" class="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-stone-100">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Keluar
          </button>
        </div>
      </div>
    </header>
  `;
}
