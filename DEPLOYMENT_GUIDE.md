# Foodies App - Deployment Guide

## Building APK for Android Deployment

This guide will help you create a deployable APK file that you can share with users for testing.

---

## Prerequisites

Before building, ensure you have:
- ✅ Expo CLI installed (`npm install -g expo-cli` or `npm install -g eas-cli`)
- ✅ All dependencies installed (`npm install`)
- ✅ Expo account (create one at https://expo.dev)

---

## Method 1: Using EAS Build (Recommended - Most Professional)

EAS (Expo Application Services) is the recommended way to build production-ready apps.

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

### Step 3: Configure EAS Build

```bash
eas build:configure
```

This will create an `eas.json` file in your project.

### Step 4: Build APK for Android

```bash


```

**Options:**
- Use `--profile preview` for APK (installable file)
- Use `--profile production` for AAB (for Google Play Store)

### Step 5: Download the APK

Once the build completes (takes 10-20 minutes), you'll get a download link.
You can also find it at: https://expo.dev/accounts/[your-account]/projects/foodies-app/builds

---

## Method 2: Using Expo Build (Classic - Simpler)

### Step 1: Login to Expo

```bash
npx expo login
```

### Step 2: Build APK

```bash
npx expo build:android -t apk
```

**Note:** This will upload your code to Expo's servers and build the APK.

### Step 3: Download the APK

After the build completes, download the APK from the provided link or:

```bash
npx expo build:android -t apk --download
```

---

## Method 3: Local Build (Development APK - Fastest)

For quick testing without uploading to Expo servers:

### Step 1: Start Development Build

```bash
npx expo run:android
```

This will create a development build on your connected Android device or emulator.

### Step 2: Generate APK Locally

If you have Android Studio installed:

```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

## Recommended Build Configuration

Create or update `eas.json` with these profiles:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  }
}
```

---

## Important: Update app.json Before Building

Make sure your `app.json` has all required fields:

```json
{
  "expo": {
    "name": "Foodies",
    "slug": "foodies-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#5B5FDE"
    },
    "android": {
      "package": "com.yourname.foodies",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#5B5FDE"
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

---

## Step-by-Step: Quick Deployment (Recommended for Testing)

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login
```bash
eas login
```

### 3. Configure (first time only)
```bash
eas build:configure
```

### 4. Build APK
```bash
eas build --platform android --profile preview
```

### 5. Wait for Build
The build process takes about 10-20 minutes. You'll see progress in the terminal.

### 6. Download APK
Once complete, you'll get a download link. Download the APK file.

### 7. Share APK
Send the APK file to users via:
- Email
- Google Drive
- Dropbox
- USB transfer

### 8. Installation on Devices
Users need to:
1. Enable "Install from Unknown Sources" on their Android device
2. Download the APK
3. Tap the APK file to install
4. Open the Foodies app

---

## Testing the APK

Before sharing with all users:

1. **Install on your device** - Test all features
2. **Check on different devices** - Various screen sizes
3. **Test offline behavior** - Network disconnection handling
4. **Verify Supabase connection** - Ensure production database is accessible
5. **Test all user flows** - Registration, ordering, checkout, etc.

---

## Common Issues & Solutions

### Issue: "App not installed" error
**Solution:**
- Uninstall any previous versions
- Enable "Install from Unknown Sources"
- Check available storage space

### Issue: Build fails with "Invalid credentials"
**Solution:**
```bash
eas login
```
Re-authenticate with your Expo account.

### Issue: APK is too large
**Solution:**
- Remove unused assets
- Optimize images
- Use `--profile production` for smaller builds

### Issue: App crashes on startup
**Solution:**
- Check if Supabase credentials are correct
- Verify all environment variables are set
- Test in development mode first

---

## Distribution Options

### For Testing (Capstone):
1. **Direct APK sharing** - Send APK file directly to testers
2. **Google Drive/Dropbox** - Upload and share link
3. **Expo Go** - Quick preview without building (limited features)

### For Production (Future):
1. **Google Play Store** - Official app store distribution
2. **APK distribution platforms** - APKPure, APKMirror (for wider reach)
3. **Internal distribution** - TestFlight, Firebase App Distribution

---

## Quick Commands Reference

```bash
# Login to Expo
eas login

# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production

# Check build status
eas build:list

# Download specific build
eas build:download --platform android --latest
```

---

## Environment Variables for Production

Make sure to set up production environment variables:

1. Create `.env.production` file (if not already)
2. Add your production Supabase credentials
3. Ensure no development URLs are hardcoded

---

## Final Checklist Before Deployment

- [ ] All features tested and working
- [ ] Supabase credentials are production-ready
- [ ] App version updated in `app.json`
- [ ] App icon and splash screen are finalized
- [ ] Permissions are correctly configured
- [ ] No console.log statements in production code
- [ ] Error handling is in place
- [ ] Build completed successfully
- [ ] APK tested on multiple devices
- [ ] User testing questionnaire prepared

---

## Next Steps After Building

1. **Download the APK** from the build link
2. **Install on test devices** to verify functionality
3. **Share with test users** for capstone evaluation
4. **Collect feedback** using the questionnaire
5. **Iterate and rebuild** if needed

---

## Support

If you encounter issues:
- Check Expo documentation: https://docs.expo.dev/
- EAS Build docs: https://docs.expo.dev/build/introduction/
- Expo Discord: https://chat.expo.dev/

---

**Good luck with your deployment! 🚀**
