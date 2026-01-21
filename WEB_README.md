# 🌐 Mavericks Web Deployment - README

## Overview

This directory contains everything needed to deploy the Mavericks Club Management Platform as a web application on Netlify.

---

## 📁 Project Structure

```
mavericks-mobile/
├── dist/                          # Production build (generated)
│   ├── _expo/                     # Expo web assets
│   ├── assets/                    # Images, fonts, icons
│   ├── index.html                 # Entry point
│   └── metadata.json              # Build metadata
│
├── src/                           # Source code
│   ├── components/                # React components
│   ├── screens/                   # App screens
│   ├── contexts/                  # React contexts
│   ├── services/                  # API services
│   ├── constants/                 # Theme & config
│   └── utils/                     # Utilities
│
├── netlify.toml                   # Netlify configuration
├── deploy.js                      # Automated deployment script
├── package.json                   # Dependencies & scripts
│
└── Documentation/
    ├── DEPLOYMENT_SUMMARY.md      # 📊 Complete overview
    ├── DEPLOY_QUICK_START.md      # 🚀 Quick start guide
    ├── NETLIFY_DEPLOYMENT.md      # 📖 Full deployment guide
    ├── WEB_CONFIG.md              # ⚙️ Configuration reference
    └── DEPLOYMENT_CHECKLIST.md    # ✅ Task checklist
```

---

## 🚀 Quick Start

### 1. Build for Web
```bash
npm run build:web
```

### 2. Test Locally
```bash
npm run serve
# Visit http://localhost:3000
```

### 3. Deploy to Netlify

**Option A: CLI**
```bash
netlify deploy --prod --dir=dist
```

**Option B: Automated**
```bash
npm run deploy:netlify
```

**Option C: Drag & Drop**
- Visit https://app.netlify.com/drop
- Upload the `dist` folder

---

## 📚 Documentation

| File | Description |
|------|-------------|
| **DEPLOYMENT_SUMMARY.md** | Complete overview of the deployment setup |
| **DEPLOY_QUICK_START.md** | Quick reference for deployment |
| **NETLIFY_DEPLOYMENT.md** | Detailed step-by-step deployment guide |
| **WEB_CONFIG.md** | Web-specific configuration and setup |
| **DEPLOYMENT_CHECKLIST.md** | Pre/post deployment checklist |

**Start here**: `DEPLOYMENT_SUMMARY.md` for a complete overview

---

## 🔧 Available Scripts

```bash
# Development
npm start              # Start Expo dev server
npm run web            # Start web dev server
npm run android        # Start Android dev
npm run ios            # Start iOS dev

# Production
npm run build:web      # Build for web deployment
npm run serve          # Test production build locally
npm run deploy         # Build for web (alias)
npm run deploy:netlify # Automated deployment script
```

---

## 🌐 Deployment Status

- ✅ Build configuration complete
- ✅ Production build successful
- ✅ Documentation complete
- ✅ Ready for deployment

**Build Info:**
- Bundle Size: 3.45 MB
- Modules: 1,577
- Assets: 48 files
- Platform: Web (React Native)

---

## 🔗 Important URLs

### Development
- Local Dev: http://localhost:8081
- Local Build: http://localhost:3000

### Production
- Backend API: https://mavericks-android-backend-neyu.onrender.com/api
- Socket URL: https://mavericks-android-backend-neyu.onrender.com

### Netlify
- Dashboard: https://app.netlify.com/
- Drop Deploy: https://app.netlify.com/drop

---

## ⚙️ Configuration

### API Configuration
Located in `src/constants/theme.js`:
```javascript
export const API_CONFIG = {
    BASE_URL: 'https://mavericks-android-backend-neyu.onrender.com/api',
    SOCKET_URL: 'https://mavericks-android-backend-neyu.onrender.com',
};
```

### Build Configuration
Located in `netlify.toml`:
- Build command: `npm run build:web`
- Publish directory: `dist`
- Node version: 18

---

## 🎯 Features

### Available on Web ✅
- Dashboard & Analytics
- Member Management
- Meeting Scheduling
- Task Management
- Real-time Chat
- Calendar View
- Gallery
- Admin Panel
- Profile Management
- Dark Mode
- Notifications

### Limited on Web ⚠️
- Camera/QR Scanner (browser limitations)
- Push Notifications (uses Web Push API)
- File System Access

---

## 🐛 Troubleshooting

### Build Issues
```bash
# Clear and rebuild
rm -rf node_modules dist
npm install
npm run build:web
```

### API Connection Issues
1. Check CORS on backend
2. Verify API URLs in `src/constants/theme.js`
3. Check browser console for errors

### Deployment Issues
1. Verify Netlify CLI: `netlify --version`
2. Check login status: `netlify status`
3. Verify build output: `ls dist/`

**For more help**: See `NETLIFY_DEPLOYMENT.md` troubleshooting section

---

## 📊 Performance

### Optimizations Applied
- ✅ Code splitting
- ✅ Asset optimization
- ✅ Lazy loading
- ✅ Caching headers
- ✅ Security headers
- ✅ PWA support

### Expected Performance
- Load Time: < 3 seconds
- Bundle Size: ~3.45 MB (optimized)
- Lighthouse Score: 90+

---

## 🔒 Security

### Implemented
- HTTPS enforced
- Security headers configured
- XSS protection
- Content security policy
- CORS ready

### Backend CORS
Ensure your backend allows requests from your Netlify domain:
```javascript
// In backend
app.use(cors({
  origin: ['https://your-site.netlify.app'],
  credentials: true
}));
```

---

## 🎉 Next Steps

1. **Review Documentation**
   - Start with `DEPLOYMENT_SUMMARY.md`
   - Read `DEPLOY_QUICK_START.md` for deployment

2. **Deploy to Netlify**
   - Choose your preferred deployment method
   - Test on draft URL first

3. **Configure Domain**
   - Set up custom domain (optional)
   - Enable HTTPS (automatic)

4. **Test Thoroughly**
   - All features working
   - API connectivity
   - Real-time features

5. **Go Live!**
   - Share with your team
   - Monitor performance
   - Gather feedback

---

## 📞 Support

### Documentation
- All deployment docs in this directory
- Main project README: `../README.md`

### External Resources
- [Netlify Docs](https://docs.netlify.com/)
- [Expo Web Docs](https://docs.expo.dev/workflow/web/)
- [React Native Web](https://necolas.github.io/react-native-web/)

---

## ✅ Deployment Checklist

- [ ] Build completed (`npm run build:web`)
- [ ] Tested locally (`npm run serve`)
- [ ] Backend accessible
- [ ] CORS configured
- [ ] Deployment method chosen
- [ ] Documentation reviewed
- [ ] Ready to deploy!

---

## 🚀 Deploy Now!

Choose your deployment method and go live:

```bash
# CLI (Recommended)
netlify deploy --prod --dir=dist

# Automated
npm run deploy:netlify

# Manual
# Visit https://app.netlify.com/drop
```

---

**Built with ❤️ by the Mavericks Team**

**Ready to deploy? Let's go! 🌐**
