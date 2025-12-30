import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '../constants/theme';

const Card = ({
    children,
    onPress,
    variant = 'elevated', // 'elevated', 'outlined', 'filled'
    padding = 'medium', // 'none', 'small', 'medium', 'large'
    style,
    ...props
}) => {
    const { theme } = useTheme();

    const getCardStyle = () => {
        const baseStyle = {
            borderRadius: BorderRadius.xl,
            overflow: 'hidden',
        };

        // Padding styles
        const paddingStyles = {
            none: {},
            small: { padding: Spacing.sm },
            medium: { padding: Spacing.md },
            large: { padding: Spacing.lg },
        };

        // Variant styles
        const variantStyles = {
            elevated: {
                backgroundColor: theme.colors.card,
                ...Shadows.md,
            },
            outlined: {
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
            },
            filled: {
                backgroundColor: theme.colors.surface,
            },
        };

        return {
            ...baseStyle,
            ...paddingStyles[padding],
            ...variantStyles[variant],
        };
    };

    const cardStyle = getCardStyle();

    if (onPress) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.9}
                style={[cardStyle, style]}
                {...props}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return (
        <View style={[cardStyle, style]} {...props}>
            {children}
        </View>
    );
};

export default Card;
