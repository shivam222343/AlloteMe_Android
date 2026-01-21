import { Platform } from 'react-native';
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import io from 'socket.io-client';
import { API_CONFIG } from '../constants/theme';
import { registerForPushNotificationsAsync } from '../services/NotificationService';
import * as Notifications from 'expo-notifications';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [socket, setSocket] = useState(null);
    const [selectedClubId, setSelectedClubId] = useState('all');
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const lastUnreadFetch = React.useRef(0);

    // Load selected club from storage
    useEffect(() => {
        const loadSavedClub = async () => {
            try {
                const saved = await AsyncStorage.getItem('lastSelectedClub');
                if (saved) setSelectedClubId(saved);
            } catch (e) { }
        };
        loadSavedClub();
    }, []);

    const updateSelectedClub = async (id) => {
        setSelectedClubId(id);
        try {
            await AsyncStorage.setItem('lastSelectedClub', id);
        } catch (e) { }
    };

    // Check if user is logged in on app start
    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        let interval;
        if (isAuthenticated && user) {
            fetchUnreadCount();
            fetchUnreadMessageCount();
            interval = setInterval(() => {
                fetchUnreadCount();
                fetchUnreadMessageCount();
            }, 30000);

            // Register for Push Notifications
            registerForPushNotificationsAsync(user._id);

            // Initialize Socket
            const newSocket = io(API_CONFIG.SOCKET_URL, {
                query: { userId: user._id },
                transports: ['websocket']
            });

            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id);
                newSocket.emit('user:online', user._id);

                // Join club rooms for real-time updates
                newSocket.emit('club:join', 'all');
                if (user.clubsJoined && Array.isArray(user.clubsJoined)) {
                    user.clubsJoined.forEach(c => {
                        const clubId = c.clubId?._id || c.clubId;
                        if (clubId) {
                            newSocket.emit('club:join', clubId.toString());
                        }
                    });
                }
            });

            newSocket.on('notification:game_hosted', (data) => {
                if (Platform.OS === 'web') {
                    console.log('Game hosted notification (suppressed on web):', data);
                    return;
                }
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: data.title,
                        body: data.message,
                        data: {
                            screen: 'MaverickGames',
                            params: {
                                autoOpenLobby: true,
                                gameType: data.gameType || 'sketch_heads',
                                roomId: data.roomId
                            }
                        },
                    },
                    trigger: null,
                });
            });

            // Generic real-time notification listener
            newSocket.on('notification:receive', (data) => {
                console.log('Real-time notification received via socket:', data);
                if (data && data.title) {
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: data.title,
                            body: data.message || data.body || '',
                            data: data.data || data,
                            sound: true,
                        },
                        trigger: null,
                    });
                }
                fetchUnreadCount();
                checkAuth(); // Refresh user profile to pick up new club memberships
            });

            newSocket.on('message:receive', (message) => {
                console.log('New private message received via socket');
                if (message && message.content) {
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: `New Message from ${message.senderId?.displayName || 'User'}`,
                            body: message.content,
                            data: { screen: 'Chat', params: { otherUser: message.senderId } },
                            sound: true,
                        },
                        trigger: null,
                    });
                }
                fetchUnreadMessageCount();
            });

            newSocket.on('group:message', (data) => {
                console.log('New group message received via socket');
                // Only show notification if it's not from self (senderId usually handles this but safety first)
                if (data.message && data.message.senderId?._id !== user._id) {
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: `${data.message.senderId?.displayName} in ${data.clubName || 'Group'}`,
                            body: data.message.content,
                            data: {
                                screen: 'Chat',
                                params: { clubId: data.clubId, isGroupChat: true, clubName: data.clubName },
                                category: 'chat-reply'
                            },
                        },
                        trigger: null,
                    });
                }
                fetchUnreadMessageCount();
            });

            newSocket.on('notification_receive', () => {
                fetchUnreadCount();
                checkAuth(); // Refresh user profile to pick up new club memberships
            });

            setSocket(newSocket);

            return () => {
                if (newSocket) {
                    newSocket.emit('user:offline', user._id);
                    newSocket.disconnect();
                }
                if (interval) clearInterval(interval);
            };
        }
    }, [isAuthenticated, user]);

    // Handle joining club rooms dynamically when user joins a new club
    useEffect(() => {
        if (socket && user?.clubsJoined) {
            user.clubsJoined.forEach(c => {
                const clubId = c.clubId?._id || c.clubId;
                if (clubId) {
                    socket.emit('club:join', clubId.toString());
                }
            });
        }
    }, [socket, user?.clubsJoined]);

    const fetchUnreadCount = async () => {
        // Debounce frequent calls from screen remounts
        // We remove global debounce for simplicity if called from different effects
        try {
            const { notificationsAPI } = require('../services/api');
            const res = await notificationsAPI.getAll();
            if (res.success && Array.isArray(res.data)) {
                const count = res.data.filter(n => !n.read).length;
                setUnreadCount(count);
            }
        } catch (error) {
            console.log('Unread count fetch skipped or failed');
        }
    };

    const fetchUnreadMessageCount = async () => {
        try {
            const { messagesAPI, groupChatAPI } = require('../services/api');

            // Fetch individual unread
            const messagesRes = await messagesAPI.getConversations();
            let totalUnread = 0;
            if (messagesRes.success && Array.isArray(messagesRes.data)) {
                totalUnread += messagesRes.data.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
            }

            // Fetch group unread for all joined clubs
            if (user && user.clubsJoined) {
                const groupChatPromises = user.clubsJoined.map(async (c) => {
                    try {
                        const clubId = c.clubId?._id || c.clubId;
                        if (!clubId) return 0;
                        const res = await groupChatAPI.getUnreadCount(clubId.toString());
                        return res.success ? (res.data.unreadCount || 0) : 0;
                    } catch (err) {
                        return 0;
                    }
                });
                const groupUnreadCounts = await Promise.all(groupChatPromises);
                totalUnread += groupUnreadCounts.reduce((sum, count) => sum + count, 0);
            }

            setUnreadMessageCount(totalUnread);
        } catch (error) {
            console.log('Unread message fetch failed', error);
        }
    };

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('backendToken');
            if (token) {
                // Determine if we have cached user data first
                const userData = await AsyncStorage.getItem('userData');
                if (userData) {
                    setUser(JSON.parse(userData));
                    setIsAuthenticated(true);
                }

                // Verify with backend
                const response = await authAPI.getMe();
                if (response.success && response.data) {
                    setUser(response.data);
                    setIsAuthenticated(true);
                    await AsyncStorage.setItem('userData', JSON.stringify(response.data));
                } else {
                    // Token invalid
                    await logout();
                }
            } else {
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // Don't logout immediately on network error, just keep cached state if possible
            const token = await AsyncStorage.getItem('backendToken');
            if (!token) await logout();
        } finally {
            setLoading(false);
        }
    };

    const signup = async (userData) => {
        try {
            const response = await authAPI.signup(userData);
            if (response.success && response.data) {
                const { token, user } = response.data;
                await AsyncStorage.setItem('backendToken', token);
                await AsyncStorage.setItem('userData', JSON.stringify(user));
                setUser(user);
                setIsAuthenticated(true);
                return { success: true };
            }
            return { success: false, message: response.message };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Signup failed'
            };
        }
    };

    const signin = async (credentials) => {
        try {
            const response = await authAPI.signin(credentials);
            if (response.success && response.data) {
                const { token, user } = response.data;
                await AsyncStorage.setItem('backendToken', token);
                await AsyncStorage.setItem('userData', JSON.stringify(user));
                setUser(user);
                setIsAuthenticated(true);
                return { success: true };
            }
            return { success: false, message: response.message };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    };

    const logout = async () => {
        try {
            // Remove FCM token from backend
            const { removeFCMTokenFromBackend } = require('../services/NotificationService');
            await removeFCMTokenFromBackend();

            await authAPI.logout();
        } catch (error) {
            // Ignore error
        } finally {
            await AsyncStorage.removeItem('backendToken');
            await AsyncStorage.removeItem('userData');
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userId');
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const updateProfile = async (profileData) => {
        try {
            const response = await authAPI.updateProfile(profileData);
            if (response.success && response.data) {
                setUser(response.data);
                await AsyncStorage.setItem('userData', JSON.stringify(response.data));
                return { success: true };
            }
            return { success: false, message: response.message };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Update failed'
            };
        }
    };

    const uploadProfilePicture = async (formData) => {
        try {
            const response = await authAPI.uploadProfilePicture(formData);
            if (response.success && response.data) {
                const updatedUser = { ...user, profilePicture: response.data.profilePicture };
                setUser(updatedUser);
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
                return { success: true };
            }
            return { success: false, message: response.message };
        } catch (error) {
            console.error('Profile picture upload error:', {
                message: error.message,
                status: error.status,
                originalError: error.originalError,
                code: error.code
            });
            return {
                success: false,
                message: error.message || 'Upload failed'
            };
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        signup,
        signin,
        logout,
        updateProfile,
        uploadProfilePicture,
        refreshUser: checkAuth,
        unreadCount,
        refreshUnreadCount: fetchUnreadCount,
        unreadMessageCount,
        refreshUnreadMessageCount: fetchUnreadMessageCount,
        socket,
        selectedClubId,
        updateSelectedClub,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
