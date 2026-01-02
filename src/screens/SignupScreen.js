
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

const SignupScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { signup } = useAuth();

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        setError('');
    };

    const validateForm = () => {
        if (!formData.displayName || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            return false;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            // Use useAuth hook for signup
            const result = await signup({
                displayName: formData.displayName,
                email: formData.email.trim(),
                password: formData.password,
            });

            if (!result.success) {
                setError(result.message || 'Signup failed');
            }
            // If success, AuthProvider will automatically update state and switch to Main stack
        } catch (error) {
            console.error('Signup error:', error);
            setError(error.message || 'Signup failed. Please try again.');
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Image
                    source={require('../../assets/AS.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
                <Text style={styles.tagline}>Join the Community</Text>
            </LinearGradient>

            <View style={styles.formContainer}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Sign up to get started</Text>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#EF4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Name Input */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Enter your name"
                            value={formData.displayName}
                            onChangeText={(value) => handleInputChange('displayName', value)}
                            style={styles.input}
                            autoCapitalize="words"
                            autoCorrect={false}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Email Input */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Enter your email"
                            value={formData.email}
                            onChangeText={(value) => handleInputChange('email', value)}
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
                            placeholder="Create a password"
                            value={formData.password}
                            onChangeText={(value) => handleInputChange('password', value)}
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

                {/* Confirm Password Input */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChangeText={(value) => handleInputChange('confirmPassword', value)}
                            secureTextEntry={!showConfirmPassword}
                            style={styles.input}
                            autoCapitalize="none"
                            autoCorrect={false}
                            placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={styles.eyeIcon}
                        >
                            <Ionicons
                                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#6B7280"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Signup Button */}
                <TouchableOpacity
                    onPress={handleSignup}
                    disabled={loading}
                    style={styles.signupButtonContainer}
                >
                    <LinearGradient
                        colors={['#0A66C2', '#0E76A8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.signupButton}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.signupButtonText}>Sign Up</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Google Sign Up Button (Visual only) */}
                <TouchableOpacity
                    style={[styles.googleButton, { opacity: 0.7 }]}
                    onPress={() => alert('Google Sign Up coming soon to backend!')}
                    disabled={loading}
                >
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                    <Text style={styles.loginText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginLink}>Sign In</Text>
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
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        padding: 8,
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
    signupButtonContainer: {
        marginTop: 8,
        marginBottom: 24,
    },
    signupButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupButtonText: {
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
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        color: '#6B7280',
        fontSize: 14,
    },
    loginLink: {
        color: '#0A66C2',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default SignupScreen;
