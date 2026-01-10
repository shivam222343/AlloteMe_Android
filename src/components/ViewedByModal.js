import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    Dimensions,
    Animated,
    PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { groupChatAPI } from '../services/api';

const { height } = Dimensions.get('window');

const ViewedByModal = ({ visible, onClose, clubId, messageId }) => {
    const [viewers, setViewers] = useState([]);
    const [loading, setLoading] = useState(true);
    const panY = React.useRef(new Animated.Value(0)).current;

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

    useEffect(() => {
        if (visible) {
            panY.setValue(0);
            if (clubId && messageId) {
                fetchViewers();
            }
        }
    }, [visible, messageId]);

    const fetchViewers = async () => {
        setLoading(true);
        try {
            const res = await groupChatAPI.getMessageViewers(clubId, messageId);
            if (res.success) {
                setViewers(res.data);
            }
        } catch (error) {
            console.error('Error fetching viewers:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        { transform: [{ translateY: panY }] }
                    ]}
                >
                    <View {...panResponder.panHandlers}>
                        <View style={styles.handle} />
                    </View>
                    <View style={styles.header}>
                        <Text style={styles.title}>Viewed By</Text>
                    </View>

                    {loading ? (
                        <View style={styles.centerMode}>
                            <ActivityIndicator size="large" color="#0A66C2" />
                            <Text style={styles.loadingText}>Loading viewers...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={viewers}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={() => (
                                <View style={styles.centerMode}>
                                    <Ionicons name="eye-off-outline" size={60} color="#CBD5E1" />
                                    <Text style={styles.emptyText}>No one has viewed this message yet.</Text>
                                </View>
                            )}
                            renderItem={({ item }) => (
                                <View style={styles.viewerItem}>
                                    <View style={styles.avatarContainer}>
                                        <Image
                                            source={item.profilePicture?.url ? { uri: item.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + item.displayName }}
                                            style={styles.avatar}
                                        />
                                        {item.isOnline && <View style={styles.onlineDot} />}
                                    </View>
                                    <View style={styles.viewerInfo}>
                                        <Text style={styles.viewerName}>{item.displayName}</Text>
                                        <Text style={styles.viewedTime}>
                                            {item.readAt ? new Date(item.readAt).toLocaleString() : 'Viewed'}
                                        </Text>
                                    </View>
                                    <Ionicons name="checkmark-done" size={20} color="#0A66C2" />
                                </View>
                            )}
                            ListFooterComponent={() => (
                                <TouchableOpacity
                                    style={styles.bottomCloseBtn}
                                    onPress={onClose}
                                >
                                    <Text style={styles.bottomCloseText}>Close</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: height * 0.7,
        paddingTop: 10,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        alignSelf: 'center',
        marginVertical: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 25,
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
    },
    centerMode: {
        paddingTop: 100,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 15,
        color: '#64748B',
        fontSize: 15,
    },
    emptyText: {
        marginTop: 15,
        color: '#94A3B8',
        fontSize: 16,
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    viewerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F1F5F9',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    viewerInfo: {
        flex: 1,
        marginLeft: 15,
    },
    viewerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
    },
    viewedTime: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    bottomCloseBtn: {
        marginTop: 30,
        backgroundColor: '#F1F5F9',
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    bottomCloseText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748B',
    }
});

export default ViewedByModal;
