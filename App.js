import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';

import SubscriptionLockModal from './src/components/SubscriptionLockModal';
import { configureGoogleSignin } from './src/config/googleConfig';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Platform } from 'react-native';

import linking from './src/navigation/linking';
import { navigationRef } from './src/navigation/AppNavigator';
import { NetworkProvider } from './src/contexts/NetworkContext';

import useAppVersion from './src/hooks/useAppVersion';
import UpdateRequiredScreen from './src/components/UpdateRequiredScreen';

configureGoogleSignin();

// Inject thin blue scrollbar style for web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    * {
      scrollbar-width: thin;
      scrollbar-color: rgba(10, 102, 194, 0.5) rgba(0, 0, 0, 0.05);
    }
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(10, 102, 194, 0.5);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(10, 102, 194, 0.8);
    }
  `;
  document.head.appendChild(style);
}


const GOOGLE_WEB_CLIENT_ID = '1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com';

export default function App() {
  const { updateRequired, latestVersion, currentVersion, isChecking } = useAppVersion();

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A3D91' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (updateRequired) {
    return <UpdateRequiredScreen latestVersion={latestVersion} currentVersion={currentVersion} />;
  }

  const content = (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NetworkProvider>
          <AuthProvider>
            <NavigationContainer ref={navigationRef} linking={linking}>
              <AppNavigator />
              <SubscriptionLockModal />
            </NavigationContainer>
          </AuthProvider>
        </NetworkProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  return content;
}
