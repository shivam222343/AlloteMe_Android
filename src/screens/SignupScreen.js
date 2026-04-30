import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { User, Check } from 'lucide-react-native';

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
    
    const { register, sendSignupOtp, verifyOnlyOtp, verifySignupOtp } = useAuth();

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

    return (
        <MainLayout showHeader={false}>
            <View style={styles.container}>
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
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.linkText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: Colors.text.secondary },
    linkText: { color: Colors.primary, fontWeight: 'bold' },
    generalError: { color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: 16 },
});


export default SignupScreen;
