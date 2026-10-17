#!/usr/bin/env bash
set -euo pipefail
npm install
npm run build
if [ ! -f android/gradlew ]; then
  npx cap add android
fi
npx cap sync android
cd android
chmod +x gradlew
./gradlew assembleDebug
printf '\nAPK output: android/app/build/outputs/apk/debug/app-debug.apk\n'
