import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const BirthdayCard = ({ member }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array.from({ length: 20 }, () => ({
            x: new Animated.Value(Math.random() * width),
            y: new Animated.Value(-50),
            rotate: new Animated.Value(0),
        }))
    ).current;

    useEffect(() => {
        // Scale animation for card
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();

        // Confetti animation
        confettiAnims.forEach((anim, index) => {
            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: 600,
                    duration: 3000 + Math.random() * 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.rotate, {
                    toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
                    duration: 3000 + Math.random() * 2000,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    }, []);

    const confettiColors = ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#9370DB'];

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            {/* Confetti */}
            {confettiAnims.map((anim, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.confetti,
                        {
                            left: anim.x,
                            transform: [
                                { translateY: anim.y },
                                {
                                    rotate: anim.rotate.interpolate({
                                        inputRange: [0, 360],
                                        outputRange: ['0deg', '360deg'],
                                    }),
                                },
                            ],
                            backgroundColor: confettiColors[index % confettiColors.length],
                        },
                    ]}
                />
            ))}

            <LinearGradient
                colors={['#FF6B9D', '#C06C84']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={styles.header}>
                    <Ionicons name="gift" size={28} color="#FFF" />
                    <Text style={styles.title}>🎉 Birthday Today! 🎂</Text>
                </View>

                <View style={styles.memberInfo}>
                    {member.profilePicture?.url ? (
                        <Image
                            source={{ uri: member.profilePicture.url }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {member.displayName?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}

                    <View style={styles.details}>
                        <Text style={styles.name}>{member.displayName}</Text>
                        <Text style={styles.club}>{member.clubName}</Text>
                        <View style={styles.wishContainer}>
                            <Ionicons name="heart" size={16} color="#FFD700" />
                            <Text style={styles.wish}>Wishing you a wonderful day!</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cakeContainer}>
                    <Text style={styles.cake}>🎂</Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        position: 'relative',
    },
    confetti: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        zIndex: 10,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    details: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    club: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 8,
    },
    wishContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wish: {
        fontSize: 13,
        color: '#FFF',
        marginLeft: 6,
        fontStyle: 'italic',
    },
    cakeContainer: {
        position: 'absolute',
        right: 20,
        bottom: 20,
    },
    cake: {
        fontSize: 40,
    },
});

export default BirthdayCard;
