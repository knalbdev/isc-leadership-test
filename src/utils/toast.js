const container = () => document.getElementById('toast-container');

export function showToast(message, type = 'success', duration = 3500) {
  const cfg = {
    success: { bar: '#16A34A', icon: '✓' },
    error:   { bar: '#DC2626', icon: '✕' },
    warning: { bar: '#D97706', icon: '!' },
    info:    { bar: '#0369A1', icon: 'i' },
  };
  const { bar, icon } = cfg[type] ?? cfg.info;

  const el = document.createElement('div');
  el.className = 'toast-enter pointer-events-auto flex items-start gap-3 rounded-lg bg-white border border-stone-200 px-4 py-3 shadow-lg max-w-sm';
  el.innerHTML = `
    <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold" style="background:${bar}">${icon}</span>
    <p class="text-sm font-medium text-stone-800 leading-snug">${message}</p>
  `;
  container().appendChild(el);

  setTimeout(() => {
    el.classList.remove('toast-enter');
    el.classList.add('toast-exit');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}
