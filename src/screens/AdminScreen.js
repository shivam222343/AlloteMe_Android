import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    FlatList,
    Alert,
    Platform,
    Modal,
    Image,
    Dimensions,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import { adminAPI, clubsAPI, meetingsAPI, galleryAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import StatusModal from '../components/StatusModal';
import AttendanceExportModal from '../components/AttendanceExportModal';
import { SkeletonStatsGrid, SkeletonCard, SkeletonBox, SkeletonTableRow, SkeletonGalleryGrid } from '../components/SkeletonLoader';

const AdminScreen = ({ navigation }) => {
    const { user: currentUser, socket } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [pendingImages, setPendingImages] = useState([]);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Forms
    const [newClubName, setNewClubName] = useState('');
    const [newClubDesc, setNewClubDesc] = useState('');
    const [memberMaverickId, setMemberMaverickId] = useState('');
    const [selectedClubId, setSelectedClubId] = useState(null);

    // New State for Manage Club
    const [manageClubModal, setManageClubModal] = useState({ visible: false, club: null, members: [] });
    const [meetings, setMeetings] = useState([]);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const [meetingForm, setMeetingForm] = useState({
        clubId: '',
        name: '',
        date: '',
        time: '',
        mode: 'Offline',
        locationCategory: 'South Enclave',
        platform: 'Discord',
        classroomNumber: '',
        otherLocationName: '',
        description: '',
        status: 'upcoming',
        template: ''
    });
    const [filterClubId, setFilterClubId] = useState('all');
    const navScrollRef = useRef(null);
    const tabLayouts = useRef({});

    useEffect(() => {
        if (activeTab && navScrollRef.current && tabLayouts.current[activeTab]) {
            const { x, width: tabWidth } = tabLayouts.current[activeTab];
            const screenWidth = Dimensions.get('window').width;
            // Center the tab in the scroll view
            navScrollRef.current.scrollTo({
                x: x - (screenWidth / 2 - tabWidth / 2),
                animated: true
            });
        }
    }, [activeTab]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showMeetingForm, setShowMeetingForm] = useState(false);

    // Notification Form State
    const [notifForm, setNotifForm] = useState({ title: '', message: '', clubId: 'all' });
    const [sendingNotif, setSendingNotif] = useState(false);

    // Club Deletion State
    const [deleteClubModal, setDeleteClubModal] = useState({ visible: false, club: null, superKey: '' });

    // Modals
    const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => { } });
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [fullImageModal, setFullImageModal] = useState({ visible: false, imageUrl: '' });

    const loadData = async () => {
        setLoading(true);
        try {
            // Always fetch clubs
            const resClubs = await clubsAPI.getAll();
            if (resClubs.success) setClubs(resClubs.data);

            if (activeTab === 'dashboard') {
                const res = await adminAPI.getStats();
                if (res.success) setStats(res.data);
            } else if (activeTab === 'users') {
                const res = await adminAPI.getAllUsers();
                if (res.success) setUsers(res.data);
            } else if (activeTab === 'clubs') {
                // Handled above
            } else if (activeTab === 'meetings') {
                const cid = filterClubId || 'all';
                const resMeetings = await meetingsAPI.getClubMeetings(cid);
                if (resMeetings.success) setMeetings([...resMeetings.data.upcoming, ...resMeetings.data.past]);
            } else if (activeTab === 'gallery') {
                const res = await galleryAPI.getImages({ status: 'pending' });
                if (res.success) setPendingImages(res.data);
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    useEffect(() => {
        if (!socket) return;

        const handleRealTimeUpdate = () => {
            if (activeTab === 'meetings') {
                loadData();
            }
        };

        socket.on('meeting_created', handleRealTimeUpdate);
        socket.on('meeting_updated', handleRealTimeUpdate);
        socket.on('meeting_status_updated', handleRealTimeUpdate);
        socket.on('meeting_deleted', handleRealTimeUpdate);

        return () => {
            socket.off('meeting_created');
            socket.off('meeting_updated');
            socket.off('meeting_status_updated');
            socket.off('meeting_deleted');
        };
    }, [socket, activeTab]);

    const handleTabSwipe = (direction) => {
        const tabs = ['dashboard', 'clubs', 'users', 'meetings', 'gallery', 'notifications'];
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex === -1) return;

        let nextIndex;
        if (direction === 'left') { // finger moves right to left -> next tab
            nextIndex = (currentIndex + 1) % tabs.length;
        } else { // finger moves left to right -> previous tab
            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }

        setActiveTab(tabs[nextIndex]);
    };

    const onSwipeGestureEvent = (event) => {
        if (event.nativeEvent.state === State.END) {
            const { translationX, velocityX } = event.nativeEvent;

            // Require both enough translation and enough velocity to prevent accidental swipes
            if (Math.abs(translationX) > 80 && Math.abs(velocityX) > 500) {
                if (translationX > 0) {
                    handleTabSwipe('right');
                } else {
                    handleTabSwipe('left');
                }
            }
        }
    };

    const handleCreateClub = async () => {
        if (!newClubName || !newClubDesc) {
            setStatusModal({ visible: true, title: 'Missing Fields', message: 'Please enter club name and description.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            const res = await clubsAPI.create({ name: newClubName, description: newClubDesc });
            if (res.success) {
                setStatusModal({ visible: true, title: 'Club Created', message: 'The club has been created successfully. You can now add members below.', type: 'success' });
                setNewClubName('');
                setNewClubDesc('');
                await loadData();
                if (res.data && res.data._id) {
                    setSelectedClubId(res.data._id);
                }
            } else {
                setStatusModal({ visible: true, title: 'Error', message: res.message || 'Failed to create club.', type: 'error' });
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'An unexpected error occurred.';
            setStatusModal({ visible: true, title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!selectedClubId || !memberMaverickId) {
            setStatusModal({ visible: true, title: 'Missing Info', message: 'Please select a club and enter a Maverick ID.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            // Trim whitespace from ID to fix 400 error
            const res = await clubsAPI.addMember(selectedClubId, memberMaverickId.trim());
            if (res.success) {
                setStatusModal({ visible: true, title: 'Member Added', message: 'User successfully added to the club.', type: 'success' });
                setMemberMaverickId('');
            } else {
                setStatusModal({ visible: true, title: 'Failed', message: res.message || 'Could not add member.', type: 'error' });
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'An unexpected error occurred.';
            setStatusModal({ visible: true, title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const openManageClub = async (club) => {
        setLoading(true);
        try {
            const res = await clubsAPI.getMembers(club._id);
            if (res.success) {
                setManageClubModal({ visible: true, club, members: res.data });
            } else {
                setStatusModal({ visible: true, title: 'Error', message: 'Failed to fetch members', type: 'error' });
            }
        } catch (error) {
            setStatusModal({ visible: true, title: 'Error', message: 'Could not load club details', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const confirmRemoveMember = (userId, userName) => {
        setConfirmModal({
            visible: true,
            title: 'Remove Member',
            message: `Are you sure you want to remove ${userName} from this club?`,
            onConfirm: () => handleRemoveMember(userId)
        });
    };

    const handleRemoveMember = async (userId) => {
        try {
            const res = await clubsAPI.removeMember(manageClubModal.club._id, userId);
            if (res.success) {
                setManageClubModal(prev => ({
                    ...prev,
                    members: prev.members.filter(m => m._id !== userId)
                }));
                setStatusModal({ visible: true, title: 'Removed', message: 'Member removed successfully', type: 'success' });
            } else {
                setStatusModal({ visible: true, title: 'Error', message: res.message || 'Failed to remove member', type: 'error' });
            }
        } catch (error) {
            setStatusModal({ visible: true, title: 'Error', message: 'An error occurred', type: 'error' });
        }
    };

    const confirmChangeRole = (userId, newRole) => {
        setConfirmModal({
            visible: true,
            title: 'Confirm Role Change',
            message: `Are you sure you want to change this user's role to '${newRole.toUpperCase()}'?`,
            onConfirm: () => handleChangeRole(userId, newRole)
        });
    };

    const handleChangeRole = async (userId, newRole) => {
        try {
            const res = await adminAPI.changeUserRole(userId, newRole);
            if (res.success) {
                setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
                setStatusModal({ visible: true, title: 'Success', message: 'User role updated successfully.', type: 'success' });
            } else {
                setStatusModal({ visible: true, title: 'Error', message: res.message || 'Failed to update role.', type: 'error' });
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'An unexpected error occurred.';
            setStatusModal({ visible: true, title: 'Error', message: msg, type: 'error' });
        }
    };
    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            setMeetingForm({ ...meetingForm, date: dateStr });
        }
    };

    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const hours = selectedTime.getHours();
            const minutes = selectedTime.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const h = hours % 12 || 12;
            const m = minutes < 10 ? `0${minutes}` : minutes;
            setMeetingForm({ ...meetingForm, time: `${h}:${m} ${ampm}` });
        }
    };

    const handleCreateMeeting = async () => {
        if (!meetingForm.clubId || !meetingForm.name || !meetingForm.date || !meetingForm.time) {
            setStatusModal({ visible: true, title: 'Missing Fields', message: 'Please fill in required fields.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            const res = editingMeeting
                ? await meetingsAPI.update(editingMeeting._id, meetingForm)
                : await meetingsAPI.create(meetingForm);

            if (res.success) {
                setStatusModal({
                    visible: true,
                    title: editingMeeting ? 'Meeting Updated' : 'Meeting Created',
                    message: `Meeting has been ${editingMeeting ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                });
                setEditingMeeting(null);
                setShowMeetingForm(false);
                setMeetingForm({
                    clubId: meetingForm.clubId, // Keep club selected
                    name: '', date: '', time: '', mode: 'Offline',
                    locationCategory: 'South Enclave', platform: 'Discord',
                    classroomNumber: '', otherLocationName: '',
                    description: '', status: 'upcoming', template: ''
                });
                // Reload meetings
                const resMeetings = await meetingsAPI.getClubMeetings(meetingForm.clubId || 'all');
                if (resMeetings.success) setMeetings([...resMeetings.data.upcoming, ...resMeetings.data.past]);
            }
        } catch (error) {
            setStatusModal({ visible: true, title: 'Error', message: 'Failed to save meeting.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMeeting = async (meetingId) => {
        setConfirmModal({
            visible: true,
            title: 'Delete Meeting',
            message: 'Are you sure you want to delete this meeting?',
            onConfirm: async () => {
                try {
                    const res = await meetingsAPI.delete(meetingId);
                    if (res.success) {
                        setMeetings(meetings.filter(m => m._id !== meetingId));
                        setStatusModal({ visible: true, title: 'Deleted', message: 'Meeting deleted successfully.', type: 'success' });
                    }
                } catch (error) {
                    setStatusModal({ visible: true, title: 'Error', message: 'Failed to delete meeting.', type: 'error' });
                }
            }
        });
    };

    const handleEditMeeting = (meeting) => {
        setEditingMeeting(meeting);
        setShowMeetingForm(true);
        setMeetingForm({
            clubId: meeting.clubId,
            name: meeting.name,
            date: meeting.date.split('T')[0], // yyyy-mm-dd
            time: meeting.time,
            mode: meeting.mode || 'Offline',
            locationCategory: meeting.locationCategory || 'South Enclave',
            platform: meeting.platform || 'Discord',
            classroomNumber: meeting.classroomNumber || '',
            otherLocationName: meeting.otherLocationName || '',
            description: meeting.description || '',
            status: meeting.status || 'upcoming',
            template: meeting.template || ''
        });
    };

    const handleSendNotification = async () => {
        if (!notifForm.title || !notifForm.message) {
            setStatusModal({ visible: true, title: 'Missing Info', message: 'Please enter a title and message.', type: 'error' });
            return;
        }

        setSendingNotif(true);
        try {
            const res = await adminAPI.sendNotification(notifForm);
            if (res.success) {
                setStatusModal({
                    visible: true,
                    title: 'Notification Sent',
                    message: res.message || 'Notification has been pushed successfully.',
                    type: 'success'
                });
                setNotifForm({ title: '', message: '', clubId: 'all' });
            }
        } catch (error) {
            setStatusModal({ visible: true, title: 'Error', message: 'Failed to send notification.', type: 'error' });
        } finally {
            setSendingNotif(false);
        }
    };

    const handleDeleteClub = async () => {
        if (!deleteClubModal.superKey) {
            setStatusModal({ visible: true, title: 'Super Key Required', message: 'Please enter the Super Key to authorize deletion.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const res = await clubsAPI.delete(deleteClubModal.club._id, deleteClubModal.superKey);
            if (res.success) {
                setDeleteClubModal({ visible: false, club: null, superKey: '' });
                setStatusModal({ visible: true, title: 'Club Deleted', message: 'The club has been successfully removed from the system.', type: 'success' });
                await loadData();
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Failed to delete club.';
            setStatusModal({ visible: true, title: 'Deletion Failed', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const renderDashboard = () => (
        <View style={styles.tabContent}>
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Ionicons name="people" size={32} color="#0A66C2" />
                    <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="business" size={32} color="#10B981" />
                    <Text style={styles.statValue}>{stats?.totalClubs || 0}</Text>
                    <Text style={styles.statLabel}>Total Clubs</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="calendar" size={32} color="#F59E0B" />
                    <Text style={styles.statValue}>{stats?.totalMeetings || 0}</Text>
                    <Text style={styles.statLabel}>Meetings</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="radio" size={32} color="#EF4444" />
                    <Text style={styles.statValue}>{stats?.onlineUsers || 0}</Text>
                    <Text style={styles.statLabel}>Online Now</Text>
                </View>
            </View>

            {/* Simple Graphical View (Progress Bars) */}
            <View style={[styles.card, { marginTop: 24 }]}>
                <Text style={styles.cardTitle}>User Activity</Text>
                <View style={styles.barRow}>
                    <Text style={styles.barLabel}>New Users (30d)</Text>
                    <View style={styles.barContainer}>
                        <View style={[styles.barFill, { width: `${(stats?.newUsers / (stats?.totalUsers || 1)) * 100}%` }]} />
                    </View>
                    <Text style={styles.barValue}>{stats?.newUsers || 0}</Text>
                </View>
            </View>
        </View>
    );

    const renderClubs = () => (
        <View style={styles.tabContent}>
            {/* Create Club Form */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Create New Club</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Club Name"
                    placeholderTextColor="#9CA3AF"
                    value={newClubName}
                    onChangeText={setNewClubName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Description"
                    placeholderTextColor="#9CA3AF"
                    value={newClubDesc}
                    onChangeText={setNewClubDesc}
                />
                <TouchableOpacity style={styles.button} onPress={handleCreateClub}>
                    <Text style={styles.buttonText}>Create Club</Text>
                </TouchableOpacity>
            </View>

            {/* Add Member Form */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Add User to Club</Text>

                {currentUser && (
                    <View style={styles.myIdContainer}>
                        <Text style={styles.myIdLabel}>Your Maverick ID:</Text>
                        <TouchableOpacity onPress={() => setMemberMaverickId(currentUser.maverickId)}>
                            <Text style={styles.myIdValue}>{currentUser.maverickId || 'Loading...'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <ScrollView horizontal style={styles.clubChips} showsHorizontalScrollIndicator={false}>
                    {clubs.map(club => (
                        <TouchableOpacity
                            key={club._id}
                            style={[styles.chip, selectedClubId === club._id && styles.chipActive]}
                            onPress={() => setSelectedClubId(club._id)}
                        >
                            <Text style={[styles.chipText, selectedClubId === club._id && styles.chipTextActive]}>
                                {club.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TextInput
                    style={styles.input}
                    placeholder="Enter User Maverick ID (e.g. MAV-A1B2)"
                    placeholderTextColor="#9CA3AF"
                    value={memberMaverickId}
                    onChangeText={setMemberMaverickId}
                />
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#10B981' }]}
                    onPress={handleAddMember}
                >
                    <Text style={styles.buttonText}>Add Member</Text>
                </TouchableOpacity>
            </View>

            {/* Club List */}
            <Text style={styles.sectionHeader}>All Clubs</Text>
            {clubs.map(club => (
                <TouchableOpacity
                    key={club._id}
                    style={styles.listItem}
                    onPress={() => openManageClub(club)}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{club.name}</Text>
                        <Text style={styles.itemSubtitle}>{club.description}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => openManageClub(club)}>
                            <Ionicons name="settings-outline" size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDeleteClubModal({ visible: true, club, superKey: '' })}>
                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderUsers = () => (
        <View style={styles.tabContent}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>User Management</Text>
                <Text style={styles.subtitle}>Manage roles and permissions</Text>
            </View>

            {users.map(user => (
                <View key={user._id} style={styles.listItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{user.displayName}</Text>
                        <Text style={styles.itemSubtitle}>{user.email}</Text>
                        <Text style={[styles.badge, {
                            backgroundColor: user.role === 'admin' ? '#FEE2E2' : '#E0F2FE',
                            color: user.role === 'admin' ? '#EF4444' : '#0A66C2'
                        }]}>
                            {user.role.toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.roleActions}>
                        {user.role !== 'admin' && (
                            <TouchableOpacity
                                style={[styles.smButton, { backgroundColor: '#EF4444' }]}
                                onPress={() => confirmChangeRole(user._id, 'admin')}
                            >
                                <Text style={styles.smButtonText}>Make Admin</Text>
                            </TouchableOpacity>
                        )}
                        {user.role === 'admin' && (
                            <TouchableOpacity
                                style={styles.smButton}
                                onPress={() => confirmChangeRole(user._id, 'member')}
                            >
                                <Text style={styles.smButtonText}>Demote</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );

    const handleImageStatus = async (imageId, status) => {
        try {
            setLoading(true);
            const res = await galleryAPI.updateStatus(imageId, status);
            if (res.success) {
                setPendingImages(prev => prev.filter(img => img._id !== imageId));
                setStatusModal({
                    visible: true,
                    title: status === 'approved' ? 'Image Approved' : 'Image Rejected',
                    message: `The image has been ${status} successfully.`,
                    type: status === 'approved' ? 'success' : 'error'
                });
            }
        } catch (error) {
            setStatusModal({ visible: true, title: 'Error', message: 'Failed to update image status.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const renderGallery = () => (
        <View style={styles.tabContent}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Gallery Approvals</Text>
                <Text style={styles.subtitle}>Images waiting for your review</Text>
            </View>

            {pendingImages.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No pending images to review</Text>
                </View>
            ) : (
                pendingImages.map(img => (
                    <View key={img._id} style={styles.galleryApprovalCard}>
                        <View style={styles.galleryApprovalHeader}>
                            <View style={styles.uploaderInfo}>
                                <Text style={styles.uploaderName}>{img.uploadedBy?.displayName}</Text>
                                <Text style={styles.uploadTime}>{new Date(img.createdAt).toLocaleDateString()}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={{ color: '#D97706', fontSize: 10, fontWeight: '700' }}>PENDING</Text>
                            </View>
                        </View>

                        <View style={styles.galleryApprovalContent}>
                            <View style={styles.approvalInfo}>
                                <Text style={styles.approvalTitle}>{img.title || 'Untitled'}</Text>
                                <Text style={styles.approvalDesc} numberOfLines={2}>{img.description || 'No description'}</Text>
                                <Text style={styles.approvalCategory}>Category: {img.category}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setFullImageModal({ visible: true, imageUrl: img.imageUrl })}>
                                <View style={styles.approvalImageWrapper}>
                                    <View style={styles.imageOverlay}>
                                        <Ionicons name="expand-outline" size={20} color="#FFF" />
                                    </View>
                                    <Image source={{ uri: img.imageUrl }} style={styles.approvalImage} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.approvalActions}>
                            <TouchableOpacity
                                style={[styles.approvalBtn, { backgroundColor: '#FEE2E2', borderColor: '#F87171' }]}
                                onPress={() => handleImageStatus(img._id, 'rejected')}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                                <Text style={[styles.approvalBtnText, { color: '#EF4444' }]}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.approvalBtn, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}
                                onPress={() => handleImageStatus(img._id, 'approved')}
                            >
                                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                                <Text style={[styles.approvalBtnText, { color: '#10B981' }]}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderNotifications = () => (
        <View style={styles.tabContent}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Send Custom Notification</Text>
                <Text style={styles.subtitle}>Send push and in-app alerts to users</Text>

                <View style={{ marginTop: 20 }}>
                    <Text style={styles.label}>Notification Title</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Importance Notice"
                        placeholderTextColor="#9CA3AF"
                        value={notifForm.title}
                        onChangeText={t => setNotifForm({ ...notifForm, title: t })}
                    />

                    <Text style={styles.label}>Message Content</Text>
                    <TextInput
                        style={[styles.input, { height: 100 }]}
                        multiline
                        placeholder="Write your message here..."
                        placeholderTextColor="#9CA3AF"
                        value={notifForm.message}
                        onChangeText={t => setNotifForm({ ...notifForm, message: t })}
                    />

                    <Text style={styles.label}>Select Audience</Text>
                    <ScrollView horizontal style={styles.clubChips} showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            style={[styles.chip, notifForm.clubId === 'all' && styles.chipActive]}
                            onPress={() => setNotifForm({ ...notifForm, clubId: 'all' })}
                        >
                            <Text style={[styles.chipText, notifForm.clubId === 'all' && styles.chipTextActive]}>All Users</Text>
                        </TouchableOpacity>
                        {clubs.map(club => (
                            <TouchableOpacity
                                key={club._id}
                                style={[styles.chip, notifForm.clubId === club._id && styles.chipActive]}
                                onPress={() => setNotifForm({ ...notifForm, clubId: club._id })}
                            >
                                <Text style={[styles.chipText, notifForm.clubId === club._id && styles.chipTextActive]}>{club.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.button, { marginTop: 20, backgroundColor: '#7C3AED' }]}
                        onPress={handleSendNotification}
                        disabled={sendingNotif}
                    >
                        {sendingNotif ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <View style={styles.row}>
                                <Ionicons name="send" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Push to Devices</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.card, { marginTop: 24, backgroundColor: '#E0F2FE' }]}>
                <View style={styles.row}>
                    <Ionicons name="information-circle" size={24} color="#0A66C2" />
                    <Text style={[styles.cardTitle, { color: '#0A66C2', marginLeft: 8, marginBottom: 0 }]}>Important</Text>
                </View>
                <Text style={[styles.subtitle, { color: '#0A66C2', marginTop: 10 }]}>
                    Notifications will be sent as a high-priority push alert even when users' apps are closed.
                    They will also appear in their in-app notification center.
                </Text>
            </View>
        </View>
    );

    const renderMeetings = () => (
        <View style={styles.tabContent}>
            {!showMeetingForm && !editingMeeting ? (
                <TouchableOpacity
                    style={[styles.button, { marginBottom: 20, backgroundColor: '#0A66C2' }]}
                    onPress={() => setShowMeetingForm(true)}
                >
                    <View style={styles.row}>
                        <Ionicons name="add-circle-outline" size={24} color="#FFF" />
                        <Text style={[styles.buttonText, { marginLeft: 8 }]}>Create New Meeting</Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <View style={styles.card}>
                    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 15 }]}>
                        <Text style={styles.cardTitle}>{editingMeeting ? 'Edit Meeting' : 'Create Meeting'}</Text>
                        <TouchableOpacity onPress={() => {
                            setShowMeetingForm(false);
                            setEditingMeeting(null);
                            setMeetingForm({ ...meetingForm, name: '', date: '', time: '', description: '' });
                        }}>
                            <Ionicons name="close-circle-outline" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Select Club</Text>
                    <ScrollView horizontal style={styles.clubChips} showsHorizontalScrollIndicator={false}>
                        {clubs.map(club => (
                            <TouchableOpacity
                                key={club._id}
                                style={[styles.chip, meetingForm.clubId === club._id && styles.chipActive]}
                                onPress={() => {
                                    setMeetingForm({ ...meetingForm, clubId: club._id });
                                    // Load meetings for this club
                                    meetingsAPI.getClubMeetings(club._id).then(res => {
                                        if (res.success) setMeetings([...res.data.upcoming, ...res.data.past]);
                                    });
                                }}
                            >
                                <Text style={[styles.chipText, meetingForm.clubId === club._id && styles.chipTextActive]}>
                                    {club.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.label}>Meeting Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter meeting name"
                        value={meetingForm.name}
                        onChangeText={t => setMeetingForm({ ...meetingForm, name: t })}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Date</Text>
                            <TouchableOpacity
                                style={styles.inputContainerStyle}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    value={meetingForm.date}
                                    editable={Platform.OS === 'web'}
                                    onChangeText={t => setMeetingForm({ ...meetingForm, date: t })}
                                    // For Web, we can use built-in date picker
                                    {...(Platform.OS === 'web' ? { type: 'date' } : {})}
                                />
                                {Platform.OS !== 'web' && (
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIconRight} />
                                )}
                            </TouchableOpacity>
                            {showDatePicker && Platform.OS !== 'web' && (
                                <DateTimePicker
                                    value={meetingForm.date ? new Date(meetingForm.date) : new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Time</Text>
                            <TouchableOpacity
                                style={styles.inputContainerStyle}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <TextInput
                                    style={styles.input}
                                    placeholder="HH:MM AM/PM"
                                    value={meetingForm.time}
                                    editable={Platform.OS === 'web'}
                                    onChangeText={t => setMeetingForm({ ...meetingForm, time: t })}
                                    // For Web, we can use built-in time picker
                                    {...(Platform.OS === 'web' ? { type: 'time' } : {})}
                                />
                                {Platform.OS !== 'web' && (
                                    <Ionicons name="time-outline" size={20} color="#6B7280" style={styles.inputIconRight} />
                                )}
                            </TouchableOpacity>
                            {showTimePicker && Platform.OS !== 'web' && (
                                <DateTimePicker
                                    value={new Date()} // Current time as default
                                    mode="time"
                                    is24Hour={false}
                                    display="default"
                                    onChange={onTimeChange}
                                />
                            )}
                        </View>
                    </View>

                    <Text style={styles.label}>Mode</Text>
                    <View style={styles.row}>
                        {['Offline', 'Online'].map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.modeBtn, meetingForm.mode === m && styles.modeBtnActive]}
                                onPress={() => setMeetingForm({ ...meetingForm, mode: m })}
                            >
                                <Text style={[styles.modeBtnText, meetingForm.mode === m && styles.modeBtnTextActive]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {meetingForm.mode === 'Offline' ? (
                        <>
                            <Text style={styles.label}>Location</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clubChips}>
                                {['South Enclave', 'OAT', 'Classroom', 'Food Court', 'Library', 'North Enclave', 'Other'].map(loc => (
                                    <TouchableOpacity
                                        key={loc}
                                        style={[styles.chip, meetingForm.locationCategory === loc && styles.chipActive]}
                                        onPress={() => setMeetingForm({ ...meetingForm, locationCategory: loc })}
                                    >
                                        <Text style={[styles.chipText, meetingForm.locationCategory === loc && styles.chipTextActive]}>{loc}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {meetingForm.locationCategory === 'Classroom' && (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter classroom number"
                                    value={meetingForm.classroomNumber}
                                    onChangeText={t => setMeetingForm({ ...meetingForm, classroomNumber: t })}
                                />
                            )}
                            {meetingForm.locationCategory === 'Other' && (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter place name"
                                    value={meetingForm.otherLocationName}
                                    onChangeText={t => setMeetingForm({ ...meetingForm, otherLocationName: t })}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Platform</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clubChips}>
                                {['Discord', 'Google Meet', 'Zoom', 'Other'].map(p => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[styles.chip, meetingForm.platform === p && styles.chipActive]}
                                        onPress={() => setMeetingForm({ ...meetingForm, platform: p })}
                                    >
                                        <Text style={[styles.chipText, meetingForm.platform === p && styles.chipTextActive]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, { height: 80 }]}
                        multiline
                        placeholder="Enter meeting description"
                        value={meetingForm.description}
                        onChangeText={t => setMeetingForm({ ...meetingForm, description: t })}
                    />

                    <Text style={styles.label}>Status</Text>
                    <View style={[styles.row, { marginBottom: 30 }]}>
                        {['upcoming', 'completed', 'canceled'].map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.modeBtn, meetingForm.status === s && styles.modeBtnActive, { marginBottom: 10 }]}
                                onPress={() => setMeetingForm({ ...meetingForm, status: s })}
                            >
                                <Text style={[styles.modeBtnText, meetingForm.status === s && styles.modeBtnTextActive]}>{s.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.row}>
                        {editingMeeting && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: '#6B7280', flex: 1, marginRight: 8 }]}
                                onPress={() => {
                                    setEditingMeeting(null);
                                    setShowMeetingForm(false);
                                    setMeetingForm({ ...meetingForm, name: '', date: '', time: '', description: '' });
                                }}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.button, { flex: 2 }]} onPress={handleCreateMeeting}>
                            <Text style={styles.buttonText}>{editingMeeting ? 'Update Meeting' : 'Create Meeting'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            <View style={{ height: 20 }} />
            <Text style={styles.sectionHeader}>Meeting List</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.clubChips, { marginBottom: 15 }]}>
                <TouchableOpacity
                    style={[styles.chip, filterClubId === 'all' && styles.chipActive]}
                    onPress={async () => {
                        setFilterClubId('all');
                        const res = await meetingsAPI.getClubMeetings('all');
                        if (res.success) setMeetings([...res.data.upcoming, ...res.data.past]);
                    }}
                >
                    <Text style={[styles.chipText, filterClubId === 'all' && styles.chipTextActive]}>All Clubs</Text>
                </TouchableOpacity>
                {clubs.map(club => (
                    <TouchableOpacity
                        key={club._id}
                        style={[styles.chip, filterClubId === club._id && styles.chipActive]}
                        onPress={async () => {
                            setFilterClubId(club._id);
                            const res = await meetingsAPI.getClubMeetings(club._id);
                            if (res.success) setMeetings([...res.data.upcoming, ...res.data.past]);
                        }}
                    >
                        <Text style={[styles.chipText, filterClubId === club._id && styles.chipTextActive]}>{club.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            {meetings.map(m => (
                <View key={m._id} style={styles.listItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{m.name}</Text>
                        <Text style={styles.itemSubtitle}>{new Date(m.date).toDateString()} at {m.time}</Text>
                        <Text style={styles.itemSubtitle}>
                            {m.mode} - {m.mode === 'Offline' ? m.locationCategory : m.platform}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <TouchableOpacity onPress={() => handleEditMeeting(m)} style={[styles.smButton, { backgroundColor: '#F59E0B' }]}>
                            <Ionicons name="create-outline" size={16} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteMeeting(m._id)} style={[styles.smButton, { backgroundColor: '#EF4444' }]}>
                            <Ionicons name="trash-outline" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <MainLayout navigation={navigation} currentRoute="Admin" title="Admin Panel">
            <View style={styles.container}>
                {/* Custom Navbar/Tabs - Now Scrollable */}
                <View style={styles.navBar}>
                    <ScrollView
                        ref={navScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.navBarScroll}
                    >
                        {['dashboard', 'clubs', 'users', 'meetings', 'gallery', 'notifications'].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.navItem, activeTab === tab && styles.navItemActive]}
                                onPress={() => setActiveTab(tab)}
                                onLayout={(event) => {
                                    tabLayouts.current[tab] = event.nativeEvent.layout;
                                }}
                            >
                                <Text style={[styles.navText, activeTab === tab && styles.navTextActive]}>
                                    {tab === 'gallery' ? 'PENDING' : tab.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <PanGestureHandler
                    onHandlerStateChange={onSwipeGestureEvent}
                    activeOffsetX={[-20, 20]}
                    failOffsetY={[-20, 20]}
                >
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {loading ? (
                            <View style={styles.tabContent}>
                                {activeTab === 'dashboard' && (
                                    <>
                                        <SkeletonStatsGrid items={4} />
                                        <SkeletonCard style={{ marginTop: 24 }}>
                                            <SkeletonBox width={150} height={20} style={{ marginBottom: 16 }} />
                                            <SkeletonBox width="100%" height={40} style={{ marginBottom: 12 }} />
                                        </SkeletonCard>
                                    </>
                                )}
                                {activeTab === 'clubs' && (
                                    <>
                                        <SkeletonCard>
                                            <SkeletonBox width={120} height={20} style={{ marginBottom: 16 }} />
                                            <SkeletonBox width="100%" height={48} style={{ marginBottom: 12 }} />
                                            <SkeletonBox width="100%" height={48} style={{ marginBottom: 12 }} />
                                            <SkeletonBox width="100%" height={40} borderRadius={8} />
                                        </SkeletonCard>
                                        {[1, 2, 3].map((_, i) => (
                                            <SkeletonCard key={i}>
                                                <SkeletonBox width="80%" height={18} style={{ marginBottom: 8 }} />
                                                <SkeletonBox width="60%" height={14} />
                                            </SkeletonCard>
                                        ))}
                                    </>
                                )}
                                {activeTab === 'users' && (
                                    <SkeletonCard>
                                        <SkeletonBox width={100} height={20} style={{ marginBottom: 16 }} />
                                        {[1, 2, 3, 4, 5].map((_, i) => (
                                            <SkeletonTableRow key={i} columns={4} />
                                        ))}
                                    </SkeletonCard>
                                )}
                                {activeTab === 'meetings' && (
                                    <>
                                        {[1, 2, 3].map((_, i) => (
                                            <SkeletonCard key={i}>
                                                <SkeletonBox width="90%" height={18} style={{ marginBottom: 8 }} />
                                                <SkeletonBox width="70%" height={14} style={{ marginBottom: 6 }} />
                                                <SkeletonBox width="60%" height={14} />
                                            </SkeletonCard>
                                        ))}
                                    </>
                                )}
                                {activeTab === 'gallery' && (
                                    <SkeletonGalleryGrid items={6} />
                                )}
                            </View>
                        ) : (
                            <>
                                {activeTab === 'dashboard' && renderDashboard()}
                                {activeTab === 'clubs' && renderClubs()}
                                {activeTab === 'users' && renderUsers()}
                                {activeTab === 'meetings' && renderMeetings()}
                                {activeTab === 'gallery' && renderGallery()}
                                {activeTab === 'notifications' && renderNotifications()}
                            </>
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </PanGestureHandler>

                {/* Manage Club Modal */}
                <Modal
                    visible={manageClubModal.visible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setManageClubModal({ ...manageClubModal, visible: false })}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Manage Club</Text>
                            <TouchableOpacity onPress={() => setManageClubModal({ ...manageClubModal, visible: false })}>
                                <Ionicons name="close-circle" size={28} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
                            {manageClubModal.club && (
                                <View style={styles.clubInfoCard}>
                                    <View style={styles.clubHeaderRow}>
                                        <View style={styles.clubIcon}>
                                            <Ionicons name="business" size={24} color="#0A66C2" />
                                        </View>
                                        <View>
                                            <Text style={styles.clubNameLarge}>{manageClubModal.club.name}</Text>
                                            <Text style={styles.clubId}>ID: {manageClubModal.club._id}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.clubDescLarge}>{manageClubModal.club.description}</Text>
                                </View>
                            )}

                            <Text style={styles.sectionHeader}>Members ({manageClubModal.members.length})</Text>

                            {manageClubModal.members.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                                    <Text style={styles.emptyText}>No members in this club yet.</Text>
                                </View>
                            ) : (
                                manageClubModal.members.map(member => (
                                    <View key={member._id} style={styles.memberItem}>
                                        <View style={styles.memberInfo}>
                                            <Text style={styles.memberName}>{member.displayName}</Text>
                                            <Text style={styles.memberId}>{member.maverickId}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => confirmRemoveMember(member._id, member.displayName)}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </Modal>


                {/* Delete Club Modal */}
                <Modal
                    visible={deleteClubModal.visible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setDeleteClubModal({ ...deleteClubModal, visible: false })}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.confirmModalContent}>
                            <View style={styles.confirmHeader}>
                                <Text style={styles.confirmTitle}>Delete Club</Text>
                                <TouchableOpacity onPress={() => setDeleteClubModal({ ...deleteClubModal, visible: false })}>
                                    <Ionicons name="close-circle" size={28} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalMessage}>
                                This action is permanent. You are about to delete <Text style={{ fontWeight: '700' }}>{deleteClubModal.club?.name}</Text>.
                                All members will be removed from this club.
                            </Text>

                            <Text style={[styles.label, { marginTop: 15 }]}>Enter Super Key</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter Security Code"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry
                                autoComplete="off"
                                textContentType="none"
                                value={deleteClubModal.superKey}
                                onChangeText={t => setDeleteClubModal({ ...deleteClubModal, superKey: t })}
                            />

                            <View style={[styles.row, { marginTop: 20, width: '100%' }]}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnSecondary, { flex: 1, marginRight: 10 }]}
                                    onPress={() => setDeleteClubModal({ ...deleteClubModal, visible: false })}
                                >
                                    <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, { flex: 2, backgroundColor: '#EF4444' }]}
                                    onPress={handleDeleteClub}
                                >
                                    <Text style={styles.modalBtnText}>CONFIRM DELETE</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Modals */}
                <StatusModal
                    visible={statusModal.visible}
                    title={statusModal.title}
                    message={statusModal.message}
                    type={statusModal.type}
                    onClose={() => setStatusModal({ ...statusModal, visible: false })}
                />

                <ConfirmModal
                    visible={confirmModal.visible}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onClose={() => setConfirmModal({ ...confirmModal, visible: false })}
                />

                <AttendanceExportModal
                    visible={exportModalVisible}
                    onClose={() => setExportModalVisible(false)}
                    clubs={clubs}
                />

                {/* Floating Export Button */}
                <TouchableOpacity
                    style={styles.exportFab}
                    onPress={() => setExportModalVisible(true)}
                >
                    <Ionicons name="download" size={24} color="#FFF" />
                </TouchableOpacity>

                {/* Full Image Viewer Modal */}
                <Modal
                    visible={fullImageModal.visible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setFullImageModal({ visible: false, imageUrl: '' })}
                >
                    <View style={styles.fullImageOverlay}>
                        <TouchableOpacity
                            style={styles.closeFullImage}
                            onPress={() => setFullImageModal({ visible: false, imageUrl: '' })}
                        >
                            <Ionicons name="close" size={32} color="#FFF" />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: fullImageModal.imageUrl }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    </View>
                </Modal>
            </View>
        </MainLayout >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    navBar: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    navBarScroll: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
    },
    navItem: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 12,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    navItemActive: {
        backgroundColor: '#E0F2FE',
    },
    navText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    navTextActive: {
        color: '#0A66C2',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    tabContent: {
        flex: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 12,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        color: '#1F2937',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 8,
        marginTop: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modeBtn: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modeBtnActive: {
        backgroundColor: '#E0F2FE',
        borderColor: '#0A66C2',
    },
    modeBtnText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    modeBtnTextActive: {
        color: '#0A66C2',
        fontWeight: '700',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        width: '100%',
        ...Platform.select({
            web: { outlineStyle: 'none' }
        }),
    },
    button: {
        backgroundColor: '#0A66C2',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    clubChips: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    chipActive: {
        backgroundColor: '#E0F2FE',
        borderColor: '#0A66C2',
    },
    chipText: {
        fontSize: 12,
        color: '#6B7280',
    },
    chipTextActive: {
        color: '#0A66C2',
        fontWeight: '600',
    },
    listItem: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    itemSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: '#1F2937',
    },
    roleActions: {
        flexDirection: 'row',
    },
    smButton: {
        backgroundColor: '#0A66C2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 8,
    },
    smButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    badge: {
        fontSize: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
        alignSelf: 'flex-start',
        overflow: 'hidden',
    },
    barRow: {
        marginTop: 12,
    },
    barLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    barContainer: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: '#0A66C2',
    },
    barValue: {
        alignSelf: 'flex-end',
        fontSize: 12,
        color: '#1F2937',
        marginTop: 4,
        fontWeight: '600',
    },
    myIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed'
    },
    myIdLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginRight: 8
    },
    myIdValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0A66C2'
    },
    loader: {
        padding: 40,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    modalContent: {
        padding: 20,
        paddingBottom: 60, // Extra padding for buttons at bottom
    },
    clubInfoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        ...Platform.select({
            web: { boxShadow: '0px 1px 2px rgba(0,0,0,0.1)' },
            default: { elevation: 2 }
        })
    },
    clubHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    clubIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E0F2FE',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    clubNameLarge: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    clubId: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    clubDescLarge: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 22,
    },
    memberItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    memberId: {
        fontSize: 12,
        color: '#6B7280',
    },
    removeBtn: {
        padding: 8,
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        color: '#9CA3AF',
        fontSize: 16,
    },
    inputContainerStyle: {
        position: 'relative',
    },
    inputIconRight: {
        position: 'absolute',
        right: 12,
        top: 14,
    },
    // Gallery Approval Styles
    galleryApprovalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    galleryApprovalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    uploaderInfo: {
        flex: 1,
    },
    uploaderName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    uploadTime: {
        fontSize: 12,
        color: '#6B7280',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    galleryApprovalContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    approvalInfo: {
        flex: 1,
        marginRight: 12,
    },
    approvalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    approvalDesc: {
        fontSize: 13,
        color: '#4B5563',
        marginBottom: 8,
    },
    approvalCategory: {
        fontSize: 11,
        color: '#0A66C2',
        fontWeight: '600',
    },
    approvalImageWrapper: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    approvalImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)',
        zIndex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    approvalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    approvalBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginHorizontal: 4,
    },
    approvalBtnText: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 6,
    },
    exportFab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        ...Platform.select({
            web: { boxShadow: '0px 10px 25px rgba(0,0,0,0.2)' },
            default: { elevation: 10 }
        })
    },
    modalMessage: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 22,
        marginBottom: 20,
        marginTop: 10,
    },
    modalBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnSecondary: {
        backgroundColor: '#F3F4F6',
    },
    modalBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    modalBtnTextSecondary: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '600',
    },
    confirmHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#EF4444',
    },
    fullImageOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '95%',
        height: '85%',
    },
    closeFullImage: {
        position: 'absolute',
        top: 50,
        right: 25,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 25,
    },
});

export default AdminScreen;
