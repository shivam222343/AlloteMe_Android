import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    ScrollView,
    Image,
    ActivityIndicator,
    Share,
    Clipboard,
    Platform,
    Modal,
    Animated,
    Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainLayout from '../components/MainLayout';
import ConfirmModal from '../components/ConfirmModal';
import EditProfileModal from '../components/EditProfileModal';
import { useAuth } from '../contexts/AuthContext';
import { prepareFile } from '../services/cloudinaryService';
import MediaUploadModal from '../components/MediaUploadModal';
import { useWebUpload } from '../hooks/useWebUpload';


const ProfileScreen = ({ navigation, route }) => {
    const { user, logout, uploadProfilePicture, updateProfile, loading, refreshUser } = useAuth();
    const { startWebUpload } = useWebUpload();
    const shineAnim = useRef(new Animated.Value(-150)).current;


    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shineAnim, {
                    toValue: 150,
                    duration: 3000,
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                    useNativeDriver: true,
                }),
                Animated.delay(1000),
            ])
        ).start();
    }, []);
    const [uploading, setUploading] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [generatedAvatars, setGeneratedAvatars] = useState([]);


    const [selectedStyle, setSelectedStyle] = useState('trending');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const AVATAR_CATEGORIES = [
        { id: 'all', label: '✨ All', icon: 'apps' },
        { id: 'trending', label: '🔥 Trending', icon: 'trending-up' },
        { id: 'anime', label: '🎌 Anime', icon: 'game-controller' },
        { id: 'cartoon', label: '🎨 Cartoon', icon: 'color-palette' },
        { id: 'realistic', label: '👤 Realistic', icon: 'person' },
        { id: 'fun', label: '🎭 Fun', icon: 'happy' },
    ];

    const AVATAR_STYLES = [
        // Trending & Popular
        { id: 'trending', label: '✨ Trending Mix', category: 'trending', description: 'Hot right now!' },
        { id: 'notionists', label: '🎨 Notion Style', category: 'trending', description: 'Clean & modern' },
        { id: 'lorelei', label: '💫 Artistic', category: 'trending', description: 'Unique art style' },

        // Anime & Manga
        { id: 'big-smile', label: '😊 Anime Smile', category: 'anime', description: 'Happy anime vibes' },
        { id: 'adventurer', label: '⚔️ Adventurer', category: 'anime', description: 'RPG character' },
        { id: 'pixel-art', label: '🎮 Pixel Art', category: 'anime', description: 'Retro gaming' },

        // Cartoon & Toon
        { id: 'avataaars', label: '🎭 Classic Toon', category: 'cartoon', description: 'Cartoon style' },
        { id: 'bottts', label: '🤖 Robot', category: 'cartoon', description: 'Futuristic bots' },
        { id: 'croodles', label: '🖍️ Doodle', category: 'cartoon', description: 'Hand-drawn fun' },
        { id: 'fun-emoji', label: '😎 Emoji', category: 'cartoon', description: 'Expressive emojis' },

        // Realistic & Professional
        { id: 'personas', label: '👔 Professional', category: 'realistic', description: 'Business ready' },
        { id: 'micah', label: '🎯 Minimalist', category: 'realistic', description: 'Clean & simple' },
        { id: 'open-peeps', label: '👥 Peeps', category: 'realistic', description: 'Diverse people' },

        // Fun & Creative
        { id: 'miniavs', label: '🎪 Mini', category: 'fun', description: 'Cute & tiny' },
        { id: 'thumbs', label: '👍 Thumbs', category: 'fun', description: 'Thumbs up style' },
        { id: 'rings', label: '💍 Rings', category: 'fun', description: 'Abstract rings' },
        { id: 'shapes', label: '🔷 Shapes', category: 'fun', description: 'Geometric art' },
    ];

    const filteredStyles = selectedCategory === 'all'
        ? AVATAR_STYLES
        : AVATAR_STYLES.filter(style => style.category === selectedCategory);

    useEffect(() => {
        if (showAvatarModal) {
            generateAvatars(selectedStyle);
        }
    }, [showAvatarModal, selectedStyle]);

    useEffect(() => {
        if (route?.params?.editProfile) {
            setShowEditModal(true);
            navigation.setParams({ editProfile: undefined });
        }
    }, [route?.params]);

    // Stable styles for Trending mode to ensure fast loading and no errors
    const SAFE_STYLES = ['notionists', 'adventurer', 'bottts', 'avataaars', 'lorelei', 'micah', 'open-peeps', 'personas', 'big-smile', 'pixel-art', 'croodles'];

    const generateAvatars = (style) => {
        const newAvatars = Array(12).fill(0).map((_, i) => {
            const seed = Math.random().toString(36).substring(7);
            let currentStyle = style;

            if (style === 'trending') {
                currentStyle = SAFE_STYLES[Math.floor(Math.random() * SAFE_STYLES.length)];
            }

            // Add variety with different background colors and options
            const backgrounds = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffdfbf', 'ffd5dc', 'c7ecee', 'ffeaa7', 'dfe6e9'];
            const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];

            return `https://api.dicebear.com/9.x/${currentStyle}/png?seed=${seed}&backgroundColor=${randomBg}&radius=50`;
        });
        setGeneratedAvatars(newAvatars);
    };

    const handleAvatarSelect = async (url) => {
        try {
            setUploading(true);
            setShowAvatarModal(false);

            // For now, we save the URL directly. The backend's updateProfile supports profile fields update 
            // but for profilePicture structure we might need a direct call or update the backend.
            // The existing `uploadProfilePicture` expects a FILE.
            // We can either:
            // 1. Download the image and upload it as a file (Heavy)
            // 2. Just update the user document with this URL directly (Simpler & Faster)

            // Let's assume we can pass a URL to a new endpoint OR assume `uploadProfilePicture` can handle a URL string
            // Actually, `uploadProfilePicture` in `useAuth` calls `/upload-profile-picture` which expects multipart.
            // We should use `updateProfile` in `authController` but it only updates text fields.

            // WORKAROUND: We will download the image -> Blob -> File -> Upload.
            // This ensures it's saved in our Cloudinary/storage consistently and doesn't rely on external API availability forever.

            const response = await fetch(url);
            const blob = await response.blob();
            // Convert blob to file-like object for upload
            const localUri = URL.createObjectURL(blob);
            // Wait, React Native fetch returns blob. `formData.append` needs specific format.

            // Simpler approach for React Native without heavy blob polyfills:
            // Just update the user profile URL directly in the database.
            // We need a route for "setProfilePictureUrl". 
            // Or we just abuse `updateProfile`? It updates `displayName` etc.
            // Let's modify `updateProfile` in backend to accept `profilePictureUrl` if we want to be clean.
            // OR, just send it as a "display name" update? No.

            // Let's try downloading and uploading as a file:
            // On mobile, `fetch(url)` works.
            // But honestly, for "AI Generated", storing the URL string is efficient.
            // I'll update the backend `updateProfile` to accept `profilePictureUrl`.

            // Wait, I can't easily change backend right now without breaking flow. 
            // Let's assume we implement `handleAvatarSelect` by calling a new prompt to the backend? 
            // Better: I will use `updateProfile` and send `avatarUrl`.
        } catch (error) {
            console.error(error);
        }
    };

    const pickImage = async () => {
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            alert('Sorry, we need camera roll permissions to make this work!');
            return;
        }

        // Pick image
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3,
            base64: true, // Enable base64 for Android
        });

        if (!result.canceled) {
            setSelectedAsset(result.assets[0]);
            setShowImageModal(true);
        }
    };

    const handleWebUploadFlow = async () => {
        const result = await startWebUpload({ type: 'profile' });
        if (result.success && result.url) {
            // Update profile with the URL received from web upload
            const updateResult = await updateProfile({
                profilePictureUrl: result.url
                // Backend will handle saving this to profilePicture and history
            });

            if (updateResult.success) {
                await refreshUser();
            } else {
                alert(updateResult.message || 'Failed to update profile picture');
            }
        } else if (result.message && result.message !== 'Upload cancelled or failed' && result.message !== 'Upload cancelled') {
            alert(result.message);
        }
    };


    const confirmAvatarSelection = async (url) => {
        try {
            setUploading(true);
            setShowAvatarModal(false);

            // Call updateProfile with the new URL
            const result = await updateProfile({
                profilePictureUrl: url
            });

            if (result.success) {
                // Success - UI will update via context
            } else {
                alert(result.message || 'Failed to update avatar');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update avatar');
        } finally {
            setUploading(false);
        }
    };

    // ... existing handleImageUpload ...
    const handleImageUpload = async (asset) => {
        try {
            setUploading(true);

            // Use base64 for Android compatibility
            const base64Img = asset.base64
                ? `data:image/jpeg;base64,${asset.base64}`
                : asset.uri;

            console.log('Uploading profile picture with base64');

            // Upload via useAuth hook with base64
            const result = await uploadProfilePicture({ image: base64Img });

            if (!result.success) {
                alert(result.message || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            // App.js will automatically switch to Login stack
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const isBirthday = React.useMemo(() => {
        if (!user?.birthDate) return false;
        const bday = new Date(user.birthDate);
        const today = new Date();
        return bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
    }, [user?.birthDate]);

    if (loading) {
        return (
            <MainLayout navigation={navigation} title="Profile">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0A66C2" />
                </View>
            </MainLayout>
        );
    }

    return (
        <MainLayout navigation={navigation} currentRoute="Profile" title="Profile" transparentNavbar={false}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* Header Section */}
                <View style={styles.header}>
                    {user?.preferences?.sidebarBanner ? (
                        <>
                            <Image
                                source={
                                    user.preferences.sidebarBanner.startsWith('http')
                                        ? { uri: user.preferences.sidebarBanner }
                                        : (
                                            user.preferences.sidebarBanner === 'local-banner-1' ? require('../../assets/banners/blue_geometric.png') :
                                                user.preferences.sidebarBanner === 'local-banner-2' ? require('../../assets/banners/blue_abstract.png') :
                                                    user.preferences.sidebarBanner === 'local-banner-3' ? require('../../assets/banners/blue_shapes.png') :
                                                        user.preferences.sidebarBanner === 'local-banner-4' ? require('../../assets/banners/blue_cloud.png') :
                                                            { uri: user.preferences.sidebarBanner }
                                        )
                                }
                                style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                                resizeMode="cover"
                            />
                            <View style={styles.headerOverlay} />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.7)']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                            />
                        </>
                    ) : (
                        <LinearGradient
                            colors={['#0A66C2', '#0E76A8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    )}

                    <View style={styles.profileImageContainer}>
                        <Image
                            source={{
                                uri: user?.profilePicture?.url
                                    ? user.profilePicture.url
                                    : `https://api.dicebear.com/9.x/notionists/png?seed=${user?._id || 'random'}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                            }}
                            style={styles.profileImage}
                        />
                        {/* Magic AI Avatar Button - Positioned Left */}
                        <TouchableOpacity
                            style={[styles.cameraButton, { right: undefined, left: 0 }]}
                            onPress={() => setShowAvatarModal(true)}
                            disabled={uploading}
                        >
                            <Ionicons name="color-wand" size={20} color="#7C3AED" />
                        </TouchableOpacity>

                        {/* Gallery Upload Button - Positioned Right */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.cameraButton,
                                { transform: [{ scale: pressed ? 0.9 : 1 }], opacity: pressed ? 0.9 : 1 }
                            ]}
                            onPress={() => setShowUploadModal(true)}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="#0A66C2" />
                            ) : (
                                <Ionicons name="camera" size={20} color="#0A66C2" />
                            )}
                        </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                        {isBirthday && (
                            <Ionicons name="gift" size={20} color="#EC4899" style={{ marginLeft: 8 }} />
                        )}
                    </View>
                    <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>

                    {/* Banner Edit Button */}
                    <TouchableOpacity
                        style={styles.bannerEditButton}
                        onPress={() => navigation.navigate('Settings', { openBannerModal: true })}
                    >
                        <Ionicons name="image-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.bannerEditText}>Edit Banner</Text>
                    </TouchableOpacity>
                </View>

                {/* Maverick ID Badge - Outside Header */}
                {user?.maverickId && (
                    <View style={styles.idBadgeContainer}>
                        <LinearGradient
                            colors={['#0EA5E9', '#0284C7', '#0369A1', '#075985']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.idBadge}
                        >
                            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.idText}>{user.maverickId}</Text>

                            <Animated.View
                                style={[
                                    styles.shineEffect,
                                    {
                                        transform: [
                                            { translateX: shineAnim },
                                            { skewX: '-20deg' }
                                        ]
                                    }
                                ]}
                            >
                                <LinearGradient
                                    colors={['transparent', 'rgba(255, 255, 255, 0.9)', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            </Animated.View>
                        </LinearGradient>
                    </View>
                )}

                <View style={styles.body}>
                    {/* Personal Info Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Personal Information</Text>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => setShowEditModal(true)}
                            >
                                <Ionicons name="create-outline" size={20} color="#0A66C2" />
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="person-outline" size={20} color="#0A66C2" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Full Name</Text>
                                <Text style={styles.infoValue}>{user?.displayName}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="mail-outline" size={20} color="#0A66C2" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Email Address</Text>
                                <Text style={styles.infoValue}>{user?.email}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="call-outline" size={20} color="#0A66C2" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Phone Number</Text>
                                <Text style={styles.infoValue}>{user?.phoneNumber || 'Not set'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="id-card-outline" size={20} color="#0A66C2" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Maverick ID</Text>
                                <Text style={styles.infoValue}>{user?.maverickId}</Text>
                                <Text style={styles.infoHint}>Use this ID to join clubs</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="cake-outline" size={20} color="#0A66C2" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Birth Date</Text>
                                <Text style={styles.infoValue}>
                                    {user?.birthDate
                                        ? new Date(user.birthDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : 'Not set'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="school-outline" size={20} color="#0A66C2" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Branch</Text>
                                <Text style={styles.infoValue}>{user?.branch || 'Not set'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#0A66C2" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Passout Year</Text>
                                <Text style={styles.infoValue}>{user?.passoutYear || 'Not set'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Club Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Club Information</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{user?.clubsJoined?.length || 0}</Text>
                                <Text style={styles.statLabel}>Clubs Joined</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                                </Text>
                                <Text style={styles.statLabel}>Global Role</Text>
                            </View>
                        </View>
                    </View>

                    {/* Account Actions */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowEditModal(true)}
                    >
                        <Ionicons name="create-outline" size={22} color="#4B5563" />
                        <Text style={styles.actionButtonText}>Edit Profile</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('Settings', { openChangePassword: true })}
                    >
                        <Ionicons name="lock-closed-outline" size={22} color="#4B5563" />
                        <Text style={styles.actionButtonText}>Change Password</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Ionicons name="settings-outline" size={22} color="#4B5563" />
                        <Text style={styles.actionButtonText}>Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity onPress={() => setShowLogoutModal(true)} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </View>

                {/* Logout Confirmation Modal */}
                <ConfirmModal
                    visible={showLogoutModal}
                    onClose={() => setShowLogoutModal(false)}
                    onConfirm={handleLogout}
                    title="Logout"
                    message="Are you sure you want to logout?"
                    confirmText="Logout"
                    cancelText="Cancel"
                    type="danger"
                />

                {/* Edit Profile Modal */}
                <EditProfileModal
                    visible={showEditModal}
                    onClose={() => setShowEditModal(false)}
                />

                <MediaUploadModal
                    visible={showUploadModal}
                    onClose={() => setShowUploadModal(false)}
                    onNativePick={pickImage}
                    onWebUpload={handleWebUploadFlow}
                    title="Update Profile Photo"
                />


                {/* Profile Image Confirmation Modal */}
                <ConfirmModal
                    visible={showImageModal}
                    onClose={() => setShowImageModal(false)}
                    onConfirm={() => handleImageUpload(selectedAsset)}
                    title="Update Profile Picture"
                    message="Are you sure you want to change your profile picture?"
                    confirmText="Upload"
                    cancelText="Cancel"
                    type="info"
                />

                {/* Avatar Selection Modal */}
                <Modal
                    visible={showAvatarModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAvatarModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>🎨 AI Avatar Generator</Text>
                                <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                                    <Ionicons name="close" size={24} color="#374151" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalSubtitle}>Create your unique avatar with trending AI styles!</Text>

                            {/* Category Tabs */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.categoryScroll}
                                contentContainerStyle={styles.categoryContainer}
                            >
                                {AVATAR_CATEGORIES.map((category) => (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[styles.categoryTab, selectedCategory === category.id && styles.categoryTabActive]}
                                        onPress={() => setSelectedCategory(category.id)}
                                    >
                                        <Text style={[styles.categoryTabText, selectedCategory === category.id && styles.categoryTabTextActive]}>
                                            {category.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Style Cards */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.filterScroll}
                                contentContainerStyle={styles.filterContainer}
                            >
                                {filteredStyles.map((style) => (
                                    <TouchableOpacity
                                        key={style.id}
                                        style={[styles.styleCard, selectedStyle === style.id && styles.styleCardActive]}
                                        onPress={() => setSelectedStyle(style.id)}
                                    >
                                        <Text style={[styles.styleCardLabel, selectedStyle === style.id && styles.styleCardLabelActive]}>
                                            {style.label}
                                        </Text>
                                        <Text style={[styles.styleCardDesc, selectedStyle === style.id && styles.styleCardDescActive]}>
                                            {style.description}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <ScrollView style={styles.avatarScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.avatarGrid}>
                                    {generatedAvatars.map((url, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.avatarItem}
                                            onPress={() => confirmAvatarSelection(url)}
                                        >
                                            <Image source={{ uri: url }} style={styles.avatarImage} />
                                            <View style={styles.avatarOverlay}>
                                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={() => generateAvatars(selectedStyle)}
                            >
                                <Ionicons name="refresh" size={20} color="#FFF" />
                                <Text style={styles.refreshButtonText}>Generate New</Text>
                            </TouchableOpacity>

                            {/* Past Avatars Section */}
                            {user?.profilePictureHistory && user.profilePictureHistory.length > 0 && (
                                <View style={styles.historySection}>
                                    <Text style={[styles.modalSubtitle, { marginTop: 20 }]}>Recently Used</Text>
                                    <View style={styles.avatarGrid}>
                                        {user.profilePictureHistory.slice(0, 3).map((historyItem, index) => (
                                            <TouchableOpacity
                                                key={`hist-${index}`}
                                                style={styles.avatarItem}
                                                onPress={() => confirmAvatarSelection(historyItem.url)}
                                            >
                                                <Image source={{ uri: historyItem.url }} style={styles.avatarImage} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </MainLayout >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    contentContainer: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 24,
        backgroundColor: '#0A66C2', // Fallback
        overflow: 'hidden',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)', // Darker, more professional overlay
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    placeholderImage: {
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#E0F2FE',
        marginBottom: 16,
    },
    idBadgeContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        marginTop: -16,
        marginBottom: 24,
        alignSelf: 'center',
    },
    idBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#BAE6FD',
        position: 'relative',
        overflow: 'hidden',
    },
    idText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    shineEffect: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 100,
    },
    bannerEditButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    bannerEditText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    body: {
        paddingHorizontal: 20,
        marginTop: 0,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0A66C2',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    infoHint: {
        fontSize: 11,
        color: '#059669',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 16,
        marginLeft: 56,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0A66C2',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#F3F4F6',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    actionButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
        marginLeft: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
        marginLeft: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    avatarItem: {
        width: '30%',
        aspectRatio: 1,
        marginBottom: 15,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
        padding: 12,
        borderRadius: 12,
    },
    refreshButtonText: {
        color: '#FFF',
        fontWeight: '600',
        marginLeft: 8,
    },
    // Filter Styles
    categoryScroll: {
        maxHeight: 50,
        marginBottom: 12,
    },
    categoryContainer: {
        paddingHorizontal: 4,
        gap: 8,
    },
    categoryTab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        marginRight: 8,
    },
    categoryTabActive: {
        backgroundColor: '#7C3AED',
        borderColor: '#7C3AED',
    },
    categoryTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4B5563',
    },
    categoryTabTextActive: {
        color: '#FFF',
    },
    filterScroll: {
        maxHeight: 90,
        marginBottom: 16,
    },
    filterContainer: {
        paddingHorizontal: 4,
        gap: 10,
    },
    styleCard: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        marginRight: 10,
        minWidth: 140,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    styleCardActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#0A66C2',
        shadowColor: '#0A66C2',
        shadowOpacity: 0.2,
    },
    styleCardLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    styleCardLabelActive: {
        color: '#0A66C2',
    },
    styleCardDesc: {
        fontSize: 11,
        color: '#6B7280',
    },
    styleCardDescActive: {
        color: '#3B82F6',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
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
    avatarOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0,
    },
    avatarScroll: {
        maxHeight: 300, // Limit height to allow scrolling within modal
    },
    historySection: {
        marginTop: 10,
        marginBottom: 10,
        width: '100%',
    },
});

export default ProfileScreen;
