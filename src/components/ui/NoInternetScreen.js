import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

const NoInternetScreen = ({ onRetry }) => {
    return (
        <View style={styles.container}>
            <Animatable.View 
                animation="pulse" 
                iterationCount="infinite" 
                duration={2000}
                style={styles.iconCircle}
            >
                <View style={styles.iconBg}>
                    <WifiOff size={54} color={Colors.primary} strokeWidth={1.5} />
                </View>
                <Animatable.View 
                    animation="fadeIn" 
                    delay={500}
                    style={styles.warningBadge}
                >
                    <AlertTriangle size={18} color="#fff" fill="#F59E0B" />
                </Animatable.View>
            </Animatable.View>

            <View style={styles.content}>
                <Text style={styles.title}>No Internet Connection</Text>
                <Text style={styles.desc}>
                    Oops! It looks like your device is not connected to the internet. 
                    Please check your Wi-Fi or mobile data settings.
                </Text>
            </View>

            <TouchableOpacity 
                style={styles.retryBtn} 
                onPress={onRetry}
                activeOpacity={0.8}
            >
                <RefreshCw size={20} color="#fff" style={styles.btnIcon} />
                <Text style={styles.retryText}>Check Connection</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Image 
                    source={require('../../../imgs/logo.png')} 
                    style={styles.logo} 
                    resizeMode="contain" 
                />
                <Text style={styles.footerText}>AlloteMe Secure Network</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        zIndex: 9999,
        ...StyleSheet.absoluteFillObject
    },
    iconCircle: {
        marginBottom: 40,
        position: 'relative'
    },
    iconBg: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.primary + '20'
    },
    warningBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#F59E0B',
        padding: 6,
        borderRadius: 12,
        ...Shadows.sm
    },
    content: {
        alignItems: 'center',
        marginBottom: 40
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center'
    },
    desc: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 16,
        ...Shadows.md
    },
    btnIcon: {
        marginRight: 10
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center'
    },
    logo: {
        width: 40,
        height: 40,
        marginBottom: 8,
        opacity: 0.5
    },
    footerText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        letterSpacing: 1
    }
});

export default NoInternetScreen;
