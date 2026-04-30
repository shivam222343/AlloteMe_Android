import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { authAPI } from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Mail, Lock, Key, ChevronLeft, CheckCircle } from 'lucide-react-native';
import MainLayout from '../components/layouts/MainLayout';

const ForgotPasswordScreen = ({ navigation }) => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOTP = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        setLoading(true);
        try {
            const res = await authAPI.forgotPassword(email);
            if (res.data.success) {
                setStep(2);
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit code');
            return;
        }
        // In this flow, we just move to next step and verify OTP during final reset call
        // Or we could have a separate verify endpoint. The reset endpoint handles it.
        setStep(3);
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await authAPI.resetPassword({ email, otp, newPassword });
            if (res.data.success) {
                setStep(4);
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.iconCircle}>
                            <Mail size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.stepTitle}>Forgot Password?</Text>
                        <Text style={styles.stepDesc}>Enter your email address and we'll send you a 6-digit code to reset your password.</Text>
                        
                        <Card style={styles.card}>
                            <Input
                                label="Email Address"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="name@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                leftIcon={<Mail size={18} color={Colors.text.tertiary} />}
                            />
                            <Button
                                title="Send Reset Code"
                                onPress={handleSendOTP}
                                loading={loading}
                                style={styles.submitBtn}
                            />
                        </Card>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.iconCircle}>
                            <Key size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.stepTitle}>Verify OTP</Text>
                        <Text style={styles.stepDesc}>We've sent a 6-digit verification code to {email}.</Text>
                        
                        <Card style={styles.card}>
                            <Input
                                label="Verification Code"
                                value={otp}
                                onChangeText={setOtp}
                                placeholder="000000"
                                keyboardType="number-pad"
                                maxLength={6}
                                leftIcon={<Key size={18} color={Colors.text.tertiary} />}
                            />
                            <Button
                                title="Verify Code"
                                onPress={handleVerifyOTP}
                                style={styles.submitBtn}
                            />
                            <TouchableOpacity onPress={handleSendOTP} style={styles.resendBtn}>
                                <Text style={styles.resendText}>Didn't receive a code? <Text style={styles.resendLink}>Resend</Text></Text>
                            </TouchableOpacity>
                        </Card>
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.iconCircle}>
                            <Lock size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.stepTitle}>Set New Password</Text>
                        <Text style={styles.stepDesc}>Almost there! Enter a secure new password for your account.</Text>
                        
                        <Card style={styles.card}>
                            <Input
                                label="New Password"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="••••••••"
                                secureTextEntry
                                leftIcon={<Lock size={18} color={Colors.text.tertiary} />}
                            />
                            <Input
                                label="Confirm New Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="••••••••"
                                secureTextEntry
                                leftIcon={<Lock size={18} color={Colors.text.tertiary} />}
                            />
                            <Button
                                title="Reset Password"
                                onPress={handleResetPassword}
                                loading={loading}
                                style={styles.submitBtn}
                            />
                        </Card>
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.iconCircleSuccess}>
                            <CheckCircle size={48} color={Colors.success} />
                        </View>
                        <Text style={styles.stepTitle}>Password Reset!</Text>
                        <Text style={styles.stepDesc}>Your password has been successfully updated. You can now log in with your new credentials.</Text>
                        
                        <Button
                            title="Back to Login"
                            onPress={() => navigation.navigate('Login')}
                            style={styles.fullWidthBtn}
                        />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <MainLayout showHeader={false}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity 
                        style={styles.backBtn}
                        onPress={() => step > 1 && step < 4 ? setStep(step - 1) : navigation.goBack()}
                    >
                        <ChevronLeft size={24} color={Colors.text.primary} />
                    </TouchableOpacity>

                    {renderStep()}
                </ScrollView>
            </KeyboardAvoidingView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { padding: 24, paddingTop: 60 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.sm, marginBottom: 30 },
    stepContainer: { alignItems: 'center' },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    iconCircleSuccess: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.success + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    stepTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 12, textAlign: 'center' },
    stepDesc: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 20 },
    card: { width: '100%', padding: 16 },
    submitBtn: { marginTop: 12 },
    resendBtn: { marginTop: 20, alignItems: 'center' },
    resendText: { fontSize: 14, color: Colors.text.tertiary },
    resendLink: { color: Colors.primary, fontWeight: 'bold' },
    fullWidthBtn: { width: '100%', marginTop: 20 },
});

export default ForgotPasswordScreen;
