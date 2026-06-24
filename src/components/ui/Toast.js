import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';

const ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

/**
 * Toast - animated slide-up notification banner.
 *
 * Props:
 *   visible   {boolean}  - controls visibility
 *   message   {string}   - text to display
 *   type      {string}   - 'success' | 'error' | 'warning' | 'info'
 *   duration  {number}   - ms before auto-hide (default 2500)
 *   onHide    {function} - called when toast finishes hiding
 */
const Toast = ({ visible, message, type = 'success', duration = 2500, onHide }) => {
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 60,
                    friction: 8,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-hide after duration
            const timer = setTimeout(() => {
                hide();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hide = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 100,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onHide) onHide();
        });
    };

    if (!visible) return null;

    const bgColor = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
    }[type] || '#10B981';

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: bgColor, transform: [{ translateY }], opacity },
            ]}
        >
            <Text style={styles.icon}>{ICONS[type]}</Text>
            <Text style={styles.message}>{message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'web' ? 32 : 24,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 14,
        zIndex: 9999,
        ...Shadows.lg,
    },
    icon: {
        fontSize: 18,
    },
    message: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
});

export default Toast;
