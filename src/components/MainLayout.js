import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    Platform,
    Text,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomBar from './BottomBar';
import NotificationsModal from './NotificationsModal';
import QRScannerModal from './QRScannerModal';
import { useAuth } from '../contexts/AuthContext';
import { notificationsAPI } from '../services/api';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const MainLayout = ({ children, navigation, currentRoute, title, transparentNavbar = false }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const { user, unreadCount, unreadMessageCount } = useAuth();
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        // Simple connectivity check for Expo/RN
        const checkConnection = async () => {
            try {
                // If navigator.onLine is available (web), use it as a first check
                if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
                    setIsConnected(navigator.onLine);
                } else {
                    // For native, attempt a small fetch
                    const response = await fetch('https://google.com', { method: 'HEAD' });
                    setIsConnected(response.ok);
                }
            } catch (error) {
                setIsConnected(false);
            }
        };

        const interval = setInterval(checkConnection, 10000); // Check every 10 seconds
        checkConnection();

        // Also listen to web events if applicable
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.addEventListener('online', () => setIsConnected(true));
            window.addEventListener('offline', () => setIsConnected(false));
        }

        return () => {
            clearInterval(interval);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.removeEventListener('online', () => setIsConnected(true));
                window.removeEventListener('offline', () => setIsConnected(false));
            }
        };
    }, []);

    const handleProfilePress = () => {
        if (currentRoute !== 'Profile') {
            navigation.navigate('Profile');
        }
    };

    return (
        <View style={styles.container}>
            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline" size={16} color="#FFF" />
                    <Text style={styles.offlineText}>No Internet Connection</Text>
                </View>
            )}
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onScanPress={() => setScannerOpen(true)}
                navigation={navigation}
                currentRoute={currentRoute}
            />

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Navbar with Menu Button */}
                <Navbar
                    navigation={navigation}
                    onMenuPress={() => setSidebarOpen(true)}
                    onNotificationsPress={() => setNotificationsOpen(true)}
                    onProfilePress={handleProfilePress}
                    title={title || currentRoute || 'Dashboard'}
                    showMenu={true}
                    unreadCount={unreadCount}
                    unreadMessageCount={unreadMessageCount}
                    transparent={transparentNavbar}
                />

                <NotificationsModal
                    visible={notificationsOpen}
                    onClose={() => setNotificationsOpen(false)}
                    navigation={navigation}
                />

                <QRScannerModal
                    visible={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                />

                {/* Content Area */}
                <View style={[
                    styles.contentArea,
                    isMobile && styles.contentAreaMobile,
                    transparentNavbar && { marginTop: -(56 + (isMobile ? 0 : 0)) } // Overlap navbar
                ]}>
                    {children}
                </View>

                {/* Bottom Bar (Mobile only) */}
                {isMobile && (
                    <BottomBar
                        navigation={navigation}
                        currentRoute={currentRoute}
                        onScanPress={() => setScannerOpen(true)}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        height: Platform.OS === 'web' ? '100vh' : '100%',
        width: '100%',
    },
    mainContent: {
        flex: 1,
        height: Platform.OS === 'web' ? '100vh' : '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    contentArea: {
        flex: 1,
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
    },
    contentAreaMobile: {
        paddingBottom: 90, // Space for BottomBar
    },
    offlineBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        zIndex: 9999,
        gap: 8,
    },
    offlineText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default MainLayout;
