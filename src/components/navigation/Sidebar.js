import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import GradientBorder from '../ui/GradientBorder';
import { useAuth } from '../../contexts/AuthContext';
import {
    Home, Search, LayoutGrid, Users, History, Bookmark,
    Settings, LogOut, X, ChevronRight, User, Star
} from 'lucide-react-native';

import { LinearGradient } from 'expo-linear-gradient';

const Sidebar = ({ navigation, state }) => {
    const { user, logout } = useAuth();

    // Map local banner IDs to assets
    const bannerAssets = {
        'local-banner-1': require('../../../assets/banners/blue_geometric.png'),
        'local-banner-2': require('../../../assets/banners/blue_abstract.png'),
        'local-banner-3': require('../../../assets/banners/blue_shapes.png'),
        'local-banner-4': require('../../../assets/banners/blue_cloud.png'),
    };

    const MenuItems = [
        { label: 'Dashboard', icon: Home, route: 'Dashboard' },
        { label: 'Browse Colleges', icon: Search, route: 'BrowseColleges' },
        { label: 'College Predictor', icon: LayoutGrid, route: 'Predictor' },
        { label: 'Nearby Colleges', icon: Users, route: 'NearbyColleges' },
        { label: 'Saved Colleges', icon: Bookmark, route: 'SavedColleges' },
        { label: 'AI Counselor', icon: History, route: 'AICounselor' },
        { label: 'Settings', icon: Settings, route: 'Settings' },
    ];

    const AdminItems = [
        { label: 'Institution Manager', icon: Settings, route: 'CreateInstitution' },
        { label: 'Featured Colleges', icon: Star, route: 'FeaturedColleges' },
        { label: 'Cutoff Uploader', icon: Settings, route: 'UploadCutoff' },
        { label: 'User Management', icon: Users, route: 'UserManagement' },
        { label: 'System Analytics', icon: LayoutGrid, route: 'SystemAnalytics' },
        { label: 'Settings', icon: Settings, route: 'Settings' },
    ];

    const NavItem = ({ item }) => {
        const currentRoute = state?.routes[state.index];
        const nestedRoute = currentRoute?.state?.routes[currentRoute?.state?.index]?.name;
        const isActive = currentRoute?.name === item.route || nestedRoute === item.route;
        const Icon = item.icon;

        const handleNav = () => {
            navigation.navigate('MainTabs', { screen: item.route });
        };

        return (
            <TouchableOpacity
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={handleNav}
            >
                <Icon size={20} color={isActive ? Colors.primary : Colors.text.tertiary} />
                <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>
                {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
        );
    };

    const renderHeader = () => {
        const hasBanner = !!user?.preferences?.sidebarBanner;
        const bannerUrl = user?.preferences?.sidebarBanner;

        const bannerSource = hasBanner
            ? (bannerAssets[bannerUrl] || { uri: bannerUrl })
            : null;

        return (
            <View style={[styles.header, hasBanner && styles.headerWithBanner]}>
                {hasBanner ? (
                    <>
                        <Image source={bannerSource} style={styles.headerBg} resizeMode="cover" />
                        <View style={styles.headerOverlay} />
                    </>
                ) : null}

                <View style={styles.profileBox}>
                    <GradientBorder size={54} borderWidth={hasBanner ? 2 : 1}>
                        <Image
                            source={{ uri: user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=Random&size=128` }}
                            style={styles.avatarImg}
                        />
                    </GradientBorder>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, hasBanner && styles.whiteText]}>
                            {user?.displayName || 'Student'}
                        </Text>
                        <Text style={[styles.profileEmail, hasBanner && styles.lightText]}>
                            {user?.email}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>MAIN MENU</Text>
                {MenuItems.map((item, idx) => <NavItem key={idx} item={item} />)}

                {user?.role === 'admin' && (
                    <>
                        <View style={styles.divider} />
                        <Text style={styles.sectionLabel}>ADMIN PANEL</Text>
                        {AdminItems.map((item, idx) => <NavItem key={idx} item={item} />)}
                    </>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <LogOut size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
                <Text style={styles.versionText}>AlloteMe v1.0.0</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white, marginTop: 28 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 25,
        backgroundColor: Colors.white,
        position: 'relative',
        overflow: 'hidden'
    },
    headerWithBanner: {
        paddingTop: 60,
    },
    headerBg: {
        ...StyleSheet.absoluteFillObject,
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    profileBox: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10 },
    profileInfo: { flex: 1 },
    avatarImg: { width: '100%', height: '100%' },
    profileName: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    profileEmail: { fontSize: 13, color: Colors.text.tertiary },
    whiteText: { color: Colors.white },
    lightText: { color: 'rgba(255,255,255,0.8)' },

    menuList: { flex: 1, padding: 16 },
    sectionLabel: { fontSize: 11, fontWeight: 'bold', color: Colors.text.tertiary, letterSpacing: 1, marginBottom: 16, marginLeft: 8 },
    navItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 4, gap: 12 },
    navItemActive: { backgroundColor: Colors.primary + '08' },
    navText: { fontSize: 14, fontWeight: '500', color: Colors.text.secondary },
    navTextActive: { color: Colors.primary, fontWeight: 'bold' },
    activeIndicator: { width: 4, height: 16, backgroundColor: Colors.primary, borderRadius: 2, position: 'absolute', right: 0 },
    divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 20 },
    footer: { padding: 24, paddingBottom: 32, borderTopWidth: 1, borderTopColor: Colors.divider },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
    logoutText: { fontSize: 14, fontWeight: 'bold', color: Colors.error },
    versionText: { fontSize: 10, color: Colors.text.tertiary, textAlign: 'center', marginTop: 16 }
});

export default Sidebar;
