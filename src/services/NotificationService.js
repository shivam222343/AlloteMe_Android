import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { authAPI, messagesAPI, groupChatAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// No need for Notifications.setNotificationHandler with strict RNFirebase unless using local notifications
// For foreground messages, we use messaging().onMessage()

/**
 * Register user for push notifications and update token in backend
 */
export const registerForPushNotificationsAsync = async (userId) => {
    try {
        if (Platform.OS === 'web') return null;

        // 1. Request Permission
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
            console.log('FCM Authorization status:', authStatus);
            return null;
        }

        // Expo Notifications Permission (needed for local display of actions)
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Expo Notifications permission not granted');
        }

        // 2. Get FCM Token
        const token = await messaging().getToken();
        console.log('Mobile FCM Token:', token);

        if (userId && token) {
            await authAPI.updateFCMToken(token);
        }

        // 3. Setup Categories (for Quick Reply)
        await initNotificationCategories();

    } catch (e) {
        console.error('Error registering for push:', e);
        return null;
    }
};

/**
 * Initialize notification categories for Quick Reply
 */
export const initNotificationCategories = async () => {
    if (Platform.OS === 'web') return;

    await Notifications.setNotificationCategoryAsync('chat-reply', [
        {
            identifier: 'reply',
            buttonTitle: 'Reply',
            options: {
                opensAppToForeground: false,
            },
            textInput: {
                placeholder: 'Type your reply...',
                submitButtonTitle: 'Send',
            },
        },
    ]);
    console.log('✅ Notification Category "chat-reply" initialized');
};

/**
 * Handle notification clicks (Navigate to relevant screen)
 */
export const handleNotificationResponse = async (response, navigation) => {
    if (!response) return;

    // Response can be from messaging() (remoteMessage) or expo-notifications (notificationResponse)
    const remoteMessage = response.notification ? response : (response.notification ? response.notification : null);
    const notificationResponse = response.actionIdentifier ? response : null;

    console.log('Notification Response Received:', response);

    // 1. Handle Quick Reply (Action)
    if (notificationResponse && notificationResponse.actionIdentifier === 'reply') {
        const replyText = notificationResponse.userText;
        const data = notificationResponse.notification.request.content.data;

        if (replyText && data) {
            await handleBackgroundReply(data, replyText);
            return;
        }
    }

    // 2. Handle Navigation
    const data = notificationResponse
        ? notificationResponse.notification.request.content.data
        : (remoteMessage?.data || {});

    if (data?.screen) {
        try {
            const params = typeof data.params === 'string' ? JSON.parse(data.params) : data.params;
            navigation.navigate(data.screen, params || {});
        } catch (e) {
            console.error('Error parsing notification params:', e);
            navigation.navigate(data.screen);
        }
        return;
    }

    if (data?.type === 'new_message' || data?.senderId) {
        navigation.navigate('Chat', { otherUser: { _id: data.senderId, displayName: data.senderName } });
    } else if (data?.clubId) {
        navigation.navigate('Chat', { isGroupChat: true, clubId: data.clubId, clubName: data.clubName });
    } else {
        navigation.navigate('Dashboard');
    }
};

/**
 * Handle background reply without opening the app fully
 */
export const handleBackgroundReply = async (data, text) => {
    try {
        console.log('Processing background reply:', text);
        if (data.clubId) {
            // Group Chat Reply
            await groupChatAPI.sendMessage(data.clubId, { content: text, type: 'text' });
        } else if (data.senderId) {
            // Individual Chat Reply
            await messagesAPI.send({ receiverId: data.senderId, content: text, type: 'text' });
        }
        console.log('✅ Background reply sent successfully');

        // Show success local notification summary if needed
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Reply Sent',
                body: `Your message to ${data.senderName || 'the group'} has been delivered.`,
            },
            trigger: null,
        });
    } catch (error) {
        console.error('Failed to send background reply:', error);
    }
};

/**
 * Setup notification listeners
 */
export const setupNotificationListeners = (navigation) => {
    if (Platform.OS === 'web') return;

    // 1. FCM Background / Quit state handler (Opening App)
    const unsubscribeFCMOpened = messaging().onNotificationOpenedApp(remoteMessage => {
        handleNotificationResponse(remoteMessage, navigation);
    });

    messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage) {
            handleNotificationResponse(remoteMessage, navigation);
        }
    });

    // 2. Expo Notifications Response Listener (Handles Actions like Reply)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        handleNotificationResponse(response, navigation);
    });

    // 3. Foreground handler
    const unsubscribeFCMForeground = messaging().onMessage(async remoteMessage => {
        console.log('Foreground FCM:', remoteMessage);

        // Display local notification in foreground to ensure high visibility and consistency
        await Notifications.scheduleNotificationAsync({
            content: {
                title: remoteMessage.notification?.title || 'New Message',
                body: remoteMessage.notification?.body || '',
                data: remoteMessage.data,
                categoryIdentifier: 'chat-reply',
            },
            trigger: null,
        });
    });

    return () => {
        unsubscribeFCMOpened();
        unsubscribeFCMForeground();
        responseSubscription.remove();
    };
};
