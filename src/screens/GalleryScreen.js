import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    FlatList,
    Image,
    TextInput,
    RefreshControl,
    ScrollView,
    Dimensions,
    Modal,
    Platform,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Animated,
    Vibration,
    Keyboard,
    BackHandler
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MainLayout from '../components/MainLayout';
import { SkeletonGalleryGrid, SkeletonBox } from '../components/SkeletonLoader';
import { useAuth } from '../contexts/AuthContext';
import { galleryAPI, clubsAPI } from '../services/api';
import { API_CONFIG } from '../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { prepareFile } from '../services/cloudinaryService';
import MediaUploadModal from '../components/MediaUploadModal';
import { useWebUpload } from '../hooks/useWebUpload';


const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 45) / 2;

const FullScreenImageItem = ({ item, toggleLike, user, onClose }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const heartAnim = useRef(new Animated.Value(0)).current;

    const onGestureEvent = Animated.event(
        [{ nativeEvent: { translationY: translateY } }],
        { useNativeDriver: true }
    );

    const onHandlerStateChange = (event) => {
        if (event.nativeEvent.state === State.END) {
            if (event.nativeEvent.translationY > 100) {
                onClose();
            } else {
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7
                }).start();
            }
        }
    };

    let lastTap = null;
    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
            Vibration.vibrate(50);
            toggleLike(item._id); // This toggles (likes or unlikes)

            // Show heart animation only if we are liking (or maybe always? User said "double tab to Dislike" too?)
            // Usually big heart animation is for LIKE.
            // If we are unliking, maybe we shouldn't show the heart or show a broken heart?
            // For now, let's just show the heart animation on double tap regardless, as feedback.
            Animated.sequence([
                Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true }),
                Animated.delay(500),
                Animated.spring(heartAnim, { toValue: 0, useNativeDriver: true })
            ]).start();
            lastTap = null;
        } else {
            lastTap = now;
        }
    };

    return (
        <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetX={[-1000, 1000]}
            failOffsetX={[-20, 20]}
            activeOffsetY={[-1000, 20]}
        >
            <Animated.View style={[styles.fullImgWrapper, { width: width, height: '100%', transform: [{ translateY }] }]}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleDoubleTap}
                    style={{ flex: 1, justifyContent: 'center' }}
                >
                    <Image source={{ uri: item.imageUrl }} style={styles.fullImage} resizeMode="contain" />

                    <Animated.View style={[styles.largeHeart, {
                        opacity: heartAnim,
                        transform: [{
                            scale: heartAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1.5]
                            })
                        }]
                    }]}>
                        <Ionicons name="heart" size={80} color="#FFF" />
                    </Animated.View>
                </TouchableOpacity>
            </Animated.View>
        </PanGestureHandler>
    );
};

const GalleryScreen = ({ navigation }) => {
    const { user, socket } = useAuth();
    const { startWebUpload } = useWebUpload();

    const [images, setImages] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedClub, setSelectedClub] = useState('all');
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0); // Added state for progress
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        category: 'other',
        clubId: ''
    });

    // Detail Modal States
    const [detailVisible, setDetailVisible] = useState(false);
    const [activeImage, setActiveImage] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [commentText, setCommentText] = useState('');
    const [showComments, setShowComments] = useState(false);
    const [likesListVisible, setLikesListVisible] = useState(false);
    const [likedUsers, setLikedUsers] = useState([]);
    const [fileSizeError, setFileSizeError] = useState(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [choiceModalVisible, setChoiceModalVisible] = useState(false);
    const [editData, setEditData] = useState({ title: '', description: '', category: '' });


    const categories = ['all', 'event', 'meeting', 'workshop', 'social', 'achievement', 'other'];
    const { MAX_FILE_SIZE } = require('../services/cloudinaryService');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [imgRes, clubRes] = await Promise.all([
                galleryAPI.getImages({
                    category: selectedCategory !== 'all' ? selectedCategory : undefined,
                    clubId: selectedClub !== 'all' ? selectedClub : undefined
                }),
                clubsAPI.getAll()
            ]);

            if (imgRes.success) setImages(imgRes.data);
            if (clubRes.success) setClubs(clubRes.data);
        } catch (error) {
            console.error('Error fetching gallery:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCategory, selectedClub]);

    const handleLikeUpdate = useCallback((data) => {
        setImages(prev => prev.map(img =>
            img._id === data.imageId ? { ...img, likes: data.likes } : img
        ));
        setActiveImage(current => {
            if (current?._id === data.imageId) {
                return { ...current, likes: data.likes };
            }
            return current;
        });
    }, []);

    const handleCommentUpdate = useCallback((data) => {
        setImages(prev => prev.map(img => {
            if (img._id === data.imageId) {
                const updatedComments = Array.isArray(img.comments) ? img.comments : [];
                if (updatedComments.find(c => c._id === data.comment._id)) return img;
                return { ...img, comments: [...updatedComments, data.comment] };
            }
            return img;
        }));
        setActiveImage(current => {
            if (current?._id === data.imageId) {
                const refreshedComments = Array.isArray(current.comments) ? current.comments : [];
                if (refreshedComments.find(c => c._id === data.comment._id)) return current;
                return {
                    ...current,
                    comments: [...refreshedComments, data.comment]
                };
            }
            return current;
        });
    }, []);

    const handleNewImage = useCallback((newImg) => {
        setImages(prev => {
            if (prev.find(img => img._id === newImg._id)) return prev;
            // Check if matches current filters
            if (selectedCategory !== 'all' && newImg.category !== selectedCategory) return prev;
            if (selectedClub !== 'all' && newImg.clubId?._id !== selectedClub && newImg.clubId !== selectedClub) return prev;
            return [newImg, ...prev];
        });
    }, [selectedCategory, selectedClub]);

    useEffect(() => {
        fetchData();
    }, []);

    const categoryScrollRef = useRef(null);
    const categoryLayouts = useRef({});

    useEffect(() => {
        if (categoryScrollRef.current && categoryLayouts.current[selectedCategory]) {
            const { x, width: itemWidth } = categoryLayouts.current[selectedCategory];
            const scrollViewWidth = width; // Assuming full width or close to it
            categoryScrollRef.current.scrollTo({
                x: x - (scrollViewWidth / 2 - itemWidth / 2),
                animated: true
            });
        }
    }, [selectedCategory]);

    useEffect(() => {
        if (socket) {
            socket.on('gallery:like', handleLikeUpdate);
            socket.on('gallery:comment', handleCommentUpdate);
            socket.on('gallery:new', handleNewImage);

            return () => {
                socket.off('gallery:like', handleLikeUpdate);
                socket.off('gallery:comment', handleCommentUpdate);
                socket.off('gallery:new', handleNewImage);
            };
        }
    }, [socket, handleLikeUpdate, handleCommentUpdate, handleNewImage]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    useEffect(() => {
        const onBackPress = () => {
            if (detailVisible) {
                setDetailVisible(false);
                return true; // Prevent default behavior (exit app/navigate back)
            }
            return false;
        };

        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        );

        return () => subscription.remove();
    }, [detailVisible]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.3, // Lower quality for smaller file size on Android
            base64: true, // Enable base64 for Android compatibility
            exif: false,
        });

        if (!result.canceled) {
            const asset = result.assets[0];

            // Check file size
            if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
                setFileSizeError('This image is too large (over 20MB). Please pick a smaller one.');
                Alert.alert(
                    'File Too Large',
                    'The selected image is too large. Please choose a smaller image or use the camera to take a new photo.',
                    [{ text: 'OK' }]
                );
                return;
            }

            setSelectedImage(asset);
            setFileSizeError(null);
        }
    };

    const handleWebUploadFlow = async () => {
        const result = await startWebUpload({ type: 'gallery' });
        if (result.success && result.url) {
            // Set the uploaded image and open the gallery upload modal to fill details
            setSelectedImage({ uri: result.url, isWebUpload: true, publicId: result.publicId });
            setUploadModalVisible(true);
        } else if (result.message && result.message !== 'Upload cancelled or failed' && result.message !== 'Upload cancelled') {
            Alert.alert('Upload Failed', result.message);
        }
    };


    const handleUpload = async () => {
        if (!selectedImage) return Alert.alert('Error', 'Please select an image');
        if (fileSizeError) return Alert.alert('Error', 'Image is too large to upload.');

        try {
            setUploading(true);

            // Prepare base64 image data (like Donation app)
            const base64Img = selectedImage.base64
                ? `data:image/jpeg;base64,${selectedImage.base64}`
                : selectedImage.uri;

            console.log('Uploading with base64, data length:', base64Img?.length || 0);
            console.log('Upload data:', {
                title: uploadData.title,
                category: uploadData.category,
                clubId: uploadData.clubId
            });

            // Send as JSON with base64 image
            const uploadPayload = {
                image: base64Img,
                title: uploadData.title || '',
                description: uploadData.description || '',
                category: uploadData.category || 'other',
            };

            // Only include clubId if it's valid
            if (uploadData.clubId && uploadData.clubId !== 'all') {
                uploadPayload.clubId = uploadData.clubId;
            }

            const res = await galleryAPI.uploadBase64(uploadPayload, (progress) => {
                setUploadProgress(progress);
                console.log(`Gallery Upload Progress: ${progress}%`);
            });

            if (res.success) {
                setUploadModalVisible(false);
                setSelectedImage(null);
                setUploadData({ title: '', description: '', category: 'other', clubId: '' });
                Alert.alert('Success', 'Image uploaded successfully! Waiting for admin approval.');
                // fetchData(); // Don't refresh list yet as it's pending
            }
        } catch (error) {
            console.error('Gallery Upload Error:', error);
            Alert.alert('Error', error.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const toggleLike = async (imageId) => {
        try {
            Vibration.vibrate(50);
            const res = await galleryAPI.toggleLike(imageId);
            if (res.success) {
                // Update specific image in the list
                setImages(prev => prev.map(img =>
                    img._id === imageId ? { ...img, likes: res.likes } : img
                ));

                // Also update activeImage if it matches, so the detail view updates immediately
                setActiveImage(prev => {
                    if (prev && prev._id === imageId) {
                        return { ...prev, likes: res.likes };
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Like error:', error);
        }
    };

    const submitComment = async () => {
        if (!commentText.trim() || !activeImage) return;
        try {
            const res = await galleryAPI.addComment(activeImage._id, commentText);
            if (res.success) {
                setCommentText('');
                Keyboard.dismiss();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to add comment');
        }
    };

    const handleDeleteGalleryImage = async (id) => {
        Alert.alert('Delete Image', 'Are you sure you want to remove this photo?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await galleryAPI.delete(id);
                        if (res.success) {
                            setImages(prev => prev.filter(img => img._id !== id));
                            setDetailVisible(false);
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete image');
                    }
                }
            }
        ]);
    };

    const handleUpdateGalleryImage = async (id, updatedData) => {
        try {
            const res = await galleryAPI.update(id, updatedData);
            if (res.success) {
                setImages(prev => prev.map(img => img._id === id ? { ...img, ...res.data } : img));
                setActiveImage(prev => ({ ...prev, ...res.data }));
                setEditModalVisible(false);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update image');
        }
    };

    const fetchLikesList = async () => {
        if (!activeImage) return;
        try {
            const res = await galleryAPI.getLikes(activeImage._id);
            if (res.success) {
                setLikedUsers(res.data);
                setLikesListVisible(true);
            }
        } catch (error) {
            console.error('Likes list error:', error);
        }
    };

    const handleCategorySwipe = (direction) => {
        const currentIndex = categories.indexOf(selectedCategory);
        if (currentIndex === -1) return;

        if (direction === 'next') {
            if (currentIndex < categories.length - 1) {
                setSelectedCategory(categories[currentIndex + 1]);
            }
        } else {
            if (currentIndex > 0) {
                setSelectedCategory(categories[currentIndex - 1]);
            }
        }
    };

    const onSwipeGestureEvent = (event) => {
        if (event.nativeEvent.state === State.END) {
            const { translationX, velocityX } = event.nativeEvent;
            if (Math.abs(translationX) > 60 && Math.abs(velocityX) > 300) {
                if (translationX < 0) {
                    handleCategorySwipe('next');
                } else {
                    handleCategorySwipe('prev');
                }
            }
        }
    };

    // Pinterest Layout logic: distribute into 2 columns
    const { leftColumn, rightColumn } = useMemo(() => {
        const left = images.filter((_, i) => i % 2 === 0);
        const right = images.filter((_, i) => i % 2 !== 0);
        return { leftColumn: left, rightColumn: right };
    }, [images]);

    const GalleryItem = React.memo(({ item }) => {
        const heartAnim = useRef(new Animated.Value(0)).current;

        // Deterministic random height based on ID to prevent jumping
        const getItemHeight = (id) => {
            const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return 180 + (sum % 120); // Height between 180 and 300
        };

        const itemHeight = getItemHeight(item._id);

        const handleDoubleTap = (event) => {
            if (event.nativeEvent.state === State.ACTIVE) {
                if (!item.likes.includes(user._id)) {
                    toggleLike(item._id);
                }

                Animated.sequence([
                    Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true }),
                    Animated.delay(500),
                    Animated.spring(heartAnim, { toValue: 0, useNativeDriver: true })
                ]).start();
            }
        };

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    const index = images.findIndex(img => img._id === item._id);
                    setActiveImageIndex(index !== -1 ? index : 0);
                    setActiveImage(item);
                    setDetailVisible(true);
                }}
                activeOpacity={0.95}
            >
                <View style={{ height: itemHeight }}>
                    <Image source={{ uri: item.imageUrl }} style={[styles.cardImage, { height: itemHeight }]} />

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.cardOverlay}
                    >
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                        <View style={styles.cardMeta}>
                            <View style={styles.authorInfo}>
                                <Image
                                    source={item.uploadedBy?.profilePicture?.url ? { uri: item.uploadedBy.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + item.uploadedBy?.displayName }}
                                    style={styles.authorAvatar}
                                />
                                <Text style={styles.authorName} numberOfLines={1}>{item.uploadedBy?.displayName}</Text>
                            </View>
                            <View style={styles.likesCount}>
                                <Ionicons name="heart" size={12} color={item.likes?.includes(user._id) ? "#FF4B2B" : "#FFF"} />
                                <Text style={styles.likesText}>{item.likes?.length || 0}</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    <Animated.View style={[styles.largeHeart, {
                        opacity: heartAnim,
                        transform: [{
                            scale: heartAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1.5]
                            })
                        }]
                    }]}>
                        <Ionicons name="heart" size={60} color="#FFF" />
                    </Animated.View>
                </View>
            </TouchableOpacity>
        );
    });

    return (
        <MainLayout navigation={navigation} title="Gallery" currentRoute="Gallery">
            <View style={styles.container}>
                <PanGestureHandler
                    onHandlerStateChange={onSwipeGestureEvent}
                    activeOffsetX={[-20, 20]}
                    failOffsetY={[-20, 20]}
                >
                    <View style={{ flex: 1 }}>
                        {/* Filters */}
                        <View style={styles.filterSection}>
                            <ScrollView
                                ref={categoryScrollRef}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                nestedScrollEnabled={true}
                            >
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.filterChip, selectedCategory === cat && styles.filterActive]}
                                        onPress={() => setSelectedCategory(cat)}
                                        onLayout={(event) => {
                                            categoryLayouts.current[cat] = event.nativeEvent.layout;
                                        }}
                                    >
                                        <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Pinterest Grid */}
                        {loading && !refreshing ? (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                                <SkeletonGalleryGrid items={8} />
                            </ScrollView>
                        ) : (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
                                    setRefreshing(true);
                                    fetchData();
                                }} />}
                            >
                                <View style={styles.gridContainer}>
                                    <View style={styles.column}>
                                        {leftColumn.map(item => <GalleryItem key={item._id} item={item} />)}
                                    </View>
                                    <View style={styles.column}>
                                        {rightColumn.map(item => <GalleryItem key={item._id} item={item} />)}
                                    </View>
                                </View>

                                {images.length === 0 && (
                                    <View style={styles.emptyBox}>
                                        <Ionicons name="images-outline" size={60} color="#D1D5DB" />
                                        <Text style={styles.emptyText}>No photos found in gallery</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </PanGestureHandler>

                {/* Floating Add Button */}
                <Pressable
                    style={({ pressed }) => [
                        styles.fab,
                        { transform: [{ scale: pressed ? 0.9 : 1 }], opacity: pressed ? 0.9 : 1 }
                    ]}
                    onPress={() => setChoiceModalVisible(true)}
                >
                    <Ionicons name="add" size={30} color="#FFF" />
                </Pressable>

                <MediaUploadModal
                    visible={choiceModalVisible}
                    onClose={() => setChoiceModalVisible(false)}
                    onNativePick={() => setUploadModalVisible(true)}
                    onWebUpload={handleWebUploadFlow}
                    title="Upload to Gallery"
                />


                {/* Upload Modal */}
                <Modal visible={uploadModalVisible} animationType="slide" transparent>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setUploadModalVisible(false)}
                        >
                            <TouchableOpacity activeOpacity={1} style={styles.uploadCard}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Share moments</Text>
                                    <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                                        <Ionicons name="close" size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <TouchableOpacity style={[styles.pickerBox, fileSizeError && { borderColor: '#EF4444' }]} onPress={handlePickImage}>
                                        {selectedImage ? (
                                            <Image source={{ uri: selectedImage.uri }} style={styles.pickedImage} />
                                        ) : (
                                            <>
                                                <Ionicons name="camera-outline" size={40} color="#0A66C2" />
                                                <Text style={styles.pickerText}>Pick from gallery</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    {fileSizeError && (
                                        <View style={styles.errorBanner}>
                                            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                                            <Text style={styles.errorBannerText}>{fileSizeError}</Text>
                                        </View>
                                    )}

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Title (optional)"
                                        value={uploadData.title}
                                        onChangeText={v => setUploadData({ ...uploadData, title: v })}
                                    />

                                    <TextInput
                                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                        placeholder="Description..."
                                        multiline
                                        value={uploadData.description}
                                        onChangeText={v => setUploadData({ ...uploadData, description: v })}
                                    />

                                    <Text style={styles.label}>Category</Text>
                                    <View style={styles.catGrid}>
                                        {categories.filter(c => c !== 'all').map(cat => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.catChip, uploadData.category === cat && styles.catActive]}
                                                onPress={() => setUploadData({ ...uploadData, category: cat })}
                                            >
                                                <Text style={[styles.catText, uploadData.category === cat && styles.catTextActive]}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.label}>Club (optional)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                                        <TouchableOpacity
                                            style={[styles.catChip, !uploadData.clubId && styles.catActive]}
                                            onPress={() => setUploadData({ ...uploadData, clubId: '' })}
                                        >
                                            <Text style={[styles.catText, !uploadData.clubId && styles.catTextActive]}>None</Text>
                                        </TouchableOpacity>
                                        {clubs.map(club => (
                                            <TouchableOpacity
                                                key={club._id}
                                                style={[styles.catChip, uploadData.clubId === club._id && styles.catActive]}
                                                onPress={() => setUploadData({ ...uploadData, clubId: club._id })}
                                            >
                                                <Text style={[styles.catText, uploadData.clubId === club._id && styles.catTextActive]}>
                                                    {club.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <TouchableOpacity
                                        style={[styles.uploadBtn, uploading && styles.btnDisabled]}
                                        onPress={handleUpload}
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <View style={{ width: '100%', alignItems: 'center' }}>
                                                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Uploading... {uploadProgress}%</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.btnText}>Post to Gallery</Text>
                                        )}
                                    </TouchableOpacity>
                                </ScrollView>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Detail View Modal */}
                <Modal
                    visible={detailVisible}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setDetailVisible(false)}
                >
                    <View style={styles.detailContainer}>
                        {activeImage && (
                            <>
                                <View style={styles.detailHeader}>
                                    <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.detailBack}>
                                        <Ionicons name="close" size={30} color="#FFF" />
                                    </TouchableOpacity>
                                    <View style={styles.detailHeaderRow}>
                                        <View style={styles.uploaderBox}>
                                            <Image
                                                source={activeImage.uploadedBy?.profilePicture?.url ? { uri: activeImage.uploadedBy.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + (activeImage.uploadedBy?.displayName || 'User') }}
                                                style={styles.detailAvatar}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.detailAuthor}>{activeImage.uploadedBy?.displayName}</Text>
                                                <Text style={styles.detailTime}>{new Date(activeImage.createdAt).toLocaleDateString()}</Text>
                                            </View>
                                        </View>

                                        {(user?._id === activeImage.uploadedBy?._id || user?.role === 'admin') && (
                                            <TouchableOpacity
                                                style={styles.detailMoreBtn}
                                                onPress={() => {
                                                    Alert.alert('Manage Photo', 'What would you like to do?', [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Edit Details',
                                                            onPress: () => {
                                                                setEditData({
                                                                    title: activeImage.title,
                                                                    description: activeImage.description,
                                                                    category: activeImage.category,
                                                                    clubId: activeImage.clubId?._id || activeImage.clubId || ''
                                                                });
                                                                setEditModalVisible(true);
                                                            }
                                                        },
                                                        {
                                                            text: 'Delete Permanently',
                                                            style: 'destructive',
                                                            onPress: () => handleDeleteGalleryImage(activeImage._id)
                                                        }
                                                    ]);
                                                }}
                                            >
                                                <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                <FlatList
                                    style={{ flex: 1 }}
                                    data={images}
                                    horizontal
                                    pagingEnabled
                                    initialScrollIndex={activeImageIndex}
                                    getItemLayout={(data, index) => (
                                        { length: width, offset: width * index, index }
                                    )}
                                    onMomentumScrollEnd={(e) => {
                                        const index = Math.round(e.nativeEvent.contentOffset.x / width);
                                        setActiveImageIndex(index);
                                        setActiveImage(images[index]);
                                    }}
                                    keyExtractor={item => item._id.toString()}
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item }) => <FullScreenImageItem item={item} toggleLike={toggleLike} user={user} onClose={() => setDetailVisible(false)} />}
                                />

                                <View style={styles.detailBottom}>
                                    <View style={styles.detailActions}>
                                        <TouchableOpacity
                                            style={styles.detailActionBtn}
                                            onPress={() => toggleLike(activeImage._id)}
                                        >
                                            <Ionicons
                                                name={activeImage.likes?.includes(user._id) ? "heart" : "heart-outline"}
                                                size={28}
                                                color={activeImage.likes?.includes(user._id) ? "#EF4444" : "#FFF"}
                                            />
                                            <TouchableOpacity onPress={fetchLikesList}>
                                                <Text style={styles.actionCount}>{activeImage.likes?.length || 0}</Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.detailActionBtn}
                                            onPress={() => setShowComments(!showComments)}
                                        >
                                            <Ionicons name="chatbubble-outline" size={26} color="#FFF" />
                                            <Text style={styles.actionCount}>{activeImage.comments?.length || 0}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.detailTextContent}>
                                        <Text style={styles.detailTitle}>{activeImage.title}</Text>
                                        <Text style={styles.detailDesc}>{activeImage.description}</Text>
                                    </View>

                                    {/* Comments Area */}
                                    {showComments && (
                                        <View style={styles.commentsOverlay}>
                                            <View style={styles.commentsHeader}>
                                                <Text style={styles.commentsTitle}>Comments</Text>
                                                <TouchableOpacity onPress={() => setShowComments(false)}>
                                                    <Ionicons name="chevron-down" size={24} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                            <FlatList
                                                data={activeImage.comments}
                                                keyExtractor={(c, i) => i.toString()}
                                                renderItem={({ item }) => (
                                                    <View style={styles.commentItem}>
                                                        <Image
                                                            source={{
                                                                uri: item.user?.profilePicture?.url ||
                                                                    `https://api.dicebear.com/9.x/notionists/png?seed=${item.user?._id || 'default'}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                                                            }}
                                                            style={styles.commentAvatar}
                                                        />
                                                        <View style={styles.commentInfo}>
                                                            <Text style={styles.commentUser}>{item.user?.displayName || 'Unknown User'}</Text>
                                                            <Text style={styles.commentText}>{item.text}</Text>
                                                            <Text style={styles.commentDate}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                contentContainerStyle={{ paddingBottom: 100 }}
                                            />
                                        </View>
                                    )}

                                    {/* Comment Input */}
                                    <View style={styles.commentInputBox}>
                                        <TextInput
                                            style={styles.commentInput}
                                            placeholder="Add a comment..."
                                            placeholderTextColor="rgba(255,255,255,0.6)"
                                            value={commentText}
                                            onChangeText={setCommentText}
                                        />
                                        <TouchableOpacity onPress={submitComment}>
                                            <Ionicons name="send" size={24} color="#34B7F1" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </Modal>

                {/* Edit Modal */}
                <Modal visible={editModalVisible} animationType="slide" transparent>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setEditModalVisible(false)}
                        >
                            <TouchableOpacity activeOpacity={1} style={styles.uploadCard}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Edit Image Info</Text>
                                    <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                        <Ionicons name="close" size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Title"
                                        value={editData.title}
                                        onChangeText={v => setEditData({ ...editData, title: v })}
                                    />
                                    <TextInput
                                        style={[styles.input, { height: 80, textAlignVertical: 'top', marginTop: 15 }]}
                                        placeholder="Description"
                                        multiline
                                        value={editData.description}
                                        onChangeText={v => setEditData({ ...editData, description: v })}
                                    />

                                    <Text style={styles.label}>Category</Text>
                                    <View style={styles.catGrid}>
                                        {categories.filter(c => c !== 'all').map(cat => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.catChip, editData.category === cat && styles.catActive]}
                                                onPress={() => setEditData({ ...editData, category: cat })}
                                            >
                                                <Text style={[styles.catText, editData.category === cat && styles.catTextActive]}>
                                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.label}>Club (optional)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                                        <TouchableOpacity
                                            style={[styles.catChip, !editData.clubId && styles.catActive]}
                                            onPress={() => setEditData({ ...editData, clubId: '' })}
                                        >
                                            <Text style={[styles.catText, !editData.clubId && styles.catTextActive]}>None</Text>
                                        </TouchableOpacity>
                                        {clubs.map(club => (
                                            <TouchableOpacity
                                                key={club._id}
                                                style={[styles.catChip, editData.clubId === club._id && styles.catActive]}
                                                onPress={() => setEditData({ ...editData, clubId: club._id })}
                                            >
                                                <Text style={[styles.catText, editData.clubId === club._id && styles.catTextActive]}>
                                                    {club.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <TouchableOpacity
                                        style={styles.uploadBtn}
                                        onPress={() => handleUpdateGalleryImage(activeImage._id, editData)}
                                    >
                                        <Text style={styles.uploadBtnText}>Save Changes</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Likes List Modal */}
                <Modal visible={likesListVisible} transparent animationType="slide">
                    <TouchableOpacity
                        style={styles.likedOverlay}
                        activeOpacity={1}
                        onPress={() => setLikesListVisible(false)}
                    >
                        <View style={styles.likedModal}>
                            <View style={styles.likedHeader}>
                                <Text style={styles.likedTitle}>Liked by</Text>
                                <TouchableOpacity onPress={() => setLikesListVisible(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={likedUsers}
                                keyExtractor={item => item._id}
                                renderItem={({ item }) => (
                                    <View style={styles.userListItem}>
                                        <Image source={{ uri: item.profilePicture?.url || 'https://ui-avatars.com/api/?name=' + item.displayName }} style={styles.listAvatar} />
                                        <Text style={styles.listName}>{item.displayName}</Text>
                                        <TouchableOpacity style={styles.listFollowBtn}>
                                            <Text style={styles.listFollowText}>Profile</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View >
        </MainLayout >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    filterSection: {
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
    },
    filterActive: {
        backgroundColor: '#0A66C2',
    },
    filterText: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#FFF',
    },
    clubChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        marginRight: 8,
    },
    clubActive: {
        backgroundColor: '#E8F2FF',
        borderColor: '#0A66C2',
    },
    clubChipText: {
        fontSize: 12,
        color: '#6B7280',
    },
    clubTextActive: {
        color: '#0A66C2',
        fontWeight: '700',
    },
    scrollContent: {
        padding: 10,
    },
    gridContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    column: {
        width: COLUMN_WIDTH,
    },
    card: {
        borderRadius: 16,
        marginBottom: 15,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6', // Lighter loader color
    },
    cardImage: {
        width: '100%',
    },
    cardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        paddingTop: 30,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 6,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    authorAvatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
        marginRight: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    authorName: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
        flex: 1,
    },
    likesCount: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
    },
    likesText: {
        fontSize: 10,
        color: '#FFF',
        marginLeft: 3,
        fontWeight: '700',
    },
    manageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    fab: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    uploadCard: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        maxHeight: '85%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    pickerBox: {
        height: 200,
        backgroundColor: '#F9FAFB',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        overflow: 'hidden',
    },
    pickedImage: {
        width: '100%',
        height: '100%',
    },
    pickerText: {
        color: '#0A66C2',
        fontWeight: '700',
        marginTop: 10,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorBannerText: {
        color: '#B91C1C',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },
    catGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    catChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
        marginBottom: 10,
    },
    catActive: {
        backgroundColor: '#0A66C2',
    },
    catText: {
        fontSize: 12,
        color: '#4B5563',
    },
    catTextActive: {
        color: '#FFF',
        fontWeight: '700',
    },
    uploadBtn: {
        backgroundColor: '#0A66C2',
        height: 55,
        borderRadius: 27.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    btnDisabled: {
        backgroundColor: '#9CA3AF',
    },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    loadingBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyBox: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 15,
    },
    detailContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    detailHeader: {
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
        zIndex: 10,
    },
    detailHeaderRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    detailMoreBtn: {
        padding: 5,
    },
    detailBack: {
        padding: 5,
        marginRight: 10,
    },
    uploaderBox: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    detailAvatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginRight: 10,
    },
    detailAuthor: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    detailTime: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
    },
    fullImgWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    largeHeart: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -30,
        marginTop: -30,
        zIndex: 5,
    },
    detailBottom: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 20,
    },
    detailActions: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    detailActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 25,
    },
    actionCount: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },
    detailTextContent: {
        marginBottom: 20,
    },
    detailTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 5,
    },
    detailDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        lineHeight: 20,
    },
    commentsOverlay: {
        maxHeight: 400,
        backgroundColor: 'rgba(31,41,55,0.95)',
        borderRadius: 20,
        padding: 15,
        marginBottom: 20,
    },
    commentsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 10
    },
    commentsTitle: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 16,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    commentAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    commentInfo: {
        flex: 1,
    },
    commentUser: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
        marginBottom: 2,
    },
    commentText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
    },
    commentDate: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        marginTop: 5,
    },
    commentInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    commentInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
        height: 45,
    },
    likedOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    likedModal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '60%',
        padding: 25,
    },
    likedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    likedTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    userListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    listAvatar: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 15,
    },
    listName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    listFollowBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    listFollowText: {
        color: '#0A66C2',
        fontWeight: '700',
        fontSize: 13,
    },
    uploadBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
});

export default GalleryScreen;
