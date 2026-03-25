import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { institutionAPI } from '../services/api';
import { Colors, Shadows } from '../constants/theme';
import { Star, MapPin, Building2, ChevronRight } from 'lucide-react-native';

const FeaturedCollegesScreen = () => {
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(null);

    useEffect(() => {
        fetchColleges();
    }, []);

    const fetchColleges = async () => {
        try {
            const res = await institutionAPI.getAll();
            setColleges(res.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch colleges');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFeature = async (id) => {
        setToggling(id);
        try {
            const res = await institutionAPI.toggleFeature(id);
            setColleges(prev => prev.map(c => c._id === id ? res.data : c));
        } catch (error) {
            Alert.alert('Error', 'Failed to toggle featured status');
        } finally {
            setToggling(null);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={styles.locRow}>
                    <MapPin size={12} color={Colors.text.tertiary} />
                    <Text style={styles.locText}>{item.location?.city || 'N/A'}</Text>
                    <View style={styles.dot} />
                    <Building2 size={12} color={Colors.text.tertiary} />
                    <Text style={styles.locText}>{item.type}</Text>
                </View>
                {item.rating?.value && (
                    <Text style={styles.ratingText}>Rating: {item.rating.value} ★</Text>
                )}
            </View>
            <TouchableOpacity
                onPress={() => handleToggleFeature(item._id)}
                disabled={toggling === item._id}
                style={[styles.starBtn, item.isFeatured && styles.starBtnActive]}
            >
                {toggling === item._id ? (
                    <ActivityIndicator size="small" color={item.isFeatured ? Colors.white : Colors.primary} />
                ) : (
                    <Star
                        size={20}
                        color={item.isFeatured ? Colors.white : Colors.primary}
                        fill={item.isFeatured ? Colors.white : 'transparent'}
                    />
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <MainLayout title="Featured Colleges" scrollable={false}>
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
            ) : (
                <FlatList
                    data={colleges}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={() => (
                        <View style={styles.header}>
                            <Text style={styles.headerText}>Star the colleges you want to feature in the student dashboard slider.</Text>
                        </View>
                    )}
                />
            )}
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    header: { marginBottom: 20, backgroundColor: Colors.primary + '10', padding: 12, borderRadius: 12 },
    headerText: { fontSize: 13, color: Colors.primary, lineHeight: 18 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        ...Shadows.xs,
        borderWidth: 1,
        borderColor: Colors.divider
    },
    cardInfo: { flex: 1 },
    name: { fontSize: 15, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 4 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    locText: { fontSize: 11, color: Colors.text.tertiary },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.divider },
    ratingText: { fontSize: 12, fontWeight: 'bold', color: '#F59E0B', marginTop: 4 },
    starBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center'
    },
    starBtnActive: { backgroundColor: Colors.primary }
});

export default FeaturedCollegesScreen;
