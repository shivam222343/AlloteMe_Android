import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing } from '../constants/theme';

const StudentDashboard = ({ navigation }) => {
    const { user, logout } = useAuth();

    return (
        <MainLayout style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Hello, {user?.displayName} 👋</Text>
                <Text style={styles.examBadge}>{user?.examType} Aspirant</Text>
            </View>

            <View style={styles.stats}>
                <View style={styles.statCard}>
                    <Text style={styles.statVal}>{user?.percentile}%</Text>
                    <Text style={styles.statLabel}>Percentile</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statVal}>{user?.rank || 'N/A'}</Text>
                    <Text style={styles.statLabel}>Rank</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Quick Options</Text>
            <View style={styles.grid}>
                <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('BrowseColleges')}>
                    <Text>Browse Colleges</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('Predictor')}>
                    <Text>Predictor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('AICounselor')}>
                    <Text>AI Counselor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionCard}>
                    <Text>Nearby</Text>
                </TouchableOpacity>
            </View>

            <Button title="Logout" variant="outline" onPress={logout} style={{ marginTop: 40 }} />
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { padding: Spacing.lg },
    header: { marginBottom: 24 },
    welcome: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
    examBadge: { fontSize: 12, color: Colors.primary, fontWeight: Typography.fontWeight.semibold, marginTop: 4 },
    stats: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    statCard: { flex: 1, backgroundColor: Colors.white, padding: 16, borderRadius: 12, borderWeight: 1, borderColor: Colors.divider, alignItems: 'center' },
    statVal: { fontSize: 18, fontWeight: Typography.fontWeight.bold, color: Colors.primary },
    statLabel: { fontSize: 12, color: Colors.text.tertiary, marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: Typography.fontWeight.bold, marginBottom: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    optionCard: { width: '48%', height: 100, backgroundColor: Colors.white, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.divider },
});

export default StudentDashboard;
