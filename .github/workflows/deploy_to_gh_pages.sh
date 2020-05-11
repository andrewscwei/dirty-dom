#!/bin/bash

# Required environment variables:
# - GH_USER: Name of GitHub user to use for the commit
# - GH_PAGES_DIR: Directory (relative to project root) to deploy to GitHub Pages
# - GH_TOKEN: GitHub auth token for write permissions

GH_PAGES_DIR=${GH_PAGES_DIR:-.gh-pages}
GH_USER=${GH_USER:-$GITHUB_ACTOR}
ORIGIN_URL="https://$GH_USER:$GH_TOKEN@github.com/$GITHUB_REPOSITORY.git"

# Checkout new branch.
if [ `git branch | grep gh-pages` ]; then git branch -D gh-pages; fi
git checkout -b gh-pages

# Build and move generated files to root, then delete everything else.
npm run pages
find . -maxdepth 1 ! -name '.' ! -name '..' ! -name ${GH_PAGES_DIR} ! -name '.git' ! -name '.gitignore' -exec rm -rf {} \;
mv ${GH_PAGES_DIR}/* .
rm -R ${GH_PAGES_DIR}/

# Push to gh-pages.
git config user.name "$GH_USER"
git config user.email "$GH_USER@users.noreply.github.com"
git add -fA
git commit --allow-empty -m "[SKIP CI] $(git log -1 --pretty=%B)"
git push -f $ORIGIN_URL gh-pages

echo "Successfully published docs to GitHub Pages"
