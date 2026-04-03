import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
    Platform, Keyboard, Image
} from 'react-native';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/theme';
import { MessageSquare, X, CheckCircle2 } from 'lucide-react-native';
import { authAPI } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const VerificationModal = ({ visible, user, onVerified, onClose }) => {
    const [step, setStep] = useState(1); // 1: Phone Input, 3: Success
    const [phoneNumber, setPhoneNumber] = useState('');
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
            handleFinish();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update phone number');
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = async () => {
        if (onVerified) await onVerified();
        if (onClose) onClose();
    };

    if (user?.isVerified) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.handle} />

                        <View style={styles.header}>
                            <View style={styles.iconBox}>
                                <MessageSquare size={24} color={Colors.primary} />
                            </View>
                            <View style={styles.headerText}>
                                <Text style={styles.title}>WhatsApp Details</Text>
                                <Text style={styles.subtitle}>Link your WhatsApp number for 2-way counseling updates</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color={Colors.text.tertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.body}>
                            {step === 1 && (
                                <>
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
                                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                                    <Text style={styles.note}>
                                        You'll receive counseling assistance and alerts on this number.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.primaryBtn}
                                        onPress={handleVerifyPhone}
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator color={Colors.white} /> : (
                                            <Text style={styles.btnText}>Submit Number</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        ...Shadows.lg
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.divider,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: Colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    headerText: {
        flex: 1
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary
    },
    subtitle: {
        fontSize: 13,
        color: Colors.text.tertiary,
        marginTop: 2
    },
    closeBtn: {
        padding: 4
    },
    body: {
        gap: 16
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden'
    },
    prefix: {
        paddingHorizontal: 16,
        backgroundColor: '#F1F5F9',
        height: 56,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0'
    },
    prefixText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text.secondary
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        height: 56,
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary
    },
    otpInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        height: 64,
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.primary
    },
    primaryBtn: {
        backgroundColor: 'transparent',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary
    },
    btnText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 16
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
        textAlign: 'center'
    },
    note: {
        fontSize: 12,
        color: Colors.text.tertiary,
        textAlign: 'center',
        lineHeight: 18
    },
    instruction: {
        fontSize: 14,
        color: Colors.text.secondary,
        textAlign: 'center'
    },
    backBtn: {
        alignSelf: 'center',
        padding: 8
    },
    backText: {
        color: Colors.text.tertiary,
        fontSize: 13,
        fontWeight: '600'
    },
    successArea: {
        alignItems: 'center',
        paddingVertical: 20
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.success + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 8
    },
    successDesc: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 20
    },
    finishBtn: {
        backgroundColor: 'transparent',
        paddingHorizontal: 40,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.success
    },
    finishBtnText: {
        color: Colors.success,
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default VerificationModal;
