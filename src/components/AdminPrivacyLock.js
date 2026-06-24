import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react-native';
import { Colors, Shadows } from '../constants/theme';
import MainLayout from './layouts/MainLayout';

const AdminPrivacyLock = ({ children }) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState(false);
    const navigation = useNavigation();

    const handleUnlock = () => {
        if (passcode.trim() === '0077_Admin') {
            setIsUnlocked(true);
            setError(false);
        } else {
            setError(true);
            setPasscode('');
            // Shake effect or vibration could be added here
        }
    };

    if (isUnlocked) {
        return <>{children}</>;
    }

    return (
        <MainLayout title="Restricted Area" hideBack={true}>
            <KeyboardAvoidingView 
                style={styles.container} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <ShieldAlert size={48} color={Colors.error} />
                    </View>
                    
                    <Text style={styles.title}>Admin Verification</Text>
                    <Text style={styles.subtitle}>
                        This section contains highly sensitive information. Please enter your privacy code to proceed.
                    </Text>

                    <View style={[styles.inputContainer, error && styles.inputError]}>
                        <KeyRound size={20} color={error ? Colors.error : Colors.text.tertiary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Privacy Code"
                            secureTextEntry
                            value={passcode}
                            onChangeText={(text) => {
                                setPasscode(text);
                                setError(false);
                            }}
                            onSubmitEditing={handleUnlock}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                    {error && <Text style={styles.errorText}>Incorrect Privacy Code. Access Denied.</Text>}

                    <TouchableOpacity 
                        style={[styles.unlockBtn, passcode.trim() === '' && styles.unlockBtnDisabled]} 
                        onPress={handleUnlock}
                        disabled={passcode.trim() === ''}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.unlockBtnText}>Unlock Access</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.backBtn} 
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft size={20} color={Colors.text.secondary} />
                        <Text style={styles.backBtnText}>Go Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: Colors.white,
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        ...Shadows.lg,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.text.secondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        paddingHorizontal: 16,
        width: '100%',
        height: 56,
        marginBottom: 8,
    },
    inputError: {
        borderColor: Colors.error,
        backgroundColor: Colors.error + '05',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text.primary,
        height: '100%',
    },
    errorText: {
        color: Colors.error,
        fontSize: 12,
        fontWeight: '500',
        alignSelf: 'flex-start',
        marginBottom: 16,
        marginLeft: 4,
    },
    unlockBtn: {
        backgroundColor: Colors.primary,
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        ...Shadows.sm,
    },
    unlockBtnDisabled: {
        opacity: 0.6,
    },
    unlockBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        gap: 8,
        padding: 8,
    },
    backBtnText: {
        color: Colors.text.secondary,
        fontSize: 15,
        fontWeight: '600',
    },
});

export default AdminPrivacyLock;
