import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

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
        // Check if device is physical (push notifications don't work on simulators)
        if (!Device.isDevice) {
            console.log('⚠️ Push notifications only work on physical devices');
            return null;
        }

        // Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Request permissions if not granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // If permission denied, return null
        if (finalStatus !== 'granted') {
            console.log('❌ Push notification permission denied');
            return null;
        }

        // Get FCM token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });

        const token = tokenData.data;
        console.log('✅ FCM Token obtained:', token);

        // Configure notification channel for Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
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
 * @returns {Promise<boolean>} Success status
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
 * @returns {Promise<boolean>} Success status
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
 * @param {Function} onNotificationReceived - Callback when notification is received
 * @param {Function} onNotificationTapped - Callback when notification is tapped
 * @returns {Object} Subscription objects to clean up later
 */
export const setupNotificationListeners = (onNotificationReceived, onNotificationTapped) => {
    // Listener for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('📬 Notification received:', notification);
        if (onNotificationReceived) {
            onNotificationReceived(notification);
        }
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification tapped:', response);
        if (onNotificationTapped) {
            onNotificationTapped(response);
        }
    });

    return {
        notificationListener,
        responseListener,
    };
};

/**
 * Clean up notification listeners
 * @param {Object} subscriptions - Subscription objects from setupNotificationListeners
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
 * Schedule a local notification (for testing or offline scenarios)
 * @param {Object} notification - Notification content
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
            trigger: null, // Show immediately
        });
        console.log('✅ Local notification scheduled');
    } catch (error) {
        console.error('❌ Error scheduling local notification:', error);
    }
};

/**
 * Get notification badge count
 * @returns {Promise<number>} Badge count
 */
export const getBadgeCount = async () => {
    try {
        const count = await Notifications.getBadgeCountAsync();
        return count;
    } catch (error) {
        console.error('❌ Error getting badge count:', error);
        return 0;
    }
};

/**
 * Set notification badge count
 * @param {number} count - Badge count
 */
export const setBadgeCount = async (count) => {
    try {
        await Notifications.setBadgeCountAsync(count);
        console.log(`✅ Badge count set to ${count}`);
    } catch (error) {
        console.error('❌ Error setting badge count:', error);
    }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
    try {
        await Notifications.dismissAllNotificationsAsync();
        await setBadgeCount(0);
        console.log('✅ All notifications cleared');
    } catch (error) {
        console.error('❌ Error clearing notifications:', error);
    }
};

/**
 * Register for push notifications and save token to backend (wrapper for AuthContext)
 * @param {string} userId - User ID (for logging purposes)
 * @returns {Promise<string|null>} FCM token or null if registration failed
 */
export const registerForPushNotificationsAsync = async (userId) => {
    try {
        console.log(`📱 Registering push notifications for user: ${userId}`);

        // Get FCM token
        const token = await registerForPushNotifications();

        if (token) {
            // Save to backend
            await saveFCMTokenToBackend(token);
            console.log('✅ Push notifications fully registered and saved');
            return token;
        } else {
            console.log('⚠️ Could not obtain FCM token');
            return null;
        }
    } catch (error) {
        console.error('❌ Error in registerForPushNotificationsAsync:', error);
        return null;
    }
};

