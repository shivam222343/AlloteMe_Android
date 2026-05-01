import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, ActivityIndicator, ScrollView } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { User, Check, Mail, Phone, Lock, ArrowRight } from 'lucide-react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useWebGoogleLogin } from '../utils/webAuthHelper';

const SignupScreen = ({ navigation }) => {
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
    
    const { register, sendSignupOtp, verifyOnlyOtp, verifySignupOtp, googleLogin, updateUserProfile } = useAuth();

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
                // Success, navigate away (AuthContext will handle user state)
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

    if (showGoogleComplete) {
        return (
            <MainLayout showHeader={false}>
                <ScrollView contentContainerStyle={styles.container}>
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
                            style={styles.mainBtn}
                            icon={<ArrowRight size={20} color="white" />}
                        />
                    </View>
                </ScrollView>
            </MainLayout>
        );
    }

    return (
        <MainLayout showHeader={false}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Image source={require('../../imgs/splash.png')} style={styles.logo} />
                    <Text style={styles.title}>Join AlloteMe</Text>
                    <Text style={styles.subtitle}>Start your counseling journey</Text>
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
                        style={[styles.mainBtn, !isOtpVerified && styles.disabledBtn]} 
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

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.linkText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { paddingVertical: Spacing.lg },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    logo: {
        width: 380,
        height: 100,
        marginTop: 60,
        marginBottom: 16,
        resizeMode: 'contain',
        borderRadius: 50,
    },
    title: {
        fontSize: 28,
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
    mainBtn: { marginTop: 12 },
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
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: BorderRadius.md || 12,
        height: 50,
        gap: 12,
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
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: Colors.text.secondary },
    linkText: { color: Colors.primary, fontWeight: 'bold' },
    generalError: { color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: 16 },
});


export default SignupScreen;
