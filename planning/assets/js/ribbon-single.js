/* Ribbon v3 · one responsive ribbon for the LIM planning module (LIM project 2 recording, MS ribbon style)
   One row that fills the width, sections in priority order from left to right:
     Search | Filter | Time | Sort | Group | Column | Level | View | File | Display | Set default | Legends · Refresh · Updated
   Every section has up to three states: open → folded (one named button ▾ with the same choices) → icon only.
   When the row gets too narrow, open sections fold first (Group, Time, Level, Sort, Display, View, Search), then labels give way to icons
   (rightmost first), and when everything is as small as it gets, sections move into ⋯, again from the right.
   On wide screens Time, Sort and Group show their choices directly (radio picks) instead of a pop-up. */
window.R = (function () {
  const { esc, ms, fmt } = UI;
  const V = () => S.view;
  const el = () => document.getElementById('ribbon');
  const $ = (id) => document.getElementById(id);
  const GROUP_OPTS = [['discipline', 'Discipline'], ['zone', 'Zone'], ['org', 'Organization'], ['phase', 'Phase'], ['site', 'Site'], ['floor', 'Floor'], ['none', 'None']];
  const SORT_OPTS = [['default', 'Default'], ['start', 'Start Date'], ['end', 'End Date']];
  const COL_OPTS = [['org', 'Organization'], ['discipline', 'Discipline'], ['floors', 'Floor'], ['site', 'Site'], ['volumeActual', 'Volume Actual'], ['start', 'Start Date'], ['end', 'End Date']];
  const PERIOD_SHORT = { yearly: 'Year', quarterly: 'Quarter', monthly: 'Month', weekly: 'Week', project: 'Project' };
  const PERIOD_TIP = { yearly: 'Shows one year at a time', quarterly: 'Shows one quarter at a time', monthly: 'Shows one month at a time', weekly: 'Shows one week at a time', project: 'Shows the whole project from start to end' };
  const lbl = (opts, k) => (opts.find((o) => o[0] === k) || ['', ''])[1];
  const colsLabel = () => (V().columns.length ? V().columns.map((c) => lbl(COL_OPTS, c)).join(', ') : 'None');
  // tooltip: a title and one line that says what the control does
  const tp = (title, text) => esc(`<b>${esc(title)}</b>${text ? `<br>${esc(text)}` : ''}`);
  const switchHtml = (on, id, label) => `<button class="rb-switch ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}"><i class="sw"><i></i></i><span>${label}</span></button>`;
  const iconBtn = (act, icon, tip, disabled) => `<button class="rb-ib" data-act="${act}" data-tip="${tip}" ${disabled ? 'disabled' : ''}>${ms(icon, 's20')}</button>`;
  // tile: icon with its label underneath (▾ after the label when it opens a menu); "ic" tiles lose the label in the icon state
  const tile = (act, icon, label, tip, o = {}) => `<button class="rx-t ${o.dd ? 'rx-ddt' : ''} ${o.ic === false ? '' : 'ic'} ${o.on ? 'set' : ''} ${o.cls || ''}" data-act="${act}" ${o.id ? `id="${o.id}"` : ''} data-tip="${tip}" ${o.disabled ? 'disabled' : ''}>${ms(icon, 's20')}${o.dd ? ms('arrow_drop_down', 's16 ddc') : ''}<span class="lbt">${esc(label)}${o.dd ? ms('arrow_drop_down', 's16') : ''}</span>${o.badge || ''}</button>`;
  const swTile = (act, on, label, tip) => `<button class="rx-t rb-switch ${on ? 'on' : ''}" data-act="${act}" role="switch" aria-checked="${on}" data-tip="${tip}"><i class="sw"><i></i></i><span class="lbt">${label}</span></button>`;
  // radio picks: the choices shown directly, the current one highlighted
  const picks = (name, opts, cur, cols, tipFn) => `<div class="rx-picks" role="radiogroup" style="--cols:${cols}">${opts.map(([k, l]) => `<button class="rx-pk ${cur === k ? 'on' : ''}" role="radio" aria-checked="${cur === k}" data-pick="${name}" data-val="${k}" data-tip="${tipFn(k, l)}">${esc(l)}</button>`).join('')}</div>`;
  const lead = (icon, tip) => `<span class="rx-lead" data-tip="${tip}">${ms(icon, 's20')}</span>`;
  // Material glyphs fill their box differently (zoom and search look small, refresh and info look right):
  // these sizes give every 20px ribbon icon about the same visible size as refresh / info
  const ICON_PX = { search: 23, zoom_in: 23, zoom_out: 23, filter_list: 22, sort: 22, view_column: 22, format_list_bulleted: 22, import_export: 22, lock_outline: 20 };
  const evenIcons = (root, sel = '.ms.s20') => root && root.querySelectorAll(sel).forEach((i) => { const px = ICON_PX[i.textContent.trim()]; if (px) i.style.fontSize = px + 'px'; });
  // menus opened from the ribbon (⋯) get the same icon sizes
  new MutationObserver((ms_) => ms_.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && evenIcons(n, '.mi > .ms:first-child')))).observe(document.getElementById('layer'), { childList: true, subtree: true });
  const ZOOM_MAX = 200;
  const check = (id, on, label) => `<button class="rb-check ${on ? 'on' : ''}" id="${id}" role="checkbox" aria-checked="${on}"><i class="cb">${on ? ms('check', 's16') : ''}</i><span>${label}</span></button>`;
  const radio = (name, val, on, label, disabled) => `<button class="rb-radio ${on ? 'on' : ''}" data-radio="${name}" data-val="${val}" ${disabled ? 'disabled' : ''}><i class="rd"></i><span>${label}</span></button>`;
  let searchOpen = false;

  function chips() {
    const f = V().filters, out = [];
    if (f.from || f.to) out.push(['dur', `${f.from ? fmt(f.from) : '…'} – ${f.to ? fmt(f.to) : '…'}`]);
    [['org', 'Organization'], ['discipline', 'Discipline'], ['site', 'Site'], ['floor', 'Floor']].forEach(([k, l]) => { if (f[k]) out.push([k, `${l}: ${f[k]}`]); });
    return out;
  }

  const searchHtml = (open) => `<div class="rb-search sl-search ${open ? 'open' : ''}" id="slSearch">
        <button class="sl-sicon" id="rbSearchBtn" data-tip="${open ? '' : tp('Search', 'Finds activities by name and in the visible columns')}" tabindex="${open ? -1 : 0}">${ms('search', 's20')}<span class="lbt">Search</span></button>
        <input id="rbQ" placeholder="Search within visible columns" value="${esc(V().search)}" autocomplete="off">
        <span class="sl-count hidden" id="rbCount"></span>
        <button class="rb-clear ${V().search ? '' : 'hidden'}" id="rbClear" data-tip="Clear search">${ms('close', 's16')}</button>
      </div>`;
  const filterTip = (ch) => (ch.length ? tp('Filter', ch.map((c) => c[1]).join(', ')) : tp('Filter', 'Narrows the plan by dates, organization, discipline, site or floor'));
  const badge = (ch) => (ch.length ? `<i class="sl-badge">${ch.length}</i>` : '');
  const stepper = (v, maxL) => `<div class="rb-stepper rx-step"><button data-act="lvMinus" data-tip="${tp('Level down', 'Shows one level less of the structure')}" ${v.level <= 0 ? 'disabled' : ''}>${ms('remove', 's20')}</button><input id="lvIn" value="${v.level}" inputmode="numeric" aria-label="Level"><button data-act="lvPlus" data-tip="${tp('Level up', 'Shows one level more of the structure')}" ${v.level >= maxL ? 'disabled' : ''}>${ms('add', 's20')}</button></div>`;

  // a section: data-n = number of states, data-fold / data-icon = the state where it folds / goes icon-only
  const sec = (g, n, fold, icon, open, folded) => `<div class="rx-g" data-g="${g}" data-n="${n}" ${fold != null ? `data-fold="${fold}"` : ''} ${icon != null ? `data-icon="${icon}"` : ''} data-s="0">${folded != null ? `<div class="v-open">${open}</div><div class="v-fold">${folded}</div>` : open}</div>`;

  function render() {
    const v = V(), stepL = T.STEP_LABEL[v.period], maxL = S.maxDepth(), ch = chips(), all = v.level >= maxL;
    const open = searchOpen || !!v.search;
    const prev = `<div class="rx-stk"><button class="rb-ib" data-act="prev" data-tip="${tp(stepL ? `Previous ${stepL}` : 'Previous', stepL ? `Moves the timeline back one ${stepL}` : '')}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button>
            <button class="rb-ib" data-act="next" data-tip="${tp(stepL ? `Next ${stepL}` : 'Next', stepL ? `Moves the timeline forward one ${stepL}` : '')}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button></div>`;
    const today = tile('today', 'today', 'Today', tp('Today', 'Jumps to today on the timeline'));
    const zoomBox = `<div class="rx-zoom"><div class="rb-zc">${iconBtn('zoomOut', 'zoom_out', tp('Zoom out', `Shows more of the timeline (${v.zoom}%)`), v.zoom <= 50)}<button class="sl-fit" data-act="fit" data-tip="${tp('Fit', 'Back to the default zoom')}">Fit</button>${iconBtn('zoomIn', 'zoom_in', tp('Zoom in', `Shows less of the timeline in more detail (${v.zoom}%)`), v.zoom >= ZOOM_MAX)}</div><span class="lbt">Zoom ${v.zoom}%</span></div>`;
    el().innerHTML = `
    <div class="rx" id="rx">
      <div class="rx-items" id="slItems">
        ${sec('find', 3, 1, 2, searchHtml(open))}
        <i class="rx-d rx-d-find"></i>
        ${sec('filter', 2, null, 1, tile('filter', 'filter_list', 'Filter', filterTip(ch), { cls: 'sl-filter' + (ch.length ? ' on' : ''), badge: badge(ch) }))}
        <i class="rx-d"></i>
        ${sec('time', 3, 1, 2,
          `${lead('date_range', tp('Time period', 'Choose how much of the timeline you see'))}${picks('period', T.PERIODS.map(([k]) => [k, PERIOD_SHORT[k]]), v.period, 3, (k) => tp(lbl(T.PERIODS, k), PERIOD_TIP[k]))}${prev}${today}`,
          `${tile('period', 'date_range', lbl(T.PERIODS, v.period), tp(`Time period: ${lbl(T.PERIODS, v.period)}`, 'Choose how much of the timeline you see'), { dd: 1, ic: false, cls: 'rx-period' })}${prev}${today}`)}
        <i class="rx-d"></i>
        ${sec('sort', 3, 1, 2,
          `${lead('sort', tp('Sort', 'Choose the order of the activities'))}${picks('sort', [['default', 'Default'], ['start', 'Start'], ['end', 'End']], v.sortBy, 3, (k) => tp(`Sort by ${lbl(SORT_OPTS, k)}`, k === 'default' ? 'Keeps the plan order' : k === 'start' ? 'Earliest start first' : 'Earliest end first'))}`,
          tile('sort', 'sort', 'Sort', tp(`Sort by ${lbl(SORT_OPTS, v.sortBy)}`, 'Choose the order of the activities'), { dd: 1, on: v.sortBy !== 'default' }))}
        <i class="rx-d"></i>
        ${sec('group', 3, 1, 2,
          `${lead('workspaces', tp('Group', 'Groups the activities by one field'))}${picks('group', GROUP_OPTS, v.groupBy, 4, (k, l) => tp(k === 'none' ? 'No grouping' : `Group by ${l}`, k === 'none' ? 'Shows the plan without groups' : `Puts activities with the same ${l.toLowerCase()} together`))}`,
          tile('group', 'workspaces', 'Group', tp(`Group by ${lbl(GROUP_OPTS, v.groupBy)}`, 'Groups the activities by one field'), { dd: 1, on: v.groupBy !== 'none' }))}
        <i class="rx-d"></i>
        ${sec('column', 2, null, 1, tile('cols', 'view_column', 'Column', tp('Column', `Choose the columns in the table · ${colsLabel()}`), { dd: 1 }))}
        <i class="rx-d"></i>
        ${sec('level', 3, 1, 2,
          `<div class="rx-lv">${stepper(v, maxL)}<span class="lbt">Level</span></div>${tile('lvAll', all ? 'unfold_less' : 'unfold_more', all ? 'Collapse all' : 'Expand all', all ? tp('Collapse all', 'Closes every level of the structure') : tp('Expand all', 'Opens every level of the structure'))}`,
          tile('level', 'format_list_bulleted', 'Level', tp(`Level ${v.level}`, 'Choose how many levels of the structure are open'), { dd: 1, on: v.level > 0 }))}
        <i class="rx-d"></i>
        ${sec('view', 3, 1, 2,
          `<div class="rx-vm">${check('vDeps', v.showDeps, 'Dependencies')}${check('vProg', v.showProgress, 'Progress %')}
            ${check('vFull', v.fullscreen, 'Full screen')}<div class="rb-radios">${radio('basis', 'time', v.progressBasis === 'time', 'Time', !v.showProgress)}${radio('basis', 'work', v.progressBasis === 'work', 'Work', !v.showProgress)}</div></div>`,
          tile('view', 'visibility', 'View', tp('View modes', 'Dependencies, full screen and progress %'), { dd: 1 }))}
        <i class="rx-d"></i>
        ${sec('file', 2, null, 1, tile('file', 'import_export', 'File', tp('File', 'Import a plan or download it as CSV'), { dd: 1 }))}
        <i class="rx-d"></i>
        ${sec('display', 3, 1, 2,
          `${swTile('active', v.activeToday, 'Active tasks', tp('Active tasks', 'Shows only the activities running today'))}${zoomBox}${swTile('density', S.prefs.density === 'compact', 'Compact', tp('Compact', 'Smaller rows, so more activities fit on screen'))}`,
          tile('display', 'tune', 'Display', tp('Display', 'Active tasks, zoom and row size'), { dd: 1 }))}
        <i class="rx-d"></i>
        ${sec('defaults', 2, null, 1, tile('setDefault', 'lock_outline', 'Set default', tp('Set as default', 'Saves the current settings as your default view')))}
        <i class="rx-d"></i>
        ${sec('info', 2, null, 1, `${tile('legend', 'legend_toggle', 'Legends', tp('Legends', 'Explains the row and bar colours'))}${tile('refresh', 'sync', 'Refresh', tp('Refresh', 'Reloads the planning data'))}${tile('info', 'info', 'Updated', tp('Last updated', fmt(LIM_DATA.LAST_UPDATED)))}`)}
      </div>
      <i class="rx-d rx-d-more hidden"></i>
      <button class="rx-t ic hidden" id="slMore" data-act="more" data-tip="${tp('More', 'Tools that don’t fit the ribbon')}">${ms('more_horiz', 's20')}<span class="lbt">More</span></button>
    </div>`;
    bind();
    evenIcons(el());
    fit();
    count();
  }

  const changed = () => { G.render(); render(); };
  // "10 of 25" in the search field while searching or filtering
  function count() {
    const c = $('rbCount'); if (!c || !G.counts) return;
    const on = !!V().search || chips().length > 0, n = G.counts();
    c.classList.toggle('hidden', !on); c.textContent = on ? `${n.shown} of ${n.total}` : '';
  }

  // ---------- fitting: right to left, open → folded → icon, then into ⋯ ----------
  let hiddenGroups = [];
  // which open sections fold first when room runs out (wider screens keep View modes and Display open)
  const FOLD_ORDER = ['group', 'time', 'level', 'sort', 'display', 'view', 'find'];
  const setS = (g, s) => {
    g.dataset.s = s;
    g.classList.toggle('is-fold', g.dataset.fold != null && s >= +g.dataset.fold);
    g.classList.toggle('is-icon', g.dataset.icon != null && s >= +g.dataset.icon);
  };
  // a divider shows only between two visible sections
  const tidy = (box) => {
    let seen = false, last = null;
    [...box.children].forEach((c) => {
      if (c.classList.contains('rx-d')) { c.classList.add('hidden'); if (seen) last = c; return; }
      if (!c.classList.contains('hidden')) { if (last) last.classList.remove('hidden'); last = null; seen = true; }
    });
  };
  function fit() {
    const box = $('slItems'); if (!box) return;
    const more = $('slMore'), dMore = el().querySelector('.rx-d-more');
    const over = () => box.scrollWidth > box.clientWidth + 1;
    const gs = [...box.querySelectorAll(':scope > .rx-g')];
    gs.forEach((g) => { g.classList.remove('hidden'); setS(g, 0); });
    hiddenGroups = []; more.classList.add('hidden'); dMore.classList.add('hidden'); tidy(box);
    // an open search field (typing) stays open
    if ($('slSearch').classList.contains('open')) gs[0].dataset.n = 1; else gs[0].dataset.n = 3;
    // 1 · open sections fold into their named button, in FOLD_ORDER (Group and Time first, so View modes and Display stay open)
    for (const name of FOLD_ORDER) { if (!over()) break; const g = gs.find((x) => x.dataset.g === name); if (g && +g.dataset.n > 1) setS(g, +g.dataset.fold); }
    // 2 · labels give way to icons, right to left
    for (let i = gs.length - 1; i >= 0 && over(); i--) if (+gs[i].dataset.n > 1) setS(gs[i], +gs[i].dataset.n - 1);
    for (let i = gs.length - 1; i > 0 && over(); i--) {
      gs[i].classList.add('hidden'); hiddenGroups.push(gs[i].dataset.g);
      more.classList.remove('hidden'); dMore.classList.remove('hidden'); tidy(box);
    }
  }
  window.addEventListener('resize', () => { if (el().firstElementChild) fit(); });
  // icon names are wide text until the Material Icons font has loaded, so measure again then
  document.fonts && document.fonts.ready.then(() => { if (el().firstElementChild) fit(); });

  function bind() {
    const v = V();
    // search
    const q = $('rbQ'), box = $('slSearch');
    $('rbSearchBtn').onclick = () => { searchOpen = true; box.classList.add('open'); fit(); q.focus(); };
    q.onfocus = () => { searchOpen = true; if (!box.classList.contains('open')) { box.classList.add('open'); fit(); } };
    q.oninput = () => { v.search = q.value; G.render(); $('rbClear').classList.toggle('hidden', !q.value); count(); };
    q.onkeydown = (e) => keys(e);
    box.addEventListener('transitionend', (e) => { if (e.propertyName === 'width') fit(); });
    q.onblur = () => setTimeout(() => {
      if (document.activeElement === q) return;
      if (!v.search && searchOpen) { searchOpen = false; box.classList.remove('open'); fit(); }
    }, 120);
    $('rbClear').onclick = () => { v.search = ''; searchOpen = false; changed(); };
    // level · typed value
    const lv = $('lvIn');
    if (lv) {
      lv.onchange = (e) => setLevel(parseInt(e.target.value, 10));
      lv.onkeydown = (e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'ArrowUp') { e.preventDefault(); setLevel(V().level + 1); } if (e.key === 'ArrowDown') { e.preventDefault(); setLevel(V().level - 1); } };
      lv.onfocus = (e) => e.target.select();
    }
    // view modes shown directly
    const on = (id, fn) => { const n = $(id); if (n) n.onclick = fn; };
    on('vDeps', () => toggleView('showDeps'));
    on('vFull', () => toggleView('fullscreen'));
    on('vProg', () => toggleView('showProgress'));
    el().querySelectorAll('.rx-vm [data-radio]').forEach((b) => b.onclick = () => { V().progressBasis = b.dataset.val; changed(); });
    // radio picks
    el().querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => {
      const k = b.dataset.val, p = b.dataset.pick;
      if (p === 'period') { if (k !== v.period) setPeriod(k); return; }
      if (p === 'sort') v.sortBy = k;
      if (p === 'group') { v.groupBy = k; v.collapsedGroups = new Set(); }
      changed();
    });
    // everything else
    el().querySelectorAll('[data-act]').forEach((b) => b.onclick = (e) => ACT[b.dataset.act] && ACT[b.dataset.act](e.currentTarget));
  }
  const ACT = {
    filter: (b) => filterPop(b),
    prev: () => go(T.step(V().period, V().anchor, -1)),
    next: () => go(T.step(V().period, V().anchor, 1)),
    today: () => goToday(),
    period: (b) => periodMenu(b),
    sort: (b) => sortMenu(b),
    group: (b) => groupMenu(b),
    cols: (b) => colsMenu(b),
    lvMinus: () => setLevel(V().level - 1),
    lvPlus: () => setLevel(V().level + 1),
    lvAll: () => toggleAll(),
    level: (b) => levelPop(b),
    view: (b) => viewPop(b),
    file: (b) => UI.menu(b, [{ label: 'Import', icon: 'publish', onClick: doImport }, { label: 'Download', icon: 'download', onClick: doDownload }], { width: 180 }),
    active: () => toggleActive(),
    zoomOut: () => zoom(-10),
    zoomIn: () => zoom(10),
    fit: () => { V().zoom = 100; changed(); },
    density: () => toggleDensity(),
    display: (b) => displayPop(b),
    setDefault: () => setDefault(),
    legend: (b) => legendPop(b),
    refresh: (b) => refresh(b.querySelector('.ms')),
    info: () => {},
    more: (b) => moreMenu(b),
  };

  // ---------- actions (shared by the ribbon, ⋯ and search) ----------
  const go = (to) => { const v = V(); if (to === v.anchor) return; G.slideFrom(v.anchor); v.anchor = to; changed(); };
  const goToday = () => { const v = V(); if (v.period === 'project') G.scrollToToday(); else go(T.align(v.period, LIM_DATA.TODAY)); };
  const setPeriod = (k) => { const v = V(), sc = G.scale(); const keep = sc && LIM_DATA.TODAY >= sc.start && LIM_DATA.TODAY < sc.end ? LIM_DATA.TODAY : v.anchor; v.period = k; v.anchor = T.align(k, keep); v.zoom = 100; changed(); };
  const zoom = (d) => { const v = V(); v.zoom = Math.max(50, Math.min(ZOOM_MAX, v.zoom + d)); changed(); };
  const toggleActive = () => { V().activeToday = !V().activeToday; changed(); };
  const toggleDensity = () => { S.prefs.density = S.prefs.density === 'compact' ? 'comfortable' : 'compact'; S.savePrefs(); changed(); };
  const setLevel = (n) => { const v = V(), max = S.maxDepth(); n = Math.max(0, Math.min(max, isNaN(n) ? v.level : n)); G.applyLevel(n); changed(); };
  const toggleAll = () => { if (V().level >= S.maxDepth()) G.collapseAll(); else G.expandAll(); changed(); };
  const refresh = (icon) => { icon && icon.classList.add('spin'); setTimeout(() => { icon && icon.classList.remove('spin'); G.render(); UI.toast('Planning data refreshed'); }, 700); };
  const setDefault = () => {
    const v = V();
    Object.assign(S.prefs.defaults, { period: v.period, groupBy: v.groupBy, sortBy: v.sortBy, columns: v.columns.slice(), level: v.level }); S.prefs.customDefaults = true;
    S.savePrefs(); UI.toast('Current settings saved as default');
  };
  const doDownload = () => {
    const blob = new Blob(['﻿' + G.toCSV()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Amazon_planning.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    UI.toast('Planning downloaded as CSV');
  };
  const doImport = () => { const f = $('importFile'); f.value = ''; f.onchange = () => { if (f.files[0]) UI.toast(`"${esc(f.files[0].name)}" selected. Importing is not part of this demo.`); }; f.click(); };
  const toggleView = (k) => {
    const v = V();
    if (k === 'fullscreen') { v.fullscreen = !v.fullscreen; $('app').classList.toggle('fullscreen', v.fullscreen); } else v[k] = !v[k];
    changed();
  };

  // ---------- menus and pop-ups ----------
  const menuW = (a, min) => Math.max(a.getBoundingClientRect().width, min);
  function periodMenu(a) { const v = V(); UI.menu(a, T.PERIODS.map(([k, l]) => ({ label: l, on: v.period === k, onClick: () => setPeriod(k) })), { width: menuW(a, 180) }); }
  function sortMenu(a) { const v = V(); UI.menu(a, [{ label: 'Sort By', disabled: true }, ...SORT_OPTS.map(([k, l]) => ({ label: l, on: v.sortBy === k, onClick: () => { v.sortBy = k; changed(); } }))], { width: 200 }); markHead(); }
  function groupMenu(a) { const v = V(); UI.menu(a, [{ label: 'Group By', disabled: true }, ...GROUP_OPTS.map(([k, l]) => ({ label: l, on: v.groupBy === k, onClick: () => { v.groupBy = k; v.collapsedGroups = new Set(); changed(); } }))], { width: 200 }); markHead(); }
  const markHead = () => { const m = document.querySelector('#layer .menu .mi[disabled]'); m && m.classList.add('mhead'); };
  function colsMenu(a) {
    // multi-select: stays open, each click toggles a column (live app behaviour)
    const v = V();
    // each option has a checkbox on the left
    const items = [{ label: 'Column', disabled: true }, ...COL_OPTS.map(([k, l]) => ({ label: l, icon: 'check_box_outline_blank', keepOpen: true, onClick: (b) => {
      v.columns = v.columns.includes(k) ? v.columns.filter((c) => c !== k) : COL_OPTS.map((o) => o[0]).filter((c) => c === k || v.columns.includes(c));
      G.render(); refresh_(b.closest('.menu'));
    } })), { label: 'None', icon: 'check_box_outline_blank', keepOpen: true, onClick: (b) => { v.columns = []; G.render(); refresh_(b.closest('.menu')); } }];
    const refresh_ = (m) => m.querySelectorAll('.mi:not([disabled])').forEach((b, i) => {
      const on = i < COL_OPTS.length ? v.columns.includes(COL_OPTS[i][0]) : !v.columns.length;
      const c = b.querySelector('.ms'); c.textContent = on ? 'check_box' : 'check_box_outline_blank'; c.classList.toggle('ck', on);
    });
    const m = UI.menu(a, items, { width: 220, onClose: () => render() }); markHead();
    if (m) { m.classList.add('sl-cols'); refresh_(m); }
  }
  function levelPop(a) {
    const pop = UI.float(a, '<div class="sl-pop" id="lvPop"></div>', { cls: 'popover' }); if (!pop) return;
    const draw = () => {
      const v = V(), maxL = S.maxDepth();
      pop.querySelector('#lvPop').innerHTML = `<div class="rb-lr sl-lr"><span class="ovl">Level</span><button class="rb-lbtn" id="lvAll">${v.level >= maxL ? 'Collapse all' : 'Expand all'}</button></div>
        <div class="rb-stepper"><button id="lvMinus" data-tip="Level down" ${v.level <= 0 ? 'disabled' : ''}>${ms('remove', 's20')}</button><span>${v.level}</span><button id="lvPlus" data-tip="Level up" ${v.level >= maxL ? 'disabled' : ''}>${ms('add', 's20')}</button></div>`;
      pop.querySelector('#lvMinus').onclick = () => { G.applyLevel(Math.max(0, V().level - 1)); G.render(); draw(); };
      pop.querySelector('#lvPlus').onclick = () => { G.applyLevel(Math.min(S.maxDepth(), V().level + 1)); G.render(); draw(); };
      pop.querySelector('#lvAll').onclick = () => { if (V().level >= S.maxDepth()) G.collapseAll(); else G.expandAll(); G.render(); draw(); };
    };
    draw();
  }
  function viewPop(a) {
    const pop = UI.float(a, '<div class="sl-pop" id="vwPop"></div>', { cls: 'popover' }); if (!pop) return;
    const draw = () => {
      const v = V();
      pop.querySelector('#vwPop').innerHTML = `<div class="rb-lr sl-lr"><span class="ovl">View modes</span></div>
        <div class="sl-vcol">${check('vDeps', v.showDeps, 'Dependencies')}${check('vFull', v.fullscreen, 'Full screen')}</div>
        <i class="sl-hdiv"></i>
        <div class="sl-vcol">${check('vProg', v.showProgress, 'Progress %')}
          <div class="rb-radios">${radio('basis', 'time', v.progressBasis === 'time', 'Time', !v.showProgress)}${radio('basis', 'work', v.progressBasis === 'work', 'Work', !v.showProgress)}</div></div>`;
      const t = (k) => () => { toggleView(k); draw(); };
      pop.querySelector('#vDeps').onclick = t('showDeps');
      pop.querySelector('#vFull').onclick = t('fullscreen');
      pop.querySelector('#vProg').onclick = t('showProgress');
      pop.querySelectorAll('[data-radio]').forEach((b) => b.onclick = () => { V().progressBasis = b.dataset.val; G.render(); draw(); });
    };
    draw();
  }

  // Display ▾ · Active tasks, zoom and Compact when the section is folded
  function displayPop(a) {
    const pop = UI.float(a, '<div class="sl-pop" id="dpPop"></div>', { cls: 'popover' }); if (!pop) return;
    const draw = () => {
      const v = V();
      pop.querySelector('#dpPop').innerHTML = `<div class="rb-lr sl-lr"><span class="ovl">Display</span></div>
        ${switchHtml(v.activeToday, 'dpActive', 'Active tasks')}
        <div class="sl-zrow"><div class="rb-zc"><button class="rb-ib" id="dpOut" ${v.zoom <= 50 ? 'disabled' : ''}>${ms('zoom_out', 's20')}</button><button class="sl-fit" id="dpFit">Fit</button><button class="rb-ib" id="dpIn" ${v.zoom >= ZOOM_MAX ? 'disabled' : ''}>${ms('zoom_in', 's20')}</button></div><span>Zoom ${v.zoom}%</span></div>
        ${switchHtml(S.prefs.density === 'compact', 'dpDensity', 'Compact')}`;
      const q = (id) => pop.querySelector('#' + id);
      q('dpActive').onclick = () => { V().activeToday = !V().activeToday; G.render(); draw(); };
      q('dpOut').onclick = () => { V().zoom = Math.max(50, V().zoom - 10); G.render(); draw(); };
      q('dpIn').onclick = () => { V().zoom = Math.min(ZOOM_MAX, V().zoom + 10); G.render(); draw(); };
      q('dpFit').onclick = () => { V().zoom = 100; G.render(); draw(); };
      q('dpDensity').onclick = () => { S.prefs.density = S.prefs.density === 'compact' ? 'comfortable' : 'compact'; S.savePrefs(); G.render(); draw(); };
    };
    draw();
  }

  // ⋯ lists the sections that didn't fit, in ribbon order, with their choices
  function moreMenu(a) {
    const v = V(), all = v.level >= S.maxDepth();
    const order = ['filter', 'time', 'sort', 'group', 'column', 'level', 'view', 'file', 'display', 'defaults', 'info'];
    const G_ITEMS = {
      filter: [{ label: 'Filter', icon: 'filter_list', onClick: () => filterPop(a) }],
      time: [{ label: `Time period: ${lbl(T.PERIODS, v.period)}`, icon: 'date_range', onClick: () => periodMenu(a) }, { label: 'Today', icon: 'today', onClick: goToday }],
      sort: [{ label: `Sort by: ${lbl(SORT_OPTS, v.sortBy)}`, icon: 'sort', onClick: () => sortMenu(a) }],
      group: [{ label: `Group by: ${lbl(GROUP_OPTS, v.groupBy)}`, icon: 'workspaces', onClick: () => groupMenu(a) }],
      column: [{ label: 'Column', icon: 'view_column', onClick: () => colsMenu(a) }],
      level: [{ label: `Level: ${v.level}`, icon: 'format_list_bulleted', onClick: () => levelPop(a) }, { label: all ? 'Collapse all' : 'Expand all', icon: all ? 'unfold_less' : 'unfold_more', onClick: toggleAll }],
      view: [{ label: 'View modes', icon: 'visibility', onClick: () => viewPop(a) }],
      file: [{ label: 'Import', icon: 'publish', onClick: doImport }, { label: 'Download', icon: 'download', onClick: doDownload }],
      display: [{ label: 'Active tasks', icon: 'event_available', on: v.activeToday, onClick: toggleActive }, { label: `Zoom out (${v.zoom}%)`, icon: 'zoom_out', disabled: v.zoom <= 50, onClick: () => zoom(-10) }, { label: 'Fit', icon: 'fit_screen', onClick: () => { v.zoom = 100; changed(); } }, { label: `Zoom in (${v.zoom}%)`, icon: 'zoom_in', disabled: v.zoom >= ZOOM_MAX, onClick: () => zoom(10) }, { label: 'Compact', icon: 'density_small', on: S.prefs.density === 'compact', onClick: toggleDensity }],
      defaults: [{ label: 'Set as default', icon: 'lock_outline', onClick: setDefault }],
      info: [{ label: 'Legends', icon: 'legend_toggle', onClick: () => legendPop(a) }, { label: 'Refresh', icon: 'sync', onClick: () => refresh() }, { label: `Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}`, icon: 'info', disabled: true }],
    };
    const items = [];
    order.filter((g) => hiddenGroups.includes(g)).forEach((g, i) => { if (i) items.push({ sep: true }); items.push(...G_ITEMS[g]); });
    UI.menu(a, items, { width: 240, align: 'right' });
  }

  // ---------- search: a plain search on the activity name and the visible columns ----------
  // matching rows are shown in the Gantt as you type (no dropdown); Esc leaves the field
  function keys(e) {
    if (e.key === 'Escape' || e.key === 'Enter') { e.stopPropagation(); $('rbQ').blur(); }
  }

  // Filter popover · LIM filter: Start / End date, Organization, Discipline, Site, Floor, Reset / Apply
  const FILTER_FIELDS = [['org', 'Organization'], ['discipline', 'Discipline'], ['site', 'Site'], ['floor', 'Floor']];
  const EMPTY_FILTERS = () => ({ from: '', to: '', activeToday: false, udf1: '', udf2: '', udf3: '', org: '', discipline: '', site: '', floor: '' });
  function filterPop(anchor) {
    const f = Object.assign(EMPTY_FILTERS(), V().filters);
    const pop = UI.float(anchor, `<div class="fp">
      <div class="fp-dur"><div><div class="ovl">Start Date</div><label class="fp-date"><input type="date" id="fFrom" value="${f.from}" aria-label="Start Date"></label></div>
        <div><div class="ovl">End Date</div><label class="fp-date"><input type="date" id="fTo" value="${f.to}" aria-label="End Date"></label></div></div>
      ${FILTER_FIELDS.map(([k, l]) => `<div class="ovl">${l}</div><input class="fp-in" id="f_${k}" placeholder="type..." value="${esc(f[k])}" aria-label="${l}">`).join('')}
      <div class="fp-f"><button class="btn text" id="fReset">Reset</button><button class="btn contained" id="fApply">Apply</button></div>
    </div>`, { cls: 'popover fp-pop' });
    if (!pop) return;
    pop.querySelector('#fReset').onclick = () => { V().filters = EMPTY_FILTERS(); UI.closeFloat(); changed(); };
    pop.querySelector('#fApply').onclick = () => {
      Object.assign(f, { from: pop.querySelector('#fFrom').value, to: pop.querySelector('#fTo').value, activeToday: false, udf1: '', udf2: '', udf3: '' });
      FILTER_FIELDS.forEach(([k]) => { f[k] = pop.querySelector('#f_' + k).value.trim(); });
      V().filters = f; UI.closeFloat(); changed();
    };
  }

  // Legends popover
  function legendPop(anchor) {
    UI.float(anchor, `<div class="lg"><div class="ovl">Legends</div>
      ${[['#F5BF5E', 'Critical Date'], ['#06A77D', 'Logistics Volume - Normal'], ['#D82034', 'Logistics Volume - Critical']].map(([c, t]) => `<div class="lg-i"><i style="background:${c}"></i>${t}</div>`).join('')}</div>`, { cls: 'popover lg-pop', align: 'right' });
  }

  return { render };
})();
