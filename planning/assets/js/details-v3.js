/* Activity Details drawer · v3 (Figma "Activity Details · Planning", from the new Site drawer).
   Same interaction as before (opens from a row or a bar, Edit in the header, Close); new content:
   name + ID, Linked zones (chips), label | value rows with chips, status dot, predecessors / successors,
   a read-only short note and the author card. "Jump to activity" is hidden in Planning. */
window.DETAILS_V3 = (function () {
  const { esc, ms, fmt } = UI;
  const STATUS_C = { 'In Progress': '#3D7CE0', 'Completed': '#06A77D', 'Not Started': '#818187', 'Delayed': '#D82034' };
  // sample note (read-only) + author card, as in the design
  const NOTE = 'Deliveries through Gate B only, 07:00–16:00.';
  const AUTHOR = { name: 'Peter Parker', org: 'Ambuja cement', mail: 'peter@mail.com', phone: '+ 88 0 00 89 98 89', at: '23 May 2026, 13:23:31' };
  const row = (k, v) => `<div class="dv"><span>${k}</span><b>${v === '' || v === undefined || v === null || v === 0 ? '-' : v}</b></div>`;
  const date = (s) => (s ? `${ms('event', 's16')}${fmt(s)}` : '');
  const chips = (list, cls = '') => (list.length ? `<span class="vchips">${list.map((x) => `<span class="vchip ${cls}">${esc(x)}</span>`).join('')}</span>` : '');
  const multi = (v) => (Array.isArray(v) ? v : String(v || '').split(', ')).filter(Boolean);
  const sect = (t) => `<div class="dr-sec">${t}</div>`;
  const deps = (id, dir) => (S.data.deps || []).filter((d) => d[dir === 'pre' ? 1 : 0] === id).map((d) => S.byId(d[dir === 'pre' ? 0 : 1])).filter(Boolean);
  const depList = (list) => (list.length ? `<div class="dr-deps">${list.map((x) => `<button class="dr-dep" data-dep="${x.id}">${esc(x.name)}</button>`).join('')}</div>` : '<div class="dr-none">No dependencies</div>');

  return function details(id, { open, el }) {
    const a = S.byId(id); if (!a) return;
    const p = a.parent ? S.byId(a.parent) : null;
    const html = `
      <div class="dr-name">${p ? esc(p.name) + ': ' : ''}${esc(a.name)}</div>
      <div class="dr-meta"><span>ID ${esc(a.id)}</span></div>
      <div class="dr-link"><div class="dr-zones"><span class="lbl2">Linked zones</span>${a.zones.length ? chips(a.zones) : '<span class="none">Not linked to any zone</span>'}</div></div>
      ${sect('Task-Info')}
      ${row('Duration', a.start && a.end ? `<span class="nowrap">${fmt(a.start)}<span class="arr">→</span>${fmt(a.end)}</span>` : '')}
      ${row('Start Date', date(a.start))}${row('End Date', date(a.end))}
      ${row('Previous Start Date', date(a.prevStart))}${row('Previous End Date', date(a.prevEnd))}
      ${row('Phase', esc(a.phase))}${row('Sub Phase', esc(a.subPhase))}
      ${sect('Location')}
      ${row('Site', chips(multi(a.site), 'site'))}${row('Building', chips(multi(a.building)))}${row('Floor', chips(multi(a.floors)))}
      ${row('Zone', chips(a.zones))}${row('Construction Level', esc(a.constructionLevel))}
      ${sect('Logistics')}
      ${row('Volume Actual', a.volumeActual)}${row('Staff', a.staff)}${row('Logistic Path', esc(a.logisticPath))}${row('Logistic Category', esc(a.logisticCategory))}
      ${sect('Additional Details')}
      ${row('Client Name', esc(a.clientName || a.org))}${row('Discipline', esc(a.discipline))}
      ${row('Status', a.status ? `<span class="stat"><i style="background:${STATUS_C[a.status] || '#818187'}"></i>${esc(a.status)}</span>` : '')}
      ${row('Material', esc(a.material))}${a.data.map((d, i) => row('Data' + (i + 1), esc(d))).join('')}
      ${row('Outline Number', esc(a.outline))}${row('Critical Date', date(a.criticalDate))}
      ${sect('Predecessors')}${depList(deps(a.id, 'pre'))}
      ${sect('Successors')}${depList(deps(a.id, 'suc'))}
      ${sect('Notes')}
      <div class="dr-nread">${esc(NOTE)}</div>
      <div class="dr-ncard"><div class="who"><span class="av">${ms('person', 's24')}</span><div><b>${AUTHOR.name}</b><span>${AUTHOR.org}</span></div></div>
        <div class="more"><span>${AUTHOR.mail}</span><span>${AUTHOR.phone}</span><time>${AUTHOR.at}</time></div></div>`;
    open('details', id, html, { title: 'Activity Details', edit: true });
    el().classList.add('dr3');
    el().querySelectorAll('[data-dep]').forEach((b) => b.onclick = () => { S.view.selected = b.dataset.dep; G.render(); details(b.dataset.dep, { open, el }); });
  };
})();
