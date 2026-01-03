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

import { useAuth } from '../contexts/AuthContext';
import { Image } from 'react-native';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const Navbar = ({ onMenuPress, title = 'Dashboard', showMenu = true, onNotificationsPress, onProfilePress, unreadCount = 0, unreadMessageCount = 0, navigation, transparent = false }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth(); // Get user for profile pic

    return (
        <LinearGradient
            colors={transparent ? ['transparent', 'transparent'] : ['#0A66C2', '#0E76A8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.navbar, { paddingTop: insets.top }, transparent && { elevation: 0, shadowOpacity: 0 }]}
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
                    <Text
                        style={styles.title}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {title}
                    </Text>
                </View>

                {/* Right: Message, Notification & Profile */}
                <View style={styles.rightSection}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation?.navigate('Messages')}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
                        {unreadMessageCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconButton} onPress={onNotificationsPress}>
                        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
                        <Image
                            source={{
                                uri: user?.profilePicture?.url
                                    ? user.profilePicture.url
                                    : `https://api.dicebear.com/9.x/notionists/png?seed=${user?._id || 'random'}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                            }}
                            style={styles.avatarImage}
                        />
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
        fontSize: 18,
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
        marginLeft: 4,
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
});

export default Navbar;
