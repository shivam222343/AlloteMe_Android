import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../constants/theme';

const Button = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    style,
    textStyle
}) => {
    const isPrimary = variant === 'primary';
    const isOutline = variant === 'outline';
    const isGhost = variant === 'ghost';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[
                styles.button,
                styles[size],
                isPrimary && styles.primary,
                isOutline && styles.outline,
                isGhost && styles.ghost,
                disabled && styles.disabled,
                style
            ]}
        >
            {loading ? (
                <ActivityIndicator color={isPrimary ? '#FFF' : Colors.primary} />
            ) : (
                <Text style={[
                    styles.text,
                    isPrimary && styles.textPrimary,
                    isOutline && styles.textOutline,
                    isGhost && styles.textGhost,
                    textStyle
                ]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    // Sizes
    sm: { paddingVertical: 8, paddingHorizontal: 16 },
    md: { paddingVertical: 12, paddingHorizontal: 24 },
    lg: { paddingVertical: 16, paddingHorizontal: 32 },

    // Variants
    primary: {
        backgroundColor: Colors.primary,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    disabled: {
        opacity: 0.5,
    },

    // Text
    text: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
    },
    textPrimary: { color: '#FFF' },
    textOutline: { color: Colors.primary },
    textGhost: { color: Colors.text.secondary },
});

export default Button;
