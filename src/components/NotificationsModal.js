import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const NotificationsModal = ({ visible, onClose }) => {
    const { refreshUnreadCount } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchNotifications();
        }
    }, [visible]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await notificationsAPI.getAll();
            if (res.success) {
                setNotifications(res.data);
            }
        } catch (error) {
            console.error('Fetch notifications error:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await notificationsAPI.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            refreshUnreadCount();
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationsAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            refreshUnreadCount();
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    };

    const clearAll = async () => {
        try {
            await notificationsAPI.clearAll();
            setNotifications([]);
            refreshUnreadCount();
        } catch (error) {
            console.error('Clear all error:', error);
        }
    };

    const getIcon = (type) => {
        if (type.startsWith('meeting')) return 'calendar';
        if (type.startsWith('task')) return 'list';
        if (type.startsWith('absence')) return 'hand-left';
        if (type.startsWith('attendance')) return 'checkmark-done-circle';
        if (type.startsWith('member')) return 'people';
        if (type.startsWith('role')) return 'shield-checkmark';
        switch (type) {
            case 'new_message': return 'chatbubble';
            case 'club_announcement': return 'megaphone';
            default: return 'notifications';
        }
    };

    const getIconColor = (type) => {
        if (type.includes('created') || type.includes('assigned')) return '#0A66C2';
        if (type.includes('marked') || type.includes('approved') || type.includes('completed')) return '#22C55E';
        if (type.includes('cancelled') || type.includes('rejected') || type.includes('removed')) return '#EF4444';
        if (type.includes('reminder') || type.includes('warning')) return '#F59E0B';
        return '#6B7280';
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <Text style={styles.title}>Notifications</Text>
                            {notifications.some(n => !n.read) && (
                                <TouchableOpacity onPress={markAllAsRead} style={styles.headerBtn}>
                                    <Text style={styles.readAll}>Mark all read</Text>
                                </TouchableOpacity>
                            )}
                            {notifications.length > 0 && (
                                <TouchableOpacity onPress={clearAll} style={styles.headerBtn}>
                                    <Text style={styles.clearAll}>Clear All</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#0A66C2" />
                        </View>
                    ) : notifications.length > 0 ? (
                        <ScrollView style={styles.list}>
                            {notifications.map((n) => (
                                <TouchableOpacity
                                    key={n._id}
                                    style={[styles.notificationItem, !n.read && styles.unreadItem]}
                                    onPress={() => markAsRead(n._id)}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: `${getIconColor(n.type)}15` }]}>
                                        <Ionicons name={getIcon(n.type)} size={20} color={getIconColor(n.type)} />
                                    </View>
                                    <View style={styles.itemContent}>
                                        <Text style={styles.itemTitle}>{n.title}</Text>
                                        <Text style={styles.itemMessage}>{n.message}</Text>
                                        <Text style={styles.itemTime}>{new Date(n.createdAt).toLocaleString()}</Text>
                                    </View>
                                    {!n.read && <View style={styles.unreadDot} />}
                                </TouchableOpacity>
                            ))}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    ) : (
                        <View style={styles.center}>
                            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: SCREEN_HEIGHT * 0.7,
        width: '100%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginRight: 15,
    },
    readAll: {
        fontSize: 14,
        color: '#0A66C2',
        fontWeight: '600',
    },
    clearAll: {
        fontSize: 14,
        color: '#EF4444',
        fontWeight: '600',
    },
    headerBtn: {
        marginRight: 12,
    },
    closeButton: {
        padding: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    list: {
        flex: 1,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: '#F0F7FF',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    itemMessage: {
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
    },
    itemTime: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0A66C2',
        marginLeft: 8,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#9CA3AF',
    },
});

export default NotificationsModal;
