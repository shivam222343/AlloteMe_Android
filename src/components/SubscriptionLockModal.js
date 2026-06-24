import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Colors, Shadows } from '../constants/theme';
import { Lock, Sparkles, Zap, ChevronRight, X, BadgePercent, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { systemAPI } from '../services/api';

const { width } = Dimensions.get('window');

const SubscriptionLockModal = () => {
    const { user, subscriptionModal, setSubscriptionModal } = useAuth();
    const navigation = useNavigation();
    const [standardPrice, setStandardPrice] = useState('₹99');
    const [activeCoupon, setActiveCoupon] = useState(null);

    useEffect(() => {
        if (subscriptionModal.visible) {
            systemAPI.getSettings().then(res => {
                if (res.data?.basicPrice) setStandardPrice(`₹${res.data.basicPrice}`);
            }).catch(err => console.log('Failed to fetch settings for modal:', err));

            systemAPI.getCoupons().then(res => {
                const active = res.data?.find(c => c.isActive && c.showInCheckout);
                if (active) setActiveCoupon(active);
            }).catch(err => console.log('Failed to fetch coupons for modal:', err));
        }
    }, [subscriptionModal.visible]);

    if (!subscriptionModal.visible) return null;

    const featureNames = {
        aiPrompts: 'AI Counseling Prompts',
        predictions: 'College Predictions',
        exports: 'PDF/CSV Exports'
    };

    const handleUpgradeStandard = () => {
        setSubscriptionModal({ visible: false, feature: '' });
        navigation.navigate('Pricing', { autoCheckout: 'standard' });
    };

    const handleViewMore = () => {
        setSubscriptionModal({ visible: false, feature: '' });
        navigation.navigate('Pricing');
    };

    const isRenewal = user?.subscription?.type === 'standard' || user?.subscription?.type === 'advance';

    const standardFeatures = [
        'Unlimited AI counselor guidance',
        '15 college prediction chances',
        '5 PDF/CSV export options',
        'explore college listed on map',
        'explore 350+ colleges and 47,000+ cutoffs',
        'one live Zoom meeting'
    ];

    return (
        <Modal
            transparent
            visible={subscriptionModal.visible}
            animationType="none"
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

                    <ScrollView 
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        style={{ width: '100%' }}
                    >
                        <View style={{ alignItems: 'center' }}>
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
                            ) : activeCoupon ? (
                                <View style={[styles.promoBanner, { borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '0A' }]}>
                                    <BadgePercent size={20} color={Colors.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.promoTitle, { color: Colors.primary }]}>Limited Time Offer!</Text>
                                        <Text style={[styles.promoText, { color: Colors.primary }]}>Use coupon code <Text style={{fontWeight: 'bold', color: '#1E40AF'}}>{activeCoupon.code}</Text> at checkout for {activeCoupon.discountPercentage}% OFF.</Text>
                                    </View>
                                </View>
                            ) : null}

                            {!isRenewal && (
                                <View style={styles.standardPlanBox}>
                                    <View style={styles.standardPlanHeader}>
                                        <Sparkles size={18} color={Colors.primary} />
                                        <Text style={styles.standardPlanTitle}>Standard Plan Features</Text>
                                    </View>
                                    {standardFeatures.map((feat, idx) => (
                                        <View key={idx} style={styles.featureRow}>
                                            <Check size={14} color="#10B981" />
                                            <Text style={styles.featureText}>{feat}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleUpgradeStandard}
                                style={{ width: '100%', marginTop: 15 }}
                            >
                                <LinearGradient
                                    colors={[Colors.primary, '#4338CA']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.upgradeBtn}
                                >
                                    <Text style={styles.upgradeText}>{isRenewal ? 'Renew Plan with 30% OFF' : `Get Standard Plan - ${standardPrice}`}</Text>
                                    <ChevronRight size={18} color="white" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleViewMore}
                                style={styles.viewMoreBtn}
                            >
                                <Text style={styles.viewMoreText}>View More Plans</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setSubscriptionModal({ visible: false, feature: '' })}
                                style={styles.maybeLater}
                            >
                                <Text style={styles.maybeLaterText}>Maybe Later</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
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
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 4,
        zIndex: 10
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
    standardPlanBox: {
        width: '100%',
        backgroundColor: Colors.primary + '08',
        borderRadius: 20,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.primary + '20'
    },
    standardPlanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12
    },
    standardPlanTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text.primary
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
    },
    featureText: {
        fontSize: 13,
        color: Colors.text.secondary,
        fontWeight: '500',
        flex: 1
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
    viewMoreBtn: {
        marginTop: 12,
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        borderRadius: 16,
        backgroundColor: Colors.primary + '05'
    },
    viewMoreText: {
        fontSize: 15,
        color: Colors.primary,
        fontWeight: '600'
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
