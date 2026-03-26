import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { MessageSquare, Phone, ChevronRight, CheckCircle2, AlertCircle, X } from 'lucide-react-native';
import { authAPI } from '../../services/api';

const VerificationBanner = ({ user, onVerified }) => {
    const [step, setStep] = useState(1); // 1: Initial Prompt, 2: Phone Input, 3: OTP Input
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerifyPhone = async () => {
        if (phoneNumber.length < 10) {
            setError('Please enter a valid 10-digit number');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await authAPI.verifyPhone(phoneNumber);
            Alert.alert('Success', 'Phone number linked successfully!');
            if (onVerified) onVerified();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update phone number');
        } finally {
            setLoading(false);
        }
    };

    if (user?.isVerified) return null;

    return (
        <View style={styles.container}>
            {step === 1 && (
                <View style={styles.promptRow}>
                    <View style={styles.iconBox}>
                        <MessageSquare size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.textContent}>
                        <Text style={styles.title}>Verify your account</Text>
                        <Text style={styles.desc}>Link your WhatsApp for real-time updates</Text>
                    </View>
                    <TouchableOpacity style={styles.verifyBtn} onPress={() => setStep(2)}>
                        <Text style={styles.verifyBtnText}>Verify Now</Text>
                        <ChevronRight size={14} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            )}

            {step === 2 && (
                <View style={styles.inputArea}>
                    <View style={styles.headerRow}>
                        <Text style={styles.label}>Enter WhatsApp Number</Text>
                        <TouchableOpacity onPress={() => setStep(1)}><X size={18} color={Colors.text.tertiary} /></TouchableOpacity>
                    </View>
                    <View style={styles.inputWrap}>
                        <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
                        <TextInput
                            style={styles.input}
                            placeholder="8010XXXXXX"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            autoFocus
                        />
                    </View>
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyPhone} disabled={loading}>
                        {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.submitBtnText}>Verify WhatsApp Number</Text>}
                    </TouchableOpacity>
                    <Text style={styles.footerNote}>Updates will be sent from AlloteMe Support</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F0FDFA',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#CCFBF1',
        ...Shadows.xs
    },
    promptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E1F8F4', justifyContent: 'center', alignItems: 'center' },
    textContent: { flex: 1 },
    title: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    desc: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },
    verifyBtn: { backgroundColor: 'transparent', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.primary },
    verifyBtnText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },

    inputArea: { gap: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 13, fontWeight: 'bold', color: Colors.text.primary },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5', overflow: 'hidden' },
    prefix: { paddingHorizontal: 12, backgroundColor: '#F1F5F9', height: '100%', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
    prefixText: { fontSize: 14, fontWeight: 'bold', color: Colors.text.secondary },
    input: { flex: 1, paddingHorizontal: 16, height: 48, fontSize: 16, color: Colors.text.primary },
    otpInput: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5', height: 50, fontSize: 24, fontWeight: 'bold', color: Colors.primary },
    submitBtn: { backgroundColor: 'transparent', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
    submitBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
    error: { color: Colors.error, fontSize: 12, textAlign: 'center' },
    footerNote: { fontSize: 10, color: Colors.text.tertiary, textAlign: 'center', fontStyle: 'italic' },
    resendBtn: { alignSelf: 'center', padding: 4 },
    resendText: { color: Colors.primary, fontSize: 12, fontWeight: '600' }
});

export default VerificationBanner;
