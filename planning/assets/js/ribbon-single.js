/* Ribbon v3 · one ribbon for the LIM planning module, two modes (MS ribbon reference recording)
   Expanded (64px, default on big screens): sections of icon-with-label controls, divided by lines —
     Find | Time | Structure | Level | View modes | Display | Actions … mode switch
     When the row gets too narrow, sections give way from right to left: File ▾, View ▾, search icon,
     icon-only tiles, and finally the lowest-priority sections move into ⋯.
   Collapsed (48px, auto below 900px): one line of icons — Search, Filter, Monthly ▾, Today ‹ ›, Sort, Group, Level, ⋯.
   The chevron at the right end switches modes; a mode chosen there is remembered. */
window.R = (function () {
  const { esc, ms, fmt } = UI;
  const V = () => S.view;
  const el = () => document.getElementById('ribbon');
  const $ = (id) => document.getElementById(id);
  const GROUP_OPTS = [['discipline', 'Discipline'], ['zone', 'Zone'], ['org', 'Organization'], ['phase', 'Phase'], ['site', 'Site'], ['floor', 'Floor'], ['none', 'None']];
  const SORT_OPTS = [['default', 'Default'], ['start', 'Start Date'], ['end', 'End Date']];
  const COL_OPTS = [['org', 'Organization'], ['discipline', 'Discipline'], ['floors', 'Floor'], ['site', 'Site'], ['volumeActual', 'Volume Actual'], ['start', 'Start Date'], ['end', 'End Date']];
  const lbl = (opts, k) => (opts.find((o) => o[0] === k) || ['', ''])[1];
  const colsLabel = () => (V().columns.length ? V().columns.map((c) => lbl(COL_OPTS, c)).join(', ') : 'None');
  const switchHtml = (on, id, label) => `<button class="rb-switch ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}"><i class="sw"><i></i></i><span>${label}</span></button>`;
  const iconBtn = (id, icon, tip, disabled) => `<button class="rb-ib" id="${id}" data-tip="${tip}" ${disabled ? 'disabled' : ''}>${ms(icon, 's20')}</button>`;
  // collapsed line · dropdown button: label + ▾, or icon + ▾ (label: null)
  const ddBtn = (id, icon, label, tip, on) => `<button class="sl-dd ${label ? '' : 'ic'} ${on ? 'set' : ''}" id="${id}" data-tip="${esc(tip)}">${ms(icon, 's20 sl-ic')}${label ? `<span class="sl-lb">${esc(label)}</span>` : ''}${ms('arrow_drop_down', 's16')}</button>`;
  // expanded · tile: icon with its label underneath (▾ after the label when it opens a menu)
  const tile = (id, icon, label, tip, o = {}) => `<button class="rx-t ${o.on ? 'set' : ''} ${o.cls || ''}" id="${id}" data-tip="${esc(tip)}" ${o.disabled ? 'disabled' : ''}>${ms(icon, 's20')}<span class="lbt">${esc(label)}${o.dd ? ms('arrow_drop_down', 's16') : ''}</span>${o.badge || ''}</button>`;
  const swTile = (id, on, label) => `<button class="rx-t rb-switch ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}"><i class="sw"><i></i></i><span class="lbt">${label}</span></button>`;
  // Material glyphs fill their box differently (zoom and search look small, refresh and info look right):
  // these sizes give every 20px ribbon icon about the same visible size as refresh / info
  const ICON_PX = { search: 23, zoom_in: 23, zoom_out: 23, filter_list: 22, sort: 22, view_column: 22, format_list_bulleted: 22, import_export: 22, lock_outline: 20 };
  const evenIcons = (root, sel = '.ms.s20') => root && root.querySelectorAll(sel).forEach((i) => { const px = ICON_PX[i.textContent.trim()]; if (px) i.style.fontSize = px + 'px'; });
  // menus opened from the ribbon (⋯, search tools) get the same icon sizes
  new MutationObserver((ms_) => ms_.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && evenIcons(n, '.mi > .ms:first-child')))).observe(document.getElementById('layer'), { childList: true, subtree: true });
  const ZOOM_MAX = 200;
  const AUTO_COLLAPSE = 900;   // px · below this the ribbon collapses unless a mode was chosen
  const check = (id, on, label) => `<button class="rb-check ${on ? 'on' : ''}" id="${id}" role="checkbox" aria-checked="${on}"><i class="cb">${on ? ms('check', 's16') : ''}</i><span>${label}</span></button>`;
  const radio = (name, val, on, label, disabled) => `<button class="rb-radio ${on ? 'on' : ''}" data-radio="${name}" data-val="${val}" ${disabled ? 'disabled' : ''}><i class="rd"></i><span>${label}</span></button>`;
  let searchOpen = false;

  function chips() {
    const f = V().filters, out = [];
    if (f.from || f.to) out.push(['dur', `${f.from ? fmt(f.from) : '…'} – ${f.to ? fmt(f.to) : '…'}`]);
    if (f.activeToday) out.push(['activeToday', 'Active Today']);
    ['udf1', 'udf2', 'udf3'].forEach((k) => { if (f[k]) out.push([k, f[k]]); });
    return out;
  }

  const mode = () => S.prefs.ribbonMode || (window.innerWidth < AUTO_COLLAPSE ? 'collapsed' : 'expanded');
  const expanded = () => mode() === 'expanded';
  let shownMode = null;

  const searchHtml = (open) => `<div class="rb-search sl-search ${open ? 'open' : ''}" id="slSearch">
        <button class="sl-sicon" id="rbSearchBtn" data-tip="${open ? '' : 'Search activities and tools'}" tabindex="${open ? -1 : 0}">${ms('search', 's20')}<span class="lbt">Search</span></button>
        <input id="rbQ" placeholder="Search activities and tools" value="${esc(V().search)}" autocomplete="off">
        <button class="rb-clear ${V().search ? '' : 'hidden'}" id="rbClear" data-tip="Clear search">${ms('close', 's16')}</button>
      </div>`;
  const filterTip = (ch) => (ch.length ? esc('Filter: ' + ch.map((c) => c[1]).join(', ')) : 'Filter');
  const badge = (ch) => (ch.length ? `<i class="sl-badge">${ch.length}</i>` : '');
  const stepper = (v, maxL) => `<div class="rb-stepper rx-step"><button id="lvMinus" data-tip="Level down" ${v.level <= 0 ? 'disabled' : ''}>${ms('remove', 's20')}</button><input id="lvIn" value="${v.level}" inputmode="numeric" aria-label="Level"><button id="lvPlus" data-tip="Level up" ${v.level >= maxL ? 'disabled' : ''}>${ms('add', 's20')}</button></div>`;

  function render() {
    shownMode = mode();
    document.getElementById('app').classList.remove('topbar-hidden');
    el().classList.add('sl');
    if (shownMode === 'expanded') renderExpanded(); else renderCollapsed();
    bind();
    evenIcons(el());
    fit();
  }

  // ---------- Expanded · 64px, icon with label ----------
  function renderExpanded() {
    const v = V(), stepL = T.STEP_LABEL[v.period], maxL = S.maxDepth(), ch = chips(), all = v.level >= maxL;
    const open = searchOpen || !!v.search;
    el().innerHTML = `
    <div class="rx" id="rx">
      <div class="rx-items" id="slItems">
        <div class="rx-g" data-g="find" data-p="12">${searchHtml(open)}
          ${tile('rbFilter', 'filter_list', 'Filter', filterTip(ch), { cls: 'sl-filter' + (ch.length ? ' on' : ''), badge: badge(ch) })}</div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="time" data-p="11">
          ${tile('ddPeriod', 'date_range', lbl(T.PERIODS, v.period), `Time Period: ${lbl(T.PERIODS, v.period)}`, { dd: 1, cls: 'rx-period' })}
          ${tile('rbCal', 'today', 'Today', 'Go to today')}
          <div class="rx-stk"><button class="rb-ib" id="rbPrev" data-tip="${stepL ? `Previous ${stepL}` : 'Previous'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button>
            <button class="rb-ib" id="rbNext" data-tip="${stepL ? `Next ${stepL}` : 'Next'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button></div></div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="structure" data-p="9">
          ${tile('slGroup', 'workspaces', 'Group', `Group By: ${lbl(GROUP_OPTS, v.groupBy)}`, { dd: 1, on: v.groupBy !== 'none' })}
          ${tile('slSort', 'sort', 'Sort', `Sort By: ${lbl(SORT_OPTS, v.sortBy)}`, { dd: 1, on: v.sortBy !== 'default' })}
          <span data-g="column" data-p="5" class="rx-sub">${tile('slCols', 'view_column', 'Column', `Column: ${colsLabel()}`, { dd: 1 })}</span></div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="level" data-p="10">
          <div class="rx-lv">${stepper(v, maxL)}<span class="lbt">Level</span></div>
          ${tile('lvAll', all ? 'unfold_less' : 'unfold_more', all ? 'Collapse all' : 'Expand all', all ? 'Collapse all rows' : 'Expand all rows')}</div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="view" data-p="6">
          <div class="rx-vm">${check('vDeps', v.showDeps, 'Dependencies')}${check('vProg', v.showProgress, 'Progress %')}
            ${check('vFull', v.fullscreen, 'Full screen')}<div class="rb-radios">${radio('basis', 'time', v.progressBasis === 'time', 'Time', !v.showProgress)}${radio('basis', 'work', v.progressBasis === 'work', 'Work', !v.showProgress)}</div></div>
          ${tile('ddView', 'visibility', 'View', 'View modes', { dd: 1, cls: 'rx-viewdd' })}</div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="display" data-p="4">
          ${swTile('rbActive', v.activeToday, 'Active tasks')}
          <div class="rx-zoom"><div class="rb-zc">${iconBtn('rbZoomOut', 'zoom_out', `Zoom out (${v.zoom}%)`, v.zoom <= 50)}<button class="sl-fit" id="rbFit" data-tip="Back to the default view">Fit</button>${iconBtn('rbZoomIn', 'zoom_in', `Zoom in (${v.zoom}%)`, v.zoom >= ZOOM_MAX)}</div><span class="lbt">Zoom ${v.zoom}%</span></div>
          ${tile('rbLegend', 'legend_toggle', 'Legends', 'Legends')}
          ${swTile('rbDensity', S.prefs.density === 'compact', 'Compact')}</div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="actions" data-p="2">
          ${tile('rbRefresh', 'sync', 'Refresh', 'Refresh', { cls: 'rx-small' })}
          ${tile('rbInfo', 'info', 'Updated', `Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}`, { cls: 'rx-small' })}
          ${tile('acImport', 'publish', 'Import', 'Import', { cls: 'rx-file' })}
          ${tile('acDownload', 'download', 'Download', 'Download', { cls: 'rx-file' })}
          ${tile('ddFiles', 'import_export', 'File', 'Import / Download', { dd: 1, cls: 'rx-filedd' })}
          ${tile('rbSetDefault', 'lock_outline', 'Set default', 'Set as default')}</div>
      </div>
      <button class="rx-t hidden" id="slMore" data-tip="More options">${ms('more_horiz', 's20')}<span class="lbt">More</span></button>
      <button class="rb-ib rx-mode" id="rbMode" data-tip="Collapse the ribbon" data-tip-pos="left">${ms('expand_less', 's24')}</button>
    </div>`;
  }

  // ---------- Collapsed · 48px, one line of icons ----------
  function renderCollapsed() {
    const v = V(), stepL = T.STEP_LABEL[v.period], maxL = S.maxDepth(), ch = chips();
    const open = searchOpen || !!v.search;
    el().innerHTML = `
    <div class="sl-bar">
      ${searchHtml(open)}
      <button class="rb-ib sl-filter ${ch.length ? 'on' : ''}" id="rbFilter" data-tip="${filterTip(ch)}">${ms('filter_list', 's20')}${badge(ch)}</button>
      <div class="sl-items" id="slItems">
        <div class="sl-g" data-g="time" data-p="11"><i class="rb-vd"></i>
          ${ddBtn('ddPeriod', 'date_range', lbl(T.PERIODS, v.period), `Time Period: ${lbl(T.PERIODS, v.period)}`)}
          <button class="rb-text" id="rbCal">Today</button>
          <button class="rb-ib" id="rbPrev" data-tip="${stepL ? `Previous ${stepL}` : 'Previous'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button>
          <button class="rb-ib" id="rbNext" data-tip="${stepL ? `Next ${stepL}` : 'Next'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button></div>
        <div class="sl-g" data-g="structure" data-p="9"><i class="rb-vd"></i>
          ${ddBtn('slSort', 'sort', null, `Sort By: ${lbl(SORT_OPTS, v.sortBy)}`, v.sortBy !== 'default')}
          ${ddBtn('slGroup', 'workspaces', null, `Group By: ${lbl(GROUP_OPTS, v.groupBy)}`, v.groupBy !== 'none')}</div>
        <div class="sl-g" data-g="level" data-p="10"><i class="rb-vd"></i>${stepper(v, maxL)}</div>
      </div>
      <button class="rb-ib" id="slMore" data-tip="More options">${ms('more_horiz', 's20')}</button>
      <i class="rb-vd"></i>
      <button class="rb-ib rx-mode" id="rbMode" data-tip="Expand the ribbon" data-tip-pos="left">${ms('expand_more', 's24')}</button>
    </div>`;
  }

  const changed = () => { G.render(); render(); };

  // ---------- fitting ----------
  // groups that are in ⋯ right now (collapsed: everything outside the compact line)
  const COLLAPSED_MORE = ['column', 'view', 'levelall', 'display', 'actions'];
  let hiddenGroups = [];
  const STEPS = ['s-file', 's-view', 's-search', 's-icons'];   // expanded, applied one after another, right to left
  function fit() {
    const box = $('slItems'); if (!box) return;
    const more = $('slMore');
    const over = () => box.scrollWidth > box.clientWidth + 1;
    if (shownMode === 'collapsed') {
      const groups = [...box.querySelectorAll('.sl-g')].sort((a, b) => a.dataset.p - b.dataset.p);
      groups.forEach((g) => g.classList.remove('hidden'));
      hiddenGroups = COLLAPSED_MORE.slice();
      for (const g of groups) { if (!over()) break; g.classList.add('hidden'); hiddenGroups.push(g.dataset.g); }
      return;
    }
    const rx = $('rx');
    STEPS.forEach((s) => rx.classList.remove(s));
    const groups = [...box.querySelectorAll('[data-g]')].sort((a, b) => a.dataset.p - b.dataset.p);
    groups.forEach((g) => g.classList.remove('hidden'));
    box.querySelectorAll('.rx-d').forEach((d) => d.classList.remove('hidden'));
    hiddenGroups = []; more.classList.add('hidden');
    for (const s of STEPS) { if (!over()) break; rx.classList.add(s); }
    for (const g of groups) {
      if (!over()) break;
      g.classList.add('hidden'); hiddenGroups.push(g.dataset.g);
      const d = g.previousElementSibling; if (d && d.classList.contains('rx-d')) d.classList.add('hidden');
      more.classList.remove('hidden');   // ⋯ takes room too, so it shows before the next measurement
    }
  }
  window.addEventListener('resize', () => { if (!el().firstElementChild) return; if (mode() !== shownMode) { closeSuggest(); UI.closeFloat && UI.closeFloat(); render(); } else fit(); });
  // icon names are wide text until the Material Icons font has loaded, so measure again then
  document.fonts && document.fonts.ready.then(() => { if (el().firstElementChild) fit(); });

  // the chevron switches modes; the choice is remembered
  const toggleMode = () => { S.prefs.ribbonMode = expanded() ? 'collapsed' : 'expanded'; S.savePrefs(); searchOpen = false; closeSuggest(); render(); G.render(); };

  function bind() {
    const v = V();
    const on = (id, ev, fn) => { const n = $(id); if (n) n[ev] = fn; };
    // search
    const q = $('rbQ'), box = $('slSearch');
    $('rbSearchBtn').onclick = () => { searchOpen = true; box.classList.add('open'); q.focus(); };
    q.onfocus = () => { searchOpen = true; if (!box.classList.contains('open')) { box.classList.add('open'); fit(); } suggest(); };
    q.oninput = () => { v.search = q.value; G.render(); $('rbClear').classList.toggle('hidden', !q.value); suggest(); };
    q.onkeydown = (e) => keys(e);
    // the box widens / narrows with a short transition: measure the row again when it ends
    box.addEventListener('transitionend', (e) => { if (e.propertyName !== 'width') return; fit(); if (sugEl) suggest(); });
    q.onblur = () => setTimeout(() => {
      if (document.activeElement === q) return;
      closeSuggest();
      if (!v.search && searchOpen) { searchOpen = false; box.classList.remove('open'); fit(); }
    }, 120);
    $('rbClear').onclick = () => { v.search = ''; searchOpen = false; closeSuggest(); changed(); };
    on('rbFilter', 'onclick', (e) => filterPop(e.currentTarget));
    // timeline
    on('rbPrev', 'onclick', () => go(T.step(v.period, v.anchor, -1)));
    on('rbNext', 'onclick', () => go(T.step(v.period, v.anchor, 1)));
    on('rbCal', 'onclick', () => goToday());
    on('ddPeriod', 'onclick', (e) => periodMenu(e.currentTarget));
    // structure
    on('slSort', 'onclick', (e) => sortMenu(e.currentTarget));
    on('slGroup', 'onclick', (e) => groupMenu(e.currentTarget));
    on('slCols', 'onclick', (e) => colsMenu(e.currentTarget));
    // level · − / input / +
    on('lvMinus', 'onclick', () => setLevel(V().level - 1));
    on('lvPlus', 'onclick', () => setLevel(V().level + 1));
    on('lvIn', 'onchange', (e) => setLevel(parseInt(e.target.value, 10)));
    on('lvIn', 'onkeydown', (e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'ArrowUp') { e.preventDefault(); setLevel(V().level + 1); } if (e.key === 'ArrowDown') { e.preventDefault(); setLevel(V().level - 1); } });
    on('lvIn', 'onfocus', (e) => e.target.select());
    on('lvAll', 'onclick', () => toggleAll());
    // view modes (inline checkboxes, or View ▾)
    on('vDeps', 'onclick', () => toggleView('showDeps'));
    on('vFull', 'onclick', () => toggleView('fullscreen'));
    on('vProg', 'onclick', () => toggleView('showProgress'));
    el().querySelectorAll('[data-radio]').forEach((b) => b.onclick = () => { V().progressBasis = b.dataset.val; changed(); });
    on('ddView', 'onclick', (e) => viewPop(e.currentTarget));
    // display
    on('rbActive', 'onclick', () => toggleActive());
    on('rbZoomOut', 'onclick', () => zoom(-10));
    on('rbZoomIn', 'onclick', () => zoom(10));
    on('rbFit', 'onclick', () => { v.zoom = 100; changed(); });
    on('rbLegend', 'onclick', (e) => legendPop(e.currentTarget));
    on('rbDensity', 'onclick', () => toggleDensity());
    // actions
    on('rbRefresh', 'onclick', (e) => refresh(e.currentTarget.querySelector('.ms')));
    on('acImport', 'onclick', () => doImport());
    on('acDownload', 'onclick', () => doDownload());
    on('ddFiles', 'onclick', (e) => UI.menu(e.currentTarget, [{ label: 'Import', icon: 'publish', onClick: doImport }, { label: 'Download', icon: 'download', onClick: doDownload }], { width: 180 }));
    on('rbSetDefault', 'onclick', () => setDefault());
    on('slMore', 'onclick', (e) => moreMenu(e.currentTarget));
    on('rbMode', 'onclick', () => toggleMode());
  }

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

  // ⋯ lists the controls of the sections that didn't fit, in ribbon order
  function moreMenu(a) {
    const v = V(), stepL = T.STEP_LABEL[v.period], all = v.level >= S.maxDepth();
    const order = ['find', 'time', 'structure', 'column', 'level', 'levelall', 'view', 'display', 'actions'];
    const G_ITEMS = {
      find: [{ label: 'Search', icon: 'search', onClick: () => { searchOpen = true; render(); $('rbQ').focus(); } }, { label: 'Filter', icon: 'filter_list', onClick: () => filterPop(a) }],
      time: [{ label: `Time Period: ${lbl(T.PERIODS, v.period)}`, icon: 'date_range', onClick: () => periodMenu(a) }, { label: 'Today', icon: 'today', onClick: goToday }, { label: stepL ? `Previous ${stepL}` : 'Previous', icon: 'keyboard_arrow_left', disabled: !stepL, onClick: () => go(T.step(v.period, v.anchor, -1)) }, { label: stepL ? `Next ${stepL}` : 'Next', icon: 'keyboard_arrow_right', disabled: !stepL, onClick: () => go(T.step(v.period, v.anchor, 1)) }],
      structure: [{ label: `Group By: ${lbl(GROUP_OPTS, v.groupBy)}`, icon: 'workspaces', onClick: () => groupMenu(a) }, { label: `Sort By: ${lbl(SORT_OPTS, v.sortBy)}`, icon: 'sort', onClick: () => sortMenu(a) }],
      column: [{ label: 'Column', icon: 'view_column', onClick: () => colsMenu(a) }],
      level: [{ label: `Level: ${v.level}`, icon: 'format_list_bulleted', onClick: () => levelPop(a) }],
      levelall: [{ label: all ? 'Collapse all' : 'Expand all', icon: all ? 'unfold_less' : 'unfold_more', onClick: toggleAll }],
      view: [{ label: 'View modes', icon: 'visibility', onClick: () => viewPop(a) }],
      display: [{ label: 'Active tasks', icon: 'event_available', on: v.activeToday, onClick: toggleActive }, { label: `Zoom out (${v.zoom}%)`, icon: 'zoom_out', disabled: v.zoom <= 50, onClick: () => zoom(-10) }, { label: 'Fit', icon: 'fit_screen', onClick: () => { v.zoom = 100; changed(); } }, { label: `Zoom in (${v.zoom}%)`, icon: 'zoom_in', disabled: v.zoom >= ZOOM_MAX, onClick: () => zoom(10) }, { label: 'Legends', icon: 'legend_toggle', onClick: () => legendPop(a) }, { label: 'Compact', icon: 'density_small', on: S.prefs.density === 'compact', onClick: toggleDensity }],
      actions: [{ label: 'Refresh', icon: 'sync', onClick: () => refresh() }, { label: `Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}`, icon: 'info', disabled: true }, { label: 'Import', icon: 'publish', onClick: doImport }, { label: 'Download', icon: 'download', onClick: doDownload }, { label: 'Set as default', icon: 'lock_outline', onClick: setDefault }],
    };
    // in Expanded, "level" hides with its Expand all tile
    const hidden = hiddenGroups.includes('level') ? [...hiddenGroups, 'levelall'] : hiddenGroups;
    const items = [];
    order.filter((g) => hidden.includes(g)).forEach((g, i) => { if (i) items.push({ sep: true }); items.push(...G_ITEMS[g]); });
    // a pop-up chosen here opens in place of the menu, anchored to ⋯
    UI.menu(a, items, { width: 240, align: 'right' });
  }

  // ---------- search: activities are filtered as you type; matching tools are listed under the field ----------
  // a control that is on screen, or ⋯ when it has moved there
  const anchor = (id) => ($(id) && $(id).offsetParent ? $(id) : $('slMore'));
  const COMMANDS = () => {
    const v = V();
    return [
      ...T.PERIODS.map(([k, l]) => ({ label: `Time Period: ${l}`, k: 'time period view', icon: 'date_range', on: v.period === k, run: () => setPeriod(k) })),
      { label: 'Today', k: 'go to today date now', icon: 'today', run: goToday },
      { label: 'Previous period', k: 'back previous earlier', icon: 'keyboard_arrow_left', run: () => go(T.step(v.period, v.anchor, -1)) },
      { label: 'Next period', k: 'forward next later', icon: 'keyboard_arrow_right', run: () => go(T.step(v.period, v.anchor, 1)) },
      { label: 'Sort By…', k: 'sort order start end date', icon: 'sort', run: () => sortMenu(anchor('slSort')) },
      { label: 'Group By…', k: 'group discipline zone organization phase site floor', icon: 'workspaces', run: () => groupMenu(anchor('slGroup')) },
      { label: 'Column…', k: 'columns show hide organization floor site', icon: 'view_column', run: () => colsMenu(anchor('slCols')) },
      { label: 'Level…', k: 'level depth tree', icon: 'format_list_bulleted', run: () => (anchor('lvIn') === $('lvIn') ? $('lvIn').focus() : levelPop(anchor('lvIn'))) },
      { label: v.level >= S.maxDepth() ? 'Collapse all' : 'Expand all', k: 'expand collapse all rows tree', icon: v.level >= S.maxDepth() ? 'unfold_less' : 'unfold_more', run: toggleAll },
      { label: 'Dependencies', k: 'view mode links arrows show dependencies', icon: 'account_tree', on: v.showDeps, run: () => toggleView('showDeps') },
      { label: 'Full screen', k: 'view mode full screen show fullscreen', icon: 'fullscreen', on: v.fullscreen, run: () => toggleView('fullscreen') },
      { label: 'Progress %', k: 'view mode percent show progress percentage', icon: 'percent', on: v.showProgress, run: () => toggleView('showProgress') },
      { label: 'Active tasks', k: 'active today filter', icon: 'event_available', on: v.activeToday, run: toggleActive },
      { label: 'Zoom in', k: 'zoom bigger', icon: 'zoom_in', run: () => zoom(10) },
      { label: 'Zoom out', k: 'zoom smaller', icon: 'zoom_out', run: () => zoom(-10) },
      { label: 'Fit', k: 'zoom fit reset default view screen', icon: 'fit_screen', run: () => { v.zoom = 100; changed(); } },
      { label: 'Filter…', k: 'filter duration udf', icon: 'filter_list', run: () => filterPop(anchor('rbFilter')) },
      { label: 'Legends', k: 'legend colours colors', icon: 'legend_toggle', run: () => legendPop(anchor('rbLegend')) },
      { label: 'Compact', k: 'density rows compact comfortable', icon: 'density_small', on: S.prefs.density === 'compact', run: toggleDensity },
      { label: 'Refresh', k: 'reload sync update', icon: 'sync', run: () => refresh() },
      { label: 'Import', k: 'upload file import', icon: 'publish', run: doImport },
      { label: 'Download', k: 'export csv download', icon: 'download', run: doDownload },
      { label: 'Set as default', k: 'save default settings', icon: 'lock_outline', run: setDefault },
      { label: expanded() ? 'Collapse the ribbon' : 'Expand the ribbon', k: 'ribbon mode collapse expand compact toolbar', icon: expanded() ? 'expand_less' : 'expand_more', run: toggleMode },
    ];
  };
  let sugEl = null, sugItems = [], sugIdx = -1;
  function suggest() {
    const q = V().search.trim().toLowerCase();
    if (!q) return closeSuggest();
    sugItems = COMMANDS().filter((c) => (c.label + ' ' + c.k).toLowerCase().includes(q)).slice(0, 6);
    const n = G.counts ? G.counts().shown : null;
    if (!sugEl) { sugEl = document.createElement('div'); sugEl.className = 'menu sl-sug'; document.getElementById('layer').appendChild(sugEl); }
    const r = $('slSearch').getBoundingClientRect();
    Object.assign(sugEl.style, { left: r.left + 'px', top: r.bottom + 4 + 'px', width: '380px' });
    sugIdx = Math.min(sugIdx, sugItems.length - 1);
    sugEl.innerHTML = `<div class="sl-sh">${ms('list', 's16')}<span class="grow">${n === null ? 'Activities filtered below' : `${n} ${n === 1 ? 'activity matches' : 'activities match'}`}</span><span class="sl-k">Esc to close</span></div>`
      + (sugItems.length ? `<div class="msep"></div><div class="sl-st ovl">Tools</div>` + sugItems.map((c, i) => `<button class="mi ${i === sugIdx ? 'hi' : ''} ${c.on ? 'on' : ''}" data-s="${i}">${ms(c.icon)}<span class="grow">${UI.hl(c.label, q)}</span>${c.on ? ms('check', 'chk') : ''}</button>`).join('') : '');
    sugEl.onmousedown = (e) => e.preventDefault(); // keep focus in the field
    sugEl.onclick = (e) => { const b = e.target.closest('[data-s]'); if (b) runSug(+b.dataset.s); };
  }
  function runSug(i) {
    const c = sugItems[i]; if (!c) return;
    V().search = ''; closeSuggest(); $('rbQ').blur(); searchOpen = false; G.render(); render();
    setTimeout(() => c.run(), 0);
  }
  function closeSuggest() { if (sugEl) { sugEl.remove(); sugEl = null; } sugIdx = -1; }
  function keys(e) {
    if (e.key === 'Escape') { e.stopPropagation(); if (sugEl) return closeSuggest(); $('rbQ').blur(); return; }
    if (!sugEl || !sugItems.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length + 1) % (sugItems.length + 1) - 1; if (sugIdx < -1) sugIdx = sugItems.length - 1; suggest(); }
    if (e.key === 'Enter') { if (sugIdx >= 0) { e.preventDefault(); runSug(sugIdx); } else closeSuggest(); }
  }

  // Filter popover · LIM Figma "Filter" (Duration + Active Today, UDF fields, Reset / Apply)
  function filterPop(anchor) {
    const f = Object.assign({}, V().filters);
    const pop = UI.float(anchor, `<div class="fp">
      <div class="ovl">Duration</div>
      <div class="fp-dur"><label class="fp-date"><input type="date" id="fFrom" value="${f.from}"></label><label class="fp-date"><input type="date" id="fTo" value="${f.to}"></label>
        <button class="rb-switch ${f.activeToday ? 'on' : ''}" id="fActive" role="switch"><i class="sw"><i></i></i><span>Active Today</span></button></div>
      <div class="ovl">UDF_Gliederungsnummer</div><input class="fp-in" id="fU1" placeholder="type..." value="${esc(f.udf1)}">
      <div class="ovl">UDF_Logistik_Kategorie</div><input class="fp-in" id="fU2" placeholder="type..." value="${esc(f.udf2)}">
      <div class="ovl">UDF_Gliederungsebene</div><input class="fp-in" id="fU3" placeholder="type..." value="${esc(f.udf3)}">
      <div class="fp-f"><button class="btn text" id="fReset">Reset</button><button class="btn contained" id="fApply">Apply</button></div>
    </div>`, { cls: 'popover fp-pop' });
    if (!pop) return;
    pop.querySelector('#fActive').onclick = (e) => { f.activeToday = !f.activeToday; e.currentTarget.classList.toggle('on', f.activeToday); };
    pop.querySelector('#fReset').onclick = () => { V().filters = { from: '', to: '', activeToday: false, udf1: '', udf2: '', udf3: '' }; UI.closeFloat(); changed(); };
    pop.querySelector('#fApply').onclick = () => {
      Object.assign(f, { from: pop.querySelector('#fFrom').value, to: pop.querySelector('#fTo').value, udf1: pop.querySelector('#fU1').value.trim(), udf2: pop.querySelector('#fU2').value.trim(), udf3: pop.querySelector('#fU3').value.trim() });
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
