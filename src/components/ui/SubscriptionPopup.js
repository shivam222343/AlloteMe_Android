import React from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Dimensions, ScrollView, Image, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Crown, Zap, Target, Star, Sparkles, ChevronRight } from 'lucide-react-native';
import { Colors, Shadows } from '../../constants/theme';
import { SUBSCRIPTION_PLANS } from '../../constants/subscriptions';
import { systemAPI } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SubscriptionPopup = ({ visible, onClose, onSubscribe }) => {
    const [dynamicPlans, setDynamicPlans] = React.useState([
        { 
            id: 'standard', 
            name: 'Standard Admission', 
            price: '₹99', 
            period: 'One time', 
            color: Colors.primary, 
            icon: Target,
            features: ['Unlimited AI Prompts', '15 College Predictions', '5 PDF & CSV Exports', 'Standard Chat Support']
        },
        { 
            id: 'advance', 
            name: 'Elite Counselor', 
            price: '₹149', 
            period: 'One time', 
            color: '#F59E0B', 
            icon: Crown,
            features: ['Unlimited AI Prompts', '25 College Predictions', '12 PDF & CSV Exports', 'Personal Counselor Chat'],
            popular: true
        }
    ]);

    React.useEffect(() => {
        if (visible) {
            const fetchPrices = async () => {
                try {
                    const res = await systemAPI.getSettings();
                    const settings = res.data;
                    setDynamicPlans(prev => prev.map(plan => {
                        if (plan.id === 'standard' && settings.basicPrice) {
                            return { ...plan, price: `₹${settings.basicPrice}` };
                        }
                        if (plan.id === 'advance' && settings.premiumPrice) {
                            return { ...plan, price: `₹${settings.premiumPrice}` };
                        }
                        return plan;
                    }));
                } catch (err) {
                    console.log('Popup: Using default prices');
                }
            };
            fetchPrices();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.content}>
                        {/* Close Button */}
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X size={20} color={Colors.text.tertiary} />
                        </TouchableOpacity>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {/* Premium Header */}
                            <View style={styles.header}>
                                <Text style={styles.title}>Unlock Premium Features</Text>
                                <Text style={styles.subtitle}>Get the ultimate edge in your college admission journey</Text>
                            </View>

                            {/* Plans */}
                            <View style={styles.plansContainer}>
                                {dynamicPlans.map((plan) => (
                                    <TouchableOpacity
                                        key={plan.id}
                                        style={[styles.planCard, { borderColor: plan.color + '40' }]}
                                        onPress={() => onSubscribe(plan.id)}
                                        activeOpacity={0.9}
                                    >
                                        {plan.popular && (
                                            <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                                                <Text style={styles.popularText}>BEST VALUE</Text>
                                            </View>
                                        )}

                                        <View style={styles.planHeader}>
                                            <View style={[styles.planIconBox, { backgroundColor: plan.color + '15' }]}>
                                                <plan.icon size={24} color={plan.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.planName}>{plan.name}</Text>
                                                <View style={styles.priceRow}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                                        <Text style={styles.originalPrice}>₹{parseInt(plan.price.replace('₹', '')) + 100}</Text>
                                                        <Text style={styles.planPrice}>{plan.price}</Text>
                                                    </View>
                                                    <Text style={styles.planPeriod}>/ {plan.period}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.featuresList}>
                                            {plan.features.map((feature, idx) => (
                                                <View key={idx} style={styles.featureItem}>
                                                    <View style={[styles.checkCircle, { backgroundColor: plan.color + '15' }]}>
                                                        <Check size={10} color={plan.color} strokeWidth={3} />
                                                    </View>
                                                    <Text style={styles.featureText}>{feature}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={[styles.subscribeBtn, { backgroundColor: plan.color }]}>
                                            <Text style={styles.subscribeBtnText}>Upgrade to {plan.name.split(' ')[0]}</Text>
                                            <ChevronRight size={16} color="white" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Trust Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Secure Payment via Razorpay</Text>
                                <View style={styles.trustIcons}>
                                    <View style={styles.trustItem}><Star size={12} color="#F59E0B" fill="#F59E0B" /><Text style={styles.trustText}>Top Rated</Text></View>
                                    <View style={styles.trustItem}><Zap size={12} color="#F59E0B" fill="#F59E0B" /><Text style={styles.trustText}>Instant Access</Text></View>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
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
    },
    modalContainer: {
        width: SCREEN_WIDTH * 0.9,
        maxHeight: SCREEN_HEIGHT * 0.85,
        borderRadius: 32,
        backgroundColor: Colors.white,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.text.tertiary,
        textAlign: 'center',
        paddingHorizontal: 10,
        lineHeight: 18,
    },
    plansContainer: {
        gap: 16,
    },
    planCard: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 2,
        ...Shadows.sm,
    },
    popularBadge: {
        position: 'absolute',
        top: -12,
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
    },
    popularText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    planIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    planName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 1,
    },
    planPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    originalPrice: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textDecorationLine: 'line-through',
        marginRight: 6,
    },
    planPeriod: {
        fontSize: 11,
        color: Colors.text.tertiary,
        marginLeft: 4,
    },
    featuresList: {
        marginBottom: 20,
        gap: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 12,
        color: Colors.text.secondary,
        fontWeight: '500',
    },
    subscribeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
        ...Shadows.sm,
    },
    subscribeBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        color: Colors.text.tertiary,
        marginBottom: 8,
    },
    trustIcons: {
        flexDirection: 'row',
        gap: 16,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trustText: {
        fontSize: 10,
        color: Colors.text.tertiary,
        fontWeight: '700',
    },
});

export default SubscriptionPopup;
