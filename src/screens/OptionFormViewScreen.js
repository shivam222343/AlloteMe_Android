import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput, LayoutAnimation, ScrollView } from 'react-native';
import Card from '../components/ui/Card';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Layers, Calendar, Download, GripVertical, ChevronLeft, ChevronRight, FileText, Search, X, ShieldCheck, Bookmark } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptions';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { TouchableOpacity as GestureHandlerTouchableOpacity } from 'react-native-gesture-handler';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const OptionPresetRow = React.memo(({
    item,
    drag,
    isActive,
    index,
    searchText,
    isReordering,
    navigation,
    isSaved,
    handleSavePrediction
}) => {
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: withSpring(
                        isActive ? 1.01 : 1,
                        {
                            damping: 15,
                            stiffness: 150,
                        }
                    ),
                },
            ],
        };
    });

    const college = item.collegeId && typeof item.collegeId === 'object' ? item.collegeId : { name: 'Unknown Institution' };

    return (
        <ScaleDecorator>
            <GestureHandlerTouchableOpacity
                onLongPress={isReordering && !searchText ? drag : null}
                delayLongPress={Platform.OS === 'web' ? 80 : 150}
                onPress={() => navigation.navigate('CollegeDetail', { id: college._id })}
                disabled={isActive}
                activeOpacity={0.9}
                style={[
                    styles.fullWidthItem,
                    Platform.OS === 'web' && { cursor: isActive ? 'grabbing' : isReordering ? 'grab' : 'pointer' }
                ]}
            >
                <Animated.View style={animatedStyle}>
                    <Card style={[styles.resultCard, isActive && styles.activeCard]}>
                        <View style={styles.cardHeader}>
                            {isReordering && (
                                <View style={styles.dragHandle}>
                                    <GripVertical size={16} color="#94a3b8" />
                                </View>
                            )}
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

                            <View style={[
                                styles.matchBadge,
                                {
                                    borderColor: isSaved ? Colors.primary : item.chanceColor || '#f59e0b',
                                    backgroundColor: isSaved ? Colors.primary + '15' : (item.chanceColor || '#f59e0b') + '10'
                                }
                            ]}>
                                <Text style={[
                                    styles.matchPercent,
                                    { color: isSaved ? Colors.primary : (item.chanceColor || '#f59e0b') }
                                ]}>
                                    {isSaved ? 'SAVED' : item.chanceLabel || 'Medium'}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => handleSavePrediction(item)}
                                style={styles.saveBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Bookmark size={18} color={isSaved ? Colors.primary : '#94a3b8'} fill={isSaved ? Colors.primary : 'transparent'} />
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
                                <View style={[styles.badge, { backgroundColor: '#f0fdf4', borderColor: '#16a34a20', borderWidth: 0.5 }]}>
                                    <ShieldCheck size={10} color="#16a34a" />
                                    <Text style={[styles.badgeText, { color: '#16a34a' }]}>Verified</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.statLabel}>CUTOFF</Text>
                                <Text style={styles.statVal}>{Number(item.percentile).toFixed(2)}%</Text>
                                {item.rank ? <Text style={{ fontSize: 9, color: Colors.text.tertiary }}>Rank: {item.rank}</Text> : null}
                            </View>
                            <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                <Text style={styles.statLabel}>CHANCE</Text>
                                <Text style={[styles.statVal, { color: item.chanceColor || '#f59e0b', fontSize: 13 }]}>{item.chanceLabel || 'Medium'}</Text>
                            </View>
                        </View>
                        <View style={styles.cardFooter}>
                            <TouchableOpacity 
                                style={styles.infoLink} 
                                onPress={() => navigation.navigate('CollegeDetail', { id: college._id })}
                            >
                                <Text style={styles.infoLinkText}>View College Info</Text>
                                <ChevronRight size={12} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </Card>
                </Animated.View>
            </GestureHandlerTouchableOpacity>
        </ScaleDecorator>
    );
});

const OptionFormViewScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { preset } = route.params || {};
    const [results, setResults] = useState([]);
    const [isReordering, setIsReordering] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingCSV, setExportingCSV] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const { user, toggleSavePredictionOptimistic, checkLimit, incrementUsage } = useAuth();
    const [localSavedPredictions, setLocalSavedPredictions] = useState(new Set());

    // Initialize list & load custom reorder index if exists
    useEffect(() => {
        if (!preset) return;

        const loadOrder = async () => {
            const rawColleges = preset.colleges || [];
            try {
                const saved = await AsyncStorage.getItem(`preset_order_${preset._id}`);
                if (saved) {
                    const savedKeys = JSON.parse(saved);
                    const sorted = [...rawColleges].sort((a, b) => {
                        const getCollId = (c) => (c && typeof c === 'object' ? c._id : c);
                        const keyA = a._id?.toString() || `${getCollId(a.collegeId)}_${a.branch}_${a.year}_${a.round}_${a.category || ''}_${a.seatType || ''}`;
                        const keyB = b._id?.toString() || `${getCollId(b.collegeId)}_${b.branch}_${b.year}_${b.round}_${b.category || ''}_${b.seatType || ''}`;
                        const idxA = savedKeys.indexOf(keyA);
                        const idxB = savedKeys.indexOf(keyB);
                        if (idxA === -1 && idxB === -1) return 0;
                        if (idxA === -1) return 1;
                        if (idxB === -1) return -1;
                        return idxA - idxB;
                    });
                    setResults(sorted);
                } else {
                    setResults(rawColleges);
                }
            } catch (err) {
                setResults(rawColleges);
            }
        };

        loadOrder();
    }, [preset]);

    // Sync saved status with user model
    useEffect(() => {
        const keys = new Set();
        (user?.savedPredictions || []).forEach(p => {
            const collId = p.collegeId?._id || p.collegeId;
            if (collId) {
                const key = `${collId}_${p.branch}_${p.year}_${p.round}_${p.category || ''}_${p.seatType || ''}`;
                keys.add(key);
            }
        });
        setLocalSavedPredictions(keys);
    }, [user?.savedPredictions]);

    const handleSavePrediction = useCallback(async (item) => {
        const getCollegeId = (c) => (c && typeof c === 'object' ? c._id : c);
        const collegeId = getCollegeId(item.collegeId);
        if (!collegeId) return;

        const predictionKey = `${collegeId}_${item.branch}_${item.year}_${item.round}_${item.category || ''}_${item.seatType || ''}`;

        setLocalSavedPredictions(prev => {
            const next = new Set(prev);
            if (next.has(predictionKey)) next.delete(predictionKey);
            else next.add(predictionKey);
            return next;
        });

        const predictionData = {
            collegeId: collegeId,
            branch: item.branch,
            year: item.year,
            round: item.round,
            percentile: item.percentile,
            rank: item.rank,
            category: item.category,
            seatType: item.seatType,
            chanceLabel: item.chanceLabel,
            chanceColor: item.chanceColor
        };
        toggleSavePredictionOptimistic(predictionData);
    }, [toggleSavePredictionOptimistic]);

    const processedResults = useMemo(() => {
        let list = results.map(item => {
            const getCollId = (c) => (c && typeof c === 'object' ? c._id : c);
            return {
                ...item,
                key: item._id?.toString() || `${getCollId(item.collegeId)}_${item.branch}_${item.year}_${item.round}_${item.category || ''}_${item.seatType || ''}`
            };
        });

        if (searchText) {
            list = list.filter(item => {
                const name = (item.collegeId?.name || '').toLowerCase();
                const branch = (item.branch || '').toLowerCase();
                return name.includes(searchText.toLowerCase()) || branch.includes(searchText.toLowerCase());
            });
        }
        return list;
    }, [results, searchText]);

    const handleDragEnd = async (data) => {
        setResults(data);
        const getCollId = (c) => (c && typeof c === 'object' ? c._id : c);
        const keys = data.map(item => item._id?.toString() || `${getCollId(item.collegeId)}_${item.branch}_${item.year}_${item.round}_${item.category || ''}_${item.seatType || ''}`);
        await AsyncStorage.setItem(`preset_order_${preset._id}`, JSON.stringify(keys));
    };

    const exportToPDF = async () => {
        if (processedResults.length === 0) return;

        // Check Subscription Limit
        if (!checkLimit('exports')) return;

        setExportingPDF(true);
        try {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>AlloteMe Option List</title>
                    <style>
                        body { font-family: 'Helvetica', Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
                        .container { max-width: 900px; margin: auto; }
                        .header { border-bottom: 3px solid #0A66C2; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .brand h1 { color: #0A66C2; margin: 0; font-size: 24px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th { background-color: #0A66C2; color: #ffffff; padding: 10px; font-size: 11px; text-transform: uppercase; text-align: left; }
                        td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="brand">
                                <h1>AlloteMe Option List Preset</h1>
                                <p>Target Score: ${preset.percentile}%ile | Quota: ${preset.category}</p>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>College Code</th>
                                    <th>College Institution</th>
                                    <th>Branch / Course</th>
                                    <th>Cutoff Score</th>
                                    <th>Admission Round</th>
                                    <th>Cutoff Year</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${processedResults.map((item, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${item.collegeId?.dteCode || '—'}</td>
                                        <td style="font-weight: bold;">${item.collegeId?.name}</td>
                                        <td>${item.branch}</td>
                                        <td>${Number(item.percentile).toFixed(2)}%</td>
                                        <td>R-${item.round}</td>
                                        <td>${item.year}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
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
                    head: [['#', 'DTE', 'Institution', 'Branch', 'Cutoff %', 'Round', 'Year']],
                    body: processedResults.map((item, idx) => [
                        idx + 1,
                        item.collegeId?.dteCode || '—',
                        item.collegeId?.name || 'Unknown',
                        item.branch,
                        `${Number(item.percentile).toFixed(2)}%`,
                        `R-${item.round}`,
                        item.year
                    ]),
                });
                doc.save(`Option_Form_Preset_${preset.percentile}.pdf`);
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri);
            }

            // Increment Usage
            incrementUsage('exports');
        } catch (error) {
            console.error('PDF export failed:', error);
            Alert.alert('PDF Export Failed');
        } finally {
            setExportingPDF(false);
        }
    };

    const exportToCSV = async () => {
        if (processedResults.length === 0) return;

        // Check Subscription Limit
        if (!checkLimit('exports')) return;

        setExportingCSV(true);
        try {
            let csv = '\uFEFFNo,DTE Code,College,Branch,Cutoff%,Round,Year\n';
            processedResults.forEach((item, idx) => {
                const name = item.collegeId?.name?.replace(/"/g, '""') || 'Unknown';
                const branch = item.branch?.replace(/"/g, '""') || '';
                csv += `${idx + 1},${item.collegeId?.dteCode || ''},"${name}","${branch}",${item.percentile},R-${item.round},${item.year}\n`;
            });

            if (Platform.OS === 'web') {
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Option_Form_Preset_${preset.percentile}.csv`;
                link.click();
            } else {
                const fileUri = `${FileSystem.cacheDirectory}Option_Form_Preset_${preset.percentile}.csv`;
                await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
                await Sharing.shareAsync(fileUri);
            }

            // Increment Usage
            incrementUsage('exports');
        } catch (error) {
            console.error('CSV export failed:', error);
        } finally {
            setExportingCSV(false);
        }
    };

    const renderItem = useCallback(({ item, drag, isActive, getIndex }) => {
        const index = getIndex();
        const getCollId = (c) => (c && typeof c === 'object' ? c._id : c);
        const pKey = `${getCollId(item.collegeId)}_${item.branch}_${item.year}_${item.round}_${item.category || ''}_${item.seatType || ''}`;
        const isSaved = localSavedPredictions.has(pKey);

        return (
            <OptionPresetRow
                item={item}
                drag={drag}
                isActive={isActive}
                index={index}
                searchText={searchText}
                isReordering={isReordering}
                navigation={navigation}
                isSaved={isSaved}
                handleSavePrediction={handleSavePrediction}
            />
        );
    }, [isReordering, searchText, localSavedPredictions, navigation, handleSavePrediction]);

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ChevronLeft size={24} color={Colors.text.primary} /></TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title} numberOfLines={1}>{preset?.percentile}%ile Option List</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {preset?.category} List • {processedResults.length} Colleges • Exports: {user?.role === 'admin' ? '∞' : (user?.subscription?.usage?.exports || 0)}/{user?.role === 'admin' ? '∞' : (SUBSCRIPTION_PLANS[user?.subscription?.type?.toUpperCase() || 'FREE'].limits.exports === Infinity ? '∞' : SUBSCRIPTION_PLANS[user?.subscription?.type?.toUpperCase() || 'FREE'].limits.exports)}
                    </Text>
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
                        onChangeText={(t) => {
                            if (isReordering) setIsReordering(false);
                            setSearchText(t);
                        }}
                        autoFocus
                    />
                    <TouchableOpacity onPress={() => { setSearchText(''); setIsSearchVisible(false); }}><X size={16} color={Colors.text.tertiary} /></TouchableOpacity>
                </View>
            )}

            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                <DraggableFlatList
                    data={processedResults}
                    extraData={localSavedPredictions}
                    onDragEnd={({ data }) => handleDragEnd(data)}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItem}
                    activationDistance={5}
                    dragItemOverflow={false}
                    autoscrollThreshold={80}
                    autoscrollSpeed={150}
                    animationConfig={{
                        damping: 35,
                        stiffness: 400,
                        mass: 0.3,
                    }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    containerStyle={{ flex: 1 }}
                    ListEmptyComponent={
                        <View style={styles.centerEmpty}>
                            <Search size={48} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No matching options</Text>
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
    rearrangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.primary, backgroundColor: 'transparent' },
    rearrangeBtnActive: { backgroundColor: Colors.primary },
    rearrangeBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
    rearrangeBtnTextActive: { color: Colors.white },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, margin: 12, paddingHorizontal: 12, height: 44, borderRadius: 12, ...Shadows.xs },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: Colors.text.primary },
    fullWidthItem: { width: '100%' },
    resultCard: { marginVertical: 0.5, padding: 14, borderRadius: 0, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    activeCard: {
        backgroundColor: '#ffffff',
        zIndex: 999,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
    saveBtn: { padding: 4 },
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
    centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.secondary, marginTop: 16 },
    usageSmall: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.primary,
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    infoLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoLinkText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
    },
});

export default OptionFormViewScreen;
