import { SCENARIOS } from '../data/scenarios.js';
import { renderHeader } from './groups.js';

const FOCUS_COLORS = [
  { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-800 border-teal-200', num: 'from-teal-500 to-teal-700' },
  { bg: 'bg-sky-50',  border: 'border-sky-200',  badge: 'bg-sky-100  text-sky-800  border-sky-200',  num: 'from-sky-500  to-sky-700'  },
  { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-800 border-violet-200', num: 'from-violet-500 to-violet-700' },
];

export function render(container) {
  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-stone-50 to-teal-50/20">
      ${renderHeader('scenarios')}
      <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        <div class="mb-6">
          <h2 class="text-xl font-bold text-stone-900">Skenario FGD / LGD</h2>
          <p class="mt-1 text-sm text-stone-500">Tiga skenario untuk sesi diskusi kelompok. Pilih satu skenario yang akan digunakan.</p>
        </div>

        <div class="flex flex-col gap-5">
          ${SCENARIOS.map((s, i) => {
            const c = FOCUS_COLORS[i];
            return `
              <div class="rounded-2xl border ${c.border} ${c.bg} overflow-hidden shadow-sm">
                <div class="flex items-center gap-3 px-5 pt-5 pb-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-black text-white shadow-sm bg-gradient-to-br ${c.num}">
                    ${s.id}
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-stone-500 uppercase tracking-wider">${s.title}</p>
                    <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold mt-0.5 ${c.badge}">
                      Fokus: ${s.focus}
                    </span>
                  </div>
                </div>
                <div class="px-5 pb-5">
                  <p class="text-sm text-stone-700 leading-relaxed">${s.body}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    </div>
  `;
}
