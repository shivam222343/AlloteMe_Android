import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Image, TextInput, ScrollView, Alert } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import { institutionAPI, authAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Search, MapPin, Star, Pencil, Info, Trash2, ArrowUpDown, Filter, ChevronDown, Check } from 'lucide-react-native';
import { Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import OptimizedImage from '../components/ui/OptimizedImage';

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
    const [showSortModal, setShowSortModal] = useState(false);
    const [showCityModal, setShowCityModal] = useState(false);

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

    const handleFilter = (text, tab, sort = sortBy, city = activeCity) => {
        setSearch(text);
        setActiveTab(tab);
        setSortBy(sort);
        setActiveCity(city);

        let filteredData = institutions.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(text.toLowerCase()) ||
                (item.university && item.university.toLowerCase().includes(text.toLowerCase()));
            const matchesTab = tab === 'All' || item.type.includes(tab);
            const matchesCity = city === 'All Cities' || item.location?.city === city;
            return matchesSearch && matchesTab && matchesCity;
        });

        // Apply Sorting
        if (sort === 'fees-low') {
            filteredData.sort((a, b) => (a.feesPerYear || 0) - (b.feesPerYear || 0));
        } else if (sort === 'fees-high') {
            filteredData.sort((a, b) => (b.feesPerYear || 0) - (a.feesPerYear || 0));
        } else if (sort === 'rating') {
            filteredData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sort === 'name') {
            filteredData.sort((a, b) => a.name.localeCompare(b.name));
        }

        setFiltered(filteredData);
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
                            {item.dteCode && (
                                <View style={styles.dteMiniBadge}>
                                    <Text style={styles.dteMiniText}>DTE: {item.dteCode}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.badgeRow}>
                    <View style={styles.professionTag}><Text style={styles.professionTagText}>{item.type}</Text></View>
                    {item.rating?.value && (
                        <View style={styles.nirfBadgeMini}>
                            <Star size={12} color="#B8860B" fill="#B8860B" />
                            <Text style={styles.nirfTextMini}>{item.rating.value} {item.rating.platform}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.itemFooter}>
                    <View style={styles.itemLoc}>
                        <MapPin size={14} color={Colors.text.tertiary} />
                        <Text style={styles.itemLocText}>{item.location.city}, {item.location.region}</Text>
                    </View>
                    <View style={styles.itemFooterRight}>
                        <Text style={styles.itemFees}>₹{item.feesPerYear?.toLocaleString()}/yr</Text>
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

    return (
        <MainLayout scrollable={false} noPadding>
            <View style={styles.container}>
                <View style={styles.tabBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.tabItem, isActive && styles.activeTabItem]}
                                    onPress={() => handleFilter(search, tab)}
                                >
                                    <Text style={[styles.tabItemText, isActive && styles.activeTabItemText]}>{tab}</Text>
                                    {isActive && <View style={styles.activeLine} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <SectionList
                    sections={filtered && filtered.length > 0 ? [{ title: 'Colleges', data: filtered }] : []}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => <InstitutionCard item={item} />}
                    ListHeaderComponent={() => (
                        <View style={styles.topSection}>
                            <Text style={styles.title}>Explore Colleges</Text>
                            <View style={styles.searchBar}>
                                <Search size={20} color={Colors.text.tertiary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search colleges..."
                                    value={search}
                                    onChangeText={(t) => handleFilter(t, activeTab)}
                                />
                            </View>

                            <View style={styles.filterOptions}>
                                <TouchableOpacity style={styles.filterBtn} onPress={() => setShowSortModal(true)}>
                                    <ArrowUpDown size={14} color={Colors.primary} />
                                    <Text style={styles.filterBtnText}>
                                        {sortOptions.find(o => o.id === sortBy)?.label.split(':')[0] || 'Sort'}
                                    </Text>
                                    <ChevronDown size={14} color={Colors.text.tertiary} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.filterBtn} onPress={() => setShowCityModal(true)}>
                                    <MapPin size={14} color={Colors.primary} />
                                    <Text style={styles.filterBtnText} numberOfLines={1}>{activeCity}</Text>
                                    <ChevronDown size={14} color={Colors.text.tertiary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    stickySectionHeadersEnabled={true}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Search size={48} color={Colors.primary + '40'} />
                                <View style={styles.emptyCircle} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {loading ? 'Fetching Institutes...' : 'No Colleges Found'}
                            </Text>
                            <Text style={styles.emptySubText}>
                                {loading
                                    ? 'Connecting to high-speed admission database...'
                                    : `We couldn't find any ${activeTab !== 'All' ? activeTab : ''} colleges matching your filters in ${activeCity}.`}
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
            </View>

            {/* Sort Modal */}
            <Modal
                visible={showSortModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSortModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sort By</Text>
                            <TouchableOpacity onPress={() => setShowSortModal(false)} style={styles.closeBtn}>
                                <Check size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                        {sortOptions.map(opt => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.modalItem, sortBy === opt.id && styles.activeModalItem]}
                                onPress={() => {
                                    handleFilter(search, activeTab, opt.id);
                                    setShowSortModal(false);
                                }}
                            >
                                <opt.icon size={20} color={sortBy === opt.id ? Colors.primary : Colors.text.tertiary} />
                                <Text style={[styles.modalItemText, sortBy === opt.id && styles.activeModalItemText]}>{opt.label}</Text>
                                {sortBy === opt.id && <Check size={18} color={Colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* City Modal */}
            <Modal
                visible={showCityModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCityModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select City</Text>
                            <TouchableOpacity onPress={() => setShowCityModal(false)} style={styles.closeBtn}>
                                <Check size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {cities.map(city => (
                                <TouchableOpacity
                                    key={city}
                                    style={[styles.modalItem, activeCity === city && styles.activeModalItem]}
                                    onPress={() => {
                                        handleFilter(search, activeTab, sortBy, city);
                                        setShowCityModal(false);
                                    }}
                                >
                                    <MapPin size={20} color={activeCity === city ? Colors.primary : Colors.text.tertiary} />
                                    <Text style={[styles.modalItemText, activeCity === city && styles.activeModalItemText]}>{city}</Text>
                                    {activeCity === city && <Check size={18} color={Colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    topSection: { paddingVertical: 20, paddingHorizontal: 20, backgroundColor: Colors.white },
    title: { fontSize: 28, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 16 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: Colors.text.primary },
    filterOptions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    filterBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.divider,
        gap: 8,
        ...Shadows.sm
    },
    filterBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary, flex: 1 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '80%',
        ...Shadows.lg
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.divider, justifyContent: 'center', alignItems: 'center' },
    modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, gap: 12 },
    activeModalItem: { backgroundColor: Colors.primary + '08' },
    modalItemText: { fontSize: 16, color: Colors.text.primary, flex: 1 },
    activeModalItemText: { color: Colors.primary, fontWeight: 'bold' },

    tabBar: {
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider
    },
    tabScroll: { paddingHorizontal: 10 },
    tabItem: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    activeTabItem: {},
    tabItemText: { fontSize: 14, color: Colors.text.tertiary, fontWeight: '600' },
    activeTabItemText: { color: Colors.primary, fontWeight: 'bold' },
    activeLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: Colors.primary,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3
    },

    listContent: { paddingBottom: 80 },
    listItem: {
        padding: 20,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider
    },
    itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
    itemThumbnail: { width: 60, height: 60, borderRadius: 12, backgroundColor: Colors.divider },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 2 },
    subInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemUniversity: { fontSize: 13, color: Colors.text.tertiary, fontWeight: '500' },
    dteMiniBadge: { backgroundColor: Colors.primary + '08', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: Colors.primary + '15' },
    dteMiniText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary },

    badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
    professionTag: {
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 6, borderWidth: 1, borderColor: Colors.primary + '20'
    },
    professionTagText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary, textTransform: 'uppercase' },
    nirfBadgeMini: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 6, borderWidth: 1, borderColor: '#FFD54F'
    },
    nirfTextMini: { fontSize: 10, fontWeight: 'bold', color: '#B8860B' },

    itemFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center'
    },
    itemLoc: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itemLocText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '500' },
    itemFees: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
    itemFooterRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.primary + '12',
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 10, borderWidth: 1, borderColor: Colors.primary + '25'
    },
    deleteBtn: {
        backgroundColor: Colors.error + '10',
        paddingHorizontal: 8, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1, borderColor: Colors.error + '25',
        justifyContent: 'center', alignItems: 'center'
    },
    editBtnText: { fontSize: 11, fontWeight: 'bold', color: Colors.primary },
    emptyContainer: { alignItems: 'center', paddingVertical: 100, paddingHorizontal: 40 },
    emptyIconContainer: { marginBottom: 24, position: 'relative', alignItems: 'center', justifyContent: 'center' },
    emptyCircle: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary + '08' },
    emptyTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 12 },
    emptySubText: { textAlign: 'center', color: Colors.text.tertiary, fontSize: 14, lineHeight: 22, marginBottom: 24 },
    resetBtn: { backgroundColor: Colors.primary + '10', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary + '20' },
    resetBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 }
});

export default BrowseCollegesScreen;
