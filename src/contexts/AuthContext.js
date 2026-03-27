import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { io } from 'socket.io-client';
import { Platform } from 'react-native';

const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5100' : 'http://localhost:5100';
const RENDER_URL = 'https://alloteme-android-cqdu.onrender.com';
const API_BASE_URL = RENDER_URL;
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasSkippedProfile, setHasSkippedProfile] = useState(false);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        loadUser();

        // Initialize socket
        const newSocket = io(API_BASE_URL, {
            transports: ['websocket'],
            autoConnect: true
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to backend:', newSocket.id);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

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
            const { token, ...userData } = response.data;
            await AsyncStorage.setItem('userToken', token);
            setUser(userData);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            const { token, ...data } = response.data;
            await AsyncStorage.setItem('userToken', token);
            setUser(data);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = async () => {
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
            login,
            register,
            logout,
            refreshUser,
            toggleSaveOptimistic,
            hasSkippedProfile,
            setHasSkippedProfile,
            socket,
            unreadCount: 0,
            unreadMessageCount: 0,
            refreshUnreadCount: () => { }
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
