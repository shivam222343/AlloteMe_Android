import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { authAPI } from '../services/api';
import { TrendingUp, Users, Home, Activity } from 'lucide-react-native';

const SystemAnalyticsScreen = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await authAPI.getStats();
            setData(res.data);
        } catch (error) {
            console.error('Failed to fetch analytics', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <MainLayout title="System Analytics">
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </MainLayout>
        );
    }

    const regData = {
        labels: data?.analytics?.registrations.map(r => r._id.slice(5)) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            data: data?.analytics?.registrations.map(r => r.count) || [0, 0, 0, 0, 0, 0, 0]
        }]
    };

    const predictData = {
        labels: data?.analytics?.predictionHits.map(p => p.day) || ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        datasets: [{
            data: data?.analytics?.predictionHits.map(p => p.count) || [0, 0, 0, 0, 0, 0, 0]
        }]
    };

    return (
        <MainLayout title="Intelligence Dashboard">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statItem, { backgroundColor: '#eff6ff' }]}>
                        <Users size={20} color="#3b82f6" />
                        <Text style={styles.statValue}>{data?.users}</Text>
                        <Text style={styles.statLabel}>Total Students</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: '#f0fdf4' }]}>
                        <Home size={20} color="#10b981" />
                        <Text style={styles.statValue}>{data?.institutions}</Text>
                        <Text style={styles.statLabel}>Institutions</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: '#fef2f2' }]}>
                        <Activity size={20} color="#ef4444" />
                        <Text style={styles.statValue}>{data?.analytics?.activeSessions}</Text>
                        <Text style={styles.statLabel}>Active Now</Text>
                    </View>
                </View>

                {/* Registration Chart */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <TrendingUp size={18} color={Colors.primary} />
                        <Text style={styles.chartTitle}>New Registrations (7 Days)</Text>
                    </View>
                    <LineChart
                        data={regData}
                        width={Dimensions.get('window').width - 72}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                    />
                </View>

                {/* Prediction Chart */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <Activity size={18} color="#8b5cf6" />
                        <Text style={styles.chartTitle}>Predictor Activity</Text>
                    </View>
                    <BarChart
                        data={predictData}
                        width={Dimensions.get('window').width - 72}
                        height={220}
                        chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})` }}
                        style={styles.chart}
                        verticalLabelRotation={0}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </MainLayout>
    );
};

const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: Colors.primary }
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statItem: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center', ...Shadows.xs },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
    statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
    chartCard: { backgroundColor: 'white', padding: 16, borderRadius: 24, marginBottom: 20, ...Shadows.md },
    chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    chartTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    chart: { marginVertical: 8, borderRadius: 16 }
});

export default SystemAnalyticsScreen;
