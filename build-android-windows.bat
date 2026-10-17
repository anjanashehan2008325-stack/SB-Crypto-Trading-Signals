@echo off
setlocal
call npm install
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1
if not exist android\gradlew.bat (
  call npx cap add android
  if errorlevel 1 exit /b 1
)
call npx cap sync android
if errorlevel 1 exit /b 1
cd android
call gradlew.bat assembleDebug
if errorlevel 1 exit /b 1
echo.
echo APK output: android\app\build\outputs\apk\debug\app-debug.apk
endlocal
