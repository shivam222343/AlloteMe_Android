import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, notificationsAPI } from '../services/api';
import { io } from 'socket.io-client';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptions';
import { Platform } from 'react-native';
import { registerForPushNotificationsAsync, removeFCMTokenFromBackend, scheduleLocalNotification } from '../services/NotificationService';

const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5100' : 'http://127.0.0.1:5100';
const RENDER_URL = 'https://alloteme-android-cqdu.onrender.com';
// ⚠️ Keep in sync with src/services/api.js — switch together
const API_BASE_URL = RENDER_URL;
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUserState] = useState(null);
    
    // Custom setUser that also handles initialization
    const setUser = (data) => {
        if (data && !data.subscription) {
            data.subscription = {
                type: 'free',
                usage: { aiPrompts: 0, predictions: 0, exports: 0 }
            };
        } else if (data && data.subscription && !data.subscription.usage) {
            data.subscription.usage = { aiPrompts: 0, predictions: 0, exports: 0 };
        }
        setUserState(data);
    };
    const [loading, setLoading] = useState(true);
    const [hasSkippedProfile, setHasSkippedProfile] = useState(false);
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showAvatarPopup, setShowAvatarPopupState] = useState(false);
    const [admissionPath, setAdmissionPathState] = useState('MHTCET PCM');
    const [subscriptionModal, setSubscriptionModal] = useState({ visible: false, feature: '' });

    useEffect(() => {
        loadAdmissionPath();
    }, []);

    const loadAdmissionPath = async () => {
        try {
            const path = await AsyncStorage.getItem('admissionPath').catch(() => null);
            if (path) setAdmissionPathState(path);
        } catch (e) {
            console.error('Failed to load admission path', e);
        }
    };

    const setAdmissionPath = async (path) => {
        setAdmissionPathState(path);
        try {
            await AsyncStorage.setItem('admissionPath', path);
            if (Platform.OS === 'web') {
                window.location.reload();
            }
        } catch (e) {
            console.error('Failed to save admission path', e);
        }
    };

    useEffect(() => {
        if (socket && user?._id) {
            console.log(`[Socket] Joining room: ${user._id}`);
            socket.emit('join', user._id);
        }
    }, [socket, user?._id]);

    const syncNotifications = async () => {
        if (!user?._id) return;
        try {
            const res = await notificationsAPI.getAll();
            if (res.data) {
                const serverNotifs = res.data.map(n => ({
                    _id: n._id,
                    title: n.title,
                    message: n.message,
                    type: n.type || 'info',
                    read: n.isRead,
                    createdAt: n.createdAt
                }));

                setNotifications(prev => {
                    const combined = [...serverNotifs, ...prev];
                    // Filter unique by _id
                    const unique = combined.filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
                    const sorted = unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
                    saveLocalNotifications(sorted);
                    setUnreadCount(sorted.filter(n => !n.read).length);
                    return sorted;
                });
            }
        } catch (error) {
            console.log('[AuthContext] Sync notifications error:', error);
        }
    };

    // Initial load: user, local notifications, and deferred server sync
    useEffect(() => {
        loadUser();
        loadLocalNotifications();
    }, []);

    // Sync notifications from server when user logs in
    useEffect(() => {
        if (user?._id) {
            const syncTimer = setTimeout(syncNotifications, 2000);
            return () => clearTimeout(syncTimer);
        }
    }, [user?._id]);

    // Socket setup
    useEffect(() => {
        // Trigger notification registration
        registerForPushNotificationsAsync();

        // Initialize socket
        const newSocket = io(API_BASE_URL, {
            transports: ['websocket'],
            autoConnect: true
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to backend:', newSocket.id);
        });

        newSocket.on('notification:received', async (data) => {
            console.log('[Socket] New notification:', data);

            // Trigger actual system notification if app is active
            scheduleLocalNotification({
                title: data.title || 'New Notification',
                body: data.message,
                data: data
            });

            const newNotif = {
                _id: data._id || Date.now().toString(),
                title: data.title,
                message: data.message,
                type: data.type || 'info',
                read: false,
                createdAt: data.createdAt || new Date().toISOString()
            };

            setNotifications(prev => {
                const updated = [newNotif, ...prev].slice(0, 50); // Keep last 50
                saveLocalNotifications(updated);
                return updated;
            });
            setUnreadCount(prev => prev + 1);
        });

        newSocket.on('user:updated', (data) => {
            console.log('[Socket] User profile updated remotely:', data?._id);
            if (data) {
                // Ensure we don't accidentally wipe notifications or token if the payload is partial
                setUser(prev => ({ ...prev, ...data }));
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Notification Helpers
    const loadLocalNotifications = async () => {
        try {
            const stored = await AsyncStorage.getItem('local_notifications');
            if (stored) {
                const parsed = JSON.parse(stored);
                setNotifications(parsed);
                setUnreadCount(parsed.filter(n => !n.read).length);
            }
        } catch (e) {
            console.error('Failed to load local notifications', e);
        }
    };

    const saveLocalNotifications = async (list) => {
        try {
            await AsyncStorage.setItem('local_notifications', JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save local notifications', e);
        }
    };

    const markLocalNotifAsRead = async (id) => {
        const updated = notifications.map(n => n._id === id ? { ...n, read: true } : n);
        setNotifications(updated);
        setUnreadCount(updated.filter(n => !n.read).length);
        saveLocalNotifications(updated);
    };

    const markAllLocalNotifsAsRead = async () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        setUnreadCount(0);
        saveLocalNotifications(updated);
    };

    const deleteLocalNotif = async (id) => {
        const updated = notifications.filter(n => n._id !== id);
        setNotifications(updated);
        setUnreadCount(updated.filter(n => !n.read).length);
        saveLocalNotifications(updated);
    };

    const clearAllLocalNotifs = async () => {
        setNotifications([]);
        setUnreadCount(0);
        await AsyncStorage.removeItem('local_notifications');
    };

    const refreshUser = async () => {
        try {
            const response = await authAPI.getProfile();
            setUser(response.data);
        } catch (error) {
            console.error('Failed to refresh user', error);
        }
    };

    const checkLimit = (type) => {
        if (!user) return true;
        
        const sub = user.subscription || { type: 'free', usage: { aiPrompts: 0, predictions: 0, exports: 0 }};
        const plan = SUBSCRIPTION_PLANS[sub.type.toUpperCase()] || SUBSCRIPTION_PLANS.FREE;
        
        const currentUsage = sub.usage?.[type] || 0;
        const limit = plan.limits[type];
        
        if (currentUsage >= limit) {
            setSubscriptionModal({ visible: true, feature: type });
            return false;
        }
        return true;
    };

    const incrementUsage = async (type) => {
        if (!user) return;
        
        const newUsage = { 
            ...(user.subscription?.usage || { aiPrompts: 0, predictions: 0, exports: 0 }) 
        };
        newUsage[type] = (newUsage[type] || 0) + 1;
        
        const updatedSubscription = {
            ...(user.subscription || { type: 'free' }),
            usage: newUsage
        };
        
        // Optimistic update
        setUser(prev => ({ ...prev, subscription: updatedSubscription }));
        
        // Local storage backup
        const cacheKey = `user_usage_${user._id}`;
        try {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(newUsage));
        } catch (e) { }

        try {
            await authAPI.updateProfile({ subscription: updatedSubscription });
        } catch (error) {
            console.error('[AuthContext] Failed to sync usage', error);
        }
    };

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken').catch(() => null);
            if (token) {
                const response = await authAPI.getProfile();
                const userData = response.data;
                
                // Ensure subscription object exists
                if (!userData.subscription) {
                    userData.subscription = {
                        type: 'free',
                        usage: { aiPrompts: 0, predictions: 0, exports: 0 }
                    };
                } else if (!userData.subscription.usage) {
                    userData.subscription.usage = { aiPrompts: 0, predictions: 0, exports: 0 };
                }
                // Check local cache for usage if server says zero (resiliency)
                const cacheKey = `user_usage_${userData._id}`;
                const cachedUsage = await AsyncStorage.getItem(cacheKey);
                if (cachedUsage) {
                    const parsed = JSON.parse(cachedUsage);
                    // Only trust cache if it has HIGHER values (meaning server sync missed something)
                    if (userData.subscription.usage) {
                        userData.subscription.usage.aiPrompts = Math.max(userData.subscription.usage.aiPrompts || 0, parsed.aiPrompts || 0);
                        userData.subscription.usage.predictions = Math.max(userData.subscription.usage.predictions || 0, parsed.predictions || 0);
                        userData.subscription.usage.exports = Math.max(userData.subscription.usage.exports || 0, parsed.exports || 0);
                    }
                }

                setUser(userData);
            }
        } catch (error) {
            console.error('Failed to load user', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials);
            const { token, showAvatarPopup, ...userData } = response.data;
            await AsyncStorage.setItem('userToken', token);
            setUser(userData);
            if (showAvatarPopup) setShowAvatarPopupState(true);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            const { token, showAvatarPopup, ...data } = response.data;
            await AsyncStorage.setItem('userToken', token);
            setUser(data);
            if (showAvatarPopup) setShowAvatarPopupState(true);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = async () => {
        try {
            await removeFCMTokenFromBackend();
        } catch (e) { }
        await AsyncStorage.removeItem('userToken');
        setUser(null);
    };

    const toggleSaveOptimistic = async (collegeId) => {
        if (!user) return;

        // Optimistic State Update
        const prevSaved = [...(user.savedColleges || [])];
        const isCurrentlySaved = prevSaved.some(c => (c._id === collegeId || c === collegeId));

        // Immediate local UI change
        let newSaved;
        if (isCurrentlySaved) {
            newSaved = prevSaved.filter(c => (c._id !== collegeId && c !== collegeId));
        } else {
            newSaved = [...prevSaved, collegeId];
        }

        setUser(prev => ({ ...prev, savedColleges: newSaved }));

        try {
            const res = await authAPI.toggleSave(collegeId);
            if (res.data.success) {
                // Final sync with server-side populated entities
                setUser(prev => ({ ...prev, savedColleges: res.data.savedColleges }));
            }
        } catch (error) {
            console.error('[AuthContext] Toggle save error:', error);
            // Rollback on error
            setUser(prev => ({ ...prev, savedColleges: prevSaved }));
        }
    };

    const toggleSavePredictionOptimistic = async (prediction) => {
        if (!user) return;

        const getCollegeId = (c) => (c && typeof c === 'object' ? c._id : c);
        const predCollegeId = getCollegeId(prediction.collegeId);

        // Prediction object needs to have collegeId, branch, year, round...
        const prevSaved = [...(user.savedPredictions || [])];

        const existingIdx = prevSaved.findIndex(p =>
            getCollegeId(p.collegeId) === predCollegeId &&
            p.branch === prediction.branch &&
            p.year === prediction.year &&
            p.round === prediction.round &&
            (p.category || '') === (prediction.category || '') &&
            (p.seatType || '') === (prediction.seatType || '')
        );

        // Immediate local UI change
        let newSaved;
        if (existingIdx > -1) {
            newSaved = prevSaved.filter((_, i) => i !== existingIdx);
        } else {
            // Include essential bits for local rendering until server returns populated
            newSaved = [...prevSaved, { ...prediction, key: Date.now().toString() }];
        }

        setUser(prev => ({ ...prev, savedPredictions: newSaved }));

        try {
            const res = await authAPI.toggleSavePrediction(prediction);
            if (res.data.success) {
                // Final sync with server-populated entities
                setUser(prev => ({ ...prev, savedPredictions: res.data.savedPredictions }));
            }
        } catch (error) {
            console.error('[AuthContext] Toggle save prediction error:', error);
            // Rollback on error
            setUser(prev => ({ ...prev, savedPredictions: prevSaved }));
        }
    };

    const updateProfile = async (data) => {
        try {
            const response = await authAPI.updateProfile(data);
            if (response.data) {
                // Remove password from local state if present
                const { token, ...userData } = response.data;
                setUser(userData);
                return { success: true, data: userData };
            }
        } catch (error) {
            console.error('[AuthContext] Update profile error:', error);
            return { success: false, message: error.response?.data?.message || 'Update failed' };
        }
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated: !!user,
            user,
            loading,
            setLoading,
            login,
            register,
            logout,
            refreshUser,
            updateProfile,
            toggleSaveOptimistic,
            toggleSavePredictionOptimistic,
            hasSkippedProfile,
            setHasSkippedProfile,
            socket,
            notifications,
            unreadCount,
            setUnreadCount,
            admissionPath,
            setAdmissionPath,
            markLocalNotifAsRead,
            markAllLocalNotifsAsRead,
            deleteLocalNotif,
            clearAllLocalNotifs,
            showAvatarPopup,
            setShowAvatarPopup: setShowAvatarPopupState,
            unreadMessageCount: 0,
            refreshUnreadCount: async () => {
                // Now handled locally from notifications array
                setUnreadCount(notifications.filter(n => !n.read).length);
            },
            subscriptionModal,
            setSubscriptionModal,
            checkLimit,
            incrementUsage
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
