import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView, Platform, LayoutAnimation, Modal } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { cutoffAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptions';
import { Colors, Shadows } from '../constants/theme';
import { Sparkles, Settings2, ChevronDown, ChevronUp, CheckCircle2, MapPin, GitBranch, Calendar, ShieldCheck, LucideShieldCheck, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Slider from '@react-native-community/slider';

const CATEGORIES = ['OPEN', 'OBC', 'SC', 'ST', 'VJ', 'NT1', 'NT2', 'NT3', 'SEBC', 'EWS'];
const CATEGORICAL_BRANCHES = {
    'MHTCET PCM': [
        'Bio Technology', 'Civil Engineering', 'Computer Science and Engineering',
        'Computer Science and Business Systems', 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
        'Artificial Intelligence and Machine Learning', 'Artificial Intelligence (AI) and Data Science',
        'Information Technology', 'Electrical Engineering', 'Electronics and Telecommunication Engineering',
        'Electronics and Computer Engineering', 'Instrumentation and Control Engineering', 'Instrumentation Engineering',
        'Mechanical Engineering', 'Manufacturing Science and Engineering', 'Metallurgy and Material Technology',
        'Civil and Environmental Engineering', 'Food Technology', 'Petro Chemical Engineering',
        'Oil and Paints Technology', 'Paper and Pulp Technology', 'Chemical Engineering',
        'Textile Engineering', 'Production Engineering', 'Automobile Engineering',
        'Aeronautical Engineering', 'Biomedical Engineering', 'Mining Engineering', 'Printing Technology'
    ],
    'MHTCET PCB': [
        'Pharmacy (B.Pharm)', 'Pharm.D (Doctor of Pharmacy)', 'B.Sc Biotechnology', 'B.Sc Microbiology',
        'B.Sc Biochemistry', 'B.Sc Nursing', 'B.Sc Agriculture', 'B.Sc Horticulture',
        'Physiotherapy (BPT)', 'Medical Lab Technology (MLT)', 'Allied Health Sciences'
    ],
    'BBA': [
        'Business Administration', 'Marketing Management', 'Financial Management', 'Human Resource Management',
        'International Business', 'Digital Marketing', 'Data Analytics for Business'
    ],
    'NEET': [
        'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BPTh', 'BOTh', 'BASLP', 'BP&O', 'B.Sc. Nursing'
    ],
    'JEE': [
        'B.Tech', 'B.Arch', 'B.Planning'
    ]
};
const REGIONS = [
    'Pune Region',
    'Mumbai Region',
    'Raigad Region',
    'Nashik Region',
    'Aurangabad Region',
    'Nagpur Region',
    'Amravati Region',
    'Solapur Region',
    'Kolhapur Region',
    'Western Maharashtra',
    'Vidarbha Region',
    'Marathwada Region',
    'Konkan Region',
    'North Maharashtra Region'
];
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
const ROUNDS = [1, 2, 3];

const PredictorScreen = ({ navigation }) => {
    const { user, socket, admissionPath, checkLimit, incrementUsage } = useAuth();
    const [percentile, setPercentile] = useState(user?.percentile?.toString() || '');
    const [rank, setRank] = useState(user?.rank?.toString() || '');
    const [category, setCategory] = useState(user?.category || 'OPEN');
    const [pTolerance, setPTolerance] = useState(10);
    const [rTolerance, setRTolerance] = useState(500);
    const [isFemale, setIsFemale] = useState(false);
    const [useTFWS, setUseTFWS] = useState(false);
    const [isDEF, setIsDEF] = useState(false);
    const [isPWD, setIsPWD] = useState(false);
    const [isOrphan, setIsOrphan] = useState(false);
    const [infoModal, setInfoModal] = useState({ visible: false, title: '', content: '' });

    // Advanced Settings
    const [showAdvance, setShowAdvance] = useState(false);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [selectedRegions, setSelectedRegions] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedSeatTypes, setSelectedSeatTypes] = useState([]);
    const [selectedYear, setSelectedYear] = useState(2025);
    const [selectedRound, setSelectedRound] = useState(1);
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
                const res = await cutoffAPI.estimateRank(percentile, admissionPath);
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

    React.useEffect(() => {
        setSelectedBranches([]);
    }, [admissionPath]);

    const [loadingMessage, setLoadingMessage] = useState('Searching best options...');
    const loadingMessages = [
        'Searching database...',
        'Retrieving cutoffs...',
        'Analyzing college trends...',
        'Formatting best matches...',
        'Finalizing response for you...'
    ];

    React.useEffect(() => {
        let timer;
        if (loading) {
            let i = 0;
            timer = setInterval(() => {
                i = (i + 1) % loadingMessages.length;
                setLoadingMessage(loadingMessages[i]);
            }, 1200);
        }
        return () => clearInterval(timer);
    }, [loading]);

    const handlePredict = async () => {
        if (!percentile && !rank) {
            Alert.alert('Input Required', 'Please enter your Percentile or Rank.');
            return;
        }

        // Check Subscription Limit
        if (!checkLimit('predictions')) return;

        setLoading(true);
        try {
            const res = await cutoffAPI.predict({
                percentile,
                rank,
                pTolerance,
                rTolerance,
                admissionPath,
                examType: user?.examType || 'MHTCET',
                category,
                branches: selectedBranches.join(','),
                regions: selectedRegions.join(','),
                institutionTypes: selectedTypes.join(','),
                seatTypes: selectedSeatTypes.join(','),
                year: selectedYear,
                round: selectedRound,
                isFemale,
                useTFWS,
                isDEF,
                isPWD,
                isOrphan
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

            // Increment Usage
            incrementUsage('predictions');

        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to fetch prediction data. Please try again.';
            console.error('Prediction error:', error);
            Alert.alert('Prediction Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const renderMultiSelect = (items, selectedItems, setSelectedItems, Icon, label) => {
        // Dynamic row count: 4 rows for large lists, fewer for smaller ones.
        const rowCount = items.length > 20 ? 4 : (items.length > 10 ? 3 : (items.length > 5 ? 2 : 1));
        const rows = Array.from({ length: rowCount }, () => []);
        items.forEach((item, i) => rows[i % rowCount].push(item));

        return (
            <View style={styles.advanceGroup}>
                <View style={styles.advanceLabelRow}>
                    <Icon size={14} color={Colors.text.tertiary} />
                    <Text style={styles.advanceLabel}>{label}</Text>
                    {selectedItems.length > 0 && <Text style={styles.countTag}>{selectedItems.length} selected</Text>}
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipScrollContent}
                >
                    <View>
                        {rows.map((rowItems, rowIndex) => (
                            <View key={rowIndex} style={styles.chipRow}>
                                {rowItems.map(item => {
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
                        ))}
                    </View>
                </ScrollView>
            </View>
        );
    };

    return (
        <MainLayout scrollable={true} showHeader={false} noPadding={true}>
            <View style={styles.container}>
                <View style={styles.topHeader}>
                    <View>
                        <Text style={styles.title}>College Predictor</Text>
                        <Text style={styles.subtitle}>Analyzing {user?.examType} Real Data • 2025 Edition</Text>
                    </View>
                    <View style={styles.usageChip}>
                        <Text style={styles.usageText}>
                            Predictions: <Text style={styles.usageBold}>
                                {user?.subscription?.usage?.predictions || 0}/{SUBSCRIPTION_PLANS[user?.subscription?.type?.toUpperCase() || 'FREE'].limits.predictions === Infinity ? '∞' : SUBSCRIPTION_PLANS[user?.subscription?.type?.toUpperCase() || 'FREE'].limits.predictions}
                            </Text>
                        </Text>
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

                    <View style={styles.toggleGrid}>
                        <View style={styles.toggleCard}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={styles.toggleLabel}>Female Quota</Text>
                                    <TouchableOpacity onPress={() => setInfoModal({
                                        visible: true,
                                        title: 'Female (L) Quota',
                                        content: 'Ladies quota provides 30% reservation in most Maharashtra colleges. Enabling this includes seats labeled with "L" (e.g., LOPEN, LOBC) in your predictions.'
                                    })}>
                                        <Info size={12} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.toggleBase, isFemale && styles.toggleActive]}
                                onPress={() => setIsFemale(!isFemale)}
                            >
                                <View style={[styles.toggleCircle, isFemale ? { right: 2 } : { left: 2 }]} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.toggleCard}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={styles.toggleLabel}>TFWS Mode</Text>
                                    <TouchableOpacity onPress={() => setInfoModal({
                                        visible: true,
                                        title: 'What is TFWS?',
                                        content: 'Tuition Fee Waiver Scheme (TFWS) is for students with family income < 8 LPA. \n\nPros: 100% Tuition fee is waived.\nCons: Students cannot change their college or branch after admission through TFWS.'
                                    })}>
                                        <Info size={12} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.toggleBase, useTFWS && styles.toggleActive]}
                                onPress={() => setUseTFWS(!useTFWS)}
                            >
                                <View style={[styles.toggleCircle, useTFWS ? { right: 2 } : { left: 2 }]} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Specialized Quotas Row */}
                    <View style={[styles.toggleGrid, { marginBottom: 15 }]}>
                        <View style={styles.toggleCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleLabel}>Defense (DEF)</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.toggleBase, isDEF && styles.toggleActive]}
                                onPress={() => setIsDEF(!isDEF)}
                            >
                                <View style={[styles.toggleCircle, isDEF ? { right: 2 } : { left: 2 }]} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.toggleCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleLabel}>PWD / PH</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.toggleBase, isPWD && styles.toggleActive]}
                                onPress={() => setIsPWD(!isPWD)}
                            >
                                <View style={[styles.toggleCircle, isPWD ? { right: 2 } : { left: 2 }]} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.toggleCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleLabel}>Orphan</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.toggleBase, isOrphan && styles.toggleActive]}
                                onPress={() => setIsOrphan(!isOrphan)}
                            >
                                <View style={[styles.toggleCircle, isOrphan ? { right: 2 } : { left: 2 }]} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.sliderContainer}>
                        <View style={styles.sliderLabelRow}>
                            <Text style={styles.sliderLabel}>Percentile Tolerance</Text>
                            <Text style={styles.sliderVal}>±{pTolerance}%</Text>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={50}
                            step={1}
                            value={pTolerance}
                            onValueChange={v => setPTolerance(Math.round(v))}
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
                            {renderMultiSelect(CATEGORICAL_BRANCHES[admissionPath] || CATEGORICAL_BRANCHES['MHTCET'], selectedBranches, setSelectedBranches, GitBranch, "Preferred Branches")}
                            {renderMultiSelect(REGIONS, selectedRegions, setSelectedRegions, MapPin, "Target Regions")}
                            {renderMultiSelect(INSTITUTION_TYPES, selectedTypes, setSelectedTypes, ShieldCheck, "Institution Type & Autonomy")}
                            {renderMultiSelect(SEAT_TYPES, selectedSeatTypes, setSelectedSeatTypes, CheckCircle2, "Seat Type Preference")}

                            <View style={styles.advanceGroup}>
                                <View style={styles.advanceLabelRow}>
                                    <Calendar size={14} color={Colors.text.tertiary} />
                                    <Text style={styles.advanceLabel}>Cutoff Year & Round</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 20 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.advanceLabel, { marginBottom: 8, fontSize: 10 }]}>YEAR</Text>
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
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.advanceLabel, { marginBottom: 8, fontSize: 10 }]}>ROUND</Text>
                                        <View style={styles.chipGrid}>
                                            {ROUNDS.map(r => (
                                                <TouchableOpacity
                                                    key={r}
                                                    style={[styles.advanceChip, selectedRound === r && styles.advanceChipActive]}
                                                    onPress={() => setSelectedRound(r)}
                                                >
                                                    <Text style={[styles.advanceChipText, selectedRound === r && styles.advanceChipTextActive]}>R{r}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
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

            {/* Info Modal */}
            <Modal visible={infoModal.visible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{infoModal.title}</Text>
                        <Text style={styles.modalText}>{infoModal.content}</Text>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setInfoModal({ ...infoModal, visible: false })}
                        >
                            <Text style={styles.modalCloseText}>Got it!</Text>
                        </TouchableOpacity>
                    </Animatable.View>
                </View>
            </Modal>

            {/* Immersive Full Screen Loading Overlay */}
            <Modal visible={loading} transparent animationType="fade">
                <LinearGradient
                    colors={[Colors.primary, '#003366']}
                    style={styles.loadingOverlayFull}
                >
                    <Animatable.View
                        animation="pulse"
                        iterationCount="infinite"
                        style={styles.loadingIconOuter}
                    >
                        <View style={styles.loadingIconInner}>
                            <Sparkles size={48} color={Colors.primary} />
                        </View>
                    </Animatable.View>

                    <Animatable.Text
                        animation="fadeInUp"
                        style={styles.loadingTitle}
                    >
                        AlloteMe AI Engine
                    </Animatable.Text>

                    <Animatable.View
                        animation="fadeIn"
                        duration={1000}
                        style={styles.msgContainer}
                    >
                        <Text style={styles.loadingStepText}>
                            {loadingMessage}
                        </Text>
                    </Animatable.View>

                    <ActivityIndicator size="small" color={Colors.white} style={{ marginTop: 30 }} />
                </LinearGradient>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    topHeader: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, backgroundColor: Colors.white, ...Shadows.sm },
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

    toggleGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    toggleCard: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    toggleLabel: { fontSize: 11, fontWeight: 'bold', color: Colors.text.primary },
    toggleBase: { width: 36, height: 20, borderRadius: 10, backgroundColor: '#E2E8F0', paddingHorizontal: 2, justifyContent: 'center' },
    toggleActive: { backgroundColor: Colors.primary },
    toggleCircle: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.white, position: 'absolute' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: Colors.white, width: '100%', borderRadius: 24, padding: 24, ...Shadows.lg },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 12 },
    modalText: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22, marginBottom: 20 },
    modalCloseBtn: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    modalCloseText: { color: Colors.white, fontWeight: 'bold' },

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

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    chipScrollContent: {
        paddingRight: 20,
        paddingBottom: 4
    },
    chipRow: {
        flexDirection: 'row',
        paddingVertical: 2
    },
    advanceChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 10,
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    advanceChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
    advanceChipText: { fontSize: 12, color: Colors.text.secondary },
    advanceChipTextActive: { color: Colors.primary, fontWeight: 'bold' },

    predictBtn: { height: 60, borderRadius: 18, marginTop: 10 },
    perksRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingBottom: 40 },
    perk: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    perkText: { fontSize: 11, fontWeight: '600', color: Colors.text.tertiary },

    // Loading Overlay (New Immersive Style)
    loadingOverlayFull: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary },
    loadingIconOuter: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    loadingIconInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
    loadingTitle: { fontSize: 24, fontWeight: '900', color: Colors.white, marginTop: 30, letterSpacing: 1 },
    loadingStepText: { fontSize: 14, fontWeight: '600', color: Colors.white, marginTop: 10, textAlign: 'center' },
    usageChip: {
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primary + '20'
    },
    usageText: {
        fontSize: 11,
        color: Colors.text.secondary,
        fontWeight: '600'
    },
    usageBold: {
        color: Colors.primary,
        fontWeight: '800'
    }
});

export default PredictorScreen;
