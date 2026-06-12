#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing Yarn globally (npm) ==="
npm i -g yarn   # Yarn 1.x will be installed

echo "=== Running original Render commands ==="
yarn --cwd backend install
yarn --cwd frontend install
yarn --cwd frontend run build --configuration production
