import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { cutoffAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Sparkles, ArrowRight } from 'lucide-react-native';

const PredictorScreen = () => {
    const { user } = useAuth();
    const [percentile, setPercentile] = useState(user?.percentile?.toString() || '');
    const [category, setCategory] = useState('OPEN');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handlePredict = async () => {
        if (!percentile) return;
        setLoading(true);
        try {
            const res = await cutoffAPI.predict({
                percentile,
                examType: user?.examType || 'MHTCET',
                category,
                round: 1
            });
            setResults(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const PredictionItem = ({ item }) => {
        const catData = item.cutoffData.find(c => c.category === category);
        return (
            <Card style={styles.resultCard}>
                <View style={styles.resultContent}>
                    <View style={styles.instInfo}>
                        <Text style={styles.instName}>{item.institutionId?.name}</Text>
                        <Text style={styles.branchName}>{item.branchName}</Text>
                    </View>
                    <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>{catData?.percentile}%</Text>
                        <Text style={styles.scoreLabel}>Cutoff</Text>
                    </View>
                </View>
                <View style={styles.chanceRow}>
                    <Sparkles size={14} color={Colors.success} />
                    <Text style={styles.chanceText}>High Chance of Admission</Text>
                </View>
            </Card>
        );
    };

    return (
        <MainLayout scrollable={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>College Predictor</Text>
                    <Text style={styles.subtitle}>Find your best fit based on {user?.examType} scores</Text>
                </View>

                <Card style={styles.formCard}>
                    <View style={styles.row}>
                        <Input
                            label="Your Percentile"
                            value={percentile}
                            onChangeText={setPercentile}
                            keyboardType="numeric"
                            containerStyle={{ flex: 1, marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.catPicker}>
                                <Text style={styles.catText}>OPEN</Text>
                            </View>
                        </View>
                    </View>
                    <Button
                        title="Predict My Colleges"
                        onPress={handlePredict}
                        loading={loading}
                        style={styles.predictBtn}
                    />
                </Card>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => <PredictionItem item={item} />}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            results.length === 0 && !loading ? (
                                <Text style={styles.emptyText}>Enter your score to see predictions</Text>
                            ) : null
                        }
                    />
                )}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: Spacing.lg },
    title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
    subtitle: { fontSize: 14, color: Colors.text.secondary, marginTop: 4 },
    formCard: { margin: Spacing.lg, padding: 20, marginTop: 0 },
    row: { flexDirection: 'row' },
    label: { fontSize: 14, fontWeight: '500', color: Colors.text.secondary, marginBottom: 6 },
    catPicker: { height: 50, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: Colors.background },
    catText: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    predictBtn: { marginTop: 8 },
    listContent: { padding: Spacing.lg, paddingTop: 0 },
    resultCard: { marginBottom: 16, padding: 16 },
    resultContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    instInfo: { flex: 1, marginRight: 12 },
    instName: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 2 },
    branchName: { fontSize: 12, color: Colors.text.tertiary },
    scoreBadge: { backgroundColor: Colors.primary + '10', padding: 8, borderRadius: 8, alignItems: 'center', minWidth: 60 },
    scoreText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
    scoreLabel: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
    chanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 12 },
    chanceText: { fontSize: 12, fontWeight: '600', color: Colors.success },
    emptyText: { textAlign: 'center', marginTop: 40, color: Colors.text.tertiary }
});

export default PredictorScreen;
