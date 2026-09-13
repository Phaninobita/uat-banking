# 📱 Gringotts Bank — Android Mobile Application

This directory contains the complete native Android project for the **Gringotts Bank Customer Portal**, encapsulating:
- **Commercial Registration (CRN) & Email Authentication**
- **5-Stage Silky Converging OTP Morphing Animation**
- **Complete 7-Stage Corporate Onboarding & Vault Access Portal**:
  1. Document Vault (KYC Uploads & OCR preview)
  2. Company Profile & Trade License
  3. Ultimate Beneficial Owners (UBO) Verification
  4. Ownership Structure & Cap Table Builder
  5. Access & Roles (Maker / Checker mandates)
  6. Tax & Compliance (FATCA / CRS self-certification)
  7. Review & Canvas Digital Signature Declaration
- **Strict Customer Isolation**: All Relationship Manager (RM) routes and assets are completely excluded.

---

## 📂 Project Structure

```
banking-demo/
├── android/                         <-- Native Android Studio Project
│   ├── build.gradle                 <-- Top-level Gradle build script
│   ├── settings.gradle              <-- Module inclusion (':app')
│   ├── gradle.properties            <-- JVM & AndroidX properties
│   ├── gradlew.bat                  <-- Gradle wrapper for Windows
│   └── app/
│       ├── build.gradle             <-- App module (minSdk 24, targetSdk 34)
│       └── src/main/
│           ├── AndroidManifest.xml  <-- Camera, Storage, Network permissions
│           ├── java/com/gringotts/banking/
│           │   └── MainActivity.java<-- Hardware-accelerated WebView & Native Bridge
│           ├── res/
│           │   ├── layout/activity_main.xml
│           │   ├── values/ (strings, colors, themes)
│           │   └── xml/network_security_config.xml <-- Cleartext local gateway allowed
│           └── assets/public/       <-- Bundled Customer Portal Web Assets
│               ├── index.html       <-- Customer Portal
│               ├── css/style.css    <-- 5-stage OTP morph & Gringotts theme
│               └── js/
│                   ├── android-bridge.js <-- Bridge, haptics & back-button
│                   ├── api.js       <-- Microservices API client
│                   └── app.js       <-- Customer portal state & logic
├── scripts/
│   └── sync-android.js              <-- Syncs web updates to Android assets
└── package.json
```

---

## 🚀 How to Run in Android Studio

1. Open **Android Studio**.
2. Select **Open** and choose the `android/` folder inside this repository:
   ```
   C:\DEVELOPMENT\banking-demo\banking-demo\android
   ```
3. Android Studio will automatically index the project and sync Gradle dependencies.
4. Select an Android Virtual Device (AVD) or connect a physical Android phone via USB with USB Debugging enabled.
5. Click the green **Run (▶)** button.

---

## 🛠️ How to Build APK from Command Line

To build the debug APK directly:

```powershell
cd android
.\gradlew.bat assembleDebug
```

The compiled APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🌐 Connecting to the Backend API Gateway

The Android app communicates with your local microservices API Gateway running on port `3000` (`node web/server.js`):

| Device Type | Default API Gateway Address | Note |
|---|---|---|
| **Android Emulator** | `http://10.0.2.2:3000` | Pre-configured out of the box in `MainActivity.java`. Android Emulator maps `10.0.2.2` directly to host machine `localhost`. |
| **Physical Android Phone (WiFi)** | `http://<YOUR_PC_LOCAL_IP>:3000` | Ensure your phone and PC are on the same Wi-Fi network. |

### Quick Endpoint Switcher on Device
You can change the API gateway address at any time on a running phone:
- **Tap the "GB" Logo / Header 5 times** in the login screen.
- A dialog will appear allowing you to enter your PC's Wi-Fi IP (e.g. `http://192.168.1.50:3000`).
- The app will instantly save and route all API calls to that server.

---

## 🔄 Syncing Web Changes into Android

If you make any changes to the customer web portal (`web/public/`), simply run:

```bash
npm run android:sync
```

This updates `android/app/src/main/assets/public/` while guaranteeing all RM portal code remains strictly excluded.
