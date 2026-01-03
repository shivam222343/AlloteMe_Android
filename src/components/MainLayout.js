import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    Platform,
} from 'react-native';
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

    const handleProfilePress = () => {
        if (currentRoute !== 'Profile') {
            navigation.navigate('Profile');
        }
    };

    return (
        <View style={styles.container}>
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
});

export default MainLayout;
