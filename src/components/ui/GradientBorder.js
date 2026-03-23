import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GradientBorder = ({ children, size = 110, borderWidth = 3, colors = ['#4F46E5', '#9333EA', '#E11D48'] }) => {
    return (
        <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.gradient,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    padding: borderWidth
                }
            ]}
        >
            <View style={[styles.inner, { borderRadius: (size - borderWidth * 2) / 2 }]}>
                {children}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default GradientBorder;
