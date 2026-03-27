import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    FlatList,
    Animated,
    PanResponder,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SkeletonNotification } from './SkeletonLoader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const NotificationsModal = ({ visible, onClose, navigation }) => {
    const panY = React.useRef(new Animated.Value(0)).current;

    const {
        notifications,
        markLocalNotifAsRead,
        markAllLocalNotifsAsRead,
        deleteLocalNotif,
        clearAllLocalNotifs
    } = useAuth();

    const [loading, setLoading] = useState(false);

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gs) => {
                if (gs.dy > 0) {
                    panY.setValue(gs.dy);
                }
            },
            onPanResponderRelease: (e, gs) => {
                if (gs.dy > 150 || gs.vy > 0.5) {
                    onClose();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    React.useEffect(() => {
        if (visible) {
            panY.setValue(0);
        }
    }, [visible]);

    const markAsRead = async (id) => {
        markLocalNotifAsRead(id);
    };

    const deleteNotification = async (id) => {
        deleteLocalNotif(id);
    };

    const handleNotificationPress = async (item) => {
        if (!item.read) {
            markAsRead(item._id);
        }
        onClose();

        if (item.data?.screen) {
            try {
                const params = typeof item.data.params === 'string' ? JSON.parse(item.data.params) : item.data.params;
                navigation.navigate(item.data.screen, params || {});
            } catch (e) {
                navigation.navigate(item.data.screen);
            }
        }
        // Additional routing logic can go here
    };

    const markAllAsRead = () => {
        markAllLocalNotifsAsRead();
    };

    const clearAll = () => {
        Alert.alert(
            'Clear All Notifications',
            'Are you sure you want to delete all local notifications?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: () => {
                        clearAllLocalNotifs();
                    }
                }
            ]
        );
    };

    const getIcon = (type) => {
        if (type.startsWith('meeting')) return 'calendar';
        if (type.startsWith('task')) return 'list';
        if (type.startsWith('info')) return 'information-circle';
        if (type.startsWith('success')) return 'checkmark-circle';
        if (type.startsWith('warning')) return 'alert-circle';
        if (type.startsWith('error')) return 'close-circle';

        switch (type) {
            case 'new_message': return 'chatbubble';
            case 'club_announcement': return 'megaphone';
            case 'game_hosted': return 'game-controller';
            default: return 'notifications';
        }
    };

    const getIconColor = (type) => {
        if (type === 'success') return '#22C55E'; // Green
        if (type === 'info') return '#0A66C2';    // Blue
        if (type === 'warning') return '#F59E0B'; // Amber
        if (type === 'error') return '#EF4444';   // Red
        if (type === 'game_hosted') return '#8B5CF6'; // Purple
        if (type.includes('reminder')) return '#F97316'; // Orange
        return '#64748B'; // Slate
    };

    const renderRightActions = (progress, dragX, item) => {
        const scale = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity onPress={() => deleteNotification(item._id)} style={styles.deleteAction}>
                <Animated.View style={[styles.deleteIcon, { transform: [{ scale }] }]}>
                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderLeftActions = (progress, dragX, item) => {
        const scale = dragX.interpolate({
            inputRange: [0, 80],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity onPress={() => deleteNotification(item._id)} style={styles.deleteActionLeft}>
                <Animated.View style={[styles.deleteIcon, { transform: [{ scale }] }]}>
                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }) => (
        <Swipeable
            renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
            onSwipeableLeftOpen={() => deleteNotification(item._id)}
        >
            <TouchableOpacity
                style={[styles.notificationItem, !item.read && styles.unreadItem]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${getIconColor(item.type)}15` }]}>
                    <Ionicons name={getIcon(item.type)} size={20} color={getIconColor(item.type)} />
                </View>
                <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemMessage}>{item.message}</Text>
                    <Text style={styles.itemTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        </Swipeable>
    );

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <Animated.View
                    style={[
                        styles.modalContent,
                        { transform: [{ translateY: panY }] }
                    ]}
                >
                    <View {...panResponder.panHandlers}>
                        <View style={styles.handle} />
                    </View>
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
                    </View>

                    {loading ? (
                        <View style={{ flex: 1 }}>
                            <FlatList
                                data={[1, 2, 3, 4, 5, 6, 7, 8]}
                                keyExtractor={(item) => item.toString()}
                                renderItem={() => <SkeletonNotification />}
                                scrollEnabled={false}
                            />
                        </View>
                    ) : notifications.length > 0 ? (
                        <GestureHandlerRootView style={{ flex: 1 }}>
                            <FlatList
                                data={notifications}
                                keyExtractor={(item) => item._id}
                                renderItem={renderItem}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                showsVerticalScrollIndicator={false}
                            />
                        </GestureHandlerRootView>
                    ) : (
                        <View style={styles.center}>
                            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.bottomCloseBtn}
                        onPress={onClose}
                    >
                        <Text style={styles.bottomCloseText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
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
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        alignItems: 'center',
        backgroundColor: 'white' // Ensure background is white for swipe reveal
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
    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    deleteActionLeft: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    deleteIcon: {
        padding: 20,
    },
    loadMoreContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    loadMoreBtn: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        minWidth: 120,
        alignItems: 'center',
    },
    loadMoreText: {
        fontSize: 14,
        color: '#0A66C2',
        fontWeight: '600',
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 10,
    },
    bottomCloseBtn: {
        marginHorizontal: 20,
        marginTop: 10,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    bottomCloseText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    }
});

export default NotificationsModal;
