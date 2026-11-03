/* Ribbon (replaces the Settings drawer) · LIM Figma "Planning Ribbon" (New Planning page)
   Row 1 · quick controls: search + filter, TODAY + ‹ ›, Active Tasks, zoom, fit, refresh, info, Legends, Compact, collapse
   Row 2 · Time Period · Sort By · Group By · Column · Level (Expand all) | View modes | Import / Download | Set as default */
window.R = (function () {
  const { esc, ms, fmt } = UI;
  const V = () => S.view;
  const el = () => document.getElementById('ribbon');
  const GROUP_OPTS = [['discipline', 'Discipline'], ['zone', 'Zone'], ['org', 'Organization'], ['phase', 'Phase'], ['site', 'Site'], ['floor', 'Floor'], ['none', 'None']];
  const SORT_OPTS = [['default', 'Default'], ['start', 'Start Date'], ['end', 'End Date']];
  const COL_OPTS = [['org', 'Organization'], ['discipline', 'Discipline'], ['floors', 'Floor'], ['site', 'Site'], ['volumeActual', 'Volume Actual'], ['start', 'Start Date'], ['end', 'End Date']];
  const lbl = (opts, k) => (opts.find((o) => o[0] === k) || ['', ''])[1];
  const switchHtml = (on, id, label) => `<button class="rb-switch ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}"><i class="sw"><i></i></i><span>${label}</span></button>`;
  const iconBtn = (id, icon, tip, disabled) => `<button class="rb-ib" id="${id}" data-tip="${tip}" ${disabled ? 'disabled' : ''}>${ms(icon, 's20')}</button>`;
  const dropdown = (id, label, value) => `<div class="rb-dd" id="${id}"><div class="rb-lr"><span class="ovl">${label}</span></div><button class="rb-field" data-dd="${id}"><span class="ell">${esc(value)}</span>${ms('keyboard_arrow_down', 's20')}</button></div>`;
  const check = (id, on, label) => `<button class="rb-check ${on ? 'on' : ''}" id="${id}" role="checkbox" aria-checked="${on}"><i class="cb">${on ? ms('check', 's16') : ''}</i><span>${label}</span></button>`;
  const radio = (name, val, on, label, disabled) => `<button class="rb-radio ${on ? 'on' : ''}" data-radio="${name}" data-val="${val}" ${disabled ? 'disabled' : ''}><i class="rd"></i><span>${label}</span></button>`;

  function chips() {
    const f = V().filters, out = [];
    if (f.from || f.to) out.push(['dur', `${f.from ? fmt(f.from) : '…'} – ${f.to ? fmt(f.to) : '…'}`]);
    if (f.activeToday) out.push(['activeToday', 'Active Today']);
    ['udf1', 'udf2', 'udf3'].forEach((k) => { if (f[k]) out.push([k, f[k]]); });
    return out;
  }

  function render() {
    const v = V(), p = S.prefs, stepL = T.STEP_LABEL[v.period];
    const cols = v.columns.length ? v.columns.map((c) => lbl(COL_OPTS, c)).join(', ') : 'None';
    const ch = chips();
    const maxL = S.maxDepth();
    el().innerHTML = `
    <div class="rb-row1">
      <div class="rb-search ${ch.length ? 'has-chips' : ''}">
        ${ms('search', 's20')}
        ${ch.length ? `<span class="rb-chips">${ch.map(([k, t]) => `<span class="rb-chip" data-tip="${esc(t)}"><span class="ell">${esc(t)}</span><button data-unchip="${k}" data-tip="Remove filter">${ms('cancel', 's16')}</button></span>`).join('')}</span>` : ''}
        <input id="rbQ" placeholder="${ch.length ? '' : 'Search within visible columns'}" value="${esc(v.search)}" autocomplete="off">
        ${v.search || ch.length ? `<button class="rb-clear" id="rbClear" data-tip="Clear search and filters">${ms('close', 's16')}</button>` : ''}
        <button class="rb-filter ${ch.length ? 'on' : ''}" id="rbFilter" data-tip="Filter">${ms('filter_list', 's20')}</button>
      </div>
      <div class="rb-quick">
        <div class="rb-nav">
          <button class="rb-text" id="rbCal">Today</button>
          <div class="rb-navc">
            <button class="rb-ib" id="rbPrev" data-tip="${stepL ? `Previous ${stepL}` : 'Previous'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button>
            <button class="rb-ib" id="rbNext" data-tip="${stepL ? `Next ${stepL}` : 'Next'}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button>
          </div>
        </div>
        <i class="rb-vd"></i>
        ${switchHtml(v.activeToday, 'rbActive', 'Active Tasks')}
        <i class="rb-vd"></i>
        <div class="rb-zoom"><div class="rb-zc">${iconBtn('rbZoomOut', 'zoom_out', 'Zoom out', v.zoom <= 50)}<span class="rb-zv">${v.zoom}%</span>${iconBtn('rbZoomIn', 'zoom_in', 'Zoom in', v.zoom >= 100)}</div>${iconBtn('rbFit', 'fit_screen', 'Fit to screen')}</div>
        <i class="rb-vd"></i>
        <div class="rb-ri">${iconBtn('rbRefresh', 'sync', 'Refresh')}<button class="rb-ib" id="rbInfo" data-tip="Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}">${ms('info', 's20')}</button></div>
        <i class="rb-vd"></i>
        <button class="rb-text" id="rbLegend">Legends</button>
        <i class="rb-vd"></i>
        ${switchHtml(p.density === 'compact', 'rbDensity', 'Compact')}
        <i class="rb-vd"></i>
        <button class="rb-ib" id="rbCollapse" data-tip="${p.ribbonCollapsed ? 'Show settings' : 'Hide settings'}">${ms(p.ribbonCollapsed ? 'expand_more' : 'expand_less', 's24')}</button>
      </div>
    </div>
    <div class="rb-row2 ${p.ribbonCollapsed ? 'hidden' : ''}">
      <div class="rb-g1">
        ${dropdown('ddPeriod', 'Time Period', lbl(T.PERIODS, v.period))}
        ${dropdown('ddSort', 'Sort By', lbl(SORT_OPTS, v.sortBy))}
        ${dropdown('ddGroup', 'Group By', lbl(GROUP_OPTS, v.groupBy))}
        ${dropdown('ddCols', 'Column', cols)}
        <div class="rb-group" id="gLevel">
          <div class="rb-lr"><span class="ovl">Level</span><button class="rb-lbtn" id="lvAll">${v.level >= maxL ? 'Collapse all' : 'Expand all'}</button></div>
          <div class="rb-stepper"><button id="lvMinus" data-tip="Level down" ${v.level <= 0 ? 'disabled' : ''}>${ms('remove', 's20')}</button><span>${v.level}</span><button id="lvPlus" data-tip="Level up" ${v.level >= maxL ? 'disabled' : ''}>${ms('add', 's20')}</button></div>
        </div>
      </div>
      <i class="rb-gd first"></i>
      <div class="rb-group" id="gView">
        <div class="rb-lr"><span class="ovl">View modes</span></div>
        <div class="rb-views">
          <div class="col c1">${check('vDeps', v.showDeps, 'Show dependencies')}${check('vFull', v.fullscreen, 'Show fullscreen')}</div>
          <i class="rb-vdiv"></i>
          <div class="col c2">${check('vProg', v.showProgress, 'Show progress percentage')}
            <div class="rb-radios">${radio('basis', 'time', v.progressBasis === 'time', 'Time based', !v.showProgress)}${radio('basis', 'work', v.progressBasis === 'work', 'Work based', !v.showProgress)}</div></div>
        </div>
      </div>
      <i class="rb-gd"></i>
      <div class="rb-acts">
        <button class="rb-act" id="acImport" data-tip="Import" data-tip-pos="left">${ms('publish', 's16')}</button>
        <button class="rb-act" id="acDownload" data-tip="Download" data-tip-pos="left">${ms('download', 's16')}</button>
      </div>
      <i class="rb-gd"></i>
      <button class="rb-setdef" id="rbSetDefault">${ms('done_all', 's16')}<span>Set as default</span></button>
    </div>`;
    bind();
  }

  const changed = () => { G.render(); render(); };

  function bind() {
    const v = V(), $ = (id) => document.getElementById(id);
    // search (live: filters rows on the visible columns as you type)
    const q = $('rbQ');
    q.oninput = () => { v.search = q.value; G.render(); const c = $('rbClear'); if (!!q.value !== !!c && !chips().length) { const pos = q.selectionStart; render(); const nq = $('rbQ'); nq.focus(); nq.setSelectionRange(pos, pos); } };
    $('rbClear') && ($('rbClear').onclick = () => { v.search = ''; v.filters = { from: '', to: '', activeToday: false, udf1: '', udf2: '', udf3: '' }; changed(); });
    el().querySelectorAll('[data-unchip]').forEach((b) => b.onclick = () => {
      const k = b.dataset.unchip; if (k === 'dur') { v.filters.from = ''; v.filters.to = ''; } else if (k === 'activeToday') v.filters.activeToday = false; else v.filters[k] = ''; changed();
    });
    $('rbFilter').onclick = (e) => filterPop(e.currentTarget);
    // timeline navigation: ‹ › slide the window one step, TODAY jumps back to the period that contains today
    const go = (to) => { if (to === v.anchor) return; G.slideFrom(v.anchor); v.anchor = to; changed(); };
    $('rbPrev').onclick = () => go(T.step(v.period, v.anchor, -1));
    $('rbNext').onclick = () => go(T.step(v.period, v.anchor, 1));
    $('rbCal').onclick = () => { if (v.period === 'project') G.scrollToToday(); else go(T.align(v.period, LIM_DATA.TODAY)); };
    $('rbActive').onclick = () => { v.activeToday = !v.activeToday; changed(); };
    $('rbZoomOut').onclick = () => { v.zoom = Math.max(50, v.zoom - 10); changed(); };
    $('rbZoomIn').onclick = () => { v.zoom = Math.min(100, v.zoom + 10); changed(); };
    $('rbFit').onclick = () => { v.zoom = 100; changed(); };
    $('rbRefresh').onclick = (e) => { const i = e.currentTarget.querySelector('.ms'); i.classList.add('spin'); setTimeout(() => { i.classList.remove('spin'); G.render(); UI.toast('Planning data refreshed'); }, 700); };
    $('rbLegend').onclick = (e) => legendPop(e.currentTarget);
    $('rbDensity').onclick = () => { S.prefs.density = S.prefs.density === 'compact' ? 'comfortable' : 'compact'; S.savePrefs(); changed(); };
    $('rbCollapse').onclick = () => { S.prefs.ribbonCollapsed = !S.prefs.ribbonCollapsed; S.savePrefs(); render(); G.render(); };
    // row 2
    el().querySelectorAll('[data-dd]').forEach((b) => b.onclick = () => openDropdown(b.dataset.dd, b));
    // one "Set as default" for the row 2 settings (Time Period, Group By, Sort By, Column, Level)
    $('rbSetDefault').onclick = () => {
      Object.assign(S.prefs.defaults, { period: v.period, groupBy: v.groupBy, sortBy: v.sortBy, columns: v.columns.slice(), level: v.level }); S.prefs.customDefaults = true;
      S.savePrefs(); UI.toast('Current settings saved as default');
    };
    $('lvMinus').onclick = () => { G.applyLevel(Math.max(0, v.level - 1)); changed(); };
    $('lvAll').onclick = () => { if (v.level >= S.maxDepth()) G.collapseAll(); else G.expandAll(); changed(); };
    $('lvPlus').onclick = () => { G.applyLevel(Math.min(S.maxDepth(), v.level + 1)); changed(); };
    $('vDeps').onclick = () => { v.showDeps = !v.showDeps; changed(); };
    $('vProg').onclick = () => { v.showProgress = !v.showProgress; changed(); };
    $('vFull').onclick = () => { v.fullscreen = !v.fullscreen; document.getElementById('app').classList.toggle('fullscreen', v.fullscreen); changed(); };
    el().querySelectorAll('[data-radio]').forEach((b) => b.onclick = () => { v.progressBasis = b.dataset.val; changed(); });
    $('acDownload').onclick = () => {
      const blob = new Blob(['﻿' + G.toCSV()], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Amazon_planning.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      UI.toast('Planning downloaded as CSV');
    };
    $('acImport').onclick = () => { const f = document.getElementById('importFile'); f.value = ''; f.onchange = () => { if (f.files[0]) UI.toast(`"${esc(f.files[0].name)}" selected. Importing is not part of this demo.`); }; f.click(); };
  }

  function openDropdown(id, anchor) {
    const v = V();
    const w = anchor.getBoundingClientRect().width;
    if (id === 'ddPeriod') UI.menu(anchor, T.PERIODS.map(([k, l]) => ({ label: l, on: v.period === k, onClick: () => { const sc = G.scale(); const keep = sc && LIM_DATA.TODAY >= sc.start && LIM_DATA.TODAY < sc.end ? LIM_DATA.TODAY : v.anchor; v.period = k; v.anchor = T.align(k, keep); v.zoom = 100; changed(); } })), { width: Math.max(w, 180) });
    if (id === 'ddGroup') UI.menu(anchor, GROUP_OPTS.map(([k, l]) => ({ label: l, on: v.groupBy === k, onClick: () => { v.groupBy = k; v.collapsedGroups = new Set(); changed(); } })), { width: Math.max(w, 180) });
    if (id === 'ddSort') UI.menu(anchor, SORT_OPTS.map(([k, l]) => ({ label: l, on: v.sortBy === k, onClick: () => { v.sortBy = k; changed(); } })), { width: Math.max(w, 180) });
    if (id === 'ddCols') {
      // multi-select: stays open, each click toggles a column (live app behaviour)
      const items = () => [...COL_OPTS.map(([k, l]) => ({ label: l, on: v.columns.includes(k), keepOpen: true, onClick: (b) => {
        v.columns = v.columns.includes(k) ? v.columns.filter((c) => c !== k) : COL_OPTS.map((o) => o[0]).filter((c) => c === k || v.columns.includes(c));
        G.render(); refreshCols(b.closest('.menu'));
      } })), { label: 'None', on: !v.columns.length, keepOpen: true, onClick: (b) => { v.columns = []; G.render(); refreshCols(b.closest('.menu')); } }];
      const m = UI.menu(anchor, items(), { width: Math.max(w, 200), onClose: () => render() });
      const refreshCols = (menuEl) => {
        menuEl.querySelectorAll('.mi').forEach((b, i) => { const on = i < COL_OPTS.length ? v.columns.includes(COL_OPTS[i][0]) : !v.columns.length; b.classList.toggle('on', on); const c = b.querySelector('.chk'); if (on && !c) b.insertAdjacentHTML('beforeend', ms('check', 'chk')); if (!on && c) c.remove(); });
        anchor.querySelector('span').textContent = v.columns.length ? v.columns.map((c) => lbl(COL_OPTS, c)).join(', ') : 'None';
      };
      return m;
    }
  }

  // Filter popover · LIM Figma "Filter" (Duration + Active Today, UDF fields, Reset / Apply)
  function filterPop(anchor) {
    const f = Object.assign({}, V().filters);
    const box = anchor.closest('.rb-search');
    const pop = UI.float(box, `<div class="fp">
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

  // Legends popover (moved from the bottom of the Settings drawer)
  function legendPop(anchor) {
    UI.float(anchor, `<div class="lg"><div class="ovl">Legends</div>
      ${[['#F5BF5E', 'Critical Date'], ['#06A77D', 'Logistics Volume - Normal'], ['#D82034', 'Logistics Volume - Critical']].map(([c, t]) => `<div class="lg-i"><i style="background:${c}"></i>${t}</div>`).join('')}</div>`, { cls: 'popover lg-pop', align: 'right' });
  }

  return { render };
})();
