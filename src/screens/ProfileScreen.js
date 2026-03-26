import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, Modal, FlatList, Linking, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { Colors, Spacing, Shadows, BorderRadius } from '../constants/theme';
import GradientBorder from '../components/ui/GradientBorder';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Edit2, Mail, MapPin, Award, BookOpen, LogOut, Hash, Target, RefreshCw, Bot, Check, X, Image as ImageIcon, Settings, Phone } from 'lucide-react-native';
import { authAPI, uploadAPI } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const ProfileScreen = ({ navigation }) => {
    const { user, logout, refreshUser } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [galleryAvatars, setGalleryAvatars] = useState([]);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [newGroqKey, setNewGroqKey] = useState(user?.groqApiKey || '');
    const [keyUpdating, setKeyUpdating] = useState(false);
    const [bannerPreview, setBannerPreview] = useState(null);
    const [profilePreview, setProfilePreview] = useState(null);

    const pickImage = async (type = 'profile') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'profile' ? [1, 1] : [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            if (type === 'banner') setBannerPreview(uri);
            else setProfilePreview(uri);
            handleUpload(uri, type);
        }
    };

    const handleUpload = async (uri, type) => {
        setUploading(true);
        try {
            const formData = new FormData();
            const fileName = uri.split('/').pop();

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('image', blob, fileName);
            } else {
                const fileExt = fileName.split('.').pop();
                formData.append('image', {
                    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                    name: fileName,
                    type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                });
            }

            const res = await uploadAPI.upload(formData);
            const imageUrl = res.data.url;

            if (type === 'profile') {
                await authAPI.updateProfile({
                    preferences: {
                        ...user.preferences,
                        avatarUrl: imageUrl,
                        avatarSeed: null // Clear seed if using custom image
                    }
                });
            } else {
                await authAPI.updateProfile({ bannerUrl: imageUrl });
            }

            await refreshUser();
            Alert.alert('Success', `${type === 'profile' ? 'Profile' : 'Banner'} image updated!`);
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateAvatar = async (url, seed) => {
        setAvatarLoading(true);
        try {
            await authAPI.updateProfile({
                preferences: {
                    ...user.preferences,
                    avatarUrl: url,
                    avatarSeed: seed
                }
            });
            await refreshUser();
            Alert.alert('Success', 'AI Avatar updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update avatar');
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleUpdateApiKey = async () => {
        setKeyUpdating(true);
        try {
            await authAPI.updateProfile({ groqApiKey: newGroqKey });
            await refreshUser();
            setShowKeyModal(false);
            Alert.alert('Success', 'Groq API Key updated! Personal key will now be prioritized.');
        } catch (error) {
            Alert.alert('Error', 'Failed to update API key');
        } finally {
            setKeyUpdating(false);
        }
    };

    const openGallery = () => {
        const categories = ['bottts', 'avataaars', 'identities', 'pixel-art', 'adventurer', 'open-peeps', 'lorelei', 'fun-emoji'];
        const newAvatars = [];
        for (let i = 0; i < 12; i++) {
            const category = categories[i % categories.length];
            const seed = Math.random().toString(36).substring(7);
            newAvatars.push({
                url: `https://api.dicebear.com/9.x/${category}/png?seed=${seed}&backgroundColor=c7ecee&radius=50`,
                seed,
                category
            });
        }
        setGalleryAvatars(newAvatars);
        setShowGallery(true);
    };

    const selectAvatar = (avatar) => {
        handleUpdateAvatar(avatar.url, avatar.seed);
        setShowGallery(false);
    };

    const InfoRow = ({ icon: Icon, label, value }) => (
        <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
                <Icon size={18} color={Colors.primary} />
            </View>
            <View>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Not set'}</Text>
            </View>
        </View>
    );

    const bannerAssets = {
        'local-banner-1': require('../../assets/banners/blue_geometric.png'),
        'local-banner-2': require('../../assets/banners/blue_abstract.png'),
        'local-banner-3': require('../../assets/banners/blue_shapes.png'),
        'local-banner-4': require('../../assets/banners/blue_cloud.png'),
    };

    return (
        <MainLayout showHeader={false} noPadding>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Banner & Profile Section */}
                <View style={styles.headerSection}>
                    <View style={styles.banner}>
                        <Image
                            key={user?.bannerUrl || bannerPreview}
                            source={
                                bannerPreview
                                    ? { uri: bannerPreview }
                                    : (user?.bannerUrl && bannerAssets[user.bannerUrl]
                                        ? bannerAssets[user.bannerUrl]
                                        : { uri: user?.bannerUrl || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000' })
                            }
                            style={styles.bannerImg}
                        />
                        <TouchableOpacity
                            style={styles.bannerEditBtn}
                            onPress={() => pickImage('banner')}
                            disabled={uploading}
                        >
                            <Edit2 size={16} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.profileInfo}>
                        <GradientBorder size={120} borderWidth={4}>
                            <View style={styles.avatarWrapper}>
                                <Image
                                    key={user?.preferences?.avatarUrl || profilePreview}
                                    source={{ uri: profilePreview || user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=6366f1&color=fff&size=200` }}
                                    style={styles.avatarImg}
                                />
                                {uploading && (
                                    <View style={styles.uploadOverlay}>
                                        <ActivityIndicator size="small" color="#FFF" />
                                    </View>
                                )}
                            </View>
                        </GradientBorder>
                        <TouchableOpacity
                            style={styles.cameraBtn}
                            onPress={() => pickImage('profile')}
                            disabled={uploading}
                        >
                            <Camera size={16} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.name}>{user?.displayName}</Text>
                        <Text style={styles.roleText}>{user?.role?.toUpperCase()} • AlloteMe User</Text>
                    </View>
                </View>

                {/* Stats / Quick Info */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>{user?.percentile || '0.0'}%</Text>
                        <Text style={styles.statLab}>Percentile</Text>
                    </View>
                    <View style={[styles.statItem, styles.statBorder]}>
                        <Text style={styles.statVal}>{user?.savedColleges?.length || 0}</Text>
                        <Text style={styles.statLab}>Saved</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>{user?.rank || 'N/A'}</Text>
                        <Text style={styles.statLab}>Rank</Text>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Academic Details</Text>
                    <Card style={styles.card}>
                        <InfoRow icon={Award} label="Primary Exam" value={user?.examType || 'MHTCET'} />
                        <InfoRow icon={Hash} label="Percentile" value={user?.percentile} />
                        <InfoRow icon={Target} label="Rank" value={user?.rank} />
                        <InfoRow icon={MapPin} label="Location" value={user?.location} />
                        <InfoRow icon={Phone} label="Contact Number" value={user?.phoneNumber} />
                        <InfoRow icon={BookOpen} label="Expected Region" value={user?.expectedRegion} />
                        <TouchableOpacity style={styles.apiKeyRow} onPress={() => setShowKeyModal(true)}>
                            <InfoRow
                                icon={Bot}
                                label="Groq API Key"
                                value={user?.groqApiKey ? '••••••••' + user.groqApiKey.slice(-4) : 'Not Configured (Using System)'}
                            />
                            <Edit2 size={14} color={Colors.primary} />
                        </TouchableOpacity>
                    </Card>
                </View>

                {/* AI Avatar Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI Avatar Assistant</Text>
                    <Card style={styles.avatarCard}>
                        <View style={styles.avatarGenRow}>
                            <View style={styles.avatarPreviewBox}>
                                <GradientBorder size={64} borderWidth={3}>
                                    <Image
                                        source={{ uri: `https://api.dicebear.com/9.x/bottts/png?seed=${user?.preferences?.avatarSeed || 'default'}&backgroundColor=c7ecee&radius=50` }}
                                        style={styles.smallAvatar}
                                    />
                                </GradientBorder>
                            </View>
                            <View style={styles.avatarGenInfo}>
                                <Text style={styles.avatarGenTitle}>Unique AI Identity</Text>
                                <Text style={styles.avatarGenSub}>Generate a personalized robot avatar for your profile.</Text>
                                <TouchableOpacity
                                    style={styles.genBtn}
                                    onPress={openGallery}
                                    disabled={avatarLoading}
                                >
                                    <Bot size={14} color={Colors.white} />
                                    <Text style={styles.genBtnText}>{avatarLoading ? 'Updating...' : 'Choose AI Avatar'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={styles.section}>
                    <Button
                        title="Edit Profile"
                        variant="outline"
                        icon={Edit2}
                        onPress={() => navigation.navigate('CompleteProfile')}
                        style={styles.editBtn}
                    />
                    <TouchableOpacity
                        style={styles.settingsBtn}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Settings size={20} color={Colors.primary} />
                        <Text style={styles.settingsText}>App Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <LogOut size={20} color={Colors.error} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Avatar Gallery Modal */}
            <Modal
                visible={showGallery}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowGallery(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>AI Avatar Gallery</Text>
                                <Text style={styles.modalSub}>Select your favorite identity</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowGallery(false)} style={styles.closeBtn}>
                                <X size={20} color={Colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        {avatarLoading ? (
                            <View style={styles.loaderBox}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                                <Text style={styles.loaderText}>Updating your profile...</Text>
                            </View>
                        ) : (
                            <View style={styles.gridContainer}>
                                {galleryAvatars.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.galleryItem}
                                        onPress={() => selectAvatar(item)}
                                    >
                                        <GradientBorder size={80} borderWidth={2}>
                                            <Image source={{ uri: item.url }} style={styles.galleryImg} />
                                        </GradientBorder>
                                        <Text style={styles.categoryLabel}>{item.category}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <Button
                            title="Refresh Options"
                            variant="outline"
                            icon={RefreshCw}
                            onPress={openGallery}
                            style={styles.refreshModalBtn}
                        />
                    </View>
                </View>
            </Modal>

            {/* API Key Modal */}
            <Modal
                visible={showKeyModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowKeyModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.centeredModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Groq API Key</Text>
                            <TouchableOpacity onPress={() => setShowKeyModal(false)}>
                                <X size={20} color={Colors.text.tertiary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.keyInfoText}>
                            Your personal key avoids service interruptions. Keys are stored securely and never shared.
                        </Text>

                        <View style={styles.guideBox}>
                            <Text style={styles.guideTitle}>How to get your key:</Text>
                            <Text style={styles.guideStep}>1. Visit Groq Console</Text>
                            <Text style={styles.guideStep}>2. Click "API Keys" in sidebar</Text>
                            <Text style={styles.guideStep}>3. Create and Copy a new key</Text>

                            <TouchableOpacity
                                style={styles.webLink}
                                onPress={() => Linking.openURL('https://console.groq.com/keys')}
                            >
                                <Text style={styles.webLinkText}>Go to Groq Console</Text>
                                <ImageIcon size={14} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Bot size={18} color={Colors.primary} style={styles.inputIcon} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.miniLabel}>Groq API Key</Text>
                                <Input
                                    value={newGroqKey}
                                    onChangeText={setNewGroqKey}
                                    placeholder="gsk_..."
                                    secureTextEntry={true}
                                    containerStyle={{ marginBottom: 0 }}
                                />
                            </View>
                        </View>

                        <Button
                            title="Save API Key"
                            onPress={handleUpdateApiKey}
                            loading={keyUpdating}
                            style={styles.saveKeyBtn}
                        />

                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={async () => {
                                setNewGroqKey('');
                                try {
                                    await authAPI.updateProfile({ groqApiKey: null });
                                    await refreshUser();
                                    setShowKeyModal(false);
                                    Alert.alert('Success', 'Personal API key removed.');
                                } catch (e) {
                                    Alert.alert('Error', 'Failed to remove key');
                                }
                            }}
                        >
                            <Text style={styles.removeText}>Remove Key (Use System Default)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    headerSection: { height: 280 },
    banner: { height: 160, width: '100%', overflow: 'hidden', position: 'relative' },
    bannerImg: { width: '100%', height: '100%' },
    bannerEditBtn: {
        position: 'absolute',
        bottom: 70,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    profileInfo: { alignItems: 'center', marginTop: -60 },
    avatarWrapper: { width: '100%', height: '100%', position: 'relative' },
    avatarImg: { width: '100%', height: '100%' },
    uploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 60
    },
    cameraBtn: {
        marginTop: -32, marginLeft: 80,
        backgroundColor: Colors.primary, width: 32, height: 32,
        borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white,
        zIndex: 10
    },
    name: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary, marginTop: 16 },
    roleText: { fontSize: 12, fontWeight: '600', color: Colors.primary, letterSpacing: 0.5, marginTop: 4 },
    statsRow: {
        flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: 16,
        marginTop: 20, borderRadius: 16, padding: 20, ...Shadows.sm, borderWidth: 1, borderColor: Colors.divider
    },
    statItem: { flex: 1, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.divider },
    statVal: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    statLab: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },
    section: { paddingVertical: 20, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 16 },
    card: { padding: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 16 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
    infoLabel: { fontSize: 12, color: Colors.text.tertiary },
    infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary },
    editBtn: { marginBottom: 12 },
    avatarCard: { padding: 16, borderLeftWidth: 4, borderLeftColor: Colors.primary },
    avatarGenRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarPreviewBox: { width: 64, height: 64 },
    smallAvatar: { width: '100%', height: '100%' },
    avatarGenInfo: { flex: 1 },
    avatarGenTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text.primary },
    avatarGenSub: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2, marginBottom: 8 },
    genBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
    genBtnText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
    rotating: { opacity: 0.5 },
    logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16 },
    logoutText: { color: Colors.error, fontWeight: 'bold' },
    settingsBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.divider,
        marginBottom: 12,
        backgroundColor: Colors.white
    },
    settingsText: { color: Colors.primary, fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    modalSub: { fontSize: 13, color: Colors.text.tertiary, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.divider, justifyContent: 'center', alignItems: 'center' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
    galleryItem: { width: '30%', alignItems: 'center', marginBottom: 8 },
    galleryImg: { width: '100%', height: '100%' },
    categoryLabel: { fontSize: 10, color: Colors.text.tertiary, marginTop: 6, textTransform: 'capitalize' },
    loaderBox: { padding: 40, alignItems: 'center', gap: 16 },
    loaderText: { fontSize: 14, color: Colors.text.secondary },
    refreshModalBtn: { marginBottom: 12 },
    apiKeyRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
    centeredModal: {
        backgroundColor: Colors.white,
        margin: 20,
        borderRadius: 24,
        padding: 24,
        width: '90%',
        alignSelf: 'center',
        marginBottom: 'auto',
        marginTop: 'auto'
    },
    keyInfoText: { fontSize: 13, color: Colors.text.tertiary, marginBottom: 20, lineHeight: 18 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 20
    },
    inputIcon: { marginRight: 12 },
    miniLabel: { fontSize: 10, fontWeight: 'bold', color: Colors.primary, marginBottom: 2, textTransform: 'uppercase' },
    saveKeyBtn: { marginTop: 8 },
    removeBtn: { marginTop: 16, alignItems: 'center' },
    removeText: { color: Colors.error, fontSize: 12, fontWeight: '600' },

    // Guide Styles
    guideBox: {
        backgroundColor: Colors.background,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.divider
    },
    guideTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 10 },
    guideStep: { fontSize: 12, color: Colors.text.secondary, marginBottom: 4 },
    webLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.divider
    },
    webLinkText: { fontSize: 13, fontWeight: '600', color: Colors.primary }
});

export default ProfileScreen;
