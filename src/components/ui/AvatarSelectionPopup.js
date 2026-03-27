import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal,
    TouchableOpacity, Image, ActivityIndicator
} from 'react-native';
import { RefreshCw, Check, X } from 'lucide-react-native';
import { Colors, Shadows } from '../../constants/theme';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import GradientBorder from './GradientBorder';

const AvatarSelectionPopup = ({ visible, onClose, initialAvatar }) => {
    const { refreshUser } = useAuth();
    const [currentAvatar, setCurrentAvatar] = useState(initialAvatar);
    const [loading, setLoading] = useState(false);

    const handleShuffle = async () => {
        setLoading(true);
        try {
            const res = await authAPI.updateAvatarPreference({ action: 'shuffle' });
            setCurrentAvatar(res.data.preferences.avatarUrl);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await authAPI.updateAvatarPreference({ action: 'confirm' });
            await refreshUser();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <Text style={styles.title}>Your New Avatar! ✨</Text>
                    <Text style={styles.subtitle}>We've assigned you a random explorer. Is this cool or want to change?</Text>

                    <View style={styles.avatarContainer}>
                        <GradientBorder size={120} borderWidth={4}>
                            <View style={styles.avatarWrapper}>
                                {loading ? (
                                    <ActivityIndicator color={Colors.primary} />
                                ) : (
                                    <Image
                                        source={{ uri: currentAvatar }}
                                        style={styles.avatar}
                                    />
                                )}
                            </View>
                        </GradientBorder>

                        <TouchableOpacity
                            style={styles.shuffleBtn}
                            onPress={handleShuffle}
                            disabled={loading}
                        >
                            <RefreshCw size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.confirmBtn]}
                            onPress={handleConfirm}
                            disabled={loading}
                        >
                            <Check size={20} color="white" />
                            <Text style={styles.btnText}>Looks Cool!</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.cancelBtn]}
                            onPress={onClose}
                        >
                            <X size={20} color={Colors.text.tertiary} />
                            <Text style={[styles.btnText, { color: Colors.text.tertiary }]}>Later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, alignItems: 'center' },
    handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 8 },
    subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
    avatarContainer: { marginBottom: 30, position: 'relative' },
    avatarWrapper: { width: '100%', height: '100%', borderRadius: 60, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatar: { width: '100%', height: '100%' },
    shuffleBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white', ...Shadows.sm },
    actions: { width: '100%', gap: 12 },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16 },
    confirmBtn: { backgroundColor: Colors.primary, ...Shadows.md },
    cancelBtn: { backgroundColor: '#f1f5f9' },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default AvatarSelectionPopup;
