/* LIM handoff pages: copy buttons, click-to-copy token values, scaled live previews */
(function () {
  function copyText(text, btn, label) {
    const done = () => { btn.dataset.old = btn.dataset.old || btn.textContent; if (label) { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = btn.dataset.old; }, 1500); } else { btn.title = 'Copied'; setTimeout(() => { btn.title = 'Click to copy'; }, 1500); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
  }
  document.querySelectorAll('.copy[data-copy]').forEach((b) => b.addEventListener('click', () => copyText(document.getElementById(b.dataset.copy).textContent, b, true)));
  document.querySelectorAll('.copyv').forEach((b) => { b.title = 'Click to copy'; b.addEventListener('click', () => copyText(b.dataset.v || b.textContent.trim(), b, false)); });

  // scale a 1366px-wide page into its box
  const fit = () => document.querySelectorAll('[data-scale]').forEach((box) => {
    const f = box.querySelector('iframe'); if (!f) return;
    const w = +(f.getAttribute('width') || 1366), s = box.clientWidth / w;
    f.style.transform = `scale(${s})`;
    if (box.dataset.scale === 'height') box.style.height = Math.round(+(f.getAttribute('height') || 800) * s) + 'px';
  });
  addEventListener('resize', fit); fit();
})();
