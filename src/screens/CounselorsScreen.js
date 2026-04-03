import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ActivityIndicator, TextInput, RefreshControl
} from 'react-native';
import {
    Search, Award, Briefcase, MapPin, Star,
    ChevronRight, Phone, MessageSquare, Filter
} from 'lucide-react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { counselorAPI } from '../services/api';

const CounselorsScreen = ({ navigation }) => {
    const [counselors, setCounselors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCounselors();
    }, []);

    const fetchCounselors = async () => {
        try {
            const res = await counselorAPI.getAll();
            setCounselors(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchCounselors();
    };

    const filteredCounselors = counselors.filter(c => {
        const nameMatch = c.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const fieldMatch = c.field?.toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || fieldMatch;
    });

    const renderCard = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CounselorDetail', { id: item._id })}
        >
            <View style={styles.cardMain}>
                <Image source={{ uri: item.profileImage }} style={styles.profileImg} />
                <View style={styles.cardContent}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{item.name}</Text>
                        <View style={styles.ratingBadge}>
                            <Star size={12} color="#fbbf24" fill="#fbbf24" />
                            <Text style={styles.ratingText}>{item.rating || '4.8'}</Text>
                        </View>
                    </View>

                    <Text style={styles.fieldText}>{item.field}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Award size={14} color="#64748b" />
                            <Text style={styles.metaText}>{item.experience} Exp.</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <MapPin size={14} color="#64748b" />
                            <Text style={styles.metaText}>
                                {item.cityName || (typeof item.location === 'string' ? item.location : 'Expert')}
                            </Text>
                        </View>
                    </View>
                </View>
                <ChevronRight size={20} color="#cbd5e1" />
            </View>

            <View style={styles.cardActions}>
                <View style={styles.badges}>
                    <View style={styles.tag}><Text style={styles.tagText}>Verified</Text></View>
                    <View style={[styles.tag, { backgroundColor: '#f0fdf4' }]}><Text style={[styles.tagText, { color: '#16a34a' }]}>Available</Text></View>
                </View>
                <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CounselorDetail', { id: item._id })}>
                        <Phone size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => navigation.navigate('CounselorDetail', { id: item._id })}>
                        <MessageSquare size={18} color="#16a34a" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <MainLayout title="Expert Counselors">
            <View style={styles.container}>
                {/* Search Bar */}
                <View style={styles.searchBox}>
                    <Search size={20} color="#94a3b8" />
                    <TextInput
                        placeholder="Search by name or specialty..."
                        style={styles.input}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Filter size={20} color={Colors.primary} />
                </View>

                {loading && !refreshing ? (
                    <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
                ) : (
                    <FlatList
                        data={filteredCounselors}
                        keyExtractor={item => item._id}
                        renderItem={renderCard}
                        contentContainerStyle={styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <MessageSquare size={48} color="#cbd5e1" />
                                <Text style={styles.emptyTitle}>No Experts Found</Text>
                                <Text style={styles.emptyText}>Try searching for a different specialty or location.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        margin: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        height: 55,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1e293b' },
    list: { padding: 16, paddingTop: 0 },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        ...Shadows.sm
    },
    cardMain: { flexDirection: 'row', alignItems: 'center' },
    profileImg: { width: 65, height: 65, borderRadius: 18, backgroundColor: '#f1f5f9' },
    cardContent: { flex: 1, marginLeft: 16 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    name: { fontSize: 17, fontWeight: 'bold', color: '#0f172a' },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    ratingText: { fontSize: 11, fontWeight: 'bold', color: '#d97706' },
    fieldText: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginBottom: 8 },
    metaRow: { flexDirection: 'row', gap: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#64748b' },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' },
    badges: { flexDirection: 'row', gap: 8 },
    tag: { backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tagText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary },
    btnRow: { flexDirection: 'row', gap: 10 },
    iconBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
    empty: { marginTop: 80, alignItems: 'center', paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 16 },
    emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 8 }
});

export default CounselorsScreen;
