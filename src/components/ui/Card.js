import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../constants/theme';

const Card = ({ children, style, elevated = true }) => {
    return (
        <View style={[
            styles.card,
            elevated && Shadows.md,
            style
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.divider,
    },
});

export default Card;
