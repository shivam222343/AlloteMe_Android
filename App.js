import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SubscriptionLockModal from './src/components/SubscriptionLockModal';
import { configureGoogleSignin } from './src/config/googleConfig';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Platform } from 'react-native';

configureGoogleSignin();

const GOOGLE_WEB_CLIENT_ID = '1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com';

export default function App() {
  const content = (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
            <SubscriptionLockModal />
          </NavigationContainer>
        </AuthProvider>
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
