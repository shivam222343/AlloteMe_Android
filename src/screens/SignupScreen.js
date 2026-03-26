import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { User } from 'lucide-react-native';

const SignupScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        role: 'student',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { register } = useAuth();

    const handleSignup = async () => {
        console.log('Signup attempt started:', { ...formData, Platform: Platform.OS });
        if (!formData.displayName || !formData.email || !formData.password) {
            setError('Please fill all fields');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const result = await register(formData);
            setLoading(false);
            if (!result.success) {
                if (result.message.toLowerCase().includes('network') || result.message.toLowerCase().includes('timeout')) {
                    setError('Network issue! check your connection');
                } else {
                    setError(result.message);
                }
            }
        } catch (err) {
            console.error('Signup screen execution error:', err);
            setLoading(false);
            setError('Network issue! check your connection');
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

                {error ? <Card style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></Card> : null}

                <View style={styles.form}>
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

                    <Button title="Register" onPress={handleSignup} loading={loading} style={styles.mainBtn} />
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
    mainBtn: { marginTop: 12 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: Colors.text.secondary },
    linkText: { color: Colors.primary, fontWeight: 'bold' },
    errorCard: { backgroundColor: Colors.error + '10', padding: 12, marginBottom: 16, borderColor: Colors.error + '30', borderWidth: 1 },
    errorText: { color: Colors.error, fontSize: 13, textAlign: 'center' }
});

export default SignupScreen;
