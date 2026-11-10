/* Ribbon v3 · one ribbon for the LIM planning module, two modes (Figma "New Planning" › Ribbon v3 › Ribbon)
   Expanded (64px, default on big screens): icon-with-label tiles divided by lines.
     Left:  Find | Monthly ‹ › Today | Group Sort Column | Level, Expand all | View modes
     Right: File ▾ | Active tasks, Zoom, Compact | Set default | Legends, Refresh, Updated
     When the row gets too narrow: Level ▾ + right side icon-only + search tile, then View ▾,
     then the left side icon-only with Display and Set default in ⋯. Column stays on the row.
   Collapsed (48px, auto below 900px): Search, Filter | Monthly ‹ › Today | Group Sort (Column) Level ▾,
     the right-side tools when they fit, ⋯.
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
  // icon-only (narrow rows): the label hides and a dropdown tile shows ▾ next to its icon
  const tile = (id, icon, label, tip, o = {}) => `<button class="rx-t ${o.dd ? 'rx-ddt' : ''} ${o.on ? 'set' : ''} ${o.cls || ''}" id="${id}" data-tip="${esc(tip)}" ${o.disabled ? 'disabled' : ''}>${ms(icon, 's20')}${o.dd ? ms('arrow_drop_down', 's16 ddc') : ''}<span class="lbt">${esc(label)}${o.dd ? ms('arrow_drop_down', 's16') : ''}</span>${o.badge || ''}</button>`;
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
    [['org', 'Organization'], ['discipline', 'Discipline'], ['site', 'Site'], ['floor', 'Floor']].forEach(([k, l]) => { if (f[k]) out.push([k, `${l}: ${f[k]}`]); });
    return out;
  }

  const mode = () => S.prefs.ribbonMode || (window.innerWidth < AUTO_COLLAPSE ? 'collapsed' : 'expanded');
  const expanded = () => mode() === 'expanded';
  let shownMode = null;

  const searchHtml = (open) => `<div class="rb-search sl-search ${open ? 'open' : ''}" id="slSearch">
        <button class="sl-sicon" id="rbSearchBtn" data-tip="${open ? '' : 'Search within visible columns'}" tabindex="${open ? -1 : 0}">${ms('search', 's20')}<span class="lbt">Search</span></button>
        <input id="rbQ" placeholder="Search within visible columns" value="${esc(V().search)}" autocomplete="off">
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
        <div class="rx-side">
        <div class="rx-g" data-g="find" data-p="12">${searchHtml(open)}
          ${tile('rbFilter', 'filter_list', 'Filter', filterTip(ch), { cls: 'ic3 sl-filter' + (ch.length ? ' on' : ''), badge: badge(ch) })}</div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="time" data-p="11">
          ${tile('ddPeriod', 'date_range', lbl(T.PERIODS, v.period), `Time Period: ${lbl(T.PERIODS, v.period)}`, { dd: 1, cls: 'rx-period' })}
          <div class="rx-stk"><button class="rb-ib" id="rbPrev" data-tip="${stepL ? `Previous ${stepL}` : 'Previous'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button>
            <button class="rb-ib" id="rbNext" data-tip="${stepL ? `Next ${stepL}` : 'Next'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button></div>
          ${tile('rbCal', 'today', 'Today', 'Go to today', { cls: 'ic3' })}</div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="structure" data-p="9">
          ${tile('slGroup', 'workspaces', 'Group', `Group By: ${lbl(GROUP_OPTS, v.groupBy)}`, { dd: 1, cls: 'ic3', on: v.groupBy !== 'none' })}
          ${tile('slSort', 'sort', 'Sort', `Sort By: ${lbl(SORT_OPTS, v.sortBy)}`, { dd: 1, cls: 'ic3', on: v.sortBy !== 'default' })}
          ${tile('slCols', 'view_column', 'Column', `Column: ${colsLabel()}`, { dd: 1, cls: 'ic3' })}</div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="level" data-p="5">
          <div class="rx-lvfull"><div class="rx-lv">${stepper(v, maxL)}<span class="lbt">Level</span></div>
          ${tile('lvAll', all ? 'unfold_less' : 'unfold_more', all ? 'Collapse all' : 'Expand all', all ? 'Collapse all rows' : 'Expand all rows')}</div>
          ${tile('ddLevel', 'format_list_bulleted', 'Level', `Level: ${v.level}`, { dd: 1, cls: 'ic3 rx-lvdd', on: v.level > 0 })}</div>
        <i class="rx-d rx-d-view"></i>
        <div class="rx-g" data-g="view" data-p="4">
          <div class="rx-vm">${check('vDeps', v.showDeps, 'Dependencies')}${check('vProg', v.showProgress, 'Progress %')}
            ${check('vFull', v.fullscreen, 'Full screen')}<div class="rb-radios">${radio('basis', 'time', v.progressBasis === 'time', 'Time', !v.showProgress)}${radio('basis', 'work', v.progressBasis === 'work', 'Work', !v.showProgress)}</div></div>
          ${tile('ddView', 'visibility', 'View', 'View modes', { dd: 1, cls: 'ic3 rx-viewdd' })}</div>
        </div>
        <div class="rx-side rx-sec">
        <div class="rx-g" data-g="file" data-p="3">
          ${tile('ddFiles', 'import_export', 'File', 'Import / Download', { dd: 1, cls: 'ic3' })}</div>
        <i class="rx-d"></i>
        <div class="rx-g rx-tuck" data-g="display" data-p="1">
          ${swTile('rbActive', v.activeToday, 'Active tasks')}
          <div class="rx-zoom"><div class="rb-zc">${iconBtn('rbZoomOut', 'zoom_out', `Zoom out (${v.zoom}%)`, v.zoom <= 50)}<button class="sl-fit" id="rbFit" data-tip="Back to the default view">Fit</button>${iconBtn('rbZoomIn', 'zoom_in', `Zoom in (${v.zoom}%)`, v.zoom >= ZOOM_MAX)}</div><span class="lbt">Zoom ${v.zoom}%</span></div>
          ${swTile('rbDensity', S.prefs.density === 'compact', 'Compact')}</div>
        <i class="rx-d"></i>
        <div class="rx-g rx-tuck" data-g="defaults" data-p="1">
          ${tile('rbSetDefault', 'lock_outline', 'Set default', 'Set as default', { cls: 'ic1' })}</div>
        <i class="rx-d"></i>
        <div class="rx-g" data-g="info" data-p="2">
          ${tile('rbLegend', 'legend_toggle', 'Legends', 'Legends', { cls: 'ic1' })}
          ${tile('rbRefresh', 'sync', 'Refresh', 'Refresh', { cls: 'ic1' })}
          ${tile('rbInfo', 'info', 'Updated', `Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}`, { cls: 'ic1' })}</div>
        </div>
      </div>
      <i class="rx-d rx-d-more hidden"></i>
      <button class="rx-t ic3 hidden" id="slMore" data-tip="More options">${ms('more_horiz', 's20')}<span class="lbt">More</span></button>
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
          <button class="rb-ib" id="rbPrev" data-tip="${stepL ? `Previous ${stepL}` : 'Previous'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button>
          <button class="rb-ib" id="rbNext" data-tip="${stepL ? `Next ${stepL}` : 'Next'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button>
          <button class="rb-text" id="rbCal">Today</button></div>
        <div class="sl-g" data-g="structure" data-p="9"><i class="rb-vd"></i>
          ${ddBtn('slGroup', 'workspaces', null, `Group By: ${lbl(GROUP_OPTS, v.groupBy)}`, v.groupBy !== 'none')}
          ${ddBtn('slSort', 'sort', null, `Sort By: ${lbl(SORT_OPTS, v.sortBy)}`, v.sortBy !== 'default')}
          <span class="sl-g" data-g="column" data-min="1344">${ddBtn('slCols', 'view_column', null, `Column: ${colsLabel()}`)}</span>
          ${ddBtn('ddLevel', 'format_list_bulleted', null, `Level: ${v.level}`, v.level > 0)}
          <span class="sl-g" data-g="view">${ddBtn('ddView', 'visibility', null, 'View modes')}</span></div>
        <div class="sl-g sl-sec" data-g="secondary">
          ${ddBtn('ddFiles', 'import_export', null, 'Import / Download')}<i class="rb-vd"></i>
          ${switchHtml(v.activeToday, 'rbActive', 'Active tasks')}
          <div class="rb-zc">${iconBtn('rbZoomOut', 'zoom_out', `Zoom out (${v.zoom}%)`, v.zoom <= 50)}<button class="sl-fit" id="rbFit" data-tip="Back to the default view">Fit</button>${iconBtn('rbZoomIn', 'zoom_in', `Zoom in (${v.zoom}%)`, v.zoom >= ZOOM_MAX)}</div>
          ${iconBtn('rbFull', 'settings_overscan', v.fullscreen ? 'Exit full screen' : 'Full screen')}
          ${switchHtml(S.prefs.density === 'compact', 'rbDensity', 'Compact')}<i class="rb-vd"></i>
          ${iconBtn('rbSetDefault', 'lock_outline', 'Set as default')}<i class="rb-vd"></i>
          ${iconBtn('rbLegend', 'legend_toggle', 'Legends')}${iconBtn('rbRefresh', 'sync', 'Refresh')}${iconBtn('rbInfo', 'info', `Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}`)}</div>
      </div>
      <button class="rb-ib" id="slMore" data-tip="More options">${ms('more_horiz', 's20')}</button>
      <i class="rb-vd"></i>
      <button class="rb-ib rx-mode" id="rbMode" data-tip="Expand the ribbon" data-tip-pos="left">${ms('expand_more', 's24')}</button>
    </div>`;
  }

  const changed = () => { G.render(); render(); };

  // ---------- fitting ----------
  // groups that are in ⋯ right now (collapsed: everything outside the compact line)
  // Figma "Ribbon" component set: Expanded 1920 → 1600 (s1) → 1366 (s2) → 1100 (s3); Collapsed 1366 / 850
  let hiddenGroups = [];
  const SECONDARY = ['file', 'display', 'defaults', 'info'];
  // s1: Level becomes Level ▾, the right-hand group goes icon-only, search becomes a tile
  // s2: view modes become View ▾
  // s3: left group icon-only (Monthly keeps its label), Display and Set default move into ⋯
  const STEPS = ['s1', 's2', 's3'];
  // a divider shows only between two visible groups
  const tidy = (side) => {
    let seen = false, last = null;
    [...side.children].forEach((c) => {
      if (c.classList.contains('rx-d')) { c.classList.add('hidden'); if (seen && !c.classList.contains('rx-d-gone')) last = c; return; }
      if (!c.classList.contains('hidden')) { if (last) last.classList.remove('hidden'); last = null; seen = true; }
    });
  };
  function fit() {
    const box = $('slItems'); if (!box) return;
    const more = $('slMore');
    const over = () => box.scrollWidth > box.clientWidth + 1;
    if (shownMode === 'collapsed') {
      // ⋯ shows only when something had to move into it
      const sec = box.querySelector('.sl-sec'), col = box.querySelector('[data-g="column"]'), view = box.querySelector('[data-g="view"]');
      [sec, col, view].forEach((g) => g.classList.remove('hidden'));
      hiddenGroups = []; more.classList.add('hidden');
      const hide = (g, names) => { g.classList.add('hidden'); hiddenGroups.push(...names); more.classList.remove('hidden'); };
      if (window.innerWidth < +col.dataset.min) hide(col, ['column']);
      if (over()) hide(sec, SECONDARY);
      if (over()) hide(view, ['view']);
      if (over() && !col.classList.contains('hidden')) hide(col, ['column']);
      return;
    }
    const rx = $('rx');
    STEPS.forEach((s) => rx.classList.remove(s));
    const groups = [...box.querySelectorAll('[data-g]')];
    groups.forEach((g) => g.classList.remove('hidden'));
    box.querySelector('.rx-d-view').classList.remove('rx-d-gone');
    hiddenGroups = []; more.classList.add('hidden');
    const sides = box.querySelectorAll('.rx-side');
    const dMore = rx.querySelector('.rx-d-more');
    const done = () => { sides.forEach(tidy); dMore.classList.toggle('hidden', more.classList.contains('hidden')); };
    done();
    for (const s of STEPS) {
      if (!over()) break;
      rx.classList.add(s);
      if (s === 's3') {
        box.querySelectorAll('.rx-tuck').forEach((g) => { g.classList.add('hidden'); hiddenGroups.push(g.dataset.g); });
        box.querySelector('.rx-d-view').classList.add('rx-d-gone');   // Level ▾ and View ▾ sit together
        more.classList.remove('hidden'); done();
      }
    }
    // still too wide: the lowest-priority groups move into ⋯
    const rest = groups.filter((g) => !g.classList.contains('hidden')).sort((a, b) => a.dataset.p - b.dataset.p);
    for (const g of rest) {
      if (!over()) break;
      g.classList.add('hidden'); hiddenGroups.push(g.dataset.g);
      more.classList.remove('hidden'); done();
    }
  }
  window.addEventListener('resize', () => { if (!el().firstElementChild) return; if (mode() !== shownMode) { UI.closeFloat && UI.closeFloat(); render(); } else fit(); });
  // icon names are wide text until the Material Icons font has loaded, so measure again then
  document.fonts && document.fonts.ready.then(() => { if (el().firstElementChild) fit(); });

  // the chevron switches modes; the choice is remembered
  const toggleMode = () => { S.prefs.ribbonMode = expanded() ? 'collapsed' : 'expanded'; S.savePrefs(); searchOpen = false; render(); G.render(); };

  function bind() {
    const v = V();
    const on = (id, ev, fn) => { const n = $(id); if (n) n[ev] = fn; };
    // search
    const q = $('rbQ'), box = $('slSearch');
    $('rbSearchBtn').onclick = () => { searchOpen = true; box.classList.add('open'); q.focus(); };
    q.onfocus = () => { searchOpen = true; if (!box.classList.contains('open')) { box.classList.add('open'); fit(); } };
    q.oninput = () => { v.search = q.value; G.render(); $('rbClear').classList.toggle('hidden', !q.value); };
    q.onkeydown = (e) => keys(e);
    // the box widens / narrows with a short transition: measure the row again when it ends
    box.addEventListener('transitionend', (e) => { if (e.propertyName !== 'width') return; fit(); });
    q.onblur = () => setTimeout(() => {
      if (document.activeElement === q) return;
      if (!v.search && searchOpen) { searchOpen = false; box.classList.remove('open'); fit(); }
    }, 120);
    $('rbClear').onclick = () => { v.search = ''; searchOpen = false; changed(); };
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
    on('ddLevel', 'onclick', (e) => levelPop(e.currentTarget));
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
    on('rbFull', 'onclick', () => toggleView('fullscreen'));
    on('rbDensity', 'onclick', () => toggleDensity());
    // actions
    on('rbRefresh', 'onclick', (e) => refresh(e.currentTarget.querySelector('.ms')));
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
    const order = ['find', 'time', 'structure', 'column', 'level', 'view', 'file', 'display', 'defaults', 'info'];
    const G_ITEMS = {
      find: [{ label: 'Search', icon: 'search', onClick: () => { searchOpen = true; render(); $('rbQ').focus(); } }, { label: 'Filter', icon: 'filter_list', onClick: () => filterPop(a) }],
      time: [{ label: `Time Period: ${lbl(T.PERIODS, v.period)}`, icon: 'date_range', onClick: () => periodMenu(a) }, { label: 'Today', icon: 'today', onClick: goToday }, { label: stepL ? `Previous ${stepL}` : 'Previous', icon: 'keyboard_arrow_left', disabled: !stepL, onClick: () => go(T.step(v.period, v.anchor, -1)) }, { label: stepL ? `Next ${stepL}` : 'Next', icon: 'keyboard_arrow_right', disabled: !stepL, onClick: () => go(T.step(v.period, v.anchor, 1)) }],
      structure: [{ label: `Group By: ${lbl(GROUP_OPTS, v.groupBy)}`, icon: 'workspaces', onClick: () => groupMenu(a) }, { label: `Sort By: ${lbl(SORT_OPTS, v.sortBy)}`, icon: 'sort', onClick: () => sortMenu(a) }, { label: 'Column', icon: 'view_column', onClick: () => colsMenu(a) }],
      column: [{ label: 'Column', icon: 'view_column', onClick: () => colsMenu(a) }],
      level: [{ label: `Level: ${v.level}`, icon: 'format_list_bulleted', onClick: () => levelPop(a) }, { label: all ? 'Collapse all' : 'Expand all', icon: all ? 'unfold_less' : 'unfold_more', onClick: toggleAll }],
      view: [{ label: 'View modes', icon: 'visibility', onClick: () => viewPop(a) }],
      file: [{ label: 'Import', icon: 'publish', onClick: doImport }, { label: 'Download', icon: 'download', onClick: doDownload }],
      display: [{ label: 'Active tasks', icon: 'event_available', on: v.activeToday, onClick: toggleActive }, { label: `Zoom out (${v.zoom}%)`, icon: 'zoom_out', disabled: v.zoom <= 50, onClick: () => zoom(-10) }, { label: 'Fit', icon: 'fit_screen', onClick: () => { v.zoom = 100; changed(); } }, { label: `Zoom in (${v.zoom}%)`, icon: 'zoom_in', disabled: v.zoom >= ZOOM_MAX, onClick: () => zoom(10) }, { label: 'Compact', icon: 'density_small', on: S.prefs.density === 'compact', onClick: toggleDensity }],
      defaults: [{ label: 'Set as default', icon: 'lock_outline', onClick: setDefault }],
      info: [{ label: 'Legends', icon: 'legend_toggle', onClick: () => legendPop(a) }, { label: 'Refresh', icon: 'sync', onClick: () => refresh() }, { label: `Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}`, icon: 'info', disabled: true }],
    };
    // Column has its own entry when only Column moved here; with the whole structure group it is listed there
    const hidden = hiddenGroups.includes('structure') ? hiddenGroups.filter((g) => g !== 'column') : hiddenGroups;
    const items = [];
    order.filter((g) => hidden.includes(g)).forEach((g, i) => { if (i) items.push({ sep: true }); items.push(...G_ITEMS[g]); });
    // a pop-up chosen here opens in place of the menu, anchored to ⋯
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
