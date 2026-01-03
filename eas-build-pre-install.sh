#!/usr/bin/env bash

set -euo pipefail

echo "Running pre-install hook to configure Android dependencies..."

# Run jetifier to convert old Android Support libraries to AndroidX
npx jetifier
