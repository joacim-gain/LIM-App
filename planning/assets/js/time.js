/* Date helpers + timeline scales for the five Time Periods.
   Column headers follow the LIM Figma frames ("Updated Gantt Chart"):
   Yearly = Jan…Dec · Quarterly = 3 month names · Monthly = 01…31 · Weekly = day number + weekday · Project duration = years */
window.T = (function () {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const P = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const I = (dt) => dt.toISOString().slice(0, 10);
  const add = (iso, n) => { const d = P(iso); d.setUTCDate(d.getUTCDate() + n); return I(d); };
  const addMonths = (iso, n) => { const d = P(iso); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, dim)); return I(d); };
  const diff = (a, b) => Math.round((P(b) - P(a)) / 864e5);
  const dow = (iso) => (P(iso).getUTCDay() + 6) % 7; // Monday = 0
  const ym = (y, m) => I(new Date(Date.UTC(y, m, 1)));
  const weekOfMonth = (iso) => { const d = P(iso); const first = dow(ym(d.getUTCFullYear(), d.getUTCMonth())); return Math.ceil((d.getUTCDate() + first) / 7); };

  const PERIODS = [
    ['yearly', 'Yearly'], ['quarterly', 'Quarterly'], ['monthly', 'Monthly'], ['weekly', 'Weekly'], ['project', 'Project Duration'],
  ];

  // units: [{start, end (exclusive), label, sub}] — every unit gets the same column width.
  // The window starts at `anchor` (see align); the ‹ › arrows slide it by one step.
  function units(period, anchor, range) {
    const a = P(anchor), y = a.getUTCFullYear(), m = a.getUTCMonth();
    const out = [];
    if (period === 'yearly') for (let i = m; i < m + 12; i++) out.push({ start: ym(y, i), end: ym(y, i + 1), label: MONTHS[(i % 12 + 12) % 12].slice(0, 3) });
    if (period === 'quarterly') for (let i = m; i < m + 3; i++) out.push({ start: ym(y, i), end: ym(y, i + 1), label: MONTHS[(i % 12 + 12) % 12] });
    if (period === 'monthly') { const e = addMonths(anchor, 1); for (let d = anchor; d < e; d = add(d, 1)) out.push({ start: d, end: add(d, 1), label: d.slice(8) }); }
    if (period === 'weekly') for (let i = 0; i < 7; i++) { const d = add(anchor, i); out.push({ start: d, end: add(d, 1), label: d.slice(8), sub: DAYS[dow(d)] }); }
    if (period === 'project') { for (let yy = +range[0].slice(0, 4) - 1; yy <= +range[1].slice(0, 4) + 2; yy++) out.push({ start: `${yy}-01-01`, end: `${yy + 1}-01-01`, label: String(yy) }); }
    return out;
  }

  /* scale(period, anchor, range, colW) → {units, colW, width, x(iso), date(x), start, end} */
  function scale(period, anchor, range, colW) {
    const u = units(period, anchor, range);
    const x = (iso) => {
      if (iso <= u[0].start) return -diff(iso, u[0].start) * (colW / Math.max(1, diff(u[0].start, u[0].end)));
      for (let i = 0; i < u.length; i++) {
        if (iso < u[i].end) return i * colW + (diff(u[i].start, iso) / diff(u[i].start, u[i].end)) * colW;
      }
      const last = u[u.length - 1]; return u.length * colW + diff(last.end, iso) * (colW / diff(last.start, last.end));
    };
    const date = (px) => {
      const i = Math.floor(px / colW);
      const uu = u[Math.max(0, Math.min(u.length - 1, i))];
      const days = diff(uu.start, uu.end);
      const frac = (px - Math.max(0, Math.min(u.length - 1, i)) * colW) / colW;
      return add(uu.start, Math.round(frac * days));
    };
    return { units: u, colW, width: u.length * colW, x, date, start: u[0].start, end: u[u.length - 1].end };
  }

  function navLabel(anchor) { const d = P(anchor); return { main: `${d.getUTCFullYear()}, ${MONTHS[d.getUTCMonth()]}`, week: `Week ${weekOfMonth(anchor)}` }; }
  // window start for a date: Yearly = 1 Jan · Quarterly = quarter start · Monthly = 1st · Weekly = Monday
  function align(period, iso) {
    const d = P(iso), y = d.getUTCFullYear(), m = d.getUTCMonth();
    if (period === 'yearly') return ym(y, 0);
    if (period === 'quarterly') return ym(y, Math.floor(m / 3) * 3);
    if (period === 'monthly') return ym(y, m);
    if (period === 'weekly') return add(iso, -dow(iso));
    return iso;
  }
  // one arrow click moves a whole period: Yearly = 1 year · Quarterly = 1 quarter · Monthly = 1 month · Weekly = 1 week
  const STEP_LABEL = { yearly: 'year', quarterly: 'quarter', monthly: 'month', weekly: 'week' };
  function step(period, anchor, dir) {
    if (period === 'yearly') return addMonths(anchor, 12 * dir);
    if (period === 'quarterly') return addMonths(anchor, 3 * dir);
    if (period === 'monthly') return addMonths(anchor, dir);
    if (period === 'weekly') return add(anchor, 7 * dir);
    return anchor;
  }

  return { MONTHS, DAYS, PERIODS, P, I, add, addMonths, diff, dow, scale, navLabel, align, step, STEP_LABEL };
})();
