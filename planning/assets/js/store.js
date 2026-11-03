/* State + persistence (localStorage). Everything stays in the browser. */
window.S = (function () {
  const KEY = 'lim-planning-demo-v1';
  const PKEY = 'lim-planning-prefs-v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };

  const saved = read(KEY);
  const data = saved || { activities: clone(LIM_DATA.ACTIVITIES), deps: clone(LIM_DATA.DEPS), seq: 1 };

  // "Set as default" values (live app: Sort by, Column, Level)
  const DEFAULTS = { period: 'monthly', groupBy: 'none', sortBy: 'default', columns: ['org', 'floors', 'site'], level: 0 };
  const prefs = Object.assign({ defaults: clone(DEFAULTS), density: 'compact', ribbonCollapsed: false }, read(PKEY) || {});
  // until the user presses "Set as default", follow the built-in defaults (so a changed default reaches everyone)
  if (!prefs.customDefaults) prefs.defaults = clone(DEFAULTS);

  const view = {
    period: prefs.defaults.period || 'monthly',   // yearly | quarterly | monthly | weekly | project
    anchor: LIM_DATA.TODAY,      // date the period navigation is centred on
    groupBy: prefs.defaults.groupBy || 'none',
    sortBy: prefs.defaults.sortBy,
    columns: prefs.defaults.columns.slice(),
    level: prefs.defaults.level,
    expanded: new Set(),
    showDeps: true,
    showProgress: true,
    progressBasis: 'time',       // time | work
    fullscreen: false,
    zoom: 100,
    activeToday: false,
    search: '',
    filters: { from: '', to: '', activeToday: false, udf1: '', udf2: '', udf3: '' },
    selected: null,
  };

  const S = {
    data, prefs, view,
    save() { write(KEY, data); },
    savePrefs() { write(PKEY, prefs); },
    reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(PKEY); } catch (e) { /* ignore */ } location.reload(); },
    byId(id) { return data.activities.find((a) => a.id === id); },
    children(id) { return data.activities.filter((a) => a.parent === id); },
    depth(a) { let d = 0, p = a; while (p && p.parent) { p = S.byId(p.parent); d++; } return d; },
    maxDepth() { return data.activities.reduce((m, a) => Math.max(m, S.depth(a) + (S.children(a.id).length ? 1 : 0)), 0); },
    newId() { data.seq = (data.seq || 1) + 1; return 'n' + Date.now().toString(36) + data.seq; },
    // listeners
    _subs: [],
    on(fn) { this._subs.push(fn); },
    emit(what) { this._subs.forEach((f) => f(what)); },
  };
  return S;
})();
