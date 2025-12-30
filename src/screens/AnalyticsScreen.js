import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import MainLayout from '../components/MainLayout';
import { SkeletonBox, SkeletonCard } from '../components/SkeletonLoader';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await analyticsAPI.getPersonal();
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error('Analytics Fetch Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Generate dynamic AI recommendations based on user data
    const generateRecommendation = (analyticsData) => {
        if (!analyticsData || !analyticsData.summary) {
            return "Welcome to Mavericks! Start attending meetings and completing tasks to see personalized insights here.";
        }

        const { summary, monthlyActivity, attendanceHistory } = analyticsData;
        const { attendanceRate, taskCompletionRate, totalTasks, completedTasks } = summary;

        // Categorize possible insights
        const potentialInsights = [];

        // 1. Attendance Insights
        if (attendanceRate < 50) {
            potentialInsights.push({
                priority: 'high',
                text: `Your attendance is currently ${attendanceRate}%. Consistent participation is key to growth. Try to join the next few meetings! 📅`
            });
        } else if (attendanceRate >= 90) {
            potentialInsights.push({
                priority: 'low',
                text: `Stellar attendance record (${attendanceRate}%)! Your reliability sets a great example for the entire team. ⭐`
            });
        } else {
            potentialInsights.push({
                priority: 'medium',
                text: `You're attending ${attendanceRate}% of meetings. Aim for 90% to maximize your learning and team contribution! 🚀`
            });
        }

        // 2. Task Completion Insights
        const pendingTasks = totalTasks - completedTasks;
        if (taskCompletionRate < 50 && pendingTasks > 0) {
            potentialInsights.push({
                priority: 'high',
                text: `You have ${pendingTasks} pending tasks. knocking out a couple today will significantly boost your ${taskCompletionRate}% completion rate! 💪`
            });
        } else if (taskCompletionRate >= 95 && totalTasks > 5) {
            potentialInsights.push({
                priority: 'low',
                text: `Incredible productivity! You've completed nearly all your tasks. Ready for a new challenge? 🏆`
            });
        } else if (pendingTasks > 0) {
            potentialInsights.push({
                priority: 'medium',
                text: `Progress update: ${completedTasks}/${totalTasks} tasks done. Keep that momentum going to cross the finish line! 🏁`
            });
        }

        // 3. Trend Analysis
        if (monthlyActivity && monthlyActivity.length >= 2) {
            const currentMonth = monthlyActivity[monthlyActivity.length - 1];
            const lastMonth = monthlyActivity[monthlyActivity.length - 2];

            if (currentMonth.meetings > lastMonth.meetings) {
                potentialInsights.push({
                    priority: 'medium',
                    text: `You've attended more meetings this month compared to last. Great job engaging more with the community! 📈`
                });
            }
            if (currentMonth.tasks > lastMonth.tasks) {
                potentialInsights.push({
                    priority: 'medium',
                    text: `Your productivity is up! You've completed more tasks this month than last. Keep pushing! 🔥`
                });
            }
        }

        // 4. Streak/History Insights
        if (attendanceHistory && attendanceHistory.length >= 3) {
            const lastThree = attendanceHistory.slice(0, 3);
            const consecutivePresent = lastThree.every(h => h.status === 'present');
            const consecutiveAbsent = lastThree.every(h => h.status !== 'present');

            if (consecutivePresent) {
                potentialInsights.push({
                    priority: 'high', // Positive reinforcement is high priority too
                    text: `You're on a roll! Perfect attendance in the last 3 meetings. Keep this streak alive! 🔥`
                });
            } else if (consecutiveAbsent) {
                potentialInsights.push({
                    priority: 'high',
                    text: `We've missed you at the last few meetings. Hope to see you at the next one! Your presence matters. 👋`
                });
            }
        }

        // Select the best insight
        // Strategy: Prioritize 'high' priority items. If multiple, pick one randomly.
        // If no high priority, pick from medium, then low.

        const highPriority = potentialInsights.filter(i => i.priority === 'high');
        const mediumPriority = potentialInsights.filter(i => i.priority === 'medium');
        const lowPriority = potentialInsights.filter(i => i.priority === 'low');

        let selectedPool = [];
        if (highPriority.length > 0) {
            selectedPool = highPriority;
        } else if (mediumPriority.length > 0) {
            selectedPool = mediumPriority;
        } else {
            selectedPool = lowPriority;
        }

        if (selectedPool.length === 0) {
            return "You're doing well! Keep maintaining your stats and stay active in the community. ✨";
        }

        // Use a random selection from the pool to vary the message each time the user visits
        const randomIndex = Math.floor(Math.random() * selectedPool.length);
        return selectedPool[randomIndex].text;
    };

    if (loading && !refreshing) {
        return (
            <MainLayout navigation={navigation} title="Analytics">
                <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
                    {/* Skeleton AI Recommendations */}
                    <SkeletonCard style={{ marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <SkeletonBox width={32} height={32} borderRadius={16} style={{ marginRight: 12 }} />
                            <SkeletonBox width={150} height={18} />
                        </View>
                        <SkeletonBox width="100%" height={14} style={{ marginBottom: 8 }} />
                        <SkeletonBox width="95%" height={14} style={{ marginBottom: 8 }} />
                        <SkeletonBox width="85%" height={14} />
                    </SkeletonCard>

                    {/* Skeleton Stats */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                        {[1, 2].map((_, i) => (
                            <SkeletonCard key={i} style={{ flex: 1 }}>
                                <SkeletonBox width={80} height={14} style={{ marginBottom: 8 }} />
                                <SkeletonBox width={50} height={28} />
                            </SkeletonCard>
                        ))}
                    </View>

                    {/* Skeleton Chart */}
                    <SkeletonCard>
                        <SkeletonBox width={120} height={18} style={{ marginBottom: 16 }} />
                        <SkeletonBox width="100%" height={200} borderRadius={12} />
                    </SkeletonCard>

                    {/* Skeleton Pie Chart */}
                    <SkeletonCard style={{ marginTop: 20 }}>
                        <SkeletonBox width={140} height={18} style={{ marginBottom: 16 }} />
                        <View style={{ alignItems: 'center' }}>
                            <SkeletonBox width={180} height={180} borderRadius={90} />
                        </View>
                    </SkeletonCard>

                    {/* Skeleton Attendance */}
                    <SkeletonCard style={{ marginTop: 20 }}>
                        <SkeletonBox width={150} height={18} style={{ marginBottom: 16 }} />
                        {[1, 2, 3].map((_, i) => (
                            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                <SkeletonBox width="60%" height={14} />
                                <SkeletonBox width={60} height={14} />
                            </View>
                        ))}
                    </SkeletonCard>
                </ScrollView>
            </MainLayout>
        );
    }

    const chartConfig = {
        backgroundColor: '#FFF',
        backgroundGradientFrom: '#FFF',
        backgroundGradientTo: '#FFF',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(10, 102, 194, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
        style: { borderRadius: 16 },
        propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: "#0A66C2"
        }
    };

    const pieData = [
        {
            name: 'Completed',
            population: parseInt(data?.summary?.completedTasks || 0),
            color: '#10B981',
            legendFontColor: '#374151',
            legendFontSize: 12
        },
        {
            name: 'Pending',
            population: parseInt(data?.summary?.totalTasks || 0) - parseInt(data?.summary?.completedTasks || 0),
            color: '#F59E0B',
            legendFontColor: '#374151',
            legendFontSize: 12
        }
    ];

    const activityLabels = data?.monthlyActivity?.map(a => a.month) || [];
    const activityMeetings = data?.monthlyActivity?.map(a => a.meetings) || [];
    const activityTasks = data?.monthlyActivity?.map(a => a.tasks) || [];

    return (
        <MainLayout navigation={navigation} title="Insights" currentRoute="Analytics">
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* AI Recommendation Section */}
                <Animatable.View animation="fadeInDown" duration={1000} style={styles.aiCard}>
                    <View style={styles.aiContent}>
                        <View style={styles.aiHeader}>
                            <Ionicons name="sparkles" size={20} color="#0A66C2" />
                            <Text style={styles.aiTitle}>Mavericks Insights</Text>
                        </View>
                        <Text style={styles.aiBody}>{generateRecommendation(data)}</Text>
                        <View style={styles.aiBadge}>
                            <Text style={styles.aiBadgeText}>Performance Analysis</Text>
                        </View>
                    </View>
                </Animatable.View>

                {/* Score Cards */}
                <View style={styles.row}>
                    <Animatable.View animation="zoomIn" delay={300} style={styles.scoreCard}>
                        <Text style={styles.scoreValue}>{data?.summary?.attendanceRate}%</Text>
                        <Text style={styles.scoreLabel}>Attendance</Text>
                        <View style={styles.scoreBarBase}>
                            <View style={[styles.scoreBarFill, { width: `${data?.summary?.attendanceRate}%`, backgroundColor: '#10B981' }]} />
                        </View>
                    </Animatable.View>

                    <Animatable.View animation="zoomIn" delay={500} style={styles.scoreCard}>
                        <Text style={styles.scoreValue}>{data?.summary?.taskCompletionRate}%</Text>
                        <Text style={styles.scoreLabel}>Tasks Done</Text>
                        <View style={styles.scoreBarBase}>
                            <View style={[styles.scoreBarFill, { width: `${data?.summary?.taskCompletionRate}%`, backgroundColor: '#F59E0B' }]} />
                        </View>
                    </Animatable.View>
                </View>

                {/* Performance Chart */}
                <Animatable.View animation="fadeInUp" delay={700} style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Activity Trend</Text>
                    {activityLabels.length > 0 && (
                        <LineChart
                            data={{
                                labels: activityLabels,
                                datasets: [
                                    { data: activityMeetings, color: (opacity = 1) => `rgba(10, 102, 194, ${opacity})`, strokeWidth: 2 },
                                    { data: activityTasks, color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, strokeWidth: 2 }
                                ],
                                legend: ["Meetings", "Tasks"]
                            }}
                            width={width - 48}
                            height={220}
                            chartConfig={chartConfig}
                            bezier
                            style={styles.chart}
                        />
                    )}
                </Animatable.View>

                {/* Task Breakdown */}
                <Animatable.View animation="fadeInUp" delay={900} style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Task Distribution</Text>
                    <PieChart
                        data={pieData}
                        width={width - 64}
                        height={180}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                    />
                </Animatable.View>

                {/* Attendance Summary */}
                <Animatable.View animation="fadeInUp" delay={1100} style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Meeting History (Last 10)</Text>
                    <View style={styles.historyList}>
                        {data?.attendanceHistory?.length > 0 ? (
                            data.attendanceHistory.map((h, idx) => (
                                <View key={idx} style={styles.historyItem}>
                                    <View style={styles.historyIconBox}>
                                        <Ionicons
                                            name={h.status === 'present' ? 'checkmark-circle' : 'close-circle'}
                                            size={20}
                                            color={h.status === 'present' ? '#10B981' : '#EF4444'}
                                        />
                                    </View>
                                    <View style={styles.historyInfo}>
                                        <Text style={styles.historyMeetingName} numberOfLines={1}>{h.name}</Text>
                                        <Text style={styles.historyDate}>{new Date(h.date).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={[styles.statusTag, { backgroundColor: h.status === 'present' ? '#E1F8F0' : '#FEE2E2' }]}>
                                        <Text style={[styles.statusTagText, { color: h.status === 'present' ? '#065F46' : '#991B1B' }]}>
                                            {h.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No meeting history records found.</Text>
                        )}
                    </View>
                </Animatable.View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 14, color: '#6B7280', fontWeight: '600' },
    aiCard: { borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
    aiContent: { padding: 20 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    aiTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
    aiBody: { fontSize: 13, color: '#4B5563', lineHeight: 20, fontStyle: 'italic' },
    aiBadge: { alignSelf: 'flex-end', marginTop: 12, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    aiBadgeText: { fontSize: 10, color: '#6B7280', fontWeight: '700' },
    row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    scoreCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    scoreValue: { fontSize: 24, fontWeight: '900', color: '#1F2937' },
    scoreLabel: { fontSize: 12, color: '#6B7280', marginVertical: 4, fontWeight: '700' },
    scoreBarBase: { width: '100%', height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginTop: 4 },
    scoreBarFill: { height: '100%', borderRadius: 2 },
    chartCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    chartTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 20 },
    chart: { marginVertical: 8, borderRadius: 16 },
    historyList: { marginTop: 10 },
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    historyIconBox: { width: 32 },
    historyInfo: { flex: 1 },
    historyMeetingName: { fontSize: 14, fontWeight: '700', color: '#374151' },
    historyDate: { fontSize: 11, color: '#9CA3AF' },
    statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusTagText: { fontSize: 10, fontWeight: '800' },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginVertical: 20 }
});

export default AnalyticsScreen;
