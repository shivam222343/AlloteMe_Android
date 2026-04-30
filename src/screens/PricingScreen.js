import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, SafeAreaView, Platform, Alert, Linking, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadows, Spacing } from '../constants/theme';
import { Gem, Check, X, ChevronLeft, ChevronRight, Zap, Crown, ShieldCheck, Video, Headset, PartyPopper, Flame, Ticket, ReceiptText, BadgePercent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../contexts/AuthContext';
import { systemAPI } from '../services/api';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptions';

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

    const [dynamicPlans, setDynamicPlans] = useState(PLANS);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponMessage, setCouponMessage] = useState('');
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

    useEffect(() => {
        // Fetch dynamic pricing from backend
        const fetchPrices = async () => {
            try {
                const res = await systemAPI.getSettings();
                const settings = res.data;
                const updatedPlans = PLANS.map(plan => {
                    if (plan.id === 'standard' && settings.basicPrice) {
                        return { ...plan, price: `₹${settings.basicPrice}` };
                    }
                    if (plan.id === 'advance' && settings.premiumPrice) {
                        return { ...plan, price: `₹${settings.premiumPrice}` };
                    }
                    return plan;
                });
                setDynamicPlans(updatedPlans);
            } catch (err) {
                console.log('Using default prices');
            }
        };
        fetchPrices();

        // Fetch coupons
        const fetchCoupons = async () => {
            try {
                const res = await systemAPI.getCoupons();
                // Filter only active coupons
                const active = res.data.filter(c => c.isActive);
                setAvailableCoupons(active);
            } catch (err) {
                console.log('Failed to fetch coupons');
            }
        };
        fetchCoupons();
    }, []);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        try {
            setCouponMessage('Validating...');
            const res = await systemAPI.validateCoupon(couponCode);
            setAppliedCoupon(res.data);
            setCouponMessage(`Discount Applied: ${res.data.discountPercentage}% OFF`);
        } catch (err) {
            setAppliedCoupon(null);
            setCouponMessage(err.response?.data?.message || 'Invalid Coupon');
        }
    };

    const handleSelectPlan = async (plan) => {
        setSelectedPlanForCheckout(plan);
        setAppliedCoupon(null);
        setCouponMessage('');
        setShowCheckout(true);
    };

    const handleConfirmPayment = async (plan) => {
        let amount = parseInt(plan.price.replace('₹', '')) || 0;
        
        // Define if it is a renewal
        const isActive = user?.subscription?.type === plan.id;
        let isRenewable = false;
        if (isActive && plan.id !== 'free') {
            const activePlanDetails = SUBSCRIPTION_PLANS[plan.id.toUpperCase()];
            const currentUsage = user?.subscription?.usage || {};
            if (activePlanDetails) {
                Object.keys(activePlanDetails.limits).forEach(key => {
                    const limit = activePlanDetails.limits[key];
                    if (limit !== Infinity && (currentUsage[key] || 0) >= limit) {
                        isRenewable = true;
                    }
                });
            }
        }

        // Apply renewal discount 30%
        if (isRenewable && amount > 0) {
            amount = Math.round(amount * 0.7);
        }

        if (appliedCoupon && amount > 0) {
            const discount = (amount * appliedCoupon.discountPercentage) / 100;
            amount = Math.max(0, Math.round(amount - discount));
        }
        
        // Convert to paisa for Razorpay
        amount = amount * 100;
        
        const successHandler = async (paymentId) => {
            if (appliedCoupon) {
                try { await systemAPI.applyCoupon({ code: appliedCoupon.code }); } catch (e) {}
            }
            const updatedSubscription = {
                type: plan.id,
                paymentId: paymentId,
                usage: { aiPrompts: 0, predictions: 0, exports: 0 } // Reset usage on new plan
            };

            // Local storage backup
            const cacheKey = `user_usage_${user._id}`;
            try {
                await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedSubscription.usage));
            } catch (e) { }

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
                if (typeof window !== 'undefined' && window.Razorpay) {
                    const rzp = new window.Razorpay(options);
                    if (rzp && typeof rzp.open === 'function') {
                        rzp.open();
                    } else {
                        throw new Error('Razorpay instance is null or open is not a function');
                    }
                } else {
                    throw new Error('window.Razorpay is not defined. Script might not have loaded.');
                }
            } catch (err) {
                console.error('Razorpay Web Open Error:', err);
                Alert.alert('Payment Error', 'Payment window could not be opened. Please check your internet or try again later.');
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
                RazorpayCheckout = Razorpay?.default || Razorpay;
            } catch (e) {
                console.log('Razorpay module load failed:', e.message);
            }

            // Fallback for Android/iOS if native module is missing (e.g. Expo Go)
            // Safeguard against property access on null/undefined
            if (!RazorpayCheckout || typeof RazorpayCheckout?.open !== 'function') {
                console.log('Native Razorpay not found');
                
                // Final safety check to avoid "property open of null"
                Alert.alert(
                    'In-App Payment Unavailable', 
                    'Would you like to securely open our website to complete the payment?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                            text: 'Open Website', 
                            onPress: () => {
                                Linking.openURL('https://alloteme.in/pricing').catch(() => {
                                    Alert.alert('Error', 'Could not open browser. Please visit https://alloteme.in');
                                });
                            }
                        }
                    ]
                );
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
                    email: user?.email || 'customer@example.com',
                    contact: user?.phone || '',
                    name: user?.displayName || 'Customer'
                },
                theme: { color: Colors.primary }
            };

            // Deeply safe call
            if (RazorpayCheckout?.open) {
                RazorpayCheckout.open(options).then(async (data) => {
                    successHandler(data.razorpay_payment_id);
                }).catch((error) => {
                    console.error('[Razorpay] Checkout Error:', error);
                    const detail = typeof error === 'object' ? (error.description || error.message || JSON.stringify(error)) : String(error);
                    Alert.alert('Payment Error', `Failed to open gateway: ${detail}`);
                });
            }
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
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
                {dynamicPlans.map((plan) => {
                    const isActive = user?.subscription?.type === plan.id;
                    let isRenewable = false;
                    if (isActive && plan.id !== 'free') {
                        const activePlanDetails = SUBSCRIPTION_PLANS[plan.id.toUpperCase()];
                        const currentUsage = user?.subscription?.usage || {};
                        if (activePlanDetails) {
                            Object.keys(activePlanDetails.limits).forEach(key => {
                                const limit = activePlanDetails.limits[key];
                                if (limit !== Infinity && (currentUsage[key] || 0) >= limit) {
                                    isRenewable = true;
                                }
                            });
                        }
                    }

                    let displayPrice = plan.price;
                    let originalPrice = null;
                    if (isRenewable && plan.price !== 'Free') {
                        const rawAmount = parseInt(plan.price.replace('₹', '')) || 0;
                        if (rawAmount > 0) {
                            originalPrice = plan.price;
                            displayPrice = `₹${Math.round(rawAmount * 0.7)}`;
                        }
                    }

                    return (
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
                                    {originalPrice ? (
                                        <Text style={[styles.priceValue, { textDecorationLine: 'line-through', fontSize: 24, color: '#94A3B8', marginRight: 8 }]}>{originalPrice}</Text>
                                    ) : plan.price !== 'Free' && (
                                        <Text style={[styles.priceValue, { textDecorationLine: 'line-through', fontSize: 24, color: '#94A3B8', marginRight: 8 }]}>
                                            ₹{parseInt(plan.price.replace('₹', '')) + 100}
                                        </Text>
                                    )}
                                    <Text style={styles.priceValue}>{displayPrice}</Text>
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

                            {(() => {
                                const planHierarchy = { free: 0, standard: 1, advance: 2 };
                                const userLevel = planHierarchy[user?.subscription?.type] || 0;
                                const currentPlanLevel = planHierarchy[plan.id] || 0;
                                
                                const isIncluded = userLevel > currentPlanLevel;
                                const btnText = isRenewable ? 'Renew Plan (30% Off)' : isActive ? 'Currently Active' : isIncluded ? 'Included in Plan' : plan.buttonText;
                                const isDisabled = (isActive && !isRenewable) || isIncluded;

                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            if (isDisabled) return;
                                            handleSelectPlan(plan);
                                        }}
                                        style={[
                                            styles.actionBtn,
                                            { backgroundColor: plan.color },
                                            (plan.isPremium || plan.isMid) && Shadows.md,
                                            isDisabled && { opacity: 0.7 }
                                        ]}>
                                        {plan.isPremium ? (
                                            <LinearGradient
                                                colors={['#F59E0B', '#D97706']}
                                                style={styles.gradientBtn}
                                            >
                                                <Text style={styles.btnText}>{btnText}</Text>
                                                {isDisabled ? <Check size={16} color="white" /> : <Zap size={16} color="white" fill="white" />}
                                            </LinearGradient>
                                        ) : plan.isMid ? (
                                            <LinearGradient
                                                colors={[Colors.primary, '#4338CA']}
                                                style={styles.gradientBtn}
                                            >
                                                <Text style={styles.btnText}>{btnText}</Text>
                                                {isDisabled ? <Check size={16} color="white" /> : <Zap size={16} color="white" fill="white" />}
                                            </LinearGradient>
                                        ) : (
                                            <View style={styles.normalBtn}>
                                                <Text style={styles.btnText}>{isActive && !isRenewable ? 'Activated' : btnText}</Text>
                                                {isDisabled ? <Check size={16} color="white" /> : <Zap size={16} color="white" fill="white" />}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })()}
                        </View>
                    </View>
                    );
                })}
            </ScrollView>

            <View style={styles.indicatorContainer}>
                {dynamicPlans.map((_, i) => {
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
            </ScrollView>

            {/* Checkout Modal */}
            <Modal
                visible={showCheckout}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCheckout(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.checkoutContainer}>
                        <View style={styles.checkoutHeader}>
                            <View>
                                <Text style={styles.checkoutTitle}>Checkout</Text>
                                <Text style={styles.checkoutSub}>Review your plan & apply coupons</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.closeModalBtn} 
                                onPress={() => setShowCheckout(false)}
                            >
                                <X size={20} color={Colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.checkoutScroll}>
                            {/* Selected Plan Summary */}
                            {selectedPlanForCheckout && (
                                <View style={[styles.planSummaryCard, { borderColor: selectedPlanForCheckout.color + '30' }]}>
                                    <View style={[styles.planSummaryIcon, { backgroundColor: selectedPlanForCheckout.color + '15' }]}>
                                        {selectedPlanForCheckout.isPremium ? <Crown size={24} color={selectedPlanForCheckout.color} /> : <Zap size={24} color={selectedPlanForCheckout.color} />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.summaryPlanName}>{selectedPlanForCheckout.name} Plan</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                            <Text style={[styles.summaryPlanPrice, { textDecorationLine: 'line-through', marginRight: 8 }]}>
                                                ₹{parseInt(selectedPlanForCheckout.price.replace('₹', '')) + 100}
                                            </Text>
                                            <Text style={[styles.summaryPlanPrice, { fontWeight: 'bold', color: Colors.primary }]}>
                                                {selectedPlanForCheckout.price}
                                            </Text>
                                            <Text style={styles.summaryPlanPrice}> / {selectedPlanForCheckout.priceLabel}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.activeBadge}>
                                        <Text style={styles.activeBadgeText}>SELECTED</Text>
                                    </View>
                                </View>
                            )}

                            {/* Available Coupons Section */}
                            <View style={styles.checkoutSection}>
                                <View style={styles.sectionHeader}>
                                    <Ticket size={18} color={Colors.primary} />
                                    <Text style={styles.sectionTitle}>Available Coupons</Text>
                                </View>
                                
                                {availableCoupons.length > 0 ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.couponsList}>
                                        {availableCoupons.map((coupon) => (
                                            <TouchableOpacity 
                                                key={coupon._id}
                                                style={[
                                                    styles.couponCard,
                                                    appliedCoupon?._id === coupon._id && styles.appliedCouponCard
                                                ]}
                                                onPress={() => {
                                                    if (appliedCoupon?._id === coupon._id) {
                                                        setAppliedCoupon(null);
                                                        setCouponMessage('');
                                                    } else {
                                                        setAppliedCoupon(coupon);
                                                        setCouponMessage(`Discount Applied: ${coupon.discountPercentage}% OFF`);
                                                    }
                                                }}
                                            >
                                                <View style={styles.couponTop}>
                                                    <BadgePercent size={14} color={appliedCoupon?._id === coupon._id ? 'white' : Colors.primary} />
                                                    <Text style={[styles.couponCode, appliedCoupon?._id === coupon._id && { color: 'white' }]}>
                                                        {coupon.code}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.couponDiscount, appliedCoupon?._id === coupon._id && { color: 'white' }]}>
                                                    {coupon.discountPercentage}% OFF
                                                </Text>
                                                {appliedCoupon?._id === coupon._id && (
                                                    <View style={styles.appliedCheck}>
                                                        <Check size={10} color={Colors.primary} strokeWidth={4} />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <View style={styles.noCouponBox}>
                                        <Text style={styles.noCouponText}>No coupons available right now.</Text>
                                    </View>
                                )}

                                {/* Manual Coupon Input */}
                                <View style={styles.manualCouponBox}>
                                    <TextInput
                                        style={styles.manualInput}
                                        placeholder="Enter coupon code manually"
                                        value={couponCode}
                                        onChangeText={setCouponCode}
                                        autoCapitalize="characters"
                                    />
                                    <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon}>
                                        <Text style={styles.applyBtnText}>Apply</Text>
                                    </TouchableOpacity>
                                </View>
                                {couponMessage ? (
                                    <Text style={[styles.checkoutCouponMsg, appliedCoupon && { color: '#10b981' }]}>
                                        {couponMessage}
                                    </Text>
                                ) : null}
                            </View>

                            {/* Order Summary / Invoice */}
                            <View style={styles.checkoutSection}>
                                <View style={styles.sectionHeader}>
                                    <ReceiptText size={18} color={Colors.primary} />
                                    <Text style={styles.sectionTitle}>Order Summary</Text>
                                </View>

                                <View style={styles.invoiceCard}>
                                    <View style={styles.invoiceRow}>
                                        <Text style={styles.invoiceLabel}>Base Price</Text>
                                        <Text style={styles.invoiceValue}>{selectedPlanForCheckout?.price}</Text>
                                    </View>
                                    
                                    {appliedCoupon && (
                                        <View style={styles.invoiceRow}>
                                            <View style={styles.discountRow}>
                                                <Text style={styles.invoiceLabel}>Coupon Discount</Text>
                                                <View style={styles.miniCouponTag}>
                                                    <Text style={styles.miniCouponText}>{appliedCoupon.code}</Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.invoiceValue, { color: '#10b981' }]}>
                                                - ₹{Math.round((parseInt(selectedPlanForCheckout?.price.replace('₹', '')) * appliedCoupon.discountPercentage) / 100)}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.invoiceDivider} />
                                    
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Total Amount</Text>
                                        <Text style={styles.totalValue}>
                                            ₹{(() => {
                                                const base = parseInt(selectedPlanForCheckout?.price.replace('₹', '')) || 0;
                                                if (appliedCoupon) {
                                                    const discount = (base * appliedCoupon.discountPercentage) / 100;
                                                    return Math.max(0, Math.round(base - discount));
                                                }
                                                return base;
                                            })()}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.checkoutTrust}>
                                <ShieldCheck size={14} color="#64748B" />
                                <Text style={styles.trustText}>Secure checkout powered by Razorpay</Text>
                            </View>
                        </ScrollView>

                        <View style={styles.checkoutFooter}>
                            <TouchableOpacity 
                                style={[styles.confirmBtn, { backgroundColor: selectedPlanForCheckout?.color || Colors.primary }]}
                                onPress={() => {
                                    setShowCheckout(false);
                                    handleConfirmPayment(selectedPlanForCheckout);
                                }}
                            >
                                <Text style={styles.confirmBtnText}>Confirm & Pay Now</Text>
                                <ChevronRight size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        maxWidth: 400,
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
    trustText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    
    // Checkout Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    checkoutContainer: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: Platform.OS === 'ios' ? 40 : 20, maxHeight: '90%' },
    checkoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    checkoutTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary },
    checkoutSub: { fontSize: 13, color: Colors.text.tertiary, marginTop: 2 },
    closeModalBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    checkoutScroll: { padding: 20 },
    planSummaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1.5, gap: 16, marginBottom: 24 },
    planSummaryIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    summaryPlanName: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    summaryPlanPrice: { fontSize: 14, color: Colors.text.tertiary, marginTop: 2 },
    activeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    activeBadgeText: { fontSize: 10, fontWeight: 'bold', color: Colors.text.tertiary },
    checkoutSection: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    couponsList: { paddingBottom: 10 },
    couponCard: { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 16, padding: 12, width: 130, marginRight: 12, position: 'relative' },
    appliedCouponCard: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    couponTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    couponCode: { fontSize: 13, fontWeight: 'bold', color: Colors.text.primary },
    couponDiscount: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
    appliedCheck: { position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
    noCouponBox: { padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center' },
    noCouponText: { fontSize: 12, color: Colors.text.tertiary },
    manualCouponBox: { flexDirection: 'row', marginTop: 12, gap: 8 },
    manualInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 14, borderWidth: 1, borderColor: '#e2e8f0' },
    applyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
    applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    checkoutCouponMsg: { marginTop: 8, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
    invoiceCard: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, gap: 12 },
    invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    discountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    miniCouponTag: { backgroundColor: '#10b98115', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniCouponText: { fontSize: 10, fontWeight: 'bold', color: '#10b981' },
    invoiceLabel: { fontSize: 14, color: Colors.text.tertiary },
    invoiceValue: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    invoiceDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    totalValue: { fontSize: 20, fontWeight: '900', color: Colors.primary },
    checkoutTrust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
    checkoutFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, gap: 12, ...Shadows.md },
    confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default PricingScreen;
