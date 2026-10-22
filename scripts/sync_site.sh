#!/usr/bin/env sh
# Copy the character principles, system prompts and artwork from the Shiny app
# into the GitHub Pages site. The app folder is the single source of truth;
# docs/content and docs/images are generated and not tracked in git.
# Run from anywhere; it resolves the repository root itself.
set -eu
cd "$(dirname "$0")/.."
mkdir -p docs/content docs/images
rm -f docs/content/*.md docs/images/*.png
cp app/*.md docs/content/
cp app/www/*.png docs/images/
echo "Synced $(ls docs/content/*.md | wc -l | tr -d ' ') content files and $(ls docs/images/*.png | wc -l | tr -d ' ') images into docs/"
