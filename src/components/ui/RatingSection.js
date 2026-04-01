import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadows } from '../../constants/theme';
import { Star, Send, Sparkles, RotateCcw } from 'lucide-react-native';
import { reviewAPI, aiAPI } from '../../services/api';

const RatingSection = () => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [activeStar, setActiveStar] = useState(0);

    useEffect(() => {
        const loadStatus = async () => {
            const hasReviewed = await AsyncStorage.getItem('ALLOTEME_HAS_REVIEWED');
            if (hasReviewed === 'true') setSubmitted(true);
        };
        loadStatus();
    }, []);

    // Star sweep animation for encouragement
    useEffect(() => {
        if (rating === 0) {
            const interval = setInterval(() => {
                setActiveStar(prev => (prev + 1) % 6);
            }, 500);
            return () => clearInterval(interval);
        } else {
            setActiveStar(rating);
        }
    }, [rating]);

    const generateAIReview = async () => {
        setGenerating(true);
        try {
            const res = await aiAPI.generateReview(rating);
            if (res.data?.reply) {
                setComment(res.data.reply);
            } else {
                useFallback();
            }
        } catch (error) {
            console.log('AI review gen error, using fallback');
            useFallback();
        } finally {
            setGenerating(false);
        }
    };

    const useFallback = () => {
        const templates = {
            5: [
                "Life-changing app! The predictions are incredibly accurate for MHTCET. 🚀",
                "Absolutely love the UI. Finding the right college has never been easier!",
                "AlloteMe is a must-have for every engineering aspirant. 10/10!",
                "The AI Counselor is literally like having a personal coach. Amazing stuff!",
                "Simplified the entire admission process for me. Best platform out there!",
                "Best decision ever to use AlloteMe. The data is super reliable."
            ],
            4: [
                "Really helpful tool for shortlisting colleges. Highly recommend! 👍",
                "Solid predictions and great interface. Helped me save a lot of time.",
                "Better than most counseling services. Accurate and easy to use.",
                "Great experience so far. The cutoff data is very clearly presented.",
                "Excellent UI and very responsive AI. Very helpful for beginners."
            ],
            3: [
                "Good app for basic college research. Helpful for cutoffs. ✨",
                "Does the job well. Useful during the hectic admission phase.",
                "Fairly accurate but can be improved further in AI counselor tips.",
                "Okay experience. Useful data tool for admission tracking."
            ],
            2: [
                "It's decent, but I expected more deep analytics from the AI.",
                "Needs some more refinements but overall a good attempt."
            ],
            1: [
                "Found some data points missing. Hope to see better accuracy soon."
            ]
        };

        const list = templates[rating] || templates[5];
        let random = list[Math.floor(Math.random() * list.length)];
        if (random === comment && list.length > 1) {
            random = list.filter(r => r !== random)[Math.floor(Math.random() * (list.length - 1))];
        }
        setComment(random);
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Review Required', 'Please select a star rating first.');
            return;
        }

        setSubmitting(true);
        try {
            await reviewAPI.submit({ rating, comment: comment.trim() });
            await AsyncStorage.setItem('ALLOTEME_HAS_REVIEWED', 'true');
            setSubmitted(true);
            Alert.alert('Success', 'Your review has been submitted for approval!');
        } catch (error) {
            console.error('Submit review error:', error);
            Alert.alert('Error', 'Failed to submit review. Try again later.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = async () => {
        await AsyncStorage.removeItem('ALLOTEME_HAS_REVIEWED');
        setSubmitted(false);
        setRating(0);
        setComment('');
    };

    if (submitted) {
        return (
            <View style={styles.card}>
                <View style={[styles.statusIcon, { backgroundColor: '#10B98115' }]}>
                    <Star size={24} color="#10B981" fill="#10B981" />
                </View>
                <Text style={styles.statusTitle}>Review Published!</Text>
                <Text style={styles.statusSub}>Thank you! Your feedback is now Live and helping other students. ✨</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                    <RotateCcw size={14} color={Colors.primary} />
                    <Text style={styles.resetText}>Submit Another</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <Text style={styles.title}>How was your experience?</Text>
            <Text style={styles.sub}>Your feedback helps us improve our guidance.</Text>

            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => {
                    const isFilled = rating > 0 ? s <= rating : s <= activeStar;
                    const isPulsing = rating === 0 && s === activeStar;

                    return (
                        <TouchableOpacity
                            key={s}
                            onPress={() => setRating(s)}
                            activeOpacity={0.7}
                            style={styles.starBtn}
                        >
                            <Animated.View style={isPulsing ? { transform: [{ scale: 1.2 }] } : null}>
                                <Star
                                    size={34}
                                    color={isFilled ? '#F59E0B' : '#E2E8F0'}
                                    fill={isFilled ? '#F59E0B' : 'transparent'}
                                    strokeWidth={isFilled ? 1.5 : 2}
                                />
                            </Animated.View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {rating > 0 && (
                <View style={styles.inputContainer}>
                    <View style={styles.aiHeader}>
                        <Text style={styles.inputLabel}>Share your thoughts</Text>
                        <TouchableOpacity style={[styles.aiBtn, generating && { opacity: 0.7 }]} onPress={generateAIReview} disabled={generating}>
                            {generating ? (
                                <ActivityIndicator size="small" color={Colors.primary} scale={0.6} />
                            ) : (
                                <Sparkles size={14} color={Colors.primary} />
                            )}
                            <Text style={styles.aiBtnText}>{generating ? 'Generating...' : 'AI Generate'}</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        placeholder="Write a few lines or use AI to generate..."
                        placeholderTextColor="#94A3B8"
                        style={styles.input}
                        multiline
                        numberOfLines={3}
                        value={comment}
                        onChangeText={setComment}
                    />
                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Text style={styles.submitText}>Submit Review</Text>
                                <Send size={16} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        padding: 24,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        borderRadius: 24,
        marginHorizontal: 16,
        ...Shadows.sm,
        alignItems: 'center'
    },
    title: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 8 },
    sub: { fontSize: 13, color: Colors.text.tertiary, textAlign: 'center', marginBottom: 20 },
    starRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    starBtn: { padding: 4 },
    inputContainer: { width: '100%', gap: 12 },
    input: {
        backgroundColor: '#F8FAF6',
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        color: Colors.text.primary,
        textAlignVertical: 'top',
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 10,
        ...Shadows.sm
    },
    submitText: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
    disabledBtn: { opacity: 0.7 },
    statusIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    statusTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 6 },
    statusSub: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center', lineHeight: 20 },
    aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    inputLabel: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginLeft: 4 },
    aiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8
    },
    aiBtnText: { fontSize: 11, fontWeight: 'bold', color: Colors.primary },
    resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 15, padding: 8 },
    resetText: { fontSize: 13, color: Colors.primary, fontWeight: '600' }
});

export default RatingSection;
