import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Platform,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../components/MainLayout';
import { SkeletonMeetingCard, SkeletonFilterChips } from '../components/SkeletonLoader';
import { useAuth } from '../contexts/AuthContext';
import { clubsAPI, meetingsAPI } from '../services/api';
import StatusModal from '../components/StatusModal';
import QRDisplayModal from '../components/QRDisplayModal';
import { useFocusEffect } from '@react-navigation/native';

const MeetingsScreen = ({ navigation }) => {
    const { user, refreshUser, isAuthenticated, socket, selectedClubId, updateSelectedClub } = useAuth();

    // 1. All States First
    const [loading, setLoading] = useState(true);
    const [loadingMeetings, setLoadingMeetings] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [myClubs, setMyClubs] = useState([]);
    const [selectedClub, setSelectedClub] = useState(null);
    const [meetings, setMeetings] = useState({ upcoming: [], past: [] });
    const [activeTab, setActiveTab] = useState('upcoming');
    const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'success' });
    const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
    const [manageModalVisible, setManageModalVisible] = useState(false);
    const [members, setMembers] = useState([]);
    const [attendanceCode, setAttendanceCode] = useState('');
    const [selectedMeetingForAttendance, setSelectedMeetingForAttendance] = useState(null);
    const [managingMeeting, setManagingMeeting] = useState(null);
    const [qrModalVisible, setQrModalVisible] = useState(false);

    // 2. All Functions Second
    const loadClubs = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await clubsAPI.getAll();
            if (res.success) {
                if (user.clubsJoined) {
                    const userClubIds = user.clubsJoined.map(c =>
                        (c.clubId?._id || c.clubId || '').toString()
                    );
                    const joined = res.data.filter(c => userClubIds.includes(c._id.toString()));
                    setMyClubs(joined);

                    // Sync with global club selection
                    if (selectedClubId && selectedClubId !== 'all') {
                        const globalClub = joined.find(c => c._id === selectedClubId);
                        if (globalClub) {
                            setSelectedClub(globalClub);
                        } else if (joined.length > 0) {
                            setSelectedClub(joined[0]);
                            updateSelectedClub(joined[0]._id);
                        }
                    } else if (joined.length > 0) {
                        setSelectedClub(joined[0]);
                        updateSelectedClub(joined[0]._id);
                    }
                } else {
                    setMyClubs([]);
                }
            }
        } catch (error) {
            console.error('Load clubs error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMeetings = async (clubId) => {
        setLoadingMeetings(true);
        try {
            const res = await meetingsAPI.getClubMeetings(clubId);
            if (res.success) {
                setMeetings(res.data);
            }
        } catch (error) {
            console.error('Load meetings error:', error);
            if (error.response?.status === 403) {
                setStatusModal({ visible: true, title: 'Access Denied', message: 'You must join this club first!', type: 'error' });
            }
        } finally {
            setLoadingMeetings(false);
        }
    };

    const loadMembers = async (clubId) => {
        try {
            const res = await clubsAPI.getMembers(clubId);
            if (res.success) setMembers(res.data);
        } catch (error) { console.error(error); }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadClubs();
        if (selectedClub) {
            loadMeetings(selectedClub._id);
        }
        setRefreshing(false);
    };

    const handleMarkAttendance = async () => {
        if (!selectedMeetingForAttendance || !attendanceCode) return;
        try {
            const res = await meetingsAPI.markAttendance(selectedMeetingForAttendance._id, attendanceCode);
            if (res.success) {
                setAttendanceModalVisible(false);
                setAttendanceCode('');
                setStatusModal({ visible: true, title: 'Success', message: 'Attendance Marked!', type: 'success' });
                loadMeetings(selectedClub._id);
            } else {
                setStatusModal({ visible: true, title: 'Error', message: res.message || 'Failed', type: 'error' });
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed';
            setStatusModal({ visible: true, title: 'Error', message: msg, type: 'error' });
        }
    };

    const handleStartAttendance = async () => {
        if (!managingMeeting) return;
        try {
            const res = await meetingsAPI.startAttendance(managingMeeting._id);
            if (res.success) {
                setStatusModal({ visible: true, title: 'Started', message: `Attendance Started! Code: ${res.code}`, type: 'success' });
                loadMeetings(selectedClub._id);
                setManagingMeeting(prev => ({ ...prev, attendanceCode: res.code, isAttendanceActive: true }));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to start attendance');
        }
    };

    const toggleManualAttendance = async (userId, currentStatus) => {
        if (!managingMeeting) return;
        const newStatus = currentStatus === 'present' ? 'absent' : 'present';
        try {
            const res = await meetingsAPI.manualAttendance(managingMeeting._id, [userId], newStatus);
            if (res.success) {
                const updatedAttendees = [...managingMeeting.attendees];
                const index = updatedAttendees.findIndex(a => (a.userId?._id || a.userId) === userId);

                if (index > -1) {
                    updatedAttendees[index].status = newStatus;
                } else {
                    updatedAttendees.push({ userId: { _id: userId }, status: newStatus });
                }
                setManagingMeeting({ ...managingMeeting, attendees: updatedAttendees });
                loadMeetings(selectedClub._id);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update attendance');
        }
    };

    const handleUpdateStatus = async (meetingId, newStatus) => {
        try {
            const res = await meetingsAPI.updateStatus(meetingId, newStatus);
            if (res.success) {
                setStatusModal({ visible: true, title: 'Updated', message: `Status changed to ${newStatus}`, type: 'success' });
                loadMeetings(selectedClub ? selectedClub._id : 'all');
                if (managingMeeting && managingMeeting._id === meetingId) {
                    setManagingMeeting({ ...managingMeeting, status: newStatus });
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const isAdmin = () => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (!selectedClub) return false;
        const clubId = selectedClub._id.toString();
        const membership = user.clubsJoined.find(c => (c.clubId?._id || c.clubId || '').toString() === clubId);
        const myRole = membership?.role;
        return myRole === 'admin' || myRole === 'alumni';
    };

    const getMeetingStatus = (meeting) => {
        const myStatus = meeting.attendees.find(a => (a.userId?._id || a.userId) === user._id);
        if (myStatus && myStatus.status === 'present') return { label: 'Present', color: '#22C55E', bg: '#DCFCE7' };
        if (meeting.status === 'canceled') return { label: 'Canceled', color: '#EF4444', bg: '#FEE2E2' };
        if (meeting.status === 'upcoming') return { label: 'Upcoming', color: '#0A66C2', bg: '#E0F2FE' };
        if (meeting.status === 'completed') return { label: 'Completed', color: '#6B7280', bg: '#F3F4F6' };
        if (meeting.status === 'ongoing') return { label: 'Live', color: '#EF4444', bg: '#FEE2E2' };
        return { label: meeting.status, color: '#6B7280', bg: '#F3F4F6' };
    };

    // 3. All Effects Third
    // Sync local selected club with global state
    useEffect(() => {
        if (selectedClub) {
            updateSelectedClub(selectedClub._id);
        }
    }, [selectedClub]);

    // Load Last Selected on Init is now handled inside loadClubs for better sync
    useEffect(() => {
        if (isAuthenticated) {
            refreshUser();
            loadClubs();
        }
    }, [isAuthenticated]);

    useFocusEffect(
        React.useCallback(() => {
            if (isAuthenticated && selectedClub) {
                loadMeetings(selectedClub._id);
            }
        }, [isAuthenticated, selectedClub])
    );

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleRealTimeUpdate = (data) => {
            if (selectedClub && (data.clubId === selectedClub._id || !data.clubId)) {
                loadMeetings(selectedClub._id);
            }
        };

        socket.on('meeting_created', handleRealTimeUpdate);
        socket.on('meeting_updated', handleRealTimeUpdate);
        socket.on('meeting_status_updated', handleRealTimeUpdate);
        socket.on('attendance_marked', (data) => {
            if (selectedClub && (managingMeeting && managingMeeting._id === data.meetingId)) {
                loadMeetings(selectedClub._id);
            }
        });
        socket.on('attendance_started', handleRealTimeUpdate);
        socket.on('attendance_updated_manual', handleRealTimeUpdate);

        return () => {
            socket.off('meeting_created');
            socket.off('meeting_updated');
            socket.off('meeting_status_updated');
            socket.off('attendance_marked');
            socket.off('attendance_started');
            socket.off('attendance_updated_manual');
        };
    }, [socket, selectedClub, managingMeeting]);

    // Load Clubs on Mount or User Change
    useEffect(() => {
        if (user) {
            // Only load if clubs list is empty to avoid reset
            if (myClubs.length === 0) loadClubs();
        }
    }, [user]);

    // Load Meetings when Selected Club Changes
    useEffect(() => {
        if (selectedClub) {
            loadMeetings(selectedClub._id);
            if (socket) {
                socket.emit('club:join', selectedClub._id);
            }
        }
    }, [selectedClub, socket]);

    // Load Members when Manage Modal Opens
    useEffect(() => {
        if (manageModalVisible && selectedClub) {
            loadMembers(selectedClub._id);
        }
    }, [manageModalVisible]);

    return (
        <MainLayout navigation={navigation} currentRoute="Meetings" title="Meetings">
            <View style={styles.container}>
                {/* Club Selector - Always Visible */}
                {myClubs.length > 0 ? (
                    <View style={styles.clubSelector}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {loading ? (
                                <SkeletonFilterChips count={3} />
                            ) : (
                                myClubs.map(club => (
                                    <TouchableOpacity
                                        key={club._id}
                                        style={[styles.chip, selectedClub?._id === club._id && styles.chipActive]}
                                        onPress={() => setSelectedClub(club)}
                                    >
                                        <Text style={[styles.chipText, selectedClub?._id === club._id && styles.chipTextActive]}>
                                            {club.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                ) : !loading && (
                    <View style={styles.noClubs}>
                        <Text style={styles.noClubsText}>Join a club first!</Text>
                    </View>
                )}

                {selectedClub && (
                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]} onPress={() => setActiveTab('upcoming')}>
                            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, activeTab === 'past' && styles.tabActive]} onPress={() => setActiveTab('past')}>
                            <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Past / History</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <ScrollView
                    style={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {!selectedClub ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="alert-circle-outline" size={64} color="#E5E7EB" />
                            <Text style={styles.emptyText}>You haven't joined any clubs yet.</Text>
                        </View>
                    ) : loadingMeetings ? (
                        /* Show skeleton while loading meetings */
                        <>
                            <SkeletonMeetingCard />
                            <SkeletonMeetingCard />
                            <SkeletonMeetingCard />
                        </>
                    ) : (
                        (activeTab === 'upcoming' ? meetings.upcoming : meetings.past).length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No {activeTab} meetings found.</Text>
                            </View>
                        ) : (
                            (activeTab === 'upcoming' ? meetings.upcoming : meetings.past).map(meeting => {
                                const status = getMeetingStatus(meeting);
                                // Check if attendance active
                                const canMark = meeting.isAttendanceActive && !meeting.attendees.find(a => (a.userId?._id || a.userId) === user._id);

                                return (
                                    <View key={meeting._id} style={styles.card}>
                                        <View style={styles.cardHeader}>
                                            <View style={{ flex: 1 }}>
                                                {activeTab === 'upcoming' && !isAdmin() && (
                                                    <View style={styles.upcomingTag}>
                                                        <Text style={styles.upcomingTagText}>UPCOMING</Text>
                                                    </View>
                                                )}
                                                <Text style={styles.cardTitle}>{meeting.name}</Text>
                                                <Text style={styles.cardDate}>{new Date(meeting.date).toDateString()} | {meeting.time}</Text>
                                            </View>
                                            <View style={[styles.badge, { backgroundColor: status.bg }]}>
                                                <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.cardBody}>
                                            <View style={styles.row}>
                                                <Ionicons name={meeting.mode === 'Online' ? "videocam-outline" : "location-outline"} size={16} color="#6B7280" />
                                                <Text style={styles.rowText}>
                                                    {meeting.mode === 'Online'
                                                        ? meeting.platform
                                                        : `${meeting.locationCategory}${meeting.classroomNumber ? ` - ${meeting.classroomNumber}` : meeting.otherLocationName ? ` - ${meeting.otherLocationName}` : ''}`}
                                                </Text>
                                            </View>
                                            {meeting.description && <Text style={styles.desc}>{meeting.description}</Text>}
                                        </View>

                                        <View style={styles.cardFooter}>
                                            {canMark && (
                                                <TouchableOpacity
                                                    style={styles.actionBtn}
                                                    onPress={() => { setSelectedMeetingForAttendance(meeting); setAttendanceModalVisible(true); }}
                                                >
                                                    <Text style={styles.actionBtnText}>Mark Attendance</Text>
                                                </TouchableOpacity>
                                            )}
                                            {isAdmin() && (
                                                <TouchableOpacity
                                                    style={styles.adminLink}
                                                    onPress={() => { setManagingMeeting(meeting); setManageModalVisible(true); }}
                                                >
                                                    <Text style={styles.adminLinkText}>Manage Details</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )
                    )}
                </ScrollView>

                {/* Modals */}
                <Modal visible={attendanceModalVisible} transparent animationType="fade" onRequestClose={() => setAttendanceModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Mark Attendance</Text>
                            <Text style={styles.modalSubtitle}>Enter the code provided by your admin</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter Code (e.g. 1234)"
                                value={attendanceCode}
                                onChangeText={setAttendanceCode}
                                keyboardType="number-pad"
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAttendanceModalVisible(false)}>
                                    <Text style={styles.cancelColors}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.confirmBtn} onPress={handleMarkAttendance}>
                                    <Text style={styles.confirmColors}>Submit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* 3. Manage Meeting (Admin) */}
                <Modal visible={manageModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setManageModalVisible(false)}>
                    <View style={styles.fullScreenModal}>
                        <View style={styles.fsHeader}>
                            <Text style={styles.fsTitle}>Manage Meeting</Text>
                            <TouchableOpacity onPress={() => setManageModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#000" />
                            </TouchableOpacity>
                        </View>
                        {managingMeeting && (
                            <ScrollView style={styles.fsContent}>
                                <Text style={styles.heading}>{managingMeeting.name}</Text>

                                {/* Code Generator */}
                                <View style={styles.manageCard}>
                                    <Text style={styles.sectionTitle}>Attendance Code</Text>
                                    <View style={styles.codeRow}>
                                        <Text style={styles.codeText}>{managingMeeting.attendanceCode || 'Not Started'}</Text>
                                        <TouchableOpacity style={styles.smButton} onPress={handleStartAttendance}>
                                            <Text style={styles.smButtonText}>{managingMeeting.attendanceCode ? 'Regenerate' : 'Start Attendance'}</Text>
                                        </TouchableOpacity>
                                        {managingMeeting.attendanceCode && (
                                            <TouchableOpacity
                                                style={styles.qrIconBtn}
                                                onPress={() => setQrModalVisible(true)}
                                            >
                                                <Ionicons name="qr-code" size={24} color="#0A66C2" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {managingMeeting.isAttendanceActive && <Text style={styles.activeText}>Attendance is ACTIVE</Text>}
                                </View>

                                {/* Attendees List */}
                                <Text style={styles.sectionTitle}>Members Attendance</Text>
                                {members.map(member => {
                                    const isPresent = managingMeeting.attendees.some(a => (a.userId?._id || a.userId) === member._id && a.status === 'present');
                                    return (
                                        <View key={member._id} style={styles.memberRow}>
                                            <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
                                                {member.displayName} ({member.maverickId})
                                            </Text>
                                            <TouchableOpacity
                                                style={[styles.statusBtn, isPresent ? styles.presentBtn : styles.absentBtn]}
                                                onPress={() => toggleManualAttendance(member._id, isPresent ? 'present' : 'absent')}
                                            >
                                                <Text style={styles.statusBtnText}>{isPresent ? 'Present' : 'Mark Present'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}

                                {/* Change Status Section */}
                                <Text style={styles.sectionTitle}>Change Meeting Status</Text>
                                <View style={styles.statusOptions}>
                                    {['upcoming', 'ongoing', 'completed', 'canceled'].map(s => (
                                        <TouchableOpacity
                                            key={s}
                                            style={[
                                                styles.statusOptionBtn,
                                                managingMeeting.status === s && styles.statusOptionActive
                                            ]}
                                            onPress={() => handleUpdateStatus(managingMeeting._id, s)}
                                        >
                                            <Text style={[
                                                styles.statusOptionText,
                                                managingMeeting.status === s && styles.statusOptionTextActive
                                            ]}>
                                                {s.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={{ height: 100 }} />
                            </ScrollView>
                        )}
                    </View>
                </Modal>

                <StatusModal visible={statusModal.visible} title={statusModal.title} message={statusModal.message} type={statusModal.type} onClose={() => setStatusModal({ ...statusModal, visible: false })} />
                <QRDisplayModal
                    visible={qrModalVisible}
                    onClose={() => setQrModalVisible(false)}
                    meetingName={managingMeeting?.name}
                    meetingId={managingMeeting?._id}
                    code={managingMeeting?.attendanceCode}
                />
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    clubSelector: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFF' },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    chipActive: { backgroundColor: '#E0F2FE', borderColor: '#0A66C2', borderWidth: 1 },
    chipText: { color: '#6B7280', fontWeight: '500' },
    chipTextActive: { color: '#0A66C2', fontWeight: '700' },
    tabs: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
    tab: { paddingVertical: 12, marginRight: 24 },
    tabActive: { borderBottomWidth: 2, borderColor: '#0A66C2' },
    tabText: { color: '#6B7280', fontWeight: '600' },
    tabTextActive: { color: '#0A66C2' },
    content: { flex: 1, padding: 16 },
    card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    cardDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    cardBody: { marginTop: 12 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowText: { fontSize: 13, color: '#4B5563', marginLeft: 6 },
    desc: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, alignItems: 'center' },
    actionBtn: { backgroundColor: '#0A66C2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    actionBtnText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
    adminLink: { marginLeft: 12, padding: 8 },
    adminLinkText: { color: '#0A66C2', fontSize: 12, fontWeight: '600' },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0A66C2', alignItems: 'center', justifyContent: 'center', elevation: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 24, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16, textAlign: 'center' },
    input: { width: '100%', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16 },
    modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    cancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
    confirmBtn: { flex: 1, backgroundColor: '#0A66C2', padding: 12, borderRadius: 8, alignItems: 'center' },
    cancelColors: { color: '#6B7280', fontWeight: '600' },
    confirmColors: { color: '#FFF', fontWeight: '600' },
    fullScreenModal: { flex: 1, backgroundColor: '#F3F4F6' },
    fsHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', alignItems: 'center' },
    fsTitle: { fontSize: 20, fontWeight: '700' },
    fsContent: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
    createBtn: { backgroundColor: '#0A66C2', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#9CA3AF', fontSize: 16, marginTop: 12 },
    noClubs: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    noClubsText: { fontSize: 16, color: '#6B7280' },
    // Manage Modal Specifics
    heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    manageCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 10 },
    codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
    codeText: { fontSize: 24, fontWeight: 'bold', letterSpacing: 2, flex: 1 },
    smButton: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    qrIconBtn: { padding: 8, backgroundColor: '#F0F9FF', borderRadius: 8, borderWidth: 1, borderColor: '#E0F2FE' },
    smButtonText: { color: '#0A66C2', fontWeight: '600', fontSize: 12 },
    activeText: { color: '#22C55E', fontWeight: '600', fontSize: 12 },
    memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', paddingHorizontal: 16 },
    memberName: { fontSize: 14, color: '#374151', flex: 1, marginRight: 10 },
    statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    presentBtn: { backgroundColor: '#DCFCE7' },
    absentBtn: { backgroundColor: '#F3F4F6' },
    statusBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
    upcomingTag: { backgroundColor: '#E0F2FE', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
    upcomingTagText: { color: '#0A66C2', fontSize: 10, fontWeight: '800' },
    statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    statusOptionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    statusOptionActive: { backgroundColor: '#0A66C2', borderColor: '#0A66C2' },
    statusOptionText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
    statusOptionTextActive: { color: '#FFF' }
});

export default MeetingsScreen;
