// import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import { authAPI } from './api';

// No need for Notifications.setNotificationHandler with strict RNFirebase unless using local notifications
// For foreground messages, we use messaging().onMessage()

/**
 * Register user for push notifications and update token in backend
 */
export const registerForPushNotificationsAsync = async (userId) => {
    try {
        // 1. Request Permission
        if (Platform.OS === 'web') return null;

        // const authStatus = await messaging().requestPermission();
        // const enabled =
        //     authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        //     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        // if (!enabled) {
        //     console.log('Authorization status:', authStatus);
        //     return null;
        // }

        // 2. Get FCM Token
        // const token = await messaging().getToken();
        // console.log('Mobile FCM Token:', token);

        // if (userId && token) {
        //     // Update token in backend
        //     // Ensure your backend authAPI.updateFCMToken accepts this token
        //     await authAPI.updateFCMToken(token);
        // }

        return null;

    } catch (e) {
        console.error('Error registering for push:', e);
        return null;
    }
};

/**
 * Handle notification clicks (Navigate to relevant screen)
 * This is usually called from a useEffect in a top-level component
 */
export const handleNotificationResponse = async (remoteMessage, navigation) => {
    if (!remoteMessage) return;

    const data = remoteMessage.data;
    const notification = remoteMessage.notification;

    console.log('Notification Response:', remoteMessage);

    // Handle Direct Reply Action (Custom logic required for purely background actions with FCM is complex, simplifing to open app)
    // If you need background reply, you often need Headless JS or Notifee

    // Generic navigation
    if (data?.screen) {
        navigation.navigate(data.screen, data.params ? JSON.parse(data.params) : {});
        return;
    }

    // Legacy logic
    if (data?.type === 'meeting_created' || data?.type === 'meeting_cancelled') {
        navigation.navigate('Meetings', { selectedMeetingId: data.meetingId });
    } else if (data?.type === 'new_message') {
        navigation.navigate('Chat', { otherUser: { _id: data.senderId, displayName: data.senderName } });
    } else {
        navigation.navigate('Dashboard');
    }
};

// Listeners helper to be called in App.js or similar
export const setupNotificationListeners = (navigation) => {
    // Firebase Messaging is natively only supported on iOS/Android in this setup
    if (Platform.OS === 'web') return;

    // Background / Quit state handler
    /*
    messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification caused app to open from background state:', remoteMessage.notification);
        handleNotificationResponse(remoteMessage, navigation);
    });

    // Initial notification (if app was closed)
    messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage.notification);
            handleNotificationResponse(remoteMessage, navigation);
        }
    });

    // Foreground handler
    const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('A new FCM message arrived!', remoteMessage);

        // Show an alert/toast or local notification here because FCM doesn't show foreground notifications by default on iOS/Android
        Alert.alert(
            remoteMessage.notification?.title || 'New Notification',
            remoteMessage.notification?.body || '',
            [
                { text: 'View', onPress: () => handleNotificationResponse(remoteMessage, navigation) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    });

    return unsubscribe;
    */
    return () => { };
};
