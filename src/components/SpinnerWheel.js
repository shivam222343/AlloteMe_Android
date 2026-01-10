import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const WHEEL_SIZE = width * 0.5;

const SpinnerWheel = ({ items, isSpinning, result, onComplete }) => {
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isSpinning) {
            // Start spinning
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else if (result) {
            // Find target rotation
            const itemIndex = items.indexOf(result);
            if (itemIndex !== -1) {
                spinValue.stopAnimation();
                const segmentAngle = 360 / items.length;
                const targetRotation = 360 * 5 + (360 - (itemIndex * segmentAngle) - (segmentAngle / 2));

                Animated.timing(spinValue, {
                    toValue: targetRotation / 360,
                    duration: 2000,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                }).start(() => {
                    if (onComplete) onComplete();
                });
            }
        } else {
            spinValue.setValue(0);
        }
    }, [isSpinning, result]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'];

    return (
        <View style={styles.container}>
            <View style={styles.pointerContainer}>
                <Ionicons name="caret-down" size={32} color="#0A66C2" />
            </View>
            <Animated.View style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
                {items.map((item, index) => {
                    const segmentAngle = 360 / items.length;
                    const rotateAngle = index * segmentAngle;
                    return (
                        <View
                            key={index}
                            style={[
                                styles.segment,
                                {
                                    backgroundColor: colors[index % colors.length],
                                    transform: [
                                        { rotate: `${rotateAngle}deg` },
                                        { skewY: `${90 - segmentAngle}deg` }
                                    ],
                                },
                            ]}
                        />
                    );
                })}
                {items.map((item, index) => {
                    const segmentAngle = 360 / items.length;
                    const rotateAngle = index * segmentAngle + segmentAngle / 2;
                    return (
                        <View
                            key={`text-${index}`}
                            style={[
                                styles.textContainer,
                                { transform: [{ rotate: `${rotateAngle}deg` }] },
                            ]}
                        >
                            <Text style={styles.segmentText} numberOfLines={1}>
                                {item}
                            </Text>
                        </View>
                    );
                })}
            </Animated.View>
            <View style={styles.centerDot} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    pointerContainer: {
        position: 'absolute',
        top: -20,
        zIndex: 10,
    },
    wheel: {
        width: WHEEL_SIZE,
        height: WHEEL_SIZE,
        borderRadius: WHEEL_SIZE / 2,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: '#E5E7EB',
        backgroundColor: '#F3F4F6',
    },
    segment: {
        position: 'absolute',
        width: WHEEL_SIZE / 2,
        height: WHEEL_SIZE / 2,
        left: WHEEL_SIZE / 2,
        top: 0,
        transformOrigin: '0% 100%',
    },
    textContainer: {
        position: 'absolute',
        width: WHEEL_SIZE / 2,
        height: 40,
        left: WHEEL_SIZE / 2,
        top: WHEEL_SIZE / 2 - 20,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 15,
        transformOrigin: '0% 50%',
    },
    segmentText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
        width: WHEEL_SIZE * 0.35,
        textAlign: 'right',
    },
    centerDot: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
});

export default SpinnerWheel;
