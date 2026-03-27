import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput, LayoutAnimation, ScrollView } from 'react-native';
import Card from '../components/ui/Card';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Layers, Calendar, Download, GripVertical, Info, ChevronLeft, FileText, Trash2, Search, SortAsc, X, ShieldCheck, Star } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import OptimizedImage from '../components/ui/OptimizedImage';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PredictionResultsScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { results: resultsParam = [], percentile = 0, rank = '', category = '', examType = '' } = route?.params || {};

    const [results, setResults] = useState(resultsParam);

    useEffect(() => {
        if (resultsParam) {
            setResults(resultsParam);
        }
    }, [resultsParam]);

    const { user, refreshUser } = useAuth();
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingCSV, setExportingCSV] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [sortBy, setSortBy] = useState('none');
    const [savingId, setSavingId] = useState(null);

    const handleToggleSave = async (id) => {
        if (!id || savingId) return;
        setSavingId(id);
        try {
            const res = await authAPI.toggleSave(id);
            if (res.data.success) {
                await refreshUser();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSavingId(null);
        }
    };

    const userPerc = useMemo(() => parseFloat(percentile) || 0, [percentile]);

    const processedResults = useMemo(() => {
        let mapped = results.map(item => {
            const itemPerc = parseFloat(item.percentile) || 0;
            const diff = (userPerc - itemPerc).toFixed(2);
            let chanceLabel = 'Low';
            let chanceColor = '#ef4444';

            const numericDiff = parseFloat(diff);
            if (numericDiff >= 2) {
                chanceLabel = 'Very High';
                chanceColor = '#10b981';
            } else if (numericDiff >= 0) {
                chanceLabel = 'High';
                chanceColor = '#22c55e';
            } else if (numericDiff >= -2) {
                chanceLabel = 'Medium';
                chanceColor = '#f59e0b';
            }

            return {
                ...item,
                userPercentile: userPerc,
                difference: diff,
                chanceLabel,
                chanceColor,
                matchScore: Math.max(0, 100 - (Math.abs(numericDiff) * 10)),
                key: item._id || item.key || Math.random().toString()
            };
        });

        let filtered = mapped.filter(item => {
            const name = item.collegeId?.name || 'Unknown Institution';
            const branch = item.branch || '';
            const city = item.collegeId?.location?.city || '';

            return name.toLowerCase().includes(searchText.toLowerCase()) ||
                branch.toLowerCase().includes(searchText.toLowerCase()) ||
                city.toLowerCase().includes(searchText.toLowerCase());
        });

        if (sortBy === 'cutoff') {
            filtered.sort((a, b) => (parseFloat(b.percentile) || 0) - (parseFloat(a.percentile) || 0));
        } else if (sortBy === 'reach') {
            filtered.sort((a, b) => b.matchScore - a.matchScore);
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
                        setResults(prev => prev.filter(item => item._id !== key && item.key !== key));
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
                        .header { border-bottom: 2px solid #0A66C2; padding-bottom: 10px; margin-bottom: 20px; }
                        h1 { color: #0A66C2; margin: 0; }
                        .meta { color: #64748b; font-size: 12px; margin-top: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background-color: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; color: #475569; }
                        td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
                        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
                        .contact { font-weight: bold; color: #0A66C2; font-size: 14px; margin-top: 8px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>AlloteMe Prediction Report</h1>
                        <div class="meta">Exam: ${examType} | Category: ${category} | Percentile: ${percentile}%</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>DTE Code</th>
                                <th>College Name</th>
                                <th>Branch</th>
                                <th>Cutoff %</th>
                                <th>Rank</th>
                                <th>Chance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${processedResults.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td style="color:#0A66C2; font-weight:bold;">${item.collegeId?.dteCode || '—'}</td>
                                    <td><b>${item.collegeId?.name || 'Unknown'}</b></td>
                                    <td>${item.branch}</td>
                                    <td>${Number(item.percentile).toFixed(2)}%</td>
                                    <td>${item.rank || '—'}</td>
                                    <td>${item.chanceLabel}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="footer">
                        <p><b>Instructions:</b> This report is based on previous year cutoff trends. Actual allotments depend on current year merit lists and seat availability.</p>
                        <p>For counseling assistance and queries, contact AlloteMe Support:</p>
                        <div class="contact">📞 8010961216</div>
                    </div>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (error) {
            console.error(error);
            Alert.alert('PDF Export Failed');
        }
        finally { setExportingPDF(false); }
    };

    const exportToCSV = async () => {
        if (processedResults.length === 0) return;
        setExportingCSV(true);
        try {
            let csv = 'No,DTE Code,College,Branch,Cutoff%,Rank,Chance\n';
            processedResults.forEach((item, idx) => {
                csv += `${idx + 1},${item.collegeId?.dteCode || ''},"${item.collegeId?.name || 'Unknown'}","${item.branch}",${item.percentile},${item.rank || ''},${item.chanceLabel}\n`;
            });
            const fileUri = `${FileSystem.cacheDirectory}AlloteMe_Predictions.csv`;
            await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
            await Sharing.shareAsync(fileUri);
        } catch (error) { Alert.alert('CSV Export Failed'); }
        finally { setExportingCSV(false); }
    };

    const renderItem = ({ item, drag, isActive, getIndex }) => {
        const index = getIndex();
        const isSaved = user?.savedColleges?.some(c => (c._id === item.collegeId?._id || c === item.collegeId?._id));

        return (
            <TouchableOpacity
                onLongPress={drag}
                onPress={() => navigation.navigate('CollegeDetail', { id: item.collegeId?._id })}
                disabled={isActive}
                activeOpacity={0.9}
                style={styles.fullWidthItem}
            >
                <Card style={[styles.resultCard, isActive && styles.activeCard]}>
                    <View style={styles.cardHeader}>
                        <View style={styles.numberTag}>
                            <Text style={styles.numberText}>#{typeof index === 'number' ? index + 1 : '?'}</Text>
                        </View>
                        <View style={styles.instHeader}>
                            <View style={styles.instBasicRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.instName} numberOfLines={2}>
                                        {item.collegeId?.name || 'Unknown Institution'}
                                    </Text>
                                    <View style={styles.locRow}>
                                        <MapPin size={10} color={Colors.text.tertiary} />
                                        <Text style={styles.locText}>{item.collegeId?.location?.city || 'Verified'}</Text>
                                        <View style={styles.sep} />
                                        <Text style={styles.dteText}>DTE: {item.collegeId?.dteCode || '—'}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.matchBadge, { borderColor: item.chanceColor, backgroundColor: item.chanceColor + '10' }]}>
                            <Text style={[styles.matchPercent, { color: item.chanceColor }]}>{item.chanceLabel}</Text>
                        </View>

                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(item.key); }} style={styles.deleteBtn}>
                            <X size={16} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.branchSection}>
                        <Text style={styles.branchName}>{item.branch}</Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, styles.roundBadge]}><Layers size={10} color={Colors.primary} /><Text style={styles.badgeText}>R-{item.round}</Text></View>
                            <View style={[styles.badge, styles.yearBadge]}><Calendar size={10} color={Colors.secondary} /><Text style={styles.badgeText}>{item.year}</Text></View>
                            {item.seatType && (
                                <View style={[
                                    styles.badge,
                                    { backgroundColor: item.seatType.toUpperCase().startsWith('L') ? '#ecfdf5' : '#f0f9ff' }
                                ]}>
                                    <ShieldCheck size={10} color={item.seatType.toUpperCase().startsWith('L') ? '#059669' : '#0369a1'} />
                                    <Text style={[
                                        styles.badgeText,
                                        { color: item.seatType.toUpperCase().startsWith('L') ? '#059669' : '#0369a1' }
                                    ]}>{item.seatType}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statLabel}>CUTOFF</Text>
                            <Text style={styles.statVal}>{Number(item.percentile).toFixed(2)}%</Text>
                            {item.rank && <Text style={{ fontSize: 9, color: Colors.text.tertiary }}>Rank: {item.rank}</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statLabel}>MY SCORE</Text>
                            <Text style={styles.statVal}>{(parseFloat(item.userPercentile) || 0).toFixed(2)}%</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statLabel}>DIFF (+/-)</Text>
                            <Text style={[styles.statVal, parseFloat(item.difference) >= 0 ? styles.safeText : styles.riskText]}>
                                {parseFloat(item.difference) >= 0 ? '+' : ''}{item.difference}%
                            </Text>
                        </View>
                        <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                            <Text style={styles.statLabel}>CHANCE</Text>
                            <Text style={[styles.statVal, { color: item.chanceColor, fontSize: 13 }]}>{item.chanceLabel}</Text>
                        </View>
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
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    containerStyle={{ flex: 1 }}
                    activationDistance={10}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Info size={40} color="#cbd5e1" />
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
    sortScroll: { gap: 8, paddingBottom: 5 },
    sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
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
    instBasicRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    collegeThumb: { width: 40, height: 40, borderRadius: 8 },
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
    statLabel: { fontSize: 8, fontWeight: 'bold', color: Colors.text.tertiary, marginBottom: 2 },
    statVal: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    safeText: { color: "#10b981" },
    riskText: { color: "#ef4444" },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
    emptyText: { marginTop: 10, color: Colors.text.tertiary }
});

export default PredictionResultsScreen;
