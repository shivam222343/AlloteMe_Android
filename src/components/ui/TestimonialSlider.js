import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Dimensions, Image } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Quote, Star } from 'lucide-react-native';
import { reviewAPI } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TestimonialSlider = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await reviewAPI.getPublished();
            if (res.data?.success && res.data.data.length > 0) {
                const data = res.data.data;
                // Only triple if there's more than 1 review to avoid showing duplicates of the same review in a row
                if (data.length > 1) {
                    setReviews([...data, ...data, ...data]);
                } else {
                    setReviews(data);
                }
            }
        } catch (error) {
            console.error('Fetch reviews error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (reviews.length > 1) {
            const realCount = reviews.length / 3;
            let index = realCount;

            const timer = setInterval(() => {
                index++;
                if (index >= realCount * 2) {
                    // Seamless jump back to middle set without animation
                    scrollViewRef.current?.scrollTo({ x: realCount * SCREEN_WIDTH, animated: false });
                    index = realCount + 1;
                    // Then continue with animation
                    setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                    }, 50);
                } else {
                    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                }
            }, 1000); // 1-second auto-scroll as requested
            return () => clearInterval(timer);
        }
    }, [reviews.length]);

    if (loading || reviews.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Quote size={24} color={Colors.primary} fill={Colors.primary + '20'} />
                <Text style={styles.title}>What Students Say</Text>
            </View>

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                contentOffset={reviews.length > 1 ? { x: (reviews.length / 3) * SCREEN_WIDTH, y: 0 } : { x: 0, y: 0 }}
            >
                {reviews.map((item, index) => (
                    <View key={index} style={styles.slide}>
                        <View style={styles.card}>
                            <View style={styles.stars}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        size={14}
                                        color={s <= item.rating ? '#F59E0B' : '#CBD5E1'}
                                        fill={s <= item.rating ? '#F59E0B' : 'transparent'}
                                    />
                                ))}
                            </View>
                            <Text style={styles.comment} numberOfLines={4}>"{item.comment}"</Text>
                            <View style={styles.userRow}>
                                <Image
                                    source={{ uri: item.userAvatar || `https://ui-avatars.com/api/?name=${item.userName}&background=random` }}
                                    style={styles.avatar}
                                />
                                <View>
                                    <Text style={styles.userName}>{item.userName}</Text>
                                    <Text style={styles.userSub}>Verified Student</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginTop: 40, marginBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 15 },
    title: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    slide: { width: SCREEN_WIDTH },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 0,
        padding: 24,
        borderTopWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: Colors.primary + '10',
        ...Shadows.sm
    },
    stars: { flexDirection: 'row', gap: 4, marginBottom: 12 },
    comment: { fontSize: 14, color: Colors.text.secondary, fontStyle: 'italic', lineHeight: 22, marginBottom: 20 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.divider },
    userName: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    userSub: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 }
});

export default TestimonialSlider;
