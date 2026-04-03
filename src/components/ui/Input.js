import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';

const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    error,
    containerStyle
}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const isSecure = secureTextEntry && !isPasswordVisible;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[styles.input, error && styles.inputError, secureTextEntry && { paddingRight: 50 }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.text.tertiary}
                    secureTextEntry={isSecure}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                />
                {secureTextEntry && (
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        activeOpacity={0.7}
                    >
                        {isPasswordVisible ? (
                            <EyeOff size={20} color={Colors.text.secondary} />
                        ) : (
                            <Eye size={20} color={Colors.text.secondary} />
                        )}
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.text.secondary,
        marginBottom: 6,
    },
    inputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: Typography.fontSize.base,
        color: Colors.text.primary,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        height: '100%',
        justifyContent: 'center',
        paddingLeft: 10,
    },
    inputError: {
        borderColor: Colors.error,
    },
    errorText: {
        color: Colors.error,
        fontSize: 12,
        marginTop: 4,
    },
});

export default Input;
