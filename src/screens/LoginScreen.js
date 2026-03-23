import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing } from '../constants/theme';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleLogin = async () => {
        console.log('Login attempt started:', { email, Platform: Platform.OS });
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
                if (result.message.toLowerCase().includes('network') || result.message.toLowerCase().includes('timeout')) {
                    setError('Network issue! check your connection');
                } else if (result.message.toLowerCase().includes('invalid') || result.message.toLowerCase().includes('credentials') || result.message.toLowerCase().includes('unauthorized')) {
                    setError('Invalid credentials check email or password');
                } else {
                    setError(result.message);
                }
            }
        } catch (err) {
            console.error('Login screen execution error:', err);
            setLoading(false);
            setError('Network issue! check your connection');
        }
    };

    return (
        <MainLayout showHeader={false} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue your counseling journey</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Input
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                />

                <Input
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                />

                <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                <Button
                    title="Sign In"
                    onPress={handleLogin}
                    loading={loading}
                    style={styles.loginBtn}
                />

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                        <Text style={styles.linkText}>Create Account</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 40,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: Typography.fontSize['3xl'],
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.text.secondary,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.medium,
    },
    loginBtn: {
        marginTop: 10,
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

export default LoginScreen;
