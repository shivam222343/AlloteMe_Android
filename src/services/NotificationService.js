import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authAPI, messagesAPI, groupChatAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Register user for push notifications and update token in backend
 */
export const registerForPushNotificationsAsync = async (userId) => {
    try {
        if (Platform.OS === 'web') return null;

        // Check if running on physical device
        if (!Device.isDevice) {
            console.log('Must use physical device for Push Notifications');
            return null;
        }

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        // Get Native Device push token (FCM)
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const token = tokenData.data;
        console.log('Expo Push Token:', token);

        // Update token in backend
        if (userId && token) {
            await authAPI.updateFCMToken(token);
        }

        // Setup notification categories
        await initNotificationCategories();

        // Configure notification channel for Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0A66C2',
            });
        }

        return token;
    } catch (error) {
        console.error('Error registering for push notifications:', error);
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

    console.log('Notification Response Received:', response);

    // Handle Quick Reply (Action)
    if (response.actionIdentifier === 'reply') {
        const replyText = response.userText;
        const data = response.notification.request.content.data;

        if (replyText && data) {
            await handleBackgroundReply(data, replyText);
            return;
        }
    }

    // Handle Navigation
    const data = response.notification.request.content.data;

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

    // Specific Redirections based on type or data
    if (data?.type === 'new_message' || data?.senderId) {
        navigation.navigate('Chat', {
            otherUser: {
                _id: data.senderId,
                displayName: data.senderName
            }
        });
    } else if (data?.type === 'meeting_created' || data?.meetingId) {
        navigation.navigate('Calendar', {
            selectedMeetingId: data.meetingId,
            clubId: data.clubId
        });
    } else if (data?.type === 'task_assigned' || data?.taskId) {
        navigation.navigate('Tasks', {
            focusTaskId: data.taskId
        });
    } else if (data?.clubId) {
        navigation.navigate('Chat', {
            isGroupChat: true,
            clubId: data.clubId,
            clubName: data.clubName
        });
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

        // Show success local notification
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

    // Listen for notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        handleNotificationResponse(response, navigation);
    });

    // Listen for notifications received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received in foreground:', notification);
        // Notification will be displayed automatically by the handler
    });

    return () => {
        responseSubscription.remove();
        receivedSubscription.remove();
    };
};

/**
 * Send a local notification (for testing)
 */
export const sendLocalNotification = async (title, body, data = {}) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            categoryIdentifier: 'chat-reply',
        },
        trigger: null, // null means immediate
    });
};
