/* Ribbon prototype v2 · two layouts, switched from the Ribbon layout button (like the LIM project recording)
   Single line: one 40px row in the style of the LIM ribbon row 1 —
     Search · Filter | Monthly ▾ | TODAY ‹ › | Sort ▾ Group ▾ Column ▾ Level ▾ View ▾ | Active Tasks | − Fit + |
     Refresh · Info | File ▾ | Set as default · · · ⋯ | Legends | Compact | Ribbon layout ▾ | Hide top bar
     When the row is too narrow, the lowest-priority groups move into ⋯; past three, the labels give way to icons.
   Classic: the two-row LIM ribbon (ribbon.js, loaded first as R_classic) with the Ribbon layout dropdown added;
     its arrow hides the top bar, zoom goes to 200% and Column uses the checkbox menu, as in Single line. */
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
  // dropdown button: label + ▾, or icon + ▾ (label: null). Labelled ones show their icon instead when the row is too narrow
  const ddBtn = (id, icon, label, tip, on, icCls = '') => `<button class="sl-dd ${label ? '' : 'ic'} ${on ? 'set' : ''}" id="${id}" data-tip="${esc(tip)}">${ms(icon, `s20 sl-ic ${icCls}`)}${label ? `<span class="sl-lb">${esc(label)}</span>` : ''}${ms('arrow_drop_down', 's16')}</button>`;
  const LAYOUTS = [
    // Single line = one bar of the Classic icon (view_agenda, top bar only · .sl-one)
    ['single', 'view_agenda', 'Single line', 'sl-one'],
    ['classic', 'view_agenda', 'Classic', ''],
  ];
  // Ribbon layout · icon dropdown showing the current layout's icon
  const curLayout = () => LAYOUTS.find((l) => l[0] === (classic() ? 'classic' : 'single'));
  const layoutDd = () => ddBtn('slLayout', curLayout()[1], null, `Ribbon layout: ${curLayout()[2]}`, false, curLayout()[3]);
  function layoutMenu(a) {
    const m = UI.menu(a, [{ label: 'Ribbon layout', disabled: true }, ...LAYOUTS.map(([k, icon, t]) => ({ label: t, icon, on: curLayout()[0] === k, onClick: () => { if (curLayout()[0] !== k) setLayout(k); } }))], { width: 200, align: 'right' });
    if (!m) return; markHead();
    m.querySelectorAll('.mi:not([disabled])').forEach((b, i) => LAYOUTS[i][3] && b.querySelector('.ms').classList.add(LAYOUTS[i][3]));
  }
  // Material glyphs fill their box differently (zoom and search look small, refresh and info look right):
  // these sizes give every 20px ribbon icon about the same visible size as refresh / info
  const ICON_PX = { search: 23, zoom_in: 23, zoom_out: 23, filter_list: 22, sort: 22, view_column: 22, format_list_bulleted: 22, import_export: 22, view_agenda: 22, lock_outline: 20 };
  const evenIcons = (root, sel = '.ms.s20') => root && root.querySelectorAll(sel).forEach((i) => { const px = ICON_PX[i.textContent.trim()]; if (px) i.style.fontSize = px + 'px'; });
  // menus opened from the ribbon (⋯, Ribbon layout, search tools) get the same icon sizes
  new MutationObserver((ms_) => ms_.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && evenIcons(n, '.mi > .ms:first-child')))).observe(document.getElementById('layer'), { childList: true, subtree: true });
  const ZOOM_MAX = 200;
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

  const classic = () => S.prefs.ribbonLayout === 'classic';
  function render() {
    const v = V(), p = S.prefs, stepL = T.STEP_LABEL[v.period], maxL = S.maxDepth(), ch = chips();
    el().classList.toggle('sl', !classic());
    document.getElementById('app').classList.toggle('topbar-hidden', !!p.topBarHidden);
    if (classic()) { closeSuggest(); return R_classic.render(); }   // the observer below adapts the classic ribbon
    const open = searchOpen || !!v.search;
    el().innerHTML = `
    <div class="sl-bar">
      <div class="rb-search sl-search ${open ? 'open' : ''} ${ch.length ? 'has-chips' : ''}" id="slSearch">
        <button class="sl-sicon" id="rbSearchBtn" data-tip="${open ? '' : 'Search activities and tools'}" tabindex="${open ? -1 : 0}">${ms('search', 's20')}</button>
        <input id="rbQ" placeholder="Search activities and tools" value="${esc(v.search)}" autocomplete="off">
        <button class="rb-clear ${v.search ? '' : 'hidden'}" id="rbClear" data-tip="Clear search">${ms('close', 's16')}</button>
      </div>
      <button class="rb-ib sl-filter ${ch.length ? 'on' : ''}" id="rbFilter" data-tip="${ch.length ? esc('Filter: ' + ch.map((c) => c[1]).join(', ')) : 'Filter'}">${ms('filter_list', 's20')}${ch.length ? `<i class="sl-badge">${ch.length}</i>` : ''}</button>
      <div class="sl-items" id="slItems">
        <div class="sl-g" data-g="period" data-p="11"><i class="rb-vd"></i>
          ${ddBtn('ddPeriod', 'date_range', lbl(T.PERIODS, v.period), `Time Period: ${lbl(T.PERIODS, v.period)}`)}</div>
        <div class="sl-g" data-g="nav" data-p="10">
          <button class="rb-text" id="rbCal">Today</button>
          <button class="rb-ib" id="rbPrev" data-tip="${stepL ? `Previous ${stepL}` : 'Previous'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button>
          <button class="rb-ib" id="rbNext" data-tip="${stepL ? `Next ${stepL}` : 'Next'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button></div>
        <div class="sl-g" data-g="data" data-p="9"><i class="rb-vd"></i>
          ${ddBtn('slSort', 'sort', null, `Sort By: ${lbl(SORT_OPTS, v.sortBy)}`, v.sortBy !== 'default')}
          ${ddBtn('slGroup', 'workspaces', 'Group', `Group By: ${lbl(GROUP_OPTS, v.groupBy)}`, v.groupBy !== 'none')}
          ${ddBtn('slCols', 'view_column', 'Column', `Column: ${colsLabel()}`)}
          ${ddBtn('ddLevel', 'format_list_bulleted', null, `Level: ${v.level}`, v.level > 0)}</div>
        <div class="sl-g" data-g="view" data-p="8">${ddBtn('ddView', 'visibility', null, 'View modes')}</div>
        <div class="sl-g" data-g="active" data-p="7"><i class="rb-vd"></i>${switchHtml(v.activeToday, 'rbActive', 'Active Tasks')}</div>
        <div class="sl-g" data-g="zoom" data-p="6"><i class="rb-vd"></i>
          <div class="rb-zc">${iconBtn('rbZoomOut', 'zoom_out', `Zoom out (${v.zoom}%)`, v.zoom <= 50)}<button class="sl-fit" id="rbFit" data-tip="Back to the default view">Fit</button>${iconBtn('rbZoomIn', 'zoom_in', `Zoom in (${v.zoom}%)`, v.zoom >= ZOOM_MAX)}</div></div>
        <div class="sl-g" data-g="refresh" data-p="3"><i class="rb-vd"></i>${iconBtn('rbRefresh', 'sync', 'Refresh')}<button class="rb-ib" id="rbInfo" data-tip="Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}">${ms('info', 's20')}</button></div>
        <div class="sl-g" data-g="files" data-p="4"><i class="rb-vd"></i>${ddBtn('ddFiles', 'import_export', 'File', 'Import / Download')}</div>
        <div class="sl-g" data-g="setdef" data-p="1">${iconBtn('rbSetDefault', 'lock_outline', 'Set as default')}</div>
      </div>
      <button class="rb-ib hidden" id="slMore" data-tip="More options">${ms('more_horiz', 's20')}</button>
      <i class="rb-vd"></i>
      <button class="rb-text" id="rbLegend">Legends</button>
      <i class="rb-vd"></i>
      ${switchHtml(p.density === 'compact', 'rbDensity', 'Compact')}
      <i class="rb-vd"></i>
      ${layoutDd()}
      <button class="rb-ib" id="slMax" data-tip="${p.topBarHidden ? 'Show top bar' : 'Hide top bar'}" data-tip-pos="left">${ms(p.topBarHidden ? 'expand_more' : 'expand_less', 's24')}</button>
    </div>`;
    bind();
    evenIcons(el());
    fit();
  }

  const changed = () => { G.render(); render(); };

  // ---------- overflow: hide the lowest-priority groups until the row fits, list them under ⋯ ----------
  let hiddenGroups = [];
  function fit() {
    const box = $('slItems'); if (!box) return;
    const groups = [...box.querySelectorAll('.sl-g')].sort((a, b) => a.dataset.p - b.dataset.p);
    const bar = box.parentElement;
    const attempt = (icons) => {
      bar.classList.toggle('icons', icons);
      groups.forEach((g) => g.classList.remove('hidden'));
      hiddenGroups = [];
      $('slMore').classList.add('hidden');
      for (const g of groups) {
        if (box.scrollWidth <= box.clientWidth + 1) break;
        g.classList.add('hidden'); hiddenGroups.push(g.dataset.g);
        $('slMore').classList.remove('hidden');   // ⋯ takes room too, so it shows before the next measurement
      }
    };
    // keep the labels while only a few low-priority groups have to move into ⋯; otherwise show icons instead
    attempt(false);
    if (hiddenGroups.length > 3) attempt(true);
    $('slMore').classList.toggle('hidden', !hiddenGroups.length);
  }
  window.addEventListener('resize', () => { if (!classic() && el().firstElementChild) fit(); });
  // icon names are wide text until the Material Icons font has loaded, so measure again then
  document.fonts && document.fonts.ready.then(() => { if (!classic() && el().firstElementChild) fit(); });

  // Classic layout: ribbon.js re-renders itself on every change, so adapt it each time —
  // add the Ribbon layout dropdown, make the arrow hide the top bar, allow zoom to 200%, use the checkbox Column menu
  new MutationObserver(() => {
    if (!classic() || $('slLayout')) return;
    const c = $('rbCollapse'); if (!c) return;
    const v = V(), hid = !!S.prefs.topBarHidden;
    c.insertAdjacentHTML('beforebegin', layoutDd() + '<i class="rb-vd"></i>');
    $('slLayout').onclick = (e) => layoutMenu(e.currentTarget);
    c.innerHTML = ms(hid ? 'expand_more' : 'expand_less', 's24'); c.dataset.tip = hid ? 'Show top bar' : 'Hide top bar'; c.dataset.tipPos = 'left';
    c.onclick = () => toggleTopBar();
    el().querySelector('.rb-row2')?.classList.remove('hidden');
    $('rbZoomIn').disabled = v.zoom >= ZOOM_MAX; $('rbZoomIn').onclick = () => zoom(10);
    $('rbZoomOut').onclick = () => zoom(-10);
    const cols = el().querySelector('[data-dd="ddCols"]'); if (cols) cols.onclick = () => colsMenu(cols);
    evenIcons(el().querySelector('.rb-row1'));
  }).observe(document.getElementById('ribbon'), { childList: true });

  function setLayout(k) { S.prefs.ribbonLayout = k; S.savePrefs(); searchOpen = false; render(); G.render(); }


  function bind() {
    const v = V();
    // search
    const q = $('rbQ'), box = $('slSearch');
    $('rbSearchBtn').onclick = () => { searchOpen = true; box.classList.add('open'); q.focus(); };
    q.onfocus = () => { searchOpen = true; if (!box.classList.contains('open')) { box.classList.add('open'); fit(); } suggest(); };
    q.oninput = () => { v.search = q.value; G.render(); $('rbClear').classList.toggle('hidden', !q.value && !chips().length); suggest(); };
    q.onkeydown = (e) => keys(e);
    // the box widens / narrows with a short transition: measure the row again when it ends
    box.addEventListener('transitionend', (e) => { if (e.propertyName !== 'width') return; fit(); if (sugEl) suggest(); });
    q.onblur = () => setTimeout(() => {
      if (document.activeElement === q) return;
      closeSuggest();
      if (!v.search && searchOpen) { searchOpen = false; box.classList.remove('open'); fit(); }
    }, 120);
    $('rbClear').onclick = () => { v.search = ''; searchOpen = false; closeSuggest(); changed(); };
    $('rbFilter').onclick = (e) => filterPop(e.currentTarget);
    // timeline navigation
    $('rbPrev').onclick = () => go(T.step(v.period, v.anchor, -1));
    $('rbNext').onclick = () => go(T.step(v.period, v.anchor, 1));
    $('rbCal').onclick = () => goToday();
    $('ddPeriod').onclick = (e) => periodMenu(e.currentTarget);
    $('slSort').onclick = (e) => sortMenu(e.currentTarget);
    $('slGroup').onclick = (e) => groupMenu(e.currentTarget);
    $('slCols').onclick = (e) => colsMenu(e.currentTarget);
    $('ddLevel').onclick = (e) => levelPop(e.currentTarget);
    $('ddView').onclick = (e) => viewPop(e.currentTarget);
    $('rbActive').onclick = () => toggleActive();
    $('rbZoomOut').onclick = () => zoom(-10);
    $('rbZoomIn').onclick = () => zoom(10);
    $('rbFit').onclick = () => { v.zoom = 100; changed(); };
    $('rbLegend').onclick = (e) => legendPop(e.currentTarget);
    $('rbDensity').onclick = () => toggleDensity();
    $('rbRefresh').onclick = (e) => refresh(e.currentTarget.querySelector('.ms'));
    $('ddFiles').onclick = (e) => UI.menu(e.currentTarget, [{ label: 'Import', icon: 'publish', onClick: doImport }, { label: 'Download', icon: 'download', onClick: doDownload }], { width: 180 });
    $('rbSetDefault').onclick = () => setDefault();
    $('slMore').onclick = (e) => moreMenu(e.currentTarget);
    $('slMax').onclick = () => toggleTopBar();
    $('slLayout').onclick = (e) => layoutMenu(e.currentTarget);
  }

  // ---------- actions (shared by the ribbon, ⋯ and search) ----------
  const go = (to) => { const v = V(); if (to === v.anchor) return; G.slideFrom(v.anchor); v.anchor = to; changed(); };
  const goToday = () => { const v = V(); if (v.period === 'project') G.scrollToToday(); else go(T.align(v.period, LIM_DATA.TODAY)); };
  const setPeriod = (k) => { const v = V(), sc = G.scale(); const keep = sc && LIM_DATA.TODAY >= sc.start && LIM_DATA.TODAY < sc.end ? LIM_DATA.TODAY : v.anchor; v.period = k; v.anchor = T.align(k, keep); v.zoom = 100; changed(); };
  const zoom = (d) => { const v = V(); v.zoom = Math.max(50, Math.min(ZOOM_MAX, v.zoom + d)); changed(); };
  const toggleActive = () => { V().activeToday = !V().activeToday; changed(); };
  const toggleDensity = () => { S.prefs.density = S.prefs.density === 'compact' ? 'comfortable' : 'compact'; S.savePrefs(); changed(); };
  const toggleTopBar = () => { S.prefs.topBarHidden = !S.prefs.topBarHidden; S.savePrefs(); render(); G.render(); };
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
        <div class="sl-vcol">${check('vDeps', v.showDeps, 'Show dependencies')}${check('vFull', v.fullscreen, 'Show fullscreen')}</div>
        <i class="sl-hdiv"></i>
        <div class="sl-vcol">${check('vProg', v.showProgress, 'Show progress percentage')}
          <div class="rb-radios">${radio('basis', 'time', v.progressBasis === 'time', 'Time based', !v.showProgress)}${radio('basis', 'work', v.progressBasis === 'work', 'Work based', !v.showProgress)}</div></div>`;
      const t = (k) => () => { toggleView(k); draw(); };
      pop.querySelector('#vDeps').onclick = t('showDeps');
      pop.querySelector('#vFull').onclick = t('fullscreen');
      pop.querySelector('#vProg').onclick = t('showProgress');
      pop.querySelectorAll('[data-radio]').forEach((b) => b.onclick = () => { V().progressBasis = b.dataset.val; G.render(); draw(); });
    };
    draw();
  }

  // ⋯ lists the controls of the groups that didn't fit, in ribbon order
  function moreMenu(a) {
    const v = V(), p = S.prefs, stepL = T.STEP_LABEL[v.period];
    const order = ['period', 'nav', 'data', 'view', 'active', 'zoom', 'refresh', 'files', 'setdef'];
    const G_ITEMS = {
      period: [{ label: `Time Period: ${lbl(T.PERIODS, v.period)}`, icon: 'date_range', onClick: () => periodMenu(a) }],
      nav: [{ label: 'Today', icon: 'today', onClick: goToday }, { label: stepL ? `Previous ${stepL}` : 'Previous', icon: 'keyboard_arrow_left', disabled: !stepL, onClick: () => go(T.step(v.period, v.anchor, -1)) }, { label: stepL ? `Next ${stepL}` : 'Next', icon: 'keyboard_arrow_right', disabled: !stepL, onClick: () => go(T.step(v.period, v.anchor, 1)) }],
      data: [{ label: `Sort By: ${lbl(SORT_OPTS, v.sortBy)}`, icon: 'sort', onClick: () => sortMenu(a) }, { label: `Group By: ${lbl(GROUP_OPTS, v.groupBy)}`, icon: 'workspaces', onClick: () => groupMenu(a) }, { label: 'Column', icon: 'view_column', onClick: () => colsMenu(a) }, { label: `Level: ${v.level}`, icon: 'format_list_bulleted', onClick: () => levelPop(a) }],
      view: [{ label: 'View modes', icon: 'visibility', onClick: () => viewPop(a) }],
      active: [{ label: 'Active Tasks', icon: 'event_available', on: v.activeToday, onClick: toggleActive }],
      zoom: [{ label: `Zoom out (${v.zoom}%)`, icon: 'zoom_out', disabled: v.zoom <= 50, onClick: () => zoom(-10) }, { label: 'Fit', icon: 'fit_screen', onClick: () => { v.zoom = 100; changed(); } }, { label: `Zoom in (${v.zoom}%)`, icon: 'zoom_in', disabled: v.zoom >= ZOOM_MAX, onClick: () => zoom(10) }],
      refresh: [{ label: 'Refresh', icon: 'sync', onClick: () => refresh() }, { label: `Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}`, icon: 'info', disabled: true }],
      files: [{ label: 'Import', icon: 'publish', onClick: doImport }, { label: 'Download', icon: 'download', onClick: doDownload }],
      setdef: [{ label: 'Set as default', icon: 'lock_outline', onClick: setDefault }],
    };
    const items = [];
    order.filter((g) => hiddenGroups.includes(g)).forEach((g, i) => { if (i) items.push({ sep: true }); items.push(...G_ITEMS[g]); });
    // a pop-up chosen here opens in place of the menu, anchored to ⋯
    UI.menu(a, items, { width: 240, align: 'right' });
  }

  // ---------- search: activities are filtered as you type; matching tools are listed under the field ----------
  const COMMANDS = () => {
    const v = V();
    return [
      ...T.PERIODS.map(([k, l]) => ({ label: `Time Period: ${l}`, k: 'time period view', icon: 'date_range', on: v.period === k, run: () => setPeriod(k) })),
      { label: 'Today', k: 'go to today date now', icon: 'today', run: goToday },
      { label: 'Previous period', k: 'back previous earlier', icon: 'keyboard_arrow_left', run: () => go(T.step(v.period, v.anchor, -1)) },
      { label: 'Next period', k: 'forward next later', icon: 'keyboard_arrow_right', run: () => go(T.step(v.period, v.anchor, 1)) },
      { label: 'Sort By…', k: 'sort order start end date', icon: 'sort', run: () => sortMenu($('slSort')) },
      { label: 'Group By…', k: 'group discipline zone organization phase site floor', icon: 'workspaces', run: () => groupMenu($('slGroup')) },
      { label: 'Column…', k: 'columns show hide organization floor site', icon: 'view_column', run: () => colsMenu($('slCols')) },
      { label: 'Level…', k: 'level depth tree', icon: 'format_list_bulleted', run: () => levelPop($('ddLevel')) },
      { label: v.level >= S.maxDepth() ? 'Collapse all' : 'Expand all', k: 'expand collapse all rows tree', icon: v.level >= S.maxDepth() ? 'unfold_less' : 'unfold_more', run: () => { if (v.level >= S.maxDepth()) G.collapseAll(); else G.expandAll(); changed(); } },
      { label: 'Show dependencies', k: 'view mode links arrows', icon: 'account_tree', on: v.showDeps, run: () => toggleView('showDeps') },
      { label: 'Show fullscreen', k: 'view mode full screen', icon: 'fullscreen', on: v.fullscreen, run: () => toggleView('fullscreen') },
      { label: 'Show progress percentage', k: 'view mode percent', icon: 'percent', on: v.showProgress, run: () => toggleView('showProgress') },
      { label: 'Active Tasks', k: 'active today filter', icon: 'event_available', on: v.activeToday, run: toggleActive },
      { label: 'Zoom in', k: 'zoom bigger', icon: 'zoom_in', run: () => zoom(10) },
      { label: 'Zoom out', k: 'zoom smaller', icon: 'zoom_out', run: () => zoom(-10) },
      { label: 'Fit', k: 'zoom fit reset default view screen', icon: 'fit_screen', run: () => { v.zoom = 100; changed(); } },
      { label: 'Filter…', k: 'filter duration udf', icon: 'filter_list', run: () => filterPop($('rbFilter')) },
      { label: 'Legends', k: 'legend colours colors', icon: 'label', run: () => legendPop($('rbLegend')?.offsetParent ? $('rbLegend') : $('slMore')) },
      { label: 'Compact', k: 'density rows compact comfortable', icon: 'density_small', on: S.prefs.density === 'compact', run: toggleDensity },
      { label: 'Refresh', k: 'reload sync update', icon: 'sync', run: () => refresh() },
      { label: 'Import', k: 'upload file import', icon: 'publish', run: doImport },
      { label: 'Download', k: 'export csv download', icon: 'download', run: doDownload },
      { label: 'Set as default', k: 'save default settings', icon: 'lock_outline', run: setDefault },
      ...LAYOUTS.map(([k, icon, t]) => ({ label: `Ribbon layout: ${t}`, k: 'ribbon layout classic single line toolbar', icon, on: (classic() ? 'classic' : 'single') === k, run: () => setLayout(k) })),
      { label: S.prefs.topBarHidden ? 'Show top bar' : 'Hide top bar', k: 'maximize top bar header space', icon: S.prefs.topBarHidden ? 'expand_more' : 'expand_less', run: toggleTopBar },
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
