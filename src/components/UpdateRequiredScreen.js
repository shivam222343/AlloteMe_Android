import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Animated,
    Image,
    StatusBar,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.alloteme0077.app';

const UpdateRequiredScreen = ({ latestVersion, currentVersion }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        // Pulse animation for the update button
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();

        // Float animation for the icon
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -10, duration: 1800, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const handleUpdate = async () => {
        try {
            const supported = await Linking.canOpenURL(PLAY_STORE_URL);
            if (supported) {
                await Linking.openURL(PLAY_STORE_URL);
            }
        } catch (err) {
            console.warn('Could not open Play Store:', err);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A3D91" />

            {/* Gradient Background */}
            <LinearGradient
                colors={['#0A3D91', '#0A66C2', '#1E88E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Decorative circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            {/* Main Content */}
            <View style={styles.content}>

                {/* Floating App Icon */}
                <Animated.View style={[styles.iconWrapper, { transform: [{ translateY: floatAnim }] }]}>
                    <View style={styles.iconShadow}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="update" size={52} color="#0A66C2" />
                        </View>
                    </View>
                </Animated.View>

                {/* App Name Badge */}
                <View style={styles.appBadge}>
                    <Text style={styles.appBadgeText}>AlloteMe</Text>
                </View>

                {/* Heading */}
                <Text style={styles.title}>Update Available!</Text>
                <Text style={styles.subtitle}>
                    A new version of AlloteMe is ready with exciting improvements and important fixes.
                </Text>

                {/* Version Info Card */}
                <View style={styles.versionCard}>
                    <View style={styles.versionRow}>
                        <View style={styles.versionItem}>
                            <Ionicons name="phone-portrait-outline" size={16} color="#94A3B8" />
                            <Text style={styles.versionLabel}>Your Version</Text>
                            <Text style={styles.versionValue}>{currentVersion || '—'}</Text>
                        </View>
                        <View style={styles.versionDivider} />
                        <View style={styles.versionItem}>
                            <Ionicons name="sparkles-outline" size={16} color="#34D399" />
                            <Text style={styles.versionLabel}>Latest Version</Text>
                            <Text style={[styles.versionValue, { color: '#34D399' }]}>
                                {latestVersion || '—'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Update Button */}
                <Animated.View style={[styles.updateBtnWrapper, { transform: [{ scale: pulseAnim }] }]}>
                    <TouchableOpacity
                        style={styles.updateBtn}
                        onPress={handleUpdate}
                        activeOpacity={0.85}
                    >
                        <View style={styles.playIconBox}>
                            <MaterialCommunityIcons name="google-play" size={26} color="#0A66C2" />
                        </View>
                        <Text style={styles.updateBtnText}>Update on Play Store</Text>
                        <Ionicons name="arrow-forward" size={20} color="#0A66C2" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Footnote */}
                <Text style={styles.footnote}>
                    Please update to continue using AlloteMe.{'\n'}
                    This version is no longer supported.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A3D91',
    },
    // Decorative background circles
    circle1: {
        position: 'absolute', top: -80, right: -80,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    circle2: {
        position: 'absolute', bottom: 100, left: -100,
        width: 350, height: 350, borderRadius: 175,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    circle3: {
        position: 'absolute', top: '40%', right: -60,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },

    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },

    // Icon
    iconWrapper: {
        marginBottom: 20,
    },
    iconShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 16,
    },
    iconContainer: {
        width: 110,
        height: 110,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    // App badge
    appBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    appBadgeText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },

    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.78)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        maxWidth: 300,
    },

    // Version comparison card
    versionCard: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    versionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    versionItem: {
        alignItems: 'center',
        gap: 6,
    },
    versionDivider: {
        width: 1,
        height: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    versionLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.65)',
        fontWeight: '500',
    },
    versionValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Update button
    updateBtnWrapper: {
        width: '100%',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },
    updateBtn: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    playIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    updateBtnText: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#0A66C2',
    },

    footnote: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default UpdateRequiredScreen;
