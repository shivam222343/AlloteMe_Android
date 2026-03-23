import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { institutionAPI, cutoffAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Globe, Map, Phone, Star, Info } from 'lucide-react-native';

const CollegeDetailScreen = ({ route }) => {
    const { id } = route.params;
    const [inst, setInst] = useState(null);
    const [cutoffs, setCutoffs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [instRes, cutoffRes] = await Promise.all([
                institutionAPI.getById(id),
                cutoffAPI.getByInstitution(id)
            ]);
            setInst(instRes.data);
            setCutoffs(cutoffRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;

    return (
        <MainLayout>
            <View style={styles.imageHeader}>
                <View style={styles.headerOverlay}>
                    <Text style={styles.name}>{inst.name}</Text>
                    <Text style={styles.typeTag}>{inst.type}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(inst.website)}>
                        <Globe size={20} color={Colors.primary} />
                        <Text style={styles.actionText}>Website</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Map size={20} color={Colors.primary} />
                        <Text style={styles.actionText}>Map</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.desc}>{inst.description || "No description provided."}</Text>

                <View style={styles.infoGrid}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>University</Text>
                        <Text style={styles.infoVal}>{inst.university}</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Fees / Year</Text>
                        <Text style={styles.infoVal}>₹{inst.feesPerYear}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Cutoffs (Recent)</Text>
                {cutoffs.map((c, i) => (
                    <Card key={i} style={styles.cutoffCard}>
                        <View style={styles.cutoffHeader}>
                            <Text style={styles.branchName}>{c.branchName}</Text>
                            <Text style={styles.roundTag}>Round {c.round}</Text>
                        </View>
                        <View style={styles.cutoffGrid}>
                            {c.cutoffData.slice(0, 4).map((cd, j) => (
                                <View key={j} style={styles.cutoffRow}>
                                    <Text style={styles.catName}>{cd.category}</Text>
                                    <Text style={styles.catPercent}>{cd.percentile}%</Text>
                                </View>
                            ))}
                        </View>
                    </Card>
                ))}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    imageHeader: { height: 200, backgroundColor: Colors.primary + '20', justifyContent: 'flex-end' },
    headerOverlay: { padding: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
    name: { fontSize: Typography.fontSize.xl, fontWeight: 'bold', color: Colors.white },
    typeTag: { fontSize: 12, color: Colors.white, opacity: 0.8, marginTop: 4 },
    content: { padding: 20, marginTop: -20, backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionBtn: { flex: 1, backgroundColor: Colors.white, padding: 12, borderRadius: 12, alignItems: 'center', gap: 6, ...Shadows.sm },
    actionText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 24 },
    desc: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22 },
    infoGrid: { flexDirection: 'row', gap: 12, marginTop: 20 },
    infoBox: { flex: 1, backgroundColor: Colors.white, padding: 12, borderRadius: 12, borderWeight: 1, borderColor: Colors.divider },
    infoLabel: { fontSize: 10, color: Colors.text.tertiary, marginBottom: 4 },
    infoVal: { fontSize: 14, fontWeight: 'bold' },
    cutoffCard: { marginBottom: 12, padding: 16 },
    cutoffHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    branchName: { fontWeight: 'bold', fontSize: 14 },
    roundTag: { fontSize: 10, color: Colors.primary, fontWeight: 'bold' },
    cutoffGrid: { gap: 8 },
    cutoffRow: { flexDirection: 'row', justifyContent: 'space-between' },
    catName: { fontSize: 12, color: Colors.text.secondary },
    catPercent: { fontSize: 12, fontWeight: 'bold' }
});

export default CollegeDetailScreen;
