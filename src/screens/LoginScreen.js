import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Platform,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { signin } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Use useAuth hook for login
            const result = await signin({ email: email.trim(), password });

            if (!result.success) {
                setError(result.message || 'Login failed');
            }
            // If success, AuthProvider will automatically update state and switch to Main stack
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <LinearGradient
                colors={['#0A66C2', '#0E76A8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Image
                    source={require('../../assets/AS.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
                <Text style={styles.tagline}>Club Management Platform</Text>
            </LinearGradient>

            <View style={styles.formContainer}>
                <Text style={styles.title}>Welcome Back!</Text>
                <Text style={styles.subtitle}>Sign in to continue</Text>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#EF4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Email Input */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            style={styles.input}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Password Input */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            style={styles.input}
                            autoCapitalize="none"
                            autoCorrect={false}
                            placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#6B7280"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    style={styles.loginButtonContainer}
                >
                    <LinearGradient
                        colors={['#0A66C2', '#0E76A8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.loginButton}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Google Sign In (Visual only for now if backend doesn't support it yet) */}
                <TouchableOpacity
                    disabled={loading}
                    style={[styles.googleButton, { opacity: 0.7 }]}
                    onPress={() => alert('Google Sign In coming soon to backend!')}
                >
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                        <Text style={styles.signupLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    contentContainer: {
        flexGrow: 1,
    },
    header: {
        paddingTop: 80,
        paddingBottom: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    logoImage: {
        width: 180,
        height: 60,
        marginBottom: 12,
        borderRadius: 16, // Rounded corners
    },
    tagline: {
        fontSize: 14,
        color: '#D1E5FF',
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -20,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 32,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        paddingVertical: 0,
        backgroundColor: 'transparent',
        height: '100%',
        // Web specific styles to remove outline
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            },
        }),
    },
    eyeIcon: {
        padding: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: '#0A66C2',
        fontSize: 14,
        fontWeight: '600',
    },
    loginButtonContainer: {
        marginBottom: 24,
    },
    loginButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        color: '#6B7280',
        fontSize: 14,
        marginHorizontal: 16,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginBottom: 24,
    },
    googleButtonText: {
        color: '#1F2937',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        color: '#6B7280',
        fontSize: 14,
    },
    signupLink: {
        color: '#0A66C2',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default LoginScreen;
