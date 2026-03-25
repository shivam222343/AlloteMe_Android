import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, FlatList } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import { cutoffAPI } from '../services/api';
import { Colors, Shadows, Typography } from '../constants/theme';
import { Filter, Calendar, Layers, Trash2 } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

const BranchCutoffDetailScreen = ({ route, navigation }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const { institutionId, branchName, institutionName } = route.params;
    const [loading, setLoading] = useState(true);
    const [allCutoffs, setAllCutoffs] = useState([]);
    const [filteredData, setFilteredData] = useState([]);

    // ... items 15-22 lines ...
    // Available filters derived from data
    const [availableYears, setAvailableYears] = useState([2025, 2024, 2023, 2022]);
    const [availableRounds, setAvailableRounds] = useState([1, 2, 3]);

    // Current selection
    const [selectedYear, setSelectedYear] = useState(2025);
    const [selectedRound, setSelectedRound] = useState(1);

    useEffect(() => {
        fetchData();
    }, [institutionId, branchName]);

    const fetchData = async () => {
        setLoading(true);
        // Clear previous state to prevent flickering of old data
        setAllCutoffs([]);
        setFilteredData([]);
        try {
            const res = await cutoffAPI.getByInstitution(institutionId);
            const rawData = res.data || [];

            const uniqueYears = [...new Set(rawData.map(c => c.year))].sort((a, b) => b - a);
            const uniqueRounds = [...new Set(rawData.map(c => c.round))].sort((a, b) => a - b);

            if (uniqueYears.length > 0) setAvailableYears(uniqueYears);
            if (uniqueRounds.length > 0) setAvailableRounds(uniqueRounds);

            if (uniqueYears.length > 0 && !uniqueYears.includes(selectedYear)) setSelectedYear(uniqueYears[0]);
            if (uniqueRounds.length > 0 && !uniqueRounds.includes(selectedRound)) setSelectedRound(uniqueRounds[0]);

            setAllCutoffs(rawData);
        } catch (error) {
            console.error('Failed to fetch cutoffs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Cutoffs",
            `Are you sure you want to delete all cutoffs for ${branchName} - Round ${selectedRound} (${selectedYear})? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await cutoffAPI.delete(institutionId, branchName, {
                                year: selectedYear,
                                round: selectedRound
                            });
                            Alert.alert("Success", "Cutoffs deleted successfully");
                            fetchData();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete cutoffs");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        const matches = allCutoffs.filter(c =>
            (c.branch === branchName || c.branchName === branchName) &&
            c.year === selectedYear &&
            c.round === selectedRound
        );
        setFilteredData(matches);
    }, [selectedYear, selectedRound, allCutoffs, branchName]);

    const renderItem = ({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 && styles.zebraRow]}>
            <View style={{ flex: 2 }}>
                <Text style={[styles.td, { fontWeight: '700', color: Colors.primary }]}>{item.category}</Text>
            </View>
            <View style={{ flex: 2 }}>
                <Text style={[styles.td, { fontSize: 11, color: Colors.text.tertiary }]}>{item.seatType || 'General'}</Text>
            </View>
            <View style={{ flex: 1.5 }}>
                <Text style={[styles.td, { textAlign: 'right', fontWeight: 'bold', color: Colors.text.primary }]}>
                    {item.percentile}
                </Text>
            </View>
            <View style={{ flex: 1.5 }}>
                <Text style={[styles.td, { textAlign: 'right', color: Colors.text.tertiary, fontSize: 12 }]}>
                    {item.rank || '-'}
                </Text>
            </View>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.instName}>{institutionName}</Text>
                    <Text style={styles.branchName}>{branchName}</Text>
                </View>
                {isAdmin && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                        <Trash2 size={18} color={Colors.error} />
                        <Text style={styles.deleteBtnText}>Clear Round</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.filterSection}>
                <View style={styles.filterGroup}>
                    <Calendar size={16} color={Colors.text.tertiary} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {availableYears.map(y => (
                            <TouchableOpacity
                                key={y}
                                style={[styles.filterChip, selectedYear === y && styles.activeChip]}
                                onPress={() => setSelectedYear(y)}
                            >
                                <Text style={[styles.chipText, selectedYear === y && styles.activeChipText]}>{y}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.filterGroup}>
                    <Layers size={16} color={Colors.text.tertiary} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {availableRounds.map(r => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.filterChip, selectedRound === r && styles.activeChip]}
                                onPress={() => setSelectedRound(r)}
                            >
                                <Text style={[styles.chipText, selectedRound === r && styles.activeChipText]}>Round {r}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </View>
    );

    return (
        <MainLayout style={styles.container} title="Cutoff Details">
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderItem}
                    ListHeaderComponent={() => (
                        <View style={{ backgroundColor: '#F8FAFC' }}>
                            {renderHeader()}
                            <View style={styles.tableHeader}>
                                <Text style={[styles.th, { flex: 2 }]}>Category</Text>
                                <Text style={[styles.th, { flex: 2 }]}>Seat Type</Text>
                                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Percentile</Text>
                                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Rank</Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>No data available for Year {selectedYear} Round {selectedRound}</Text>
                        </View>
                    )}
                    ListFooterComponent={() => (
                        <View style={styles.infoBox}>
                            <Filter size={14} color={Colors.text.tertiary} />
                            <Text style={styles.infoText}>
                                Data is based on official allotment lists. Cutoffs vary each year based on difficulty and applicant volume.
                            </Text>
                        </View>
                    )}
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                    stickyHeaderIndices={[0]} // Pin the table header
                />
            )}
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingVertical: 10, marginBottom: 15 },
    instName: { fontSize: 13, color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    branchName: { fontSize: 22, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 20 },

    filterSection: { gap: 12 },
    filterGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    filterScroll: { gap: 8, paddingRight: 20 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
    activeChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '500' },
    activeChipText: { color: Colors.white, fontWeight: 'bold' },

    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.error + '10', borderWidth: 1, borderColor: Colors.error + '30' },
    deleteBtnText: { color: Colors.error, fontSize: 12, fontWeight: 'bold' },

    tableContainer: { marginTop: 10, backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 12, borderBottomWidth: 1, borderBottomColor: '#DBEAFE' },
    th: { fontSize: 10, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', padding: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    zebraRow: { backgroundColor: '#F8FAFC' },
    td: { fontSize: 13, color: Colors.text.primary, lineHeight: 18 },

    emptyBox: { padding: 40, alignItems: 'center', backgroundColor: Colors.white },
    emptyText: { color: Colors.text.tertiary, fontSize: 13, textAlign: 'center' },

    infoBox: { flexDirection: 'row', gap: 8, padding: 16, marginTop: 20, backgroundColor: Colors.white, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: Colors.primary },
    infoText: { flex: 1, fontSize: 12, color: Colors.text.tertiary, lineHeight: 18 }
});

export default BranchCutoffDetailScreen;
