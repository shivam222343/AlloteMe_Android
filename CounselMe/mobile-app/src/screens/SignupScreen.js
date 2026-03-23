import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const SignupScreen = ({ navigation }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        examType: 'MHTCET',
        percentile: '',
        rank: '',
        location: '',
        expectedRegion: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { register } = useAuth();

    const handleSignup = async () => {
        setError('');
        setLoading(true);
        const result = await register(formData);
        setLoading(false);
        if (!result.success) {
            setError(result.message);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const ExamOption = ({ type, label }) => (
        <TouchableOpacity
            style={[styles.examCard, formData.examType === type && styles.examCardActive]}
            onPress={() => setFormData({ ...formData, examType: type })}
        >
            <Text style={[styles.examText, formData.examType === type && styles.examTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <MainLayout>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Step {step} of 2</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {step === 1 ? (
                    <View>
                        <Input
                            label="Full Name"
                            value={formData.displayName}
                            onChangeText={(val) => setFormData({ ...formData, displayName: val })}
                            placeholder="e.g. John Doe"
                        />
                        <Input
                            label="Email Address"
                            value={formData.email}
                            onChangeText={(val) => setFormData({ ...formData, email: val })}
                            placeholder="johnt@example.com"
                            keyboardType="email-address"
                        />
                        <Input
                            label="Password"
                            value={formData.password}
                            onChangeText={(val) => setFormData({ ...formData, password: val })}
                            placeholder="Create a strong password"
                            secureTextEntry
                        />
                        <Button title="Next Step" onPress={nextStep} style={styles.mainBtn} />
                    </View>
                ) : (
                    <View>
                        <Text style={styles.label}>Select Your Exam</Text>
                        <View style={styles.examRow}>
                            <ExamOption type="MHTCET" label="MHT-CET" />
                            <ExamOption type="JEE" label="JEE Main" />
                            <ExamOption type="NEET" label="NEET" />
                        </View>

                        <View style={styles.row}>
                            <Input
                                label="Percentile"
                                value={formData.percentile}
                                onChangeText={(val) => setFormData({ ...formData, percentile: val })}
                                placeholder="99.5"
                                keyboardType="numeric"
                                containerStyle={{ flex: 1, marginRight: 8 }}
                            />
                            <Input
                                label="Rank (Optional)"
                                value={formData.rank}
                                onChangeText={(val) => setFormData({ ...formData, rank: val })}
                                placeholder="1250"
                                keyboardType="numeric"
                                containerStyle={{ flex: 1 }}
                            />
                        </View>

                        <Input
                            label="Your Location"
                            value={formData.location}
                            onChangeText={(val) => setFormData({ ...formData, location: val })}
                            placeholder="e.g. Mumbai, Pune"
                        />

                        <Input
                            label="Expected College Region"
                            value={formData.expectedRegion}
                            onChangeText={(val) => setFormData({ ...formData, expectedRegion: val })}
                            placeholder="e.g. Pune, Nagpur"
                        />

                        <View style={styles.btnRow}>
                            <Button title="Back" variant="outline" onPress={prevStep} style={{ flex: 1, marginRight: 8 }} />
                            <Button title="Register" onPress={handleSignup} loading={loading} style={{ flex: 2 }} />
                        </View>
                    </View>
                )}

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
    container: {
        padding: Spacing.lg,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: Typography.fontSize['3xl'],
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text.primary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.tertiary,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.text.secondary,
        marginBottom: 12,
    },
    examRow: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 8,
    },
    examCard: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    examCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
    },
    examText: {
        fontSize: 12,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.text.secondary,
    },
    examTextActive: {
        color: Colors.primary,
    },
    row: {
        flexDirection: 'row',
    },
    btnRow: {
        flexDirection: 'row',
        marginTop: 16,
    },
    mainBtn: {
        marginTop: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        color: Colors.text.secondary,
    },
    linkText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    errorText: {
        color: Colors.error,
        textAlign: 'center',
        marginBottom: 16,
    },
});

export default SignupScreen;
