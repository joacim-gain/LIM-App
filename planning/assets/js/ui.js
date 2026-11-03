/* Shared UI primitives: icons, dates, tooltips, menus, popovers, snackbars, dialogs */
window.UI = (function () {
  const layer = () => document.getElementById('layer');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ms = (name, cls = '') => `<span class="ms ${cls}">${name}</span>`;
  const hl = (text, q) => {
    const t = String(text ?? ''); if (!q) return esc(t);
    const i = t.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
  };
  // dates are ISO yyyy-mm-dd strings; shown as dd.mm.yyyy (live app)
  const fmt = (iso) => { if (!iso) return '-'; const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };

  // ---------- tooltip (data-tip) ----------
  const tip = document.getElementById('tip');
  let tipTarget = null, tipTimer = null;
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el === tipTarget) return;
    tipTarget = el; clearTimeout(tipTimer); tip.classList.remove('show');
    if (!el || !el.getAttribute('data-tip')) return;
    tipTimer = setTimeout(() => {
      if (!document.body.contains(el)) return;
      tip.innerHTML = el.getAttribute('data-tip');
      const r = el.getBoundingClientRect(); const pos = el.getAttribute('data-tip-pos') || 'bottom';
      tip.style.left = '0px'; tip.style.top = '0px'; tip.classList.add('show');
      const tr = tip.getBoundingClientRect();
      let x = r.left + r.width / 2 - tr.width / 2, y = r.bottom + 6;
      if (pos === 'top') y = r.top - tr.height - 6;
      if (pos === 'right') { x = r.right + 8; y = r.top + r.height / 2 - tr.height / 2; }
      if (pos === 'left') { x = r.left - tr.width - 8; y = r.top + r.height / 2 - tr.height / 2; }
      if (y + tr.height > innerHeight - 4) y = r.top - tr.height - 6;
      x = Math.max(6, Math.min(innerWidth - tr.width - 6, x));
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    }, 350);
  });
  document.addEventListener('mousedown', () => { clearTimeout(tipTimer); tip.classList.remove('show'); });
  document.addEventListener('scroll', () => tip.classList.remove('show'), true);

  // ---------- floating (menus / popovers) ----------
  let openFloat = null;
  function closeFloat() { if (openFloat) { openFloat.el.remove(); openFloat.anchor?.classList.remove('on'); const cb = openFloat.onClose; openFloat = null; cb && cb(); } }
  function place(el, anchor, align = 'left', gap = 4) {
    const r = anchor.getBoundingClientRect(); const er = el.getBoundingClientRect();
    let x = align === 'right' ? r.right - er.width : r.left;
    let y = r.bottom + gap;
    if (y + er.height > innerHeight - 8) y = Math.max(8, r.top - er.height - gap);
    x = Math.max(8, Math.min(innerWidth - er.width - 8, x));
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  function float(anchor, html, { cls = 'popover', align, onClose, toggle = true } = {}) {
    if (toggle && openFloat && openFloat.anchor === anchor) { closeFloat(); return null; }
    closeFloat();
    const el = document.createElement('div'); el.className = cls; el.innerHTML = html;
    layer().appendChild(el); place(el, anchor, align); anchor.classList.add('on');
    openFloat = { el, anchor, onClose };
    return el;
  }
  const isOpen = (anchor) => !!(openFloat && openFloat.anchor === anchor);
  document.addEventListener('mousedown', (e) => {
    if (!openFloat) return;
    if (openFloat.el.contains(e.target) || openFloat.anchor.contains(e.target)) return;
    closeFloat();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (openFloat) return closeFloat();
      const top = [...document.querySelectorAll('.scrim')].pop(); if (top) top._close?.();
    }
  });
  window.addEventListener('resize', closeFloat);

  /* Menu · LIM Figma "Component 126" item (icon + label, 32px; selected = olive + check)
     items: [{label, icon, onClick, on, disabled, sep, keepOpen}] */
  function menu(anchor, items, opts = {}) {
    const html = items.map((it, i) => {
      if (it.sep) return '<div class="msep"></div>';
      return `<button class="mi ${it.on ? 'on' : ''}" data-i="${i}" ${it.disabled ? 'disabled' : ''}>${it.icon ? ms(it.icon) : ''}<span class="grow">${esc(it.label)}</span>${it.on ? ms('check', 'chk') : ''}</button>`;
    }).join('');
    const el = float(anchor, html, { cls: 'menu', align: opts.align, onClose: opts.onClose });
    if (!el) return null;
    if (opts.width) el.style.width = opts.width + 'px';
    place(el, anchor, opts.align, opts.gap ?? 4);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.mi'); if (!b || b.disabled) return;
      const it = items[+b.dataset.i];
      if (!it.keepOpen) closeFloat();
      it.onClick && it.onClick(b);
    });
    return el;
  }

  // ---------- snackbar (live app: dark bar, message + "ok") ----------
  function toast(msg, { action = 'ok', onAction, ms: dur = 4000 } = {}) {
    const el = document.createElement('div'); el.className = 'toast';
    el.innerHTML = `<span class="grow">${msg}</span>${action ? `<button class="toast-a">${esc(action)}</button>` : ''}`;
    document.getElementById('toasts').appendChild(el);
    const kill = () => { el.style.transition = 'opacity .2s'; el.style.opacity = 0; setTimeout(() => el.remove(), 200); };
    if (action) el.querySelector('.toast-a').onclick = () => { kill(); onAction && onAction(); };
    setTimeout(kill, dur);
  }

  // ---------- dialogs ----------
  function modal({ title, body, actions = [], onMount, width = 400 }) {
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    scrim.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" style="width:${width}px"><h2>${esc(title)}</h2><div class="dlg-b">${body}</div>
      <div class="dlg-f">${actions.map((a, i) => `<button class="btn ${a.primary ? 'contained' : 'text'}" data-a="${i}">${esc(a.label)}</button>`).join('')}</div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim._close = close;
    scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });
    scrim.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => { const a = actions[+b.dataset.a]; if ((a.onClick ? a.onClick(close, scrim) : undefined) !== false) close(); }));
    onMount && onMount(scrim.querySelector('.dialog'), close);
    return close;
  }
  function confirm({ title, text, ok = 'Delete' }) {
    return new Promise((res) => modal({ title, body: `<p>${text}</p>`, actions: [{ label: 'Cancel', onClick: () => res(false) }, { label: ok, primary: true, onClick: () => res(true) }] }));
  }

  return { esc, ms, hl, fmt, float, place, closeFloat, isOpen, menu, toast, modal, confirm };
})();
