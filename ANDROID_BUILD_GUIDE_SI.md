# SB Crypto Trading Signals — Android APK Build Guide (සිංහල)

මෙය මුල් React + TypeScript app එකට Capacitor Android wrapper එකක් එක් කළ source project එකයි. මෙම ZIP එක තුළ දැනටමත් build කරපු APK එකක් හෝ generated `android/` Gradle project එකක් අඩංගු නොවේ; `android/` project එක පළමු වරට සෑදීමට Android Studio/SDK සහ internet access අවශ්‍ය වේ.

## අවශ්‍ය දේ
- Node.js 22 හෝ ඊට අලුත් compatible LTS release එකක්
- npm
- Android Studio (Android SDK සහ Build Tools සමඟ)
- Java JDK 21

## Windows පරිගණකයක APK හදන ක්‍රමය
1. ZIP එක Extract කරන්න.
2. Extract කළ folder එක තුළ Terminal / PowerShell එකක් විවෘත කරන්න.
3. Dependencies install කරන්න:
   ```bash
   npm install
   ```
4. Web app එක build කරන්න:
   ```bash
   npm run build
   ```
5. Android native project එක පළමු වරට සාදන්න:
   ```bash
   npm run android:init
   ```
6. Web assets Android project එකට sync කරන්න:
   ```bash
   npx cap sync android
   ```
7. Android Studio තුළ project එක විවෘත කරන්න:
   ```bash
   npx cap open android
   ```
8. Android Studio එක Gradle sync සහ SDK setup අවසන් කරන තුරු ඉන්න. ඉන්පසු **Build > Build Bundle(s) / APK(s) > Build APK(s)** තෝරන්න.
9. Debug APK එක සාමාන්‍යයෙන් මෙහි ලැබේ:
   `android/app/build/outputs/apk/debug/app-debug.apk`

## Command line build (Android SDK නිවැරදිව සකසා තිබිය යුතුයි)
```bash
npm install
npm run build
npx cap add android   # පළමු වරට පමණයි
npx cap sync android
cd android
./gradlew assembleDebug     # macOS/Linux
# Windows: gradlew.bat assembleDebug
```

## වැදගත් කරුණු
- App එකේ මුල් source code එක වෙනස් කරලා නැහැ; Capacitor config, scripts සහ build guide එක පමණක් එක් කර ඇත.
- Debug APK එකේ signing key එක debug key එකයි. Public distribution සඳහා ඔබගේම release keystore එකක් සාදා, ආරක්ෂිතව තබාගෙන release signing configure කරන්න. Keystore/password කිසිවෙකුට share නොකරන්න.
- Play Protect warning එක signing හෝ wrapper එක වෙනස් කිරීමෙන් අනිවාර්යයෙන් ඉවත් වෙන්නේ නැහැ. Google Play Protect එක අක්‍රිය නොකර, APK එකේ source, permissions, dependencies සහ network behavior පරීක්ෂා කරන්න.
- මේ ZIP එකෙන් APK build කළ හැකි project එකක් සකස් කරයි; මෙතැනින් actual Android Gradle build එක ධාවනය කර APK output එක verify කර නැත.
- Market data සහ authentication features සඳහා internet අවශ්‍ය වේ. `.env.example` හි Gemini/API secrets තිබේ නම් ඒවා client-side bundle එකට hard-code නොකරන්න. Production API keys server-side තබන්න.
