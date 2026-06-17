import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Modal, TouchableOpacity } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, cutoffAPI } from '../services/api';
import { MapPin, Target, Award, Hash, Bot, AlertCircle } from 'lucide-react-native';

const EXAM_OPTIONS = ['MHTCET PCM', 'MHTCET PCB', 'BBA', 'NEET', 'JEE'];

const MAHARASHTRA_REGIONS = [
    'Pune', 'Mumbai', 'Kolhapur', 'Nagpur', 'Nanded',
    'Solapur', 'Nashik', 'Jalgaon', 'Akola', 'Amravati',
    'Thane', 'Aurangabad', 'Sangli', 'Satara', 'Latur',
    'Ahmednagar', 'Chandrapur', 'Yavatmal', 'Buldhana',
    'Beed', 'Bhandara', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli',
    'Jalna', 'Nandurbar', 'Osmanabad', 'Palghar', 'Parbhani',
    'Raigad', 'Ratnagiri', 'Sindhudurg', 'Wardha', 'Washim'
];

const CompleteProfileScreen = ({ navigation, route }) => {
    const { user, refreshUser, setHasSkippedProfile, setValidateProfileForm } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isSubmittingSuccess, setIsSubmittingSuccess] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);

    const handleBackgroundPress = () => {
        const cleanPhone = (formData.phoneNumber || '').trim();
        const phoneRegex = /^[6-9]\d{9}$/;
        const hasEmpty = !formData.percentile.trim() ||
            !formData.rank.trim() ||
            !formData.location.trim() ||
            !cleanPhone ||
            !phoneRegex.test(cleanPhone) ||
            !formData.expectedRegion.trim();

        if (hasEmpty) {
            const phoneError = !cleanPhone ? 'please enter this' : (!phoneRegex.test(cleanPhone) ? 'Enter a valid 10-digit WhatsApp number' : '');
            setErrors({
                percentile: !formData.percentile.trim() ? 'please enter this' : '',
                rank: !formData.rank.trim() ? 'please enter this' : '',
                location: !formData.location.trim() ? 'please enter this' : '',
                phoneNumber: phoneError,
                expectedRegion: !formData.expectedRegion.trim() ? 'please enter this' : ''
            });
            setShowWarningModal(true);
        }
    };

    const initialExam = route.params?.admissionPath || user?.examType || 'MHTCET PCM';
    const userScores = user?.scores || {};
    const initialScore = userScores[initialExam] || {};

    const [formData, setFormData] = useState({
        percentile: initialScore.percentile?.toString() || (initialExam === user?.examType ? user?.percentile?.toString() : '') || '',
        rank: initialScore.rank?.toString() || (initialExam === user?.examType ? user?.rank?.toString() : '') || '',
        location: user?.location || '',
        expectedRegion: user?.expectedRegion || '',
        examType: initialExam,
        phoneNumber: user?.phoneNumber || ''
    });

    const [errors, setErrors] = useState({
        percentile: '',
        rank: '',
        location: '',
        phoneNumber: '',
        expectedRegion: ''
    });

    const handleToggleRegion = (region) => {
        let current = formData.expectedRegion ? formData.expectedRegion.split(',').map(r => r.trim()).filter(Boolean) : [];
        const regionLower = region.toLowerCase();
        const exists = current.some(r => r.toLowerCase() === regionLower);

        if (exists) {
            current = current.filter(r => r.toLowerCase() !== regionLower);
        } else {
            current = [...current, region];
        }

        const newValue = current.join(', ');
        setFormData(prev => ({ ...prev, expectedRegion: newValue }));
        if (errors.expectedRegion) setErrors(prev => ({ ...prev, expectedRegion: '' }));
    };

    React.useEffect(() => {
        // Disable drawer swiping when on this screen
        const parent = navigation.getParent();
        if (parent) {
            parent.setOptions({ swipeEnabled: false });
        }
        return () => {
            if (parent) {
                parent.setOptions({ swipeEnabled: true });
            }
        };
    }, [navigation]);

    React.useEffect(() => {
        setValidateProfileForm(() => (showPopup = false) => {
            const cleanPhone = (formData.phoneNumber || '').trim();
            const phoneRegex = /^[6-9]\d{9}$/;
            let phoneError = '';
            if (!cleanPhone) {
                phoneError = 'please enter this';
            } else if (!phoneRegex.test(cleanPhone)) {
                phoneError = 'Enter a valid 10-digit WhatsApp number';
            }

            const newErrors = {
                percentile: !formData.percentile || !formData.percentile.trim() ? 'please enter this' : '',
                rank: !formData.rank || !formData.rank.trim() ? 'please enter this' : '',
                location: !formData.location || !formData.location.trim() ? 'please enter this' : '',
                phoneNumber: phoneError,
                expectedRegion: !formData.expectedRegion || !formData.expectedRegion.trim() ? 'please enter this' : ''
            };

            setErrors(newErrors);

            const isValid = !Object.values(newErrors).some(err => err !== '');
            if (!isValid && showPopup) {
                setShowWarningModal(true);
            }
            return isValid;
        });

        return () => {
            setValidateProfileForm(null);
        };
    }, [formData, setValidateProfileForm]);

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (isSubmittingSuccess) {
                return;
            }

            e.preventDefault();

            // Run validation to show errors in red
            const cleanPhone = (formData.phoneNumber || '').trim();
            const phoneRegex = /^[6-9]\d{9}$/;
            let phoneError = '';
            if (!cleanPhone) {
                phoneError = 'please enter this';
            } else if (!phoneRegex.test(cleanPhone)) {
                phoneError = 'Enter a valid 10-digit WhatsApp number';
            }

            const newErrors = {
                percentile: !formData.percentile || !formData.percentile.trim() ? 'please enter this' : '',
                rank: !formData.rank || !formData.rank.trim() ? 'please enter this' : '',
                location: !formData.location || !formData.location.trim() ? 'please enter this' : '',
                phoneNumber: phoneError,
                expectedRegion: !formData.expectedRegion || !formData.expectedRegion.trim() ? 'please enter this' : ''
            };
            setErrors(newErrors);

            Alert.alert(
                'Profile Incomplete',
                'Please fill in all fields with valid information and tap "Finish & Save" to complete your profile before leaving.',
                [{ text: 'OK', style: 'cancel' }]
            );
        });

        return unsubscribe;
    }, [navigation, formData, isSubmittingSuccess]);

    const handleExamChange = (type) => {
        const score = userScores[type] || {};
        setFormData(prev => ({
            ...prev,
            examType: type,
            percentile: score.percentile?.toString() || '',
            rank: score.rank?.toString() || ''
        }));
        setErrors({
            percentile: '',
            rank: '',
            location: '',
            phoneNumber: '',
            expectedRegion: ''
        });
    };

    // Auto-calculate Rank based on Percentile (similar to Predictor)
    const [rankLoading, setRankLoading] = useState(false);

    React.useEffect(() => {
        if (!formData.percentile || isNaN(parseFloat(formData.percentile)) || formData.percentile === user?.percentile?.toString()) {
            return;
        }

        const timeout = setTimeout(async () => {
            setRankLoading(true);
            try {
                const res = await cutoffAPI.estimateRank(formData.percentile);
                if (res.data?.rank) {
                    setFormData(prev => ({ ...prev, rank: res.data.rank.toString() }));
                    if (errors.rank) setErrors(prev => ({ ...prev, rank: '' }));
                }
            } catch (error) {
                console.log('Rank estimation failed', error);
            } finally {
                setRankLoading(false);
            }
        }, 800); // 800ms debounce

        return () => clearTimeout(timeout);
    }, [formData.percentile]);

    const handleSubmit = async () => {
        const cleanPhone = (formData.phoneNumber || '').trim();
        const phoneRegex = /^[6-9]\d{9}$/;
        let phoneError = '';
        if (!cleanPhone) {
            phoneError = 'please enter this';
        } else if (!phoneRegex.test(cleanPhone)) {
            phoneError = 'Enter a valid 10-digit WhatsApp number';
        }

        const newErrors = {
            percentile: !formData.percentile || !formData.percentile.trim() ? 'please enter this' : '',
            rank: !formData.rank || !formData.rank.trim() ? 'please enter this' : '',
            location: !formData.location || !formData.location.trim() ? 'please enter this' : '',
            phoneNumber: phoneError,
            expectedRegion: !formData.expectedRegion || !formData.expectedRegion.trim() ? 'please enter this' : ''
        };

        setErrors(newErrors);

        // Block if any field is empty
        if (Object.values(newErrors).some(err => err !== '')) {
            return;
        }

        setLoading(true);
        try {
            const updateData = {
                examType: formData.examType,
                scores: {
                    [formData.examType]: {
                        percentile: parseFloat(formData.percentile) || 0,
                        rank: parseInt(formData.rank) || 0
                    }
                },
                percentile: formData.percentile,
                rank: formData.rank,
                location: formData.location,
                expectedRegion: formData.expectedRegion,
                phoneNumber: formData.phoneNumber,
                preferences: {
                    ...(user?.preferences || {}),
                    isProfileComplete: true
                }
            };

            const res = await authAPI.updateProfile(updateData);
            if (res.status === 200 || res.data) {
                await refreshUser();
                setHasSkippedProfile(false);
                setIsSubmittingSuccess(true);
                navigation.navigate('Dashboard');
                Alert.alert('Success', 'Profile updated! Welcome to AlloteMe.');
            } else {
                Alert.alert('Error', 'Failed to update profile');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'An unexpected error occurred. Please try again.';
            Alert.alert('Submission Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout title="Complete Profile" showHeader={true}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Award size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Update Your Scores</Text>
                        <Text style={styles.subtitle}>Add or edit your results for different entrance exams.</Text>
                    </View>

                    {/* Exam Type Selector */}
                    <View style={styles.examSelector}>
                        {EXAM_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.examPill, formData.examType === opt && styles.activeExamPill]}
                                onPress={() => handleExamChange(opt)}
                            >
                                <Text style={[styles.examPillText, formData.examType === opt && styles.activeExamPillText]}>
                                    {opt}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Card style={styles.formCard}>
                        <Input
                            label="Entrance Exam Percentile"
                            value={formData.percentile}
                            onChangeText={(t) => {
                                setFormData({ ...formData, percentile: t });
                                if (errors.percentile) setErrors(prev => ({ ...prev, percentile: '' }));
                            }}
                            error={errors.percentile}
                            placeholder="e.g. 98.45"
                            keyboardType="decimal-pad"
                            leftIcon={<Hash size={18} color={Colors.text.tertiary} />}
                        />

                        <View style={{ position: 'relative' }}>
                            <Input
                                label="All India / State Rank"
                                value={formData.rank}
                                onChangeText={(t) => {
                                    setFormData({ ...formData, rank: t });
                                    if (errors.rank) setErrors(prev => ({ ...prev, rank: '' }));
                                }}
                                error={errors.rank}
                                placeholder={rankLoading ? "Calculating..." : "e.g. 1240"}
                                keyboardType="number-pad"
                                leftIcon={<Target size={18} color={Colors.text.tertiary} />}
                            />
                            {rankLoading && (
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.primary}
                                    style={{ position: 'absolute', right: 12, top: 40 }}
                                />
                            )}
                        </View>

                        <Input
                            label="Your Current City"
                            value={formData.location}
                            onChangeText={(t) => {
                                setFormData({ ...formData, location: t });
                                if (errors.location) setErrors(prev => ({ ...prev, location: '' }));
                            }}
                            error={errors.location}
                            placeholder="e.g. Mumbai"
                            leftIcon={<MapPin size={18} color={Colors.text.tertiary} />}
                        />

                        <Input
                            label="WhatsApp Phone Number"
                            value={formData.phoneNumber}
                            onChangeText={(t) => {
                                setFormData({ ...formData, phoneNumber: t });
                                if (errors.phoneNumber) setErrors(prev => ({ ...prev, phoneNumber: '' }));
                            }}
                            error={errors.phoneNumber}
                            placeholder="e.g. 8010XXXXXX"
                            keyboardType="phone-pad"
                            maxLength={10}
                        />

                        <Input
                            label="Expected College Region"
                            value={formData.expectedRegion}
                            onChangeText={(t) => {
                                setFormData({ ...formData, expectedRegion: t });
                                if (errors.expectedRegion) setErrors(prev => ({ ...prev, expectedRegion: '' }));
                            }}
                            error={errors.expectedRegion}
                            placeholder="e.g. Pune, Mumbai, National"
                        />

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.regionScrollView}
                            contentContainerStyle={styles.regionScrollContent}
                        >
                            {MAHARASHTRA_REGIONS.map((region) => {
                                const selected = formData.expectedRegion.split(',').map(r => r.trim().toLowerCase()).includes(region.toLowerCase());
                                return (
                                    <TouchableOpacity
                                        key={region}
                                        style={[styles.regionTag, selected && styles.activeRegionTag]}
                                        onPress={() => handleToggleRegion(region)}
                                    >
                                        <Text style={[styles.regionTagText, selected && styles.activeRegionTagText]}>
                                            {region}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Card>

                    <View style={styles.footerBtns}>
                        <Button
                            title="Finish & Save"
                            onPress={handleSubmit}
                            loading={loading}
                        />
                    </View>

                    <Text style={styles.disclaimer}>
                        Providing this info unlocks personalized college predictions and AI counseling insights.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Custom Background Click Warning Modal */}
            <Modal
                visible={showWarningModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowWarningModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.popupContent}>
                        <View style={styles.warningIconCircle}>
                            <AlertCircle size={28} color={Colors.error} />
                        </View>
                        <Text style={styles.popupTitle}>Profile Verification Required</Text>
                        <Text style={styles.popupSub}>
                            Please fill in all details (Percentile, Rank, City, Phone, and Region) with valid information. This helps us provide accurate college recommendations! 🎓
                        </Text>
                        <TouchableOpacity
                            style={styles.primaryAction}
                            onPress={() => setShowWarningModal(false)}
                        >
                            <Text style={styles.primaryActionText}>Okay, I will fill it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 40 },
    header: { alignItems: 'center', marginTop: 30, marginBottom: 30 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary },
    subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    formCard: { padding: 16, marginBottom: 24, ...Shadows.sm },
    footerBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
    disclaimer: { textAlign: 'center', marginTop: 24, color: Colors.text.tertiary, fontSize: 12, paddingHorizontal: 20, lineHeight: 18 },
    examSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 24, justifyContent: 'center' },
    examPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.divider },
    activeExamPill: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    examPillText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },
    activeExamPillText: { color: Colors.white },
    regionScrollView: { marginTop: 8, marginBottom: 12 },
    regionScrollContent: { paddingHorizontal: 4, paddingVertical: 4 },
    regionTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    activeRegionTag: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    regionTagText: { fontSize: 13, color: '#475569', fontWeight: '500' },
    activeRegionTagText: { color: Colors.white, fontWeight: 'bold' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    popupContent: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
        width: '85%',
        alignItems: 'center',
        ...Shadows.lg,
    },
    warningIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    popupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    popupSub: {
        fontSize: 13,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    primaryAction: {
        backgroundColor: Colors.primary,
        alignSelf: 'stretch',
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    primaryActionText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: 'bold',
        paddingLeft: 25,
        paddingRight: 25,
    }
});

export default CompleteProfileScreen;
