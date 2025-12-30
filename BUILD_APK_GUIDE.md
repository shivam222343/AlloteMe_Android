# 📱 APK Build Guide for Mavericks Mobile

## Prerequisites
1. **Expo Account**: You need an Expo account to use EAS Build
2. **EAS CLI**: Already configured in your project

## Step-by-Step Build Process

### Option 1: EAS Build (Recommended - Cloud Build)

#### Step 1: Login to Expo
```bash
npx eas-cli login
```
Enter your Expo credentials when prompted.

#### Step 2: Build the APK
```bash
npx eas-cli build --platform android --profile preview
```

This will:
- Upload your project to Expo's build servers
- Build an APK file (not AAB)
- Provide a download link when complete

**Build Time**: Usually 10-20 minutes

#### Step 3: Download the APK
Once the build completes, you'll get a download link. The APK will be available at:
- Expo dashboard: https://expo.dev/accounts/[your-account]/projects/mavericks-mobile/builds
- Direct download link in the terminal

---

### Option 2: Local Build with Expo (Alternative)

If you want to build locally without EAS:

#### Step 1: Install Expo CLI globally
```bash
npm install -g expo-cli
```

#### Step 2: Build APK locally
```bash
expo build:android -t apk
```

**Note**: This method is deprecated but still works for simple builds.

---

## Build Profiles Explained

Your `eas.json` has three profiles:

1. **development**: For development builds with debugging
2. **preview**: For APK builds (what you want) ✅
3. **production**: For Google Play Store AAB files

---

## Troubleshooting

### Issue: "Not logged in"
**Solution**: Run `npx eas-cli login` first

### Issue: "Project not configured"
**Solution**: Run `npx eas-cli build:configure`

### Issue: Build fails
**Solution**: Check the build logs at expo.dev for detailed error messages

---

## Quick Commands Reference

```bash
# Login to Expo
npx eas-cli login

# Check login status
npx eas-cli whoami

# Build APK
npx eas-cli build --platform android --profile preview

# View build status
npx eas-cli build:list

# View build details
npx eas-cli build:view [build-id]
```

---

## After Building

1. Download the APK from the provided link
2. Transfer to your Android device
3. Enable "Install from Unknown Sources" in device settings
4. Install the APK

---

## Important Notes

- **First Build**: May take longer (15-25 minutes)
- **Subsequent Builds**: Faster due to caching (10-15 minutes)
- **APK Size**: Expect ~50-80MB depending on assets
- **Validity**: APK builds are stored for 30 days on Expo servers

---

## Next Steps

After you run the build command, I recommend:
1. Keep the terminal open to monitor progress
2. Check your email for build completion notification
3. Visit expo.dev to track build status visually
