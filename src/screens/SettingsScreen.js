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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const SettingsScreen = ({ navigation, route }) => {
    const { user, refreshUser } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [changePasswordVisible, setChangePasswordVisible] = useState(false);

    React.useEffect(() => {
        if (route.params?.openChangePassword) {
            setChangePasswordVisible(true);
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
        <MainLayout navigation={navigation} currentRoute="Settings" title="Settings">
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>

                <Text style={styles.sectionHeader}>Preferences</Text>
                <View style={styles.section}>
                    <SettingItem
                        icon="notifications-outline"
                        title="Push Notifications"
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="moon-outline"
                        title="Dark Mode"
                        value={darkMode}
                        onValueChange={setDarkMode}
                    />
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
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="document-text-outline"
                        title="Privacy Policy"
                        type="link"
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Version 1.2.0 (Build 45)</Text>
                    <Text style={styles.copyrightText}>© 2026 Team Mavericks</Text>
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

            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        padding: 20,
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
    }
});

export default SettingsScreen;
