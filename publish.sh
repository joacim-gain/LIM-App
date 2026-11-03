#!/bin/sh
# Copies the working demos into this repo and pushes to joacim-gain/LIM-Site (GitHub Pages).
#   planning/ <- ../lim-planning-demo     site/ <- ../lim-site-demo
set -e
cd "$(dirname "$0")"
rsync -a --delete --exclude .git --exclude .DS_Store --exclude .gitignore ../lim-planning-demo/ planning/
rsync -a --delete --exclude .git --exclude .DS_Store --exclude .gitignore ../lim-site-demo/ site/
git add -A
git diff --cached --quiet && { echo "Nothing changed."; exit 0; }
git commit -q -m "${1:-Update demos}"
git push -q origin main
echo "Published: https://joacim-gain.github.io/LIM-Site/"
