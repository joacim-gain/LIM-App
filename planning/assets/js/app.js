/* App shell: side navigation, app bar, FAB, first render */
(function () {
  const { ms, esc } = UI;
  // Side navigation · icons in the order of the LIM Figma side nav; Planning is active
  const NAV = [
    ['dashboard', 'Dashboard', 'svg'], ['layers_clear', 'Sites'], ['event_note', 'Planning'], ['show_chart', 'Analysis'],
    ['business', 'Project'], ['people', 'Team'], ['cloud_upload', 'File Upload'], ['account_balance', 'DMS'],
  ];
  document.getElementById('snItems').innerHTML = NAV.map(([ic, l, svg]) => `<button class="sn-item ${l === 'Planning' ? 'active' : ''}" data-nav="${l}" data-tip="${l}" data-tip-pos="right">${svg ? '<img src="assets/fig/nav-dashboard.svg" alt="" width="24" height="24">' : ms(ic)}</button>`).join('');
  document.getElementById('snItems').onclick = (e) => { const b = e.target.closest('.sn-item'); if (b && b.dataset.nav !== 'Planning') UI.toast(`${esc(b.dataset.nav)} is not part of this demo. Only Planning is.`); };

  document.getElementById('avatarBtn').onclick = (e) => UI.menu(e.currentTarget, [
    { label: 'Reset demo data', icon: 'restart_alt', onClick: async () => { if (await UI.confirm({ title: 'Reset demo data', text: 'Restore the original activities, dependencies and settings?', ok: 'Reset' })) S.reset(); } },
  ], { width: 220 });

  document.getElementById('projectBtn').onclick = (e) => UI.menu(e.currentTarget, LIM_DATA.PROJECTS.map((p) => ({
    label: p, on: p === 'Amazon', onClick: () => { if (p !== 'Amazon') UI.toast(`Only <b>Amazon</b> has demo data.`); },
  })), { width: 358 });

  document.getElementById('fab').onclick = () => P.addActivity(null);

  // first render · the timeline opens on the period that contains today
  S.view.anchor = T.align(S.view.period, LIM_DATA.TODAY);
  G.applyLevel(S.view.level);
  R.render();
  G.render();
  let t = null;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => G.render(), 80); });
})();
