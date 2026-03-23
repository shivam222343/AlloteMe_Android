import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput, LayoutAnimation, ScrollView } from 'react-native';
import Card from '../components/ui/Card';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Layers, Calendar, Download, GripVertical, Info, ChevronLeft, FileText, Trash2, Search, SortAsc, X } from 'lucide-react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PredictionResultsScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { results: resultsParam = [], percentile = 0, rank = '', category = '', examType = '' } = route?.params || {};

    const [results, setResults] = useState(resultsParam);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingCSV, setExportingCSV] = useState(false);

    // Sort & Filter states
    const [searchText, setSearchText] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [sortBy, setSortBy] = useState('none'); // 'cutoff', 'reach', 'name'

    const userPerc = useMemo(() => parseFloat(percentile) || 0, [percentile]);

    const processedResults = useMemo(() => {
        let filtered = results.filter(item => {
            const matchesSearch = item.collegeId?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.branch?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.collegeId?.location?.city?.toLowerCase().includes(searchText.toLowerCase());

            if (!matchesSearch) return false;

            // Strict Preference Match Threshold (90%+)
            const diff = userPerc - item.percentile;
            let matchScore = 0;
            if (diff >= 0) {
                matchScore = 100; // Safe
            } else {
                // If diff is -1 (cutoff is 1% higher), score falls. 
                // We want 90% match to be roughly within 1% of the cutoff in Maharashtra terms.
                // Formula: 100 - (Math.abs(diff) * 10)
                matchScore = Math.max(0, 100 - (Math.abs(diff) * 10));
            }

            item.matchScore = matchScore; // Attach score
            return matchScore >= 90; // Only show 90-100% matches as requested
        });

        if (sortBy === 'cutoff') {
            filtered.sort((a, b) => b.percentile - a.percentile);
        } else if (sortBy === 'reach') {
            filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        } else if (sortBy === 'name') {
            filtered.sort((a, b) => (a.collegeId?.name || '').localeCompare(b.collegeId?.name || ''));
        }

        return filtered;
    }, [results, searchText, sortBy, userPerc]);

    const handleDelete = (key) => {
        Alert.alert(
            "Remove College",
            "Are you sure you want to remove this college from your list?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setResults(prev => prev.filter(item => item.key !== key));
                    }
                }
            ]
        );
    };

    const exportToPDF = async () => {
        if (processedResults.length === 0) return;
        setExportingPDF(true);
        try {
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica'; padding: 40px; color: #333; }
                        h1 { color: #0A66C2; margin-bottom: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background-color: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; }
                        td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
                    </style>
                </head>
                <body>
                    <h1>AlloteMe Prediction Report</h1>
                    <p>Exam: ${examType} | Category: ${category} | Percentile: ${percentile}%</p>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>College Name</th>
                                <th>Branch</th>
                                <th>Cutoff</th>
                                <th>Chance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${processedResults.map((item, index) => {
                const score = Math.round(item.matchScore || 0);
                return `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><b>${item.collegeId?.name}</b></td>
                                        <td>${item.branch}</td>
                                        <td>${item.percentile}%</td>
                                        <td>${score}% Match</td>
                                    </tr>
                                `;
            }).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (error) { Alert.alert('PDF Export Failed'); }
        finally { setExportingPDF(false); }
    };

    const exportToCSV = async () => {
        if (processedResults.length === 0) return;
        setExportingCSV(true);
        try {
            let csv = 'No,College,Branch,Cutoff,Match%\n';
            processedResults.forEach((item, idx) => {
                const score = Math.round(item.matchScore || 0);
                csv += `${idx + 1},"${item.collegeId?.name}","${item.branch}",${item.percentile},${score}%\n`;
            });
            const fileUri = `${FileSystem.cacheDirectory}AlloteMe_Predictions.csv`;
            await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
            await Sharing.shareAsync(fileUri);
        } catch (error) { Alert.alert('CSV Export Failed'); }
        finally { setExportingCSV(false); }
    };

    const renderItem = ({ item, drag, isActive, getIndex }) => {
        const index = getIndex();
        const diff = (userPerc - item.percentile).toFixed(2);
        const isSafe = parseFloat(diff) >= 0;
        const matchScore = Math.round(item.matchScore || 0);

        return (
            <TouchableOpacity onLongPress={drag} disabled={isActive} activeOpacity={0.9} style={styles.fullWidthItem}>
                <Card style={[styles.resultCard, isActive && styles.activeCard]} elevated={isActive}>
                    <View style={styles.cardHeader}>
                        <View style={styles.numberTag}>
                            <Text style={styles.numberText}>#{typeof index === 'number' ? index + 1 : '?'}</Text>
                        </View>
                        <View style={styles.instHeader}>
                            <Text style={styles.instName} numberOfLines={1}>{item.collegeId?.name || 'College'}</Text>
                            <View style={styles.locRow}>
                                <MapPin size={10} color={Colors.text.tertiary} />
                                <Text style={styles.locText}>{item.collegeId?.location?.city || 'Verified'}</Text>
                                <View style={styles.sep} />
                                <Text style={styles.dteText}>DTE: {item.collegeId?.dteCode || '—'}</Text>
                            </View>
                        </View>
                        <View style={styles.matchBadge}>
                            <Text style={[styles.matchPercent, { color: matchScore === 100 ? Colors.success : '#F59E0B' }]}>{matchScore}% Match</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(item.key)} style={styles.deleteBtn}>
                            <X size={16} color={Colors.text.tertiary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.branchSection}>
                        <Text style={styles.branchName}>{item.branch}</Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, styles.roundBadge]}><Layers size={10} color={Colors.primary} /><Text style={styles.badgeText}>R-{item.round}</Text></View>
                            <View style={[styles.badge, styles.yearBadge]}><Calendar size={10} color={Colors.secondary} /><Text style={styles.badgeText}>{item.year}</Text></View>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}><Text style={styles.statLabel}>CUTOFF</Text><Text style={styles.statVal}>{item.percentile}%</Text></View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>CHANCE</Text>
                            <View style={styles.chanceBarContainer}>
                                <View style={[styles.chanceBarFill, { width: `${matchScore}%`, backgroundColor: matchScore === 100 ? Colors.success : '#F59E0B' }]} />
                            </View>
                        </View>
                        <View style={styles.statBox}><Text style={styles.statLabel}>REACH</Text><Text style={[styles.statVal, isSafe ? styles.safeText : styles.riskText]}>{isSafe ? '+' : ''}{diff}%</Text></View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ChevronLeft size={24} color={Colors.text.primary} /></TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>Prediction Results</Text>
                    <Text style={styles.subtitle}>{processedResults.length} colleges found</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => setIsSearchVisible(!isSearchVisible)} style={styles.actionIcon}><Search size={20} color={Colors.text.secondary} /></TouchableOpacity>
                    <TouchableOpacity style={styles.exportBtn} onPress={exportToPDF} disabled={exportingPDF}>{exportingPDF ? <ActivityIndicator size="small" color={Colors.primary} /> : <FileText size={18} color={Colors.primary} />}</TouchableOpacity>
                    <TouchableOpacity style={styles.exportBtn} onPress={exportToCSV} disabled={exportingCSV}>{exportingCSV ? <ActivityIndicator size="small" color={Colors.primary} /> : <Download size={18} color={Colors.primary} />}</TouchableOpacity>
                </View>
            </View>

            {isSearchVisible && (
                <View style={styles.searchBar}>
                    <Search size={16} color={Colors.text.tertiary} />
                    <TextInput
                        placeholder="Search college or branch..."
                        style={styles.searchInput}
                        value={searchText}
                        onChangeText={setSearchText}
                        autoFocus
                    />
                    <TouchableOpacity onPress={() => { setSearchText(''); setIsSearchVisible(false); }}><X size={16} color={Colors.text.tertiary} /></TouchableOpacity>
                </View>
            )}

            <View style={styles.sortBar}>
                <Text style={styles.sortLabel}>Sort By:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
                    <TouchableOpacity style={[styles.sortChip, sortBy === 'none' && styles.sortChipActive]} onPress={() => setSortBy('none')}><Text style={[styles.sortChipText, sortBy === 'none' && styles.sortChipTextActive]}>Priority</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.sortChip, sortBy === 'cutoff' && styles.sortChipActive]} onPress={() => setSortBy('cutoff')}><Text style={[styles.sortChipText, sortBy === 'cutoff' && styles.sortChipTextActive]}>Max Cutoff</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.sortChip, sortBy === 'reach' && styles.sortChipActive]} onPress={() => setSortBy('reach')}><Text style={[styles.sortChipText, sortBy === 'reach' && styles.sortChipTextActive]}>Reach</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.sortChip, sortBy === 'name' && styles.sortChipActive]} onPress={() => setSortBy('name')}><Text style={[styles.sortChipText, sortBy === 'name' && styles.sortChipTextActive]}>Name</Text></TouchableOpacity>
                </ScrollView>
            </View>

            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                <DraggableFlatList
                    data={processedResults}
                    onDragEnd={({ data }) => {
                        if (sortBy !== 'none') {
                            Alert.alert("Sort Active", "Reordering is only allowed in 'Priority' sort mode.");
                            return;
                        }
                        setResults(data);
                    }}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    containerStyle={{ flex: 1 }}
                    activationDistance={10}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Info size={40} color={Colors.divider} />
                            <Text style={styles.emptyText}>No results match your filters.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 70, backgroundColor: Colors.white, ...Shadows.sm },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, marginLeft: 8 },
    title: { fontSize: 17, fontWeight: 'bold', color: Colors.text.primary },
    subtitle: { fontSize: 11, color: Colors.text.tertiary },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    actionIcon: { padding: 8 },
    exportBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center' },

    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, margin: 12, paddingHorizontal: 12, height: 44, borderRadius: 12, ...Shadows.xs },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: Colors.text.primary },

    sortBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sortLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.text.tertiary, marginRight: 10 },
    sortScroll: { gap: 8 },
    sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9' },
    sortChipActive: { backgroundColor: Colors.primary },
    sortChipText: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
    sortChipTextActive: { color: Colors.white },

    fullWidthItem: { width: '100%' },
    resultCard: { marginVertical: 0.5, padding: 14, borderRadius: 0, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    activeCard: { backgroundColor: '#F0F9FF', zIndex: 10, ...Shadows.lg },

    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    numberTag: { width: 24, height: 24, borderRadius: 6, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    numberText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
    instHeader: { flex: 1 },
    instName: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    locText: { fontSize: 10, color: Colors.text.tertiary },
    sep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.divider, marginHorizontal: 4 },
    dteText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary },
    matchBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
    matchPercent: { fontSize: 10, fontWeight: 'bold' },
    deleteBtn: { padding: 4 },

    branchSection: { marginVertical: 8 },
    branchName: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    roundBadge: { backgroundColor: Colors.primary + '10' },
    yearBadge: { backgroundColor: Colors.secondary + '10' },
    badgeText: { fontSize: 8, fontWeight: 'bold' },

    statsRow: { flexDirection: 'row', gap: 20, marginTop: 6, alignItems: 'center' },
    statBox: { flex: 1 },
    statLabel: { fontSize: 8, fontWeight: 'bold', color: Colors.text.tertiary, marginBottom: 2 },
    statVal: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    chanceBarContainer: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, marginTop: 4, overflow: 'hidden' },
    chanceBarFill: { height: '100%', borderRadius: 3 },
    safeText: { color: Colors.success },
    riskText: { color: Colors.error },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
    emptyText: { marginTop: 10, color: Colors.text.tertiary }
});

export default PredictionResultsScreen;
