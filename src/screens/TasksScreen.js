import React, { useState, useEffect, useCallback } from 'react';
import * as Animatable from 'react-native-animatable';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    Dimensions
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MainLayout from '../components/MainLayout';
import { SkeletonBox, SkeletonListItem, SkeletonCard } from '../components/SkeletonLoader';
import { tasksAPI, clubsAPI, meetingsAPI, mediaAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import MediaUploadModal from '../components/MediaUploadModal';
import { useWebUpload } from '../hooks/useWebUpload';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

const TasksScreen = ({ navigation }) => {
    const { user, socket, selectedClubId, updateSelectedClub } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [meetings, setMeetings] = useState({ upcoming: [], past: [] });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    // Initialize with global state to prevent flickering
    const [selectedFilterClub, setSelectedFilterClub] = useState(selectedClubId || 'all');

    // Create Task Modal States
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        clubId: '',
        assignedTo: [],
        dueDate: new Date(Date.now() + 86400000),
        priority: 'medium',
        meetingId: '',
        attachments: []
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedClubMembers, setSelectedClubMembers] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const { startWebUpload } = useWebUpload();

    const isAdmin = user?.role === 'admin' || user?.role === 'subadmin';

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [tasksRes, clubsRes] = await Promise.all([
                tasksAPI.getAll(),
                clubsAPI.getAll()
            ]);
            if (tasksRes.success) setTasks(tasksRes.data);
            if (clubsRes.success) setClubs(clubsRes.data);
        } catch (error) {
            console.error('Fetch tasks error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchInitialData();
        }, [])
    );

    useEffect(() => {
        if (!socket) return;
        socket.on('task_update', (updatedTask) => {
            setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
        });
        return () => socket.off('task_update');
    }, [socket]);

    // Sync with global club selection when it changes from other screens
    useEffect(() => {
        if (selectedClubId && selectedFilterClub !== selectedClubId) {
            setSelectedFilterClub(selectedClubId);
        }
    }, [selectedClubId]);

    // Handle deep linking from notifications
    useEffect(() => {
        const routeState = navigation.getState();
        const currentRoute = routeState?.routes[routeState.index];
        const params = currentRoute?.params;

        if (params?.focusTaskId && tasks.length > 0) {
            const task = tasks.find(t => (t._id?.toString() || t._id) === params.focusTaskId);
            if (task) {
                // Determine which tab it belongs to
                const myAssignment = task.assignedTo.find(a => (a.user?._id || a.user) === user?._id);
                if (myAssignment) {
                    setActiveTab(myAssignment.status === 'completed' ? 'completed' : 'pending');
                } else {
                    setActiveTab('all');
                }

                // Also ensure club filter doesn't hide it
                if (selectedFilterClub !== 'all') {
                    const taskClubId = task.clubId?._id || task.clubId;
                    if (taskClubId !== selectedFilterClub) {
                        setSelectedFilterClub('all');
                    }
                }

                // Clear params to prevent persistent behavior
                navigation.setParams({ focusTaskId: null });
            }
        }
    }, [tasks, navigation, user?._id]);

    const handleClubSelect = async (clubId) => {
        setNewTask({ ...newTask, clubId, assignedTo: [], meetingId: '' });
        setSelectedClubMembers([]); // Reset members while loading
        setMeetings({ upcoming: [], past: [] }); // Reset meetings while loading
        try {
            const [membersRes, meetingsRes] = await Promise.all([
                clubsAPI.getMembers(clubId),
                meetingsAPI.getClubMeetings(clubId)
            ]);
            if (membersRes.success) {
                // The API returns the user objects directly in the data array
                setSelectedClubMembers(membersRes.data);
            }
            if (meetingsRes.success) setMeetings(meetingsRes.data);
        } catch (error) {
            console.error('Error fetching club members/meetings:', error);
        }
    };

    const toggleAssignee = (userId) => {
        setNewTask(prev => {
            const assignedTo = [...prev.assignedTo];
            const index = assignedTo.indexOf(userId);
            if (index > -1) assignedTo.splice(index, 1);
            else assignedTo.push(userId);
            return { ...prev, assignedTo };
        });
    };

    const handleCreateTask = async () => {
        if (!newTask.title || !newTask.clubId || !newTask.meetingId || newTask.assignedTo.length === 0) {
            return Alert.alert('Error', 'Please fill all required fields, including linking to a meeting');
        }
        try {
            setCreateLoading(true);
            const res = await tasksAPI.create(newTask);
            if (res.success) {
                setTasks([res.data, ...tasks]);
                setCreateModalVisible(false);
                setNewTask({
                    title: '',
                    description: '',
                    clubId: '',
                    assignedTo: [],
                    dueDate: new Date(Date.now() + 86400000),
                    priority: 'medium',
                    meetingId: '',
                    attachments: []
                });
                Alert.alert('Success', 'Task created successfully!');
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to create task');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleNativePick = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setCreateLoading(true);
                setShowUploadModal(false);

                const asset = result.assets[0];
                const formData = new FormData();

                // Get file name and extension
                const uri = asset.uri;
                const fileName = uri.split('/').pop();
                const fileType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';

                formData.append('file', {
                    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                    name: fileName || 'upload.jpg',
                    type: fileType,
                });
                formData.append('type', 'gallery');

                const uploadRes = await mediaAPI.upload(formData);

                if (uploadRes.success) {
                    setNewTask(prev => ({
                        ...prev,
                        attachments: [...prev.attachments, {
                            url: uploadRes.data.url,
                            publicId: uploadRes.data.publicId,
                            fileName: fileName || 'Attachment',
                            fileType: asset.type === 'video' ? 'video' : 'image'
                        }]
                    }));
                    Alert.alert('Success', 'Media attached successfully!');
                } else {
                    Alert.alert('Upload Failed', uploadRes.message || 'Could not upload media');
                }
            }
        } catch (error) {
            console.error('Task native upload error:', error);
            Alert.alert('Error', 'Failed to pick or upload media');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleWebUploadFlow = async () => {
        const result = await startWebUpload({
            type: 'task',
            clubId: newTask.clubId
        });

        if (result.success) {
            setNewTask(prev => ({
                ...prev,
                attachments: [...prev.attachments, {
                    url: result.url,
                    publicId: result.publicId,
                    fileName: 'Attachment',
                    fileType: 'image'
                }]
            }));
            Alert.alert('Success', 'Media attached successfully!');
        } else if (result.message !== 'Upload cancelled or failed') {
            Alert.alert('Upload Failed', result.message || 'Could not upload media');
        }
    };

    const updateStatus = async (taskId, newStatus) => {
        try {
            const res = await tasksAPI.updateStatus(taskId, newStatus);
            if (res.success) {
                setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const deleteTask = async (taskId) => {
        Alert.alert(
            'Delete Task',
            'Are you sure you want to permanently remove this task?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await tasksAPI.delete(taskId);
                            if (res.success) {
                                setTasks(prev => prev.filter(t => t._id !== taskId));
                                Alert.alert('Success', 'Task deleted successfully');
                            }
                        } catch (error) {
                            console.error('Delete task error:', error);
                            Alert.alert('Error', error.message || 'Failed to delete task');
                        }
                    }
                }
            ]
        );
    };

    const onSwipeGestureEvent = (event) => {
        if (event.nativeEvent.state === State.END) {
            const { translationX, velocityX } = event.nativeEvent;
            if (Math.abs(translationX) > 60 && Math.abs(velocityX) > 300) {
                const clubList = [{ _id: 'all', name: 'All Clubs' }, ...clubs];
                if (clubList.length <= 1) return;

                const currentIndex = clubList.findIndex(c => (c._id?.toString() || c._id) === (selectedFilterClub?.toString() || selectedFilterClub));
                if (currentIndex === -1) return;

                if (translationX < 0) {
                    // Swipe Left -> Next Club
                    if (currentIndex < clubList.length - 1) {
                        const nextId = clubList[currentIndex + 1]._id;
                        setSelectedFilterClub(nextId);
                        updateSelectedClub(nextId);
                    }
                } else {
                    // Swipe Right -> Prev Club
                    if (currentIndex > 0) {
                        const prevId = clubList[currentIndex - 1]._id;
                        setSelectedFilterClub(prevId);
                        updateSelectedClub(prevId);
                    }
                }
            }
        }
    };

    const handleScreenPress = (event) => {
        const x = event.nativeEvent.pageX;
        const screenWidth = Dimensions.get('window').width;
        const tabs = ['pending', 'completed', 'all'];
        const currentIndex = tabs.indexOf(activeTab);

        if (x < screenWidth / 4) {
            if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
        } else if (x > (screenWidth * 3) / 4) {
            if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
        }
    };

    const renderTaskItem = ({ item }) => {
        const myAssignment = (item?.assignedTo || []).find(a => (a.user?._id || a.user) === user?._id);
        const myStatus = myAssignment ? myAssignment.status : 'N/A';
        const isOverdue = new Date(item.dueDate) < new Date() && myStatus !== 'completed';

        return (
            <View style={styles.taskCard}>
                <View style={[styles.priorityTag, { backgroundColor: getPriorityColor(item.priority) }]}>
                    <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
                </View>

                <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{item.title}</Text>
                    {isAdmin && (
                        <TouchableOpacity onPress={() => deleteTask(item._id)}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.taskMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text style={[styles.metaText, isOverdue && { color: '#EF4444', fontWeight: 'bold' }]}>
                            {new Date(item.dueDate).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={14} color="#6B7280" />
                        <Text style={styles.metaText}>{(item?.assignedTo || []).length} assigned</Text>
                    </View>
                </View>

                {item.meetingId && (
                    <View style={styles.meetingLink}>
                        <Ionicons name="calendar-outline" size={14} color="#0A66C2" />
                        <Text style={styles.meetingLinkText}>Meeting: {item.meetingId.name}</Text>
                    </View>
                )}

                {item.attachments && item.attachments.length > 0 && (
                    <View style={styles.taskAttachments}>
                        {item.attachments.map((att, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.taskAttachmentItem}
                                onPress={() => navigation.navigate('MediaViewer', { uri: att.url })}
                            >
                                <Ionicons name="document-attach-outline" size={14} color="#0A66C2" />
                                <Text style={styles.taskAttachmentText}>Attachment {i + 1}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.assigneesContainer}>
                    <Text style={styles.assigneesLabel}>Assigned Members:</Text>
                    <View style={styles.assigneeList}>
                        {(item?.assignedTo || []).map((assignee, idx) => (
                            <View key={idx} style={styles.assigneeIndividual}>
                                <View style={[
                                    styles.statusIndicator,
                                    { backgroundColor: assignee.status === 'completed' ? '#10B981' : '#9CA3AF' }
                                ]} />
                                <Text style={styles.assigneeNameText}>
                                    {assignee.user?.displayName || 'Unknown'}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.taskFooter}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusLabel}>My Status: </Text>
                        <Text style={[styles.statusValue, { color: getStatusColor(myStatus) }]}>
                            {myStatus.toUpperCase().replace('-', ' ')}
                        </Text>
                    </View>

                    <View style={styles.actionRow}>
                        {myStatus === 'pending' ? (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                                onPress={() => updateStatus(item._id, 'completed')}
                            >
                                <Text style={styles.actionBtnText}>Done</Text>
                            </TouchableOpacity>
                        ) : myStatus === 'completed' ? (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
                                onPress={() => updateStatus(item._id, 'pending')}
                            >
                                <Text style={styles.actionBtnText}>Reopen</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </View>
        );
    };

    const getPriorityColor = (p) => {
        switch (p) {
            case 'urgent': return '#EF4444';
            case 'high': return '#F59E0B';
            case 'medium': return '#0A66C2';
            default: return '#10B981';
        }
    };

    const getStatusColor = (s) => {
        switch (s) {
            case 'completed': return '#10B981';
            case 'not-completed': return '#EF4444';
            default: return '#F59E0B';
        }
    };

    const filteredTasks = (tasks || []).filter(t => {
        // Tab Filter (Status)
        const myAssignment = (t?.assignedTo || []).find(a => (a.user?._id || a.user) === user?._id);
        const status = myAssignment ? myAssignment.status : 'pending';

        let matchesTab = true;
        if (activeTab === 'pending') matchesTab = status === 'pending';
        else if (activeTab === 'completed') matchesTab = status === 'completed';

        // Club Filter
        let matchesClub = true;
        if (selectedFilterClub !== 'all') {
            matchesClub = t.clubId === selectedFilterClub || t.clubId?._id === selectedFilterClub;
        }

        return matchesTab && matchesClub;
    });

    const getAnalytics = () => {
        const myPending = tasks.filter(t => {
            const myAssignment = t.assignedTo.find(a => (a.user?._id || a.user) === user._id);
            return myAssignment?.status === 'pending';
        }).length;

        const clubTasks = selectedFilterClub === 'all' ? tasks : tasks.filter(t => (t.clubId?._id || t.clubId) === selectedFilterClub);
        const totalPending = clubTasks.filter(t => {
            // Task is considered pending if any assignee is pending
            return t.assignedTo.some(a => a.status === 'pending');
        }).length;

        return { myPending, totalPending };
    };

    const stats = getAnalytics();

    return (
        <MainLayout navigation={navigation} title="Tasks" currentRoute="Tasks">
            <View style={styles.container}>
                {/* Analytics Header */}
                <View style={styles.analyticsHeader}>
                    <View style={[styles.statCard, { borderLeftColor: '#0A66C2', borderLeftWidth: 4 }]}>
                        <Text style={styles.statLabel}>My Pending</Text>
                        <Text style={styles.statNumber}>{stats.myPending}</Text>
                        <Ionicons name="person" size={24} color="#0A66C2" style={styles.statIcon} />
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#10B981', borderLeftWidth: 4 }]}>
                        <Text style={styles.statLabel}>Total Pending</Text>
                        <Text style={styles.statNumber}>{stats.totalPending}</Text>
                        <Ionicons name="list" size={24} color="#10B981" style={styles.statIcon} />
                    </View>
                </View>

                {/* Filters */}
                <View style={styles.filterSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll} nestedScrollEnabled={true}>
                        <TouchableOpacity
                            style={[styles.filterChip, selectedFilterClub === 'all' && styles.filterChipActive]}
                            onPress={() => {
                                setSelectedFilterClub('all');
                                updateSelectedClub('all');
                            }}
                        >
                            <Text style={[styles.filterChipText, selectedFilterClub === 'all' && styles.filterChipTextActive]}>All Clubs</Text>
                        </TouchableOpacity>
                        {clubs.map(club => (
                            <TouchableOpacity
                                key={club._id}
                                style={[styles.filterChip, selectedFilterClub === club._id && styles.filterChipActive]}
                                onPress={() => {
                                    setSelectedFilterClub(club._id);
                                    updateSelectedClub(club._id);
                                }}
                            >
                                <Text style={[styles.filterChipText, selectedFilterClub === club._id && styles.filterChipTextActive]}>{club.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.tabs}>
                    {['pending', 'completed', 'all'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <PanGestureHandler
                    onHandlerStateChange={onSwipeGestureEvent}
                    activeOffsetX={[-20, 20]}
                    failOffsetY={[-20, 20]}
                >
                    <View style={{ flex: 1 }}>
                        {loading ? (
                            <View style={{ flex: 1 }}>
                                {/* Skeleton Task Cards - Loading */}
                                <View style={styles.listContent}>
                                    {[1, 2, 3].map((_, i) => (
                                        <SkeletonCard key={i}>
                                            <SkeletonBox width={60} height={20} borderRadius={6} style={{ marginBottom: 12 }} />
                                            <SkeletonBox width="90%" height={18} style={{ marginBottom: 8 }} />
                                            <SkeletonBox width="70%" height={14} style={{ marginBottom: 16 }} />
                                            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                                                <SkeletonBox width={80} height={12} />
                                                <SkeletonBox width={80} height={12} />
                                            </View>
                                            <SkeletonBox width="100%" height={40} borderRadius={8} />
                                        </SkeletonCard>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredTasks}
                                keyExtractor={item => item._id}
                                renderItem={renderTaskItem}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={
                                    <View style={styles.emptyBox}>
                                        <Ionicons name="clipboard-outline" size={64} color="#D1D5DB" />
                                        <Text style={styles.emptyText}>No tasks found</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </PanGestureHandler>

                {isAdmin && (
                    <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)}>
                        <Ionicons name="add" size={30} color="#FFF" />
                    </TouchableOpacity>
                )}

                {/* Create Task Modal */}
                <Modal visible={createModalVisible} animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Task</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.label, { marginTop: 0 }]}>1. Select Club</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clubScroll}>
                                {clubs.map(club => (
                                    <TouchableOpacity
                                        key={club._id}
                                        style={[styles.clubChip, newTask.clubId === club._id && styles.clubChipActive]}
                                        onPress={() => handleClubSelect(club._id)}
                                    >
                                        <Text style={[styles.clubChipText, newTask.clubId === club._id && styles.clubChipTextActive]}>
                                            {club.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {newTask.clubId ? (
                                <Animatable.View animation="fadeIn">
                                    <Text style={styles.label}>2. Link to Meeting (Mandatory)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clubScroll}>
                                        {/* Removed None option as meeting is now mandatory */}
                                        {Array.isArray(meetings.upcoming) && meetings.upcoming.map(m => (
                                            <TouchableOpacity
                                                key={m._id}
                                                style={[styles.clubChip, newTask.meetingId === m._id && styles.clubChipActive]}
                                                onPress={() => setNewTask({ ...newTask, meetingId: m._id })}
                                            >
                                                <Text style={[styles.clubChipText, newTask.meetingId === m._id && styles.clubChipTextActive]}>
                                                    {m.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <Text style={styles.label}>3. Assign Members</Text>
                                    {selectedClubMembers.length > 0 ? (
                                        <View style={styles.assigneeGrid}>
                                            {selectedClubMembers.map(member => (
                                                <TouchableOpacity
                                                    key={member._id}
                                                    style={[styles.assigneeBtn, newTask.assignedTo.includes(member._id) && styles.assigneeBtnActive]}
                                                    onPress={() => toggleAssignee(member._id)}
                                                >
                                                    <Text style={[styles.assigneeBtnText, newTask.assignedTo.includes(member._id) && styles.assigneeBtnTextActive]}>
                                                        {member.displayName}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={styles.helperText}>Loading members...</Text>
                                    )}

                                    <View style={styles.divider} />

                                    <Text style={styles.label}>Title</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={newTask.title}
                                        onChangeText={v => setNewTask({ ...newTask, title: v })}
                                        placeholder="What needs to be done?"
                                    />

                                    <Text style={styles.label}>Description</Text>
                                    <TextInput
                                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                        value={newTask.description}
                                        onChangeText={v => setNewTask({ ...newTask, description: v })}
                                        placeholder="Add more details..."
                                        multiline
                                    />

                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={styles.label}>4. Attachments ({newTask.attachments.length})</Text>
                                        <TouchableOpacity
                                            style={styles.attachBtn}
                                            onPress={() => setShowUploadModal(true)}
                                        >
                                            <Ionicons name="add-circle-outline" size={20} color="#0A66C2" />
                                            <Text style={styles.attachBtnText}>Add Attachment</Text>
                                        </TouchableOpacity>

                                        {newTask.attachments.map((att, index) => (
                                            <View key={index} style={styles.attachmentItem}>
                                                <Ionicons name="image-outline" size={16} color="#6B7280" />
                                                <Text style={styles.attachmentName} numberOfLines={1}>
                                                    {att.fileName}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => setNewTask(prev => ({
                                                        ...prev,
                                                        attachments: prev.attachments.filter((_, i) => i !== index)
                                                    }))}
                                                >
                                                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={styles.label}>Due Date</Text>
                                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                                        <Text style={styles.dateText}>{newTask.dueDate.toLocaleDateString()}</Text>
                                        <Ionicons name="calendar-outline" size={20} color="#0A66C2" />
                                    </TouchableOpacity>

                                    <Text style={styles.label}>Priority</Text>
                                    <View style={styles.priorityRow}>
                                        {['low', 'medium', 'high', 'urgent'].map(p => (
                                            <TouchableOpacity
                                                key={p}
                                                style={[styles.pBtn, newTask.priority === p && { backgroundColor: getPriorityColor(p), borderColor: getPriorityColor(p) }]}
                                                onPress={() => setNewTask({ ...newTask, priority: p })}
                                            >
                                                <Text style={[styles.pBtnText, newTask.priority === p && { color: '#FFF' }]}>
                                                    {p.toUpperCase()}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.createBtn, createLoading && { opacity: 0.7 }]}
                                        onPress={handleCreateTask}
                                        disabled={createLoading}
                                    >
                                        {createLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createBtnText}>Create Task</Text>}
                                    </TouchableOpacity>
                                </Animatable.View>
                            ) : (
                                <View style={styles.placeholderBox}>
                                    <Ionicons name="apps-outline" size={48} color="#D1D5DB" />
                                    <Text style={styles.placeholderText}>Select a club to continue</Text>
                                </View>
                            )}
                        </ScrollView>

                        {showDatePicker && (
                            <DateTimePicker
                                value={newTask.dueDate}
                                mode="date"
                                onChange={(e, date) => {
                                    setShowDatePicker(false);
                                    if (date) setNewTask({ ...newTask, dueDate: date });
                                }}
                            />
                        )}
                    </View>
                </Modal>

                <MediaUploadModal
                    visible={showUploadModal}
                    onClose={() => setShowUploadModal(false)}
                    onNativePick={handleNativePick}
                    onWebUpload={handleWebUploadFlow}
                    title="Task Attachment"
                />
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    analyticsHeader: {
        flexDirection: 'row',
        padding: 15,
        gap: 12,
        backgroundColor: '#FFF',
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        padding: 15,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        position: 'relative',
        overflow: 'hidden',
    },
    statLabel: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    statNumber: {
        color: '#1F2937',
        fontSize: 24,
        fontWeight: '800',
    },
    statIcon: {
        position: 'absolute',
        right: 10,
        bottom: 10,
        opacity: 0.15,
    },
    filterSection: {
        backgroundColor: '#FFF',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterScroll: {
        paddingHorizontal: 15,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
    },
    filterChipTextActive: {
        color: '#FFF',
    },
    tabs: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: '#E8F2FF' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
    activeTabText: { color: '#0A66C2' },
    listContent: { padding: 16 },
    taskCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
    priorityTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
    priorityText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
    taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    taskTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
    taskDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 },
    taskMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#6B7280' },
    meetingLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16, backgroundColor: '#F0F9FF', padding: 8, borderRadius: 8 },
    meetingLinkText: { fontSize: 12, color: '#0A66C2', fontWeight: '600' },
    taskFooter: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center' },
    statusLabel: { fontSize: 12, color: '#6B7280' },
    statusValue: { fontSize: 12, fontWeight: '800' },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#0A66C2', justifyContent: 'center', alignItems: 'center', elevation: 5 },
    modalContainer: { flex: 1, backgroundColor: '#FFF' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    modalBody: { padding: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#374151', marginVertical: 12 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 16 },
    clubScroll: { flexDirection: 'row', marginBottom: 10 },
    clubChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 10 },
    clubChipActive: { backgroundColor: '#0A66C2', borderColor: '#0A66C2' },
    clubChipText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
    clubChipTextActive: { color: '#FFF' },
    assigneeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    assigneeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB' },
    assigneeBtnActive: { backgroundColor: '#E8F2FF', borderColor: '#0A66C2' },
    assigneeBtnText: { fontSize: 12, color: '#6B7280' },
    assigneeBtnTextActive: { color: '#0A66C2', fontWeight: '700' },
    datePickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 },
    priorityRow: { flexDirection: 'row', gap: 8 },
    pBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    pBtnText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
    createBtn: { backgroundColor: '#0A66C2', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginVertical: 30 },
    createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#D1D5DB', fontSize: 16, marginTop: 16, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 24 },
    helperText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
    dateText: { fontSize: 16, color: '#1F2937' },
    placeholderBox: { alignItems: 'center', marginTop: 60, padding: 20 },
    placeholderText: { color: '#9CA3AF', fontSize: 14, marginTop: 16, fontWeight: '600', textAlign: 'center' },
    assigneesContainer: {
        marginTop: 4,
        marginBottom: 16,
    },
    assigneesLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 8,
    },
    assigneeList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    assigneeIndividual: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    assigneeNameText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
    },
    attachBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F2FF',
        padding: 12,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#0A66C2',
        borderStyle: 'dashed',
    },
    attachBtnText: {
        color: '#0A66C2',
        fontWeight: '600',
        fontSize: 14,
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        marginTop: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    attachmentName: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
    },
    taskAttachments: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    taskAttachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: '#B9E6FE',
    },
    taskAttachmentText: {
        fontSize: 12,
        color: '#0284C7',
        fontWeight: '600',
    }
});

export default TasksScreen;
