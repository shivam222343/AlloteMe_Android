import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, LayoutAnimation } from 'react-native';
import Card from '../components/ui/Card';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Layers, Calendar, GripVertical, ChevronLeft, Trash2, X, ShieldCheck, Bookmark } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import DraggableFlatList from 'react-native-draggable-flatlist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SavedPredictionsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user, toggleSavePredictionOptimistic, updateProfile } = useAuth();
    const [isReordering, setIsReordering] = useState(false);

    // Filter to handle cases where user object might be temporarily null/syncing
    const savedList = useMemo(() => user?.savedPredictions || [], [user?.savedPredictions]);

    const handleRemove = (item) => {
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
                            collegeId: item.collegeId?._id || item.collegeId,
                            branch: item.branch,
                            year: item.year,
                            round: item.round
                        };
                        toggleSavePredictionOptimistic(predictionData);
                    }
                }
            ]
        );
    };

    const handleDragEnd = async (data) => {
        try {
            // Optimistically update local state if AuthContext supports it, 
            // but here we just call updateProfile which will update the user state
            setIsReordering(true);
            await updateProfile({ savedPredictions: data });
        } catch (error) {
            console.error('Error saving reorder:', error);
            Alert.alert('Error', 'Failed to save new order.');
        } finally {
            setIsReordering(false);
        }
    };

    const renderItem = useCallback(({ item, drag, isActive, getIndex }) => {
        const index = getIndex();
        
        // Handle both populated and non-populated collegeId for safety
        const college = item.collegeId && typeof item.collegeId === 'object' ? item.collegeId : { name: 'Loading...' };

        return (
            <TouchableOpacity
                onLongPress={drag}
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
                                <Text style={styles.statLabel}>CUTOFF</Text>
                                <Text style={styles.statVal}>{Number(item.percentile).toFixed(2)}%</Text>
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

    if (loading) {
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
                    <Text style={styles.subtitle}>{savedList.length} items synced to account</Text>
                </View>
            </View>

            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                <DraggableFlatList
                    data={savedList}
                    onDragEnd={({ data }) => handleDragEnd(data)}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    containerStyle={{ flex: 1 }}
                    activationDistance={20}
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
