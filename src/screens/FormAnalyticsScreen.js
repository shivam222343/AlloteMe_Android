import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    PieChart,
    BarChart,
    LineChart,
    ContributionChart,
    StackedBarChart,
    ProgressChart
} from 'react-native-chart-kit';
import * as Animatable from 'react-native-animatable';
import MainLayout from '../components/MainLayout';
import { customFormsAPI } from '../services/api';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

const FormAnalyticsScreen = ({ route, navigation }) => {
    const { formId, formTitle } = route.params;
    const [analytics, setAnalytics] = useState([]);
    const [trends, setTrends] = useState(null);
    const [heatmap, setHeatmap] = useState([]);
    const [hourlyData, setHourlyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalResponses, setTotalResponses] = useState(0);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await customFormsAPI.getAnalytics(formId);
            if (res.success) {
                setAnalytics(res.data);
                setTotalResponses(res.totalResponses);

                // Process Trend Data
                if (res.trends) {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const trendLabels = Object.keys(res.trends).map(d => {
                        const date = new Date(d);
                        return days[date.getDay()];
                    });
                    const trendData = Object.values(res.trends);
                    setTrends({ labels: trendLabels, datasets: [{ data: trendData }] });
                }

                // Process Heatmap Data
                if (res.heatmap) {
                    const heatData = Object.entries(res.heatmap).map(([date, count]) => ({
                        date,
                        count
                    }));
                    setHeatmap(heatData);
                }

                // Process Hourly Data
                if (res.hourlyStats) {
                    setHourlyData({
                        labels: ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm"],
                        datasets: [{
                            data: [
                                res.hourlyStats[0], res.hourlyStats[3], res.hourlyStats[6],
                                res.hourlyStats[9], res.hourlyStats[12], res.hourlyStats[15],
                                res.hourlyStats[18], res.hourlyStats[21]
                            ]
                        }]
                    });
                }
            }
        } catch (error) {
            console.error('Fetch analytics error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAnalytics();
    };

    const chartConfig = {
        backgroundGradientFrom: "#ffffff",
        backgroundGradientTo: "#ffffff",
        color: (opacity = 1) => `rgba(10, 102, 194, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.6,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
        propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#0A66C2"
        },
        fillShadowGradientOpacity: 0.2,
    };

    const renderChart = (q, idx) => {
        const labels = Object.keys(q.stats);
        const data = Object.values(q.stats);

        if (labels.length === 0) return (
            <Text style={styles.noDataText}>No responses yet for this question</Text>
        );

        // Define different chart types based on question type and number of options

        // 1. Progress Chart for 2-3 options (Binary/Simple Choice)
        if (labels.length >= 2 && labels.length <= 3 && q.type !== 'checkbox') {
            const progressData = {
                labels: labels,
                data: data.map(v => v / Math.max(totalResponses, 1))
            };
            return (
                <View style={styles.chartWrapper}>
                    <ProgressChart
                        data={progressData}
                        width={width - 72}
                        height={160}
                        strokeWidth={12}
                        radius={32}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1, index) => {
                                const colors = ['#0A66C2', '#10b981', '#f59e0b'];
                                return index !== undefined ? colors[index % 3] : `rgba(10, 102, 194, ${opacity})`;
                            }
                        }}
                        hideLegend={false}
                    />
                </View>
            );
        }

        // 2. Stacked Bar Chart for Checkboxes (Multiple Selections)
        if (q.type === 'checkbox' && labels.length > 0) {
            return (
                <View style={styles.chartWrapper}>
                    <BarChart
                        data={{
                            labels: labels.map(l => l.length > 8 ? l.substring(0, 8) + '..' : l),
                            datasets: [{ data }]
                        }}
                        width={width - 72}
                        height={220}
                        chartConfig={chartConfig}
                        verticalLabelRotation={30}
                        fromZero
                        showValuesOnTopOfBars
                    />
                </View>
            );
        }

        // 3. Pie Chart for standard small set
        if (labels.length <= 6) {
            const pieData = labels.map((label, index) => ({
                name: label.length > 12 ? label.substring(0, 10) + '..' : label,
                population: q.stats[label],
                color: ['#0A66C2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7],
                legendFontColor: "#4B5563",
                legendFontSize: 11
            }));

            return (
                <View style={styles.chartWrapper}>
                    <PieChart
                        data={pieData}
                        width={width - 72}
                        height={200}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                    />
                </View>
            );
        }

        // 4. Large Bar Chart for many options
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                    data={{
                        labels: labels.map(l => l.length > 8 ? l.substring(0, 8) + '..' : l),
                        datasets: [{ data }]
                    }}
                    width={Math.max(width - 72, labels.length * 60)}
                    height={240}
                    chartConfig={chartConfig}
                    verticalLabelRotation={30}
                    fromZero
                    showValuesOnTopOfBars
                />
            </ScrollView>
        );
    };

    const renderNumberStats = (q) => (
        <Animatable.View animation="fadeInUp" delay={200} style={styles.numberStatsRow}>
            <View style={styles.statBox}>
                <Text style={styles.statVal}>{q.stats.average.toFixed(1)}</Text>
                <Text style={styles.statLab}>Average</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statVal}>{q.stats.min}</Text>
                <Text style={styles.statLab}>Min</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statVal}>{q.stats.max}</Text>
                <Text style={styles.statLab}>Max</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statVal}>{q.stats.total}</Text>
                <Text style={styles.statLab}>Responses</Text>
            </View>
        </Animatable.View>
    );

    return (
        <MainLayout navigation={navigation} title="Form Analytics" backButton>
            <View style={styles.container}>
                <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
                    <Text style={styles.formTitle}>{formTitle}</Text>
                    <View style={styles.headerRow}>
                        <View style={styles.responseCount}>
                            <Ionicons name="people" size={16} color="#64748B" />
                            <Text style={styles.responseCountText}>{totalResponses} total responses</Text>
                        </View>
                        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                            <Ionicons name="refresh" size={18} color="#0A66C2" />
                        </TouchableOpacity>
                    </View>
                </Animatable.View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0A66C2" />
                        <Text style={styles.loadingText}>Analyzing Data...</Text>
                    </View>
                ) : (
                    <ScrollView
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* 1. Global Participation Summary */}
                        <Animatable.View animation="fadeInDown" delay={100} style={styles.card}>
                            <Text style={styles.cardTitle}>Submission Progress</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
                                <ProgressChart
                                    data={{
                                        labels: ["Goal"],
                                        data: [Math.min(totalResponses / 100, 1)] // Assuming a goal of 100
                                    }}
                                    width={width / 2.5}
                                    height={120}
                                    strokeWidth={10}
                                    radius={32}
                                    chartConfig={{
                                        ...chartConfig,
                                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                                    }}
                                    hideLegend={true}
                                />
                                <View>
                                    <Text style={styles.summaryVal}>{totalResponses}</Text>
                                    <Text style={styles.summaryLabel}>Total Submissions</Text>
                                    <View style={styles.trendRow}>
                                        <Ionicons name="trending-up" size={16} color="#10b981" />
                                        <Text style={styles.trendText}>+12.5% this week</Text>
                                    </View>
                                </View>
                            </View>
                        </Animatable.View>

                        {/* 2. Response Trend Chart */}
                        {trends && (
                            <Animatable.View animation="zoomIn" duration={800} style={styles.card}>
                                <Text style={styles.cardTitle}>Response Trend (Last 7 Days)</Text>
                                <LineChart
                                    data={trends}
                                    width={width - 72}
                                    height={200}
                                    chartConfig={{
                                        ...chartConfig,
                                        backgroundGradientFrom: "#ffffff",
                                        backgroundGradientTo: "#ffffff",
                                        fillShadowGradient: "#0A66C2",
                                        fillShadowGradientOpacity: 0.3,
                                        propsForLabels: {
                                            fontSize: 10,
                                            fontWeight: '600'
                                        }
                                    }}
                                    bezier
                                    style={styles.lineChart}
                                    withVerticalLines={false}
                                    withHorizontalLines={true}
                                    fromZero={true}
                                />
                            </Animatable.View>
                        )}

                        {/* 6. Heatmap Chart (New!) */}
                        {heatmap.length > 0 && (
                            <Animatable.View animation="zoomIn" delay={100} style={styles.card}>
                                <Text style={styles.cardTitle}>Submission Heatmap</Text>
                                <ContributionChart
                                    values={heatmap}
                                    endDate={new Date()}
                                    numDays={75}
                                    width={width - 72}
                                    height={180}
                                    chartConfig={chartConfig}
                                    accessor="count"
                                />
                            </Animatable.View>
                        )}

                        {/* Time of Day Distribution */}
                        {hourlyData && (
                            <Animatable.View animation="zoomIn" delay={200} style={styles.card}>
                                <Text style={styles.cardTitle}>Time of Day Distribution</Text>
                                <BarChart
                                    data={hourlyData}
                                    width={width - 72}
                                    height={180}
                                    chartConfig={{
                                        ...chartConfig,
                                        backgroundGradientFrom: "#f8fafc",
                                        backgroundGradientTo: "#ffffff",
                                        decimalPlaces: 0,
                                    }}
                                    fromZero
                                    style={styles.lineChart}
                                />
                            </Animatable.View>
                        )}

                        {analytics.length === 0 && !loading ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="bar-chart-outline" size={64} color="#CBD5E1" />
                                <Text style={styles.emptyText}>No visualization data available yet</Text>
                            </View>
                        ) : (
                            analytics.map((q, idx) => (
                                <Animatable.View
                                    key={q.id}
                                    animation="fadeInUp"
                                    delay={idx * 150}
                                    style={styles.card}
                                >
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.qLabel}>{idx + 1}. {q.label}</Text>
                                        <View style={styles.typeBadge}>
                                            <Text style={styles.typeText}>{q.type.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    {q.type === 'number' ? renderNumberStats(q) : renderChart(q, idx)}
                                </Animatable.View>
                            ))
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    header: {
        padding: 20,
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        zIndex: 10
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    formTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    responseCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    responseCountText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 16, paddingTop: 20 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    qLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1F2937', lineHeight: 22 },
    typeBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 10 },
    typeText: { fontSize: 10, color: '#6B7280', fontWeight: 'bold' },
    chartWrapper: { alignItems: 'center', marginTop: 10 },
    lineChart: { marginVertical: 8, borderRadius: 16 },
    numberStatsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
    statBox: { width: '47%', backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, alignItems: 'center', borderWeight: 1, borderColor: '#F1F5F9' },
    statVal: { fontSize: 24, fontWeight: '800', color: '#0A66C2' },
    statLab: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#64748B', fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#94A3B8', textAlign: 'center', fontWeight: '500' },
    noDataText: { textAlign: 'center', color: '#94A3B8', marginVertical: 20, fontStyle: 'italic' },
    summaryVal: { fontSize: 32, fontWeight: '800', color: '#1F2937' },
    summaryLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    trendText: { fontSize: 12, color: '#10b981', fontWeight: '600' }
});

export default FormAnalyticsScreen;
