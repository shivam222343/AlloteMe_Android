import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, LayoutAnimation, Platform, TextInput } from 'react-native';
import Card from '../components/ui/Card';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Layers, Calendar, GripVertical, ChevronLeft, Trash2, X, ShieldCheck, Bookmark, FileText, Download, Search } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SavedPredictionsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user, toggleSavePredictionOptimistic, updateProfile } = useAuth();
    const [isReordering, setIsReordering] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingCSV, setExportingCSV] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    const getCollegeId = (c) => (c && typeof c === 'object' ? c._id : c);

    // Filter and Search logic
    const savedList = useMemo(() => {
        let list = user?.savedPredictions || [];
        if (searchText) {
            list = list.filter(item => {
                const collName = (item.collegeId?.name || '').toLowerCase();
                const branch = (item.branch || '').toLowerCase();
                return collName.includes(searchText.toLowerCase()) || branch.includes(searchText.toLowerCase());
            });
        }
        return list;
    }, [user?.savedPredictions, searchText]);

    const handleRemove = useCallback((item) => {
        Alert.alert(
            "Remove Prediction",
            "Are you sure you want to remove this prediction from your saved list?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        const predictionData = {
                            collegeId: getCollegeId(item.collegeId),
                            branch: item.branch,
                            year: item.year,
                            round: item.round
                        };
                        toggleSavePredictionOptimistic(predictionData);
                    }
                }
            ]
        );
    }, [toggleSavePredictionOptimistic]);

    const exportToPDF = async () => {
        if (savedList.length === 0) return;
        setExportingPDF(true);
        try {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>AlloteMe Saved Predictions</title>
                    <style>
                        body { font-family: 'Helvetica', Arial, sans-serif; padding: 30px; color: #1e293b; background: #fff; line-height: 1.5; }
                        .container { max-width: 900px; margin: auto; }
                        .header { border-bottom: 3px solid #0A66C2; padding-bottom: 20px; margin-bottom: 30px; }
                        .brand h1 { color: #0A66C2; margin: 0; font-size: 28px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #e2e8f0; }
                        th { background-color: #0A66C2; text-align: left; padding: 12px; font-size: 11px; color: #ffffff; text-transform: uppercase; }
                        td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .college-name { font-weight: 700; }
                        .footer { margin-top: 50px; text-align: center; color: #64748b; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="brand">
                                <h1>AlloteMe Saved List</h1>
                                <p>Student ID: ${user?.email || 'User'}</p>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>DTE</th>
                                    <th>Institution</th>
                                    <th>Branch</th>
                                    <th>Category/Quota</th>
                                    <th>Cutoff %</th>
                                    <th>Rank</th>
                                    <th>Chance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${savedList.map((item, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${item.collegeId?.dteCode || '—'}</td>
                                        <td class="college-name">${item.collegeId?.name || 'Unknown'}</td>
                                        <td>${item.branch}</td>
                                        <td>${[item.category, item.seatType].filter(Boolean).join(' / ')}</td>
                                        <td style="font-weight:bold;">${Number(item.percentile).toFixed(2)}%</td>
                                        <td>${item.rank || '—'}</td>
                                        <td style="color:${item.chanceColor}">${item.chanceLabel}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="footer">
                            <p>Generated via AlloteMe Android App - Personal Admission Strategy</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                const loadJS = (src) => new Promise((resolve) => {
                    const s = document.createElement('script');
                    s.src = src;
                    s.onload = resolve;
                    document.head.appendChild(s);
                });
                await loadJS('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                await loadJS('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                doc.autoTable({
                    head: [['#', 'DTE', 'Institution', 'Branch', 'Category/Quota', 'Cutoff %', 'Rank', 'Chance']],
                    body: savedList.map((item, idx) => [
                        idx + 1,
                        item.collegeId?.dteCode || '—',
                        item.collegeId?.name || 'Unknown',
                        item.branch,
                        [item.category, item.seatType].filter(Boolean).join(' / '),
                        `${Number(item.percentile).toFixed(2)}%`,
                        item.rank || '—',
                        item.chanceLabel
                    ]),
                });
                doc.save('Saved_Predictions.pdf');
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri);
            }
        } catch (error) {
            console.error('PDF Export Error:', error);
        } finally {
            setExportingPDF(false);
        }
    };

    const exportToCSV = async () => {
        if (savedList.length === 0) return;
        setExportingCSV(true);
        try {
            let csv = '\uFEFFNo,DTE Code,College,Branch,Category,Quota,Cutoff%,Rank,Chance\n';
            savedList.forEach((item, idx) => {
                const name = item.collegeId?.name?.replace(/"/g, '""') || 'Unknown';
                const branch = item.branch?.replace(/"/g, '""') || '';
                csv += `${idx + 1},${item.collegeId?.dteCode || ''},"${name}","${branch}","${item.category || ''}","${item.seatType || ''}",${item.percentile},${item.rank || ''},${item.chanceLabel}\n`;
            });

            if (Platform.OS === 'web') {
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'Saved_Predictions.csv';
                link.click();
            } else {
                const fileUri = `${FileSystem.cacheDirectory}Saved_Predictions.csv`;
                await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
                await Sharing.shareAsync(fileUri);
            }
        } catch (error) {
            console.error('CSV Export Error:', error);
        } finally {
            setExportingCSV(false);
        }
    };

    const handleDragEnd = async (data) => {
        if (searchText) {
            Alert.alert("Sort Active", "Reordering is only allowed when search is cleared.");
            return;
        }
        
        try {
            await updateProfile({ savedPredictions: data });
        } catch (error) {
            console.error('Error saving reorder:', error);
            Alert.alert('Error', 'Failed to save new order.');
        }
    };

    const renderItem = useCallback(({ item, drag, isActive, getIndex }) => {
        const index = getIndex();
        
        // Handle both populated and non-populated collegeId for safety
        const college = item.collegeId && typeof item.collegeId === 'object' ? item.collegeId : { name: 'Loading...' };

        return (
            <TouchableOpacity
                onLongPress={searchText ? null : drag}
                delayLongPress={300}
                onPress={() => navigation.navigate('CollegeDetail', { id: college._id })}
                disabled={isActive}
                activeOpacity={0.9}
                style={styles.fullWidthItem}
            >
                <Card style={[styles.resultCard, isActive && styles.activeCard]}>
                    <View style={styles.cardHeader}>
                        <View style={styles.dragHandle}>
                            <GripVertical size={16} color="#94a3b8" />
                        </View>
                        <View style={styles.numberTag}>
                            <Text style={styles.numberText}>#{typeof index === 'number' ? index + 1 : '?'}</Text>
                        </View>
                        <View style={styles.instHeader}>
                            <View style={styles.instBasicRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.instName} numberOfLines={2}>
                                        {college.name}
                                    </Text>
                                    <View style={styles.locRow}>
                                        <MapPin size={10} color={Colors.text.tertiary} />
                                        <Text style={styles.locText}>{college.location?.city || 'Verified'}</Text>
                                        <View style={styles.sep} />
                                        <Text style={styles.dteText}>DTE: {college.dteCode || '—'}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.matchBadge, { borderColor: item.chanceColor, backgroundColor: (item.chanceColor || '#0A66C2') + '10' }]}>
                            <Text style={[styles.matchPercent, { color: item.chanceColor || '#0A66C2' }]}>{item.chanceLabel || 'Saved'}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => handleRemove(item)}
                            style={styles.deleteBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.branchSection}>
                        <Text style={styles.branchName}>{item.branch}</Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, styles.roundBadge]}><Layers size={10} color={Colors.primary} /><Text style={styles.badgeText}>R-{item.round}</Text></View>
                            <View style={[styles.badge, styles.yearBadge]}><Calendar size={10} color={Colors.secondary} /><Text style={styles.badgeText}>{item.year}</Text></View>
                            {item.category && (
                                <View style={[
                                    styles.badge,
                                    { backgroundColor: item.category.toUpperCase().includes('TFWS') ? '#fff7ed' : '#f0fdf4' }
                                ]}>
                                    <ShieldCheck size={10} color={item.category.toUpperCase().includes('TFWS') ? '#f97316' : '#16a34a'} />
                                    <Text style={[
                                        styles.badgeText,
                                        { color: item.category.toUpperCase().includes('TFWS') ? '#f97316' : '#16a34a' }
                                    ]}>{item.category}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {item.percentile && (
                        <View style={styles.statsRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.statLabel}>PERCENTILE</Text>
                                <Text style={styles.statVal}>{Number(item.percentile).toFixed(2)}%</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.statLabel}>RANK</Text>
                                <Text style={styles.statVal}>
                                    {item.rank || (item.percentile ? Math.round(((100 - item.percentile) / 100) * 380000) : '—')}
                                </Text>
                            </View>
                            <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                <Text style={styles.statLabel}>CHANCE</Text>
                                <Text style={[styles.statVal, { color: item.chanceColor, fontSize: 13 }]}>{item.chanceLabel}</Text>
                            </View>
                        </View>
                    )}
                </Card>
            </TouchableOpacity>
        );
    }, [navigation, handleRemove]);

    if (!user) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>Saved Predictions</Text>
                    <Text style={styles.subtitle}>{savedList.length} items synced</Text>
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
                        placeholder="Search saved..."
                        style={styles.searchInput}
                        value={searchText}
                        onChangeText={setSearchText}
                        autoFocus
                    />
                    <TouchableOpacity onPress={() => { setSearchText(''); setIsSearchVisible(false); }}><X size={16} color={Colors.text.tertiary} /></TouchableOpacity>
                </View>
            )}

            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                <DraggableFlatList
                    data={savedList}
                    onDragEnd={({ data }) => handleDragEnd(data)}
                    keyExtractor={(item) => item._id || `${getCollegeId(item.collegeId)}_${item.branch}`}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    containerStyle={{ flex: 1 }}
                    activationDistance={20}
                    dragItemOverflow={true}
                    ListEmptyComponent={
                        <View style={styles.centerEmpty}>
                            <Bookmark size={48} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No Saved Predictions</Text>
                            <Text style={styles.emptyText}>Go to College Predictor and tap the bookmark icon on any result to save it here.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    fullWidthItem: { width: '100%' },
    resultCard: { marginVertical: 0.5, padding: 14, borderRadius: 0, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    activeCard: {
        backgroundColor: '#F0F9FF',
        zIndex: 100,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        transform: [{ scale: 1.02 }]
    },
    dragHandle: { paddingRight: 8, justifyContent: 'center' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    numberTag: { width: 24, height: 24, borderRadius: 6, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    numberText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
    instHeader: { flex: 1 },
    instBasicRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.secondary, marginTop: 16 },
    emptyText: { marginTop: 8, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 }
});

export default SavedPredictionsScreen;
