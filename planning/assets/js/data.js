/* Demo data — taken from the live LIM app recording (project "Amazon").
   Names, organizations, floors, sites, dates and progress come from the recording.
   Where the recording only showed a truncated value ("Furniture Migra…"), the
   value is completed here and marked with  // completed  so it can be swapped for API data. */
window.LIM_DATA = (function () {
  // Today = the viewer's current date (olive line). Last updated = when the planning data was last
  // updated (red line, "Last updated on: 27.10.2026" in the live app).
  const now = new Date();
  const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // cat: row category from the legend → criticalDate | volNormal | volCritical | other (lavender rows in the live app)
  const A = (id, name, o) => Object.assign({
    id, name, parent: null, org: 'Not Available', discipline: '', floors: [], site: '', building: '', zones: [], phase: '', subPhase: '',
    start: '', end: '', prevStart: '', prevEnd: '', progress: 0, cat: '', volumeActual: 0, staff: 0, logisticPath: '', logisticCategory: '',
    clientName: '', status: 'In Progress', material: '', data: ['', '', '', '', ''], outline: '', criticalDate: '', criticalReason: '', constructionLevel: '', notes: [],
  }, o);

  const ACTIVITIES = [
    A('a1', 'Activity-1', { floors: ['Floor-1', 'Floor-2'], site: 'Bridge Skeleton', start: '2026-10-07', end: '2027-12-12', progress: 5 }),
    A('a2', 'Activity-2', { floors: ['Floor-01042026'], site: 'Admin Site', start: '2026-01-28', end: '2026-11-04', progress: 97, cat: 'criticalDate', criticalDate: '2026-11-04' }),
    A('a3', 'Date Activity', { floors: ['Floor-1', 'Floor-2', 'Floor-01042026', 'F 89', '16/9 Floor', '14/9 Floor'], site: 'Bridge Skeleton', building: 'Admin Building Area, Court', zones: ['SD1', 'tyy'],
      start: '2023-08-24', end: '2028-03-26', prevStart: '2024-01-28', prevEnd: '2028-03-26', progress: 69, criticalDate: '2026-01-15' }),
    A('a4', 'Wood Cutting', { floors: ['Level-1', 'Floor-1'], site: 'Bridge Skeleton', start: '2021-01-01', end: '2026-01-17', progress: 100 }),
    A('a5', 'Furniture Migration' /* completed */, { org: 'Wooders Team' /* completed */, floors: ['Level-1', 'Storage'], site: 'Bridge Skeleton', start: '2026-01-01', end: '2027-11-30', progress: 43 }),
    A('a6', 'Blah Activity', { org: 'Madagascar', floors: ['Floor-1', 'Floor-2'], site: 'Admin Site', start: '2026-02-01', end: '2026-12-31', progress: 80 }),
    A('a61', 'Sub of Blah', { parent: 'a6', org: 'Madagascar', site: 'Bridge Skeleton', start: '2026-01-25', end: '2026-12-24', progress: 82 }),
    A('a7', 'Tree House Activity' /* completed */, { floors: ['Level-1', 'Storage'], site: 'Bridge Skeleton', start: '2026-10-07', end: '2027-03-05', progress: 13 }),
    A('a71', 'Roof top Improvement' /* completed */, { parent: 'a7', floors: ['16/9 Floor'], site: 'Bridge Skeleton', start: '2026-02-01', end: '2026-06-30', progress: 100 }),
    A('a72', 'Wooden window' /* completed */, { parent: 'a7', org: 'Madagascar', floors: ['Floor-1', '14/9 Floor'], site: 'Bridge Skeleton', start: '2026-01-29', end: '2027-10-19', progress: 43, cat: 'volNormal' }),
    A('a8', 'Local Court for Madagascar' /* completed */, { org: 'Madagascar', floors: ['F45'], site: 'Site AB', start: '2021-06-03', end: '2022-12-13', progress: 100, cat: 'criticalDate', criticalDate: '2022-12-13' }),
    A('a81', 'Court A', { parent: 'a8', org: 'Madagascar', floors: ['F45'], site: 'Site AB', start: '2025-01-31', end: '2027-12-31', progress: 60, cat: 'criticalDate', criticalDate: '2027-12-31' }),
    A('a9', 'District Court Office' /* completed */, { org: 'Madagascar', floors: ['F45'], site: 'Site AB', start: '2024-05-21', end: '2027-10-06', progress: 72, cat: 'volNormal' }),
    A('a10', 'Door Build for Tower' /* completed */, { org: 'Madagascar', floors: ['Level-1', 'Floor-1'], site: 'Bridge Skeleton', start: '2023-01-16', end: '2023-06-15', progress: 100, cat: 'volNormal' }),
    A('a11', 'Relief Center', { org: 'Madagascar', floors: ['Floor-3(A)'], site: 'Bridge Skeleton', start: '2022-02-25', end: '2026-01-19', progress: 100, cat: 'volNormal' }),
    A('a12', 'Chocolate supply' /* completed */, { org: 'Swan Inc.', floors: ['Level-1', 'Floor-1'], site: 'Bridge Skeleton', start: '2023-01-05', end: '2025-04-11', progress: 100 }),
    A('a13', 'Highlighter Tower' /* completed */, { org: 'Madagascar', start: '2024-06-18', end: '2027-06-13', progress: 79, cat: 'volNormal' }),
    A('a131', 'Tower 2', { parent: 'a13', floors: ['Floor-1'], site: 'Playground' /* completed */, start: '2026-03-26', end: '2028-07-15', progress: 26 }),
    A('a80', 'Activity 80', { floors: ['Storage'], site: 'Bridge Skeleton', start: '2026-10-20', end: '2026-11-03', progress: 36, cat: 'other' }),
    A('a81b', 'Activity 81', { site: 'Admin Site', start: '2026-10-21', end: '2026-11-04', progress: 38, cat: 'other' }),
    A('a82', 'Activity 82', { site: 'Admin Site', start: '2026-10-21', end: '2026-11-04', progress: 38, cat: 'other' }),
    A('a83', 'Activity 83', { site: 'Admin Site', start: '2026-10-21', end: '2026-11-04', progress: 38, cat: 'other' }),
    A('a84', 'Activity 84', { floors: ['Storage'], site: 'Admin Site', start: '2026-10-21', end: '2026-11-04', progress: 38, cat: 'other' }),
  ];

  // Finish-to-start dependencies (predecessor → successor), as drawn in the live app
  const DEPS = [
    ['a4', 'a3'], ['a3', 'a1'], ['a4', 'a5'], ['a5', 'a6'], ['a6', 'a7'], ['a3', 'a2'],
    ['a8', 'a9'], ['a9', 'a10'], ['a11', 'a13'], ['a12', 'a13'], ['a3', 'a80'],
  ];

  // Assign Zone panel: site → building → floor → zones (values from the live app)
  const ZONES = {
    sites: ['Bridge Skeleton', 'Site AB'],
    buildings: ['Admin Building Area', 'Court'],
    floors: {
      'Floor-1': ['Bedroom Zone Shape', 'Bedroom Zone Shape(1)', 'Bedroom Zone Shape(1)(1)', 'Kitchen Cabinet', 'Lobby'],
      'Floor-2': ['Bedroom Zone Shape', 'Bedroom Zone Shape(1)', 'Bedroom Zone Shape(1)(1)'],
      'Floor-01042026': ['SD1', 'tyy'],
      'F 89': [], '14/9 Floor': [], '16/9 Floor': [],
    },
  };

  const PROJECTS = ['Amazon', 'Site_Roche', 'pRed Basel']; // project switcher; only "Amazon" has demo data

  return { TODAY, ACTIVITIES, DEPS, ZONES, PROJECTS, LAST_UPDATED: '2026-10-27' };
})();
