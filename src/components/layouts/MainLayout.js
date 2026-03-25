import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, KeyboardAvoidingView, Modal, FlatList,
    Alert, Pressable, ActivityIndicator, ScrollView, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Shadows } from '../../constants/theme';
import { Menu, ChevronLeft, Bell, X, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import GradientBorder from '../ui/GradientBorder';
import { notificationAPI } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MainLayout = ({ children, title, showHeader = true, hideBack = false, noPadding = false, style, botSafe = false, scrollable = false }) => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    // Fallback for devices/web where insets might be 0
    const topPadding = Math.max(insets.top, Platform.OS === 'ios' ? 0 : 20);
    const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 20);

    const [showNotifs, setShowNotifs] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    const fetchNotifications = async () => {
        setNotifLoading(true);
        try {
            const res = await notificationAPI.getAll();
            setNotifications(res.data || []);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setNotifLoading(false);
        }
    };

    useEffect(() => {
        if (showNotifs) fetchNotifications();
    }, [showNotifs]);

    const handleMarkAllRead = async () => {
        try {
            await notificationAPI.markAllRead();
            fetchNotifications();
        } catch (error) {
            Alert.alert('Error', 'Failed to mark notifications as read');
        }
    };

    const handleDeleteAll = () => {
        Alert.alert(
            'Clear All',
            'Are you sure you want to delete all notifications?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await notificationAPI.deleteAll();
                            fetchNotifications();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete notifications');
                        }
                    }
                }
            ]
        );
    };

    const unreadCount = (notifications || []).filter(n => !n.isRead).length;

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
                        <View style={styles.leftRow}>
                            {!hideBack && navigation.canGoBack() ? (
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    style={styles.iconBtn}
                                    activeOpacity={0.7}
                                >
                                    <ChevronLeft size={24} color={Colors.text.primary} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => (navigation.openDrawer ? navigation.openDrawer() : null)}
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

                        <View style={styles.rightActions}>
                            <TouchableOpacity
                                style={styles.iconBtn}
                                activeOpacity={0.7}
                                onPress={() => setShowNotifs(true)}
                            >
                                <Bell size={22} color={Colors.text.primary} />
                                {unreadCount > 0 && <View style={styles.badge} />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => navigation.navigate('Profile')}
                                style={styles.avatarBtn}
                                activeOpacity={0.7}
                            >
                                <GradientBorder size={36} borderWidth={2}>
                                    <Image
                                        source={{ uri: user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=Random&size=128` }}
                                        style={styles.avatarImg}
                                    />
                                </GradientBorder>
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
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        {children}
                    </ScrollView>
                ) : (
                    <View style={{ flex: 1 }}>
                        {children}
                    </View>
                )}
            </KeyboardAvoidingView>

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

                            {notifLoading ? (
                                <View style={styles.loaderBox}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                </View>
                            ) : (
                                <FlatList
                                    data={notifications}
                                    keyExtractor={item => item._id}
                                    renderItem={({ item }) => {
                                        let Icon = Info;
                                        let iconColor = Colors.primary;
                                        if (item.type === 'success') { Icon = CheckCircle; iconColor = Colors.success; }
                                        if (item.type === 'warning') { Icon = AlertTriangle; iconColor = '#F59E0B'; }
                                        if (item.type === 'error') { Icon = AlertCircle; iconColor = Colors.error; }

                                        return (
                                            <TouchableOpacity style={[styles.notifItem, !item.isRead && styles.unreadNotif]}>
                                                <View style={[styles.notifIcon, { backgroundColor: iconColor + '10' }]}>
                                                    <Icon size={18} color={iconColor} />
                                                </View>
                                                <View style={styles.notifBody}>
                                                    <Text style={[styles.notifTitle, !item.isRead && styles.boldText]}>{item.title}</Text>
                                                    <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
                                                    <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                                </View>
                                                {!item.isRead && <View style={styles.unreadDot} />}
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
                            )}
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
    },
    header: {
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
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
    emptyText: { color: Colors.text.tertiary, fontSize: 14 }
});

export default MainLayout;
