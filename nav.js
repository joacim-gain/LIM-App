/* LIM-App switching between modules — added to every demo page by publish.sh (working folders stay untouched).
   Side nav: Sites icon → Site demo, Planning icon → latest Planning page. Amberg logo / LIM logo → start page. LIM logo favicon. */
(function () {
  const PLANNING = '../planning/single-line.html'; // latest Planning page — update when Planning moves to a newer file
  const SITE = '../site/';
  const here = location.pathname.includes('/planning/') ? 'planning' : 'site';
  const target = (el) => {
    const key = el.dataset.nav || el.textContent.trim();
    if (key === 'Sites' || key === 'layers_clear') return here === 'site' ? null : SITE;
    if (key === 'Planning' || key === 'event_note') return here === 'planning' ? null : PLANNING;
    return null;
  };
  document.addEventListener('click', (e) => {
    const logo = e.target.closest('img[alt="Amberg Loglay"], img[alt="LIM"]');
    if (logo) { location.href = '../'; return; }
    const item = e.target.closest('.sn-item');
    const url = item && target(item);
    if (url) { e.stopPropagation(); e.preventDefault(); location.href = url; }
  }, true);
  const mark = () => {
    document.querySelectorAll('img[alt="Amberg Loglay"], img[alt="LIM"]').forEach((l) => { l.style.cursor = 'pointer'; l.title = 'All modules'; });
    document.querySelectorAll('.sn-item').forEach((i) => { if (target(i)) i.style.cursor = 'pointer'; });
  };
  // LIM logo favicon on every module page
  document.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove());
  const fav = document.createElement('link'); fav.rel = 'icon'; fav.type = 'image/svg+xml'; fav.href = '../lim-logo.svg';
  document.head.appendChild(fav);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
  setTimeout(mark, 500);
})();
