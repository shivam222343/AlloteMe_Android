import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, Spacing, Typography, Shadows } from '../constants/theme';

const Button = ({
    title,
    onPress,
    variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost', 'gradient'
    size = 'medium', // 'small', 'medium', 'large'
    loading = false,
    disabled = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    style,
    textStyle,
    ...props
}) => {
    const { theme } = useTheme();

    const getButtonStyle = () => {
        const baseStyle = {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: BorderRadius.lg,
            ...Shadows.md,
        };

        // Size styles
        const sizeStyles = {
            small: {
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.md,
            },
            medium: {
                paddingVertical: Spacing.md,
                paddingHorizontal: Spacing.lg,
            },
            large: {
                paddingVertical: Spacing.lg,
                paddingHorizontal: Spacing.xl,
            },
        };

        // Variant styles
        const variantStyles = {
            primary: {
                backgroundColor: theme.primary[500],
            },
            secondary: {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
            },
            outline: {
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: theme.primary[500],
            },
            ghost: {
                backgroundColor: 'transparent',
                shadowOpacity: 0,
                elevation: 0,
            },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
            ...(fullWidth && { width: '100%' }),
            ...(disabled && { opacity: 0.5 }),
        };
    };

    const getTextStyle = () => {
        const baseStyle = {
            fontWeight: Typography.fontWeight.semibold,
        };

        const sizeStyles = {
            small: {
                fontSize: Typography.fontSize.sm,
            },
            medium: {
                fontSize: Typography.fontSize.base,
            },
            large: {
                fontSize: Typography.fontSize.lg,
            },
        };

        const variantStyles = {
            primary: {
                color: '#FFFFFF',
            },
            secondary: {
                color: theme.colors.text,
            },
            outline: {
                color: theme.primary[500],
            },
            ghost: {
                color: theme.primary[500],
            },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
        };
    };

    const renderContent = () => (
        <>
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? '#FFFFFF' : theme.primary[500]}
                    size="small"
                />
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <View style={{ marginRight: Spacing.sm }}>{icon}</View>
                    )}
                    <Text style={[getTextStyle(), textStyle]}>{title}</Text>
                    {icon && iconPosition === 'right' && (
                        <View style={{ marginLeft: Spacing.sm }}>{icon}</View>
                    )}
                </>
            )}
        </>
    );

    if (variant === 'gradient') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                style={[fullWidth && { width: '100%' }, style]}
                {...props}
            >
                <LinearGradient
                    colors={[theme.primary[400], theme.primary[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[getButtonStyle(), { shadowOpacity: 0, elevation: 0 }]}
                >
                    {renderContent()}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[getButtonStyle(), style]}
            {...props}
        >
            {renderContent()}
        </TouchableOpacity>
    );
};

export default Button;
