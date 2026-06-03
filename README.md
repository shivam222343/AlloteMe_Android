# AlloteMe Android — Production Release

AlloteMe Android is the production-ready mobile companion for the AlloteMe club management platform. This release is optimized for Android deployment, featuring secure club operations, attendance workflows, real-time collaboration, and AI assistant support.

---

## 🚀 Release Highlights

- **Enterprise-grade mobile interface** for clubs and campus organizations.
- **Secure authentication** with role-based access control.
- **Real-time chat**, presence, and notifications.
- **Attendance tracking** with QR scanning and analytics.
- **Meeting, task, calendar, and event management**.
- **AI chatbot support** for decision assistance.
- **Dark mode** and optimized Android performance.

---

## 📦 Included App Modules

### 🔹 Dashboard
Member performance, attendance summary, recent actions, and quick shortcuts.

### 🔹 Meetings
Full meeting lifecycle, QR attendance, schedule management, and status tracking.

### 🔹 Attendance
QR scan attendance, presence history, and reporting tools.

### 🔹 Members
Member directory, profile details, status indicators, and direct messaging.

### 🔹 Calendar
Visual meeting schedule with date details and event markers.

### 🔹 Chat
Real-time messaging, typing indicators, and online presence.

### 🔹 Notifications
Push alerts for meetings, reminders, messages, and club announcements.

### 🔹 Admin
Member management, QR generation, meeting controls, and reporting tools.

### 🔹 AI Assistant
Context-aware support powered by Gemini and Groq APIs.

---

## 🛠️ Architecture Overview

- **Framework**: React Native with Expo
- **Routing**: Expo Router
- **State Management**: React Context API
- **API**: Axios with interceptors
- **Realtime**: Socket.io Client
- **Storage**: Expo Secure Store + AsyncStorage
- **Notifications**: Expo Notifications
- **Scanning**: Expo Camera + Barcode Scanner
- **Charts**: React Native Chart Kit
- **AI**: Google Generative AI + Groq SDK
- **Animations**: React Native Reanimated + Animatable

---

## 📂 Project Structure

```
AlloteMe_Android/
├── app/                    # Expo Router screens and layouts
│   ├── (auth)/             # Auth flows
│   ├── (tabs)/             # Main app tabs
│   ├── admin/              # Admin-only screens
│   └── _layout.js          # Root layout and navigation
├── src/
│   ├── components/         # Reusable UI components
│   ├── contexts/           # Auth, theme, socket providers
│   ├── services/           # API and realtime services
│   ├── constants/          # Theme, API config, app constants
│   ├── hooks/              # Custom reusable hooks
│   └── utils/              # Helpers and validators
├── assets/                 # Images, fonts, and icons
├── app.json                # Expo configuration
├── package.json
└── README.md
```

---

## 📥 Production Installation

### Prerequisites
- Node.js 14+
- Expo CLI
- Android Studio or Android device with Expo Go
- Backend server available and reachable

### Setup
```bash
cd AlloteMe_Android
npm install
```

### Environment Configuration
Create a `.env` file in the project root with:
```env
API_BASE_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000
GOOGLE_AI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```
*If needed, also update API endpoints in `src/constants/theme.js`.*

---

## 🚀 Running the App

### Development
```bash
npm start
```
*Open the Android app by pressing `a` or scanning the QR code with Expo Go.*

### Release Build
```bash
eas build --platform android --profile production
```

---

## 📋 Release Readiness

### Android Production
- Build an AAB for Play Store submission.
- Verify release signing using Expo Application Services (EAS).
- Test on physical devices and emulators.

### QA Checklist
- [ ] Authentication flows complete.
- [ ] Role-specific screens render correctly.
- [ ] Push notifications are delivered.
- [ ] QR attendance scanning works reliably.
- [ ] Real-time chat updates instantly.
- [ ] Offline and reconnect behavior handled gracefully.

---

## ⚙️ Configuration Notes

- API integration is centralized in `src/services/api.js`.
- JWT tokens are managed with secure storage.
- Real-time events are handled through `src/services/socket.js`.
- Theme and dark mode support are provided via context.

---

## 🔍 Troubleshooting

### Common Fixes
- **Clear cache if Metro fails**:
  ```bash
  npx expo start -c
  ```
- **Reinstall dependencies**:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- **Android build cleanup**:
  ```bash
  cd android && ./gradlew clean && cd ..
  ```

---

## ✉️ Support & Contact

- **Support**: support@mavericks.com
- **Team**: Mavericks Development Team

---

## 📄 License
MIT
