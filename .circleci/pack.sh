#!/bin/bash

PACKAGE_FILE=$(npm pack | tail -1)
mkdir -p package
mv $PACKAGE_FILE package/
