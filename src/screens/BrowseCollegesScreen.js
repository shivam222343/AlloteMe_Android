import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Image, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { institutionAPI, authAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Search, MapPin, Star, Pencil, Info, Trash2, ArrowUpDown, Filter, ChevronDown, Check } from 'lucide-react-native';
import { Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import OptimizedImage from '../components/ui/OptimizedImage';
import { SkeletonInstitutionCard } from '../components/SkeletonLoader';


const BrowseCollegesScreen = ({ navigation }) => {
    const { user, socket, refreshUser, toggleSaveOptimistic, admissionPath } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [institutions, setInstitutions] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [savingId, setSavingId] = useState(null);
    const [sortBy, setSortBy] = useState('default'); // 'default', 'fees-low', 'fees-high', 'rating', 'name'
    const [activeCity, setActiveCity] = useState('All Cities');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedType, setSelectedType] = useState('All');

    const tabs = ['All', 'Autonomous', 'Government', 'Private', 'Deemed'];
    const sortOptions = [
        { id: 'default', label: 'Default Order', icon: ArrowUpDown },
        { id: 'fees-low', label: 'Fees: Low to High', icon: ArrowUpDown },
        { id: 'fees-high', label: 'Fees: High to Low', icon: ArrowUpDown },
        { id: 'rating', label: 'Top Rated First', icon: Star },
        { id: 'name', label: 'Name (A-Z)', icon: Info },
    ];

    const cities = ['All Cities', ...new Set(institutions.map(i => i.location?.city).filter(Boolean))].sort();

    useEffect(() => {
        fetchInstitutions();

        if (socket) {
            const handleUpdate = () => {
                console.log('[Socket] Institution changed, refreshing list...');
                fetchInstitutions();
            };

            socket.on('institution:created', handleUpdate);
            socket.on('institution:updated', handleUpdate);
            socket.on('institution:deleted', handleUpdate);

            return () => {
                socket.off('institution:created', handleUpdate);
                socket.off('institution:updated', handleUpdate);
                socket.off('institution:deleted', handleUpdate);
            };
        }
    }, [socket, admissionPath]);

    const fetchInstitutions = async () => {
        setLoading(true);
        try {
            const res = await institutionAPI.getAll(admissionPath);
            setInstitutions(res.data);
            setFiltered(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Are you sure you want to delete ${name}? This will remove all cutoff data for this institute.`);
            if (confirmed) {
                try {
                    await institutionAPI.delete(id);
                    fetchInstitutions();
                } catch (err) {
                    window.alert('Failed to delete institution');
                }
            }
            return;
        }

        Alert.alert(
            "Delete Institution",
            `Are you sure you want to delete ${name}? This will remove all cutoff data for this institute.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await institutionAPI.delete(id);
                            // List will auto-refresh via Socket if connected, but local refresh is safer
                            fetchInstitutions();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete institution');
                        }
                    }
                }
            ]
        );
    };

    const handleFilter = (text, type = selectedType, sort = sortBy, city = activeCity) => {
        setSearch(text);
        setSelectedType(type);
        setSortBy(sort);
        setActiveCity(city);

        let filteredData = institutions.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(text.toLowerCase()) ||
                (item.university && item.university.toLowerCase().includes(text.toLowerCase()));
            const matchesType = type === 'All' || item.type.includes(type);
            const matchesCity = city === 'All Cities' || item.location?.city === city;
            return matchesSearch && matchesType && matchesCity;
        });

        // Apply Sorting
        if (sort === 'fees-low') {
            filteredData.sort((a, b) => (a.feesPerYear || 0) - (b.feesPerYear || 0));
        } else if (sort === 'fees-high') {
            filteredData.sort((a, b) => (b.feesPerYear || 0) - (a.feesPerYear || 0));
        } else if (sort === 'rating') {
            filteredData.sort((a, b) => (b.rating?.value || 0) - (a.rating?.value || 0));
        } else if (sort === 'name') {
            filteredData.sort((a, b) => a.name.localeCompare(b.name));
        }

        setFiltered(filteredData);
    };

    const getSections = () => {
        if (filtered.length === 0) return [];

        // Group by city
        const groups = filtered.reduce((acc, inst) => {
            const city = inst.location?.city || 'Other Cities';
            if (!acc[city]) acc[city] = [];
            acc[city].push(inst);
            return acc;
        }, {});

        // Convert to SectionList format
        const citySections = Object.keys(groups).sort().map(city => ({
            title: city,
            data: groups[city]
        }));

        return citySections;
    };

    const handleToggleSave = async (id) => {
        await toggleSaveOptimistic(id);
    };

    const InstitutionCard = ({ item }) => {
        const isSaved = user?.savedColleges?.some(c => (c._id === item._id || c === item._id));

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}
                style={styles.listItem}
            >
                <View style={styles.itemHeader}>
                    {item.galleryImages && item.galleryImages[0] ? (
                        <OptimizedImage
                            source={{ uri: item.galleryImages?.[0] || 'https://images.unsplash.com/photo-1541339907198-e08756eaa589?q=80&w=400' }}
                            style={styles.itemThumbnail}
                        />
                    ) : (
                        <Image source={require('../assets/images/college_default.jpg')} style={styles.itemThumbnail} />
                    )}
                    <View style={styles.itemInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text style={[styles.itemName, { flex: 1 }]}>{item.name}</Text>
                            {user?.role === 'student' && (
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleToggleSave(item._id);
                                    }}
                                    style={{ padding: 4 }}
                                >
                                    <Star
                                        size={22}
                                        color={isSaved ? "#F59E0B" : "#CBD5E1"}
                                        fill={isSaved ? "#F59E0B" : "transparent"}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.subInfoRow}>
                            <Text style={styles.itemUniversity}>{item.university || 'Affiliated'}</Text>

                        </View>
                    </View>
                </View>

                <View style={styles.badgeRow}>
                    <View style={styles.professionTag}><Text style={styles.professionTagText}>{item.type}</Text></View>
                    {item.dteCode && (
                        <View style={styles.dteMiniBadge}>
                            <Text style={styles.dteMiniText}>DTE: {item.dteCode}</Text>
                        </View>
                    )}
                    {item.rating?.value && (
                        <View style={styles.nirfBadgeMini}>
                            <Star size={12} color="#B8860B" fill="#B8860B" />
                            <Text style={styles.nirfTextMini}>{item.rating.value}</Text>
                        </View>
                    )}

                </View>

                <View style={styles.itemFooter}>
                    <View style={styles.itemLoc}>
                        <MapPin size={14} color={Colors.text.tertiary} />
                        <Text style={styles.itemLocText}>{item.location.city}, {item.location.region}</Text>
                    </View>
                    <View style={styles.itemFooterRight}>
                        <Text style={styles.itemFees}>Approx ₹{item.feesPerYear?.toLocaleString()}/yr</Text>
                        {isAdmin && (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        navigation.navigate('EditInstitution', { id: item._id });
                                    }}
                                >
                                    <Pencil size={12} color={Colors.primary} />
                                    <Text style={styles.editBtnText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item._id, item.name);
                                    }}
                                >
                                    <Trash2 size={12} color={Colors.error} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title } }) => {
        return (
            <View style={styles.citySectionHeader}>
                <MapPin size={14} color={Colors.primary} />
                <Text style={styles.citySectionTitle}>{title}</Text>
                <View style={styles.citySectionLine} />
            </View>
        );
    };

    const ListHeader = () => (
        <View style={styles.topSection}>
            <View style={styles.titleRow}>
                <View>
                    <Text style={styles.title}>Explore Colleges</Text>
                    <Text style={styles.subtitle}>{filtered.length} institutes available</Text>
                </View>
            </View>
        </View>
    );

    const sections = getSections();

    return (
        <MainLayout title="Browse Colleges" scrollable={false} noPadding>
            <View style={styles.container}>
                <View style={styles.stickySearchContainer}>
                    <View style={styles.searchBar}>
                        <Search size={20} color={Colors.text.tertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search colleges..."
                            value={search}
                            onChangeText={(t) => handleFilter(t)}
                        />
                        <TouchableOpacity
                            style={styles.searchFilterBtn}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <Filter size={18} color={Colors.primary} />
                            {(sortBy !== 'default' || activeCity !== 'All Cities' || selectedType !== 'All') && (
                                <View style={styles.filterDot} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {loading && institutions.length === 0 ? (
                    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonInstitutionCard key={i} />
                        ))}
                    </ScrollView>
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => <InstitutionCard item={item} />}
                        renderSectionHeader={renderSectionHeader}
                        ListHeaderComponent={ListHeader}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        stickySectionHeadersEnabled={true}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <Search size={48} color={Colors.primary + '40'} />
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {loading ? 'Fetching Institutes...' : 'No Colleges Found'}
                                </Text>
                                <Text style={styles.emptySubText}>
                                    {loading
                                        ? 'Connecting to high-speed admission database...'
                                        : `We couldn't find any ${selectedType !== 'All' ? selectedType : ''} colleges matching your filters in ${activeCity}.`}
                                </Text>
                                {!loading && (
                                    <TouchableOpacity
                                        style={styles.resetBtn}
                                        onPress={() => handleFilter('', 'All', 'default', 'All Cities')}
                                    >
                                        <Text style={styles.resetBtnText}>Clear All Filters</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        }
                    />
                )}
            </View>

            {/* Unified Filter Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentExtended}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Filter size={20} color={Colors.primary} />
                                <Text style={styles.modalTitle}>Filters & Sorting</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeBtn}>
                                <Check size={24} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <Text style={styles.filterLabel}>Institution Type</Text>
                            <View style={styles.filterGrid}>
                                {tabs.map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
                                        onPress={() => handleFilter(search, type)}
                                    >
                                        <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.filterLabel}>Sort By</Text>
                            <View style={styles.filterGrid}>
                                {sortOptions.map(opt => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.filterChip, sortBy === opt.id && styles.filterChipActive]}
                                        onPress={() => handleFilter(search, selectedType, opt.id)}
                                    >
                                        <opt.icon size={14} color={sortBy === opt.id ? Colors.primary : Colors.text.tertiary} />
                                        <Text style={[styles.filterChipText, sortBy === opt.id && styles.filterChipTextActive]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.filterLabel}>Select City</Text>
                            <View style={styles.filterGrid}>
                                {cities.map(city => (
                                    <TouchableOpacity
                                        key={city}
                                        style={[styles.filterChip, activeCity === city && styles.filterChipActive]}
                                        onPress={() => handleFilter(search, selectedType, sortBy, city)}
                                    >
                                        <Text style={[styles.filterChipText, activeCity === city && styles.filterChipTextActive]}>{city}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Button
                                title="Apply Filters"
                                onPress={() => setShowFilterModal(false)}
                                style={{ marginTop: 30 }}
                            />
                            <TouchableOpacity
                                style={styles.clearAllBtn}
                                onPress={() => {
                                    handleFilter('', 'All', 'default', 'All Cities');
                                    setShowFilterModal(false);
                                }}
                            >
                                <Text style={styles.clearAllText}>Reset All</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    topSection: { paddingTop: 20, paddingHorizontal: 20, backgroundColor: Colors.white, paddingBottom: 10 },
    titleRow: { marginBottom: 12 },
    title: { fontSize: 26, fontWeight: 'bold', color: Colors.text.primary },
    subtitle: { fontSize: 13, color: Colors.text.tertiary, marginTop: 4 },

    stickySearchContainer: {
        backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12, ...Shadows.sm
    },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9',
        borderRadius: 16, paddingHorizontal: 16, height: 56, gap: 12
    },
    searchInput: { flex: 1, fontSize: 16, color: Colors.text.primary, height: '100%' },
    searchFilterBtn: { padding: 8, position: 'relative' },
    filterDot: {
        position: 'absolute', top: 4, right: 4, width: 8, height: 8,
        borderRadius: 4, backgroundColor: Colors.primary, borderWidth: 1.5, borderColor: '#F1F5F9'
    },

    citySectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 12,
        marginTop: 8
    },
    citySectionTitle: { fontSize: 13, fontWeight: 'bold', color: Colors.text.secondary, textTransform: 'uppercase', letterSpacing: 1 },
    citySectionLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0', marginLeft: 8 },

    listContent: { paddingBottom: 100 },
    listItem: {
        padding: 16,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.green
    },
    itemHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    itemThumbnail: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F1F5F9' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    subInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    itemUniversity: { fontSize: 12, color: Colors.text.tertiary },
    dteMiniBadge: { backgroundColor: '#F0F9FF', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
    dteMiniText: { fontSize: 9, fontWeight: 'bold', color: '#0369A1' },

    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    professionTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    professionTagText: { fontSize: 10, fontWeight: 'bold', color: Colors.text.secondary },
    nirfBadgeMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    nirfTextMini: { fontSize: 10, fontWeight: 'bold', color: '#92400E' },

    itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    itemLocText: { fontSize: 12, color: Colors.text.tertiary },
    itemFees: { fontSize: 15, fontWeight: 'bold', color: Colors.primary },
    itemFooterRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    editBtnText: { fontSize: 11, fontWeight: 'bold', color: Colors.primary },
    deleteBtn: { padding: 4 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContentExtended: {
        backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: 24, maxHeight: '85%', ...Shadows.lg
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    closeBtn: { padding: 4 },
    filterLabel: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary, marginTop: 24, marginBottom: 12 },
    filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0'
    },
    filterChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
    filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
    filterChipTextActive: { color: Colors.primary },
    clearAllBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
    clearAllText: { color: Colors.text.tertiary, fontSize: 14, fontWeight: '600' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    loadingText: { fontSize: 16, color: Colors.text.tertiary, fontWeight: '600' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 8 },
    emptySubText: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 },
    resetBtn: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.primary },
    resetBtnText: { color: Colors.white, fontWeight: 'bold' }
});

export default BrowseCollegesScreen;
