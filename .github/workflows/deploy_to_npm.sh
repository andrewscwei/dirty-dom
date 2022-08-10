#!/bin/bash

# Required environment variables:
# - NPM_AUTH: NPM auth token

echo "//registry.npmjs.org/:_authToken=$NPM_AUTH" >> ~/.npmrc

if npm publish; then
  echo "Successfully published to NPM"
else
  echo "Failed to publish to NPM"
  exit 1
fi
