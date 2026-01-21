import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    TextInput,
    RefreshControl,
    Dimensions,
    Modal,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import MainLayout from '../components/MainLayout';
import { eventsAPI, clubsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonBox } from '../components/SkeletonLoader';

const { width } = Dimensions.get('window');

const EventImageSlider = ({ images, status, clubName }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;

    // Status color mapping
    const getStatusStyles = () => {
        switch (status?.toLowerCase()) {
            case 'upcoming': return { bg: '#059669', text: '#ECFDF5' };
            case 'ongoing': return { bg: '#D97706', text: '#FFFBEB' };
            case 'completed': return { bg: '#4B5563', text: '#F9FAFB' };
            default: return { bg: '#0A66C2', text: '#F0F9FF' };
        }
    };

    const statusStyle = getStatusStyles();

    if (!images || images.length === 0) {
        return (
            <View style={styles.placeholderImg}>
                <Ionicons name="image-outline" size={48} color="#D1D5DB" />
            </View>
        );
    }

    return (
        <View style={styles.sliderContainer}>
            <Animated.ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
                    setCurrentIndex(index);
                }}
            >
                {images.map((img, idx) => (
                    <View key={idx} style={styles.slideWrapper}>
                        <Image source={{ uri: img.url }} style={styles.sliderImage} />
                    </View>
                ))}
            </Animated.ScrollView>

            {/* Club Tag - Top Right */}
            {clubName && (
                <View style={[styles.tagContainer, { top: 12, right: 12 }]}>
                    <View style={styles.clubBadgeGlass}>
                        <Ionicons name="shield-checkmark" size={12} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={styles.clubTextSmall}>{clubName}</Text>
                    </View>
                </View>
            )}

            <View style={styles.sliderDots}>
                {images.map((_, idx) => {
                    const inputRange = [
                        (idx - 1) * (width - 32),
                        idx * (width - 32),
                        (idx + 1) * (width - 32)
                    ];
                    const dotWidth = scrollX.interpolate({
                        inputRange,
                        outputRange: [6, 18, 6],
                        extrapolate: 'clamp'
                    });
                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.5, 1, 0.5],
                        extrapolate: 'clamp'
                    });
                    return (
                        <Animated.View
                            key={idx}
                            style={[styles.dot, { width: dotWidth, opacity }]}
                        />
                    );
                })}
            </View>
        </View>
    );
};

const EventsScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // all, upcoming, completed
    const [selectedClub, setSelectedClub] = useState('all'); // all or specific club ID
    const [clubs, setClubs] = useState([]);

    // Create Modal States
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: new Date().toISOString(),
        location: '',
        clubId: '',
        images: [] // base64 strings
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [eventsRes, clubsRes] = await Promise.all([
                eventsAPI.getAll(),
                clubsAPI.getAll()
            ]);
            if (eventsRes.success) setEvents(eventsRes.data);
            if (clubsRes.success) setClubs(clubsRes.data);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.5,
            base64: true
        });

        if (!result.canceled) {
            const base64Images = result.assets.map(asset => asset.base64);
            setNewEvent({ ...newEvent, images: [...newEvent.images, ...base64Images] });
        }
    };

    const handleCreateEvent = async () => {
        if (!newEvent.title || !newEvent.description || !newEvent.location) {
            return Alert.alert('Error', 'Please fill all required fields');
        }

        try {
            setCreateLoading(true);
            const res = await eventsAPI.create(newEvent);
            if (res.success) {
                setCreateModalVisible(false);
                setNewEvent({ title: '', description: '', date: new Date().toISOString(), location: '', clubId: '', images: [] });
                fetchData();
                Alert.alert('Success', 'Event created successfully!');
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to create event');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDeleteEvent = (id) => {
        Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await eventsAPI.delete(id);
                        if (res.success) fetchData();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete event');
                    }
                }
            }
        ]);
    };

    // Get user's club IDs from user object (clubsJoined property)
    const userClubsJoined = user?.clubsJoined || [];
    const userClubIdsFromUser = userClubsJoined.map(clubJoined => {
        // clubJoined can be { clubId: "id" } or { clubId: { _id: "id" } }
        const clubId = clubJoined.clubId;
        return typeof clubId === 'object' ? clubId._id : clubId;
    });

    // Filter clubs data to get only user's clubs with full details
    const userClubs = clubs.filter(club => userClubIdsFromUser.includes(club._id));
    const userClubIds = userClubs.map(club => club._id);

    console.log('=== CLUB FILTER DEBUG ===');
    console.log('User.clubsJoined:', userClubsJoined);
    console.log('All clubs from API:', clubs.map(c => ({ id: c._id, name: c.name })));
    console.log('User club IDs extracted:', userClubIdsFromUser);
    console.log('Filtered user clubs:', userClubs.map(c => ({ id: c._id, name: c.name })));
    console.log('User club IDs:', userClubIds);
    console.log('========================');

    const filteredEvents = events.filter(e => {
        // Filter by date
        let matchesDateFilter = true;
        if (filter !== 'all') {
            const eventDate = new Date(e.date);
            const now = new Date();
            if (filter === 'upcoming') matchesDateFilter = eventDate >= now;
            if (filter === 'completed') matchesDateFilter = eventDate < now;
        }

        // If user belongs to at least one club, show ALL events (global + club events)
        // Otherwise, show only global events (events without clubId)
        let matchesClubFilter = true;
        if (userClubIds.length > 0) {
            // User belongs to clubs - show all events OR events from user's clubs
            if (e.clubId) {
                const eventClubId = typeof e.clubId === 'object' ? e.clubId._id : e.clubId;
                // Show if event is from user's club OR if it's a global event
                matchesClubFilter = userClubIds.includes(eventClubId);
            }
            // If no clubId (global event), always show it (matchesClubFilter stays true)
        } else {
            // User doesn't belong to any club - only show global events
            matchesClubFilter = !e.clubId;
        }

        // Filter by selected club
        let matchesSelectedClub = true;
        if (selectedClub !== 'all' && e.clubId) {
            const eventClubId = typeof e.clubId === 'object' ? e.clubId._id : e.clubId;
            matchesSelectedClub = eventClubId === selectedClub;
        }

        console.log('Event:', e.title, 'Club:', e.clubId?._id || e.clubId, 'User has clubs:', userClubIds.length > 0, 'Matches:', matchesClubFilter && matchesSelectedClub);

        return matchesDateFilter && matchesClubFilter && matchesSelectedClub;
    });

    const renderEventCard = ({ item }) => (
        <TouchableOpacity
            style={styles.eventCard}
            onPress={() => navigation.navigate('EventDetail', { eventId: item._id })}
            activeOpacity={0.9}
        >
            <EventImageSlider
                images={item.images}
                status={item.status}
                clubName={item.clubId?.name}
            />
            <View style={styles.eventInfo}>
                <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    {user?.role === 'admin' && (
                        <View style={styles.adminActions}>
                            <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { eventId: item._id, openEdit: true })} style={styles.adminActionIcon}>
                                <Ionicons name="create-outline" size={20} color="#0A66C2" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteEvent(item._id)} style={styles.adminActionIcon}>
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.eventMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text style={styles.metaText}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <MainLayout title="Events & Activities" navigation={navigation} currentRoute="Events">
            <View style={styles.container}>
                {/* Date Filter */}
                <View style={styles.filterSection}>
                    {['all', 'upcoming', 'completed'].map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, filter === f && styles.filterActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Club Filter - Only show if user belongs to clubs */}
                {userClubs.length > 0 && (
                    <View style={styles.clubFilterSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.clubFilterScroll}
                        >
                            <TouchableOpacity
                                style={[styles.clubChip, selectedClub === 'all' && styles.clubChipActive]}
                                onPress={() => setSelectedClub('all')}
                            >
                                <Ionicons
                                    name="apps"
                                    size={16}
                                    color={selectedClub === 'all' ? '#FFF' : '#6B7280'}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[styles.clubChipText, selectedClub === 'all' && styles.clubChipTextActive]}>
                                    All Clubs
                                </Text>
                            </TouchableOpacity>
                            {userClubs.map(club => (
                                <TouchableOpacity
                                    key={club._id}
                                    style={[styles.clubChip, selectedClub === club._id && styles.clubChipActive]}
                                    onPress={() => setSelectedClub(club._id)}
                                >
                                    <Ionicons
                                        name="business"
                                        size={16}
                                        color={selectedClub === club._id ? '#FFF' : '#6B7280'}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[styles.clubChipText, selectedClub === club._id && styles.clubChipTextActive]}>
                                        {club.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {loading && !refreshing ? (
                    <View style={{ padding: 20 }}>
                        <SkeletonBox height={250} />
                        <SkeletonBox height={250} style={{ marginTop: 20 }} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredEvents}
                        renderItem={renderEventCard}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
                                <Text style={styles.emptyText}>No events found</Text>
                            </View>
                        }
                    />
                )}

                {/* Admin FAB */}
                {(user?.role === 'admin' || user?.role === 'subadmin') && (
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={() => setCreateModalVisible(true)}
                    >
                        <LinearGradient
                            colors={['#0A66C2', '#0E76A8']}
                            style={styles.fabGradient}
                        >
                            <Ionicons name="add" size={30} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Create Event Modal */}
                <Modal visible={createModalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Create New Event</Text>
                                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                <Text style={styles.label}>Event Title *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter title"
                                    value={newEvent.title}
                                    onChangeText={v => setNewEvent({ ...newEvent, title: v })}
                                />

                                <Text style={styles.label}>Description *</Text>
                                <TextInput
                                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                    placeholder="Enter description"
                                    multiline
                                    value={newEvent.description}
                                    onChangeText={v => setNewEvent({ ...newEvent, description: v })}
                                />

                                <Text style={styles.label}>Location *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter location"
                                    value={newEvent.location}
                                    onChangeText={v => setNewEvent({ ...newEvent, location: v })}
                                />

                                <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2024-12-31"
                                    value={newEvent.date.split('T')[0]}
                                    onChangeText={v => setNewEvent({ ...newEvent, date: v })}
                                />

                                <Text style={styles.label}>Club (Optional)</Text>
                                <View style={styles.pickerContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                        <TouchableOpacity
                                            style={[styles.statusChip, newEvent.clubId === '' && styles.statusChipActive]}
                                            onPress={() => setNewEvent({ ...newEvent, clubId: '' })}
                                        >
                                            <Text style={[styles.statusChipText, newEvent.clubId === '' && styles.statusChipTextActive]}>None</Text>
                                        </TouchableOpacity>
                                        {clubs.map(c => (
                                            <TouchableOpacity
                                                key={c._id}
                                                style={[styles.statusChip, newEvent.clubId === c._id && styles.statusChipActive]}
                                                onPress={() => setNewEvent({ ...newEvent, clubId: c._id })}
                                            >
                                                <Text style={[styles.statusChipText, newEvent.clubId === c._id && styles.statusChipTextActive]}>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                <Text style={styles.label}>Images</Text>
                                <TouchableOpacity style={styles.imagePicker} onPress={handlePickImages}>
                                    <Ionicons name="images-outline" size={32} color="#0A66C2" />
                                    <Text style={styles.pickerText}>Select Images ({newEvent.images.length})</Text>
                                </TouchableOpacity>

                                <View style={styles.imagePreview}>
                                    {newEvent.images.slice(0, 4).map((img, i) => (
                                        <Image key={i} source={{ uri: `data:image/jpeg;base64,${img}` }} style={styles.previewThumb} />
                                    ))}
                                    {newEvent.images.length > 4 && (
                                        <View style={[styles.previewThumb, styles.moreThumb]}>
                                            <Text style={styles.moreText}>+{newEvent.images.length - 4}</Text>
                                        </View>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[styles.createBtn, createLoading && styles.btnDisabled]}
                                    onPress={handleCreateEvent}
                                    disabled={createLoading}
                                >
                                    {createLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Create Event</Text>}
                                </TouchableOpacity>
                            </ScrollView>
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
        backgroundColor: '#F3F4F6',
    },
    filterSection: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFF',
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    filterActive: {
        backgroundColor: '#0A66C2',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    filterTextActive: {
        color: '#FFF',
    },
    clubFilterSection: {
        backgroundColor: '#FFF',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    clubFilterScroll: {
        paddingHorizontal: 16,
        gap: 10,
    },
    clubChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        marginRight: 10,
    },
    clubChipActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    clubChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    clubChipTextActive: {
        color: '#FFF',
    },
    listContainer: {
        padding: 16,
    },
    eventCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    sliderContainer: {
        height: 200,
        width: '100%',
        position: 'relative',
    },
    sliderImage: {
        width: width - 32,
        height: 200,
        resizeMode: 'cover',
    },
    slideWrapper: {
        width: width - 32,
        height: 200,
    },
    sliderDots: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
    },
    tagContainer: {
        position: 'absolute',
        zIndex: 10,
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        marginRight: 6,
        opacity: 0.8,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    clubBadgeGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    clubTextSmall: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    placeholderImg: {
        height: 200,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventInfo: {
        padding: 16,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    eventTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        flex: 1,
    },
    adminActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    adminActionIcon: {
        padding: 4,
    },
    eventDesc: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    eventMeta: {
        flexDirection: 'row',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#6B7280',
    },
    clubBadge: {
        position: 'absolute',
        top: -190,
        left: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
    },
    clubText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        borderRadius: 30,
        elevation: 5,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
    },
    modalScroll: {
        flexGrow: 0,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    pickerContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    statusChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    statusChipActive: {
        backgroundColor: '#0A66C2',
    },
    statusChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    statusChipTextActive: {
        color: '#FFF',
    },
    imagePicker: {
        height: 100,
        borderWidth: 2,
        borderColor: '#0A66C2',
        borderStyle: 'dashed',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#F0F7FF',
    },
    pickerText: {
        color: '#0A66C2',
        fontWeight: '600',
        marginTop: 8,
    },
    imagePreview: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    previewThumb: {
        width: 70,
        height: 70,
        borderRadius: 8,
    },
    moreThumb: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreText: {
        color: '#6B7280',
        fontWeight: 'bold',
    },
    createBtn: {
        backgroundColor: '#0A66C2',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    btnDisabled: {
        opacity: 0.7,
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        color: '#9CA3AF',
        fontSize: 16,
    },
});

export default EventsScreen;
