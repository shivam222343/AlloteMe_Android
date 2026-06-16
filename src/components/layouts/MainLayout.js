import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, KeyboardAvoidingView, Modal, FlatList,
    Alert, Pressable, ActivityIndicator, ScrollView, Image, useWindowDimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Shadows } from '../../constants/theme';
import { Menu, ChevronLeft, Bell, X, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import GradientBorder from '../ui/GradientBorder';
import AvatarSelectionPopup from '../ui/AvatarSelectionPopup';
import { notificationsAPI } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MainLayout = ({ children, title, showHeader = true, hideBack = false, noPadding = false, style, botSafe = false, scrollable = false }) => {
    const navigation = useNavigation();
    const route = useRoute();
    const {
        user,
        unreadCount,
        setUnreadCount,
        notifications,
        markLocalNotifAsRead,
        markAllLocalNotifsAsRead,
        clearAllLocalNotifs,
        showAvatarPopup,
        setShowAvatarPopup,
        validateProfileForm
    } = useAuth();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    const allStudentTabs = [
        { name: 'Dashboard', label: 'Home', priority: 1 },
        { name: 'BrowseColleges', label: 'Browse', priority: 1 },
        { name: 'AICounselor', label: 'ETA AI', priority: 1 },
        { name: 'Predictor', label: 'Predictor', priority: 2 },
        { name: 'OptionFormList', label: 'Option Form', priority: 2 },
        { name: 'Counselors', label: 'Experts', priority: 3 },
        { name: 'DocumentVerification', label: 'Documents', priority: 3 },
        { name: 'Videos', label: 'Videos', priority: 4 },
    ];

    const allAdminTabs = [
        { name: 'Dashboard', label: 'Admin Console', priority: 1 },
        { name: 'UploadCutoff', label: 'Upload', priority: 1 },
        { name: 'BrowseColleges', label: 'Browse Institutes', priority: 1 },
        { name: 'SystemAnalytics', label: 'Analytics', priority: 2 },
        { name: 'AITraining', label: 'Train AI', priority: 2 },
        { name: 'FrequentQuestionsManager', label: 'FAQ Manager', priority: 3 },
        { name: 'AdminUsers', label: 'Manage Users', priority: 3 },
        { name: 'AdminVideos', label: 'Manage Videos', priority: 4 },
    ];

    let maxPriority = 4;
    if (width < 900) {
        maxPriority = 1;
    } else if (width < 1050) {
        maxPriority = 2;
    } else if (width < 1250) {
        maxPriority = 3;
    } else {
        maxPriority = 4;
    }

    const rawTabs = user?.role === 'admin' ? allAdminTabs : allStudentTabs;
    const desktopTabs = rawTabs.filter(tab => tab.priority <= maxPriority);

    const isTabActive = (tabName) => {
        const currentName = route.name;
        if (currentName === tabName) return true;

        // Parent tab associations for detail or sub-screens
        if (tabName === 'BrowseColleges' && (currentName === 'CollegeDetail' || currentName === 'BranchCutoffDetail' || currentName === 'NearbyColleges' || currentName === 'FeaturedColleges')) {
            return true;
        }
        if (tabName === 'Predictor' && currentName === 'PredictionResults') {
            return true;
        }
        if (tabName === 'Counselors' && currentName === 'CounselorDetail') {
            return true;
        }
        if (tabName === 'AdminUsers' && currentName === 'AdminUserDetail') {
            return true;
        }
        if (tabName === 'OptionFormList' && currentName === 'OptionFormView') {
            return true;
        }

        return false;
    };

    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.title = title ? `${title} | AlloteMe` : 'AlloteMe';
        }
    }, [title]);

    // Fallback for devices/web where insets might be 0
    const topPadding = Platform.OS === 'web' ? 0 : Math.max(insets.top, Platform.OS === 'ios' ? 0 : 20);
    // On Android, insets.bottom often includes the system nav bar which we don't want to double-pad
    const bottomPadding = Platform.OS === 'android' ? 0 : Math.max(insets.bottom, 0);

    const [showNotifs, setShowNotifs] = useState(false);

    const handleMarkAllRead = () => {
        markAllLocalNotifsAsRead();
    };

    const handleDeleteAll = () => {
        Alert.alert(
            'Clear All',
            'Are you sure you want to delete all local notifications?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        clearAllLocalNotifs();
                    }
                }
            ]
        );
    };



    return (
        <View style={[
            styles.container,
            {
                paddingTop: showHeader ? 0 : topPadding,
                paddingBottom: botSafe ? 0 : bottomPadding
            },
            style
        ]}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.white} translucent={false} />

            {showHeader && (
                <View style={[styles.header, { paddingTop: topPadding }]}>
                    <View style={styles.headerInner}>
                        <View style={[styles.leftRow, isDesktop && { flex: 0, marginRight: 24 }]}>
                            {!hideBack && navigation.canGoBack() ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (validateProfileForm) {
                                            const isValid = validateProfileForm();
                                            if (!isValid) {
                                                Alert.alert(
                                                    'Profile Incomplete',
                                                    'Please fill in all fields with valid information and tap "Finish & Save" to complete your profile before leaving.',
                                                    [{ text: 'OK', style: 'cancel' }]
                                                );
                                                return;
                                            }
                                        }
                                        navigation.goBack();
                                    }}
                                    style={styles.iconBtn}
                                    activeOpacity={0.7}
                                >
                                    <ChevronLeft size={24} color={Colors.text.primary} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (validateProfileForm) {
                                            const isValid = validateProfileForm();
                                            if (!isValid) {
                                                Alert.alert(
                                                    'Profile Incomplete',
                                                    'Please fill in all fields with valid information and tap "Finish & Save" to complete your profile before leaving.',
                                                    [{ text: 'OK', style: 'cancel' }]
                                                );
                                                return;
                                            }
                                        }
                                        navigation?.openDrawer?.();
                                    }}
                                    style={styles.iconBtn}
                                    activeOpacity={0.7}
                                >
                                    <Menu size={24} color={Colors.text.primary} />
                                </TouchableOpacity>
                            )}
                            {title && (
                                <Text style={styles.headerTitle} numberOfLines={1}>
                                    {title}
                                </Text>
                            )}
                        </View>

                        {isDesktop && (
                            <View style={styles.desktopNav}>
                                {desktopTabs.map((tab) => {
                                    const active = isTabActive(tab.name);
                                    return (
                                        <TouchableOpacity
                                            key={tab.name}
                                            style={[styles.desktopNavLink, active && styles.desktopNavLinkActive]}
                                            onPress={() => {
                                                if (validateProfileForm) {
                                                    const isValid = validateProfileForm();
                                                    if (!isValid) {
                                                        Alert.alert(
                                                            'Profile Incomplete',
                                                            'Please fill in all fields with valid information and tap "Finish & Save" to complete your profile before leaving.',
                                                            [{ text: 'OK', style: 'cancel' }]
                                                        );
                                                        return;
                                                    }
                                                }
                                                if (Platform.OS === 'web') {
                                                    navigation.navigate('AppDrawer', {
                                                        screen: 'MainTabs',
                                                        params: { screen: tab.name }
                                                    });
                                                } else {
                                                    navigation.navigate('MainTabs', { screen: tab.name });
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.desktopNavText, active && styles.desktopNavTextActive]}>
                                                {tab.label}
                                            </Text>
                                            {active && <View style={styles.desktopNavIndicator} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        <View style={styles.rightActions}>
                            <TouchableOpacity
                                style={styles.iconBtn}
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (validateProfileForm) {
                                        const isValid = validateProfileForm();
                                        if (!isValid) {
                                            Alert.alert(
                                                'Profile Incomplete',
                                                'Please fill in all fields with valid information and tap "Finish & Save" to complete your profile before leaving.',
                                                [{ text: 'OK', style: 'cancel' }]
                                            );
                                            return;
                                        }
                                    }
                                    setShowNotifs(true);
                                }}
                            >
                                <Bell size={22} color={Colors.text.primary} />
                                {unreadCount > 0 && <View style={styles.badge} />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    if (validateProfileForm) {
                                        const isValid = validateProfileForm();
                                        if (!isValid) {
                                            Alert.alert(
                                                'Profile Incomplete',
                                                'Please fill in all fields with valid information and tap "Finish & Save" to complete your profile before leaving.',
                                                [{ text: 'OK', style: 'cancel' }]
                                            );
                                            return;
                                        }
                                    }
                                    navigation.navigate('Profile');
                                }}
                                style={styles.avatarBtn}
                                activeOpacity={0.7}
                            >
                                {user?.subscription?.type === 'advance' ? (
                                    <GradientBorder size={36} borderWidth={2.5} colors={['#FFDF00', '#FFF8DC', '#FFDF00', '#F59E0B', '#FFDF00']}>
                                        <Image
                                            source={{ uri: user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=Random&size=128` }}
                                            style={styles.avatarImg}
                                        />
                                    </GradientBorder>
                                ) : user?.subscription?.type === 'standard' ? (
                                    <GradientBorder size={36} borderWidth={2} colors={['#F59E0B', '#D97706']}>
                                        <Image
                                            source={{ uri: user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=Random&size=128` }}
                                            style={styles.avatarImg}
                                        />
                                    </GradientBorder>
                                ) : (
                                    <GradientBorder size={36} borderWidth={2}>
                                        <Image
                                            source={{ uri: user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=Random&size=128` }}
                                            style={styles.avatarImg}
                                        />
                                    </GradientBorder>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            <KeyboardAvoidingView
                style={[styles.content, !noPadding && styles.defaultPadding]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {scrollable ? (
                    <ScrollView
                        style={{ flex: 1, ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'auto' } : {}) }}
                        showsVerticalScrollIndicator={Platform.OS === 'web'}
                        contentContainerStyle={{ paddingBottom: 100, ...(Platform.OS === 'web' ? { minHeight: '100%' } : {}) }}
                    >
                        {children}
                    </ScrollView>
                ) : (
                    <View style={{ flex: 1 }}>
                        {children}
                    </View>
                )}
            </KeyboardAvoidingView>

            <AvatarSelectionPopup
                visible={showAvatarPopup}
                onClose={() => setShowAvatarPopup(false)}
                initialAvatar={user?.preferences?.avatarUrl}
            />

            {/* Notification Drawer Modal */}
            <Modal
                visible={showNotifs}
                animationType="none"
                transparent={true}
                onRequestClose={() => setShowNotifs(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowNotifs(false)}>
                    <View style={styles.drawerContainer}>
                        <Pressable style={styles.drawerContent} onPress={(e) => e.stopPropagation()}>
                            <View style={[styles.drawerHeader, { paddingTop: topPadding }]}>
                                <View>
                                    <Text style={styles.drawerTitle}>Notifications</Text>
                                    <Text style={styles.drawerSub}>{unreadCount} unread messages</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowNotifs(false)} style={styles.closeBtn}>
                                    <X size={20} color={Colors.text.secondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.drawerActions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAllRead}>
                                    <CheckCheck size={16} color={Colors.primary} />
                                    <Text style={styles.actionText}>Mark all read</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={handleDeleteAll}>
                                    <Trash2 size={16} color={Colors.error} />
                                    <Text style={[styles.actionText, { color: Colors.error }]}>Clear all</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={notifications}
                                keyExtractor={item => item._id}
                                renderItem={({ item }) => {
                                    let Icon = Info;
                                    let iconColor = Colors.primary;
                                    if (item.type === 'success') { Icon = CheckCircle; iconColor = '#22C55E'; }
                                    if (item.type === 'warning') { Icon = AlertTriangle; iconColor = '#F59E0B'; }
                                    if (item.type === 'error') { Icon = AlertCircle; iconColor = '#EF4444'; }
                                    if (item.type === 'info') { Icon = Info; iconColor = '#0A66C2'; }

                                    const handleItemPress = () => {
                                        if (!item.read) {
                                            markLocalNotifAsRead(item._id);
                                        }
                                    };

                                    return (
                                        <TouchableOpacity
                                            style={[styles.notifItem, !item.read && styles.unreadNotif]}
                                            onPress={handleItemPress}
                                        >
                                            <View style={[styles.notifIcon, { backgroundColor: iconColor + '10' }]}>
                                                <Icon size={18} color={iconColor} />
                                            </View>
                                            <View style={styles.notifBody}>
                                                <Text style={[styles.notifTitle, !item.read && styles.boldText]}>{item.title}</Text>
                                                <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
                                                <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                            </View>
                                            {!item.read && <View style={styles.unreadDot} />}
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <View style={styles.emptyBox}>
                                        <Bell size={40} color={Colors.divider} />
                                        <Text style={styles.emptyText}>No notifications yet</Text>
                                    </View>
                                }
                                contentContainerStyle={{ paddingBottom: 40 + bottomPadding }}
                            />
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        height: Platform.OS === 'web' ? '100vh' : '100%',
        overflow: 'hidden',
    },
    header: {
        backgroundColor: Colors.white,
        borderBottomWidth: 1.5,
        borderBottomColor: Colors.primary,
        ...Shadows.xs,
        zIndex: 10,
    },
    headerInner: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    leftRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginLeft: 4,
        flex: 1,
    },
    iconBtn: {
        padding: 8,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    avatarBtn: {
        marginLeft: 4,
    },
    avatarImg: {
        width: '100%',
        height: '100%'
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.error,
        borderWidth: 2,
        borderColor: Colors.white
    },
    content: {
        flex: 1,
    },
    defaultPadding: {
        paddingHorizontal: 16,
    },
    // Drawer Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row', justifyContent: 'flex-end' },
    drawerContainer: { width: '85%', height: '100%', backgroundColor: Colors.white, ...Shadows.lg },
    drawerContent: { flex: 1 },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    drawerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text.primary },
    drawerSub: { fontSize: 13, color: Colors.text.tertiary, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.divider, justifyContent: 'center', alignItems: 'center' },
    drawerActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: Colors.divider, paddingBottom: 15 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
    loaderBox: { padding: 40, alignItems: 'center' },
    notifItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider, alignItems: 'center' },
    unreadNotif: { backgroundColor: Colors.primary + '05' },
    notifIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    notifBody: { flex: 1 },
    notifTitle: { fontSize: 14, color: Colors.text.primary },
    notifMsg: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
    notifTime: { fontSize: 10, color: Colors.text.tertiary, marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 8 },
    boldText: { fontWeight: 'bold' },
    emptyBox: { padding: 60, alignItems: 'center', gap: 12 },
    emptyText: { color: Colors.text.tertiary, fontSize: 14 },

    // Desktop topbar navigation styles
    desktopNav: { flexDirection: 'row', gap: 24, alignItems: 'center', height: '100%' },
    desktopNavLink: { paddingVertical: 18, paddingHorizontal: 4, position: 'relative', height: '100%', justifyContent: 'center' },
    desktopNavLinkActive: {},
    desktopNavText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    desktopNavTextActive: { color: Colors.primary, fontWeight: '700' },
    desktopNavIndicator: { position: 'absolute', bottom: -1.5, left: 0, right: 0, height: 3, backgroundColor: Colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 }
});

export default MainLayout;
