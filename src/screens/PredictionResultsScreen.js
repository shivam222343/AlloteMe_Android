import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput, LayoutAnimation, ScrollView } from 'react-native';
import Card from '../components/ui/Card';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Layers, Calendar, Download, GripVertical, Info, ChevronLeft, FileText, Trash2, Search, SortAsc, X, ShieldCheck, Star, Bookmark } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import OptimizedImage from '../components/ui/OptimizedImage';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PredictionResultsScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { results: resultsParam = [], percentile = 0, rank = '', category = '', examType = '' } = route?.params || {};

    const [results, setResults] = useState(resultsParam);

    useEffect(() => {
        if (resultsParam) {
            setResults(resultsParam);
        }
    }, [resultsParam]);

    const { user, refreshUser, toggleSaveOptimistic, toggleSavePredictionOptimistic } = useAuth();
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingCSV, setExportingCSV] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [sortBy, setSortBy] = useState('none');
    const [savingId, setSavingId] = useState(null);
    const [localSavedPredictions, setLocalSavedPredictions] = useState(new Set());

    // Sync local saved state with user object on mount or when user changes
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

    const handleToggleSave = useCallback(async (id) => {
        if (!id || savingId) return;
        setSavingId(id);
        try {
            await toggleSaveOptimistic(id);
        } catch (error) {
            console.error('Save college failed:', error);
        } finally {
            setSavingId(null);
        }
    }, [savingId, toggleSaveOptimistic]);

    const handleSavePrediction = useCallback(async (item) => {
        const getCollegeId = (c) => (c && typeof c === 'object' ? c._id : (c || null));
        const collegeId = getCollegeId(item.collegeId);
        
        if (!collegeId) return;

        const predictionKey = `${collegeId}_${item.branch}_${item.year}_${item.round}_${item.category || ''}_${item.seatType || ''}`;
        
        // INSTANT UI FEEDBACK (Local state)
        LayoutAnimation.configureNext({
            duration: 200,
            update: { type: LayoutAnimation.Types.easeInEaseOut },
            create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
            delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        });

        setLocalSavedPredictions(prev => {
            const next = new Set(prev);
            if (next.has(predictionKey)) next.delete(predictionKey);
            else next.add(predictionKey);
            return next;
        });

        // Background Sync (Context state)
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
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>AlloteMe Prediction Report</title>
                    <style>
                        body { font-family: 'Helvetica', Arial, sans-serif; padding: 30px; color: #1e293b; background: #fff; line-height: 1.5; }
                        @media print {
                            body, html { height: auto !important; overflow: visible !important; }
                            .container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            thead { display: table-header-group; }
                            tfoot { display: table-footer-group; }
                        }
                        .container { max-width: 900px; margin: auto; }
                        .header { border-bottom: 3px solid #0A66C2; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .brand h1 { color: #0A66C2; margin: 0; font-size: 28px; letter-spacing: -0.5px; }
                        .brand p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
                        .report-meta { text-align: right; }
                        .meta-tag { display: inline-block; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin-left: 8px; font-weight: 600; color: #475569; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
                        th { background-color: #0A66C2; text-align: left; padding: 12px; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; }
                        td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; line-height: 1.4; color: #334155; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        
                        .dte { color: #0A66C2; font-weight: 700; font-size: 12px; }
                        .college-name { font-weight: 700; font-size: 12px; color: #1e293b; }
                        .branch { color: #475569; font-weight: 500; }
                        .chance { font-weight: 700; border-radius: 4px; padding: 2px 6px; display: inline-block; }
                        
                        .footer { margin-top: 50px; padding: 25px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
                        .footer p { margin: 0; font-size: 12px; color: #64748b; line-height: 1.6; }
                        .contact { font-weight: 800; color: #0A66C2; font-size: 16px; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="brand">
                                <h1>AlloteMe Prediction Report</h1>
                                <p>Personalized College Allotment Strategy</p>
                            </div>
                            <div class="report-meta">
                                <span class="meta-tag">${examType}</span>
                                <span class="meta-tag">${category}</span>
                                <span class="meta-tag">${percentile}%ile</span>
                                <p style="font-size: 10px; color: #94a3b8; margin: 8px 0 0 0;">Generated on ${new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>DTE Code</th>
                                    <th>Institution</th>
                                    <th>Course / Branch</th>
                                    <th>Category/Quota</th>
                                    <th>Cutoff %</th>
                                    <th>Rank</th>
                                    <th>Chance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${processedResults.map((item, index) => `
                                    <tr>
                                        <td style="color:#94a3b8; font-weight:bold;">${index + 1}</td>
                                        <td class="dte">${item.collegeId?.dteCode || '—'}</td>
                                        <td class="college-name">${item.collegeId?.name || 'Unknown'}</td>
                                        <td class="branch">${item.branch}</td>
                                        <td style="font-size:10px;">${[item.category, item.seatType].filter(Boolean).join(' / ')}</td>
                                        <td style="font-weight:700;">${Number(item.percentile).toFixed(2)}%</td>
                                        <td style="color:#64748b;">${item.rank || '—'}</td>
                                        <td style="color:${item.chanceColor}">${item.chanceLabel}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="footer">
                            <p><b>Disclaimer:</b> These predictions are generated via AI models based on historical cutoff data. Actual allotment depends on seat availability, merit ranks, and official CAP round processing.</p>
                            <p style="margin-top: 10px;">For Expert Counseling & Admission Guidance:</p>
                            <div class="contact"><span>📞</span> 8010961216</div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                // CDN Injection to bypass bundler size/resolution issues (Fixes 500 Error)
                const loadJS = (src) => new Promise((resolve, reject) => {
                    const id = 'script-' + src.split('/').pop().replace(/\./g, '-');
                    if (document.getElementById(id)) return resolve();
                    const s = document.createElement('script');
                    s.id = id;
                    s.src = src;
                    s.onload = resolve;
                    s.onerror = reject;
                    document.head.appendChild(s);
                });

                try {
                    await loadJS('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                    await loadJS('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
                } catch (e) {
                    Alert.alert('Download Error', 'Could not load PDF libraries. Please check your internet connection.');
                    setExportingPDF(false);
                    return;
                }

                // jsPDF and autoTable are now on the window object
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Add Header Background
                doc.setFillColor(10, 102, 194); // #0A66C2
                doc.rect(0, 0, 210, 40, 'F');

                // Add Title
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(22);
                doc.text("AlloteMe Prediction Report", 15, 20);
                doc.setFontSize(10);
                doc.text("Personalized College Allotment Strategy", 15, 28);

                // Add Meta Info
                doc.setFontSize(9);
                doc.text(`${examType} | ${category} | ${percentile}%ile`, 140, 20);
                doc.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 28);

                // Add Table
                const tableData = processedResults.map((item, index) => [
                    index + 1,
                    item.collegeId?.dteCode || '—',
                    item.collegeId?.name || 'Unknown Institution',
                    item.branch,
                    [item.category, item.seatType].filter(Boolean).join(' / '),
                    `${Number(item.percentile).toFixed(2)}%`,
                    item.rank || '—',
                    item.chanceLabel
                ]);

                // Use the autoTable plugin
                doc.autoTable({
                    startY: 45,
                    head: [['#', 'DTE', 'Institution', 'Course / Branch', 'Category/Quota', 'Cutoff %', 'Rank', 'Chance']],
                    body: tableData,
                    headStyles: { fillColor: [10, 102, 194], fontSize: 9, fontStyle: 'bold' },
                    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                        0: { cellWidth: 10 },
                        1: { cellWidth: 15 },
                        2: { cellWidth: 'auto' },
                        4: { cellWidth: 20 },
                        7: { fontStyle: 'bold' }
                    },
                    didDrawPage: (data) => {
                        // Footer on every page
                        doc.setFontSize(8);
                        doc.setTextColor(148, 163, 184);
                        doc.text(`Page ${data.pageNumber} | www.alloteme.in | Support: 8010961216`, 15, doc.internal.pageSize.height - 10);
                    }
                });

                doc.save(`AlloteMe_Prediction_${new Date().getTime()}.pdf`);
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri);
            }
        } catch (error) {
            console.error('PDF Export Error:', error);
            Alert.alert('PDF Export Failed');
        } finally {
            setExportingPDF(false);
        }
    };

    const exportToCSV = async () => {
        if (processedResults.length === 0) return;
        setExportingCSV(true);
        try {
            let csv = '\uFEFFNo,DTE Code,College,Branch,Category,Quota,Cutoff%,Rank,Chance\n';
            processedResults.forEach((item, idx) => {
                const name = item.collegeId?.name?.replace(/"/g, '""') || 'Unknown';
                const branch = item.branch?.replace(/"/g, '""') || '';
                csv += `${idx + 1},${item.collegeId?.dteCode || ''},"${name}","${branch}","${item.category || ''}","${item.seatType || ''}",${item.percentile},${item.rank || ''},${item.chanceLabel}\n`;
            });

            if (Platform.OS === 'web') {
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'AlloteMe_Predictions.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const fileUri = `${FileSystem.cacheDirectory}AlloteMe_Predictions.csv`;
                await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
                await Sharing.shareAsync(fileUri);
            }
        } catch (error) {
            console.error('CSV Export Error:', error);
            Alert.alert('CSV Export Failed');
        } finally {
            setExportingCSV(false);
        }
    };

    const renderItem = useCallback(({ item, drag, isActive, getIndex }) => {
        const index = getIndex();
        const getCollegeId = (c) => (c && typeof c === 'object' ? c._id : c);
        const itemCollegeId = getCollegeId(item.collegeId);
        const predictionKey = `${itemCollegeId}_${item.branch}_${item.year}_${item.round}_${item.category || ''}_${item.seatType || ''}`;
        
        // Priority to local state for instant feel, fallback to synced user state
        const isSaved = localSavedPredictions.has(predictionKey);
        const isCollegeBookmarked = user?.savedColleges?.some(c => getCollegeId(c) === itemCollegeId);

        return (
            <TouchableOpacity
                onLongPress={searchText ? null : drag}
                delayLongPress={300}
                onPress={() => navigation.navigate('CollegeDetail', { id: item.collegeId?._id })}
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

                        <View style={[
                            styles.matchBadge, 
                            { 
                                borderColor: isSaved ? Colors.primary : item.chanceColor, 
                                backgroundColor: isSaved ? Colors.primary + '15' : (item.chanceColor || '#0A66C2') + '10' 
                            }
                        ]}>
                            <Text style={[
                                styles.matchPercent, 
                                { color: isSaved ? Colors.primary : (item.chanceColor || '#0A66C2') }
                            ]}>
                                {isSaved ? 'SAVED' : item.chanceLabel}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => handleSavePrediction(item)}
                            style={styles.saveBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Bookmark size={18} color={isSaved ? Colors.primary : '#94a3b8'} fill={isSaved ? Colors.primary : 'transparent'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleDelete(item.key)}
                            style={styles.deleteBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={18} color="#94a3b8" />
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
    }, [navigation, localSavedPredictions, user?.savedColleges, handleToggleSave, handleSavePrediction]);

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
                            const msg = "Reordering is only allowed in 'Priority' sort mode.";
                            if (Platform.OS === 'web') alert(msg);
                            else Alert.alert("Sort Active", msg);
                            return;
                        }
                        if (searchText) {
                            const msg = "Reordering is only allowed when search is cleared.";
                            if (Platform.OS === 'web') alert(msg);
                            else Alert.alert("Search Active", msg);
                            return;
                        }
                        setResults(data);
                    }}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    containerStyle={{ flex: 1 }}
                    activationDistance={20}
                    dragItemOverflow={true}
                    onDragBegin={() => {
                        // Light feedback or state if needed
                    }}
                    ListEmptyComponent={
                        <View style={styles.centerEmpty}>
                            <Search size={48} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No Matching Colleges</Text>
                            <Text style={styles.emptyText}>Try reducing your percentile tolerance or changing the category filter.</Text>
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
    collegeThumb: { width: 40, height: 40, borderRadius: 8 },
    instName: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    locText: { fontSize: 10, color: Colors.text.tertiary },
    sep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.divider, marginHorizontal: 4 },
    dteText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary },
    matchBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
    matchPercent: { fontSize: 10, fontWeight: 'bold' },
    saveBtn: { padding: 4, marginRight: 4 },
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
    centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.secondary, marginTop: 16 },
    emptyText: { marginTop: 8, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 }
});

export default PredictionResultsScreen;
