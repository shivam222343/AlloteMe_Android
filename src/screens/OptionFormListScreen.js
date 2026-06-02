import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2, ShieldCheck, GraduationCap } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { optionFormAPI } from '../services/api';
import { Colors, Shadows } from '../constants/theme';

const PRESET_COLORS = [
    { border: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
    { border: '#10b981', bg: '#ecfdf5', text: '#047857' },
    { border: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
    { border: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9' },
    { border: '#ec4899', bg: '#fdf2f8', text: '#be185d' }
];

const OptionFormListScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { user, admissionPath } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [presets, setPresets] = useState([]);
    const [categoryOrder, setCategoryOrder] = useState([]);
    const [loading, setLoading] = useState(true);

    const activePath = route?.params?.activePath || admissionPath || user?.examType;

    const matchesExamType = (category, examType) => {
        if (!category || !examType) return false;
        const cat = category.toUpperCase().trim();
        const type = examType.toUpperCase().trim();
        
        // Strict segregation between PCM and PCB
        if (type.includes('PCM') && cat.includes('PCB')) return false;
        if (type.includes('PCB') && cat.includes('PCM')) return false;

        if (type === 'MHTCET PCM' || type === 'MHTCET-PCM') {
            return cat === 'MHTCET PCM' || cat === 'ENGINEERING' || cat === 'MHTCET' || cat === 'MHTCET-PCM';
        }
        if (type === 'MHTCET PCB' || type === 'MHTCET-PCB') {
            return cat === 'MHTCET PCB' || cat === 'PHARMACY' || cat === 'MHTCET-PCB';
        }
        return cat === type;
    };

    const filteredPresets = useMemo(() => {
        if (isAdmin) return presets; // Admin sees all to manage
        return presets.filter(preset => {
            if (matchesExamType(preset.category, activePath)) return true;
            const firstCollegeCat = preset.colleges?.[0]?.collegeId?.category;
            if (firstCollegeCat && matchesExamType(firstCollegeCat, activePath)) return true;
            return false;
        });
    }, [presets, activePath, isAdmin]);

    const presetsByCategory = useMemo(() => {
        const groups = {};
        filteredPresets.forEach(preset => {
            const cat = preset.category || 'General';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(preset);
        });
        return groups;
    }, [filteredPresets]);

    const orderedCategories = useMemo(() => {
        const order = [...categoryOrder];
        Object.keys(presetsByCategory).forEach(cat => {
            if (!order.includes(cat)) {
                order.push(cat);
            }
        });
        return order.filter(cat => presetsByCategory[cat] && presetsByCategory[cat].length > 0);
    }, [categoryOrder, presetsByCategory]);

    const fetchPresets = async () => {
        try {
            setLoading(true);
            const res = await optionFormAPI.getAll();
            const originalPresets = res.data.data || [];

            // Sort categories by creation date of their oldest preset (ascending / older first)
            const categoryMinCreated = {};
            originalPresets.forEach(preset => {
                const cat = preset.category || 'General';
                const createdTime = preset.createdAt ? new Date(preset.createdAt).getTime() : 0;
                if (categoryMinCreated[cat] === undefined || createdTime < categoryMinCreated[cat]) {
                    categoryMinCreated[cat] = createdTime;
                }
            });

            const order = Object.keys(categoryMinCreated).sort((a, b) => categoryMinCreated[a] - categoryMinCreated[b]);
            setCategoryOrder(order);

            const sortedPresets = [...originalPresets].sort((a, b) => Number(b.percentile) - Number(a.percentile));
            setPresets(sortedPresets);
        } catch (error) {
            console.error('Fetch presets error:', error);
            Alert.alert('Error', 'Failed to retrieve presets.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPresets();
        }, [])
    );

    const handleDelete = (id, label) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Are you sure you want to delete Option Form Preset: ${label}%ile?`);
            if (confirmed) {
                (async () => {
                    try {
                        await optionFormAPI.delete(id);
                        fetchPresets();
                    } catch (e) {
                        alert('Failed to delete preset.');
                    }
                })();
            }
            return;
        }

        Alert.alert(
            "Delete Preset",
            `Are you sure you want to delete Option Form Preset: ${label}%ile?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await optionFormAPI.delete(id);
                            fetchPresets();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete preset.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>Option Form Presets</Text>
                    <Text style={styles.subtitle}>{filteredPresets.length} lists curated by admin</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : filteredPresets.length === 0 ? (
                <View style={styles.center}>
                    <GraduationCap size={64} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No Option Forms Yet</Text>
                    <Text style={styles.emptyText}>Presets added by the counseling admin will appear here.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {orderedCategories.map((categoryName) => {
                        const catPresets = presetsByCategory[categoryName];
                        return (
                            <View key={categoryName} style={styles.sectionContainer}>
                                <Text style={styles.sectionHeading}>{categoryName}</Text>
                                <View style={styles.grid}>
                                    {catPresets.map((preset, idx) => {
                                        const colors = PRESET_COLORS[idx % PRESET_COLORS.length];
                                        return (
                                            <View key={preset._id} style={styles.gridItemContainer}>
                                                <TouchableOpacity
                                                    style={styles.gridItem}
                                                    activeOpacity={0.8}
                                                    onPress={() => navigation.navigate('OptionFormView', { preset })}
                                                >
                                                    <View style={[styles.circle, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                                                        <Text style={[styles.percentileText, { color: colors.text }]}>
                                                            {Number(preset.percentile).toFixed(2)}
                                                        </Text>
                                                        <Text style={[styles.circlePercentSign, { color: colors.text }]}>%ile</Text>
                                                    </View>
                                                    <View style={styles.categoryContainer}>
                                                        <ShieldCheck size={10} color={colors.text} />
                                                        <Text style={[styles.categoryText, { color: colors.text }]}>{preset.category}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                                
                                                {isAdmin && (
                                                    <TouchableOpacity
                                                        style={styles.deleteBtn}
                                                        onPress={() => handleDelete(preset._id, preset.percentile)}
                                                    >
                                                        <Trash2 size={16} color="#ef4444" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 70, backgroundColor: Colors.white, ...Shadows.sm },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, marginLeft: 8 },
    title: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    subtitle: { fontSize: 11, color: Colors.text.tertiary },
    scrollContent: { paddingHorizontal: 10, paddingVertical: 16 },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionHeading: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
    gridItemContainer: { position: 'relative', width: (Dimensions.get('window').width - 44) / 3, marginBottom: 16 },
    gridItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    circle: {
        width: 78,
        height: 78,
        borderRadius: 39,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        marginBottom: 10
    },
    percentileText: { fontSize: 16, fontWeight: '800' },
    circlePercentSign: { fontSize: 9, fontWeight: '600', marginTop: -2 },
    categoryContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    categoryText: { fontSize: 11, fontWeight: '700' },
    deleteBtn: {
        position: 'absolute',
        top: -2,
        right: 2,
        backgroundColor: '#fee2e2',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.xs,
        zIndex: 10
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.secondary, marginTop: 16 },
    emptyText: { fontSize: 13, color: Colors.text.tertiary, textAlign: 'center', marginTop: 8, lineHeight: 18 }
});

export default OptionFormListScreen;
