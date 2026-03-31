import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { Star, CheckCircle, XCircle, Trash2, MessageSquare } from 'lucide-react-native';
import { reviewAPI } from '../services/api';

const AdminReviewsScreen = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchReviews = async () => {
        try {
            const res = await reviewAPI.getAllAdmin();
            setReviews(res.data);
        } catch (error) {
            console.error('Fetch reviews error:', error);
            Alert.alert('Error', 'Failed to load reviews');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleTogglePublish = async (id) => {
        try {
            await reviewAPI.togglePublish(id);
            setReviews(reviews.map(r => r._id === id ? { ...r, isPublished: !r.isPublished } : r));
        } catch (error) {
            Alert.alert('Error', 'Failed to update review status');
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Review',
            'Are you sure you want to delete this review permanently?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await reviewAPI.delete(id);
                            setReviews(reviews.filter(r => r._id !== id));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete review');
                        }
                    }
                }
            ]
        );
    };

    const ReviewItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.userName}>{item.userName}</Text>
                    <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} color={s <= item.rating ? '#F59E0B' : '#CBD5E1'} fill={s <= item.rating ? '#F59E0B' : 'transparent'} />
                    ))}
                </View>
            </View>

            <Text style={styles.comment}>{item.comment || 'No comment provided'}</Text>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, item.isPublished ? styles.publishedBtn : styles.draftBtn]}
                    onPress={() => handleTogglePublish(item._id)}
                >
                    {item.isPublished ? <CheckCircle size={16} color={Colors.white} /> : <XCircle size={16} color={Colors.text.secondary} />}
                    <Text style={[styles.actionText, { color: item.isPublished ? Colors.white : Colors.text.secondary }]}>
                        {item.isPublished ? 'Published' : 'Draft'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item._id)}
                >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <MainLayout title="Review Management">
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={item => item._id}
                    renderItem={({ item }) => <ReviewItem item={item} />}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReviews(); }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MessageSquare size={40} color={Colors.divider} />
                            <Text style={styles.emptyText}>No reviews found yet</Text>
                        </View>
                    }
                />
            )}
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        ...Shadows.sm,
        borderWidth: 1,
        borderColor: Colors.divider
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    userName: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    date: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
    stars: { flexDirection: 'row', gap: 2 },
    comment: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20, marginBottom: 16 },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1
    },
    publishedBtn: { backgroundColor: '#10B981', borderColor: '#10B981' },
    draftBtn: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
    deleteBtn: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
    actionText: { fontSize: 12, fontWeight: 'bold' },
    empty: { alignItems: 'center', marginTop: 100, gap: 10 },
    emptyText: { color: Colors.text.tertiary, fontSize: 15 }
});

export default AdminReviewsScreen;
