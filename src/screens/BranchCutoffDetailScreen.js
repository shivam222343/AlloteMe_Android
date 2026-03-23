import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import { cutoffAPI } from '../services/api';
import { Colors, Shadows, Typography } from '../constants/theme';
import { Filter, Calendar, Layers } from 'lucide-react-native';

const BranchCutoffDetailScreen = ({ route, navigation }) => {
    const { institutionId, branchName, institutionName } = route.params;
    const [loading, setLoading] = useState(true);
    const [allCutoffs, setAllCutoffs] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    
    // Available filters derived from data
    const [availableYears, setAvailableYears] = useState([2025, 2024, 2023, 2022]);
    const [availableRounds, setAvailableRounds] = useState([1, 2, 3]);

    // Current selection
    const [selectedYear, setSelectedYear] = useState(2025);
    const [selectedRound, setSelectedRound] = useState(1);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await cutoffAPI.getByInstitution(institutionId);
            // In new backend, look for 'branch' and 'collegeId' match
            // Map the data into a grouped format if needed or just filter directly
            const rawData = res.data || [];
            
            // Derive unique years and rounds from data
            const uniqueYears = [...new Set(rawData.map(c => c.year))].sort((a, b) => b - a);
            const uniqueRounds = [...new Set(rawData.map(c => c.round))].sort((a, b) => a - b);
            
            if (uniqueYears.length > 0) setAvailableYears(uniqueYears);
            if (uniqueRounds.length > 0) setAvailableRounds(uniqueRounds);
            
            // Set default selections to latest available
            if (uniqueYears.length > 0) setSelectedYear(uniqueYears[0]);
            if (uniqueRounds.length > 0) setSelectedRound(uniqueRounds[0]);

            setAllCutoffs(rawData);
        } catch (error) {
            console.error('Failed to fetch cutoffs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Filter and display. One match in flattened schema = one row.
        const matches = allCutoffs.filter(c => 
            (c.branch === branchName || c.branchName === branchName) && 
            c.year === selectedYear && 
            c.round === selectedRound
        );
        setFilteredData(matches);
    }, [selectedYear, selectedRound, allCutoffs]);

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.instName}>{institutionName}</Text>
            <Text style={styles.branchName}>{branchName}</Text>
            
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

    const renderTable = () => (
        <Card style={styles.tableCard}>
            <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>Category</Text>
                <Text style={[styles.th, { flex: 2 }]}>Seat Type</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Percentile</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Rank</Text>
            </View>
            
            {filteredData.length > 0 ? (
                filteredData.map((item, idx) => (
                    <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.zebraRow]}>
                        <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{item.category}</Text>
                        <Text style={[styles.td, { flex: 2, color: Colors.text.secondary }]}>{item.seatType || '-'}</Text>
                        <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: Colors.primary, fontWeight: 'bold' }]}>
                            {item.percentile}
                        </Text>
                        <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: Colors.text.tertiary }]}>
                            {item.rank || '-'}
                        </Text>
                    </View>
                ))
            ) : (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No data available for Year {selectedYear} Round {selectedRound}</Text>
                </View>
            )}
        </Card>
    );

    return (
        <MainLayout style={styles.container} title="Cutoff Details">
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    {renderHeader()}
                    {renderTable()}
                    
                    <View style={styles.infoBox}>
                        <Filter size={14} color={Colors.text.tertiary} />
                        <Text style={styles.infoText}>
                            Data is based on official allotment lists. Cutoffs vary each year based on difficulty and applicant volume.
                        </Text>
                    </View>
                </ScrollView>
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

    tableCard: { padding: 0, overflow: 'hidden', marginTop: 10 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
    th: { fontSize: 11, fontWeight: 'bold', color: Colors.text.tertiary, textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', padding: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    zebraRow: { backgroundColor: '#F1F5F9' },
    td: { fontSize: 13, color: Colors.text.primary },
    
    emptyBox: { padding: 40, alignItems: 'center' },
    emptyText: { color: Colors.text.tertiary, fontSize: 13, textAlign: 'center' },
    
    infoBox: { flexDirection: 'row', gap: 8, padding: 16, marginTop: 20, backgroundColor: Colors.white, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: Colors.primary },
    infoText: { flex: 1, fontSize: 12, color: Colors.text.tertiary, lineHeight: 18 }
});

export default BranchCutoffDetailScreen;
