import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { eventsAPI, clubsAPI } from '../services/api';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { Modal, TextInput } from 'react-native';

const { width } = Dimensions.get('window');

const EventDetailScreen = ({ route, navigation }) => {
    const { eventId } = route.params;
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const scrollX = useRef(new Animated.Value(0)).current;

    // Edit Modal States
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [clubs, setClubs] = useState([]);
    const [editData, setEditData] = useState({
        title: '',
        description: '',
        date: '',
        location: '',
        clubId: '',
        status: 'upcoming',
        newImages: [], // base64
        imagesToRemove: [] // publicId
    });

    const fetchDetail = useCallback(async () => {
        try {
            setLoading(true);
            const [eventRes, clubsRes] = await Promise.all([
                eventsAPI.getById(eventId),
                user?.role === 'admin' ? clubsAPI.getAll() : Promise.resolve({ success: true, data: [] })
            ]);

            if (eventRes.success) {
                setEvent(eventRes.data);
                // Pre-fill edit data
                setEditData({
                    title: eventRes.data.title,
                    description: eventRes.data.description,
                    date: eventRes.data.date,
                    location: eventRes.data.location,
                    clubId: eventRes.data.clubId?._id || '',
                    status: eventRes.data.status || 'upcoming',
                    newImages: [],
                    imagesToRemove: []
                });
            }
            if (clubsRes.success) setClubs(clubsRes.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch event details');
            navigation.goBack();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [eventId, navigation, user?.role]);

    useEffect(() => {
        fetchDetail();
        if (route.params?.openEdit) {
            setEditModalVisible(true);
        }
    }, [fetchDetail, route.params?.openEdit]);

    const handleUpdateEvent = async () => {
        if (!editData.title || !editData.description || !editData.location) {
            return Alert.alert('Error', 'Please fill all required fields');
        }

        try {
            setEditLoading(true);
            const res = await eventsAPI.update(eventId, editData);
            if (res.success) {
                setEditModalVisible(false);
                fetchDetail();
                Alert.alert('Success', 'Event updated successfully!');
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to update event');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteEvent = () => {
        Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await eventsAPI.delete(eventId);
                        if (res.success) {
                            navigation.goBack();
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete event');
                    }
                }
            }
        ]);
    };

    const handlePickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.5,
            base64: true
        });

        if (!result.canceled) {
            const base64Images = result.assets.map(asset => asset.base64);
            setEditData({ ...editData, newImages: [...editData.newImages, ...base64Images] });
        }
    };

    const toggleImageRemoval = (publicId) => {
        setEditData(prev => ({
            ...prev,
            imagesToRemove: prev.imagesToRemove.includes(publicId)
                ? prev.imagesToRemove.filter(id => id !== publicId)
                : [...prev.imagesToRemove, publicId]
        }));
    };

    if (loading) {
        return (
            <MainLayout title="Event Details" navigation={navigation}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0A66C2" />
                </View>
            </MainLayout>
        );
    }

    if (!event) return null;

    return (
        <MainLayout title={event.title} navigation={navigation} transparentNavbar>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Hero Slider */}
                <View style={styles.heroContainer}>
                    <Animated.ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                    >
                        {event.images && event.images.length > 0 ? (
                            event.images.map((img, idx) => (
                                <Image key={idx} source={{ uri: img.url }} style={styles.heroImage} />
                            ))
                        ) : (
                            <View style={[styles.heroImage, styles.placeholderImg]}>
                                <Ionicons name="image-outline" size={80} color="#D1D5DB" />
                            </View>
                        )}
                    </Animated.ScrollView>

                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent']}
                        style={styles.heroGradientTop}
                    />

                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="#FFF" />
                    </TouchableOpacity>

                    {event.images?.length > 1 && (
                        <View style={styles.pager}>
                            {event.images.map((_, idx) => {
                                const dotWidth = scrollX.interpolate({
                                    inputRange: [(idx - 1) * width, idx * width, (idx + 1) * width],
                                    outputRange: [8, 24, 8],
                                    extrapolate: 'clamp'
                                });
                                return (
                                    <Animated.View
                                        key={idx}
                                        style={[styles.pagerDot, { width: dotWidth }]}
                                    />
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{event.title}</Text>
                        <TouchableOpacity
                            style={styles.docsChip}
                            onPress={() => navigation.navigate('EventResources', { eventId, eventTitle: event.title, clubId: event.clubId?._id })}
                        >
                            <LinearGradient
                                colors={['#0A66C2', '#0E76A8']}
                                style={styles.docsChipGradient}
                            >
                                <Ionicons name="folder-open-outline" size={16} color="#FFF" />
                                <Text style={styles.docsChipText}>Docs & Data</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaBox}>
                            <View style={styles.metaIcon}>
                                <Ionicons name="calendar" size={20} color="#0A66C2" />
                            </View>
                            <View>
                                <Text style={styles.metaLabel}>Date</Text>
                                <Text style={styles.metaValue}>{new Date(event.date).toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</Text>
                            </View>
                        </View>

                        <View style={styles.metaBox}>
                            <View style={styles.metaIcon}>
                                <Ionicons name="location" size={20} color="#0A66C2" />
                            </View>
                            <View>
                                <Text style={styles.metaLabel}>Location</Text>
                                <Text style={styles.metaValue}>{event.location}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>About this Event</Text>
                    <Text style={styles.description}>{event.description}</Text>

                    {event.clubId && (
                        <View style={styles.organizerCard}>
                            <Text style={styles.sectionTitle}>Organizer</Text>
                            <View style={styles.organizerInfo}>
                                <View style={styles.organizerLogo}>
                                    <Ionicons name="business" size={24} color="#FFF" />
                                </View>
                                <View>
                                    <Text style={styles.organizerName}>{event.clubId.name}</Text>
                                    <Text style={styles.organizerSub}>Official Club Event</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>

            {/* Edit Event Modal */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Event</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Event Title *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter title"
                                value={editData.title}
                                onChangeText={v => setEditData({ ...editData, title: v })}
                            />

                            <Text style={styles.label}>Description *</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                placeholder="Enter description"
                                multiline
                                value={editData.description}
                                onChangeText={v => setEditData({ ...editData, description: v })}
                            />

                            <View style={styles.formRow}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <Text style={styles.label}>Status</Text>
                                    <View style={styles.pickerContainer}>
                                        {['upcoming', 'ongoing', 'completed'].map(s => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.statusChip, editData.status === s && styles.statusChipActive]}
                                                onPress={() => setEditData({ ...editData, status: s })}
                                            >
                                                <Text style={[styles.statusChipText, editData.status === s && styles.statusChipTextActive]}>
                                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="2024-12-31"
                                value={editData.date ? editData.date.split('T')[0] : ''}
                                onChangeText={v => setEditData({ ...editData, date: v })}
                            />

                            <Text style={styles.label}>Club (Optional)</Text>
                            <View style={styles.pickerContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                    <TouchableOpacity
                                        style={[styles.statusChip, editData.clubId === '' && styles.statusChipActive]}
                                        onPress={() => setEditData({ ...editData, clubId: '' })}
                                    >
                                        <Text style={[styles.statusChipText, editData.clubId === '' && styles.statusChipTextActive]}>None</Text>
                                    </TouchableOpacity>
                                    {clubs.map(c => (
                                        <TouchableOpacity
                                            key={c._id}
                                            style={[styles.statusChip, editData.clubId === c._id && styles.statusChipActive]}
                                            onPress={() => setEditData({ ...editData, clubId: c._id })}
                                        >
                                            <Text style={[styles.statusChipText, editData.clubId === c._id && styles.statusChipTextActive]}>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <Text style={styles.label}>Location *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter location"
                                value={editData.location}
                                onChangeText={v => setEditData({ ...editData, location: v })}
                            />

                            <Text style={styles.label}>Current Images (Tap to Remove)</Text>
                            <View style={styles.imagePreview}>
                                {event.images?.map((img, i) => (
                                    <TouchableOpacity key={i} onPress={() => toggleImageRemoval(img.publicId)}>
                                        <Image source={{ uri: img.url }} style={[styles.previewThumb, editData.imagesToRemove.includes(img.publicId) && styles.removedThumb]} />
                                        {editData.imagesToRemove.includes(img.publicId) && (
                                            <View style={styles.removeOverlay}>
                                                <Ionicons name="trash" size={20} color="#EF4444" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Add New Images</Text>
                            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImages}>
                                <Ionicons name="images-outline" size={32} color="#0A66C2" />
                                <Text style={styles.pickerText}>Select New Images ({editData.newImages.length})</Text>
                            </TouchableOpacity>

                            <View style={styles.imagePreview}>
                                {editData.newImages.map((img, i) => (
                                    <Image key={i} source={{ uri: `data:image/jpeg;base64,${img}` }} style={styles.previewThumb} />
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, editLoading && styles.btnDisabled]}
                                onPress={handleUpdateEvent}
                                disabled={editLoading}
                            >
                                {editLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Save Changes</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContainer: {
        height: 400,
        backgroundColor: '#000',
    },
    heroImage: {
        width: width,
        height: 400,
        resizeMode: 'cover',
    },
    placeholderImg: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    heroGradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        zIndex: 5,
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    detailStatusTag: {
        position: 'absolute',
        top: 110,
        left: 20,
        zIndex: 20,
    },
    statusGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFF',
        marginRight: 8,
    },
    statusTagText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    detailClubTag: {
        position: 'absolute',
        top: 110,
        right: 20,
        zIndex: 20,
    },
    glassMark: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    glassText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
    },
    pager: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        gap: 8,
        zIndex: 20,
    },
    pagerDot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFF',
    },
    content: {
        paddingVertical: 32,
        paddingHorizontal: 24,
        marginTop: -30,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        minHeight: 600,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1F2937',
        lineHeight: 40,
        flex: 1,
        marginRight: 12,
    },
    docsChip: {
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#0A66C2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    docsChipGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    docsChipText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    metaRow: {
        gap: 16,
        marginBottom: 24,
    },
    metaBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    metaIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        fontWeight: '600',
    },
    metaValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#4B5563',
        lineHeight: 28,
    },
    organizerCard: {
        marginTop: 40,
    },
    organizerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 20,
        borderRadius: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    organizerLogo: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    organizerName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    organizerSub: {
        fontSize: 14,
        color: '#6B7280',
    },
    actionBtn: {
        position: 'absolute',
        bottom: 100,
        left: 24,
        right: 24,
        height: 64,
        borderRadius: 22,
        overflow: 'hidden',
        elevation: 12,
        shadowColor: '#0A66C2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        zIndex: 30,
    },
    actionGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
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
    formRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    pickerContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    statusChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    statusChipActive: {
        backgroundColor: '#0A66C2',
    },
    statusChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    statusChipTextActive: {
        color: '#FFF',
    },
    imagePicker: {
        height: 80,
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
        marginTop: 4,
        fontSize: 12,
    },
    imagePreview: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    previewThumb: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    removedThumb: {
        opacity: 0.3,
    },
    removeOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtn: {
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
});

export default EventDetailScreen;
