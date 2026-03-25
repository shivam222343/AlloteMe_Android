import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ScrollView } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import { institutionAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Search, MapPin, Star, Pencil } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

const BrowseCollegesScreen = ({ navigation }) => {
    const { user, socket } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [institutions, setInstitutions] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    const tabs = ['All', 'Autonomous', 'Government', 'Private', 'Deemed'];

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
    }, [socket]);

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

    const handleFilter = (text, tab) => {
        setSearch(text);
        setActiveTab(tab);
        const filteredData = institutions.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(text.toLowerCase()) ||
                (item.university && item.university.toLowerCase().includes(text.toLowerCase()));
            const matchesTab = tab === 'All' || item.type.includes(tab);
            return matchesSearch && matchesTab;
        });
        setFiltered(filteredData);
    };

    const InstitutionCard = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}
            style={styles.listItem}
        >
            <View style={styles.itemHeader}>
                {item.galleryImages && item.galleryImages[0] ? (
                    <Image source={{ uri: item.galleryImages[0] }} style={styles.itemThumbnail} />
                ) : (
                    <Image source={require('../assets/images/college_default.jpg')} style={styles.itemThumbnail} />
                )}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
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
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={(e) => {
                                e.stopPropagation();
                                navigation.navigate('EditInstitution', { id: item._id });
                            }}
                        >
                            <Pencil size={14} color={Colors.primary} />
                            <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <MainLayout scrollable={false} noPadding>
            <View style={styles.container}>
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
                </View>

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

    listContent: { paddingBottom: 120 },
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
    editBtnText: { fontSize: 12, fontWeight: 'bold', color: Colors.primary },
    emptyText: { textAlign: 'center', marginTop: 60, color: Colors.text.tertiary, fontSize: 15 }
});

export default BrowseCollegesScreen;
