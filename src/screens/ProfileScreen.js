import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainLayout from '../components/MainLayout';
import ConfirmModal from '../components/ConfirmModal';
import EditProfileModal from '../components/EditProfileModal';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen = ({ navigation }) => {
    const { user, logout, uploadProfilePicture, loading } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);

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

    const handleImageUpload = async (asset) => {
        try {
            setUploading(true);

            // Create form data
            const formData = new FormData();

            if (Platform.OS === 'web') {
                // For web, we need to fetch the uri and convert to blob
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                // Create a File object from the blob to ensure correct mimetype and filename
                const file = new File([blob], 'profile-image.jpg', { type: blob.type || 'image/jpeg' });
                formData.append('image', file);
            } else {
                // For mobile
                formData.append('image', {
                    uri: asset.uri,
                    type: asset.mimeType || 'image/jpeg',
                    name: asset.fileName || `profile_${Date.now()}.jpg`,
                });
            }

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
        <MainLayout navigation={navigation} currentRoute="Profile" title="Profile">
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* Header Section */}
                <LinearGradient
                    colors={['#0A66C2', '#0E76A8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.profileImageContainer}>
                        {user?.profilePicture?.url ? (
                            <Image source={{ uri: user.profilePicture.url }} style={styles.profileImage} />
                        ) : (
                            <View style={[styles.profileImage, styles.placeholderImage]}>
                                <Ionicons name="person" size={40} color="#9CA3AF" />
                            </View>
                        )}
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

                    <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>

                    {user?.maverickId && (
                        <View style={styles.idBadge}>
                            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.idText}>{user.maverickId}</Text>
                        </View>
                    )}
                </LinearGradient>

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
            </ScrollView>
        </MainLayout>
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
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
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
        padding: 8,
        borderRadius: 20,
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
    idBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    idText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: 0.5,
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
});

export default ProfileScreen;
