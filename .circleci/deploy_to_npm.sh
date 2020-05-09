#!/bin/bash

# Required environment variables:
# - NPM_AUTH: NPM auth token

echo "//registry.npmjs.org/:_authToken=$NPM_AUTH" >> ~/.npmrc
npm publish
echo "Successfully published to NPM"