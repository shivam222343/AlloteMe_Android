import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, Spacing, Typography } from '../constants/theme';

const Input = ({
    label,
    placeholder,
    value,
    onChangeText,
    error,
    helperText,
    leftIcon,
    rightIcon,
    secureTextEntry,
    multiline = false,
    numberOfLines = 1,
    style,
    inputStyle,
    containerStyle,
    ...props
}) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text
                    style={[
                        styles.label,
                        { color: theme.colors.text },
                        error && { color: theme.error[500] },
                    ]}
                >
                    {label}
                </Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: isFocused
                            ? theme.primary[500]
                            : error
                                ? theme.error[500]
                                : theme.colors.border,
                    },
                    multiline && { height: numberOfLines * 40 },
                    style,
                ]}
            >
                {leftIcon && (
                    <View style={styles.iconContainer}>
                        {leftIcon}
                    </View>
                )}

                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.textSecondary}
                    secureTextEntry={secureTextEntry && !isPasswordVisible}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={[
                        styles.input,
                        {
                            color: theme.colors.text,
                        },
                        multiline && { height: '100%', textAlignVertical: 'top' },
                        inputStyle,
                    ]}
                    {...props}
                />

                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={togglePasswordVisibility}
                        style={styles.iconContainer}
                    >
                        <Ionicons
                            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}

                {rightIcon && !secureTextEntry && (
                    <View style={styles.iconContainer}>
                        {rightIcon}
                    </View>
                )}
            </View>

            {(error || helperText) && (
                <Text
                    style={[
                        styles.helperText,
                        {
                            color: error ? theme.error[500] : theme.colors.textSecondary,
                        },
                    ]}
                >
                    {error || helperText}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        marginBottom: Spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        minHeight: 50,
    },
    input: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        paddingVertical: Spacing.sm,
    },
    iconContainer: {
        marginHorizontal: Spacing.xs,
    },
    helperText: {
        fontSize: Typography.fontSize.xs,
        marginTop: Spacing.xs,
        marginLeft: Spacing.xs,
    },
});

export default Input;
