import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Dimensions,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle, Rect, G } from 'react-native-svg';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import { SkeletonMemberCard, SkeletonFilterChips, SkeletonBox } from '../components/SkeletonLoader';
import theme from '../constants/theme';

const { width } = Dimensions.get('window');

const MembersScreen = ({ navigation }) => {
    const { user, socket, refreshUser, selectedClubId, updateSelectedClub } = useAuth();
    const [clubs, setClubs] = useState([]);
    const [selectedClub, setSelectedClub] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [accessKey, setAccessKey] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/clubs');
            if (res.success) {
                // Only show clubs that the user has joined
                const joinedClubIds = (user.clubsJoined || []).map(c => (c.clubId?._id || c.clubId).toString());
                const filteredClubs = res.data.filter(club => joinedClubIds.includes(club._id.toString()));

                setClubs(filteredClubs);

                // Sync with global club selection
                if (selectedClubId && selectedClubId !== 'all') {
                    const globalClub = filteredClubs.find(c => c._id === selectedClubId);
                    if (globalClub) {
                        setSelectedClub(globalClub);
                    } else if (filteredClubs.length > 0) {
                        setSelectedClub(filteredClubs[0]);
                        updateSelectedClub(filteredClubs[0]._id);
                    }
                } else if (filteredClubs.length > 0 && !selectedClub) {
                    setSelectedClub(filteredClubs[0]);
                    updateSelectedClub(filteredClubs[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching clubs:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedClub, user.clubsJoined]);

    const fetchMembers = useCallback(async () => {
        if (!selectedClub) return;
        try {
            const res = await api.get(`/members/${selectedClub._id}`);
            if (res.success) {
                setMembers(res.data);
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    }, [selectedClub]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchMembers();
    }, [selectedClub, fetchMembers]);

    // Sync with global club selection when it changes from other screens
    useEffect(() => {
        if (selectedClubId && selectedClubId !== 'all' && clubs.length > 0) {
            const globalClub = clubs.find(c => c._id === selectedClubId);
            if (globalClub && (!selectedClub || selectedClub._id !== globalClub._id)) {
                setSelectedClub(globalClub);
            }
        }
    }, [selectedClubId, clubs]);

    // Socket listeners for real-time status
    useEffect(() => {
        if (!socket) return;

        const handleStatusChange = (data) => {
            const { userId, isOnline } = data;
            setMembers(prev => prev.map(m =>
                m._id === userId ? { ...m, isOnline, lastSeen: new Date() } : m
            ));
        };

        socket.on('user:status', handleStatusChange);

        const handleAttendanceUpdate = () => {
            fetchMembers();
        };

        socket.on('attendance_marked', handleAttendanceUpdate);
        socket.on('attendance_updated_manual', handleAttendanceUpdate);

        return () => {
            socket.off('user:status', handleStatusChange);
            socket.off('attendance_marked', handleAttendanceUpdate);
            socket.off('attendance_updated_manual', handleAttendanceUpdate);
        };
    }, [socket, fetchMembers]);

    useEffect(() => {
        if (showProfileModal && selectedMember) {
            const updated = members.find(m => m._id === selectedMember._id);
            if (updated) setSelectedMember(updated);
        }
    }, [members, showProfileModal]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        await fetchMembers();
        setRefreshing(false);
    };

    const isUserInClub = (clubId) => {
        return user.clubsJoined?.some(c => (c.clubId?._id || c.clubId) === clubId);
    };

    const handleJoinClub = async () => {
        if (!accessKey) return;
        setJoinLoading(true);
        try {
            const res = await api.post(`/members/${selectedClub._id}/join`, { accessKey });
            if (res.success) {
                setJoinModalVisible(false);
                setAccessKey('');
                if (refreshUser) await refreshUser();
                onRefresh();
            }
        } catch (error) {
            alert(error.message || 'Failed to join club');
        } finally {
            setJoinLoading(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderMemberCard = ({ item }) => (
        <TouchableOpacity
            style={styles.memberCard}
            onPress={() => {
                setSelectedMember(item);
                setShowProfileModal(true);
            }}
        >
            <View style={styles.avatarContainer}>
                {item.profilePicture?.url ? (
                    <Image source={{ uri: item.profilePicture.url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                        <Text style={styles.avatarText}>{item.displayName[0]}</Text>
                    </View>
                )}
                <View style={[styles.statusIndicator, { backgroundColor: item.isOnline ? '#10B981' : '#9CA3AF' }]} />
            </View>
            <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                    <Text style={styles.memberName}>{item.displayName}</Text>
                    <Text style={styles.lastSeen}>
                        {item.isOnline ? 'Online' : `Last seen ${new Date(item.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                </View>
                <Text style={styles.memberStatus} numberOfLines={1}>
                    {item.clubStats?.attendanceRate?.toFixed(0)}% attendance • {item.email}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </TouchableOpacity>
    );

    const AttendanceGraph = ({ rate }) => {
        const radius = 35;
        const stroke = 8;
        const normalizedRadius = radius - stroke * 2;
        const circumference = normalizedRadius * 2 * Math.PI;
        const strokeDashoffset = circumference - (rate / 100) * circumference;

        return (
            <View style={styles.graphWrapper}>
                <Svg height={radius * 2} width={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
                    <Circle
                        stroke="#E5E7EB"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <Circle
                        stroke={rate > 75 ? '#10B981' : rate > 50 ? '#F59E0B' : '#EF4444'}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        transform={`rotate(-90 ${radius} ${radius})`}
                    />
                </Svg>
                <View style={styles.graphLabel}>
                    <Text style={styles.graphRate}>{rate.toFixed(0)}%</Text>
                </View>
            </View>
        );
    };

    return (
        <MainLayout title="Members" navigation={navigation} currentRoute="Members">
            <View style={styles.container}>
                {/* Horizontal Club List */}
                <View style={styles.clubListContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubScroll}>
                        {clubs.map(club => (
                            <TouchableOpacity
                                key={club._id}
                                style={[
                                    styles.clubTab,
                                    selectedClub?._id === club._id && styles.activeClubTab
                                ]}
                                onPress={() => {
                                    setSelectedClub(club);
                                    updateSelectedClub(club._id);
                                }}
                            >
                                <Text style={[
                                    styles.clubTabText,
                                    selectedClub?._id === club._id && styles.activeClubTabText
                                ]}>
                                    {club.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color="#6B7280" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search members..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Main Content */}
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#0A66C2" />
                    </View>
                ) : selectedClub && !isUserInClub(selectedClub._id) ? (
                    <View style={styles.joinContainer}>
                        <Ionicons name="lock-closed" size={48} color="#0A66C2" style={styles.lockIcon} />
                        <Text style={styles.joinTitle}>Join {selectedClub.name}</Text>
                        <Text style={styles.joinSubtitle}>You are not a member of this club yet. Join to see the member list and attendance data.</Text>
                        <TouchableOpacity
                            style={styles.joinButton}
                            onPress={() => setJoinModalVisible(true)}
                        >
                            <LinearGradient
                                colors={['#0A66C2', '#0E76A8']}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.joinButtonText}>Join Club</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filteredMembers}
                        renderItem={renderMemberCard}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No members found</Text>
                            </View>
                        }
                    />
                )}

                {/* Profile Modal */}
                <Modal
                    visible={showProfileModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowProfileModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setShowProfileModal(false)}
                        />
                        <View style={styles.modalContent}>
                            <View style={styles.modalContentInner}>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setShowProfileModal(false)}
                                >
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>

                                {selectedMember && (
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        <View style={styles.modalHeader}>
                                            <View style={styles.largeAvatarContainer}>
                                                {selectedMember.profilePicture?.url ? (
                                                    <Image source={{ uri: selectedMember.profilePicture.url }} style={styles.largeAvatar} />
                                                ) : (
                                                    <View style={[styles.largeAvatar, styles.placeholderAvatar, { backgroundColor: '#0A66C2' }]}>
                                                        <Text style={styles.largeAvatarText}>{selectedMember.displayName[0]}</Text>
                                                    </View>
                                                )}
                                                <View style={[styles.modalStatusIndicator, { backgroundColor: selectedMember.isOnline ? '#10B981' : '#9CA3AF' }]} />
                                            </View>
                                            <Text style={styles.modalName}>{selectedMember.displayName}</Text>
                                            <Text style={styles.modalEmail}>{selectedMember.email}</Text>
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>Member</Text>
                                            </View>
                                        </View>



                                        {(() => {
                                            // Show stats specifically for the club selected in the parent screen
                                            const currentStats = (selectedMember.allClubStats?.find(s => s.clubId === selectedClub?._id?.toString())) || selectedMember.clubStats;

                                            return (
                                                <>
                                                    <View style={styles.statsSection}>
                                                        <Text style={styles.sectionTitle}>Attendance Analytics</Text>
                                                        <View style={styles.analyticsCard}>
                                                            <AttendanceGraph rate={currentStats?.attendanceRate || 0} />
                                                            <View style={styles.statsDetails}>
                                                                <View style={styles.statRow}>
                                                                    <Text style={styles.statLabel}>Total Meetings</Text>
                                                                    <Text style={styles.statValue}>{currentStats?.totalMeetings || 0}</Text>
                                                                </View>
                                                                <View style={styles.statRow}>
                                                                    <Text style={styles.statLabel}>Attended</Text>
                                                                    <Text style={styles.statValue}>{currentStats?.attendedMeetings || 0}</Text>
                                                                </View>
                                                                <View style={styles.statRow}>
                                                                    <Text style={styles.statLabel}>Missed</Text>
                                                                    <Text style={[styles.statValue, { color: '#EF4444' }]}>
                                                                        {(currentStats?.totalMeetings || 0) - (currentStats?.attendedMeetings || 0)}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        </View>

                                                        <View style={styles.performanceRow}>
                                                            <View style={styles.perfItem}>
                                                                <Text style={styles.perfLabel}>Consistency</Text>
                                                                <Text style={[
                                                                    styles.perfValue,
                                                                    { color: (currentStats?.attendanceRate || 0) > 75 ? '#10B981' : '#F59E0B' }
                                                                ]}>
                                                                    {(currentStats?.attendanceRate || 0) > 75 ? 'High' : (currentStats?.attendanceRate || 0) > 40 ? 'Moderate' : 'Low'}
                                                                </Text>
                                                            </View>
                                                            <View style={[styles.perfItem, { borderLeftWidth: 1, borderLeftColor: '#F3F4F6' }]}>
                                                                <Text style={styles.perfLabel}>Last 5</Text>
                                                                <View style={styles.dotRow}>
                                                                    {(currentStats?.attendanceHistory || []).slice(0, 5).map((h, i) => (
                                                                        <View
                                                                            key={i}
                                                                            style={[
                                                                                styles.miniDot,
                                                                                { backgroundColor: h.status === 'present' ? '#10B981' : h.status === 'late' ? '#F59E0B' : '#EF4444' }
                                                                            ]}
                                                                        />
                                                                    ))}
                                                                    {Array.from({ length: Math.max(0, 5 - (currentStats?.attendanceHistory?.length || 0)) }).map((_, i) => (
                                                                        <View key={`empty-${i}`} style={[styles.miniDot, { backgroundColor: '#E5E7EB' }]} />
                                                                    ))}
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <View style={styles.activitySection}>
                                                        <Text style={styles.sectionTitle}>Club Participation</Text>
                                                        <View style={styles.activityList}>
                                                            {(currentStats?.attendanceHistory || []).length > 0 ? (
                                                                currentStats.attendanceHistory.map((h, i) => (
                                                                    <View key={i} style={styles.activityItem}>
                                                                        <View style={[
                                                                            styles.activityIcon,
                                                                            { backgroundColor: h.status === 'present' ? '#E0F2FE' : h.status === 'late' ? '#FEF3C7' : '#FEE2E2' }
                                                                        ]}>
                                                                            <Ionicons
                                                                                name={h.status === 'present' ? "checkmark-circle" : h.status === 'late' ? "time" : "close-circle"}
                                                                                size={18}
                                                                                color={h.status === 'present' ? "#0A66C2" : h.status === 'late' ? "#F59E0B" : "#EF4444"}
                                                                            />
                                                                        </View>
                                                                        <View>
                                                                            <Text style={styles.activityText}>Marked {h.status.charAt(0).toUpperCase() + h.status.slice(1)}</Text>
                                                                            <Text style={styles.activityDate}>{h.name} • {new Date(h.date).toLocaleDateString()}</Text>
                                                                        </View>
                                                                    </View>
                                                                ))
                                                            ) : (
                                                                <Text style={styles.emptyText}>No recent activity recorded</Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                </>
                                            );
                                        })()}
                                    </ScrollView>
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Join Modal */}
                <Modal
                    visible={joinModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setJoinModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setJoinModalVisible(false)}
                        />
                        <View style={styles.joinInputCard}>
                            <Text style={styles.joinInputTitle}>Enter Access Key</Text>
                            <Text style={styles.joinInputSubtitle}>Please enter the 6-digit access key provided by the club admin.</Text>
                            <TextInput
                                style={styles.accessInput}
                                value={accessKey}
                                onChangeText={setAccessKey}
                                placeholder="e.g. 123456"
                                maxLength={6}
                                keyboardType="number-pad"
                            />
                            <View style={styles.joinActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setJoinModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmJoinButton}
                                    onPress={handleJoinClub}
                                    disabled={joinLoading || accessKey.length < 6}
                                >
                                    {joinLoading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.confirmJoinText}>Confirm</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    clubListContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    clubScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    clubTab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#F3F4F6',
    },
    activeClubTab: {
        backgroundColor: '#0A66C2',
    },
    clubTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeClubTabText: {
        color: '#FFFFFF',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
        ...Platform.select({
            web: { outlineStyle: 'none' }
        }),
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    placeholderAvatar: {
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    memberInfo: {
        flex: 1,
        marginLeft: 16,
    },
    memberHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    memberName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
    },
    lastSeen: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    memberStatus: {
        fontSize: 14,
        color: '#6B7280',
    },
    joinContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    lockIcon: {
        marginBottom: 20,
        opacity: 0.8,
    },
    joinTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    joinSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    joinButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradientButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
    },
    modalContentInner: {
        flex: 1,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 20,
    },
    modalHeader: {
        alignItems: 'center',
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    largeAvatarContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    largeAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    modalStatusIndicator: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    largeAvatarText: {
        color: '#FFFFFF',
        fontSize: 40,
        fontWeight: '700',
    },
    modalName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    modalEmail: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#0369A1',
        fontSize: 12,
        fontWeight: '700',
    },
    statsSection: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    analyticsCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    graphWrapper: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 24,
    },
    graphLabel: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    graphRate: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
    },
    statsDetails: {
        flex: 1,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statLabel: {
        color: '#6B7280',
        fontSize: 14,
    },
    statValue: {
        fontWeight: '700',
        color: '#1F2937',
    },
    activitySection: {
        padding: 24,
    },
    activityList: {
        gap: 16,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    activityText: {
        fontSize: 15,
        color: '#374151',
        fontWeight: '600',
    },
    activityDate: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    performanceRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginTop: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    perfItem: {
        flex: 1,
        alignItems: 'center',
    },
    perfLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    perfValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    dotRow: {
        flexDirection: 'row',
        gap: 4,
    },
    miniDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    joinInputCard: {
        backgroundColor: '#FFFFFF',
        margin: 24,
        borderRadius: 24,
        padding: 24,
    },
    joinInputTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    joinInputSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    accessInput: {
        height: 56,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 4,
        marginBottom: 24,
        ...Platform.select({
            web: { outlineStyle: 'none' }
        }),
    },
    joinActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        flex: 1,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cancelButtonText: {
        color: '#6B7280',
        fontWeight: '600',
    },
    confirmJoinButton: {
        flex: 2,
        backgroundColor: '#0A66C2',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmJoinText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default MembersScreen;
