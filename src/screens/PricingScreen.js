import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, SafeAreaView, Platform } from 'react-native';
import { Colors, Shadows, Spacing } from '../constants/theme';
import { Gem, Check, X, ChevronLeft, Zap, Crown, ShieldCheck, Video, Headset, PartyPopper } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLANS = [
    {
        id: 'basic',
        name: 'Basic',
        subtitle: 'Start exploring now',
        price: 'Free',
        priceLabel: 'Forever',
        features: [
            { text: 'Browse All Colleges', included: true },
            { text: 'Admission Notifications', included: true },
            { text: 'College Comparison', included: true },
            { text: 'Live Guidance Sessions', included: false },
            { text: 'Realtime Predictions', included: false },
            { text: 'PDF List Export', included: false },
            { text: 'End-to-End Support', included: false },
        ],
        buttonText: 'Start Free',
        color: '#94A3B8'
    },
    {
        id: 'standard',
        name: 'Standard',
        subtitle: 'Great for planning',
        price: '₹99',
        priceLabel: 'One time',
        isMid: true,
        features: [
            { text: 'Browse All Colleges', included: true },
            { text: '5 College Predictions', included: true },
            { text: '5 PDF & CSV Exports', included: true },
            { text: '1 Live Zoom Consultation', included: true },
            { text: 'Standard Chat Support', included: true },
            { text: 'End-to-End Support', included: false },
            { text: '24/7 Call Support', included: false },
        ],
        buttonText: 'Get Standard',
        color: Colors.primary
    },
    {
        id: 'advance',
        name: 'Advance',
        subtitle: 'The Ultimate Specialist',
        price: '₹249',
        priceLabel: 'One time',
        isPremium: true,
        features: [
            { text: 'Unlimited Predictions', included: true },
            { text: '12 PDF & CSV Exports', included: true },
            { text: 'Weekly Live Zoom Meet', included: true },
            { text: '24/7 WhatsApp & Chat', included: true },
            { text: '24/7 Call Support', included: true },
            { text: 'End-to-End Support', included: true },
            { text: 'Personal Counselor Chat', included: true },
        ],
        buttonText: 'Unlock Premium',
        color: '#F59E0B'
    }
];

const PricingScreen = ({ navigation }) => {
    const scrollViewRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [showSuccess, setShowSuccess] = useState(false);
    const successAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            if (showSuccess) return;
            index = (index + 1) % PLANS.length;
            scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
        }, 5000);
        return () => clearInterval(interval);
    }, [showSuccess]);

    const handleSelectPlan = (plan) => {
        if (plan.id === 'basic') {
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
            }, 3000);
        } else {
            alert(`Premium plans (Standard & Advance) will be active soon! You can use the Basic plan for now. ✨`);
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
                                {plan.features.map((f, idx) => renderFeature(f, idx))}
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
                        <Text style={styles.successMsg}>You've unlocked the Basic Plan. Start exploring colleges now! ✨</Text>
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
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
