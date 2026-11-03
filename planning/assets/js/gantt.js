/* Gantt: table (left) + timeline (right), one scroll container.
   Visuals: LIM Figma "Yearly" frame (36px rows, row tints, grey 20px bars with progress fill, grey connectors, current period highlight).
   Interactions: live LIM app (expand rows, ⋮ row menu, drag/resize bars, link bars, hover card, select → highlight chain). */
window.G = (function () {
  const { esc, ms, hl, fmt } = UI;
  const host = () => document.getElementById('gantt');
  const V = () => S.view;

  const COLS = {
    org: { label: 'Organization', get: (a) => a.org || '-' },
    discipline: { label: 'Discipline', get: (a) => a.discipline || '-' },
    floors: { label: 'Floor', get: (a) => a.floors.join(', ') || '-' },
    site: { label: 'Site', get: (a) => a.site || '-' },
    volumeActual: { label: 'Volume Actual', get: (a) => String(a.volumeActual ?? 0) },
    start: { label: 'Start Date', get: (a) => a.start },
    end: { label: 'End Date', get: (a) => a.end },
  };
  const GROUPS = {
    discipline: { label: 'Discipline', get: (a) => a.discipline }, zone: { label: 'Zone', get: (a) => a.zones[0] }, org: { label: 'Organization', get: (a) => a.org },
    phase: { label: 'Phase', get: (a) => a.phase }, site: { label: 'Site', get: (a) => a.site }, floor: { label: 'Floor', get: (a) => a.floors[0] },
  };
  const CAT_TINT = { criticalDate: 'rgba(245,191,94,.24)', volNormal: 'rgba(68,223,183,.32)', volCritical: 'rgba(216,32,52,.16)', other: 'rgba(180,134,240,.32)' };
  const CAT_EDGE = { criticalDate: '#F5BF5E', volNormal: '#06A77D', volCritical: '#D82034', other: '#B486F0' };
  const W_EXP = 28, W_NAME = 120, W_COL = 80;
  const rowH = () => (S.prefs.density === 'compact' ? 36 : 48);
  const leftW = () => W_EXP + W_NAME + V().columns.length * W_COL;

  // ---------- derived data ----------
  const today = LIM_DATA.TODAY;
  const range = () => {
    const as = S.data.activities; return [as.reduce((m, a) => (a.start < m ? a.start : m), as[0].start), as.reduce((m, a) => (a.end > m ? a.end : m), as[0].end)];
  };
  function pct(a) {
    if (V().progressBasis === 'work') return a.progress;
    const d = T.diff(a.start, a.end); if (d <= 0) return today >= a.end ? 100 : 0;
    return Math.round(Math.max(0, Math.min(1, T.diff(a.start, today) / d)) * 100);
  }
  const textOf = (a) => [a.name, ...V().columns.map((c) => COLS[c].get(a))].join(' ').toLowerCase();
  const allText = (a) => [a.name, a.org, a.discipline, a.floors.join(' '), a.site, a.zones.join(' '), a.phase, a.status].join(' ').toLowerCase();
  function matches(a) {
    const v = V(), f = v.filters;
    if (v.search && !textOf(a).includes(v.search.toLowerCase())) return false;
    if ((v.activeToday || f.activeToday) && !(a.start <= today && a.end >= today)) return false;
    if (f.from && a.end < f.from) return false;
    if (f.to && a.start > f.to) return false;
    for (const k of ['udf1', 'udf2', 'udf3']) if (f[k] && !allText(a).includes(f[k].toLowerCase())) return false;
    return true;
  }
  const filtering = () => { const v = V(), f = v.filters; return !!(v.search || v.activeToday || f.activeToday || f.from || f.to || f.udf1 || f.udf2 || f.udf3); };
  function sortList(list) {
    const k = V().sortBy; if (k === 'default') return list;
    const key = k === 'start' ? 'start' : 'end';
    return list.slice().sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
  }
  // visible rows: [{type:'group', key, label, count} | {type:'act', a, depth, hasKids}]
  function rows() {
    const v = V(), out = [];
    const keep = new Set();
    const mark = (a) => { let hit = matches(a); for (const c of S.children(a.id)) if (mark(c)) hit = true; if (hit) keep.add(a.id); return hit; };
    const roots = S.data.activities.filter((a) => !a.parent);
    roots.forEach(mark);
    const isFiltering = filtering();
    const walk = (a, depth) => {
      if (!keep.has(a.id)) return;
      const kids = sortList(S.children(a.id)).filter((c) => keep.has(c.id));
      out.push({ type: 'act', a, depth, hasKids: S.children(a.id).length > 0 });
      const open = v.expanded.has(a.id) || (isFiltering && kids.length && !matches(a));
      if (open) kids.forEach((c) => walk(c, depth + 1));
    };
    const sorted = sortList(roots);
    if (v.groupBy === 'none') sorted.forEach((a) => walk(a, 0));
    else {
      const g = GROUPS[v.groupBy]; const map = new Map();
      sorted.filter((a) => keep.has(a.id)).forEach((a) => { const k = g.get(a) || 'Not assigned'; if (!map.has(k)) map.set(k, []); map.get(k).push(a); });
      [...map.keys()].sort((x, y) => (x === 'Not assigned') - (y === 'Not assigned') || x.localeCompare(y)).forEach((k) => {
        out.push({ type: 'group', key: k, label: k, count: map.get(k).length });
        if (!v.collapsedGroups?.has(k)) map.get(k).forEach((a) => walk(a, 0));
      });
    }
    return out;
  }

  // ---------- level / expand ----------
  function applyLevel(level) {
    const v = V(); v.level = level; v.expanded = new Set();
    S.data.activities.forEach((a) => { if (S.depth(a) < level && S.children(a.id).length) v.expanded.add(a.id); });
  }
  const expandAll = () => applyLevel(S.maxDepth());
  const collapseAll = () => applyLevel(0);

  // ---------- render ----------
  let sc = null; // current scale
  let lastRows = [];
  function render() {
    const el = host(); const v = V();
    document.getElementById('app').classList.toggle('density-comfortable', S.prefs.density !== 'compact');
    const prevScroll = el.querySelector('.g-scroll') ? { l: el.querySelector('.g-scroll').scrollLeft, t: el.querySelector('.g-scroll').scrollTop } : null;
    const LW = leftW(), RH = rowH();
    const avail = Math.max(200, el.clientWidth - LW - 17); // 16px scrollbar + 1px border
    const u0 = T.scale(v.period, v.anchor, range(), 10).units.length;
    const colW = Math.max(v.period === 'monthly' ? 24 : 40, Math.floor(avail / u0)) * (v.zoom / 100);
    sc = T.scale(v.period, v.anchor, range(), colW);
    const W = sc.width;
    const list = rows(); lastRows = list;
    const q = v.search;
    const tP = T.P(today);
    const curIdx = sc.units.findIndex((u) => today >= u.start && today < u.end);

    const head = `<div class="g-head" style="width:${LW + W}px">
      <div class="g-corner" style="width:${LW}px"><span class="g-hc" style="width:${W_EXP + W_NAME}px;padding-left:16px">Activity/Group</span>${v.columns.map((c) => `<span class="g-hc" style="width:${W_COL}px">${COLS[c].label}</span>`).join('')}</div>
      <div class="g-tl">${sc.units.map((u, i) => `<span class="g-th ${i === curIdx ? 'cur' : ''} ${u.sub ? 'two' : ''}" style="width:${colW}px"><b>${u.label}</b>${u.sub ? `<small>${u.sub}</small>` : ''}</span>`).join('')}</div>
    </div>`;

    const bodyRows = list.map((r, i) => {
      if (r.type === 'group') {
        const open = !v.collapsedGroups?.has(r.key);
        return `<div class="g-row g-group" data-group="${esc(r.key)}" style="height:${RH}px"><div class="g-left" style="width:${LW}px"><button class="g-exp">${ms(open ? 'keyboard_arrow_up' : 'keyboard_arrow_down', 's20')}</button><span class="g-gname ell">${GROUPS[v.groupBy].label}: ${esc(r.label)}</span><span class="g-gcount">${r.count}</span></div><div class="g-track" style="width:${W}px"></div></div>`;
      }
      const a = r.a; const tint = CAT_TINT[a.cat];
      const sel = v.selected === a.id;
      const x1 = sc.x(a.start), x2 = sc.x(T.add(a.end, 1));
      const bw = Math.max(6, x2 - x1);
      const p = pct(a);
      const showLbl = v.showProgress;
      const lblOut = bw < 34;
      // keep the % label on the visible part of bars that run past the period edges
      const vis1 = Math.max(x1, 0), vis2 = Math.min(x1 + bw, W);
      const lblX = vis2 > vis1 ? (((vis1 + vis2) / 2 - x1) / bw) * 100 : 50;
      return `<div class="g-row ${sel ? 'sel' : ''}" data-id="${a.id}" style="height:${RH}px">
        <div class="g-left" style="width:${LW}px;${tint ? `--tint:${tint}` : ''}">
          <span class="g-exp-cell" style="width:${W_EXP}px">${r.hasKids ? `<button class="g-exp" data-exp="${a.id}">${ms(v.expanded.has(a.id) || (filtering() && r.hasKids) ? 'keyboard_arrow_down' : 'keyboard_arrow_right', 's16')}</button>` : `<span class="g-exp ph">${ms('keyboard_arrow_down', 's16')}</span>`}</span>
          <span class="g-name ell" style="width:${W_NAME}px;padding-left:${8 + r.depth * 12}px" data-tip="${esc(a.name)}">${hl(a.name, q)}</span>
          ${v.columns.map((c) => `<span class="g-cell ell" style="width:${W_COL}px" data-tip="${esc(COLS[c].get(a))}">${hl(COLS[c].get(a), q)}</span>`).join('')}
          <button class="g-more" data-more="${a.id}" data-tip="Actions">${ms('more_vert', 's20')}</button>
        </div>
        <div class="g-track" style="width:${W}px">
          <div class="g-bar ${sel ? 'sel' : ''}" data-bar="${a.id}" style="left:${x1}px;width:${bw}px">
            ${showLbl ? `<i class="g-fill ${p >= 100 ? 'full' : ''}" style="width:${p}%"></i>` : ''}
            ${showLbl ? `<b class="g-pct ${lblOut ? 'out' : ''}" ${lblOut ? '' : `style="left:${lblX}%"`}>${p}%</b>` : ''}
            <i class="g-grip l"></i><i class="g-grip r"></i>
            <i class="g-link l" data-link="${a.id}"></i><i class="g-link r" data-link="${a.id}"></i>
          </div>
        </div>
      </div>`;
    }).join('');

    const bodyH = list.length * RH;
    const deps = v.showDeps ? depPaths(list, RH) : '';
    const cols = sc.units.map((u, i) => `<i class="g-col ${i === curIdx ? 'cur' : ''}" style="left:${i * colW}px;width:${colW}px"></i>`).join('');
    // dotted markers in the middle of their day: olive = today, red = last updated
    const dayX = (d) => (d >= sc.start && d < sc.end ? sc.x(d) + (sc.x(T.add(d, 1)) - sc.x(d)) / 2 : null);
    const todayX = dayX(today), lastX = dayX(LIM_DATA.LAST_UPDATED);
    const marks = (lastX !== null ? `<i class="g-mark g-last" style="left:${lastX}px" data-tip="Last updated · ${fmt(LIM_DATA.LAST_UPDATED)}"></i>` : '')
      + (todayX !== null ? `<i class="g-mark g-today" style="left:${todayX}px" data-tip="Today · ${fmt(today)}"></i>` : '');

    el.innerHTML = `<div class="g-scroll" id="gScroll"><div class="g-inner" style="width:${LW + W}px">${head}
      <div class="g-body" style="--lw:${LW}px">
        <div class="g-cols" style="left:${LW}px;width:${W}px">${cols}${marks}</div>
        <svg class="g-deps" style="left:${LW}px" width="${W}" height="${bodyH}"><defs>
          <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L8 4L0 8z" fill="#B0B0B5"/></marker>
          <marker id="arrOn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L8 4L0 8z" fill="#F7A21B"/></marker></defs>${deps}</svg>
        ${bodyRows}
        <div class="g-fillrow"><div class="g-left" style="width:${LW}px"></div></div>
      </div></div></div>
      ${!list.length ? `<div class="g-empty">${ms('search_off', 's24')}<b>No activities match</b><span>Change the search or filters to see activities.</span></div>` : ''}`;

    const scroller = el.querySelector('.g-scroll');
    if (prevScroll) { scroller.scrollLeft = prevScroll.l; scroller.scrollTop = prevScroll.t; }
    if ((!prevScroll || toToday) && todayX !== null) scroller.scrollLeft = Math.max(0, todayX - (el.clientWidth - LW) / 2);
    toToday = false;
    // slide the timeline from where the old window was, so the user sees which way it moved
    if (slideFrom) {
      const dx = Math.max(-W, Math.min(W, -sc.x(slideFrom)));
      slideFrom = null;
      if (Math.abs(dx) >= 1) { el.style.setProperty('--slide', `${dx}px`); el.classList.remove('sliding'); void el.offsetWidth; el.classList.add('sliding'); clearTimeout(slideT); slideT = setTimeout(() => el.classList.remove('sliding'), 320); }
    }
    bind(el);
  }

  function depPaths(list, RH) {
    const idx = new Map(); list.forEach((r, i) => { if (r.type === 'act') idx.set(r.a.id, i); });
    const sel = V().selected;
    const chain = sel ? chainOf(sel) : new Set();
    return S.data.deps.map(([f, t]) => {
      if (!idx.has(f) || !idx.has(t)) return '';
      const A = S.byId(f), B = S.byId(t);
      const xa = sc.x(T.add(A.end, 1)), xb = sc.x(B.start);
      const ya = idx.get(f) * RH + RH / 2, yb = idx.get(t) * RH + RH / 2;
      let d;
      if (xb - xa >= 16) d = `M${xa} ${ya}H${xa + 8}V${yb}H${xb - 1}`;
      else { const ym = yb + (yb > ya ? -RH / 2 : RH / 2); d = `M${xa} ${ya}H${xa + 8}V${ym}H${xb - 12}V${yb}H${xb - 1}`; }
      const on = chain.has(f) && chain.has(t);
      return `<path d="${d}" class="${on ? 'on' : ''}" marker-end="url(#${on ? 'arrOn' : 'arr'})"/>`;
    }).join('');
  }
  function chainOf(id) {
    const out = new Set([id]);
    const up = (x) => S.data.deps.forEach(([f, t]) => { if (t === x && !out.has(f)) { out.add(f); up(f); } });
    const dn = (x) => S.data.deps.forEach(([f, t]) => { if (f === x && !out.has(t)) { out.add(t); dn(t); } });
    up(id); dn(id); return out;
  }

  // ---------- interactions ----------
  function bind(el) {
    el.querySelectorAll('[data-exp]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation(); const id = b.dataset.exp; const v = V();
      v.expanded.has(id) ? v.expanded.delete(id) : v.expanded.add(id); render();
    });
    el.querySelectorAll('.g-group').forEach((g) => g.onclick = () => {
      const v = V(); v.collapsedGroups = v.collapsedGroups || new Set(); const k = g.dataset.group;
      v.collapsedGroups.has(k) ? v.collapsedGroups.delete(k) : v.collapsedGroups.add(k); render();
    });
    el.querySelectorAll('.g-row[data-id] .g-left').forEach((l) => l.onclick = (e) => {
      if (e.target.closest('.g-more, .g-exp')) return;
      const id = l.parentElement.dataset.id; V().selected = id; render(); P.details(id);
    });
    el.querySelectorAll('[data-more]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); rowMenu(b, b.dataset.more); });
    el.querySelectorAll('.g-bar').forEach((bar) => {
      bar.addEventListener('pointerdown', (e) => dragStart(e, bar));
      bar.addEventListener('mouseenter', (e) => hoverCard(bar, e));
      bar.addEventListener('mousemove', (e) => moveCard(e));
      bar.addEventListener('mouseleave', hideCard);
      bar.addEventListener('dblclick', () => P.details(bar.dataset.bar));
    });
    el.querySelector('.g-body').addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.g-bar, .g-left') && V().selected) { V().selected = null; render(); }
    });
  }

  function rowMenu(anchor, id) {
    UI.menu(anchor, [
      { label: 'Add Sub Activity', icon: 'add', onClick: () => P.addActivity(id) },
      { label: 'Edit', icon: 'edit', onClick: () => P.editActivity(id) },
      { label: 'Delete', icon: 'delete', onClick: () => del(id) },
      { label: 'Change Duration', icon: 'event', onClick: () => P.editDates(id) },
      { label: 'Assign Zone', icon: 'link', onClick: () => P.assignZone(id) },
    ], { width: 220 });
  }
  async function del(id) {
    const a = S.byId(id); const kids = S.children(id).length;
    const ok = await UI.confirm({ title: 'Delete activity', text: `Delete <b>${esc(a.name)}</b>${kids ? ` and its ${kids} sub ${kids > 1 ? 'activities' : 'activity'}` : ''}? This can't be undone.` });
    if (!ok) return;
    const gone = new Set([id]); let grew = true;
    while (grew) { grew = false; S.data.activities.forEach((x) => { if (x.parent && gone.has(x.parent) && !gone.has(x.id)) { gone.add(x.id); grew = true; } }); }
    S.data.activities = S.data.activities.filter((x) => !gone.has(x.id));
    S.data.deps = S.data.deps.filter(([f, t]) => !gone.has(f) && !gone.has(t));
    if (gone.has(V().selected)) { V().selected = null; P.close(); }
    S.save(); render(); UI.toast('Activity deleted');
  }

  // drag: move (body), resize (grips), link (circles)
  let drag = null;
  function dragStart(e, bar) {
    if (e.button !== 0) return;
    const id = bar.dataset.bar; const a = S.byId(id);
    const r = bar.getBoundingClientRect(); const ox = e.clientX - r.left;
    hideCard();
    if (e.target.classList.contains('g-link')) return linkStart(e, bar, id, e.target.classList.contains('r'));
    const mode = ox < 7 ? 'l' : ox > r.width - 7 ? 'r' : 'm';
    drag = { id, mode, x0: e.clientX, s0: a.start, e0: a.end, bar, left0: parseFloat(bar.style.left), w0: parseFloat(bar.style.width), moved: false };
    bar.setPointerCapture(e.pointerId);
    bar.onpointermove = dragMove; bar.onpointerup = dragEnd;
  }
  function dragMove(e) {
    if (!drag) return; const dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(dx) < 3) return; drag.moved = true;
    const b = drag.bar; b.classList.add('dragging');
    let L = drag.left0, Wd = drag.w0;
    if (drag.mode === 'm') L += dx; if (drag.mode === 'l') { L += dx; Wd -= dx; } if (drag.mode === 'r') Wd += dx;
    if (Wd < 6) { if (drag.mode === 'l') L = drag.left0 + drag.w0 - 6; Wd = 6; }
    b.style.left = L + 'px'; b.style.width = Wd + 'px';
    const s = sc.date(L), en = T.add(sc.date(L + Wd), -1);
    drag.s = s; drag.e = en < s ? s : en;
    showDragTip(e, drag.s, drag.e);
  }
  function dragEnd() {
    const d = drag; drag = null; if (!d) return;
    d.bar.onpointermove = d.bar.onpointerup = null; hideDragTip();
    if (!d.moved) { V().selected = V().selected === d.id ? null : d.id; render(); return; }
    const a = S.byId(d.id);
    if (d.mode === 'm') { const shift = T.diff(d.s0, d.s); a.start = T.add(d.s0, shift); a.end = T.add(d.e0, shift); }
    else { a.start = d.s; a.end = d.e; }
    if (a.start !== d.s0 || a.end !== d.e0) { a.prevStart = d.s0; a.prevEnd = d.e0; S.save(); UI.toast('Activity duration updated'); }
    V().selected = d.id; render(); P.refresh();
  }
  function linkStart(e, bar, id, fromRight) {
    const body = host().querySelector('.g-body'); const br = body.getBoundingClientRect();
    const svg = host().querySelector('.g-deps'); const LW = leftW();
    const r = bar.getBoundingClientRect();
    const x0 = (fromRight ? r.right : r.left) - br.left - LW, y0 = r.top + r.height / 2 - br.top;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('class', 'temp'); svg.appendChild(p);
    const mv = (ev) => { p.setAttribute('d', `M${x0} ${y0}L${ev.clientX - br.left - LW} ${ev.clientY - br.top}`); };
    const up = (ev) => {
      document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); p.remove();
      const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.g-bar, .g-row[data-id]');
      const to = t ? (t.dataset.bar || t.dataset.id) : null;
      if (!to || to === id) return;
      const pair = fromRight ? [id, to] : [to, id];
      if (S.data.deps.some(([f, tt]) => f === pair[0] && tt === pair[1])) return UI.toast('This dependency already exists');
      S.data.deps.push(pair); S.save(); V().showDeps = true; render(); R.render();
      UI.toast(`Dependency added: ${esc(S.byId(pair[0]).name)} → ${esc(S.byId(pair[1]).name)}`);
    };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    e.preventDefault(); e.stopPropagation();
  }

  // hover card · LIM Figma tooltip (title, duration, grey logistics section, pointer)
  let card = null, cardTimer = null;
  function hoverCard(bar, e) {
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => {
      if (drag) return;
      const a = S.byId(bar.dataset.bar); if (!a) return;
      hideCard();
      card = document.createElement('div'); card.className = 'hcard';
      card.style.setProperty('--edge', CAT_EDGE[a.cat] || '#BEBEC2');
      const na = (v) => (v === '' || v === null || v === undefined ? 'N/A' : esc(v));
      card.innerHTML = `<div class="hc-top"><b>${esc(a.name)}</b><span>Duration:</span><strong>${fmt(a.start)} - ${fmt(a.end)}</strong></div>
        <div class="hc-bot"><span>Logistics: ${na(a.logisticCategory)}</span><strong>Volume Actual - ${a.volumeActual ? esc(a.volumeActual) : 'N/A'}</strong><strong>Staff - ${a.staff ? esc(a.staff) : 'N/A'}</strong><strong>Logistics Path - ${na(a.logisticPath)}</strong><strong>Logistics Category - ${na(a.logisticCategory)}</strong></div>`;
      document.body.appendChild(card); moveCard(e);
    }, 300);
  }
  function moveCard(e) { if (!card) return; const r = card.getBoundingClientRect(); let x = e.clientX - r.width / 2, y = e.clientY - r.height - 16; if (y < 8) { y = e.clientY + 20; card.classList.add('below'); } else card.classList.remove('below'); x = Math.max(8, Math.min(innerWidth - r.width - 8, x)); card.style.left = x + 'px'; card.style.top = y + 'px'; }
  function hideCard() { clearTimeout(cardTimer); if (card) { card.remove(); card = null; } }
  let dtip = null;
  function showDragTip(e, s, en) { if (!dtip) { dtip = document.createElement('div'); dtip.className = 'tip show'; document.body.appendChild(dtip); } dtip.textContent = `${fmt(s)} – ${fmt(en)}`; dtip.style.left = e.clientX + 12 + 'px'; dtip.style.top = e.clientY - 34 + 'px'; }
  function hideDragTip() { if (dtip) { dtip.remove(); dtip = null; } }

  function counts() { const acts = lastRows.filter((r) => r.type === 'act').length; return { shown: acts, total: S.data.activities.length }; }
  function toCSV() {
    const cols = ['Activity', ...V().columns.map((c) => COLS[c].label), 'Start Date', 'End Date', 'Progress'];
    const lines = [cols.join(';')];
    S.data.activities.forEach((a) => lines.push([a.name, ...V().columns.map((c) => COLS[c].get(a)), a.start, a.end, pct(a) + '%'].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')));
    return lines.join('\n');
  }

  let slideFrom = null, slideT = null, toToday = false;
  const slideFromFn = (iso) => { slideFrom = iso; };
  const scrollToToday = () => { toToday = true; render(); };

  return { COLS, GROUPS, render, slideFrom: slideFromFn, scrollToToday, applyLevel, expandAll, collapseAll, counts, toCSV, pct, scale: () => sc };
})();
