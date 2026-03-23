import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import { institutionAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Search, MapPin, Star, ExternalLink } from 'lucide-react-native';

const BrowseCollegesScreen = ({ navigation }) => {
    const [institutions, setInstitutions] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInstitutions();
    }, []);

    const fetchInstitutions = async () => {
        try {
            const res = await institutionAPI.getAll();
            setInstitutions(res.data);
            setFiltered(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearch(text);
        const filteredData = institutions.filter(item =>
            item.name.toLowerCase().includes(text.toLowerCase()) ||
            item.university.toLowerCase().includes(text.toLowerCase())
        );
        setFiltered(filteredData);
    };

    const InstitutionCard = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}
        >
            <Card style={styles.instCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.imageLetter}>{item.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.instName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.university}>{item.university}</Text>
                    </View>
                </View>

                <View style={styles.badgeRow}>
                    <View style={styles.tag}><Text style={styles.tagText}>{item.type}</Text></View>
                    <View style={styles.ratingBox}>
                        <Star size={12} color={Colors.warning} fill={Colors.warning} />
                        <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
                    </View>
                </View>

                <View style={styles.footerRow}>
                    <View style={styles.locRow}>
                        <MapPin size={14} color={Colors.text.tertiary} />
                        <Text style={styles.locText}>{item.location.city}, {item.location.region}</Text>
                    </View>
                    <Text style={styles.fees}>₹{item.feesPerYear}/yr</Text>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <MainLayout scrollable={false}>
            <View style={styles.container}>
                <View style={styles.topSection}>
                    <Text style={styles.title}>Explore Colleges</Text>
                    <View style={styles.searchBar}>
                        <Search size={20} color={Colors.text.tertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or university..."
                            value={search}
                            onChangeText={handleSearch}
                        />
                    </View>
                </View>

                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => <InstitutionCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>{loading ? 'Loading...' : 'No colleges found'}</Text>
                    }
                />
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topSection: { padding: Spacing.lg, paddingBottom: 8 },
    title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: 16 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: Colors.text.primary },
    listContent: { padding: Spacing.lg, paddingTop: 8 },
    instCard: { marginBottom: 16, padding: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    imagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: Colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    imageLetter: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
    headerInfo: { flex: 1 },
    instName: { fontSize: 16, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
    university: { fontSize: 12, color: Colors.text.tertiary },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tag: { backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    tagText: { fontSize: 10, fontWeight: '600', color: Colors.text.secondary },
    ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 12, fontWeight: 'bold', color: Colors.text.primary },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 12 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locText: { fontSize: 12, color: Colors.text.secondary },
    fees: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
    emptyText: { textAlign: 'center', marginTop: 40, color: Colors.text.tertiary }
});

export default BrowseCollegesScreen;
