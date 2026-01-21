# 🚀 Netlify Deployment Guide for Mavericks Web App

## 📋 Overview

This guide will help you deploy the Mavericks Club Management Platform as a web application on Netlify.

---

## ✅ Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Netlify account (free tier works)
- Git repository (GitHub, GitLab, or Bitbucket)

---

## 🔧 Step 1: Prepare Your Project

### 1.1 Install Dependencies

```bash
cd mavericks-mobile
npm install
```

### 1.2 Build for Production

```bash
npm run build:web
```

This will create an optimized production build in the `dist` folder.

### 1.3 Test Locally (Optional)

```bash
npm run serve
```

Visit `http://localhost:3000` to test the build locally.

---

## 🌐 Step 2: Deploy to Netlify

### Option A: Deploy via Netlify CLI (Recommended)

#### Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### Login to Netlify

```bash
netlify login
```

#### Initialize and Deploy

```bash
# From the mavericks-mobile directory
netlify init

# Follow the prompts:
# - Create & configure a new site
# - Choose your team
# - Site name: mavericks-club (or your preferred name)
# - Build command: npm run build:web
# - Publish directory: dist

# Deploy
netlify deploy --prod
```

### Option B: Deploy via Netlify Dashboard

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository

3. **Configure Build Settings**
   - **Base directory**: `mavericks-mobile`
   - **Build command**: `npm run build:web`
   - **Publish directory**: `mavericks-mobile/dist`
   - Click "Deploy site"

### Option C: Manual Deploy (Drag & Drop)

1. Build your project:
   ```bash
   npm run build:web
   ```

2. Go to [Netlify Drop](https://app.netlify.com/drop)

3. Drag and drop the `dist` folder

---

## ⚙️ Step 3: Configure Environment Variables

### 3.1 In Netlify Dashboard

1. Go to **Site settings** → **Environment variables**
2. Add the following variables:

```
EXPO_PUBLIC_API_URL=https://mavericks-android-backend-neyu.onrender.com/api
EXPO_PUBLIC_SOCKET_URL=https://mavericks-android-backend-neyu.onrender.com
```

### 3.2 Update Your Code (if needed)

The app is already configured to use the production backend URL. If you need to change it, update `src/constants/theme.js`:

```javascript
export const API_CONFIG = {
    BASE_URL: 'https://your-backend-url.com/api',
    SOCKET_URL: 'https://your-backend-url.com',
};
```

---

## 🔒 Step 4: Configure Custom Domain (Optional)

### 4.1 Add Custom Domain

1. Go to **Site settings** → **Domain management**
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions

### 4.2 Enable HTTPS

Netlify automatically provisions SSL certificates for your site.

---

## 🚨 Step 5: Important Configurations

### 5.1 Netlify Configuration File

The `netlify.toml` file is already configured:

```toml
[build]
  command = "npx expo export --platform web"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 5.2 Backend CORS Configuration

Ensure your backend allows requests from your Netlify domain. Update your backend's CORS configuration:

```javascript
// In your backend (mavericks-backend/server.js)
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:8081',
    'https://your-netlify-site.netlify.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

---

## 📱 Step 6: Web-Specific Considerations

### 6.1 Features Not Available on Web

Some React Native features won't work on web:
- ❌ Camera/QR Scanner (use web alternatives)
- ❌ Push Notifications (use web push API)
- ❌ Native file system access
- ❌ Some native animations

### 6.2 Recommended Web Alternatives

For camera/QR scanning, you can use:
- `react-qr-reader` for QR scanning
- `react-webcam` for camera access

---

## 🔄 Step 7: Continuous Deployment

### Auto-Deploy on Git Push

If you connected via Git (Option B), Netlify will automatically:
1. Detect changes when you push to your repository
2. Run the build command
3. Deploy the new version

### Manual Redeploy

```bash
# Build and deploy
npm run build:web
netlify deploy --prod
```

---

## 🐛 Troubleshooting

### Build Fails

**Issue**: Build command fails on Netlify

**Solution**:
1. Check Node version compatibility
2. Clear build cache in Netlify settings
3. Ensure all dependencies are in `package.json` (not `devDependencies`)

### Blank Page After Deploy

**Issue**: Site loads but shows blank page

**Solution**:
1. Check browser console for errors
2. Verify API URLs are correct
3. Check `netlify.toml` redirects configuration
4. Ensure `dist` folder has `index.html`

### API Connection Issues

**Issue**: Can't connect to backend

**Solution**:
1. Verify backend is running and accessible
2. Check CORS configuration on backend
3. Verify API URLs in `src/constants/theme.js`
4. Check browser network tab for failed requests

### Routing Issues

**Issue**: Direct URLs (e.g., `/dashboard`) return 404

**Solution**: The `netlify.toml` redirect rule should handle this. Verify:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 📊 Step 8: Monitor Your Deployment

### Netlify Analytics

1. Go to **Analytics** in Netlify dashboard
2. View traffic, performance, and errors
3. Set up alerts for downtime

### Performance Optimization

1. **Enable Asset Optimization**
   - Go to **Site settings** → **Build & deploy** → **Post processing**
   - Enable: Bundle CSS, Minify CSS, Minify JS, Compress images

2. **Enable Netlify CDN**
   - Automatically enabled for all sites
   - Serves content from edge locations worldwide

---

## 🎯 Step 9: Post-Deployment Checklist

- [ ] Site loads correctly
- [ ] Login/Signup works
- [ ] API calls are successful
- [ ] Navigation works (all routes)
- [ ] Images and assets load
- [ ] Responsive design works on mobile
- [ ] Dark mode works
- [ ] Socket.io connections work
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (HTTPS)

---

## 🔗 Useful Commands

```bash
# Build for production
npm run build:web

# Test build locally
npm run serve

# Deploy to Netlify (draft)
netlify deploy

# Deploy to production
netlify deploy --prod

# View deployment logs
netlify logs

# Open site in browser
netlify open:site

# Open admin dashboard
netlify open:admin
```

---

## 📚 Additional Resources

- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)
- [Netlify Documentation](https://docs.netlify.com/)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [Netlify CLI Reference](https://cli.netlify.com/)

---

## 🎉 Success!

Your Mavericks web app should now be live on Netlify! 

**Default URL**: `https://your-site-name.netlify.app`

Share this URL with your team and start managing your club online! 🚀

---

## 🔄 Updating Your Site

To update your deployed site:

1. Make changes to your code
2. Commit and push to Git (if using Git deployment)
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
3. Or manually deploy:
   ```bash
   npm run build:web
   netlify deploy --prod
   ```

---

**Built with ❤️ by the Mavericks Team**
