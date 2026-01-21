# 🌐 Web Configuration Guide

## Overview

This document provides configuration details for running Mavericks as a web application.

---

## 🎯 Web vs Mobile Differences

### Features Available on Web ✅
- Dashboard and analytics
- Member management
- Meeting scheduling
- Task management
- Real-time chat
- Calendar view
- Gallery (view only)
- Profile management
- Admin panel
- Dark mode
- Notifications (web push)

### Features Limited on Web ⚠️
- **Camera/QR Scanner**: Browser camera API has limitations
- **Push Notifications**: Uses Web Push API (different from mobile)
- **File System**: Limited to browser storage
- **Native Animations**: Some animations may differ

### Features Not Available on Web ❌
- Native mobile gestures
- Background location tracking
- Native file picker (uses browser file input)
- Some Expo-specific features

---

## 🔧 Configuration Files

### 1. `netlify.toml`
Main Netlify configuration file with build settings, redirects, and headers.

### 2. `package.json`
Contains build scripts:
- `npm run web` - Start development server
- `npm run build:web` - Build for production
- `npm run serve` - Test production build locally
- `npm run deploy:netlify` - Automated deployment script

### 3. `src/constants/theme.js`
API configuration:
```javascript
export const API_CONFIG = {
    BASE_URL: 'https://mavericks-android-backend-neyu.onrender.com/api',
    SOCKET_URL: 'https://mavericks-android-backend-neyu.onrender.com',
};
```

---

## 🌍 Environment Variables

### For Local Development
Create a `.env.local` file:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
```

### For Production (Netlify)
Set in Netlify Dashboard → Site settings → Environment variables:
```
EXPO_PUBLIC_API_URL=https://your-backend.com/api
EXPO_PUBLIC_SOCKET_URL=https://your-backend.com
```

---

## 🔒 CORS Configuration

Your backend must allow requests from your web domain.

### Backend CORS Setup (Express.js)

```javascript
const cors = require('cors');

const allowedOrigins = [
  'http://localhost:8081',           // Local Expo web
  'http://localhost:3000',           // Local serve
  'https://mavericks.netlify.app',   // Netlify domain
  'https://your-custom-domain.com',  // Custom domain
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 📱 Responsive Design

The app is built with React Native, which provides responsive layouts by default. However, for optimal web experience:

### Breakpoints
```javascript
const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};
```

### Media Queries (if needed)
```javascript
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;
```

---

## 🎨 Web-Specific Styling

### Font Loading
Web fonts are loaded automatically by Expo. For custom fonts:

```javascript
// In App.js
import { useFonts } from 'expo-font';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  });

  if (!fontsLoaded) return null;
  // ... rest of app
}
```

### Scrollbar Styling
Add to your main CSS (if using custom CSS):

```css
/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

---

## 🔔 Web Push Notifications

Web uses a different notification system than mobile.

### Setup Web Push

1. **Generate VAPID Keys**
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Configure Service Worker**
   Create `public/service-worker.js`:
   ```javascript
   self.addEventListener('push', function(event) {
     const data = event.data.json();
     const options = {
       body: data.body,
       icon: '/icon.png',
       badge: '/badge.png',
       vibrate: [200, 100, 200],
     };
     event.waitUntil(
       self.registration.showNotification(data.title, options)
     );
   });
   ```

3. **Request Permission**
   ```javascript
   async function requestNotificationPermission() {
     const permission = await Notification.requestPermission();
     if (permission === 'granted') {
       // Subscribe to push notifications
     }
   }
   ```

---

## 🗄️ Local Storage

Web uses browser localStorage instead of AsyncStorage.

### Storage Limits
- localStorage: ~5-10MB per domain
- IndexedDB: Much larger (50MB+)

### Current Implementation
The app uses `@react-native-async-storage/async-storage` which automatically uses localStorage on web.

---

## 🚀 Performance Optimization

### 1. Code Splitting
Expo web automatically code-splits by route.

### 2. Image Optimization
```javascript
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

### 3. Lazy Loading
```javascript
import React, { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 4. Bundle Size Analysis
```bash
npx expo export --platform web --dump-sourcemap
npx source-map-explorer dist/_expo/static/js/web/*.js
```

---

## 🐛 Debugging Web Issues

### 1. Enable Source Maps
Already enabled in production builds.

### 2. Browser DevTools
- **Chrome DevTools**: F12 or Ctrl+Shift+I
- **Network Tab**: Check API calls
- **Console**: Check for errors
- **Application Tab**: Check localStorage

### 3. React DevTools
Install React DevTools extension for Chrome/Firefox.

### 4. Common Issues

**Issue**: White screen on load
**Solution**: Check console for errors, verify API URLs

**Issue**: API calls failing
**Solution**: Check CORS, verify backend is running

**Issue**: Routing not working
**Solution**: Verify netlify.toml redirects

**Issue**: Slow performance
**Solution**: Check bundle size, enable code splitting

---

## 📊 Analytics Integration

### Google Analytics

1. **Install**
   ```bash
   npm install react-ga4
   ```

2. **Initialize**
   ```javascript
   import ReactGA from 'react-ga4';
   
   ReactGA.initialize('G-XXXXXXXXXX');
   
   // Track page views
   ReactGA.send({ hitType: "pageview", page: window.location.pathname });
   ```

### Netlify Analytics
Enable in Netlify Dashboard → Analytics (paid feature)

---

## 🔐 Security Best Practices

### 1. Environment Variables
Never commit sensitive keys to Git. Use Netlify environment variables.

### 2. HTTPS Only
Netlify automatically provides SSL. Enforce HTTPS:
```toml
# In netlify.toml
[[redirects]]
  from = "http://*"
  to = "https://:splat"
  status = 301
  force = true
```

### 3. Content Security Policy
Add to netlify.toml headers:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
```

---

## 🧪 Testing

### Local Testing
```bash
# Development
npm run web

# Production build
npm run build:web
npm run serve
```

### Browser Testing
Test on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

### Automated Testing
```bash
# Install testing libraries
npm install --save-dev @testing-library/react-native jest

# Run tests
npm test
```

---

## 📱 PWA (Progressive Web App)

Expo web automatically generates PWA manifest.

### Customize PWA

1. **Update app.json**
   ```json
   {
     "expo": {
       "web": {
         "favicon": "./assets/icon.png",
         "name": "Mavericks Club",
         "shortName": "Mavericks",
         "description": "Club Management Platform",
         "themeColor": "#0A66C2",
         "backgroundColor": "#FFFFFF"
       }
     }
   }
   ```

2. **Install Prompt**
   ```javascript
   let deferredPrompt;
   
   window.addEventListener('beforeinstallprompt', (e) => {
     e.preventDefault();
     deferredPrompt = e;
     // Show install button
   });
   ```

---

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Netlify

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd mavericks-mobile && npm install
      - run: cd mavericks-mobile && npm run build:web
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=mavericks-mobile/dist
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

---

## 📚 Additional Resources

- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [Netlify Documentation](https://docs.netlify.com/)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

**Last Updated**: January 2026
