import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import App from './App';

import * as Notifications from 'expo-notifications';

// Register background handler
if (Platform.OS !== 'web') {
    try {
        messaging().setBackgroundMessageHandler(async remoteMessage => {
            console.log('Message handled in the background!', remoteMessage);

            // Show local notification using Expo so categories/actions (Reply) work in killed state
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: remoteMessage.notification?.title || 'New Message',
                    body: remoteMessage.notification?.body || '',
                    data: remoteMessage.data,
                    categoryIdentifier: 'chat-reply', // Matches the category with Reply button
                    color: '#0A66C2',
                },
                trigger: null,
            });
        });
    } catch (error) {
        console.log('Failed to set background handler:', error);
    }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
