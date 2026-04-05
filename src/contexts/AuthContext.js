import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, notificationsAPI } from '../services/api';
import { io } from 'socket.io-client';
import { Platform } from 'react-native';
import { registerForPushNotificationsAsync, removeFCMTokenFromBackend, scheduleLocalNotification } from '../services/NotificationService';

const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5100' : 'http://127.0.0.1:5100';
const RENDER_URL = 'https://alloteme-android-cqdu.onrender.com';
// ⚠️ Keep in sync with src/services/api.js — switch together
const API_BASE_URL = LOCAL_URL;
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasSkippedProfile, setHasSkippedProfile] = useState(false);
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showAvatarPopup, setShowAvatarPopupState] = useState(false);
    const [admissionPath, setAdmissionPathState] = useState('MHTCET PCM');

    useEffect(() => {
        loadAdmissionPath();
    }, []);

    const loadAdmissionPath = async () => {
        try {
            const path = await AsyncStorage.getItem('admissionPath');
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

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                const response = await authAPI.getProfile();
                setUser(response.data);
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
            toggleSaveOptimistic,
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
            }
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
