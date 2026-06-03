<div align="center">

# 🏆 Mavericks Club Management

### A beautiful, feature-rich mobile app for modern club management

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Maintenance](https://img.shields.io/badge/Maintained-yes-green.svg?style=flat-square)](https://github.com/)
[![Platform](https://img.shields.io/badge/Platform-iOS%20|%20Android-blue?style=flat-square)](https://expo.dev/)

<br/>

> **LinkedIn-inspired UI · Dark Mode · AI-powered · Real-time**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Design System](#-design-system)
- [Screens](#-screens)
- [Installation](#-installation)
- [API Integration](#-api-integration)
- [Real-time Features](#-real-time-features)
- [Push Notifications](#-push-notifications)
- [Custom Hooks](#-custom-hooks)
- [Building for Production](#-building-for-production)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🚀 Overview

**Mavericks Club Management** is a production-ready React Native Expo mobile application for managing clubs, meetings, members, and more — with a polished, LinkedIn-inspired professional design.

```
📱 iOS & Android  ·  🌙 Dark Mode  ·  🤖 AI Chatbot  ·  📡 Real-time Chat
```

---

## ✨ Features

| Category | Features |
|----------|----------|
| 🎨 **UI/UX** | LinkedIn-inspired design, dark mode, smooth animations |
| 🔐 **Auth** | Secure login/signup with JWT |
| 📊 **Dashboard** | Personal stats, analytics, quick actions |
| 📅 **Meetings** | View, create, manage meetings + QR attendance |
| ✅ **Attendance** | QR code scanning and tracking |
| 📝 **Tasks** | Assignment, tracking, and reminders |
| 💬 **Chat** | Real-time Socket.io powered messaging |
| 🔔 **Notifications** | Push notifications for all events |
| 🖼️ **Gallery** | Photo management and viewing |
| 📆 **Calendar** | Meeting schedule visualization |
| 📈 **Analytics** | Charts and statistics |
| 🤖 **AI Chatbot** | Gemini/Groq powered assistant |

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="50%">

**Core**
- ⚛️ React Native + Expo
- 🧭 Expo Router (file-based navigation)
- 📦 React Context API (state management)
- 🌐 Axios (API calls with interceptors)

**Real-time & Storage**
- 📡 Socket.io Client
- 🔒 Expo Secure Store
- 💾 AsyncStorage

</td>
<td valign="top" width="50%">

**UI & Experience**
- 🎨 React Native Paper + Custom Components
- ✨ React Native Reanimated + Animatable
- 📊 React Native Chart Kit

**Device & AI**
- 📸 Expo Camera + Barcode Scanner
- 🔔 Expo Notifications
- 🤖 Google Generative AI (Gemini)
- ⚡ Groq SDK

</td>
</tr>
</table>

---

## 📁 Project Structure

```
mavericks-mobile/
│
├── 📂 app/                        # Expo Router pages
│   ├── 📂 (auth)/                 # Authentication screens
│   │   ├── signin.js
│   │   └── signup.js
│   ├── 📂 (tabs)/                 # Main app tabs
│   │   ├── dashboard.js
│   │   ├── meetings.js
│   │   ├── members.js
│   │   ├── calendar.js
│   │   └── profile.js
│   ├── 📂 admin/                  # Admin screens
│   │   ├── dashboard.js
│   │   └── qr-generator.js
│   └── _layout.js                 # Root layout
│
├── 📂 src/
│   ├── 📂 components/             # Reusable UI components
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── Input.js
│   │   ├── Avatar.js
│   │   ├── Badge.js
│   │   ├── Modal.js
│   │   └── ...
│   ├── 📂 contexts/               # React Context providers
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   ├── SocketContext.js
│   │   └── NotificationContext.js
│   ├── 📂 services/               # API and services
│   │   ├── api.js
│   │   ├── socket.js
│   │   └── notifications.js
│   ├── 📂 constants/              # Constants and theme
│   │   └── theme.js
│   ├── 📂 utils/                  # Utility functions
│   │   ├── helpers.js
│   │   └── validators.js
│   └── 📂 hooks/                  # Custom React hooks
│       ├── useAuth.js
│       ├── useTheme.js
│       └── useSocket.js
│
├── 📂 assets/                     # Images, fonts, etc.
├── app.json                       # Expo configuration
├── package.json
└── README.md
```

---

## 🎨 Design System

### Color Palette

```
╔══════════════════════════════════════════════════════════════╗
║  PRIMARY (LinkedIn Blue)          SEMANTIC COLORS            ║
║  ━━━━━━━━━━━━━━━━━━━             ━━━━━━━━━━━━━━             ║
║  Main     → #0A66C2  🔵          Success → #22C55E  🟢       ║
║  Light BG → #F9FAFB  ⬜          Warning → #F59E0B  🟡       ║
║  Dark BG  → #111827  ⬛          Error   → #EF4444  🔴       ║
║                                  Info    → #3B82F6  🔵       ║
╚══════════════════════════════════════════════════════════════╝
```

### Typography

| Name | Size | Weight |
|------|------|--------|
| `xs` | 12px | 400 Regular |
| `sm` | 14px | 400 Regular |
| `md` | 16px | 500 Medium |
| `lg` | 20px | 600 SemiBold |
| `xl` | 24px | 700 Bold |
| `2xl`–`5xl` | 28–48px | 800 ExtraBold |

### Spacing Scale

```
xs: 4px   ·   sm: 8px   ·   md: 16px   ·   lg: 24px
xl: 32px  ·  2xl: 40px  ·  3xl: 48px  ·  4xl: 64px
```

---

## 📱 Screens

### 🔐 Authentication
| Screen | Description |
|--------|-------------|
| **Sign In** | Email/password login |
| **Sign Up** | User registration with profile setup |

### 🏠 Main Tabs

<details>
<summary><strong>1. Dashboard</strong></summary>

- Personal stats (meetings attended, absences, etc.)
- Attendance analytics with charts
- Recent meetings list
- Quick action buttons

</details>

<details>
<summary><strong>2. Meetings</strong></summary>

- Full meeting list with status filters (upcoming / completed / cancelled)
- Meeting detail view with attendees
- QR code attendance marking
- Absence request submission

</details>

<details>
<summary><strong>3. Members</strong></summary>

- Club members list with online/offline status
- Member profiles & direct messaging
- Search and filter functionality

</details>

<details>
<summary><strong>4. Calendar</strong></summary>

- Monthly calendar view with meeting indicators
- Date selection & meeting list by date

</details>

<details>
<summary><strong>5. Profile</strong></summary>

- User info & profile picture upload
- App settings & logout

</details>

### ➕ Additional Screens
`Tasks` · `Gallery` · `Chat` · `Notifications` · `Analytics` · `AI Chatbot` · `QR Scanner` · `Settings`

### 🛡️ Admin Screens
`Admin Dashboard` · `QR Generator` · `Member Management` · `Meeting Management` · `Reports`

---

## 🔧 Installation

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | v14 or higher |
| Expo CLI | Latest |
| iOS Simulator | Mac only |
| Android Studio | For emulator |

### Quick Start

```bash
# 1. Navigate to the project directory
cd mavericks-mobile

# 2. Install dependencies
npm install

# 3. Configure your API endpoint
# Edit src/constants/theme.js:
export const API_CONFIG = {
  BASE_URL: 'http://your-backend-url:5000/api',
  SOCKET_URL: 'http://your-backend-url:5000',
};

# 4. Start the development server
npm start
```

### Run on Device

```bash
# iOS
i          # Press in terminal, or scan QR with Camera app

# Android
a          # Press in terminal, or scan QR with Expo Go

# Web
w          # Press in terminal
```

---

## 🔌 API Integration

All API calls are handled through `src/services/api.js` with automatic JWT injection, request/response interceptors, error handling, and loading states.

```javascript
import { authAPI, meetingsAPI } from '../services/api';

// Login
const response = await authAPI.signin({ email, password });

// Get all meetings
const meetings = await meetingsAPI.getAll(clubId);
```

---

## 📡 Real-time Features

Socket.io integration provides:

```
👤 Online/offline presence       💬 Real-time messaging
⌨️  Typing indicators            🔔 Live notifications
```

---

## 🔔 Push Notifications

Configured via Expo Notifications, the app sends alerts for:

- 📋 Task reminders
- 📅 Meeting reminders
- ⚠️ Attendance warnings
- 💬 New messages
- 🔄 Role changes
- 📢 Club announcements

---

## 🎯 Custom Hooks

```javascript
// Authentication
const { user, isAuthenticated, signin, logout } = useAuth();

// Theme
const { theme, isDark, toggleTheme } = useTheme();

// Socket
const { socket, isConnected, emit } = useSocket();
```

---

## 🚀 Building for Production

### Android

```bash
# Preview APK
eas build --platform android --profile preview

# Production AAB (Play Store)
eas build --platform android --profile production
```

### iOS

```bash
# Simulator build
eas build --platform ios --profile preview

# App Store build
eas build --platform ios --profile production
```

---

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
API_BASE_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000
GOOGLE_AI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

---

## 🎨 Customization

### Changing Theme Colors

```javascript
// src/constants/theme.js
export const Colors = {
  primary: {
    500: '#YOUR_COLOR',
    // ...other shades
  },
};
```

### Adding New Components

1. Create component in `src/components/`
2. Follow the design system
3. Use theme context for colors
4. Export from `src/components/index.js`

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Metro bundler not starting | `npx expo start -c` |
| Dependencies not installing | `rm -rf node_modules package-lock.json && npm install` |
| iOS build fails | `cd ios && pod install && cd ..` |
| Android build fails | `cd android && ./gradlew clean && cd ..` |

---

## 🤝 Contributing

```
1. Fork the repository
2. Create your feature branch  →  git checkout -b feature/AmazingFeature
3. Commit your changes        →  git commit -m 'Add AmazingFeature'
4. Push to the branch         →  git push origin feature/AmazingFeature
5. Open a Pull Request
```

---

## 📚 Useful Links

- 📖 [Expo Documentation](https://docs.expo.dev/)
- 📖 [React Native Documentation](https://reactnative.dev/)
- 📖 [Expo Router Documentation](https://expo.github.io/router/docs/)

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

**Built with ❤️ by the Mavericks Development Team**

📧 [support@mavericks.com](mailto:support@mavericks.com)

<br/>

⭐ **Star this repo if you found it helpful!**

</div>
