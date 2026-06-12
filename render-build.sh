#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing backend dependencies ==="
cd backend
npm install
cd ..

echo "=== Installing frontend dependencies ==="
cd frontend
npm install
echo "=== Building frontend ==="
npx ng build --configuration production
cd ..

echo "=== Build complete! ==="
