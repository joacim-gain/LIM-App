/* Ribbon v4 · LIM planning module
   Two ribbons, switched by the Compact toggle (remembered):
     Detailed (default) · 64px row, icon tiles with labels, Time / Sort / Group as picks on wide screens
     Single line        · 48px row, 32px icons with ▾ (Figma "Ribbon · Mode=Collapsed")
   Gantt rows are always the compact 36px rows.
   Search: a field with the filter button inside when there is room; otherwise only the search icon, which opens the same
   field as a pop-up over the ribbon (like Google Docs find). Applied filters show as chips inside the field.
   Shrinking, right to left, the same in both ribbons:
     1 · Others ▾ takes Updated, Refresh, Legends, then Set default
     2 · View ▾ takes Level first, then Display ▾ forms (Active tasks, Zoom, Compact) and later moves into View ▾
     Fit timeline (selected activity, start to end) stays beside Zoom until the very end, then moves into View ▾
     then labels give way to icons (Detailed) and the last sections move into Others. */
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
  const LEGENDS = [['#F5BF5E', 'Critical Date'], ['#06A77D', 'Logistics Volume - Normal'], ['#D82034', 'Logistics Volume - Critical']];
  const lbl = (opts, k) => (opts.find((o) => o[0] === k) || ['', ''])[1];
  const colsLabel = () => (V().columns.length ? V().columns.map((c) => lbl(COL_OPTS, c)).join(', ') : 'None');
  const tp = (title, text) => esc(`<b>${esc(title)}</b>${text ? `<br>${esc(text)}` : ''}`);
  const switchHtml = (on, id, label) => `<button class="rb-switch ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}"><i class="sw"><i></i></i><span>${label}</span></button>`;
  const iconBtn = (act, icon, tip, disabled) => `<button class="rb-ib" data-act="${act}" data-tip="${tip}" ${disabled ? 'disabled' : ''}>${ms(icon, 's20')}</button>`;
  const tile = (act, icon, label, tip, o = {}) => `<button class="rx-t ${o.dd ? 'rx-ddt' : ''} ${o.ic === false ? '' : 'ic'} ${o.on ? 'set' : ''} ${o.cls || ''}" data-act="${act}" ${o.id ? `id="${o.id}"` : ''} data-tip="${tip}" ${o.disabled ? 'disabled' : ''}>${ms(icon, 's20')}${o.dd ? ms('arrow_drop_down', 's16 ddc') : ''}<span class="lbt">${esc(label)}${o.dd ? ms('arrow_drop_down', 's16') : ''}</span>${o.badge || ''}</button>`;
  const swTile = (act, on, label, tip) => `<button class="rx-t rb-switch ${on ? 'on' : ''}" data-act="${act}" role="switch" aria-checked="${on}" data-tip="${tip}"><i class="sw"><i></i></i><span class="lbt">${label}</span></button>`;
  const picks = (name, opts, cur, cols, tipFn, disabled) => `<div class="rx-picks" role="radiogroup" style="--cols:${cols}">${opts.map(([k, l]) => `<button class="rx-pk ${cur === k ? 'on' : ''}" role="radio" aria-checked="${cur === k}" data-pick="${name}" data-val="${k}" data-tip="${tipFn(k, l)}" ${disabled ? 'disabled' : ''}>${esc(l)}</button>`).join('')}</div>`;
  const lead = (icon, tip) => `<span class="rx-lead" data-tip="${tip}">${ms(icon, 's20')}</span>`;
  // Figma v4 (user update): a title tile in front of the chips (Period, Group by) — icon over a label, like the other tiles
  const leadTile = (icon, label, tip) => `<span class="rx-ld" data-tip="${tip}">${ms(icon, 's20')}<span class="lbt">${esc(label)}</span></span>`;
  const pickBtn = (name, k, l, cur, tip, disabled) => `<button class="rx-pk ${cur === k ? 'on' : ''}" role="radio" aria-checked="${cur === k}" data-pick="${name}" data-val="${k}" data-tip="${tip}" ${disabled ? 'disabled' : ''}>${esc(l)}</button>`;
  // single line · Figma "Ribbon / Line dropdown": icon + ▾ (32px) or the 112px Time period label
  const lineDd = (act, icon, tip, on, name) => `<button class="sl-ld ${on ? 'set' : ''}" data-act="${act}" data-tip="${tip}">${ms(icon, 's22')}${name ? `<span class="ldl">${esc(name)}</span>` : ''}${ms('arrow_drop_down', 's16')}</button>`;
  const lineIc = (act, icon, tip, o = {}) => `<button class="sl-li ${o.cls || ''}" data-act="${act}" data-tip="${tip}" ${o.disabled ? 'disabled' : ''}>${ms(icon, 's20')}${o.dd ? ms('arrow_drop_down', 's16') : ''}</button>`;
  const lineSw = (act, on, label, tip) => `<button class="rb-switch sl-sw ${on ? 'on' : ''}" data-act="${act}" role="switch" aria-checked="${on}" data-tip="${tip}"><i class="sw"><i></i></i><span>${label}</span></button>`;
  const ICON_PX = { search: 23, zoom_in: 23, zoom_out: 23, filter_list: 22, sort: 22, view_column: 22, format_list_bulleted: 22, import_export: 22, lock_outline: 20 };
  const evenIcons = (root, sel = '.ms.s20') => root && root.querySelectorAll(sel).forEach((i) => { const px = ICON_PX[i.textContent.trim()]; if (px) i.style.fontSize = px + 'px'; });
  new MutationObserver((ms_) => ms_.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && evenIcons(n, '.mi > .ms:first-child')))).observe(document.getElementById('layer'), { childList: true, subtree: true });
  const ZOOM_MAX = 200;
  const check = (id, on, label) => `<button class="rb-check ${on ? 'on' : ''}" id="${id}" role="checkbox" aria-checked="${on}"><i class="cb">${on ? ms('check', 's16') : ''}</i><span>${label}</span></button>`;
  const radio = (name, val, on, label, disabled) => `<button class="rb-radio ${on ? 'on' : ''}" data-radio="${name}" data-val="${val}" ${disabled ? 'disabled' : ''}><i class="rd"></i><span>${label}</span></button>`;

  // rows are always compact now; the Compact toggle switches the ribbon
  S.prefs.density = 'compact';
  const single = () => S.prefs.ribbonMode === 'single';

  const D = () => S.prefs.defaults;
  const changedFrom = {
    sort: () => V().sortBy !== D().sortBy,
    group: () => V().groupBy !== D().groupBy,
    cols: () => V().columns.join() !== (D().columns || []).join(),
    level: () => V().level !== D().level,
  };
  let savedNow = false;
  const isDefault = () => {
    const v = V(), d = D();
    if (savedNow && !(v.period === d.period && !changedFrom.sort() && !changedFrom.group() && !changedFrom.cols() && !changedFrom.level())) savedNow = false;
    return savedNow;
  };

  // ---------- search + filter chips ----------
  const CHIP_KEYS = [['org', 'Org', 'Organization'], ['discipline', 'Discipline', 'Discipline'], ['site', 'Site', 'Site'], ['floor', 'Floor', 'Floor']];
  function chips() {
    const f = V().filters, out = [];
    if (f.from || f.to) { const t = `${f.from ? fmt(f.from) : '…'} – ${f.to ? fmt(f.to) : '…'}`; out.push(['dur', `Dates: ${t}`, `Dates: ${t}`]); }
    CHIP_KEYS.forEach(([k, s, l]) => { if (f[k]) out.push([k, `${s}: ${f[k]}`, `${l}: ${f[k]}`]); });
    return out;
  }
  const filterTip = (ch) => (ch.length ? tp('Filter', ch.map((c) => c[2]).join(', ')) : tp('Filter', 'Narrows the plan by dates, organization, discipline, site or floor'));
  const badge = (ch) => (ch.length ? `<i class="sl-badge">${ch.length}</i>` : '');
  // chips inside the box: the first one (two in the pop-up), the rest as "+N"
  const chipsHtml = (max) => {
    const ch = chips(); if (!ch.length) return '';
    const shown = ch.slice(0, max), rest = ch.length - shown.length;
    return `<span class="sl-chips">${shown.map(([k, s, l]) => `<span class="sl-chip" data-tip="${esc(l)}"><span class="ct">${esc(s)}</span><button data-chipx="${k}" aria-label="Remove ${esc(l)}">${ms('close', 's14')}</button></span>`).join('')}${rest ? `<button class="sl-chip more" data-act="filterBox" data-tip="${filterTip(ch.slice(max))}">+${rest}</button>` : ''}</span>`;
  };
  let searchPop = false;
  const searchHtml = () => {
    const v = V(), ch = chips(), active = !!v.search || ch.length > 0;
    return `<div class="rb-search sl-search ${active ? 'active' : ''}" id="slSearch">
        <button class="sl-sicon" id="rbSearchBtn" data-tip="${tp('Search', active ? `Searching${v.search ? ` “${v.search}”` : ''}${ch.length ? ` · ${ch.length} filter${ch.length > 1 ? 's' : ''}` : ''}` : 'Finds activities by name and in the visible columns, with filters')}">${ms('search', 's20')}<span class="lbt">Search</span>${active ? `<i class="sl-dot">${ch.length || ''}</i>` : ''}</button>
        ${chipsHtml(1)}
        <input id="rbQ" placeholder="Search within visible columns" value="${esc(v.search)}" autocomplete="off">
        <span class="sl-count hidden" id="rbCount"></span>
        <button class="rb-clear ${active ? '' : 'hidden'}" id="rbClear" data-tip="${tp('Clear', 'Removes the search and all filters')}">${ms('close', 's20')}</button>
        <button class="sl-fbtn ${ch.length ? 'on' : ''}" data-act="filterBox" data-tip="${filterTip(ch)}">${ms('filter_list', 's20')}</button>
      </div>`;
  };
  const stepper = (v, maxL, pre = '') => `<div class="rb-stepper rx-step"><button data-act="lvMinus" data-tip="${tp('Level down', 'Shows one level less of the structure')}" ${v.level <= 0 ? 'disabled' : ''}>${ms('remove', 's20')}</button><input id="${pre}lvIn" value="${v.level}" inputmode="numeric" aria-label="Level"><button data-act="lvPlus" data-tip="${tp('Level up', 'Shows one level more of the structure')}" ${v.level >= maxL ? 'disabled' : ''}>${ms('add', 's20')}</button></div>`;

  // a section: data-n = number of states, data-fold / data-icon = the state where it folds / goes icon-only
  const sec = (g, n, fold, icon, open, folded) => `<div class="rx-g" data-g="${g}" data-n="${n}" ${fold != null ? `data-fold="${fold}"` : ''} ${icon != null ? `data-icon="${icon}"` : ''} data-s="0">${folded != null ? `<div class="v-open">${open}</div><div class="v-fold">${folded}</div>` : open}</div>`;
  const D_ = '<i class="rx-d"></i>';
  // after Search: hidden while the search box is open, shown once Search is a button
  const D_FIND = '<i class="rx-d rx-d-find"></i>';
  const othersTip = tp('Others', 'Tools that don’t fit the ribbon');

  const groupPicks = (v) => {
    const t = (k, l) => tp(k === 'none' ? 'No grouping' : `Group by ${l}`, k === 'none' ? 'Shows the plan without groups' : `Puts activities with the same ${l.toLowerCase()} together`);
    const b = (k) => pickBtn('group', k, lbl(GROUP_OPTS, k), v.groupBy, t(k, lbl(GROUP_OPTS, k)));
    return `<div class="rx-picks rx-gp" role="radiogroup">${b('discipline')}${b('zone')}${b('org')}${b('phase')}${b('floor')}<span class="rx-pk2">${b('site')}${b('none')}</span></div>`;
  };
  function detailedHtml() {
    const v = V(), stepL = T.STEP_LABEL[v.period], maxL = S.maxDepth(), all = v.level >= maxL;
    const prev = `<div class="rx-stk"><button class="rb-ib" data-act="prev" data-tip="${tp(stepL ? `Previous ${stepL}` : 'Previous', stepL ? `Moves the timeline back one ${stepL}` : '')}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button>
            <button class="rb-ib" data-act="next" data-tip="${tp(stepL ? `Next ${stepL}` : 'Next', stepL ? `Moves the timeline forward one ${stepL}` : '')}" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button></div>`;
    const today = tile('today', 'today', 'Today', tp('Today', 'Jumps to today on the timeline'));
    const zoomBox = `<div class="rx-zoom"><div class="rb-zc">${iconBtn('zoomOut', 'zoom_out', tp('Zoom out', `Shows more of the timeline (${v.zoom}%)`), v.zoom <= 50)}${iconBtn('zoomIn', 'zoom_in', tp('Zoom in', `Shows less of the timeline in more detail (${v.zoom}%)`), v.zoom >= ZOOM_MAX)}</div><span class="lbt">Zoom ${v.zoom}%</span></div>`;
    // Time as one group once View ▾ is full: ‹ Today › on top, the period ▾ under it; an icon ▾ when even smaller
    // Time · 1st fold = Monthly ▾ · ‹ › · Today (as before); later one drop-down (‹ Today › + the periods with a check)
    const tgroup = `<div class="rx-t1">${tile('period', 'date_range', lbl(T.PERIODS, v.period), tp(`Time period: ${lbl(T.PERIODS, v.period)}`, 'Choose how much of the timeline you see'), { dd: 1, ic: false, cls: 'rx-period' })}${prev}${today}</div>
        ${tile('timeIc', 'date_range', lbl(T.PERIODS, v.period), tp(`Time: ${lbl(T.PERIODS, v.period)}`, 'Today, previous / next and the time period'), { dd: 1, cls: 'rx-tic' })}`;
    return `
        ${sec('find', 3, 1, 2, searchHtml())}${D_FIND}
        ${sec('time', 4, 1, 3,
          `${leadTile('date_range', 'Period', tp('Time period', 'Choose how much of the timeline you see'))}${picks('period', T.PERIODS.map(([k]) => [k, PERIOD_SHORT[k]]), v.period, 3, (k) => tp(lbl(T.PERIODS, k), PERIOD_TIP[k]))}${prev}${today}`,
          tgroup)}${D_}
        ${sec('sort', 3, 1, 2,
          `<div class="rx-sortv"><span class="rx-ldr" data-tip="${tp('Sort', 'Choose the order of the activities')}">${ms('sort', 's20')}<span class="lbt">Sort by</span></span>${picks('sort', [['default', 'Default'], ['start', 'Start'], ['end', 'End']], v.sortBy, 3, (k) => tp(`Sort by ${lbl(SORT_OPTS, k)}`, k === 'default' ? 'Keeps the plan order' : k === 'start' ? 'Earliest start first' : 'Earliest end first'))}</div>`,
          tile('sort', 'sort', 'Sort', tp(`Sort by ${lbl(SORT_OPTS, v.sortBy)}`, 'Choose the order of the activities'), { dd: 1, on: changedFrom.sort() }))}${D_}
        ${sec('group', 3, 1, 2,
          `${leadTile('group_work', 'Group by', tp('Group', 'Groups the activities by one field'))}${groupPicks(v)}`,
          tile('group', 'group_work', 'Group', tp(`Group by ${lbl(GROUP_OPTS, v.groupBy)}`, 'Groups the activities by one field'), { dd: 1, on: changedFrom.group() }))}${D_}
        ${sec('column', 2, null, 1, tile('cols', 'view_column', 'Column', tp('Column', `Choose the columns in the table · ${colsLabel()}`), { dd: 1, on: changedFrom.cols() }))}${D_}
        ${sec('level', 1, null, null, `<div class="rx-lv">${stepper(v, maxL)}<span class="lbt">Level</span></div>${tile('lvAll', all ? 'unfold_less' : 'unfold_more', all ? 'Collapse all' : 'Expand all', all ? tp('Collapse all', 'Closes every level of the structure') : tp('Expand all', 'Opens every level of the structure'))}`)}${D_}
        ${sec('view', 3, 1, 2,
          `<div class="rx-vm2"><div class="rx-vc">${check('vDeps', v.showDeps, 'Dependencies')}${check('vFull', v.fullscreen, 'Full screen')}</div><i class="rx-vd"></i><div class="rx-vc rx-vc2">${check('vProg', v.showProgress, 'Progress %')}<div class="rx-basis">${picks('basis', [['time', 'Time'], ['work', 'Work']], v.progressBasis, 2, (k) => tp(k === 'time' ? 'Progress by time' : 'Progress by work', k === 'time' ? 'How much of the planned time has passed' : 'How much of the planned work is done'), !v.showProgress)}</div></div></div>`,
          tile('view', 'visibility', 'View', tp('View', 'View modes, plus Display and Level when they don’t fit'), { dd: 1 }))}${D_}
        ${sec('zoom', 1, null, null, zoomBox)}${D_}
        ${sec('fitTl', 2, null, 1, tile('fitTl', 'aspect_ratio', 'Fit timeline', fitTip(), { disabled: !fitOk() }))}${D_}
        ${sec('file', 2, null, 1, tile('file', 'import_export', 'File', tp('File', 'Import a plan or download it as CSV'), { dd: 1 }))}${D_}
        ${sec('display', 2, 1, null, `${swTile('active', v.activeToday, 'Active tasks', tp('Active tasks', 'Shows only the activities running today'))}<i class="rx-vd"></i>${swTile('compact', false, 'Compact', tp('Compact', 'Switches to the single-line ribbon'))}`,
          tile('display', 'tune', 'Display', tp('Display', 'Active tasks, zoom and the Compact ribbon'), { dd: 1, on: V().activeToday }))}${D_}
        ${sec('defaults', 2, null, 1, tile('setDefault', 'lock_outline', 'Set default', defTip(), { cls: isDefault() ? 'act' : '' }))}${D_}
        ${sec('legend', 2, null, 1, tile('legend', 'legend_toggle', 'Legends', tp('Legends', 'Explains the row and bar colours')))}
        ${sec('refresh', 2, null, 1, tile('refresh', 'sync', 'Refresh', tp('Refresh', 'Reloads the planning data')))}
        ${sec('updated', 2, null, 1, tile('info', 'info', 'Updated', tp('Last updated', fmt(LIM_DATA.LAST_UPDATED))))}
        ${sec('others', 2, null, 1, tile('others', 'more_horiz', 'Others', othersTip, { dd: 1, id: 'slOthers' }))}`;
  }

  // single line · Figma "Ribbon · Mode=Collapsed, Width=1366" (14170:8361)
  function singleHtml() {
    const v = V(), stepL = T.STEP_LABEL[v.period];
    return `
        ${sec('find', 2, 1, 1, searchHtml())}${D_FIND}
        ${sec('time', 2, 1, null, `<button class="sl-period" data-act="period" data-tip="${tp('Time period', 'Choose how much of the timeline you see')}"><span>${esc(lbl(T.PERIODS, v.period))}</span>${ms('arrow_drop_down', 's16')}</button>
          ${lineIc('prev', 'keyboard_arrow_left', tp(stepL ? `Previous ${stepL}` : 'Previous', stepL ? `Moves the timeline back one ${stepL}` : ''), { disabled: !stepL })}${lineIc('next', 'keyboard_arrow_right', tp(stepL ? `Next ${stepL}` : 'Next', stepL ? `Moves the timeline forward one ${stepL}` : ''), { disabled: !stepL })}
          <button class="sl-today" data-act="today" data-tip="${tp('Today', 'Jumps to today on the timeline')}">Today</button>`,
          `<button class="sl-period" data-act="timeIc" data-tip="${tp(`Time: ${lbl(T.PERIODS, v.period)}`, 'Today, previous / next and the time period')}"><span>${esc(lbl(T.PERIODS, v.period))}</span>${ms('arrow_drop_down', 's16')}</button>`)}${D_}
        ${sec('group', 2, null, 1, lineDd('group', 'group_work', tp(`Group by ${lbl(GROUP_OPTS, v.groupBy)}`, 'Groups the activities by one field'), changedFrom.group(), 'Group'))}
        ${sec('sort', 2, null, 1, lineDd('sort', 'sort', tp(`Sort by ${lbl(SORT_OPTS, v.sortBy)}`, 'Choose the order of the activities'), changedFrom.sort(), 'Sort'))}
        ${sec('column', 2, null, 1, lineDd('cols', 'view_column', tp('Column', `Choose the columns in the table · ${colsLabel()}`), changedFrom.cols(), 'Column'))}
        ${sec('level', 2, null, 1, lineDd('level', 'format_list_bulleted', tp(`Level ${v.level}`, 'Choose how many levels of the structure are open'), changedFrom.level(), 'Level'))}
        ${sec('view', 2, null, 1, lineDd('view', 'visibility', tp('View', 'View modes, plus Display and Level when they don’t fit'), false, 'View'))}
        ${sec('full', 1, null, null, lineIc('full', 'settings_overscan', tp('Full screen', v.fullscreen ? 'Leave full screen' : 'Hides the side menu and top bar'), { cls: v.fullscreen ? 'act' : '' }))}${D_}
        ${sec('zoom', 1, null, null, `<div class="sl-zoom">${iconBtn('zoomOut', 'zoom_out', tp('Zoom out', `Shows more of the timeline (${v.zoom}%)`), v.zoom <= 50)}${iconBtn('zoomIn', 'zoom_in', tp('Zoom in', `Shows less of the timeline in more detail (${v.zoom}%)`), v.zoom >= ZOOM_MAX)}</div>`)}${D_}
        ${sec('fitTl', 1, null, null, lineIc('fitTl', 'aspect_ratio', fitTip(), { disabled: !fitOk() }))}${D_}
        ${sec('file', 2, null, 1, lineDd('file', 'import_export', tp('File', 'Import a plan or download it as CSV'), false, 'File'))}${D_}
        ${sec('display', 2, 1, null, `${lineSw('active', v.activeToday, 'Active Tasks', tp('Active tasks', 'Shows only the activities running today'))}${lineSw('compact', true, 'Compact', tp('Compact', 'Switches back to the detailed ribbon'))}`,
          lineDd('display', 'tune', tp('Display', 'Active tasks, zoom and the Compact ribbon'), v.activeToday))}${D_}
        ${sec('defaults', 1, null, null, lineIc('setDefault', 'lock_outline', defTip(), { cls: isDefault() ? 'act' : '' }))}${D_}
        ${sec('legend', 1, null, null, lineIc('legend', 'legend_toggle', tp('Legends', 'Explains the row and bar colours')))}
        ${sec('refresh', 1, null, null, lineIc('refresh', 'sync', tp('Refresh', 'Reloads the planning data')))}
        ${sec('updated', 1, null, null, lineIc('info', 'info', tp('Last updated', fmt(LIM_DATA.LAST_UPDATED))))}
        ${sec('others', 1, null, null, lineIc('others', 'more_horiz', othersTip, { dd: 1 }))}`;
  }
  // Fit timeline · on when an activity is selected: shows it from start to end
  const fitOk = () => !!(V().selected && S.byId(V().selected));
  const fitTip = () => (fitOk() ? tp('Fit timeline', `Shows “${S.byId(V().selected).name}” from start to end`) : tp('Fit timeline', 'Select an activity to see it from start to end'));
  const doFit = () => { if (fitOk() && G.fitTo(V().selected)) changed(); };
  // the selection changes in the Gantt without redrawing the ribbon: update the Fit timeline buttons in place
  function syncFit() {
    const ok = fitOk(), tip = fitTip();
    document.querySelectorAll('[data-act="fitTl"], [data-pa="fitTl"]').forEach((b) => { b.disabled = !ok; b.dataset.tip = tip; });
  }
  const defTip = () => (isDefault() ? tp('This view is your default', 'Change the view to save a new default') : tp('Set as default', 'Saves the current settings as your default view'));

  function render() {
    UI.closeFloat();
    const sp = $('slSpop'); if (sp) sp.remove();
    el().classList.toggle('one', single());
    el().innerHTML = `<div class="rx ${single() ? 'rx-one' : ''}" id="rx"><div class="rx-items" id="slItems">${single() ? singleHtml() : detailedHtml()}</div></div>`;
    bind();
    evenIcons(el());
    fit();
    count();
    if (searchPop) openSearchPop(false);
  }

  const changed = () => { G.render(); render(); };
  function count() {
    const c = $('rbCount'); if (!c || !G.counts) return;
    const on = !!V().search || chips().length > 0, n = G.counts();
    c.classList.toggle('hidden', !on); c.textContent = on ? `${n.shown} of ${n.total}` : '';
  }

  // ---------- fitting ----------
  let tucked = [];   // sections that moved into Others or View, in the order they moved
  const setS = (g, s) => {
    g.dataset.s = s;
    g.classList.toggle('is-fold', g.dataset.fold != null && s >= +g.dataset.fold);
    g.classList.toggle('is-icon', g.dataset.icon != null && s >= +g.dataset.icon);
    g.classList.toggle('is-grp', g.dataset.g === 'time' && g.dataset.fold != null && s >= +g.dataset.fold + 1);
  };
  const tidy = (box) => {
    let seen = false, last = null;
    [...box.children].forEach((c) => {
      if (c.classList.contains('rx-d')) { c.classList.add('hidden'); if (seen) last = c; return; }
      if (c.classList.contains('rx-sp')) { last = null; return; }
      if (!c.classList.contains('hidden')) { if (last) last.classList.remove('hidden'); last = null; seen = true; }
    });
  };
  const NARROW = 1350;
  const INTO_OTHERS = ['updated', 'refresh', 'legend', 'defaults'];
  // these move into View ▾ together, in one step
  const INTO_VIEW = ['level', 'full', 'zoom', 'display', 'fitTl'];
  const isFindCompact = () => { const g = el().querySelector('.rx-g[data-g="find"]'); return !!g && g.classList.contains('is-fold'); };
  // one gap everywhere: between tools, on both sides of every divider, and around the dividers inside View and Display
  const GAP_MIN = 6;
  function evenGaps(box) {
    const kids = [...box.children].filter((c) => !c.classList.contains('hidden') && c.offsetWidth > 0);
    if (kids.length < 2) return;
    // gaps inside View modes and Display share the same size (both ribbons)
    const inner = kids.reduce((n, k) => n + [...k.querySelectorAll('.rx-vm2, .rx-g[data-g="display"] > .v-open')].filter((p) => p.offsetWidth > 0).reduce((m, p) => m + Math.max(0, [...p.children].filter((c) => c.offsetWidth > 0).length - 1), 0), 0);
    const slots = kids.length - 1 + inner;
    const content = kids.reduce((w, k) => w + k.getBoundingClientRect().width, 0) - inner * GAP_MIN;
    const g = Math.max(GAP_MIN, (box.clientWidth - content) / slots - 0.05);
    box.style.setProperty('--g', g + 'px');
  }
  function fit() {
    const box = $('slItems'); if (!box) return;
    // overflowing, or the last visible tool sticks out past the row by a fraction of a pixel
    const over = () => { if (box.scrollWidth > box.clientWidth + 1) return true; const vis = [...box.children].filter((c) => c.offsetWidth && !c.classList.contains('hidden')); const last = vis[vis.length - 1]; return !!last && last.getBoundingClientRect().right > box.getBoundingClientRect().right + 0.5; };
    box.style.setProperty('--g', GAP_MIN + 'px');   // fit at the smallest gap, then share the spare room evenly
    const gs = [...box.querySelectorAll(':scope > .rx-g')];
    const G_ = (n) => gs.find((x) => x.dataset.g === n);
    const others = G_('others');
    gs.forEach((g) => { g.classList.remove('hidden', 'no-lead'); setS(g, 0); });
    tucked = []; others.classList.add('hidden'); tidy(box);
    const tuck = (n) => { const g = G_(n); if (!g || g.classList.contains('hidden')) return; g.classList.add('hidden'); tucked.push(n); if (!INTO_VIEW.includes(n)) others.classList.remove('hidden'); tidy(box); };
    const fold = (n) => { const g = G_(n); if (g && +g.dataset.n > 1 && g.dataset.fold != null && +g.dataset.s < +g.dataset.fold) setS(g, +g.dataset.fold); };
    const steps = [];
    let preTime = 0;   // steps that always come before Time and Search collapse
    // 1 · Detailed: the Period title goes first, then the Group picks become a button
    if (!single()) { steps.push(() => { const t = G_('time'); if (t) t.classList.add('no-lead'); }); steps.push(() => fold('group')); }
    // Single line: the names beside the icons go first, right to left
    if (single()) ['file', 'view', 'level', 'column', 'sort', 'group'].forEach((n) => steps.push(() => { const g = G_(n); if (g) setS(g, 1); }));
    // 2 · Others ▾ takes Updated, Refresh, Legends, Set default
    INTO_OTHERS.forEach((n) => steps.push(() => tuck(n)));
    // 3 · the view modes fold into View ▾ and Level moves in with them (Level goes before Zoom and Fit timeline)
    steps.push(() => { fold('view'); tuck('level'); });
    // 4 · Display ▾ forms (Active tasks, Zoom, Compact); Fit timeline stays on the ribbon
    steps.push(() => { tuck('zoom'); fold('display'); });
    // 4 · Detailed: Sort picks become a button (they stay down to about 1440px)
    if (!single()) steps.push(() => fold('sort'));
    // 5 · Display moves into View ▾, before Time and Search collapse
    steps.push(() => tuck('display'));
    preTime = steps.length;
    // 6 · Detailed: the Time picks become Monthly ▾ · ‹ › · Today; Full screen moves into View ▾ (single line)
    if (!single()) steps.push(() => fold('time'));
    steps.push(() => tuck('full'));
    // 7 · Detailed: Time becomes one drop-down (‹ Today › + the periods with a check), before search collapses
    if (!single()) steps.push(() => { const g = G_('time'); setS(g, +g.dataset.fold + 1); });
    // 8 · the search field becomes the icon (the field opens below it)
    steps.push(() => fold('find'));
    // 9 · Detailed: labels give way to icons, right to left
    if (!single()) steps.push(() => { for (let i = gs.length - 1; i >= 0 && over(); i--) if (!gs[i].classList.contains('hidden') && +gs[i].dataset.n > 1 && !single()) setS(gs[i], +gs[i].dataset.n - 1); });
    // 10 · last: sections move into Others, right to left
    (single() ? ['fitTl', 'file', 'column', 'sort', 'group', 'time'] : ['fitTl', 'file', 'column', 'group', 'sort', 'time']).forEach((n) => steps.push(() => tuck(n)));
    let from = 0;
    // 1350px and smaller: everything that folds before Time stays folded (nothing comes back on a smaller screen),
    // Search is the icon and Time is one drop-down (Monthly ▾)
    if (innerWidth <= NARROW) {
      for (; from < preTime; from++) steps[from]();
      fold('find');
      const t = G_('time'); if (t) setS(t, single() ? 1 : +t.dataset.fold + 1);
    }
    for (const s of steps.slice(from)) { if (!over()) break; s(); }
    evenGaps(box);
    // if the search pop-up is open but the field fits again, the field takes over
    if (searchPop && !isFindCompact()) searchPop = false;
  }
  window.addEventListener('resize', () => { if (el().firstElementChild) { searchPop = false; render(); } });
  document.fonts && document.fonts.ready.then(() => { if (el().firstElementChild) render(); });

  // ---------- search pop-up: opens below the search icon, like the other drop-downs ----------
  function openSearchPop(focus = true) {
    const box = $('slSearch'), ic = $('rbSearchBtn'), g = el().querySelector('.rx-g[data-g="find"]'); if (!box || !ic || !g) return;
    if (!isFindCompact()) { searchPop = false; if (focus) $('rbQ').focus(); return; }
    if ($('slSpop')) return;
    searchPop = true;
    const r = ic.getBoundingClientRect();
    // the icon stays on the ribbon (a copy, shown as pressed) while the box opens below it in the pop-up layer
    const ph = box.cloneNode(true); ph.removeAttribute('id'); ph.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id')); ph.classList.add('ph');
    ph.onclick = () => closeSearchPop();
    const pop = document.createElement('div'); pop.className = 'sl-spop'; pop.id = 'slSpop';
    const ch = box.querySelector('.sl-chips'); if (ch) ch.outerHTML = chipsHtml(1);
    pop.appendChild(box); box.classList.add('pop'); g.appendChild(ph); $('layer').appendChild(pop);
    pop.style.left = Math.max(8, Math.min(innerWidth - 328, r.left)) + 'px';
    pop.style.top = (r.bottom + 4) + 'px';
    bindSearch();
    if (focus) { const q = $('rbQ'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  // closing puts the box back in its place without redrawing the ribbon, so a click on another tool still lands
  const closeSearchPop = () => {
    if (!searchPop) return; searchPop = false; UI.closeFloat();
    const box = $('slSearch'), pop = $('slSpop'), g = el().querySelector('.rx-g[data-g="find"]'); if (!box || !g) { if (pop) pop.remove(); return; }
    g.querySelectorAll('.sl-search.ph').forEach((n) => n.remove());
    box.classList.remove('pop'); g.appendChild(box); if (pop) pop.remove();
    const ch = box.querySelector('.sl-chips'); if (ch) ch.outerHTML = chipsHtml(1);
    $('rbQ').blur(); bindSearch();
  };
  document.addEventListener('mousedown', (e) => {
    if (!searchPop) return;
    const pop = $('slSpop'), layer = $('layer');
    if ((pop && pop.contains(e.target)) || (layer && layer.contains(e.target)) || (e.target.closest && e.target.closest('.sl-search.ph'))) return;
    closeSearchPop();
  });

  function bindSearch() {
    const v = V(), q = $('rbQ');
    $('rbSearchBtn').onclick = () => { if (isFindCompact() && !searchPop) openSearchPop(); else q.focus(); };
    q.oninput = () => { v.search = q.value; G.render(); $('rbClear').classList.toggle('hidden', !q.value && !chips().length); count(); };
    q.onkeydown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (searchPop) closeSearchPop(); else q.blur(); }
      if (e.key === 'Enter') { e.stopPropagation(); q.blur(); }
    };
    $('rbClear').onclick = () => { v.search = ''; V().filters = EMPTY_FILTERS(); G.render(); render(); const n = $('rbQ'); n && n.focus(); };
    document.querySelectorAll('#slSearch [data-chipx]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation(); const k = b.dataset.chipx, f = V().filters;
      if (k === 'dur') { f.from = ''; f.to = ''; } else f[k] = '';
      G.render(); render();
    });
    document.querySelectorAll('#slSearch [data-act="filterBox"]').forEach((b) => b.onclick = () => filterPop($('slSearch'), true));
  }

  function bind() {
    const v = V();
    bindSearch();
    const lv = $('lvIn');
    if (lv) {
      lv.onchange = (e) => setLevel(parseInt(e.target.value, 10));
      lv.onkeydown = (e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'ArrowUp') { e.preventDefault(); setLevel(V().level + 1); } if (e.key === 'ArrowDown') { e.preventDefault(); setLevel(V().level - 1); } };
      lv.onfocus = (e) => e.target.select();
    }
    const on = (id, fn) => { const n = $(id); if (n) n.onclick = fn; };
    on('vDeps', () => toggleView('showDeps'));
    on('vFull', () => toggleView('fullscreen'));
    on('vProg', () => toggleView('showProgress'));
    el().querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => {
      const k = b.dataset.val, p = b.dataset.pick;
      if (p === 'period') { if (k !== v.period) setPeriod(k); return; }
      if (p === 'sort') v.sortBy = k;
      if (p === 'group') { v.groupBy = k; v.collapsedGroups = new Set(); }
      if (p === 'basis') v.progressBasis = k;
      changed();
    });
    el().querySelectorAll('.rx-items [data-act]:not([data-act="filterBox"])').forEach((b) => b.onclick = (e) => ACT[b.dataset.act] && ACT[b.dataset.act](e.currentTarget));
  }
  const ACT = {
    prev: () => go(T.step(V().period, V().anchor, -1)),
    next: () => go(T.step(V().period, V().anchor, 1)),
    today: () => goToday(),
    period: (b) => periodMenu(b),
    timeIc: (b) => timePop(b),
    sort: (b) => sortMenu(b),
    group: (b) => groupMenu(b),
    cols: (b) => colsMenu(b),
    lvMinus: () => setLevel(V().level - 1),
    lvPlus: () => setLevel(V().level + 1),
    lvAll: () => toggleAll(),
    level: (b) => levelPop(b),
    view: (b) => viewPop(b),
    display: (b) => displayPop(b),
    file: (b) => UI.menu(b, [{ label: 'Import', icon: 'publish', onClick: doImport }, { label: 'Download', icon: 'download', onClick: doDownload }], { width: 180 }),
    active: () => toggleActive(),
    zoomOut: () => zoom(-10),
    zoomIn: () => zoom(10),
    fitTl: () => doFit(),
    full: () => toggleView('fullscreen'),
    compact: () => toggleRibbon(),
    setDefault: () => setDefault(),
    legend: (b) => legendPop(b),
    refresh: (b) => refresh(b.querySelector('.ms')),
    info: () => {},
    others: (b) => othersPop(b),
  };

  // ---------- actions ----------
  const go = (to) => { const v = V(); if (to === v.anchor) return; G.slideFrom(v.anchor); v.anchor = to; changed(); };
  const goToday = () => { const v = V(); if (v.period === 'project') G.scrollToToday(); else go(T.align(v.period, LIM_DATA.TODAY)); };
  const setPeriod = (k) => { const v = V(), sc = G.scale(); const keep = sc && LIM_DATA.TODAY >= sc.start && LIM_DATA.TODAY < sc.end ? LIM_DATA.TODAY : v.anchor; v.period = k; v.anchor = T.align(k, keep); v.zoom = 100; changed(); };
  const zoom = (d) => { const v = V(); if (d > 0 && v.zoom >= ZOOM_MAX) return; v.zoom = Math.max(50, d > 0 ? Math.min(ZOOM_MAX, v.zoom + d) : v.zoom + d); changed(); };
  const toggleActive = () => { V().activeToday = !V().activeToday; changed(); };
  const toggleRibbon = () => { S.prefs.ribbonMode = single() ? 'detailed' : 'single'; S.savePrefs(); searchPop = false; changed(); };
  const setLevel = (n) => { const v = V(), max = S.maxDepth(); n = Math.max(0, Math.min(max, isNaN(n) ? v.level : n)); G.applyLevel(n); changed(); };
  const toggleAll = () => { if (V().level >= S.maxDepth()) G.collapseAll(); else G.expandAll(); changed(); };
  const refresh = (icon) => { icon && icon.classList.add('spin'); setTimeout(() => { icon && icon.classList.remove('spin'); G.render(); UI.toast('Planning data refreshed'); }, 700); };
  const setDefault = () => {
    const v = V();
    Object.assign(S.prefs.defaults, { period: v.period, groupBy: v.groupBy, sortBy: v.sortBy, columns: v.columns.slice(), level: v.level }); S.prefs.customDefaults = true;
    S.savePrefs(); savedNow = true; render(); UI.toast('Current settings saved as default');
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
  function periodMenu(a) { const v = V(); UI.menu(a, [{ label: 'Time period', disabled: true }, ...T.PERIODS.map(([k, l]) => ({ label: l, on: v.period === k, onClick: () => setPeriod(k) }))], { width: menuW(a, 200) }); markHead(); }
  // Time ▾ (icon, or from Others): ‹ Today › first, then the periods with a check at the right
  function timePop(a, align) {
    const v = V(), stepL = T.STEP_LABEL[v.period];
    const pop = UI.float(a, `<div class="sl-op sl-tp"><div class="rx-tg-top"><button class="rb-ib" data-tp="prev" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_left', 's20')}</button><button class="rx-tg-today" data-tp="today">Today</button><button class="rb-ib" data-tp="next" ${stepL ? '' : 'disabled'}>${ms('keyboard_arrow_right', 's20')}</button></div><div class="msep"></div>
      <div class="mi mhead">Time period</div>${T.PERIODS.map(([k, l]) => `<button class="mi ${v.period === k ? 'on' : ''}" data-per="${k}"><span class="grow">${esc(l)}</span>${v.period === k ? ms('check', 'chk') : ''}</button>`).join('')}</div>`, { cls: 'popover', align }); if (!pop) return;
    // ‹ Today › move the timeline and keep the pop-up open (click outside to close)
    const move = (to) => { const vv = V(); if (to === vv.anchor) return; G.slideFrom(vv.anchor); vv.anchor = to; G.render(); };
    pop.querySelector('[data-tp=prev]').onclick = () => move(T.step(V().period, V().anchor, -1));
    pop.querySelector('[data-tp=next]').onclick = () => move(T.step(V().period, V().anchor, 1));
    pop.querySelector('[data-tp=today]').onclick = () => { const vv = V(); if (vv.period === 'project') G.scrollToToday(); else move(T.align(vv.period, LIM_DATA.TODAY)); };
    pop.querySelectorAll('[data-per]').forEach((b) => b.onclick = () => setPeriod(b.dataset.per));
  }
  function sortMenu(a) { const v = V(); UI.menu(a, [{ label: 'Sort By', disabled: true }, ...SORT_OPTS.map(([k, l]) => ({ label: l, on: v.sortBy === k, onClick: () => { v.sortBy = k; changed(); } }))], { width: 200 }); markHead(); }
  function groupMenu(a) { const v = V(); UI.menu(a, [{ label: 'Group By', disabled: true }, ...GROUP_OPTS.map(([k, l]) => ({ label: l, on: v.groupBy === k, onClick: () => { v.groupBy = k; v.collapsedGroups = new Set(); changed(); } }))], { width: 200 }); markHead(); }
  const markHead = () => { const m = document.querySelector('#layer .menu .mi[disabled]'); m && m.classList.add('mhead'); };
  function colsMenu(a) {
    const v = V();
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
  // Level block: the − n + box shown directly, with Expand / Collapse all
  const levelBlock = () => {
    const v = V(), maxL = S.maxDepth();
    return `<div class="sl-blk"><div class="rb-lr sl-lr"><span class="ovl">Level</span><button class="rb-lbtn" data-pa="lvAll">${v.level >= maxL ? 'Collapse all' : 'Expand all'}</button></div>
      <div class="rb-stepper"><button data-pa="lvMinus" ${v.level <= 0 ? 'disabled' : ''}>${ms('remove', 's20')}</button><span>${v.level}</span><button data-pa="lvPlus" ${v.level >= maxL ? 'disabled' : ''}>${ms('add', 's20')}</button></div></div>`;
  };
  const displayBlock = () => {
    const v = V();
    return `<div class="sl-blk"><div class="rb-lr sl-lr"><span class="ovl">Display</span></div>
      <div class="sl-dcol">${tucked.includes('zoom') ? `<div class="sl-zrow"><div class="rb-zc"><button class="rb-ib" data-pa="zOut" ${v.zoom <= 50 ? 'disabled' : ''}>${ms('zoom_out', 's20')}</button><button class="rb-ib" data-pa="zIn" ${v.zoom >= ZOOM_MAX ? 'disabled' : ''}>${ms('zoom_in', 's20')}</button></div><span>Zoom ${v.zoom}%</span></div>` : ''}
      ${tucked.includes('fitTl') ? `<button class="sl-fitrow" data-pa="fitTl" data-tip="${fitTip()}" ${fitOk() ? '' : 'disabled'}>${ms('aspect_ratio', 's20')}<span>Fit timeline</span></button>` : ''}
      ${switchHtml(v.activeToday, 'dpActive', 'Active tasks')}
      ${switchHtml(single(), 'dpCompact', 'Compact')}</div></div>`;
  };
  // shared handlers for the blocks inside pop-ups; redraw keeps the pop-up open
  const bindBlocks = (pop, draw) => {
    const q = (s) => pop.querySelector(s);
    const act = { lvAll: () => (V().level >= S.maxDepth() ? G.collapseAll() : G.expandAll()), lvMinus: () => G.applyLevel(Math.max(0, V().level - 1)), lvPlus: () => G.applyLevel(Math.min(S.maxDepth(), V().level + 1)),
      zOut: () => { V().zoom = Math.max(50, V().zoom - 10); }, zIn: () => { if (V().zoom < ZOOM_MAX) V().zoom = Math.min(ZOOM_MAX, V().zoom + 10); }, fitTl: () => { if (fitOk()) G.fitTo(V().selected); } };
    pop.querySelectorAll('[data-pa]').forEach((b) => b.onclick = () => { act[b.dataset.pa](); G.render(); draw(); });
    if (q('#dpActive')) q('#dpActive').onclick = () => { V().activeToday = !V().activeToday; G.render(); draw(); };
    if (q('#dpFull')) q('#dpFull').onclick = () => { const v = V(); v.fullscreen = !v.fullscreen; $('app').classList.toggle('fullscreen', v.fullscreen); G.render(); draw(); };
    if (q('#dpCompact')) q('#dpCompact').onclick = () => toggleRibbon();
  };
  function levelPop(a) {
    const pop = UI.float(a, '<div class="sl-pop" id="lvPop"></div>', { cls: 'popover', onClose: () => render() }); if (!pop) return;
    const draw = () => { pop.querySelector('#lvPop').innerHTML = levelBlock(); bindBlocks(pop, draw); };
    draw();
  }
  // Display ▾ · Active tasks, Zoom, Compact (until it merges into View ▾)
  function displayPop(a) {
    const pop = UI.float(a, '<div class="sl-pop sl-vpop" id="dpPop"></div>', { cls: 'popover', onClose: () => render() }); if (!pop) return;
    const draw = () => { pop.querySelector('#dpPop').innerHTML = displayBlock(); bindBlocks(pop, draw); };
    draw();
  }
  // View ▾ · view modes (Full screen always here, as in the Detailed ribbon), then Display and Level once they have moved in
  function viewPop(a) {
    const pop = UI.float(a, '<div class="sl-pop sl-vpop" id="vwPop"></div>', { cls: 'popover', onClose: () => render() }); if (!pop) return;
    const draw = () => {
      const v = V();
      pop.querySelector('#vwPop').innerHTML = `<div class="sl-blk"><div class="rb-lr sl-lr"><span class="ovl">View modes</span></div>
        <div class="sl-vcol">${check('vDeps', v.showDeps, 'Dependencies')}${!single() || tucked.includes('full') ? check('vFull', v.fullscreen, 'Full screen') : ''}</div>
        <i class="sl-hline"></i>
        <div class="sl-vcol sl-vcol2">${check('vProg', v.showProgress, 'Progress %')}
          <div class="rx-basis">${picks('basis', [['time', 'Time'], ['work', 'Work']], v.progressBasis, 2, (k) => tp(k === 'time' ? 'Progress by time' : 'Progress by work', ''), !v.showProgress)}</div></div></div>
        ${tucked.includes('level') ? levelBlock() : ''}${tucked.includes('display') ? displayBlock() : ''}`;
      const t = (k) => () => { const vv = V(); if (k === 'fullscreen') { vv.fullscreen = !vv.fullscreen; $('app').classList.toggle('fullscreen', vv.fullscreen); } else vv[k] = !vv[k]; G.render(); draw(); };
      pop.querySelector('#vDeps').onclick = t('showDeps');
      if (pop.querySelector('#vFull')) pop.querySelector('#vFull').onclick = t('fullscreen');
      pop.querySelector('#vProg').onclick = t('showProgress');
      pop.querySelectorAll('[data-pick="basis"]').forEach((b) => b.onclick = () => { if (b.disabled) return; V().progressBasis = b.dataset.val; G.render(); draw(); });
      bindBlocks(pop, draw);
    };
    draw();
  }
  // Others ▾ · what moved in, in ribbon order: sections that didn't fit, Set default, Legends (shown directly), Refresh, Last updated
  function othersPop(a) {
    // a row that opens its own menu (Time period, Group, Sort, Column) replaces this pop-up without redrawing the ribbon
    let sub = false;
    const pop = UI.float(a, '<div class="sl-op" id="opPop"></div>', { cls: 'popover', align: 'right', onClose: () => { if (!sub) render(); } }); if (!pop) return;
    const subMenu = (fn) => () => { sub = true; fn(a); };
    const draw = () => {
      const v = V(), has = (n) => tucked.includes(n), parts = [];
      const row = (pa, icon, label, o = {}) => `<button class="mi ${o.on ? 'on' : ''}" data-oa="${pa}" ${o.disabled ? 'disabled' : ''}>${ms(icon)}<span class="grow">${esc(label)}</span>${o.on ? ms('check', 'chk') : ''}${o.dd ? ms('chevron_right', 's20 op-go') : ''}</button>`;
      const secs = [];
      if (has('time')) secs.push(row('time', 'date_range', `Time: ${lbl(T.PERIODS, v.period)}`, { dd: 1 }));
      if (has('group')) secs.push(row('group', 'group_work', `Group by: ${lbl(GROUP_OPTS, v.groupBy)}`, { dd: 1 }));
      if (has('sort')) secs.push(row('sort', 'sort', `Sort by: ${lbl(SORT_OPTS, v.sortBy)}`, { dd: 1 }));
      if (has('column')) secs.push(row('cols', 'view_column', 'Column', { dd: 1 }));
      if (has('file')) secs.push(row('import', 'publish', 'Import'), row('download', 'download', 'Download CSV'));
      if (secs.length) parts.push(secs.join(''));
      if (has('defaults')) parts.push(row('setDefault', 'lock_outline', isDefault() ? 'This view is your default' : 'Set as default', { on: isDefault() }));
      const tail = [];
      if (has('refresh')) tail.push(row('refresh', 'sync', 'Refresh'));
      if (has('updated')) tail.push(`<div class="mi op-upd">${ms('info')}<span class="grow">Last updated on: ${fmt(LIM_DATA.LAST_UPDATED)}</span></div>`);
      if (tail.length) parts.push(tail.join(''));
      if (has('legend')) parts.push(`<div class="op-lg"><div class="ovl">Legends</div>${LEGENDS.map(([c, t]) => `<div class="lg-i"><i style="background:${c}"></i>${t}</div>`).join('')}</div>`);
      pop.querySelector('#opPop').innerHTML = parts.join('<div class="msep in"></div>');
      evenIcons(pop, '.mi > .ms:first-child');
      const A = {
        time: subMenu((x) => timePop(x, 'right')), group: subMenu(groupMenu), sort: subMenu(sortMenu), cols: subMenu(colsMenu),
        import: () => { UI.closeFloat(); doImport(); }, download: () => { UI.closeFloat(); doDownload(); },
        setDefault: () => { setDefault(); },
        refresh: (b) => refresh(b.querySelector('.ms')),
      };
      pop.querySelectorAll('[data-oa]').forEach((b) => b.onclick = () => A[b.dataset.oa](b));
    };
    draw();
  }

  // Filter pop-up · under the search box, same width
  const FILTER_FIELDS = [['org', 'Organization'], ['discipline', 'Discipline'], ['site', 'Site'], ['floor', 'Floor']];
  const EMPTY_FILTERS = () => ({ from: '', to: '', activeToday: false, udf1: '', udf2: '', udf3: '', org: '', discipline: '', site: '', floor: '' });
  function filterPop(anchor, box) {
    const f = Object.assign(EMPTY_FILTERS(), V().filters);
    const pop = UI.float(anchor, `<div class="fp">
      <div class="fp-dur"><div><div class="ovl">Start Date</div><label class="fp-date"><input type="date" id="fFrom" value="${f.from}" aria-label="Start Date"></label></div>
        <div><div class="ovl">End Date</div><label class="fp-date"><input type="date" id="fTo" value="${f.to}" aria-label="End Date"></label></div></div>
      ${FILTER_FIELDS.map(([k, l]) => `<div class="ovl">${l}</div><input class="fp-in" id="f_${k}" placeholder="type..." value="${esc(f[k])}" aria-label="${l}">`).join('')}
      <div class="fp-f"><button class="btn text" id="fReset">Reset</button><button class="btn contained" id="fApply">Apply</button></div>
    </div>`, { cls: 'popover fp-pop' + (box ? ' box' : '') });
    if (!pop) return;
    if (box) { const r = anchor.getBoundingClientRect(); pop.style.width = Math.max(r.width, 320) + 'px'; pop.style.left = Math.min(r.left, innerWidth - Math.max(r.width, 320) - 8) + 'px'; pop.style.top = r.bottom + 4 + 'px'; }
    pop.querySelector('#fReset').onclick = () => { V().filters = EMPTY_FILTERS(); UI.closeFloat(); changed(); };
    pop.querySelector('#fApply').onclick = () => {
      Object.assign(f, { from: pop.querySelector('#fFrom').value, to: pop.querySelector('#fTo').value, activeToday: false, udf1: '', udf2: '', udf3: '' });
      FILTER_FIELDS.forEach(([k]) => { f[k] = pop.querySelector('#f_' + k).value.trim(); });
      V().filters = f; UI.closeFloat(); changed();
    };
  }

  function legendPop(anchor) {
    UI.float(anchor, `<div class="lg"><div class="ovl">Legends</div>
      ${LEGENDS.map(([c, t]) => `<div class="lg-i"><i style="background:${c}"></i>${t}</div>`).join('')}</div>`, { cls: 'popover lg-pop', align: 'right' });
  }

  return { render, syncFit };
})();
