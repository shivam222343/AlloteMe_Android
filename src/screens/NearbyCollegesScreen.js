import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import { institutionAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { MapPin, Star } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

const NearbyCollegesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNearby();
    }, []);

    const fetchNearby = async () => {
        try {
            const res = await institutionAPI.getAll();
            // Simple filter by user's city if available, else show all
            const userCity = user?.location?.split(',')[0].trim().toLowerCase();
            const nearby = res.data.filter(c =>
                c.location.city.toLowerCase() === userCity ||
                c.location.region.toLowerCase().includes(userCity)
            );
            setColleges(nearby.length > 0 ? nearby : res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const CollegeCard = ({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}>
            <Card style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={styles.rating}>
                        <Star size={12} color={Colors.warning} fill={Colors.warning} />
                        <Text style={styles.ratingText}>4.8</Text>
                    </View>
                </View>
                <View style={styles.locRow}>
                    <MapPin size={14} color={Colors.text.tertiary} />
                    <Text style={styles.locText}>{item.location.city}, {item.location.region}</Text>
                </View>
                <Text style={styles.distText}>Approx. 5km away</Text>
            </Card>
        </TouchableOpacity>
    );

    return (
        <MainLayout>
            <View style={styles.container}>
                <Text style={styles.title}>Colleges Near You</Text>
                <Text style={styles.subtitle}>Showing institutes in {user?.location || 'your area'}</Text>

                <FlatList
                    data={colleges}
                    keyExtractor={item => item._id}
                    renderItem={({ item }) => <CollegeCard item={item} />}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No colleges found nearby.</Text>}
                />
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { paddingVertical: Spacing.lg },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary },
    subtitle: { fontSize: 14, color: Colors.text.secondary, marginBottom: 20 },
    list: { paddingBottom: 20 },
    card: { marginBottom: 16, padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    name: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
    rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 12, fontWeight: 'bold' },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    locText: { fontSize: 12, color: Colors.text.secondary },
    distText: { fontSize: 10, color: Colors.primary, fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 40, color: Colors.text.tertiary }
});

export default NearbyCollegesScreen;
