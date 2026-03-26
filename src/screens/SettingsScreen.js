import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MainLayout from '../components/layouts/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { SkeletonBannerItem } from '../components/SkeletonLoader';

const SettingsScreen = ({ navigation, route }) => {
    const { user, refreshUser } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [changePasswordVisible, setChangePasswordVisible] = useState(false);
    const [bannerModalVisible, setBannerModalVisible] = useState(false);
    const [activeBannerTab, setActiveBannerTab] = useState('All');
    const [bannersLoading, setBannersLoading] = useState(false);
    const [selectingBanner, setSelectingBanner] = useState(null);

    const localBanners = [
        { id: 'local-banner-1', source: require('../../assets/banners/blue_geometric.png') },
        { id: 'local-banner-2', source: require('../../assets/banners/blue_abstract.png') },
        { id: 'local-banner-3', source: require('../../assets/banners/blue_shapes.png') },
        { id: 'local-banner-4', source: require('../../assets/banners/blue_cloud.png') },
    ];
    // Initialize with some banners properly to avoid empty state delay
    const [generatedBanners, setGeneratedBanners] = useState([
        'https://picsum.photos/seed/start1/400/200',
        'https://picsum.photos/seed/start2/400/200',
        'https://picsum.photos/seed/start3/400/200',
        'https://picsum.photos/seed/start4/400/200',
        'https://picsum.photos/seed/start5/400/200',
        'https://picsum.photos/seed/start6/400/200',
    ]);

    // Refresh banners when modal opens
    React.useEffect(() => {
        if (bannerModalVisible) {
            generateNewBanners();
        }
    }, [bannerModalVisible]);

    const generateNewBanners = () => {
        setBannersLoading(true);
        // Simulate a slight delay for AI "generation"
        setTimeout(() => {
            const newBanners = Array(6).fill(0).map((_, i) => {
                const seed = Math.random().toString(36).substring(7);
                return `https://picsum.photos/seed/${seed}/400/200`;
            });
            setGeneratedBanners(newBanners);
            setBannersLoading(false);
        }, 1500);
    };

    const updateSidebarBanner = async (url) => {
        try {
            setSelectingBanner(url || 'default');
            const preferences = {
                ...user.preferences,
                sidebarBanner: url
            };

            const res = await authAPI.updateProfile({
                preferences,
                bannerUrl: url // Also update the main profile banner
            });

            if (res.data) {
                await refreshUser();
                setBannerModalVisible(false);
            } else {
                Alert.alert('Error', 'Failed to update banner');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update banner');
        } finally {
            setSelectingBanner(null);
        }
    };

    React.useEffect(() => {
        if (route.params?.openChangePassword) {
            setChangePasswordVisible(true);
        }
        if (route.params?.openBannerModal) {
            setBannerModalVisible(true);
        }
    }, [route.params]);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const handleChangePassword = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        if (passwords.new !== passwords.confirm) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (passwords.new.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await authAPI.changePassword({
                currentPassword: passwords.current,
                newPassword: passwords.new
            });

            if (res.success) {
                Alert.alert('Success', 'Password changed successfully');
                setChangePasswordVisible(false);
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                Alert.alert('Error', res.message || 'Failed to change password');
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const SettingItem = ({ icon, title, value, onValueChange, type = 'switch', onPress }) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            disabled={type === 'switch'}
        >
            <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name={icon} size={22} color="#475569" />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
            </View>
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                    thumbColor={value ? '#0A66C2' : '#94A3B8'}
                />
            ) : (
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            )}
        </TouchableOpacity>
    );

    return (
        <MainLayout title="Settings" scrollable={false}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >

                <Text style={styles.sectionHeader}>Preferences</Text>
                <View style={styles.section}>
                    <SettingItem
                        icon="notifications-outline"
                        title="Push Notifications"
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                    />
                </View>

                {/* Sidebar Banner Customization */}
                <Text style={styles.sectionHeader}>Appearance</Text>
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setBannerModalVisible(true)}
                    >
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0F9FF', overflow: 'hidden' }]}>
                                {user?.preferences?.sidebarBanner ? (
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
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Ionicons name="color-palette-outline" size={22} color="#0284C7" />
                                )}
                            </View>
                            <Text style={styles.settingTitle}>Sidebar Banner</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: '#64748B', marginRight: 8, fontSize: 13 }}>
                                {user?.preferences?.sidebarBanner ? 'Custom' : 'Default'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeader}>Security</Text>
                <View style={styles.section}>
                    <SettingItem
                        icon="lock-closed-outline"
                        title="Change Password"
                        type="link"
                        onPress={() => setChangePasswordVisible(true)}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="shield-checkmark-outline"
                        title="Two-Factor Auth"
                        type="link"
                        onPress={() => Alert.alert('Coming Soon', 'This feature will be available in the next update.')}
                    />
                </View>

                <Text style={styles.sectionHeader}>Support</Text>
                <View style={styles.section}>
                    <SettingItem
                        icon="help-circle-outline"
                        title="Help Center"
                        type="link"
                        onPress={() => navigation.navigate('HelpCenter')}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="document-text-outline"
                        title="Privacy Policy"
                        type="link"
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="information-circle-outline"
                        title="About Us"
                        type="link"
                        onPress={() => navigation.navigate('AboutUs')}
                    />
                </View>

                <Text style={styles.sectionHeader}>Account Actions</Text>
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => {
                            Alert.alert(
                                'Delete Account',
                                'Are you sure you want to permanently delete your account? This action cannot be undone.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete Permanently',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                await authAPI.deleteProfile();
                                                logout();
                                            } catch (e) {
                                                Alert.alert('Error', 'Failed to delete account');
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                            </View>
                            <Text style={[styles.settingTitle, { color: '#EF4444', fontWeight: 'bold' }]}>Delete Account Permanently</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Version 1.2.0 (Build 45)</Text>
                    <Text style={styles.copyrightText}>© 2026 Team Alloteme0077</Text>
                </View>

                {/* Change Password Modal */}
                <Modal
                    visible={changePasswordVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setChangePasswordVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Change Password</Text>
                                <TouchableOpacity onPress={() => setChangePasswordVisible(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalBody}>
                                <Text style={styles.inputLabel}>Current Password</Text>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry
                                    value={passwords.current}
                                    onChangeText={(t) => setPasswords({ ...passwords, current: t })}
                                    placeholder="••••••••"
                                />

                                <Text style={styles.inputLabel}>New Password</Text>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry
                                    value={passwords.new}
                                    onChangeText={(t) => setPasswords({ ...passwords, new: t })}
                                    placeholder="••••••••"
                                />

                                <Text style={styles.inputLabel}>Confirm New Password</Text>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry
                                    value={passwords.confirm}
                                    onChangeText={(t) => setPasswords({ ...passwords, confirm: t })}
                                    placeholder="••••••••"
                                />

                                <TouchableOpacity
                                    style={[styles.submitBtn, passwordLoading && styles.submitBtnDisabled]}
                                    onPress={handleChangePassword}
                                    disabled={passwordLoading}
                                >
                                    {passwordLoading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Update Password</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Banner Selection Modal */}
                <Modal
                    visible={bannerModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setBannerModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Customize Banner</Text>
                                    <Text style={styles.modalSubtitle}>Select a theme for your sidebar</Text>
                                </View>
                                <TouchableOpacity onPress={() => setBannerModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Banner Tabs */}
                            <View style={{ flexDirection: 'row', marginBottom: 20, gap: 10 }}>
                                {['All', 'Premium', 'AI Generated'].map(tab => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={{
                                            paddingVertical: 6,
                                            paddingHorizontal: 12,
                                            borderRadius: 20,
                                            backgroundColor: activeBannerTab === tab ? '#0A66C2' : '#F1F5F9'
                                        }}
                                        onPress={() => {
                                            setActiveBannerTab(tab);
                                            if (tab === 'AI Generated' && generatedBanners.length === 0) {
                                                generateNewBanners();
                                            }
                                        }}
                                    >
                                        <Text style={{
                                            color: activeBannerTab === tab ? '#FFF' : '#64748B',
                                            fontWeight: '600',
                                            fontSize: 13
                                        }}>{tab}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
                                <Text style={[styles.inputLabel, { marginBottom: 10 }]}>Default</Text>
                                <TouchableOpacity
                                    style={[styles.bannerOption, !user?.preferences?.sidebarBanner && styles.bannerOptionActive]}
                                    onPress={() => updateSidebarBanner(null)}
                                    disabled={!!selectingBanner}
                                >
                                    <LinearGradient
                                        colors={['#0A66C2', '#0E76A8']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.bannerImage}
                                    >
                                        {selectingBanner === 'default' ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <View style={styles.defaultBannerContent}>
                                                <Image
                                                    source={require('../../assets/AS.png')}
                                                    style={{ width: 30, height: 30, marginRight: 10, tintColor: '#FFFFFF', opacity: 0.9 }}
                                                    resizeMode="contain"
                                                />
                                                <Text style={{ color: '#FFF', fontWeight: '600' }}>Classic Blue</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                    {!user?.preferences?.sidebarBanner && !selectingBanner && (
                                        <View style={styles.checkBadge}>
                                            <Ionicons name="checkmark" size={14} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {(activeBannerTab === 'All' || activeBannerTab === 'Premium') && (
                                    <>
                                        <Text style={[styles.inputLabel, { marginBottom: 10, marginTop: 10 }]}>Premium Themes</Text>
                                        <View style={styles.bannerGrid}>
                                            {localBanners.map((banner, index) => (
                                                <TouchableOpacity
                                                    key={`local-${index}`}
                                                    style={[
                                                        styles.bannerGridItem,
                                                        user?.preferences?.sidebarBanner === banner.id && styles.bannerOptionActive
                                                    ]}
                                                    onPress={() => updateSidebarBanner(banner.id)}
                                                    disabled={!!selectingBanner}
                                                >
                                                    {selectingBanner === banner.id ? (
                                                        <View style={styles.bannerLoadingCard}>
                                                            <ActivityIndicator size="small" color="#0A66C2" />
                                                        </View>
                                                    ) : (
                                                        <>
                                                            <Image
                                                                source={banner.source}
                                                                style={styles.bannerGridImage}
                                                                resizeMode="cover"
                                                            />
                                                            {user?.preferences?.sidebarBanner === banner.id && (
                                                                <View style={styles.checkBadge}>
                                                                    <Ionicons name="checkmark" size={14} color="#FFF" />
                                                                </View>
                                                            )}
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {(activeBannerTab === 'All' || activeBannerTab === 'AI Generated') && (
                                    <>
                                        <Text style={[styles.inputLabel, { marginBottom: 10, marginTop: 10 }]}>AI Generated Themes</Text>
                                        <View style={styles.bannerGrid}>
                                            {bannersLoading ? (
                                                [1, 2, 3, 4, 5, 6].map(i => (
                                                    <SkeletonBannerItem key={i} />
                                                ))
                                            ) : (
                                                generatedBanners.map((url, index) => (
                                                    <TouchableOpacity
                                                        key={`ai-${index}`}
                                                        style={[
                                                            styles.bannerGridItem,
                                                            user?.preferences?.sidebarBanner === url && styles.bannerOptionActive
                                                        ]}
                                                        onPress={() => updateSidebarBanner(url)}
                                                        disabled={!!selectingBanner}
                                                    >
                                                        {selectingBanner === url ? (
                                                            <View style={styles.bannerLoadingCard}>
                                                                <ActivityIndicator size="small" color="#0A66C2" />
                                                            </View>
                                                        ) : (
                                                            <>
                                                                <Image
                                                                    source={{ uri: url }}
                                                                    style={styles.bannerGridImage}
                                                                    resizeMode="cover"
                                                                />
                                                                {user?.preferences?.sidebarBanner === url && (
                                                                    <View style={styles.checkBadge}>
                                                                        <Ionicons name="checkmark" size={14} color="#FFF" />
                                                                    </View>
                                                                )}
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.generateBtn, (bannersLoading || !!selectingBanner) && { opacity: 0.6 }]}
                                            onPress={generateNewBanners}
                                            disabled={bannersLoading || !!selectingBanner}
                                        >
                                            {bannersLoading ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <>
                                                    <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                                    <Text style={styles.generateBtnText}>Generate New Themes</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                )}
                            </ScrollView>
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
        backgroundColor: '#F8FAFC',
    },
    content: {
        paddingVertical: 20,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1E293B',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 64,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    versionText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    copyrightText: {
        fontSize: 12,
        color: '#CBD5E1',
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '90%', // Prevent modal from going off screen
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 16,
    },
    modalBody: {
        gap: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: -8,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1E293B',
    },
    submitBtn: {
        backgroundColor: '#0A66C2',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    // Banner Styles
    bannerOption: {
        width: '100%',
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    bannerOptionActive: {
        borderColor: '#0A66C2',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    defaultBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bannerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    bannerGridItem: {
        width: '48%',
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: '#E2E8F0', // Placeholder color
    },
    bannerGridImage: {
        width: '100%',
        height: '100%',
    },
    bannerLoadingCard: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#0A66C2',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 20,
    },
    generateBtnText: {
        color: '#FFF',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 16,
    }
});

export default SettingsScreen;
