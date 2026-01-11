import React, { useEffect, useState, useRef } from 'react';
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

const VoterListModal = ({ visible, onClose, clubId, messageId, optionIndex, optionText, pollData }) => {
    const [voters, setVoters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const panY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
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
            if (clubId && messageId && optionIndex !== null) {
                fetchVoters(true); // Initial load
            }
        }
    }, [visible, messageId, optionIndex]);

    // Handle real-time updates when pollData changes
    useEffect(() => {
        if (visible && clubId && messageId && optionIndex !== null) {
            fetchVoters(false); // Background refresh
        }
    }, [pollData]);

    const fetchVoters = async (isInitial = true) => {
        if (isInitial) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await groupChatAPI.getPollVoters(clubId, messageId, optionIndex);
            if (res.success) {
                setVoters(res.data);
            }
        } catch (error) {
            console.error('Error fetching voters:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
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
                        <Text style={styles.title} numberOfLines={1}>Voters: {optionText}</Text>
                    </View>

                    {loading ? (
                        <View style={styles.centerMode}>
                            <ActivityIndicator size="large" color="#0A66C2" />
                            <Text style={styles.loadingText}>Loading voters...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={voters}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={() => (
                                <View style={styles.centerMode}>
                                    <Ionicons name="people-outline" size={60} color="#CBD5E1" />
                                    <Text style={styles.emptyText}>No votes for this option yet.</Text>
                                </View>
                            )}
                            renderItem={({ item }) => (
                                <View style={styles.voterItem}>
                                    <View style={styles.avatarContainer}>
                                        <Image
                                            source={item.profilePicture?.url ? { uri: item.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + item.displayName }}
                                            style={styles.avatar}
                                        />
                                        {item.isOnline && <View style={styles.onlineDot} />}
                                    </View>
                                    <View style={styles.voterInfo}>
                                        <Text style={styles.voterName}>{item.displayName}</Text>
                                        <Text style={styles.voterStatus}>{item.isOnline ? 'Online' : 'Voted'}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.messageBtn}>
                                        <Ionicons name="chatbubble-outline" size={20} color="#0A66C2" />
                                    </TouchableOpacity>
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
        marginRight: 10,
    },
    closeBtn: {
        padding: 5,
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
    voterItem: {
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
    voterInfo: {
        flex: 1,
        marginLeft: 15,
    },
    voterName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
    },
    voterStatus: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    messageBtn: {
        padding: 10,
        backgroundColor: '#F0F7FF',
        borderRadius: 12,
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

export default VoterListModal;
