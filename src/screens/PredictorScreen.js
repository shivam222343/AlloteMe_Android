import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView, Platform, LayoutAnimation } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { cutoffAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Shadows } from '../constants/theme';
import { Sparkles, Settings2, ChevronDown, ChevronUp, CheckCircle2, MapPin, GitBranch, Calendar, ShieldCheck } from 'lucide-react-native';
import Slider from '@react-native-community/slider';

const CATEGORIES = ['OPEN', 'OBC', 'SC', 'ST', 'VJNT', 'NT-B', 'NT-C', 'NT-D', 'EWS', 'TFWS'];
const BRANCHES = [
    'Bio Technology',
    'Civil Engineering',
    'Computer Science and Engineering',
    'Computer Science and Business Systems',
    'Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
    'Artificial Intelligence and Machine Learning',
    'Artificial Intelligence (AI) and Data Science',
    'Information Technology',
    'Electrical Engineering',
    'Electronics and Telecommunication Engineering',
    'Electronics and Computer Engineering',
    'Instrumentation and Control Engineering',
    'Instrumentation Engineering',
    'Mechanical Engineering',
    'Manufacturing Science and Engineering',
    'Metallurgy and Material Technology',
    'Civil and Environmental Engineering',
    'Food Technology',
    'Petro Chemical Engineering',
    'Oil and Paints Technology',
    'Paper and Pulp Technology',
    'Chemical Engineering',
    'Textile Engineering',
    'Production Engineering',
    'Automobile Engineering',
    'Aeronautical Engineering',
    'Biomedical Engineering',
    'Mining Engineering',
    'Printing Technology'
];
const REGIONS = ['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Aurangabad', 'Amravati', 'Solapur', 'Kolhapur', 'Raigad', 'Other'];
const INSTITUTION_TYPES = [
    'Government',
    'Government Autonomous',
    'Government Aided',
    'Government Aided Autonomous',
    'Private',
    'Private Autonomous',
    'Private Aided',
    'Private Aided Autonomous',
    'Private Non-Autonomous',
    'Autonomous',
    'Non-Autonomous',
    'Empowered Autonomous'
];
const SEAT_TYPES = [
    'Home University',
    'Other Than Home University',
    'State Level',
    'All India Level'
];
const YEARS = [2025, 2024, 2023, 2022];

const PredictorScreen = ({ navigation }) => {
    const { user, socket } = useAuth();
    const [percentile, setPercentile] = useState(user?.percentile?.toString() || '');
    const [rank, setRank] = useState(user?.rank?.toString() || '');
    const [category, setCategory] = useState(user?.category || 'OPEN');
    const [pTolerance, setPTolerance] = useState(10);
    const [rTolerance, setRTolerance] = useState(500);

    // Advanced Settings
    const [showAdvance, setShowAdvance] = useState(false);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [selectedRegions, setSelectedRegions] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedSeatTypes, setSelectedSeatTypes] = useState([]);
    const [selectedYear, setSelectedYear] = useState(2025);
    const [loading, setLoading] = useState(false);
    const [rankLoading, setRankLoading] = useState(false);

    // Auto-calculate Rank based on Percentile
    React.useEffect(() => {
        if (!percentile || isNaN(parseFloat(percentile))) {
            setRank('');
            return;
        }

        const timeout = setTimeout(async () => {
            setRankLoading(true);
            try {
                const res = await cutoffAPI.estimateRank(percentile);
                if (res.data?.rank) {
                    setRank(res.data.rank.toString());
                }
            } catch (error) {
                console.log('Rank estimation failed', error);
            } finally {
                setRankLoading(false);
            }
        }, 800); // 800ms debounce

        return () => clearTimeout(timeout);
    }, [percentile]);

    const toggleAdvance = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowAdvance(!showAdvance);
    };

    const toggleSelection = (item, selectedList, setSelectedList) => {
        if (selectedList.includes(item)) {
            setSelectedList(selectedList.filter(i => i !== item));
        } else {
            setSelectedList([...selectedList, item]);
        }
    };

    const handlePredict = async () => {
        if (!percentile && !rank) {
            Alert.alert('Input Required', 'Please enter your Percentile or Rank.');
            return;
        }
        setLoading(true);
        try {
            const res = await cutoffAPI.predict({
                percentile,
                rank,
                pTolerance,
                rTolerance,
                examType: user?.examType || 'MHTCET',
                category,
                branches: selectedBranches.join(','),
                regions: selectedRegions.join(','),
                institutionTypes: selectedTypes.join(','),
                seatTypes: selectedSeatTypes.join(','),
                year: selectedYear,
                round: 1
            });

            const cleanData = res.data.map((item, index) => ({
                ...item,
                key: item._id || `id-${index}`
            }));

            navigation.navigate('PredictionResults', {
                results: cleanData,
                percentile,
                rank,
                category,
                examType: user?.examType || 'MHTCET'
            });

        } catch (error) {
            console.error('Prediction error:', error);
            Alert.alert('Error', 'Failed to fetch prediction data.');
        } finally {
            setLoading(false);
        }
    };

    const renderMultiSelect = (items, selectedItems, setSelectedItems, Icon, label) => (
        <View style={styles.advanceGroup}>
            <View style={styles.advanceLabelRow}>
                <Icon size={14} color={Colors.text.tertiary} />
                <Text style={styles.advanceLabel}>{label}</Text>
                {selectedItems.length > 0 && <Text style={styles.countTag}>{selectedItems.length} selected</Text>}
            </View>
            <View style={styles.chipGrid}>
                {items.map(item => {
                    const isActive = selectedItems.includes(item);
                    return (
                        <TouchableOpacity
                            key={item}
                            style={[styles.advanceChip, isActive && styles.advanceChipActive]}
                            onPress={() => toggleSelection(item, selectedItems, setSelectedItems)}
                        >
                            <Text style={[styles.advanceChipText, isActive && styles.advanceChipTextActive]}>{item}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <MainLayout scrollable={true} showHeader={false} noPadding={true}>
            <View style={styles.container}>
                <View style={styles.topHeader}>
                    <View>
                        <Text style={styles.title}>College Predictor</Text>
                        <Text style={styles.subtitle}>Analyzing {user?.examType} Real Data • 2025 Edition</Text>
                    </View>
                </View>

                <Card style={styles.formCard}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>Validating scores against millions of allotment records from DTE database.</Text>
                    </View>

                    <View style={styles.inputGrid}>
                        <Input
                            label="Percentile"
                            value={percentile}
                            onChangeText={setPercentile}
                            keyboardType="numeric"
                            containerStyle={{ flex: 1 }}
                            placeholder="0.00"
                        />
                        <Input
                            label="Rank"
                            value={rank}
                            onChangeText={setRank}
                            keyboardType="numeric"
                            containerStyle={{ flex: 1 }}
                            placeholder="Optional"
                        />
                    </View>

                    <Text style={styles.label}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catChip, category === cat && styles.catChipActive]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.sliderContainer}>
                        <View style={styles.sliderLabelRow}>
                            <Text style={styles.sliderLabel}>Percentile Tolerance</Text>
                            <Text style={styles.sliderVal}>±{pTolerance}%</Text>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={5}
                            maximumValue={20}
                            step={1}
                            value={pTolerance}
                            onValueChange={setPTolerance}
                            minimumTrackTintColor={Colors.primary}
                            maximumTrackTintColor={Colors.divider}
                            thumbTintColor={Colors.primary}
                        />
                    </View>

                    {/* Advanced Settings Toggle */}
                    <TouchableOpacity style={styles.advanceToggle} onPress={toggleAdvance}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Settings2 size={18} color={Colors.primary} />
                            <Text style={styles.advanceToggleText}>Advanced Filter Options</Text>
                        </View>
                        {showAdvance ? <ChevronUp size={18} color={Colors.text.tertiary} /> : <ChevronDown size={18} color={Colors.text.tertiary} />}
                    </TouchableOpacity>

                    {showAdvance && (
                        <View style={styles.advancePanel}>
                            {renderMultiSelect(BRANCHES, selectedBranches, setSelectedBranches, GitBranch, "Preferred Branches")}
                            {renderMultiSelect(REGIONS, selectedRegions, setSelectedRegions, MapPin, "Target Regions")}
                            {renderMultiSelect(INSTITUTION_TYPES, selectedTypes, setSelectedTypes, ShieldCheck, "Institution Type & Autonomy")}
                            {renderMultiSelect(SEAT_TYPES, selectedSeatTypes, setSelectedSeatTypes, CheckCircle2, "Seat Type Preference")}

                            <View style={styles.advanceGroup}>
                                <View style={styles.advanceLabelRow}>
                                    <Calendar size={14} color={Colors.text.tertiary} />
                                    <Text style={styles.advanceLabel}>Cutoff Year</Text>
                                </View>
                                <View style={styles.chipGrid}>
                                    {YEARS.map(y => (
                                        <TouchableOpacity
                                            key={y}
                                            style={[styles.advanceChip, selectedYear === y && styles.advanceChipActive]}
                                            onPress={() => setSelectedYear(y)}
                                        >
                                            <Text style={[styles.advanceChipText, selectedYear === y && styles.advanceChipTextActive]}>{y}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    <Button
                        title="Predict My Colleges"
                        onPress={handlePredict}
                        loading={loading}
                        icon={Sparkles}
                        style={styles.predictBtn}
                    />
                </Card>

                <View style={styles.perksRow}>
                    <View style={styles.perk}>
                        <CheckCircle2 size={16} color={Colors.success} />
                        <Text style={styles.perkText}>DTE Official Records</Text>
                    </View>
                    <View style={styles.perk}>
                        <CheckCircle2 size={16} color={Colors.success} />
                        <Text style={styles.perkText}>2025 Algorithm</Text>
                    </View>
                </View>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    topHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 25, backgroundColor: Colors.white, ...Shadows.sm },
    title: { fontSize: 28, fontWeight: 'bold', color: Colors.text.primary },
    subtitle: { fontSize: 13, color: Colors.text.tertiary, marginTop: 4 },

    formCard: { margin: 16, padding: 20, borderRadius: 28 },
    infoBox: { backgroundColor: '#F0F9FF', padding: 12, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#BAE6FD' },
    infoText: { fontSize: 12, color: '#0369A1', lineHeight: 18, textAlign: 'center', fontWeight: '500' },
    inputGrid: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    label: { fontSize: 11, fontWeight: '800', color: Colors.text.secondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
    catScroll: { marginBottom: 20 },
    catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    catChipText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
    catChipTextActive: { color: Colors.white },

    sliderContainer: { marginBottom: 20 },
    sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sliderLabel: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },
    sliderVal: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
    slider: { width: '100%', height: 35 },

    advanceToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 10 },
    advanceToggleText: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
    advancePanel: { paddingBottom: 15 },
    advanceGroup: { marginBottom: 18 },
    advanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    advanceLabel: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
    countTag: { fontSize: 9, fontWeight: 'bold', color: Colors.white, backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    advanceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    advanceChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
    advanceChipText: { fontSize: 12, color: Colors.text.secondary },
    advanceChipTextActive: { color: Colors.primary, fontWeight: 'bold' },

    predictBtn: { height: 60, borderRadius: 18, marginTop: 10 },
    perksRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingBottom: 40 },
    perk: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    perkText: { fontSize: 11, fontWeight: '600', color: Colors.text.tertiary },
});

export default PredictorScreen;
