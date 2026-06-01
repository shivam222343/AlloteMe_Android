# Google OAuth Configuration Guide

## Current App Information

### Package Name
**`com.alloteme0077.app`**

### Google Client IDs

#### Mobile (Android)
- **Client ID**: `291149459575-j0g5nnm06egi7ndopgr29kr3326ka0ef.apps.googleusercontent.com`
- **Project ID**: `auraandroid-ac697`
- **Location**: `google-services.json`

#### Web (React)
- **Client ID**: `1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com`
- **Location**: `App.js` and `src/config/googleConfig.js`

---

## How to Find SHA Fingerprint

### Method 1: Generate from Existing Keystore (If Available)

If you have a release keystore file:

```bash
# For release keystore
keytool -list -v -keystore <path-to-release.keystore> -alias <alias-name> -storepass <password> -keypass <password>

# For debug keystore (usually in ~/.android/debug.keystore)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**On Windows**, use:
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Method 2: Generate SHA Fingerprints Using EAS (Expo)

Since your app uses Expo, use this command:

```bash
eas credentials
```

This will show your SHA fingerprints for both debug and release builds.

### Method 3: View in Google Play Console

If you've published the app:
1. Go to Google Play Console
2. Select your app
3. Navigate to **Setup → App integrity**
4. Under **App signing**, you'll see the SHA-1 fingerprint

---

## Fix for Google OAuth Not Working on Web

### Issue
The web version uses a different Google Client ID than what might be configured. The web app needs proper CORS configuration.

### Solution Steps

#### 1. Update Web OAuth Configuration in `alloteme-web/src/App.jsx`

Make sure the web app wraps the router with `GoogleOAuthProvider`:

```jsx
import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const GOOGLE_WEB_CLIENT_ID = '1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
      <Router>
        {/* Your routes */}
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
```

#### 2. Configure Google OAuth Credentials

Go to [Google Cloud Console](https://console.cloud.google.com/):

1. **Select your project** (find the one with ID: `auraandroid-ac697` or `1015159418208`)
2. Navigate to **APIs & Services → Credentials**
3. Find your **Web Client ID** credential (`1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com`)
4. Click on it and ensure:

**Authorized JavaScript Origins:**
```
http://localhost:3000
http://localhost:5173
https://alloteme.netlify.app
https://your-production-domain.com
```

**Authorized Redirect URIs:**
```
http://localhost:3000
http://localhost:5173
https://alloteme.netlify.app
https://your-production-domain.com
```

#### 3. Create Environment Variables File

Create `.env` in `alloteme-web/` directory:

```env
VITE_GOOGLE_CLIENT_ID=1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com
```

Then use in your app:
```jsx
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
```

#### 4. Fix CORS Issues (If Persisting)

If you're still getting CORS errors, the issue might be in your backend. Update `CounselMe/backend/controllers/authController.js`:

```javascript
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Add proper CORS headers when verifying tokens
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

#### 5. Verify Google Sign-In in Frontend

Update your login component to properly handle errors:

```javascript
import { useGoogleLogin } from '@react-oauth/google';

export const GoogleLoginButton = () => {
  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      console.log('Login Success:', codeResponse);
      // Send codeResponse.credential to your backend
    },
    onError: () => {
      console.error('Login Failed');
    },
    flow: 'implicit', // or 'auth-code' depending on your setup
  });

  return <button onClick={() => login()}>Sign in with Google</button>;
};
```

---

## Android SHA Fingerprint Configuration

#### Your Current SHA-1 Fingerprint (Verified ✓)

```
E1:B9:8E:7B:DE:43:2B:DF:25:77:86:76:CA:49:79:0A:05:F5:BA:2F
```

**OAuth 2.0 Client Name**: Android client 1  
**Package Name**: `com.alloteme0077.app`  
**Status**: Already configured in Google Cloud Console

### Add to Google Cloud Console (Already Done ✓)

The following has been configured in Google Cloud Console:
1. ✓ OAuth 2.0 Client ID created for Android
2. ✓ SHA-1 certificate fingerprint added: `E1:B9:8E:7B:DE:43:2B:DF:25:77:86:76:CA:49:79:0A:05:F5:BA:2F`
3. ✓ Package name: `com.alloteme0077.app`

**Note**: Changes may take 5 minutes to a few hours to take effect in Google's systems.

### Update `google-services.json`

The file should contain:

```json
{
  "project_info": {
    "project_number": "291149459575",
    "project_id": "auraandroid-ac697"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:291149459575:android:f55d199aec72519ebe1672",
        "android_client_info": {
          "package_name": "com.alloteme0077.app"
        }
      },
      "oauth_client": [
        {
          "client_id": "291149459575-j0g5nnm06egi7ndopgr29kr3326ka0ef.apps.googleusercontent.com",
          "client_type": 3
        }
      ]
    }
  ]
}
```

---

## Troubleshooting

### ⚠️ Android OAuth Not Working - Common Issues

**Issue 1: Using `webClientId` instead of `androidClientId` ✗ FIXED**

The configuration was using the wrong client ID type. Update [src/config/googleConfig.js](src/config/googleConfig.js):

```javascript
// ❌ WRONG - This won't work for Android
GoogleSignin.configure({
  webClientId: '1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com',
});

// ✅ CORRECT - Use androidClientId for Android
GoogleSignin.configure({
  androidClientId: '291149459575-j0g5nnm06egi7ndopgr29kr3326ka0ef.apps.googleusercontent.com',
  webClientId: '1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['profile', 'email'],
});
```

**Issue 2: App Not Rebuilt After Configuration Changes**

After updating `googleConfig.js`, you MUST rebuild the Android app:

```bash
# Clear cache and rebuild
npx expo prebuild --clean
eas build --platform android --profile preview
```

**Issue 3: SHA Fingerprint Propagation Delay**

- Google needs 5 minutes to a few hours to apply changes
- Wait 15 minutes after adding SHA fingerprint before testing

**Issue 4: Wrong Package Name**

Verify in [app.json](app.json):
```json
"android": {
  "package": "com.alloteme0077.app"  // ← Must match Google OAuth config
}
```

**Issue 5: google-services.json Not Linked**

The [google-services.json](google-services.json) file must be in the root of your project and linked in [app.json](app.json):

```json
"android": {
  "googleServicesFile": "./google-services.json"
}
```

### Web OAuth Not Working
- ✓ Check browser console for CORS errors
- ✓ Verify domain is added to authorized origins
- ✓ Clear browser cache and cookies
- ✓ Test with `http://localhost` first

### Complete Android OAuth Debugging Checklist

- [ ] Updated [src/config/googleConfig.js](src/config/googleConfig.js) with `androidClientId`
- [ ] Rebuilt app: `eas build --platform android --profile preview`
- [ ] SHA fingerprint `E1:B9:8E:7B:DE:43:2B:DF:25:77:86:76:CA:49:79:0A:05:F5:BA:2F` added to Google Console
- [ ] Waited 15+ minutes for Google to process changes
- [ ] Verified package name: `com.alloteme0077.app`
- [ ] Verified [google-services.json](google-services.json) exists in root directory
- [ ] Uninstalled old APK from test device before installing new one
- [ ] Checked browser console for error messages during sign-in attempt

---

## Environment Setup

### Required Environment Variables

Create `.env` files in these locations:

**Root `.env`** (for mobile and API):
```env
GOOGLE_CLIENT_ID=291149459575-j0g5nnm06egi7ndopgr29kr3326ka0ef.apps.googleusercontent.com
```

**`alloteme-web/.env`** (for web):
```env
VITE_GOOGLE_CLIENT_ID=1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com
```

**Backend `.env`** (in CounselMe/backend):
```env
GOOGLE_CLIENT_ID=291149459575-j0g5nnm06egi7ndopgr29kr3326ka0ef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-secret>
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
```

---

## References

- [Google Cloud Console](https://console.cloud.google.com/)
- [React OAuth Documentation](https://www.npmjs.com/package/@react-oauth/google)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Expo Configuration](https://docs.expo.dev/config/app/)
