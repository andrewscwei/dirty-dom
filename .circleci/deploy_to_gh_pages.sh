#!/bin/bash

if [ `git branch | grep gh-pages` ]; then
  git branch -D gh-pages
fi

git checkout -b gh-pages
npm run build:demo

# Move generated demo to root and delete everything else.
find . -maxdepth 1 ! -name '.' ! -name '..' ! -name 'demo' ! -name '.git' ! -name '.gitignore' -exec rm -rf {} \;
mv demo/build/* .
rm -R demo/

# Push to gh-pages.
ORIGIN_URL=`git config --get remote.origin.url`

git config user.name "$CIRCLE_PROJECT_USERNAME"
git config user.email "$CIRCLE_PROJECT_USERNAME@users.noreply.github.com"
git add -fA
git commit --allow-empty -m "[Skip CI] $(git log -1 --pretty=%B)"
git push -f $ORIGIN_URL gh-pages

echo "Successfully published docs to GitHub Pages"