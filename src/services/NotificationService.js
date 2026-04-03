import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import { GENERAL_MESSAGES, NOTIFICATION_TIMES, getRandomMessage } from '../constants/notificationMessages';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Register for push notifications and get FCM token
 * @returns {Promise<string|null>} FCM token or null if registration failed
 */
export const registerForPushNotifications = async () => {
    try {
        // Only on actual devices for real push tokens
        if (!Device.isDevice) {
            console.log('⚠️ Push notifications skipped: Simulator/Web detected');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('❌ Push notification permission denied');
            return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });

        const token = tokenData.data;
        console.log('✅ FCM Token obtained:', token);

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'CounselMe Notifications',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0A66C2',
                sound: 'default',
            });
        }

        return token;
    } catch (error) {
        console.error('❌ Error registering for push notifications:', error);
        return null;
    }
};

/**
 * Save FCM token to backend
 * @param {string} token - FCM token
 */
export const saveFCMTokenToBackend = async (token) => {
    try {
        await api.put('/users/fcm-token', { fcmToken: token });
        console.log('✅ FCM token saved to backend');
        return true;
    } catch (error) {
        console.error('❌ Error saving FCM token to backend:', error);
        return false;
    }
};

/**
 * Remove FCM token from backend (on logout)
 */
export const removeFCMTokenFromBackend = async () => {
    try {
        await api.delete('/users/fcm-token');
        console.log('✅ FCM token removed from backend');
        return true;
    } catch (error) {
        console.error('❌ Error removing FCM token from backend:', error);
        return false;
    }
};

/**
 * Setup notification listeners
 * @returns {Object} Subscription objects
 */
export const setupNotificationListeners = (onNotificationReceived, onNotificationTapped) => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('📬 Notification received:', notification);
        if (onNotificationReceived) onNotificationReceived(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification tapped:', response);
        if (onNotificationTapped) onNotificationTapped(response);
    });

    return { notificationListener, responseListener };
};

/**
 * Clean up notification listeners
 */
export const cleanupNotificationListeners = (subscriptions) => {
    if (subscriptions.notificationListener) {
        Notifications.removeNotificationSubscription(subscriptions.notificationListener);
    }
    if (subscriptions.responseListener) {
        Notifications.removeNotificationSubscription(subscriptions.responseListener);
    }
};

/**
 * Schedule a local notification
 */
export const scheduleLocalNotification = async (notification) => {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: notification.title,
                body: notification.body,
                data: notification.data || {},
                sound: 'default',
            },
            trigger: null,
        });
        console.log('✅ Local notification scheduled');
    } catch (error) {
        console.error('❌ Error scheduling local notification:', error);
    }
};

/**
 * Schedule twice daily random reminders
 * Works offline as it only schedules local notifications
 */
export const scheduleDailyRandomReminders = async () => {
    try {
        // 1. Cancel all previous scheduled local notifications to avoid overlap/duplication
        await Notifications.cancelAllScheduledNotificationsAsync();

        // 2. Pick 2 random time slots from the list (morning and evening ranges if possible)
        const sortedTimes = [...NOTIFICATION_TIMES].sort((a, b) => a - b);
        const morningSlots = sortedTimes.filter(t => t < 14);
        const eveningSlots = sortedTimes.filter(t => t >= 14);

        const t1 = morningSlots[Math.floor(Math.random() * morningSlots.length)] || 10;
        const t2 = eveningSlots[Math.floor(Math.random() * eveningSlots.length)] || 18;

        // 3. Pick 2 random messages
        const msg1 = getRandomMessage(GENERAL_MESSAGES);
        let msg2 = getRandomMessage(GENERAL_MESSAGES);
        while (msg1.title === msg2.title) msg2 = getRandomMessage(GENERAL_MESSAGES); // Avoid dups

        // 4. Schedule Slot 1 (Daily)
        await Notifications.scheduleNotificationAsync({
            content: {
                title: msg1.title,
                body: msg1.body,
                sound: 'default',
                data: { type: 'reminder' }
            },
            trigger: {
                hour: t1,
                minute: 0,
                repeats: true,
            },
        });

        // 5. Schedule Slot 2 (Daily)
        await Notifications.scheduleNotificationAsync({
            content: {
                title: msg2.title,
                body: msg2.body,
                sound: 'default',
                data: { type: 'reminder' }
            },
            trigger: {
                hour: t2,
                minute: 30, // Offset a bit for variety
                repeats: true,
            },
        });

        console.log(`✅ Daily reminders scheduled for: ${t1}:00 and ${t2}:30`);
    } catch (error) {
        console.error('❌ Error scheduling daily reminders:', error);
    }
};

/**
 * Wrapper for AuthContext initialization
 */
export const registerForPushNotificationsAsync = async (userId) => {
    try {
        // Also setup local random notifications whenever this is triggered (offline + online support)
        await scheduleDailyRandomReminders();

        const token = await registerForPushNotifications();
        if (token) {
            await saveFCMTokenToBackend(token);
            return token;
        }
        return null;
    } catch (error) {
        console.error('❌ Error in registerForPushNotificationsAsync:', error);
        return null;
    }
};

