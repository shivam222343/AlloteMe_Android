import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, Animated, Dimensions } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useWebGoogleLogin } from '../utils/webAuthHelper';

const INTRO_SLIDES = [
    {
        title: "Browse & Search Colleges",
        description: "Explore government, autonomous and private colleges in Maharashtra with cutoffs, fees, and contact info.",
        image: require('../../assets/intro_browse.png'),
        bgColor: '#F0F7FF',
    },
    {
        title: "Precise College Predictor",
        description: "Enter your percentile, rank, category, and quotas to get recommendations tailored to your profile.",
        image: require('../../assets/intro_predictor.png'),
        bgColor: '#F5F3FF',
    },
    {
        title: "24/7 AI Counseling Assistant",
        description: "Get instant answers to your questions, explore branches, fee structures, and document requirements.",
        image: require('../../assets/intro_counselor.png'),
        bgColor: '#F0FDF4',
    },
    {
        title: "Document Verification Checklist",
        description: "Track necessary documents for OPEN, OBC, SC, ST, EWS, SEBC, NT/SBC categories for verification.",
        image: require('../../assets/intro_documents.png'),
        bgColor: '#FFF7ED',
    },
    {
        title: "Map & Nearby Colleges",
        description: "Locate engineering colleges near your location with route maps and road distances.",
        image: require('../../assets/intro_nearby.png'),
        bgColor: '#FFF1F2',
    },
];

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, googleLogin } = useAuth();

    const [activeSlide, setActiveSlide] = useState(0);
    const [prevSlide, setPrevSlide] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const [windowWidth, setWindowWidth] = useState(() => Dimensions.get('window').width);
    const isDesktop = Platform.OS === 'web' && windowWidth >= 768;

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setWindowWidth(window.width);
        });
        return () => subscription?.remove();
    }, []);

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

    useEffect(() => {
        if (!isDesktop) return;
        const interval = setInterval(() => {
            handleSlideChange((activeSlide + 1) % INTRO_SLIDES.length);
        }, 4500);
        return () => clearInterval(interval);
    }, [isDesktop, activeSlide, handleSlideChange]);

    const loginWeb = useWebGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const idToken = tokenResponse.credential;
            const accessToken = tokenResponse.access_token;
            if (idToken || accessToken) {
                const result = await googleLogin({ idToken, accessToken });
                if (!result.success) setError(result.message);
            }
        },
        onError: () => setError('Google Login failed on Web'),
        flow: 'implicit',
    });

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const result = await login({ email, password });
            setLoading(false);
            if (!result.success) {
                const msg = result.message.toLowerCase();
                if (msg.includes('network') || msg.includes('timeout')) {
                    setError('Network issue! Check your connection');
                } else if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('unauthorized')) {
                    setError('Invalid credentials — check email or password');
                } else {
                    setError(result.message);
                }
            }
        } catch (err) {
            setLoading(false);
            setError('Network issue! Check your connection');
        }
    };

    const handleGoogleLogin = async () => {
        if (Platform.OS === 'web') {
            loginWeb();
            return;
        }
        try {
            setLoading(true);
            setError('');
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken || userInfo.idToken;
            if (!idToken) throw new Error('No ID token received from Google');
            const result = await googleLogin({ idToken });
            if (!result.success) setError(result.message);
        } catch (err) {
            setError('Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const renderGuideSlider = () => {
        const sliderIndex = activeSlide < INTRO_SLIDES.length ? activeSlide : 0;
        const prevSliderIndex = prevSlide < INTRO_SLIDES.length ? prevSlide : 0;

        const opacityCurrent = fadeAnim;
        const opacityPrev = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
        const scaleCurrent = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.0] });
        const scalePrev = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.08] });

        return (
            <View style={styles.sliderContent}>
                <View style={styles.imageWrapper}>
                    {prevSliderIndex !== sliderIndex && (
                        <Animated.Image
                            source={INTRO_SLIDES[prevSliderIndex].image}
                            style={[styles.slideImage, styles.absoluteImage, { opacity: opacityPrev, transform: [{ scale: scalePrev }] }]}
                        />
                    )}
                    <Animated.Image
                        source={INTRO_SLIDES[sliderIndex].image}
                        style={[styles.slideImage, { opacity: opacityCurrent, transform: [{ scale: scaleCurrent }] }]}
                    />
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.slideTitle}>{INTRO_SLIDES[sliderIndex].title}</Text>
                    <Text style={styles.slideDescription}>{INTRO_SLIDES[sliderIndex].description}</Text>
                </View>

                <View style={styles.dotsContainer}>
                    {INTRO_SLIDES.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleSlideChange(index)}
                            style={[styles.dot, sliderIndex === index ? styles.activeDot : styles.inactiveDot]}
                        />
                    ))}
                </View>
            </View>
        );
    };

    const renderLoginForm = () => (
        <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.formContentContainer}
            style={styles.formScroll}
        >
            <View style={styles.formWrapper}>
                <View style={styles.formHeader}>
                    <Image source={require('../../imgs/splash.png')} style={styles.logo} />
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue your counseling journey</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.formFields}>
                    <Input
                        label="Email Address"
                        value={email}
                        onChangeText={(val) => { setEmail(val); if (error) setError(''); }}
                        placeholder="Enter your email"
                        keyboardType="email-address"
                    />

                    <Input
                        label="Password"
                        value={password}
                        onChangeText={(val) => { setPassword(val); if (error) setError(''); }}
                        placeholder="Enter your password"
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.forgotPassword}
                        onPress={() => navigation.navigate('ForgotPassword')}
                    >
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <Button
                        title="Sign In"
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.loginBtn}
                    />

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.line} />
                    </View>

                    <TouchableOpacity
                        style={styles.googleBtn}
                        onPress={handleGoogleLogin}
                        disabled={loading}
                    >
                        <Image source={require('../../imgs/google.png')} style={styles.googleIcon} />
                        <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Signup', { skipIntro: true })}>
                        <Text style={styles.linkText}>Create Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );

    // ── Desktop split-pane layout ──────────────────────────────────────────────
    if (isDesktop) {
        return (
            <View style={styles.desktopContainer}>
                <View style={[styles.desktopLeft, { backgroundColor: INTRO_SLIDES[activeSlide].bgColor }]}>
                    {renderGuideSlider()}
                </View>
                <View style={styles.desktopRight}>
                    {renderLoginForm()}
                </View>
            </View>
        );
    }

    // ── Mobile layout ──────────────────────────────────────────────────────────
    return (
        <MainLayout showHeader={false} style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={Platform.OS === 'web'}
                contentContainerStyle={styles.mobileContentContainer}
                style={styles.mobileScroll}
            >
                <View style={styles.formWrapper}>
                    <View style={styles.formHeader}>
                        <Image source={require('../../imgs/splash.png')} style={styles.logo} />
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue your counseling journey</Text>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.formFields}>
                        <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" />
                        <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />

                        <TouchableOpacity style={styles.forgotPassword} onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.loginBtn} />

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.line} />
                        </View>

                        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={loading}>
                            <Image source={require('../../imgs/google.png')} style={styles.googleIcon} />
                            <Text style={styles.googleBtnText}>Continue with Google</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Signup', { skipIntro: true })}>
                            <Text style={styles.linkText}>Create Account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // ── Desktop split-pane ────────────────────────────────────────────────────
    desktopContainer: {
        flexDirection: 'row',
        flex: 1,
        ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : { height: '100%' }),
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

    // ── Slider ────────────────────────────────────────────────────────────────
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
        minHeight: 40,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: Spacing.lg,
        gap: 8,
    },
    dot: { height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
    activeDot: { width: 24, backgroundColor: Colors.primary },
    inactiveDot: { width: 8 },

    // ── Form (shared desktop right panel + mobile) ────────────────────────────
    formScroll: {
        flex: 1,
        backgroundColor: Colors.white,
        ...(Platform.OS === 'web'
            ? { height: '100vh', overflowY: 'scroll', scrollbarWidth: 'thin' }
            : {}),
    },
    formContentContainer: {
        paddingHorizontal: Spacing.xl,
        paddingTop: 40,
        paddingBottom: 60,
        flexGrow: 1,
    },
    mobileScroll: {
        flex: 1,
        ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'auto' } : {}),
    },
    mobileContentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: Spacing.xl,
    },
    formWrapper: {
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 450 : '100%',
        alignSelf: 'center',
        gap: 12,
    },
    formHeader: {
        marginBottom: 24,
        alignItems: 'center',
    },
    logo: {
        width: 320,
        height: 85,
        marginTop: 15,
        marginBottom: 8,
        resizeMode: 'contain',
        borderRadius: 50,
    },
    title: {
        fontSize: Typography.fontSize['3xl'],
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text.primary,
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.text.secondary,
        textAlign: 'center',
    },
    formFields: { gap: 12 },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 4,
    },
    forgotText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.medium,
    },
    loginBtn: {
        marginTop: 6,
        borderRadius: 9999,
        paddingVertical: 14,
        ...Shadows.md,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    line: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    dividerText: {
        marginHorizontal: 16,
        color: Colors.text.tertiary,
        fontSize: 12,
        fontWeight: '600',
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
    googleIcon: { width: 24, height: 24 },
    googleBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    errorText: {
        color: Colors.error,
        textAlign: 'center',
        marginBottom: 8,
        fontSize: 13,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: { color: Colors.text.secondary },
    linkText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
});

export default LoginScreen;
