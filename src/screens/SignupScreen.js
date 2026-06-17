import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, ActivityIndicator, ScrollView, Animated, Dimensions } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { User, Check, Mail, Phone, Lock, ArrowRight } from 'lucide-react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useWebGoogleLogin } from '../utils/webAuthHelper';

const INTRO_SLIDES = [
    {
        title: "Browse & Search Colleges",
        description: "Explore government autonomous and private colleges in Maharashtra with cutoffs, fees, and contact info.",
        image: require('../../assets/intro_browse.png'),
        bgColor: '#F0F7FF' // Light pastel blue
    },
    {
        title: "Precise College Predictor",
        description: "Enter your percentile, rank, category, and quotas to get recommendations tailored to your profile.",
        image: require('../../assets/intro_predictor.png'),
        bgColor: '#F5F3FF' // Soft violet tint
    },
    {
        title: "24/7 AI Counseling Assistant",
        description: "Get instant answers to your questions, explore branches, fee structures, and document requirements.",
        image: require('../../assets/intro_counselor.png'),
        bgColor: '#F0FDF4' // Soft mint tint
    },
    {
        title: "Document Verification Checklist",
        description: "Track necessary documents for OPEN, OBC, SC, ST, EWS, SEBC, NT/SBC categories for verification.",
        image: require('../../assets/intro_documents.png'),
        bgColor: '#FFF7ED' // Soft orange tint
    },
    {
        title: "Map & Nearby Colleges",
        description: "Locate engineering colleges near your location with route maps and road distances.",
        image: require('../../assets/intro_nearby.png'),
        bgColor: '#FFF1F2' // Soft rose tint
    }
];

const SignupScreen = ({ route, navigation }) => {
    const routeParams = route?.params || {};
    const skipIntroParam = routeParams.skipIntro;

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'student',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showOtpField, setShowOtpField] = useState(false);
    const [otp, setOtp] = useState('');
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [showGoogleComplete, setShowGoogleComplete] = useState(false);

    // Intro Slider States
    const [activeSlide, setActiveSlide] = useState(() => (skipIntroParam ? 5 : 0));
    const [prevSlide, setPrevSlide] = useState(() => (skipIntroParam ? 5 : 0));
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Window dimensions state for responsive web layout
    const [windowWidth, setWindowWidth] = useState(() => Dimensions.get('window').width);
    const isDesktop = Platform.OS === 'web' && windowWidth >= 768;

    const { register, sendSignupOtp, verifyOnlyOtp, verifySignupOtp, googleLogin, updateUserProfile } = useAuth();

    // Listen to skipIntro param changes
    useEffect(() => {
        if (skipIntroParam) {
            setActiveSlide(5);
            setPrevSlide(5);
            if (navigation && typeof navigation.setParams === 'function') {
                navigation.setParams({ skipIntro: undefined });
            }
        }
    }, [skipIntroParam]);

    // Handle viewport changes dynamically
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setWindowWidth(window.width);
        });
        return () => subscription?.remove();
    }, []);

    // Slide transition animation handler
    const handleSlideChange = useCallback((nextIndex) => {
        setPrevSlide(activeSlide);
        setActiveSlide(nextIndex);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, [activeSlide, fadeAnim]);

    // Autoplay slider on desktop layout
    useEffect(() => {
        if (!isDesktop || activeSlide >= 5) return;

        const interval = setInterval(() => {
            handleSlideChange((activeSlide + 1) % INTRO_SLIDES.length);
        }, 4500);

        return () => clearInterval(interval);
    }, [isDesktop, activeSlide, handleSlideChange]);

    const loginWeb = useWebGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                const idToken = tokenResponse.credential;
                const accessToken = tokenResponse.access_token;
                const result = await googleLogin({ idToken, accessToken });

                if (result.success) {
                    if (result.isNewUser) {
                        setFormData(prev => ({
                            ...prev,
                            displayName: result.user.displayName || '',
                            email: result.user.email || ''
                        }));
                        setShowGoogleComplete(true);
                    }
                } else {
                    setErrors({ general: result.message });
                }
            } catch (err) {
                setErrors({ general: 'Google signup failed' });
            } finally {
                setLoading(false);
            }
        },
        onError: () => setErrors({ general: 'Google login failed on Web' })
    });

    const handleGoogleSignup = async () => {
        if (Platform.OS === 'web') {
            loginWeb();
            return;
        }

        try {
            setLoading(true);
            setErrors({});
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken || userInfo.idToken;

            const result = await googleLogin({ idToken });
            if (result.success) {
                if (result.isNewUser) {
                    setFormData(prev => ({
                        ...prev,
                        displayName: result.user.displayName || '',
                        email: result.user.email || ''
                    }));
                    setShowGoogleComplete(true);
                }
            } else {
                setErrors({ general: result.message });
            }
        } catch (err) {
            console.error('Google Signup Error:', err);
            setErrors({ general: 'Google sign-in failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteGoogleProfile = async () => {
        const newErrors = {};
        if (!formData.displayName) newErrors.displayName = 'Full Name is required';
        if (!formData.phoneNumber) newErrors.phoneNumber = 'Contact number is required';
        if (formData.password && formData.password.length < 8) newErrors.password = 'Password must be 8+ chars';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const result = await updateUserProfile({
                displayName: formData.displayName,
                phoneNumber: formData.phoneNumber,
                password: formData.password || undefined // Only update if entered
            });

            if (result.success) {
                navigation.navigate('MainTabs');
            } else {
                setErrors({ general: result.message });
            }
        } catch (err) {
            setErrors({ general: 'Failed to complete profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            setErrors({ email: 'Please enter an email address first' });
            return;
        }
        if (!emailRegex.test(formData.email)) {
            setErrors({ email: 'Enter a valid email address' });
            return;
        }
        setErrors({});
        setOtpLoading(true);
        try {
            const result = await sendSignupOtp(formData.email);
            if (result.success) {
                setShowOtpField(true);
            } else {
                setErrors({ email: result.message });
            }
        } catch (err) {
            setErrors({ email: 'Failed to send OTP' });
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            setErrors({ otp: 'Enter 6-digit OTP' });
            return;
        }
        setErrors({});
        setOtpLoading(true);
        try {
            const result = await verifyOnlyOtp(formData.email, otp);
            if (result.success) {
                setIsOtpVerified(true);
            } else {
                setErrors({ otp: result.message });
            }
        } catch (err) {
            setErrors({ otp: 'Verification failed' });
        } finally {
            setOtpLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!isOtpVerified) return;

        const newErrors = {};
        if (!formData.displayName) newErrors.displayName = 'Full Name is required';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters long';
        if (!formData.phoneNumber) newErrors.phoneNumber = 'Contact number is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const result = await verifySignupOtp({ ...formData, otp });
            setLoading(false);
            if (!result.success) {
                setErrors({ general: result.message });
            }
        } catch (err) {
            setLoading(false);
            setErrors({ general: 'Registration failed' });
        }
    };

    const renderGoogleCompleteForm = () => {
        return (
            <MainLayout showHeader={false} style={styles.container}>
                <ScrollView
                    showsVerticalScrollIndicator={Platform.OS === 'web'}
                    contentContainerStyle={styles.contentContainer}
                    style={styles.content}
                >
                    <View style={styles.header}>
                        <Image source={require('../../imgs/splash.png')} style={styles.logo} />
                        <Text style={styles.title}>One last step! 🚀</Text>
                        <Text style={styles.subtitle}>Complete your profile to continue</Text>
                    </View>

                    {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

                    <View style={styles.form}>
                        <Input
                            label="Full Name"
                            value={formData.displayName}
                            onChangeText={(val) => {
                                setFormData({ ...formData, displayName: val });
                                if (errors.displayName) setErrors({ ...errors, displayName: null });
                            }}
                            placeholder="Confirm your name"
                            leftIcon={<User size={20} color={Colors.text.secondary} />}
                            error={errors.displayName}
                        />

                        <Input
                            label="Email Address"
                            value={formData.email}
                            editable={false}
                            leftIcon={<Mail size={20} color={Colors.text.secondary} />}
                            style={{ opacity: 0.7 }}
                        />

                        <Input
                            label="Contact Number"
                            value={formData.phoneNumber}
                            onChangeText={(val) => {
                                setFormData({ ...formData, phoneNumber: val });
                                if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: null });
                            }}
                            placeholder="e.g. 9876543210"
                            keyboardType="number-pad"
                            maxLength={10}
                            leftIcon={<Phone size={20} color={Colors.text.secondary} />}
                            error={errors.phoneNumber}
                        />

                        <Input
                            label="Set Password (Optional)"
                            value={formData.password}
                            onChangeText={(val) => {
                                setFormData({ ...formData, password: val });
                                if (errors.password) setErrors({ ...errors, password: null });
                            }}
                            placeholder="Create a login password"
                            secureTextEntry
                            leftIcon={<Lock size={20} color={Colors.text.secondary} />}
                            error={errors.password}
                        />

                        <Button
                            title="Complete Setup"
                            onPress={handleCompleteGoogleProfile}
                            loading={loading}
                            style={styles.completeBtn}
                            icon={<ArrowRight size={20} color="white" />}
                        />
                    </View>
                </ScrollView>
            </MainLayout>
        );
    };

    const renderRegistrationForm = () => {
        return (
            <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.formContentContainer}
                style={styles.formScroll}
            >
                <View style={styles.formWrapper}>
                    <View style={styles.formHeader}>
                        <Image source={require('../../imgs/splash.png')} style={styles.logo} />
                    </View>

                    {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

                    <View style={styles.formFields}>
                        <Input
                            label="Full Name"
                            value={formData.displayName}
                            onChangeText={(val) => {
                                setFormData({ ...formData, displayName: val });
                                if (errors.displayName) setErrors({ ...errors, displayName: null });
                            }}
                            placeholder="e.g. John Doe"
                            error={errors.displayName}
                        />

                        <View style={styles.inputGroup}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Email Address"
                                    value={formData.email}
                                    onChangeText={(val) => {
                                        setFormData({ ...formData, email: val });
                                        setIsOtpVerified(false);
                                        if (errors.email) setErrors({ ...errors, email: null });
                                    }}
                                    placeholder="johnt@example.com"
                                    keyboardType="email-address"
                                    editable={!isOtpVerified}
                                    error={errors.email}
                                />
                            </View>
                            {!isOtpVerified && (
                                <TouchableOpacity
                                    style={[styles.inlineBtn, { marginTop: 28 }]}
                                    onPress={handleSendOtp}
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={styles.inlineBtnText}>{showOtpField ? 'Resend' : 'Send OTP'}</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                            {isOtpVerified && (
                                <View style={[styles.verifiedBadge, { marginTop: 28 }]}>
                                    <Check size={16} color="white" />
                                </View>
                            )}
                        </View>

                        {showOtpField && !isOtpVerified && (
                            <View style={styles.inputGroup}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="OTP Code"
                                        value={otp}
                                        onChangeText={(t) => {
                                            setOtp(t);
                                            if (errors.otp) setErrors({ ...errors, otp: null });
                                        }}
                                        placeholder="6-digit code"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        error={errors.otp}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.inlineBtn, { marginTop: 28, backgroundColor: Colors.success || '#10b981' }]}
                                    onPress={handleVerifyOtp}
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={styles.inlineBtnText}>Verify</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        <Input
                            label="Password"
                            value={formData.password}
                            onChangeText={(val) => {
                                setFormData({ ...formData, password: val });
                                if (errors.password) setErrors({ ...errors, password: null });
                            }}
                            placeholder="Create a strong password"
                            secureTextEntry
                            error={errors.password}
                        />

                        <Input
                            label="Contact Number"
                            value={formData.phoneNumber}
                            onChangeText={(val) => {
                                setFormData({ ...formData, phoneNumber: val });
                                if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: null });
                            }}
                            placeholder="e.g. 9876543210"
                            keyboardType="number-pad"
                            maxLength={10}
                            error={errors.phoneNumber}
                        />

                        <Button
                            title="Register"
                            onPress={handleSignup}
                            loading={loading}
                            style={[
                                styles.registerBtn,
                                !isOtpVerified && styles.disabledBtn
                            ]}
                            disabled={!isOtpVerified}
                        />

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.line} />
                        </View>

                        <TouchableOpacity
                            style={styles.googleBtn}
                            onPress={handleGoogleSignup}
                            disabled={loading}
                        >
                            <Image source={require('../../imgs/google.png')} style={styles.googleIcon} />
                            <Text style={styles.googleBtnText}>Continue with Google</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formFooter}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        );
    };

    const renderGuideSlider = () => {
        // Clamp slider index to ensure no index out of bounds during transition to form
        const sliderIndex = activeSlide < 5 ? activeSlide : 4;
        const prevSliderIndex = prevSlide < 5 ? prevSlide : 4;

        const activeSlideData = INTRO_SLIDES[sliderIndex];
        const prevSlideData = INTRO_SLIDES[prevSliderIndex];

        const opacityCurrent = fadeAnim;
        const opacityPrev = fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0]
        });

        const scaleCurrent = fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.92, 1.0]
        });
        const scalePrev = fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1.0, 1.08]
        });

        return (
            <View style={styles.sliderContent}>
                {/* Image Showcase Container */}
                <View style={styles.imageWrapper}>
                    {prevSliderIndex !== sliderIndex && (
                        <Animated.Image
                            source={prevSlideData.image}
                            style={[
                                styles.slideImage,
                                styles.absoluteImage,
                                {
                                    opacity: opacityPrev,
                                    transform: [{ scale: scalePrev }]
                                }
                            ]}
                        />
                    )}
                    <Animated.Image
                        source={activeSlideData.image}
                        style={[
                            styles.slideImage,
                            {
                                opacity: opacityCurrent,
                                transform: [{ scale: scaleCurrent }]
                            }
                        ]}
                    />
                </View>

                {/* Info guide text */}
                <View style={styles.infoContainer}>
                    <Text style={styles.slideTitle}>{activeSlideData.title}</Text>
                    <Text style={styles.slideDescription}>{activeSlideData.description}</Text>
                </View>

                {/* Pagination Dots */}
                <View style={styles.dotsContainer}>
                    {INTRO_SLIDES.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleSlideChange(index)}
                            style={[
                                styles.dot,
                                sliderIndex === index ? styles.activeDot : styles.inactiveDot
                            ]}
                        />
                    ))}
                </View>

                {/* Action Buttons (Only visible on mobile onboarding flow) */}
                {!isDesktop && (
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            onPress={() => handleSlideChange(5)}
                            style={styles.skipBtn}
                        >
                            <Text style={styles.skipBtnText}>Skip</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                if (sliderIndex < INTRO_SLIDES.length - 1) {
                                    handleSlideChange(sliderIndex + 1);
                                } else {
                                    handleSlideChange(5);
                                }
                            }}
                            style={styles.nextBtn}
                        >
                            <Text style={styles.nextBtnText}>
                                {sliderIndex === INTRO_SLIDES.length - 1 ? "Get Started" : "Next"}
                            </Text>
                            <ArrowRight size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (showGoogleComplete) {
        return renderGoogleCompleteForm();
    }

    if (isDesktop) {
        return (
            <View style={styles.desktopContainer}>
                <View style={[styles.desktopLeft, { backgroundColor: INTRO_SLIDES[activeSlide < 5 ? activeSlide : 4].bgColor }]}>
                    {renderGuideSlider()}
                </View>
                <View style={styles.desktopRight}>
                    {renderRegistrationForm()}
                </View>
            </View>
        );
    }

    // Mobile/Tablet Layout
    return (
        <MainLayout showHeader={false} style={[styles.container, activeSlide < 5 && { backgroundColor: INTRO_SLIDES[activeSlide].bgColor }]}>
            {activeSlide < 5 ? renderGuideSlider() : renderRegistrationForm()}
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'auto' } : {}),
    },
    contentContainer: {
        flexGrow: 1,
        paddingVertical: 40,
        ...(Platform.OS === 'web' ? { minHeight: '100%' } : {}),
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    logo: {
        width: 320,
        height: 85,
        marginTop: 15,
        marginBottom: 4,
        resizeMode: 'contain',
        borderRadius: 50,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 4,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center'
    },
    form: { gap: 4 },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    inlineBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        height: 50, // Match Input height
        borderRadius: BorderRadius.md || 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inlineBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    verifiedBadge: {
        backgroundColor: Colors.success || '#10b981',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    disabledBtn: {
        opacity: 0.5,
        backgroundColor: Colors.text.tertiary,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        paddingHorizontal: 16,
        color: Colors.text.tertiary,
        fontSize: 14,
        fontWeight: '500',
    },
    googleIcon: {
        width: 24,
        height: 24,
    },
    googleBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    generalError: { color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: 16 },

    // Fully-rounded Action Buttons
    completeBtn: {
        marginTop: 16,
        borderRadius: 9999,
        paddingVertical: 14,
        ...Shadows.md,
    },
    registerBtn: {
        marginTop: 16,
        borderRadius: 9999,
        paddingVertical: 14,
        ...Shadows.md,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 9999,
        height: 50,
        gap: 12,
        ...Shadows.sm,
    },

    // Desktop/Responsive Web Styles
    desktopContainer: {
        flexDirection: 'row',
        flex: 1,
        ...(Platform.OS === 'web'
            ? {
                  height: '100vh',
                  overflow: 'hidden',
              }
            : { height: '100%' }),
    },
    desktopLeft: {
        width: '50%',
        height: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        transition: 'background-color 0.5s ease',
    },
    desktopRight: {
        width: '50%',
        height: '100vh',
        backgroundColor: Colors.white,
        overflow: 'hidden',
    },
    formWrapper: {
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 450 : '100%',
        alignSelf: 'center',
        gap: 12,
    },

    // Guide/Slider UI Components
    sliderContent: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
    },
    imageWrapper: {
        width: 250,
        height: 480,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        alignSelf: 'center',
        marginVertical: Spacing.sm,
        position: 'relative',
        ...Shadows.lg,
    },
    slideImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    absoluteImage: {
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    },
    infoContainer: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        height: 125,
        justifyContent: 'center',
    },
    slideTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    slideDescription: {
        fontSize: 14,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        minHeight: 40, // Avoid layout jumping for multi-line text
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: Spacing.lg,
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    activeDot: {
        width: 24,
        backgroundColor: Colors.primary,
    },
    inactiveDot: {
        width: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.xs,
        width: '100%',
        maxWidth: 320,
        alignSelf: 'center',
    },
    nextBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...Shadows.md,
    },
    nextBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    skipBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    skipBtnText: {
        color: Colors.text.secondary,
        fontWeight: '600',
        fontSize: 15,
    },

    // Signup Form Styles
    formScroll: {
        flex: 1,
        backgroundColor: Colors.white,
        ...(Platform.OS === 'web'
            ? {
                  height: '100vh',
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin', // Firefox
              }
            : {}),
    },
    formContentContainer: {
        paddingHorizontal: Spacing.xl,
        paddingTop: 40,
        paddingBottom: 60,
        flexGrow: 1,
    },
    formHeader: {
        marginBottom: 24,
        alignItems: 'center',
    },
    formTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 4,
        textAlign: 'center'
    },
    formSubtitle: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center'
    },
    formFields: {
        gap: 12,
    },
    formFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        color: Colors.text.secondary,
    },
    linkText: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
});

export default SignupScreen;
