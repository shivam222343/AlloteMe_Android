import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    Dimensions,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = width < 768;

const Sidebar = ({ isOpen, onClose, onScanPress, navigation, currentRoute }) => {
    const { user, logout, unreadMessageCount } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const menuItems = [
        { id: 'dashboard', icon: 'home', label: 'Dashboard', route: 'Dashboard' },
        { id: 'meetings', icon: 'calendar', label: 'Meetings', route: 'Meetings' },
        { id: 'members', icon: 'people', label: 'Members', route: 'Members' },
        { id: 'tasks', icon: 'checkmark-circle', label: 'Tasks', route: 'Tasks' },
        { id: 'calendar', icon: 'calendar-outline', label: 'Calendar', route: 'Calendar' },
        { id: ' gallery', icon: 'images', label: 'Gallery', route: 'Gallery' },
        { id: 'events', icon: 'star', label: 'Events & Activities', route: 'Events' },
        { id: 'messages', icon: 'chatbubbles', label: 'Messages', route: 'Messages' },
        { id: 'games', icon: 'game-controller', label: 'Alloteme0077 Games', route: 'MaverickGames' },
        { id: 'notes', icon: 'document-text-outline', label: 'Live Notes', route: 'LiveNotes' },
        { id: 'analytics', icon: 'stats-chart', label: 'Analytics', route: 'Analytics' },
    ];

    const adminItems = [
        { id: 'admin', icon: 'shield', label: 'Admin Panel', route: 'Admin' },
        { id: 'form-builder', icon: 'create-outline', label: 'Form Creator', route: 'FormList' },
    ];

    const generalItems = [
        { id: 'scan', icon: 'qr-code-outline', label: 'Scan Attendance', action: onScanPress },
        { id: 'settings', icon: 'settings-outline', label: 'Settings', route: 'Settings' },
        { id: 'profile', icon: 'person-outline', label: 'Profile', route: 'Profile' },
    ];

    const handleNavigation = (route) => {
        if (route === 'Login') {
            navigation.navigate('Login');
            return;
        }

        // Only navigate to implemented screens
        const implementedScreens = ['Dashboard', 'Profile', 'Admin', 'Login', 'Meetings', 'Members', 'Calendar', 'Settings', 'Messages', 'Chat', 'Camera', 'Gallery', 'Analytics', 'Tasks', 'MaverickGames', 'SketchHeads', 'LiveNotes', 'Events', 'EventDetail', 'FormBuilder', 'FormList'];

        console.log('Navigating to:', route, 'Is implemented:', implementedScreens.includes(route));

        if (implementedScreens.includes(route)) {
            navigation.navigate(route);
        } else {
            // Show alert for unimplemented screens
            alert(`${route} screen coming soon!`);
        }

        if (isMobile && onClose) {
            onClose();
        }
    };

    const handleLogout = async () => {
        try {
            if (isMobile && onClose) onClose();
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const renderMenuItem = (item) => {
        // Special case for Logout action
        if (item.id === 'logout') {
            return (
                <TouchableOpacity
                    key={item.id}
                    onPress={() => setShowLogoutModal(true)}
                    style={styles.menuItem}
                >
                    <Ionicons name={item.icon} size={22} color="#EF4444" />
                    <Text style={[styles.menuText, { color: '#EF4444' }]}>{item.label}</Text>
                </TouchableOpacity>
            );
        }

        const isActive = currentRoute === item.route;
        const showBadge = item.id === 'messages' && unreadMessageCount > 0;

        return (
            <TouchableOpacity
                key={item.id}
                onPress={() => item.action ? item.action() : handleNavigation(item.route)}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
            >
                <View style={{ position: 'relative' }}>
                    <Ionicons
                        name={item.icon}
                        size={22}
                        color={isActive ? '#0A66C2' : '#6B7280'}
                    />
                </View>
                <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                    {item.label}
                </Text>
                {showBadge && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>
                            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                        </Text>
                    </View>
                )}
                {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
        );
    };

    const sidebarContent = (
        <View style={styles.sidebarContent}>
            {/* Header */}
            {/* Header */}
            {user?.preferences?.sidebarBanner ? (
                <View style={styles.header}>
                    <Image
                        source={
                            user.preferences.sidebarBanner.startsWith('http')
                                ? { uri: user.preferences.sidebarBanner }
                                : (
                                    user.preferences.sidebarBanner === 'local-banner-1' ? require('../../assets/banners/blue_geometric.png') :
                                        user.preferences.sidebarBanner === 'local-banner-2' ? require('../../assets/banners/blue_abstract.png') :
                                            user.preferences.sidebarBanner === 'local-banner-3' ? require('../../assets/banners/blue_shapes.png') :
                                                user.preferences.sidebarBanner === 'local-banner-4' ? require('../../assets/banners/blue_cloud.png') :
                                                    { uri: user.preferences.sidebarBanner }
                                )
                        }
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                    />
                    <View style={styles.headerOverlay} />
                    <View style={styles.headerContent}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/AS.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.logoText}>Alloteme0077</Text>
                        </View>
                        {isMobile && (
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.tagline}>Artist Creativity Club</Text>
                </View>
            ) : (
                <LinearGradient
                    colors={['#0A66C2', '#0E76A8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/AS.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.logoText}>Alloteme0077</Text>
                        </View>
                        {isMobile && (
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.tagline}>Artist Creativity Club</Text>
                </LinearGradient>
            )}

            {/* Menu Items */}
            <ScrollView
                style={styles.menuContainer}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>MAIN MENU</Text>
                    {menuItems.map(renderMenuItem)}
                </View>

                {/* Admin Menu - Only for Admins */}
                {(user?.role === 'admin' || user?.role === 'subadmin') && (
                    <View style={styles.menuSection}>
                        <Text style={styles.sectionTitle}>ADMIN</Text>
                        {adminItems.map(renderMenuItem)}
                    </View>
                )}

                {/* General Settings */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>PREFERENCES</Text>
                    {generalItems.map(renderMenuItem)}
                </View>

                {/* Account */}
                <View style={[styles.menuSection, { marginBottom: 40 }]}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    {user ? (
                        renderMenuItem({ id: 'logout', icon: 'log-out-outline', label: 'Logout' })
                    ) : (
                        renderMenuItem({ id: 'login', icon: 'log-in-outline', label: 'Login', route: 'Login' })
                    )}
                </View>
            </ScrollView>

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                title="Logout"
                message="Are you sure you want to logout?"
                confirmText="Logout"
                cancelText="Cancel"
                type="danger"
            />
        </View>
    );
    // Mobile: Overlay sidebar
    if (isMobile) {
        if (!isOpen) return null;

        return (
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={[styles.sidebar, styles.sidebarMobile]}>
                    {sidebarContent}
                </View>
            </View>
        );
    }

    // Web: Static sidebar
    return (
        <View style={[styles.sidebar, styles.sidebarWeb]}>
            {sidebarContent}
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sidebar: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    sidebarMobile: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '75%',
        maxWidth: 300,
    },
    sidebarWeb: {
        width: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    sidebarContent: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)', // Increased opacity for better text visibility
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        zIndex: 10,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoImage: {
        width: 35,
        height: 35,
        marginRight: 10,
        borderRadius: 8,
    },
    logoText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    closeButton: {
        padding: 4,
    },
    tagline: {
        fontSize: 12,
        color: '#D1E5FF',
        fontWeight: '500',
        zIndex: 10,
    },
    menuContainer: {
        flex: 1,
        paddingTop: 16,
    },
    menuSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        position: 'relative',
    },
    menuItemActive: {
        backgroundColor: '#E8F2FF',
    },
    menuText: {
        fontSize: 15,
        color: '#6B7280',
        marginLeft: 16,
        fontWeight: '500',
    },
    menuTextActive: {
        color: '#0A66C2',
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: '#0A66C2',
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    countBadge: {
        marginLeft: 'auto',
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
});

export default Sidebar;
