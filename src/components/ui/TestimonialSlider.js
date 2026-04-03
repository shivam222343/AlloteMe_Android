import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Image, Animated } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Quote, Star } from 'lucide-react-native';
import { reviewAPI } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 32; // Standard padding is 16 on each side in MainLayout

const TestimonialSlider = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchReviews();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await reviewAPI.getPublished();
            if (res.data?.success && res.data.data.length > 0) {
                const data = res.data.data;
                // Double the data for infinite loop logic if multiple reviews exist
                if (data.length > 1) {
                    setReviews([...data, ...data]);
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
            startAutoPlay();
        }
        return () => stopAutoPlay();
    }, [reviews, currentIndex]);

    const startAutoPlay = () => {
        stopAutoPlay();
        timerRef.current = setInterval(() => {
            let nextIndex = currentIndex + 1;

            if (nextIndex >= reviews.length) {
                // Seamless jump back to start
                flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                nextIndex = 1;
            }

            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true
            });
            setCurrentIndex(nextIndex);
        }, 4500); // 4.5 seconds per slide for proper reading time
    };

    const stopAutoPlay = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleScroll = (event) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SLIDE_WIDTH);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    if (loading || reviews.length === 0) return null;

    const renderItem = ({ item, index }) => (
        <View style={[styles.slide, { width: SLIDE_WIDTH }]}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
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
                    <Quote size={20} color={Colors.primary + '40'} />
                </View>

                <Text style={styles.comment} numberOfLines={4}>"{item.comment}"</Text>

                <View style={styles.userRow}>
                    <Image
                        source={{ uri: item.userAvatar || `https://ui-avatars.com/api/?name=${item.userName}&background=random` }}
                        style={styles.avatar}
                    />
                    <View>
                        <Text style={styles.userName}>{item.userName}</Text>
                        <Text style={styles.userSub}>Verified AI Counselor User</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>What student Says</Text>
                <View style={styles.pagination}>
                    {reviews.slice(0, reviews.length / 2 || 1).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                (currentIndex % (reviews.length / 2 || 1)) === i && styles.activeDot
                            ]}
                        />
                    ))}
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={reviews}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item._id}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onScrollBeginDrag={stopAutoPlay}
                onScrollEndDrag={startAutoPlay}
                getItemLayout={(data, index) => ({
                    length: SLIDE_WIDTH,
                    offset: SLIDE_WIDTH * index,
                    index,
                })}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginTop: 40, marginBottom: 20 },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20
    },
    title: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    pagination: { flexDirection: 'row', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
    activeDot: { width: 16, backgroundColor: Colors.primary },

    slide: { width: SCREEN_WIDTH, paddingHorizontal: 16 },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.divider,
        ...Shadows.md,
        minHeight: 200,
        justifyContent: 'space-between'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    stars: { flexDirection: 'row', gap: 4 },
    comment: {
        fontSize: 15,
        color: Colors.text.secondary,
        fontStyle: 'italic',
        lineHeight: 24,
        marginBottom: 24,
        fontWeight: '500'
    },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.divider, borderWidth: 2, borderColor: Colors.primary + '20' },
    userName: { fontSize: 15, fontWeight: 'bold', color: Colors.text.primary },
    userSub: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 }
});

export default TestimonialSlider;
