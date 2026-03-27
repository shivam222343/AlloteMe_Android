import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, cutoffAPI } from '../services/api';
import { MapPin, Target, Award, Hash, Bot } from 'lucide-react-native';

const CompleteProfileScreen = ({ navigation }) => {
    const { user, refreshUser, setHasSkippedProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        percentile: user?.percentile?.toString() || '',
        rank: user?.rank?.toString() || '',
        location: user?.location || '',
        expectedRegion: user?.expectedRegion || '',
        examType: user?.examType || 'MHTCET',
        groqApiKey: user?.groqApiKey || '',
        phoneNumber: user?.phoneNumber || ''
    });

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
        // No fields are mandatory anymore per user request
        setLoading(true);
        try {
            const updateData = {
                examType: formData.examType,
                percentile: formData.percentile,
                rank: formData.rank,
                location: formData.location,
                expectedRegion: formData.expectedRegion,
                groqApiKey: formData.groqApiKey,
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
                Alert.alert('Success', 'Profile updated! Welcome to AlloteMe.');
                navigation.navigate('Dashboard');
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

    const handleSkip = () => {
        setHasSkippedProfile(true);
        navigation.navigate('Dashboard');
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
                        <Text style={styles.title}>Final Step!</Text>
                        <Text style={styles.subtitle}>Help us personalize your college recommendations.</Text>
                    </View>

                    <Card style={styles.formCard}>
                        <Input
                            label="Entrance Exam Percentile"
                            value={formData.percentile}
                            onChangeText={(t) => setFormData({ ...formData, percentile: t })}
                            placeholder="e.g. 98.45"
                            keyboardType="decimal-pad"
                            leftIcon={<Hash size={18} color={Colors.text.tertiary} />}
                        />

                        <View style={{ position: 'relative' }}>
                            <Input
                                label="All India / State Rank"
                                value={formData.rank}
                                onChangeText={(t) => setFormData({ ...formData, rank: t })}
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
                            onChangeText={(t) => setFormData({ ...formData, location: t })}
                            placeholder="e.g. Mumbai"
                            leftIcon={<MapPin size={18} color={Colors.text.tertiary} />}
                        />

                        <Input
                            label="WhatsApp Phone Number"
                            value={formData.phoneNumber}
                            onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
                            placeholder="e.g. 8010XXXXXX"
                            keyboardType="phone-pad"
                            maxLength={10}
                        />

                        <Input
                            label="Expected College Region"
                            value={formData.expectedRegion}
                            onChangeText={(t) => setFormData({ ...formData, expectedRegion: t })}
                            placeholder="e.g. Pune, Mumbai, National"
                        />

                        <Input
                            label="Personal Groq API Key (Optional)"
                            value={formData.groqApiKey}
                            onChangeText={(t) => setFormData({ ...formData, groqApiKey: t })}
                            placeholder="gsk_..."
                            secureTextEntry={true}
                            leftIcon={<Bot size={18} color={Colors.text.tertiary} />}
                        />
                    </Card>

                    <View style={styles.footerBtns}>
                        <Button
                            title="Finish & Save"
                            onPress={handleSubmit}
                            loading={loading}
                            style={{ flex: 2 }}
                        />
                        <Button
                            title="Skip"
                            variant="ghost"
                            onPress={handleSkip}
                            style={{ flex: 1 }}
                        />
                    </View>

                    <Text style={styles.disclaimer}>
                        Providing this info unlocks personalized college predictions and AI counseling insights.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
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
    disclaimer: { textAlign: 'center', marginTop: 24, color: Colors.text.tertiary, fontSize: 12, paddingHorizontal: 20, lineHeight: 18 }
});

export default CompleteProfileScreen;
