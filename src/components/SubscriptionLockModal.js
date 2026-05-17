import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Colors, Shadows } from '../constants/theme';
import { Lock, Sparkles, Zap, ChevronRight, X, BadgePercent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const SubscriptionLockModal = () => {
    const { user, subscriptionModal, setSubscriptionModal } = useAuth();
    const navigation = useNavigation();

    if (!subscriptionModal.visible) return null;

    const featureNames = {
        aiPrompts: 'AI Counseling Prompts',
        predictions: 'College Predictions',
        exports: 'PDF/CSV Exports'
    };

    const handleUpgrade = () => {
        setSubscriptionModal({ visible: false, feature: '' });
        navigation.navigate('Pricing');
    };

    const isRenewal = user?.subscription?.type === 'standard' || user?.subscription?.type === 'advance';

    return (
        <Modal
            transparent
            visible={subscriptionModal.visible}
            animationType="fade"
            onRequestClose={() => setSubscriptionModal({ visible: false, feature: '' })}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => setSubscriptionModal({ visible: false, feature: '' })}
                    >
                        <X size={20} color={Colors.text.tertiary} />
                    </TouchableOpacity>

                    <LinearGradient
                        colors={[Colors.primary + '20', Colors.primary + '10']}
                        style={styles.iconCircle}
                    >
                        <Lock size={32} color={Colors.primary} />
                    </LinearGradient>

                    <Text style={styles.title}>{isRenewal ? 'Limit Reached' : 'Feature Locked'}</Text>
                    <Text style={styles.subtitle}>
                        You've reached your {isRenewal ? 'plan' : 'free'} limit for {'\n'}
                        <Text style={styles.highlight}>{featureNames[subscriptionModal.feature] || 'this feature'}</Text>.
                    </Text>

                    {isRenewal ? (
                        <View style={styles.promoBanner}>
                            <BadgePercent size={20} color="#F59E0B" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.promoTitle}>Special Renewal Offer!</Text>
                                <Text style={styles.promoText}>Renew now and get <Text style={{fontWeight: 'bold'}}>30% OFF</Text> on any plan.</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.promoBanner}>
                            <Sparkles size={20} color="#F59E0B" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.promoTitle}>Unlock Premium Access</Text>
                                <Text style={styles.promoText}>Get unlimited AI counseling and accurate predictions.</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.perksList}>
                        <View style={styles.perkItem}>
                            <Sparkles size={16} color="#F59E0B" fill="#F59E0B20" />
                            <Text style={styles.perkText}>Unlock Unlimited AI Prompts</Text>
                        </View>
                        <View style={styles.perkItem}>
                            <Zap size={16} color="#8B5CF6" fill="#8B5CF620" />
                            <Text style={styles.perkText}>Get Up to 25 Predictions</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleUpgrade}
                    >
                        <LinearGradient
                            colors={[Colors.primary, '#4338CA']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.upgradeBtn}
                        >
                            <Text style={styles.upgradeText}>{isRenewal ? 'Renew with 30% OFF' : 'Upgrade Now'}</Text>
                            <ChevronRight size={18} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setSubscriptionModal({ visible: false, feature: '' })}
                        style={styles.maybeLater}
                    >
                        <Text style={styles.maybeLaterText}>Maybe Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    card: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        ...Shadows.lg
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 4
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.text.primary,
        marginBottom: 12
    },
    subtitle: {
        fontSize: 15,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24
    },
    highlight: {
        color: Colors.primary,
        fontWeight: 'bold'
    },
    promoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFBEB',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginBottom: 20,
        width: '100%'
    },
    promoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 2
    },
    promoText: {
        fontSize: 12,
        color: '#B45309',
        lineHeight: 18
    },
    perksList: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        gap: 12
    },
    perkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    perkText: {
        fontSize: 14,
        color: Colors.text.primary,
        fontWeight: '600'
    },
    upgradeBtn: {
        width: '100%',
        paddingVertical: 16,
        paddingHorizontal: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        ...Shadows.md
    },
    upgradeText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },
    maybeLater: {
        marginTop: 16,
        padding: 8
    },
    maybeLaterText: {
        fontSize: 14,
        color: Colors.text.tertiary,
        fontWeight: '500'
    }
});

export default SubscriptionLockModal;
