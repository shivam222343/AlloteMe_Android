import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    Linking,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import MainLayout from '../components/MainLayout';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode } from 'expo-av';
import { resourcesAPI, clubsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const RESOURCE_TYPES = [
    { id: 'all', label: 'All', icon: 'grid-outline', color: '#6366F1' },
    { id: 'link', label: 'Links', icon: 'link-outline', color: '#3B82F6' },
    { id: 'image', label: 'Images', icon: 'image-outline', color: '#10B981' },
    { id: 'video', label: 'Videos', icon: 'videocam-outline', color: '#F59E0B' },
    { id: 'doc', label: 'Docs', icon: 'document-text-outline', color: '#EF4444' },
];

const LINK_TYPES = [
    { id: 'canva', label: 'Canva', icon: 'color-palette', color: '#00C4CC' },
    { id: 'google-docs', label: 'Google Docs', icon: 'document-text', color: '#4285F4' },
    { id: 'google-slides', label: 'Google Slides', icon: 'easel', color: '#FBBC04' },
    { id: 'google-drive', label: 'Google Drive', icon: 'cloud', color: '#34A853' },
    { id: 'google-sheets', label: 'Google Sheets', icon: 'grid', color: '#0F9D58' },
    { id: 'figma', label: 'Figma', icon: 'shapes', color: '#F24E1E' },
    { id: 'notion', label: 'Notion', icon: 'reader', color: '#000000' },
    { id: 'other', label: 'Other Link', icon: 'link', color: '#6B7280' },
];

const EventResourcesScreen = ({ route, navigation }) => {
    const { eventId, eventTitle, clubId: initialClubId } = route.params;
    const { user } = useAuth();
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('all');
    const [clubs, setClubs] = useState([]);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadType, setUploadType] = useState('link');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [viewerModalVisible, setViewerModalVisible] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        title: '',
        url: '',
        clubId: initialClubId || '',
        linkType: 'other',
        uploadedFiles: [], // Array of {uri, base64, uploading, uploaded, cloudinaryUrl}
    });

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [editData, setEditData] = useState({ title: '', clubId: '', url: '', linkType: '' });

    console.log('=== RESOURCE SCREEN DEBUG ===');
    console.log('Event ID:', eventId);
    console.log('Event Title:', eventTitle);
    console.log('Initial Club ID:', initialClubId);
    console.log('Form Data Club ID:', formData.clubId);
    console.log('============================');

    const fetchResources = useCallback(async () => {
        try {
            setLoading(true);
            const res = await resourcesAPI.getByEventId(eventId);
            if (res.success) setResources(res.data);
        } catch (error) {
            console.error('Error fetching resources:', error);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    const fetchClubs = useCallback(async () => {
        try {
            // Fetch all clubs and filter by user's club IDs
            const res = await clubsAPI.getAll();
            if (res.success) {
                const userClubsJoined = user?.clubsJoined || [];
                const userClubIds = userClubsJoined.map(clubJoined => {
                    const clubId = clubJoined.clubId;
                    return typeof clubId === 'object' ? clubId._id : clubId;
                });
                const userClubs = res.data.filter(club => userClubIds.includes(club._id));
                setClubs(userClubs);
            }
        } catch (error) {
            console.error('Error fetching clubs:', error);
        }
    }, [user?.clubs]);

    useEffect(() => {
        fetchResources();
        fetchClubs();
    }, [fetchResources, fetchClubs]);

    // Set default clubId when clubs are loaded
    useEffect(() => {
        if (clubs.length > 0 && !formData.clubId) {
            setFormData(prev => ({ ...prev, clubId: clubs[0]._id }));
        }
    }, [clubs]);

    const uploadToCloudinary = async (fileBase64, fileType, index, explicitTitle) => {
        try {
            const finalTitle = explicitTitle || formData.title || `${fileType} ${index + 1}`;
            const res = await resourcesAPI.uploadFile({
                eventId,
                clubId: formData.clubId,
                title: finalTitle,
                file: fileBase64,
                type: fileType
            }, (progress) => {
                // Update progress for this specific file
                setFormData(prev => ({
                    ...prev,
                    uploadedFiles: prev.uploadedFiles.map((f, i) =>
                        i === index ? { ...f, progress } : f
                    )
                }));
            });

            if (res.success) {
                setFormData(prev => ({
                    ...prev,
                    uploadedFiles: prev.uploadedFiles.map((f, i) =>
                        i === index ? { ...f, uploading: false, uploaded: true, cloudinaryUrl: res.data.url } : f
                    )
                }));
                fetchResources();
            }
        } catch (error) {
            Alert.alert('Error', `Failed to upload file ${index + 1}`);
            setFormData(prev => ({
                ...prev,
                uploadedFiles: prev.uploadedFiles.map((f, i) =>
                    i === index ? { ...f, uploading: false, error: true } : f
                )
            }));
        }
    };

    const handlePickFile = async () => {
        try {
            if (uploadType === 'image') {
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsMultipleSelection: true,
                    quality: 0.7,
                    base64: true
                });
                if (!result.canceled) {
                    const newFiles = result.assets.map((asset, idx) => ({
                        uri: asset.uri,
                        base64: `data:image/jpeg;base64,${asset.base64}`,
                        uploading: true,
                        uploaded: false,
                        progress: 0,
                        type: 'image'
                    }));

                    setFormData(prev => ({
                        ...prev,
                        uploadedFiles: [...prev.uploadedFiles, ...newFiles]
                    }));

                    // Start uploading immediately
                    newFiles.forEach((file, idx) => {
                        const actualIndex = formData.uploadedFiles.length + idx;
                        const fileTitle = formData.title ? `${formData.title} (${idx + 1})` : '';
                        uploadToCloudinary(file.base64, 'image', actualIndex, fileTitle);
                    });
                }
            } else if (uploadType === 'video') {
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['videos'],
                    quality: 1.0,
                    base64: false // ImagePicker doesn't support base64 for videos anyway
                });

                if (!result.canceled) {
                    const asset = result.assets[0];

                    // Show a message because reading large video can take time
                    setLoading(true);

                    try {
                        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
                        const fileSize = fileInfo.size;

                        if (fileSize > 50 * 1024 * 1024) {
                            setLoading(false);
                            return Alert.alert('Error', 'Video size must be less than 50MB');
                        }

                        // Read video as base64 manually
                        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
                        const base64Data = `data:video/mp4;base64,${base64}`;

                        const newFile = {
                            uri: asset.uri,
                            base64: base64Data,
                            uploading: true,
                            uploaded: false,
                            progress: 0,
                            type: 'video'
                        };

                        const newIndex = formData.uploadedFiles.length;
                        setFormData(prev => ({
                            ...prev,
                            uploadedFiles: [...prev.uploadedFiles, newFile]
                        }));

                        uploadToCloudinary(base64Data, 'video', newIndex, formData.title);
                    } catch (err) {
                        console.error('Video processing error:', err);
                        Alert.alert('Error', 'Failed to process video file');
                    } finally {
                        setLoading(false);
                    }
                }
            } else if (uploadType === 'doc') {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['application/pdf', 'application/vnd.ms-excel', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                    copyToCacheDirectory: true
                });
                if (!result.canceled) {
                    const asset = result.assets[0];
                    if (asset.size && asset.size > 10 * 1024 * 1024) {
                        return Alert.alert('Error', 'Document size must be less than 10MB');
                    }

                    const response = await fetch(asset.uri);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const fileName = asset.name ? asset.name.split('.').slice(0, -1).join('.') : '';
                        const finalTitle = formData.title || fileName;

                        setFormData(prev => ({
                            ...prev,
                            title: finalTitle // Set title if empty
                        }));

                        const newFile = {
                            uri: asset.uri,
                            base64: reader.result,
                            uploading: true,
                            uploaded: false,
                            progress: 0,
                            type: 'doc',
                            name: asset.name
                        };

                        const newIndex = formData.uploadedFiles.length;
                        setFormData(prev => ({
                            ...prev,
                            uploadedFiles: [...prev.uploadedFiles, newFile]
                        }));

                        uploadToCloudinary(newFile.base64, 'doc', newIndex, finalTitle);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleAddLink = async () => {
        if (!formData.title || !formData.url || !formData.clubId) {
            return Alert.alert('Error', 'Please fill all required fields');
        }

        try {
            const res = await resourcesAPI.addLink({
                eventId,
                clubId: formData.clubId,
                title: formData.title,
                url: formData.url,
                linkType: formData.linkType
            });

            if (res.success) {
                Alert.alert('Success', 'Link added successfully!');
                setUploadModalVisible(false);
                setFormData({ title: '', url: '', clubId: initialClubId || '', linkType: 'other', uploadedFiles: [] });
                fetchResources();
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to add link');
        }
    };

    const handleDelete = (id) => {
        Alert.alert('Delete Resource', 'Are you sure you want to delete this resource?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await resourcesAPI.delete(id);
                        if (res.success) fetchResources();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete resource');
                    }
                }
            }
        ]);
    };

    const handleEditPress = (item) => {
        setEditingResource(item);
        setEditData({
            title: item.title,
            clubId: (typeof item.clubId === 'object' ? item.clubId?._id : item.clubId) || '',
            url: item.url || '',
            linkType: item.linkType || 'other'
        });
        setEditModalVisible(true);
    };

    const handleUpdateResource = async () => {
        if (!editData.title || !editData.clubId) {
            return Alert.alert('Error', 'Please fill required fields');
        }
        try {
            setLoading(true);
            const res = await resourcesAPI.update(editingResource._id, editData);
            if (res.success) {
                Alert.alert('Success', 'Resource updated successfully');
                setEditModalVisible(false);
                fetchResources();
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update resource');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (item) => {
        try {
            // Ensure filename has an extension
            let fileName = item.title || 'resource';

            console.log('Download Debug - Title:', item.title, 'Type:', item.type, 'Mime:', item.mimeType, 'URL:', item.url);

            // Better extension detection
            let extension = item.mimeType; // Actually stores format in our DB

            // If the format contains '/', it's a full mime type, extract the subtype
            if (extension && extension.includes('/')) {
                extension = extension.split('/').pop();
            }

            if (!extension || extension === 'bin' || extension.length > 5) {
                // Fallback to URL parsing
                const parts = item.url.split('.');
                if (parts.length > 1) {
                    const lastPart = parts.pop().split('?')[0].toLowerCase();
                    if (lastPart.length < 5) extension = lastPart;
                }
            }

            // If it's a doc and it's still bin or something weird, use PDF as default if we know it's a doc
            if (item.type === 'doc' && (!extension || extension === 'bin' || extension.length > 5)) {
                extension = 'pdf';
            }

            if (extension && !fileName.toLowerCase().endsWith('.' + extension.toLowerCase())) {
                fileName = `${fileName}.${extension}`;
            }

            const fileUri = FileSystem.documentDirectory + fileName;
            console.log('Download Debug - Final FileName:', fileName, 'Target URI:', fileUri);

            Alert.alert('Download', 'Downloading file...', [
                { text: 'Close', style: 'cancel' }
            ], { cancelable: true });

            const downloadResult = await FileSystem.downloadAsync(item.url, fileUri);

            if (downloadResult.status !== 200) {
                throw new Error('Failed to download file');
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: item.type === 'doc' ? 'application/pdf' :
                        item.type === 'image' ? 'image/jpeg' :
                            item.type === 'video' ? 'video/mp4' : undefined,
                    dialogTitle: `Share ${fileName}`
                });
            } else {
                Alert.alert('Success', 'File downloaded to ' + downloadResult.uri);
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to download or share file. Make sure you have a stable connection.');
        }
    };

    const handleResourcePress = async (item) => {
        if (item.type === 'link') {
            const supported = await Linking.canOpenURL(item.url);
            if (supported) {
                await Linking.openURL(item.url);
            } else {
                Alert.alert('Error', 'Cannot open this URL');
            }
        } else {
            // Open in-app viewer
            setSelectedResource(item);
            setViewerModalVisible(true);
        }
    };

    // Get user's club IDs - clubs are already filtered in fetchClubs
    const userClubIds = clubs.map(c => c._id);

    console.log('Resource Screen - User Club IDs:', userClubIds);
    console.log('Resource Screen - Total Resources:', resources.length);

    const filteredResources = resources.filter(r => {
        const matchesType = selectedTab === 'all' || r.type === selectedTab;

        // Handle both object and string club IDs
        const resourceClubId = typeof r.clubId === 'object' ? r.clubId?._id : r.clubId;
        const matchesClub = userClubIds.includes(resourceClubId);

        console.log('Resource:', r.title, 'Club ID:', resourceClubId, 'Matches:', matchesClub);

        return matchesType && matchesClub;
    });

    const getLinkTypeConfig = (linkType) => {
        return LINK_TYPES.find(t => t.id === linkType) || LINK_TYPES.find(t => t.id === 'other');
    };

    const renderRightActions = (progress, dragX, item) => {
        const canDelete = user?.role === 'admin' || (item.uploadedBy?._id ? item.uploadedBy._id === user?._id : item.uploadedBy === user?._id);
        if (!canDelete) return null;

        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => handleDelete(item._id)}
            >
                <Ionicons name="trash-outline" size={24} color="#FFF" />
                <Text style={styles.deleteActionText}>Delete</Text>
            </TouchableOpacity>
        );
    };

    const renderResourceItem = ({ item }) => {
        const typeConfig = RESOURCE_TYPES.find(t => t.id === item.type);
        const linkConfig = item.type === 'link' ? getLinkTypeConfig(item.linkType) : null;
        const displayIcon = linkConfig?.icon || typeConfig?.icon;
        const displayColor = linkConfig?.color || typeConfig?.color;
        const canEdit = user?.role === 'admin' || (item.uploadedBy?._id ? item.uploadedBy._id === user?._id : item.uploadedBy === user?._id);

        return (
            <Swipeable
                renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                rightThreshold={40}
            >
                <TouchableOpacity
                    style={styles.resourceCard}
                    onPress={() => handleResourcePress(item)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: displayColor + '15' }]}>
                        {item.type === 'image' ? (
                            <Image source={{ uri: item.url }} style={styles.thumbnailImg} resizeMode="cover" />
                        ) : (
                            <Ionicons name={displayIcon} size={24} color={displayColor} />
                        )}
                    </View>
                    <View style={styles.resourceInfo}>
                        <Text style={styles.resourceTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.resourceMeta}>
                            <Text style={styles.metaText}>{item.clubId?.name}</Text>
                            <View style={styles.dot} />
                            <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                    {item.type !== 'link' && (
                        <TouchableOpacity onPress={() => handleDownload(item)} style={styles.downloadBtn}>
                            <Ionicons name="download-outline" size={20} color="#0A66C2" />
                        </TouchableOpacity>
                    )}
                    {canEdit && (
                        <TouchableOpacity onPress={() => handleEditPress(item)} style={styles.editBtn}>
                            <Ionicons name="create-outline" size={20} color="#0A66C2" />
                        </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </TouchableOpacity>
            </Swipeable>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <MainLayout title={eventTitle || 'Event Resources'} navigation={navigation}>
                <View style={styles.container}>
                    <View style={styles.tabsContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                            {RESOURCE_TYPES.map(tab => (
                                <TouchableOpacity
                                    key={tab.id}
                                    style={[styles.tab, selectedTab === tab.id && styles.activeTab]}
                                    onPress={() => setSelectedTab(tab.id)}
                                >
                                    <Ionicons
                                        name={tab.icon}
                                        size={18}
                                        color={selectedTab === tab.id ? '#FFF' : '#6B7280'}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[styles.tabText, selectedTab === tab.id && styles.activeTabText]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {loading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color="#0A66C2" />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredResources}
                            keyExtractor={item => item._id}
                            renderItem={renderResourceItem}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="folder-open-outline" size={60} color="#D1D5DB" />
                                    <Text style={styles.emptyText}>No {selectedTab === 'all' ? 'resources' : selectedTab + 's'} found</Text>
                                </View>
                            }
                        />
                    )}

                    {/* Edit Modal */}
                    <Modal visible={editModalVisible} animationType="slide" transparent>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Edit Resource</Text>
                                    <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                        <Ionicons name="close" size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <Text style={styles.label}>Title *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editData.title}
                                        onChangeText={v => setEditData({ ...editData, title: v })}
                                    />

                                    {editingResource?.type === 'link' && (
                                        <>
                                            <Text style={styles.label}>URL *</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={editData.url}
                                                onChangeText={v => setEditData({ ...editData, url: v })}
                                                keyboardType="url"
                                            />
                                            <Text style={styles.label}>Link Type</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.linkTypeScroll}>
                                                {LINK_TYPES.map(lt => (
                                                    <TouchableOpacity
                                                        key={lt.id}
                                                        style={[styles.linkTypeChip, editData.linkType === lt.id && { backgroundColor: lt.color + '20', borderColor: lt.color }]}
                                                        onPress={() => setEditData({ ...editData, linkType: lt.id })}
                                                    >
                                                        <Ionicons name={lt.icon} size={16} color={editData.linkType === lt.id ? lt.color : '#6B7280'} />
                                                        <Text style={[styles.linkTypeText, editData.linkType === lt.id && { color: lt.color, fontWeight: '700' }]}>{lt.label}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </>
                                    )}

                                    <Text style={[styles.label, { marginTop: 24 }]}>Club Association *</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clubScroll}>
                                        {clubs.map(c => (
                                            <TouchableOpacity
                                                key={c._id}
                                                style={[styles.clubChip, editData.clubId === c._id && styles.activeClubChip]}
                                                onPress={() => setEditData({ ...editData, clubId: c._id })}
                                            >
                                                <Text style={[styles.clubChipText, editData.clubId === c._id && styles.activeClubChipText]}>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <TouchableOpacity
                                        style={[styles.uploadBtn, { marginTop: 40 }]}
                                        onPress={handleUpdateResource}
                                    >
                                        <Text style={styles.uploadBtnText}>Update Resource</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>

                    <TouchableOpacity
                        style={styles.fab}
                        onPress={() => setUploadModalVisible(true)}
                    >
                        <LinearGradient
                            colors={['#0A66C2', '#0E76A8']}
                            style={styles.fabGradient}
                        >
                            <Ionicons name="add" size={30} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Create Resource Modal (uploadModal) */}
                    <Modal visible={uploadModalVisible} animationType="slide" transparent>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Add Resource</Text>
                                    <TouchableOpacity onPress={() => {
                                        setUploadModalVisible(false);
                                        setFormData({ title: '', url: '', clubId: initialClubId || '', linkType: 'other', uploadedFiles: [] });
                                    }}>
                                        <Ionicons name="close" size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                                >
                                    <Text style={styles.label}>Type</Text>
                                    <View style={styles.typeSelector}>
                                        {RESOURCE_TYPES.filter(t => t.id !== 'all').map(t => (
                                            <TouchableOpacity
                                                key={t.id}
                                                style={[styles.typeBtn, uploadType === t.id && { backgroundColor: t.color + '20', borderColor: t.color }]}
                                                onPress={() => {
                                                    setUploadType(t.id);
                                                    setFormData({ ...formData, uploadedFiles: [], url: '' });
                                                }}
                                            >
                                                <Ionicons name={t.icon} size={20} color={uploadType === t.id ? t.color : '#6B7280'} />
                                                <Text style={[styles.typeLabel, uploadType === t.id && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.label}>Club association *</Text>
                                    {initialClubId ? (
                                        <View style={styles.clubScroll}>
                                            {clubs.filter(c => c._id === initialClubId).map(c => (
                                                <View
                                                    key={c._id}
                                                    style={[styles.clubChip, styles.activeClubChip, { opacity: 0.8 }]}
                                                >
                                                    <Text style={[styles.clubChipText, styles.activeClubChipText]}>{c.name}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clubScroll}>
                                            {clubs.map(c => (
                                                <TouchableOpacity
                                                    key={c._id}
                                                    style={[styles.clubChip, formData.clubId === c._id && styles.activeClubChip]}
                                                    onPress={() => setFormData({ ...formData, clubId: c._id })}
                                                >
                                                    <Text style={[styles.clubChipText, formData.clubId === c._id && styles.activeClubChipText]}>{c.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}

                                    <Text style={styles.label}>{uploadType === 'link' ? 'Link Title *' : 'File Name *'}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter title"
                                        value={formData.title}
                                        onChangeText={v => setFormData({ ...formData, title: v })}
                                    />

                                    {uploadType === 'link' ? (
                                        <>
                                            <Text style={styles.label}>Link Type</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.linkTypeScroll}>
                                                {LINK_TYPES.map(lt => (
                                                    <TouchableOpacity
                                                        key={lt.id}
                                                        style={[styles.linkTypeChip, formData.linkType === lt.id && { backgroundColor: lt.color + '20', borderColor: lt.color }]}
                                                        onPress={() => setFormData({ ...formData, linkType: lt.id })}
                                                    >
                                                        <Ionicons name={lt.icon} size={16} color={formData.linkType === lt.id ? lt.color : '#6B7280'} />
                                                        <Text style={[styles.linkTypeText, formData.linkType === lt.id && { color: lt.color, fontWeight: '700' }]}>{lt.label}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>

                                            <Text style={[styles.label, { marginTop: 24 }]}>URL *</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="https://..."
                                                value={formData.url}
                                                onChangeText={v => setFormData({ ...formData, url: v })}
                                                keyboardType="url"
                                                autoCapitalize="none"
                                            />

                                            <TouchableOpacity
                                                style={styles.uploadBtn}
                                                onPress={handleAddLink}
                                            >
                                                <Text style={styles.uploadBtnText}>Add Link</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <View style={{ height: 24 }} />
                                            <TouchableOpacity style={styles.filePicker} onPress={handlePickFile}>
                                                <Ionicons name="cloud-upload-outline" size={32} color="#0A66C2" />
                                                <Text style={styles.filePickerText}>
                                                    Select {uploadType}
                                                </Text>
                                                {uploadType === 'image' && <Text style={styles.sizeLimit}>Max 5MB per image</Text>}
                                                {uploadType === 'video' && <Text style={styles.sizeLimit}>Max 50MB</Text>}
                                                {uploadType === 'doc' && <Text style={styles.sizeLimit}>Max 10MB</Text>}
                                            </TouchableOpacity>

                                            {formData.uploadedFiles.length > 0 && (
                                                <>
                                                    <View style={styles.uploadedFilesContainer}>
                                                        <Text style={styles.label}>Uploading Files</Text>
                                                        {formData.uploadedFiles.map((file, idx) => (
                                                            <View key={idx} style={styles.uploadingFileCard}>
                                                                {file.type === 'image' && (
                                                                    <Image source={{ uri: file.uri }} style={styles.uploadingThumb} />
                                                                )}
                                                                <View style={styles.uploadingInfo}>
                                                                    <Text style={styles.uploadingFileName}>File {idx + 1}</Text>
                                                                    {file.uploading && (
                                                                        <View style={styles.progressBarSmall}>
                                                                            <View style={[styles.progressFillSmall, { width: `${file.progress}%` }]} />
                                                                        </View>
                                                                    )}
                                                                    {file.uploaded && (
                                                                        <View style={styles.uploadedBadge}>
                                                                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                                                            <Text style={styles.uploadedText}>Uploaded</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>

                                                    <TouchableOpacity
                                                        style={styles.doneBtn}
                                                        onPress={() => {
                                                            setUploadModalVisible(false);
                                                            setFormData({ title: '', url: '', clubId: initialClubId || '', linkType: 'other', uploadedFiles: [] });
                                                        }}
                                                    >
                                                        <Text style={styles.doneBtnText}>Done</Text>
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </>
                                    )}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>

                    {/* Viewer Modal */}
                    <Modal visible={viewerModalVisible} animationType="fade" transparent>
                        <View style={styles.viewerOverlay}>
                            <View style={styles.viewerHeader}>
                                <TouchableOpacity onPress={() => setViewerModalVisible(false)} style={styles.viewerCloseBtn}>
                                    <Ionicons name="close" size={28} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => selectedResource && handleDownload(selectedResource)} style={styles.viewerDownloadBtn}>
                                    <Ionicons name="download-outline" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                            {selectedResource && (
                                <View style={styles.viewerContent}>
                                    {selectedResource.type === 'image' && (
                                        <Image source={{ uri: selectedResource.url }} style={styles.viewerImage} resizeMode="contain" />
                                    )}
                                    {selectedResource.type === 'video' && (
                                        <Video
                                            source={{ uri: selectedResource.url }}
                                            style={styles.viewerVideo}
                                            useNativeControls
                                            resizeMode={ResizeMode.CONTAIN}
                                            shouldPlay
                                            isLooping
                                        />
                                    )}
                                    {selectedResource.type === 'doc' && (
                                        <WebView
                                            source={{
                                                uri: Platform.OS === 'android'
                                                    ? `https://docs.google.com/viewer?url=${encodeURIComponent(selectedResource.url)}&embedded=true`
                                                    : selectedResource.url
                                            }}
                                            style={styles.viewerWebView}
                                            scalesPageToFit={true}
                                            startInLoadingState={true}
                                            originWhitelist={['*']}
                                            allowsInlineMediaPlayback={true}
                                            javaScriptEnabled={true}
                                            domStorageEnabled={true}
                                            renderLoading={() => <ActivityIndicator color="#0A66C2" size="large" style={styles.loader} />}
                                        />
                                    )}
                                </View>
                            )}
                        </View>
                    </Modal>
                </View>
            </MainLayout>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    tabsContainer: {
        backgroundColor: '#FFF',
        paddingVertical: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tabsScroll: {
        paddingHorizontal: 16,
        gap: 10,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeTab: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#FFF',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    resourceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    resourceInfo: {
        flex: 1,
    },
    resourceTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    resourceMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        color: '#6B7280',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#D1D5DB',
        marginHorizontal: 8,
    },
    downloadBtn: {
        padding: 8,
        marginRight: 4,
    },
    deleteBtn: {
        padding: 8,
        marginRight: 4,
    },
    editBtn: {
        padding: 8,
        marginRight: 4,
    },
    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '83%', // Matches card height + margin
        borderRadius: 16,
        marginBottom: 12,
        marginLeft: -16, // Move past potential margins
    },
    deleteActionText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#9CA3AF',
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
        minHeight: '70%',
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
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginTop: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    typeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    typeLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 6,
    },
    clubScroll: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    clubChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
    },
    activeClubChip: {
        backgroundColor: '#0A66C2',
    },
    clubChipText: {
        color: '#6B7280',
        fontWeight: '600',
    },
    activeClubChipText: {
        color: '#FFF',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    linkTypeScroll: {
        flexDirection: 'row',
    },
    linkTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        gap: 6,
    },
    linkTypeText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    filePicker: {
        height: 120,
        borderWidth: 2,
        borderColor: '#0A66C2',
        borderStyle: 'dashed',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F7FF',
    },
    filePickerText: {
        fontSize: 16,
        color: '#0A66C2',
        fontWeight: '600',
        marginTop: 8,
    },
    sizeLimit: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    uploadedFilesContainer: {
        marginTop: 20,
    },
    uploadingFileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
    },
    uploadingThumb: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    uploadingInfo: {
        flex: 1,
    },
    uploadingFileName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    progressBarSmall: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFillSmall: {
        height: '100%',
        backgroundColor: '#0A66C2',
    },
    uploadedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    uploadedText: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '600',
    },
    uploadBtn: {
        backgroundColor: '#0A66C2',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 40,
    },
    uploadBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    doneBtn: {
        backgroundColor: '#10B981',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    doneBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    viewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    viewerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
    },
    viewerCloseBtn: {
        padding: 8,
    },
    viewerDownloadBtn: {
        padding: 8,
    },
    viewerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerImage: {
        width: width,
        height: '100%',
    },
    viewerVideo: {
        width: width,
        height: 300,
    },
    viewerWebView: {
        width: width,
        height: '100%',
        backgroundColor: '#FFF',
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    viewerPlaceholder: {
        color: '#FFF',
        fontSize: 16,
    },
});

export default EventResourcesScreen;
