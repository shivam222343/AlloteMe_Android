import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing } from '../constants/theme';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useWebGoogleLogin } from '../utils/webAuthHelper';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, googleLogin } = useAuth();

    const loginWeb = useWebGoogleLogin({
        onSuccess: async (tokenResponse) => {
            console.log('Web Google Success:', tokenResponse);
            const idToken = tokenResponse.credential;
            const accessToken = tokenResponse.access_token;
            
            if (idToken || accessToken) {
                const result = await googleLogin({ idToken, accessToken });
                if (!result.success) setError(result.message);
            }
        },
        onError: () => setError('Google Login failed on Web'),
        flow: 'implicit'
    });

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
            
            if (!idToken) {
                throw new Error('No ID token received from Google');
            }

            const result = await googleLogin({ idToken });
            if (!result.success) {
                setError(result.message);
            }
        } catch (err) {
            console.error('Google Login Error:', err);
            setError('Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout showHeader={false} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <Image source={require('../../imgs/splash.png')} style={styles.logo} />
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
        alignItems: 'center',
    },
    logo: {
        width: 380,
        height: 100,
        marginBottom: 16,
        resizeMode: 'contain',
        borderRadius: 50,
    },
    title: {
        fontSize: Typography.fontSize['3xl'],
        fontWeight: Typography.fontWeight.bold,
        color: Colors.text.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.text.secondary,
        textAlign: 'center',
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
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
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
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 12,
    },
    googleIcon: {
        width: 28,
        height: 28,
    },
    googleBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
});

export default LoginScreen;
