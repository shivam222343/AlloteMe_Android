import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
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

const ProfileScreen = ({ navigation }) => {
    const { user, logout, uploadProfilePicture, updateProfile, loading } = useAuth();
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
    const [generatedAvatars, setGeneratedAvatars] = useState([]);

    const [selectedStyle, setSelectedStyle] = useState('mixed');

    const AVATAR_STYLES = [
        { id: 'mixed', label: 'Mixed' },
        { id: 'notionists', label: 'Sketch' },
        { id: 'adventurer', label: 'Adventurer' },
        { id: 'bottts', label: 'Robots' },
        { id: 'avataaars', label: 'Toon' },
        { id: 'lorelei', label: 'Artistic' },
        { id: 'fun-emoji', label: 'Emoji' },
        { id: 'micah', label: 'Minimalist' },
        { id: 'miniavs', label: 'Mini' },
        { id: 'open-peeps', label: 'Peeps' },
        { id: 'personas', label: 'Persona' }
    ];

    useEffect(() => {
        if (showAvatarModal) {
            generateAvatars(selectedStyle);
        }
    }, [showAvatarModal, selectedStyle]);

    // Stable styles for Mixed mode to ensure fast loading and no errors
    const SAFE_STYLES = ['notionists', 'adventurer', 'bottts', 'avataaars', 'lorelei', 'micah', 'open-peeps', 'personas'];

    const generateAvatars = (style) => {
        const newAvatars = Array(12).fill(0).map((_, i) => {
            const seed = Math.random().toString(36).substring(7);
            let currentStyle = style;

            if (style === 'mixed') {
                currentStyle = SAFE_STYLES[Math.floor(Math.random() * SAFE_STYLES.length)];
            }

            return `https://api.dicebear.com/9.x/${currentStyle}/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf`;
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
            quality: 0.5,
        });

        if (!result.canceled) {
            setSelectedAsset(result.assets[0]);
            setShowImageModal(true);
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

            // Create form data
            const formData = new FormData();

            // Prepare file using centralized service

            // Prepare file using centralized service
            const file = await prepareFile(asset.uri);
            formData.append('image', file);

            // Upload via useAuth hook
            const result = await uploadProfilePicture(formData);

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
                        <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={pickImage}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="#0A66C2" />
                            ) : (
                                <Ionicons name="camera" size={20} color="#0A66C2" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                        {isBirthday && (
                            <Ionicons name="gift" size={20} color="#EC4899" style={{ marginLeft: 8 }} />
                        )}
                    </View>
                    <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>

                    {user?.maverickId && (
                        <View style={styles.idBadgeContainer}>
                            <LinearGradient
                                colors={['#94A3B8', '#F8FAFC', '#94A3B8', '#CBD5E1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.idBadge}
                            >
                                <Ionicons name="shield-checkmark" size={14} color="#0A66C2" style={{ marginRight: 6 }} />
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
                                        colors={['transparent', 'rgba(255, 255, 255, 0.8)', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>
                            </LinearGradient>
                        </View>
                    )}

                    {/* Banner Edit Button */} // Positioned relative to header
                    <TouchableOpacity
                        style={styles.bannerEditButton}
                        onPress={() => navigation.navigate('Settings', { openBannerModal: true })}
                    >
                        <Ionicons name="image-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.bannerEditText}>Edit Banner</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.body}>
                    {/* Personal Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Personal Information</Text>

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
                                <Text style={styles.modalTitle}>Choose AI Avatar</Text>
                                <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                                    <Ionicons name="close" size={24} color="#374151" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalSubtitle}>Pick a style to generate your unique avatar!</Text>

                            {/* Style Filters */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.filterScroll}
                                contentContainerStyle={styles.filterContainer}
                            >
                                {AVATAR_STYLES.map((style) => (
                                    <TouchableOpacity
                                        key={style.id}
                                        style={[styles.filterChip, selectedStyle === style.id && styles.filterChipActive]}
                                        onPress={() => setSelectedStyle(style.id)}
                                    >
                                        <Text style={[styles.filterChipText, selectedStyle === style.id && styles.filterChipTextActive]}>
                                            {style.label}
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
        paddingBottom: 60,
        backgroundColor: '#0A66C2', // Fallback
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        minHeight: 220, // Ensure banner is always substantial
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
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginBottom: 16,
    },
    idBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#CBD5E1', // Silver border
        position: 'relative',
        overflow: 'hidden',
    },
    idText: {
        color: '#1E293B',
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: 1,
        textShadowColor: 'rgba(255, 255, 255, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    shineEffect: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 80,
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
        marginTop: -40,
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
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 20,
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
    filterScroll: {
        maxHeight: 50,
        marginBottom: 16,
    },
    filterContainer: {
        paddingHorizontal: 4,
        gap: 8,
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
