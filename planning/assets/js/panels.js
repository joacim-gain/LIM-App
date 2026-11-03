/* Right side panel (320px) · LIM Figma " Activity UPDATE Modal" / "Activity Details" panel.
   Content + flows follow the live app: Activity Details, Edit Activity Date, Assign Zone, Add (Sub) Activity, Edit. */
window.P = (function () {
  const { esc, ms, fmt } = UI;
  const el = () => document.getElementById('panel');
  let cur = null; // {kind, id}

  function open(kind, id, html, { title, edit, footer } = {}) {
    cur = { kind, id };
    el().innerHTML = `<div class="pn-h"><h3>${esc(title)}</h3>${edit ? `<button class="pn-edit" id="pnEdit">${ms('edit', 's16')}Edit</button><i class="pn-vd"></i>` : ''}<button class="rb-ib" id="pnClose" data-tip="Close">${ms('close', 's24')}</button></div>
      <div class="pn-b">${html}</div>${footer ? `<div class="pn-f">${footer}</div>` : ''}`;
    const wasHidden = el().classList.contains('hidden');
    el().classList.remove('hidden');
    document.body.classList.add('panel-open');
    el().querySelector('#pnClose').onclick = close;
    if (edit) el().querySelector('#pnEdit').onclick = () => editActivity(id);
    if (wasHidden) G.render();
  }
  function close() { cur = null; el().classList.add('hidden'); el().innerHTML = ''; document.body.classList.remove('panel-open'); G.render(); }
  function refresh() { if (cur && cur.kind === 'details' && S.byId(cur.id)) details(cur.id); }

  const kv = (k, v, cls = '') => `<div class="pn-kv"><span>${k}</span><b class="${cls}">${v === '' || v === undefined || v === null ? '-' : v}</b></div>`;
  const kvDate = (k, iso) => `<div class="pn-kv"><span>${k}</span><b>${iso ? `${ms('event', 's16')}${fmt(iso)}` : '-'}</b></div>`;
  const sect = (t) => `<div class="pn-sec">${t}</div>`;
  const field = (id, label, value = '', { type = 'text', req, ph = '' } = {}) => `<label class="pn-field"><span>${label}${req ? ' *' : ''}</span><input id="${id}" type="${type}" value="${esc(value)}" placeholder="${ph}" ${req ? 'required' : ''}></label>`;

  // ---------- Activity Details (read view, live app sections) ----------
  function details(id) {
    const a = S.byId(id); if (!a) return;
    const parent = a.parent ? S.byId(a.parent) : null;
    const html = `
      ${kv('Activity Name', `${parent ? esc(parent.name) + ': ' : ''}${esc(a.name)}`)}
      ${sect('Task-Info')}
      ${kvDate('Start Date', a.start)}${kvDate('End Date', a.end)}${kvDate('Previous Start Date', a.prevStart)}${kvDate('Previous End Date', a.prevEnd)}
      ${kv('Phase', esc(a.phase))}${kv('Sub Phase', esc(a.subPhase))}
      ${sect('Location')}
      ${kv('Site', esc(a.site), 'olive')}${kv('Building', esc(a.building))}${kv('Floor', esc(a.floors.join(', ')))}${kv('Zone', esc(a.zones.join(', ')))}${kv('Construction Level', esc(a.constructionLevel))}
      ${sect('Logistics')}
      ${kv('Volume Actual', a.volumeActual)}${kv('Staff', a.staff)}${kv('Logistic Path', esc(a.logisticPath))}${kv('Logistic Category', esc(a.logisticCategory))}
      ${sect('Additional Details')}
      ${kv('Client Name', esc(a.clientName))}${kv('Discipline', esc(a.discipline))}${kv('Status', esc(a.status))}${kv('Material', esc(a.material))}
      ${a.data.map((d, i) => kv('Data' + (i + 1), esc(d))).join('')}
      ${kv('Outline Number', esc(a.outline))}${kvDate('Critical Date', a.criticalDate)}
      ${sect('Notes')}
      ${a.notes.map((n) => `<div class="pn-note"><b>${esc(n.title || 'Note')}</b><p>${esc(n.text)}</p></div>`).join('')}
      <label class="pn-field"><input id="nTitle" placeholder="Title"></label>
      <textarea class="pn-ta" id="nText" placeholder="Write here..." maxlength="250"></textarea>
      <div class="pn-count"><span id="nCount">0 / 250</span><button class="btn contained" id="nSave" disabled>Save</button></div>`;
    open('details', id, html, { title: 'Activity Details', edit: true });
    const t = el().querySelector('#nText'), s = el().querySelector('#nSave');
    t.oninput = () => { el().querySelector('#nCount').textContent = `${t.value.length} / 250`; s.disabled = !t.value.trim(); };
    s.onclick = () => { a.notes.push({ title: el().querySelector('#nTitle').value.trim(), text: t.value.trim() }); S.save(); details(id); UI.toast('Note saved'); };
  }

  // ---------- Edit Activity Date (live: "Change Duration") ----------
  function editDates(id) {
    const a = S.byId(id); if (!a) return;
    open('dates', id, `<p class="pn-sub">${esc(a.name)}</p>${field('dStart', 'Start Date', a.start, { type: 'date', req: true })}${field('dEnd', 'End Date', a.end, { type: 'date', req: true })}<div class="pn-err hidden" id="dErr">End Date must be on or after Start Date.</div>`,
      { title: 'Edit Activity Date', footer: '<button class="btn text" id="pnCancel">Cancel</button><button class="btn contained" id="pnSave">Save</button>' });
    el().querySelector('#pnCancel').onclick = close;
    el().querySelector('#pnSave').onclick = () => {
      const s = el().querySelector('#dStart').value, e = el().querySelector('#dEnd').value;
      if (!s || !e || e < s) { el().querySelector('#dErr').classList.remove('hidden'); return; }
      if (s !== a.start || e !== a.end) { a.prevStart = a.start; a.prevEnd = a.end; a.start = s; a.end = e; S.save(); UI.toast('Activity duration updated'); }
      close();
    };
  }

  // ---------- Assign Zone (live: Site, Building, Floor → zone checkboxes per floor) ----------
  function assignZone(id) {
    const a = S.byId(id); if (!a) return;
    const Z = LIM_DATA.ZONES;
    const st = { site: a.site && Z.sites.includes(a.site) ? [a.site] : [Z.sites[0]], building: a.building ? a.building.split(', ') : [Z.buildings[0]], floors: a.floors.filter((f) => Z.floors[f]).length ? a.floors.filter((f) => Z.floors[f]) : Object.keys(Z.floors).slice(0, 2), zones: new Set(a.zones) };
    const initial = JSON.stringify([...st.zones].sort());
    const draw = () => {
      const sel = (k, label, opts) => `<div class="pn-dd"><span class="ovl">${label}</span><button class="rb-field" data-pick="${k}"><span class="ell">${esc(st[k].join(', ') || 'Select')}</span>${ms('keyboard_arrow_down', 's20')}</button></div>`;
      const allZones = st.floors.flatMap((f) => Z.floors[f].map((z) => f + '|' + z));
      const allOn = allZones.length && allZones.every((k) => st.zones.has(k.split('|')[1]));
      const html = `<p class="pn-sub">${esc(a.name)}</p>${sel('site', 'Site')}${sel('building', 'Building')}${sel('floors', 'Floor')}
        <button class="pn-zone all ${allOn ? 'on' : ''}" data-all><i class="cb">${allOn ? ms('check', 's16') : ''}</i>All Zone</button>
        ${st.floors.map((f) => `<div class="pn-floor">${esc(f)}</div>${Z.floors[f].length ? Z.floors[f].map((z) => `<button class="pn-zone ${st.zones.has(z) ? 'on' : ''}" data-z="${esc(z)}"><i class="cb">${st.zones.has(z) ? ms('check', 's16') : ''}</i>${esc(z)}</button>`).join('') : '<div class="pn-none">No zones on this floor</div>'}`).join('')}`;
      open('zone', id, html, { title: 'Assign Zone', footer: '<button class="btn text" id="pnCancel">Cancel</button><button class="btn contained" id="pnSave">Save</button>' });
      const save = el().querySelector('#pnSave');
      save.disabled = JSON.stringify([...st.zones].sort()) === initial;
      el().querySelector('#pnCancel').onclick = close;
      save.onclick = () => { a.zones = [...st.zones]; S.save(); UI.toast('Zone assigned'); close(); };
      el().querySelectorAll('[data-z]').forEach((b) => b.onclick = () => { const z = b.dataset.z; st.zones.has(z) ? st.zones.delete(z) : st.zones.add(z); draw(); });
      el().querySelector('[data-all]').onclick = () => { const zs = st.floors.flatMap((f) => Z.floors[f]); if (allOn) zs.forEach((z) => st.zones.delete(z)); else zs.forEach((z) => st.zones.add(z)); draw(); };
      el().querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => {
        const k = b.dataset.pick; const opts = k === 'site' ? Z.sites : k === 'building' ? Z.buildings : Object.keys(Z.floors);
        UI.menu(b, opts.map((o) => ({ label: o, on: st[k].includes(o), keepOpen: true, onClick: () => { st[k] = st[k].includes(o) ? st[k].filter((x) => x !== o) : [...st[k], o]; UI.closeFloat(); draw(); } })), { width: b.getBoundingClientRect().width });
      });
    };
    draw();
  }

  // ---------- Add (Sub) Activity / Edit ----------
  function form(a, { title, onSave }) {
    open('form', a.id || null, `${a.parentName ? `<p class="pn-sub">Sub activity of <b>${esc(a.parentName)}</b></p>` : ''}
      ${field('fName', 'Activity Name', a.name, { req: true })}
      <div class="pn-2">${field('fStart', 'Start Date', a.start, { type: 'date', req: true })}${field('fEnd', 'End Date', a.end, { type: 'date', req: true })}</div>
      ${sect('Additional Details')}
      ${field('fOrg', 'Organization', a.org === 'Not Available' ? '' : a.org)}${field('fPhase', 'Phase', a.phase)}${field('fDisc', 'Discipline', a.discipline)}
      <div class="pn-err hidden" id="fErr"></div>`,
    { title, footer: '<button class="btn text" id="pnCancel">Cancel</button><button class="btn contained" id="pnSave">Save</button>' });
    el().querySelector('#pnCancel').onclick = close;
    el().querySelector('#pnSave').onclick = () => {
      const v = (i) => el().querySelector(i).value.trim();
      const err = el().querySelector('#fErr');
      if (!v('#fName') || !v('#fStart') || !v('#fEnd')) { err.textContent = 'Fill in Activity Name, Start Date and End Date.'; err.classList.remove('hidden'); return; }
      if (v('#fEnd') < v('#fStart')) { err.textContent = 'End Date must be on or after Start Date.'; err.classList.remove('hidden'); return; }
      onSave({ name: v('#fName'), start: v('#fStart'), end: v('#fEnd'), org: v('#fOrg') || 'Not Available', phase: v('#fPhase'), discipline: v('#fDisc') });
    };
    setTimeout(() => el().querySelector('#fName').focus(), 30);
  }
  function addActivity(parentId) {
    const p = parentId ? S.byId(parentId) : null;
    const start = p ? p.start : LIM_DATA.TODAY, end = p ? p.end : T.add(LIM_DATA.TODAY, 30);
    form({ name: '', start, end, org: p ? p.org : '', phase: '', discipline: '', parentName: p && p.name }, {
      title: p ? 'Add Sub Activity' : 'Add Activity',
      onSave: (d) => {
        const base = LIM_DATA.ACTIVITIES[0];
        const a = Object.assign(JSON.parse(JSON.stringify(base)), d, { id: S.newId(), parent: parentId || null, floors: p ? p.floors.slice() : [], site: p ? p.site : '', progress: 0, cat: '', prevStart: '', prevEnd: '', notes: [], zones: [] });
        const idx = parentId ? S.data.activities.map((x) => x.parent === parentId || x.id === parentId).lastIndexOf(true) + 1 : S.data.activities.length;
        S.data.activities.splice(idx, 0, a);
        if (parentId) S.view.expanded.add(parentId);
        S.view.selected = a.id; S.save(); UI.toast(p ? 'Sub activity added' : 'Activity added'); details(a.id); G.render(); R.render();
      },
    });
  }
  function editActivity(id) {
    const a = S.byId(id); if (!a) return;
    form(a, { title: 'Edit Activity', onSave: (d) => {
      if (d.start !== a.start || d.end !== a.end) { a.prevStart = a.start; a.prevEnd = a.end; }
      Object.assign(a, d); S.save(); UI.toast('Activity updated'); details(id); G.render();
    } });
  }

  return { details, editDates, assignZone, addActivity, editActivity, close, refresh };
})();
