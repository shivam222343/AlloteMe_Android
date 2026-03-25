import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Star, Building2, ChevronRight, Bookmark } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

const SavedCollegesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('All');
    const [filtered, setFiltered] = useState([]);

    const tabs = ['All', 'Autonomous', 'Government', 'Private', 'Deemed'];
    const saved = user?.savedColleges || [];

    useEffect(() => {
        handleFilter(activeTab);
    }, [user?.savedColleges, activeTab]);

    const handleFilter = (tab) => {
        setActiveTab(tab);
        if (tab === 'All') {
            setFiltered(saved);
        } else {
            setFiltered(saved.filter(item => item.type?.includes(tab)));
        }
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
                <View style={{ flex: 1 }} />
                <Star size={20} color="#F59E0B" fill="#F59E0B" />
            </View>

            <View style={styles.itemFooter}>
                <View style={styles.itemLoc}>
                    <MapPin size={14} color={Colors.text.tertiary} />
                    <Text style={styles.itemLocText}>{item.location?.city}, {item.location?.region}</Text>
                </View>
                <View style={styles.itemFooterRight}>
                    <Text style={styles.itemFees}>₹{item.feesPerYear?.toLocaleString()}/yr</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <MainLayout title="Saved Colleges" scrollable={false} noPadding>
            <View style={styles.container}>
                <View style={styles.tabBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.tabItem, isActive && styles.activeTabItem]}
                                    onPress={() => handleFilter(tab)}
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
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBox}>
                                <Bookmark size={40} color={Colors.text.tertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'All' ? 'No Saved Colleges' : `No Saved ${activeTab} Colleges`}
                            </Text>
                            <Text style={styles.emptyDesc}>Colleges you star will appear here for quick access.</Text>
                            <TouchableOpacity
                                style={styles.browseBtn}
                                onPress={() => navigation.navigate('BrowseColleges')}
                            >
                                <Text style={styles.browseBtnText}>Browse Colleges</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
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
    tabItemText: { fontSize: 13, color: Colors.text.tertiary, fontWeight: '600' },
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

    listContent: { paddingBottom: 40 },
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
    itemUniversity: { fontSize: 12, color: Colors.text.tertiary, fontWeight: '500' },
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

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 8 },
    emptyDesc: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    browseBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    browseBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 }
});

export default SavedCollegesScreen;
