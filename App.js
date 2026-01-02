import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileCompletionModal from './src/components/ProfileCompletionModal';
import { authAPI } from './src/services/api';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminScreen from './src/screens/AdminScreen';
import MeetingsScreen from './src/screens/MeetingsScreen';
import MembersScreen from './src/screens/MembersScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ChatScreen from './src/screens/ChatScreen';
import CameraScreen from './src/screens/CameraScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import TasksScreen from './src/screens/TasksScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';

const Stack = createStackNavigator();

const AppContent = () => {
  const { isAuthenticated, loading, user, refreshUser } = useAuth();
  const navigationRef = React.useRef();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('');
  const [navigationCount, setNavigationCount] = useState(0);
  const [showAfterNavigations, setShowAfterNavigations] = useState(Math.floor(Math.random() * 2) + 2); // Random 2-3

  // Check profile completion on navigation change
  useEffect(() => {
    const unsubscribe = navigationRef.current?.addListener('state', () => {
      const route = navigationRef.current?.getCurrentRoute();
      if (route && route.name !== currentRoute) {
        setCurrentRoute(route.name);

        // Check if profile is incomplete
        if (isAuthenticated && user) {
          const isProfileIncomplete = !user.fullName || !user.birthDate || !user.branch || !user.passoutYear;
          if (isProfileIncomplete) {
            // Increment navigation count
            const newCount = navigationCount + 1;
            setNavigationCount(newCount);

            // Show modal after 2-3 navigations (random)
            if (newCount >= showAfterNavigations) {
              setShowProfileModal(true);
              setNavigationCount(0); // Reset counter
              setShowAfterNavigations(Math.floor(Math.random() * 2) + 2); // New random 2-3
            }
          }
        }
      }
    });

    return unsubscribe;
  }, [isAuthenticated, user, currentRoute, navigationCount, showAfterNavigations]);

  // Check on initial load
  useEffect(() => {
    if (isAuthenticated && user) {
      const isProfileIncomplete = !user.fullName || !user.birthDate || !user.branch || !user.passoutYear;

      if (isProfileIncomplete) {
        setShowProfileModal(true);
      }
    }
  }, [isAuthenticated, user]);

  const handleProfileComplete = async (profileData) => {
    try {
      console.log('Submitting profile data:', profileData);
      const res = await authAPI.updateProfile(profileData);
      console.log('Profile update response:', res);

      if (res.success) {
        console.log('Profile updated successfully, refreshing user...');
        await refreshUser();
        setShowProfileModal(false);
        alert('Profile updated successfully!');
      } else {
        console.error('Profile update failed:', res);
        alert(res.message || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert(error.message || 'Failed to update profile. Please check your connection and try again.');
    }
  };

  const handleProfileClose = () => {
    setShowProfileModal(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A66C2" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!isAuthenticated ? (
            // Auth Stack
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </>
          ) : (
            // Main App Stack
            <>
              <Stack.Screen name="Main" component={DashboardScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Admin" component={AdminScreen} />
              <Stack.Screen name="Meetings" component={MeetingsScreen} />
              <Stack.Screen name="Members" component={MembersScreen} />
              <Stack.Screen name="Calendar" component={CalendarScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Messages" component={MessagesScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Camera" component={CameraScreen} />
              <Stack.Screen name="Gallery" component={GalleryScreen} />
              <Stack.Screen name="Analytics" component={AnalyticsScreen} />
              <Stack.Screen name="Tasks" component={TasksScreen} />
              <Stack.Screen name="GroupChat" component={GroupChatScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Profile Completion Modal - Shows on every navigation if incomplete */}
      {isAuthenticated && user && (
        <ProfileCompletionModal
          visible={showProfileModal}
          onComplete={handleProfileComplete}
          onClose={handleProfileClose}
          initialData={{
            fullName: user.fullName,
            birthDate: user.birthDate,
            branch: user.branch,
            passoutYear: user.passoutYear
          }}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
