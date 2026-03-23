# Mavericks Club Management - Mobile App

## 🚀 Overview
React Native Expo mobile application for the Mavericks Club Management Platform with a beautiful, LinkedIn-inspired professional UI/UX.

## ✨ Features
- ✅ **Beautiful UI/UX** - LinkedIn-inspired professional design
- ✅ **Dark Mode Support** - System-aware theme switching
- ✅ **Authentication** - Secure login/signup with JWT
- ✅ **Dashboard** - Personal stats and analytics
- ✅ **Meetings** - View, create, and manage meetings
- ✅ **Attendance** - QR code scanning and tracking
- ✅ **Tasks** - Assignment and tracking with reminders
- ✅ **Real-time Chat** - Socket.io powered messaging
- ✅ **Notifications** - Push notifications for all events
- ✅ **Gallery** - Photo management and viewing
- ✅ **Calendar** - Meeting schedule visualization
- ✅ **Analytics** - Charts and statistics
- ✅ **AI Chatbot** - Gemini/Groq powered assistant

## 🛠️ Tech Stack
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **UI Components**: React Native Paper + Custom Components
- **State Management**: React Context API
- **API**: Axios with interceptors
- **Real-time**: Socket.io Client
- **Storage**: Expo Secure Store + AsyncStorage
- **Camera**: Expo Camera + Barcode Scanner
- **Notifications**: Expo Notifications
- **Charts**: React Native Chart Kit
- **AI**: Google Generative AI + Groq SDK
- **Animations**: React Native Reanimated + Animatable

## 📁 Project Structure
```
mavericks-mobile/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Authentication screens
│   │   ├── signin.js
│   │   └── signup.js
│   ├── (tabs)/                   # Main app tabs
│   │   ├── dashboard.js
│   │   ├── meetings.js
│   │   ├── members.js
│   │   ├── calendar.js
│   │   └── profile.js
│   ├── admin/                    # Admin screens
│   │   ├── dashboard.js
│   │   └── qr-generator.js
│   └── _layout.js                # Root layout
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── Input.js
│   │   ├── Avatar.js
│   │   ├── Badge.js
│   │   ├── Modal.js
│   │   └── ...
│   ├── contexts/                 # React Context providers
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   ├── SocketContext.js
│   │   └── NotificationContext.js
│   ├── services/                 # API and services
│   │   ├── api.js
│   │   ├── socket.js
│   │   └── notifications.js
│   ├── constants/                # Constants and theme
│   │   └── theme.js
│   ├── utils/                    # Utility functions
│   │   ├── helpers.js
│   │   └── validators.js
│   └── hooks/                    # Custom React hooks
│       ├── useAuth.js
│       ├── useTheme.js
│       └── useSocket.js
├── assets/                       # Images, fonts, etc.
├── app.json                      # Expo configuration
├── package.json
└── README.md
```

## 🎨 Design System

### Color Palette
**Primary (LinkedIn Blue)**
- Main: `#0A66C2`
- Variants: 50-900

**Secondary (Neutral Grays)**
- Light background: `#F9FAFB`
- Dark background: `#111827`

**Semantic Colors**
- Success: `#22C55E`
- Warning: `#F59E0B`
- Error: `#EF4444`
- Info: `#3B82F6`

### Typography
- Font Family: System (Inter-like)
- Sizes: xs (12px) to 5xl (48px)
- Weights: Regular (400) to Extrabold (800)

### Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 40px
- 3xl: 48px
- 4xl: 64px

### Components
All components follow the design system with:
- Consistent spacing and sizing
- Theme-aware colors
- Dark mode support
- Smooth animations
- Accessibility features

## 🔧 Installation

### Prerequisites
- Node.js (v14 or higher)
- Expo CLI
- iOS Simulator (Mac) or Android Studio (for emulator)
- Physical device with Expo Go app (optional)

### Steps

1. **Navigate to mobile directory**
   ```bash
   cd mavericks-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   Edit `src/constants/theme.js`:
   ```javascript
   export const API_CONFIG = {
     BASE_URL: 'http://your-backend-url:5000/api',
     SOCKET_URL: 'http://your-backend-url:5000',
   };
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - **iOS**: Press `i` in terminal or scan QR code with Camera app
   - **Android**: Press `a` in terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in terminal

## 📱 Screens

### Authentication
- **Sign In** - Email/password login
- **Sign Up** - User registration with profile setup

### Main Tabs
1. **Dashboard**
   - Personal stats (meetings attended, absences, etc.)
   - Attendance analytics with charts
   - Recent meetings
   - Quick actions

2. **Meetings**
   - List of all meetings
   - Filter by status (upcoming, completed, cancelled)
   - Meeting details with attendees
   - QR code attendance marking
   - Absence request submission

3. **Members**
   - Club members list
   - Online/offline status
   - Member profiles
   - Direct messaging
   - Search and filter

4. **Calendar**
   - Monthly calendar view
   - Meeting indicators
   - Date selection
   - Meeting list by date

5. **Profile**
   - User information
   - Profile picture upload
   - Settings
   - Logout

### Additional Screens
- **Tasks** - View and manage assigned tasks
- **Gallery** - Club photo gallery
- **Chat** - One-on-one messaging
- **Notifications** - All notifications
- **Analytics** - Charts and statistics
- **AI Chatbot** - Eta AI assistant
- **QR Scanner** - Scan QR codes for attendance
- **Settings** - App preferences

### Admin Screens
- **Admin Dashboard** - System-wide statistics
- **QR Generator** - Generate QR codes
- **Member Management** - Add/remove members, change roles
- **Meeting Management** - Create/edit/delete meetings
- **Reports** - Generate and export reports

## 🔌 API Integration

All API calls are handled through the `src/services/api.js` file with:
- Automatic JWT token injection
- Request/response interceptors
- Error handling
- Loading states

Example usage:
```javascript
import { authAPI, meetingsAPI } from '../services/api';

// Login
const response = await authAPI.signin({ email, password });

// Get meetings
const meetings = await meetingsAPI.getAll(clubId);
```

## 🔔 Push Notifications

Push notifications are configured using Expo Notifications:
- Task reminders
- Meeting reminders
- Attendance warnings
- New messages
- Role changes
- Club announcements

## 📊 Real-time Features

Socket.io integration for:
- Online/offline status
- Real-time messaging
- Typing indicators
- Live notifications
- Presence tracking

## 🎯 Custom Hooks

### useAuth
```javascript
const { user, isAuthenticated, signin, logout } = useAuth();
```

### useTheme
```javascript
const { theme, isDark, toggleTheme } = useTheme();
```

### useSocket
```javascript
const { socket, isConnected, emit } = useSocket();
```

## 🚀 Building for Production

### Android
```bash
# Build APK
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

### iOS
```bash
# Build for simulator
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## 📝 Environment Variables

Create a `.env` file:
```env
API_BASE_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000
GOOGLE_AI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

## 🎨 Customization

### Changing Theme Colors
Edit `src/constants/theme.js`:
```javascript
export const Colors = {
  primary: {
    500: '#YOUR_COLOR',
    // ... other shades
  },
};
```

### Adding New Components
1. Create component in `src/components/`
2. Follow the design system
3. Use theme context for colors
4. Export from `src/components/index.js`

## 📚 Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://expo.github.io/router/docs/)

## 🐛 Troubleshooting

### Common Issues

**1. Metro bundler not starting**
```bash
npx expo start -c
```

**2. Dependencies not installing**
```bash
rm -rf node_modules package-lock.json
npm install
```

**3. iOS build fails**
```bash
cd ios && pod install && cd ..
```

**4. Android build fails**
```bash
cd android && ./gradlew clean && cd ..
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License
MIT

## 👥 Team
Mavericks Development Team

## 📞 Support
For support, email support@mavericks.com

---

## 🎉 Next Steps

1. **Install dependencies**: Run `npm install`
2. **Start backend**: Make sure the backend server is running
3. **Configure API**: Update API URLs in `theme.js`
4. **Run app**: Execute `npm start`
5. **Test features**: Try login, dashboard, meetings, etc.
6. **Customize**: Adjust colors, add features, enhance UI

**Happy Coding! 🚀**
#   A l l o t e M e _ A n d r o i d  
 