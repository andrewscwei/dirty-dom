#!/bin/bash

echo "//registry.npmjs.org/:_authToken=$NPM_AUTH" >> ~/.npmrc
npm publish
echo "Successfully published to NPM"