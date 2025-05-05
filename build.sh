#!/bin/bash

echo "Starting build process..."

# Set NODE_ENV to production
export NODE_ENV=production

# Ensure we're in the correct directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Current directory: $(pwd)"
echo "Checking for client/index.html..."
if [ ! -f "client/index.html" ]; then
  echo "Error: client/index.html not found!"
  exit 1
fi

echo "Building frontend with Vite..."
npx vite build --config ./vite.config.ts

if [ $? -ne 0 ]; then
  echo "Frontend build failed!"
  exit 1
fi

echo "Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

if [ $? -ne 0 ]; then
  echo "Backend build failed!"
  exit 1
fi

echo "Creating dist directory structure if not exists..."
mkdir -p dist/public

echo "Copying any missing assets..."
if [ ! -d "dist/public/assets" ] && [ -d "client/dist/assets" ]; then
  cp -r client/dist/assets dist/public/
fi

echo "Build completed successfully!"