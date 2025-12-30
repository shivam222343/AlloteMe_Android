import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const Navbar = ({ onMenuPress, title = 'Dashboard', showMenu = true, onNotificationsPress, onProfilePress, unreadCount = 0 }) => {
    const insets = useSafeAreaInsets();

    return (
        <LinearGradient
            colors={['#0A66C2', '#0E76A8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.navbar, { paddingTop: insets.top }]}
        >
            <View style={styles.navbarContent}>
                {/* Left: Menu Button (Mobile only) */}
                {showMenu && isMobile && (
                    <TouchableOpacity
                        onPress={onMenuPress}
                        style={styles.menuButton}
                    >
                        <Ionicons name="menu" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                )}

                {/* Center: Title */}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{title}</Text>
                </View>

                {/* Right: Notification & Profile */}
                <View style={styles.rightSection}>
                    <TouchableOpacity style={styles.iconButton} onPress={onNotificationsPress}>
                        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={20} color="#0A66C2" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    navbar: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    navbarContent: {
        height: 56, // Precise height for content
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    menuButton: {
        padding: 8,
        marginRight: 12,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 8,
        marginRight: 12,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0A66C2',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    profileButton: {
        padding: 4,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Navbar;
