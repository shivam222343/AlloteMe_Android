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

const ProfileScreen = ({ navigation, route }) => {
    const { user, logout, refreshUser } = useAuth();
    const [uploading, setUploading] = useState(null); // 'profile' or 'banner' or null
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [galleryAvatars, setGalleryAvatars] = useState([]);
    const [bannerPreview, setBannerPreview] = useState(null);
    const [profilePreview, setProfilePreview] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            setIsLoggingOut(false);
        }
    };

    React.useEffect(() => {
        refreshAvatarOptions();
    }, []);

    React.useEffect(() => {
        if (route.params?.autoOpenEdit) {
            const path = route.params?.admissionPath;
            navigation.setParams({ autoOpenEdit: null, admissionPath: null }); // Clear it to avoid loop
            navigation.navigate('CompleteProfile', { admissionPath: path });
        }
    }, [route.params]);

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
        setUploading(type);
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
            setUploading(null);
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
            const errorMsg = error.response?.data?.message || 'Failed to update API key. Please try again.';
            Alert.alert('Update Error', errorMsg);
        } finally {
            setKeyUpdating(false);
        }
    };

    const refreshAvatarOptions = () => {
        const categories = ['bottts', 'avataaars', 'micah', 'pixel-art', 'adventurer', 'open-peeps', 'lorelei', 'fun-emoji', 'notionists'];
        const newAvatars = [];
        for (let i = 0; i < 9; i++) {
            const category = categories[i % categories.length];
            const seed = Math.random().toString(36).substring(7);
            newAvatars.push({
                url: `https://api.dicebear.com/9.x/${category}/png?seed=${seed}&backgroundColor=c7ecee&radius=50`,
                seed,
                category
            });
        }
        setGalleryAvatars(newAvatars);
    };

    const selectAvatar = (avatar) => {
        handleUpdateAvatar(avatar.url, avatar.seed);
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
                        {uploading === 'banner' && (
                            <View style={styles.bannerUploadOverlay}>
                                <ActivityIndicator size="small" color="#FFF" />
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.bannerEditBtn}
                            onPress={() => pickImage('banner')}
                            disabled={uploading}
                        >
                            <Edit2 size={16} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.profileInfo}>
                        {user?.subscription?.type === 'advance' ? (
                            <GradientBorder size={120} borderWidth={4} colors={['#FFDF00', '#FFF8DC', '#FFDF00', '#F59E0B', '#FFDF00']}>
                                <View style={styles.avatarWrapper}>
                                    <Image
                                        key={user?.preferences?.avatarUrl || profilePreview}
                                        source={{ uri: profilePreview || user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=6366f1&color=fff&size=200` }}
                                        style={styles.avatarImg}
                                    />
                                    {uploading === 'profile' && (
                                        <View style={styles.uploadOverlay}>
                                            <ActivityIndicator size="small" color="#FFF" />
                                        </View>
                                    )}
                                </View>
                            </GradientBorder>
                        ) : user?.subscription?.type === 'standard' ? (
                            <GradientBorder size={120} borderWidth={3} colors={['#F59E0B', '#D97706']}>
                                <View style={styles.avatarWrapper}>
                                    <Image
                                        key={user?.preferences?.avatarUrl || profilePreview}
                                        source={{ uri: profilePreview || user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=6366f1&color=fff&size=200` }}
                                        style={styles.avatarImg}
                                    />
                                    {uploading === 'profile' && (
                                        <View style={styles.uploadOverlay}>
                                            <ActivityIndicator size="small" color="#FFF" />
                                        </View>
                                    )}
                                </View>
                            </GradientBorder>
                        ) : (
                            <GradientBorder size={120} borderWidth={4}>
                                <View style={styles.avatarWrapper}>
                                    <Image
                                        key={user?.preferences?.avatarUrl || profilePreview}
                                        source={{ uri: profilePreview || user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=6366f1&color=fff&size=200` }}
                                        style={styles.avatarImg}
                                    />
                                    {uploading === 'profile' && (
                                        <View style={styles.uploadOverlay}>
                                            <ActivityIndicator size="small" color="#FFF" />
                                        </View>
                                    )}
                                </View>
                            </GradientBorder>
                        )}
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
                    </Card>
                </View>

                {/* AI Avatar Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>AI Avatar Assistant</Text>
                        <TouchableOpacity style={styles.refreshBtn} onPress={refreshAvatarOptions}>
                            <RefreshCw size={14} color={Colors.primary} />
                            <Text style={styles.refreshBtnText}>Generate Again</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <Card style={styles.avatarCard}>
                        <View style={styles.gridContainer}>
                            {galleryAvatars.map((item, index) => {
                                const isCurrent = user?.preferences?.avatarSeed === item.seed;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.galleryItem}
                                        onPress={() => selectAvatar(item)}
                                        disabled={avatarLoading}
                                    >
                                        <View style={[styles.avatarCircle, isCurrent && styles.avatarCircleActive]}>
                                            <Image source={{ uri: item.url }} style={styles.galleryImg} />
                                            {isCurrent && (
                                                <View style={styles.checkBadge}>
                                                    <Check size={10} color="white" />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.categoryLabel}>{item.category}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {avatarLoading && (
                            <View style={styles.inlineLoader}>
                                <ActivityIndicator size="small" color={Colors.primary} />
                                <Text style={styles.inlineLoaderText}>Updating...</Text>
                            </View>
                        )}
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
                    <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
                        <Settings size={20} color={Colors.primary} />
                        <Text style={styles.settingsText}>App Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
                        {isLoggingOut ? (
                            <>
                                <ActivityIndicator size="small" color={Colors.error} />
                                <Text style={styles.logoutText}>Logging out...</Text>
                            </>
                        ) : (
                            <>
                                <LogOut size={20} color={Colors.error} />
                                <Text style={styles.logoutText}>Log Out</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>


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
    bannerUploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center'
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
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    refreshBtnText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },
    avatarCard: { padding: 16 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
    galleryItem: { width: '30%', alignItems: 'center', marginBottom: 12 },
    avatarCircle: { 
        width: 70, height: 70, borderRadius: 35, backgroundColor: '#F1F5F9', 
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0',
        overflow: 'hidden', position: 'relative'
    },
    avatarCircleActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '05' },
    galleryImg: { width: '90%', height: '90%' },
    checkBadge: { 
        position: 'absolute', top: 0, right: 0, 
        backgroundColor: Colors.primary, width: 20, height: 20, 
        borderRadius: 10, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: Colors.white
    },
    categoryLabel: { fontSize: 10, color: Colors.text.tertiary, marginTop: 4, textTransform: 'capitalize' },
    inlineLoader: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 10 },
    inlineLoaderText: { fontSize: 12, color: Colors.text.tertiary },
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
    settingsText: { color: Colors.primary, fontWeight: 'bold' }
});

export default ProfileScreen;
