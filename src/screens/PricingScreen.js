import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, SafeAreaView, Platform } from 'react-native';
import { Colors, Shadows, Spacing } from '../constants/theme';
import { Gem, Check, X, ChevronLeft, Zap, Crown, ShieldCheck, Video, Headset, PartyPopper, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../contexts/AuthContext';

// Safe way to access env in Expo
const RAZORPAY_KEY_ID = 'rzp_live_SbVLw7f5p7qeQN';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        subtitle: 'Start exploring now',
        price: 'Free',
        priceLabel: 'Forever',
        features: [
            { text: '3 AI Counseling Prompts', included: true },
            { text: '5 College Predictions', included: true },
            { text: '1 PDF or CSV Export', included: true },
            { text: 'Browse All Colleges', included: true },
            { text: 'Admission Notifications', included: true },
            { text: 'Standard Chat Support', included: true },
            { text: 'Personal API Key', included: false },
        ],
        buttonText: 'Current Plan',
        color: '#94A3B8'
    },
    {
        id: 'standard',
        name: 'Standard',
        subtitle: 'Most Popular Choice',
        price: '₹99',
        priceLabel: 'One time',
        isMid: true,
        features: [
            { text: 'Unlimited AI Prompts', included: true },
            { text: 'Personal API Key Support', included: true },
            { text: '15 College Predictions', included: true },
            { text: '5 PDF & CSV Exports', included: true },
            { text: '1 Live Zoom Consultation', included: true },
            { text: 'Standard Chat Support', included: true },
            { text: 'End-to-End Support', included: false },
        ],
        buttonText: 'Get Standard',
        color: Colors.primary
    },
    {
        id: 'advance',
        name: 'Advance',
        subtitle: 'For the Serious Ones',
        price: '₹149',
        priceLabel: 'One time',
        isPremium: true,
        features: [
            { text: 'Unlimited AI Prompts', included: true },
            { text: 'Personal API Key Support', included: true },
            { text: '25 College Predictions', included: true },
            { text: '12 PDF & CSV Exports', included: true },
            { text: 'Weekly Live Zoom Meet', included: true },
            { text: 'Personal Counselor Chat', included: true },
            { text: '24/7 Call & WhatsApp', included: true },
        ],
        buttonText: 'Get Advance',
        color: '#F59E0B'
    }
];

const PricingScreen = ({ navigation }) => {
    const { user, updateProfile } = useAuth();
    const scrollViewRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const successAnim = useRef(new Animated.Value(0)).current;

    const handleSelectPlan = async (plan) => {
        const amount = parseInt(plan.price.replace('₹', '')) * 100;
        
        const successHandler = async (paymentId) => {
            const updatedSubscription = {
                type: plan.id,
                paymentId: paymentId,
                usage: user?.subscription?.usage || { aiPrompts: 0, predictions: 0, exports: 0 }
            };

            const res = await updateProfile({ subscription: updatedSubscription });
            if (res.success) {
                const message = plan.id === 'free' 
                    ? "Congratulations! Your Free Plan has been activated! 🎓✨"
                    : `Congratulations! You've successfully upgraded to the ${plan.name} Plan! 🎊🏆✨`;
                
                setSuccessMessage(message);
                setShowSuccess(true);
                Animated.spring(successAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 40,
                    friction: 7
                }).start();

                setTimeout(() => {
                    Animated.timing(successAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true
                    }).start(() => {
                        setShowSuccess(false);
                        navigation.navigate('Dashboard');
                    });
                }, 4000);
            }
        };

        if (Platform.OS === 'web') {
            console.log('Initiating Web Payment for plan:', plan.name);
            // Load Razorpay Script Dynamically
            const loaded = await new Promise((resolve) => {
                if (window.Razorpay) {
                    console.log('Razorpay already loaded');
                    resolve(true);
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.id = 'razorpay-checkout-js';
                script.onload = () => {
                    console.log('Razorpay script loaded successfully');
                    resolve(true);
                };
                script.onerror = () => {
                    console.error('Razorpay script failed to load');
                    resolve(false);
                };
                document.body.appendChild(script);
            });

            if (!loaded || !window.Razorpay) {
                alert('Failed to load payment gateway. Please check your internet connection.');
                return;
            }

            const options = {
                key: RAZORPAY_KEY_ID,
                amount: amount,
                currency: 'INR',
                name: 'AlloteMe',
                description: `AlloteMe ${plan.name} Subscription`,
                image: 'https://alloteme.in/logo.png',
                handler: function (response) {
                    console.log('Web Payment Success:', response.razorpay_payment_id);
                    successHandler(response.razorpay_payment_id);
                },
                prefill: {
                    name: user?.displayName || '',
                    email: user?.email || '',
                    contact: user?.phone || ''
                },
                theme: { color: Colors.primary },
                modal: {
                    ondismiss: function() {
                        console.log('Payment modal closed by user');
                    }
                }
            };

            try {
                const rzp = new window.Razorpay(options);
                if (rzp) {
                    rzp.open();
                } else {
                    throw new Error('Razorpay instance is null');
                }
            } catch (err) {
                console.error('Razorpay Web Open Error:', err);
                alert('Payment window could not be opened. Please try again.');
            }
            return;
        }

        if (plan.id === 'free' || plan.price === 'Free') {
            if (user?.subscription?.type === 'free') {
                alert('You are already on the Free plan!');
                return;
            }
            successHandler('free_activation');
        } else {
            let RazorpayCheckout;
            try {
                const Razorpay = require('react-native-razorpay');
                RazorpayCheckout = Razorpay.default || Razorpay;
            } catch (e) {
                console.log('Razorpay load error:', e);
            }

            if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
                alert('Razorpay is not supported in this environment (likely Expo Go). Please use the standalone app.');
                return;
            }

            const options = {
                description: `AlloteMe ${plan.name} Subscription`,
                image: 'https://alloteme.in/logo.png',
                currency: 'INR',
                key: RAZORPAY_KEY_ID,
                amount: amount,
                name: 'AlloteMe',
                prefill: {
                    email: user?.email || '',
                    contact: user?.phone || '',
                    name: user?.displayName || ''
                },
                theme: { color: Colors.primary }
            };

            RazorpayCheckout.open(options).then(async (data) => {
                successHandler(data.razorpay_payment_id);
            }).catch((error) => {
                console.log(error);
                alert(`Payment failed: ${error.description || 'Unknown error'}`);
            });
        }
    };

    const renderFeature = (feature, index) => (
        <View key={index} style={styles.featureRow}>
            <View style={[styles.iconCircle, { backgroundColor: feature.included ? '#10B98115' : '#EF444415' }]}>
                {feature.included ? (
                    <Check size={14} color="#10B981" />
                ) : (
                    <X size={14} color="#EF4444" />
                )}
            </View>
            <Text style={[styles.featureText, !feature.included && styles.featureDisabled]}>
                {feature.text}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.titleRow}>
                    <Gem size={22} color={Colors.primary} fill={Colors.primary + '20'} />
                    <Text style={styles.headerTitle}>AlloteMe Premium</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEnabled={!showSuccess}
            >
                {PLANS.map((plan) => (
                    <View key={plan.id} style={styles.slide}>
                        <View style={[
                            styles.planCard,
                            plan.isPremium && styles.premiumCard,
                            plan.isMid && styles.midCard
                        ]}>
                            {plan.isPremium ? (
                                <LinearGradient
                                    colors={['#F59E0B', '#B45309']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.premiumBadge}
                                >
                                    <Crown size={12} color="white" fill="white" />
                                    <Text style={styles.badgeText}>ELITE PLAN</Text>
                                </LinearGradient>
                            ) : plan.isMid ? (
                                <View style={[styles.premiumBadge, { backgroundColor: Colors.primary }]}>
                                    <Zap size={12} color="white" fill="white" />
                                    <Text style={styles.badgeText}>BEST VALUE</Text>
                                </View>
                            ) : null}

                            <View style={styles.cardHeader}>
                                <Text style={styles.planName}>{plan.name}</Text>
                                <Text style={styles.planSub}>{plan.subtitle}</Text>
                                <View style={styles.priceContainer}>
                                    <Text style={styles.priceValue}>{plan.price}</Text>
                                    <Text style={styles.priceLabel}>/ {plan.priceLabel}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.featuresList}>
                                {plan.features.length > 6 ? (
                                    <View style={styles.twoColumnFeatures}>
                                        <View style={{ flex: 1 }}>
                                            {plan.features.slice(0, Math.ceil(plan.features.length / 2)).map((f, idx) => renderFeature(f, idx))}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            {plan.features.slice(Math.ceil(plan.features.length / 2)).map((f, idx) => renderFeature(f, idx + 10))}
                                        </View>
                                    </View>
                                ) : (
                                    plan.features.map((f, idx) => renderFeature(f, idx))
                                )}
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleSelectPlan(plan)}
                                style={[
                                    styles.actionBtn,
                                    { backgroundColor: plan.color },
                                    (plan.isPremium || plan.isMid) && Shadows.md
                                ]}>
                                {plan.isPremium ? (
                                    <LinearGradient
                                        colors={['#F59E0B', '#D97706']}
                                        style={styles.gradientBtn}
                                    >
                                        <Text style={styles.btnText}>{plan.buttonText}</Text>
                                        <Zap size={16} color="white" fill="white" />
                                    </LinearGradient>
                                ) : plan.isMid ? (
                                    <LinearGradient
                                        colors={[Colors.primary, '#4338CA']}
                                        style={styles.gradientBtn}
                                    >
                                        <Text style={styles.btnText}>{plan.buttonText}</Text>
                                        <Zap size={16} color="white" fill="white" />
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.normalBtn}>
                                        <Text style={styles.btnText}>{plan.buttonText}</Text>
                                        <Zap size={16} color="white" fill="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.indicatorContainer}>
                {PLANS.map((_, i) => {
                    const opacity = scrollX.interpolate({
                        inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp'
                    });
                    const scale = scrollX.interpolate({
                        inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
                        outputRange: [1, 1.25, 1],
                        extrapolate: 'clamp'
                    });
                    return <Animated.View key={i} style={[styles.dot, { opacity, transform: [{ scale }] }]} />;
                })}
            </View>

            <View style={styles.trustBox}>
                <ShieldCheck size={16} color="#64748B" />
                <Text style={styles.trustText}>Secured Payment Infrastructure</Text>
            </View>

            {showSuccess && (
                <View style={styles.overlay}>
                    <Animated.View style={[
                        styles.successCard,
                        {
                            transform: [
                                { scale: successAnim },
                                { translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }
                            ],
                            opacity: successAnim
                        }
                    ]}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.successIconBox}
                        >
                            <PartyPopper size={40} color="white" />
                        </LinearGradient>
                        <Text style={styles.successTitle}>Congratulations!</Text>
                        <Text style={styles.successMsg}>{successMessage}</Text>
                        <View style={styles.successBadge}>
                            <Check size={14} color="white" strokeWidth={3} />
                            <Text style={styles.successBadgeText}>ACTIVATED</Text>
                        </View>
                    </Animated.View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? 30 : 0 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    backBtn: { padding: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, letterSpacing: -0.5 },

    slide: { width: SCREEN_WIDTH, padding: 24, alignItems: 'center', justifyContent: 'center' },
    planCard: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 30,
        ...Shadows.md,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        position: 'relative',
        minHeight: 520
    },
    premiumCard: {
        borderColor: '#F59E0B60',
        borderWidth: 2,
    },
    midCard: {
        borderColor: Colors.primary + '40',
        borderWidth: 2,
    },
    premiumBadge: {
        position: 'absolute',
        top: -12,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        zIndex: 10
    },
    hugeDiamond: { position: 'absolute', bottom: -20, right: -20, opacity: 0.05 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    cardHeader: { alignItems: 'center', marginBottom: 20 },
    planName: { fontSize: 28, fontWeight: '900', color: Colors.text.primary, marginBottom: 5 },
    planSub: { fontSize: 14, color: Colors.text.tertiary, marginBottom: 15 },
    priceContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    priceValue: { fontSize: 42, fontWeight: '900', color: Colors.text.primary },
    priceLabel: { fontSize: 14, color: Colors.text.tertiary, fontWeight: '600' },

    divider: { height: 1, backgroundColor: '#E2E8F0', width: '100%', marginBottom: 25 },

    featuresList: { flex: 1, gap: 14, marginBottom: 25 },
    twoColumnFeatures: { flexDirection: 'row', gap: 10 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    iconCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    featureText: { fontSize: 15, color: Colors.text.secondary, fontWeight: '500' },
    featureDisabled: { color: '#CBD5E1', textDecorationLine: 'line-through' },

    actionBtn: { borderRadius: 20, overflow: 'hidden', width: '100%' },
    gradientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
    normalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    indicatorContainer: { flexDirection: 'row', alignSelf: 'center', gap: 8, marginBottom: 40 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    successCard: { width: '85%', backgroundColor: 'white', borderRadius: 32, padding: 32, alignItems: 'center', ...Shadows.lg },
    successIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    successTitle: { fontSize: 24, fontWeight: '900', color: Colors.text.primary, marginBottom: 12 },
    successMsg: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    successBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    successBadgeText: { color: 'white', fontSize: 12, fontWeight: '900' },

    trustBox: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingBottom: 20 },
    trustText: { fontSize: 12, color: '#64748B', fontWeight: '500' }
});

export default PricingScreen;
