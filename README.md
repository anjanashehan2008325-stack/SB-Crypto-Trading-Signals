# SB Crypto Trading Signals

React + TypeScript web app with a Capacitor Android project setup.

## Web app development
Requirements: Node.js 22+, npm.

```bash
npm install
npm run dev
```

## Build Android APK
Requirements: Node.js 22+, Android Studio with Android SDK, and JDK 21.

```bash
npm install
npm run build
npx cap add android   # run only once to generate android/
npx cap sync android
npx cap open android
```

On Windows, you can also run `build-android-windows.bat`; on macOS/Linux, run `./build-android-macos-linux.sh`. These scripts install dependencies, build the web assets, generate the Android project if needed, sync it, and build a debug APK.

In Android Studio, wait for Gradle sync, then choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**. The debug APK is usually written to `android/app/build/outputs/apk/debug/app-debug.apk`.

See [ANDROID_BUILD_GUIDE_SI.md](ANDROID_BUILD_GUIDE_SI.md) for Sinhala instructions, release signing notes, and troubleshooting.

## Security note
Do not put production API secrets in frontend `.env` variables. A Play Protect warning is not proof of malware or proof of safety; review the app, dependencies, permissions, signing certificate, and network behavior before installing or distributing it.
