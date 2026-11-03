#!/bin/sh
# Copies the working demos into this repo and pushes to joacim-gain/LIM-App (GitHub Pages).
#   planning/ <- ../lim-planning-demo     site/ <- ../lim-site-demo
set -e
cd "$(dirname "$0")"
rsync -a --delete --exclude .git --exclude .DS_Store --exclude .gitignore ../lim-planning-demo/ planning/
rsync -a --delete --exclude .git --exclude .DS_Store --exclude .gitignore ../lim-site-demo/ site/
# add module switching (nav.js) to every demo page
for f in planning/*.html site/*.html; do
  grep -q '../nav.js' "$f" || perl -0pi -e 's#</body>#<script src="../nav.js"></script>\n</body>#' "$f"
done
git add -A
git diff --cached --quiet && { echo "Nothing changed."; exit 0; }
git commit -q -m "${1:-Update demos}" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin main
echo "Published: https://joacim-gain.github.io/LIM-App/"
