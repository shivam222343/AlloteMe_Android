import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
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
    const [selectedTab, setSelectedTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: 'analytics' },
        { id: 'gatherings', label: 'Gatherings', icon: 'calendar' },
        { id: 'milestones', label: 'Milestones', icon: 'checkmark-done' },
        { id: 'performance', label: 'Artist Growth', icon: 'trending-up' },
    ];

    const navScrollRef = useRef(null);
    const tabLayouts = useRef({});

    // Auto-scroll tab into view when selected
    useEffect(() => {
        if (selectedTab && navScrollRef.current && tabLayouts.current[selectedTab]) {
            const { x, width: tabWidth } = tabLayouts.current[selectedTab];
            const screenWidth = Dimensions.get('window').width;
            navScrollRef.current.scrollTo({
                x: x - (screenWidth / 2 - tabWidth / 2),
                animated: true
            });
        }
    }, [selectedTab]);

    const handleTabSwipe = (direction) => {
        const currentIndex = tabs.findIndex(t => t.id === selectedTab);
        if (currentIndex === -1) return;

        if (direction === 'next') {
            if (currentIndex < tabs.length - 1) {
                setSelectedTab(tabs[currentIndex + 1].id);
            }
        } else {
            if (currentIndex > 0) {
                setSelectedTab(tabs[currentIndex - 1].id);
            }
        }
    };

    const onSwipeGestureEvent = (event) => {
        if (event.nativeEvent.state === State.END) {
            const { translationX, velocityX } = event.nativeEvent;
            if (Math.abs(translationX) > 60 && Math.abs(velocityX) > 300) {
                if (translationX < 0) {
                    handleTabSwipe('next');
                } else {
                    handleTabSwipe('prev');
                }
            }
        }
    };

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

    const generateRecommendation = (analyticsData) => {
        if (!analyticsData || !analyticsData.summary) {
            return "Welcome to Aura! Start attending meetings and completing tasks to see personalized insights here.";
        }

        const { summary, monthlyActivity, attendanceHistory } = analyticsData;
        const { attendanceRate, taskCompletionRate, totalTasks, completedTasks } = summary;

        const potentialInsights = [];

        if (attendanceRate < 50) {
            potentialInsights.push({
                priority: 'high',
                text: `Your participation is currently ${attendanceRate}%. Consistent presence is key to creative growth. Try to join the next few gatherings! 🎨`
            });
        } else if (attendanceRate >= 90) {
            potentialInsights.push({
                priority: 'low',
                text: `Stellar participation record (${attendanceRate}%)! Your reliability sets a great example for the entire artist community. ⭐`
            });
        } else {
            potentialInsights.push({
                priority: 'medium',
                text: `You're attending ${attendanceRate}% of gatherings. Aim for 90% to maximize your creative growth and collective contribution! 🚀`
            });
        }

        const pendingTasks = totalTasks - completedTasks;
        if (taskCompletionRate < 50 && pendingTasks > 0) {
            potentialInsights.push({
                priority: 'high',
                text: `You have ${pendingTasks} pending milestones. Reaching a couple today will significantly boost your ${taskCompletionRate}% completion rate! 💪`
            });
        } else if (taskCompletionRate >= 95 && totalTasks > 5) {
            potentialInsights.push({
                priority: 'low',
                text: `Incredible productivity! You've completed nearly all your tasks. Ready for a new challenge? 🏆`
            });
        }

        if (monthlyActivity && monthlyActivity.length >= 2) {
            const currentMonth = monthlyActivity[monthlyActivity.length - 1];
            const lastMonth = monthlyActivity[monthlyActivity.length - 2];

            if (currentMonth.meetings > lastMonth.meetings) {
                potentialInsights.push({
                    priority: 'medium',
                    text: `You've attended more gatherings this month compared to last. Great job engaging more with the creative community! 📈`
                });
            }
        }

        if (attendanceHistory && attendanceHistory.length >= 3) {
            const lastThree = attendanceHistory.slice(0, 3);
            const consecutivePresent = lastThree.every(h => h.status === 'present');

            if (consecutivePresent) {
                potentialInsights.push({
                    priority: 'high',
                    text: `You're on a roll! Perfect attendance in the last 3 meetings. Keep this streak alive! 🔥`
                });
            }
        }

        const highPriority = potentialInsights.filter(i => i.priority === 'high');
        const mediumPriority = potentialInsights.filter(i => i.priority === 'medium');
        const lowPriority = potentialInsights.filter(i => i.priority === 'low');

        let selectedPool = highPriority.length > 0 ? highPriority : (mediumPriority.length > 0 ? mediumPriority : lowPriority);

        if (selectedPool.length === 0) {
            return "You're doing well! Keep maintaining your stats and stay active in the community. ✨";
        }

        const randomIndex = Math.floor(Math.random() * selectedPool.length);
        return selectedPool[randomIndex].text;
    };

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

    if (loading && !refreshing) {
        return (
            <MainLayout navigation={navigation} title="Analytics">
                <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
                    <SkeletonCard style={{ marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <SkeletonBox width={32} height={32} borderRadius={16} style={{ marginRight: 12 }} />
                            <SkeletonBox width={150} height={18} />
                        </View>
                        <SkeletonBox width="100%" height={14} style={{ marginBottom: 8 }} />
                        <SkeletonBox width="95%" height={14} style={{ marginBottom: 8 }} />
                        <SkeletonBox width="85%" height={14} />
                    </SkeletonCard>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                        {[1, 2].map((_, i) => (
                            <SkeletonCard key={i} style={{ flex: 1 }}>
                                <SkeletonBox width={80} height={14} style={{ marginBottom: 8 }} />
                                <SkeletonBox width={50} height={28} />
                            </SkeletonCard>
                        ))}
                    </View>

                    <SkeletonCard>
                        <SkeletonBox width={120} height={18} style={{ marginBottom: 16 }} />
                        <SkeletonBox width="100%" height={200} borderRadius={12} />
                    </SkeletonCard>
                </ScrollView>
            </MainLayout>
        );
    }

    const renderOverviewTab = () => (
        <>
            {/* AI Recommendation */}
            <Animatable.View animation="fadeInDown" duration={1000} style={styles.aiCard}>
                <View style={styles.aiContent}>
                    <View style={styles.aiHeader}>
                        <Ionicons name="sparkles" size={20} color="#0A66C2" />
                        <Text style={styles.aiTitle}>Aura Insights</Text>
                    </View>
                    <Text style={styles.aiBody}>{generateRecommendation(data)}</Text>
                    <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI-Powered Analysis</Text>
                    </View>
                </View>
            </Animatable.View>

            {/* Score Cards */}
            <View style={styles.row}>
                <Animatable.View animation="zoomIn" delay={300} style={styles.scoreCard}>
                    <Ionicons name="calendar-outline" size={24} color="#10B981" style={{ marginBottom: 8 }} />
                    <Text style={styles.scoreValue}>{data?.summary?.attendanceRate}%</Text>
                    <Text style={styles.scoreLabel}>Attendance</Text>
                    <View style={styles.scoreBarBase}>
                        <View style={[styles.scoreBarFill, { width: `${data?.summary?.attendanceRate}%`, backgroundColor: '#10B981' }]} />
                    </View>
                </Animatable.View>

                <Animatable.View animation="zoomIn" delay={500} style={styles.scoreCard}>
                    <Ionicons name="checkmark-done-outline" size={24} color="#F59E0B" style={{ marginBottom: 8 }} />
                    <Text style={styles.scoreValue}>{data?.summary?.taskCompletionRate}%</Text>
                    <Text style={styles.scoreLabel}>Tasks Done</Text>
                    <View style={styles.scoreBarBase}>
                        <View style={[styles.scoreBarFill, { width: `${data?.summary?.taskCompletionRate}%`, backgroundColor: '#F59E0B' }]} />
                    </View>
                </Animatable.View>
            </View>

            {/* Performance Progress Rings */}
            <Animatable.View animation="fadeInUp" delay={700} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Performance Overview</Text>
                <ProgressChart
                    data={{
                        labels: ["Participation", "Milestones"],
                        data: [
                            (data?.summary?.attendanceRate || 0) / 100,
                            (data?.summary?.taskCompletionRate || 0) / 100,
                        ]
                    }}
                    width={width - 64}
                    height={220}
                    strokeWidth={16}
                    radius={32}
                    chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1, index) => {
                            const colors = ['#10B981', '#F59E0B'];
                            return colors[index] || `rgba(10, 102, 194, ${opacity})`;
                        }
                    }}
                    hideLegend={false}
                />
            </Animatable.View>

            {/* Activity Trend */}
            <Animatable.View animation="fadeInUp" delay={900} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Activity Trend</Text>
                {(data?.monthlyActivity?.length || 0) > 0 && (
                    <LineChart
                        data={{
                            labels: data.monthlyActivity.map(a => a.month),
                            datasets: [
                                { data: data.monthlyActivity.map(a => a.meetings), color: (opacity = 1) => `rgba(10, 102, 194, ${opacity})`, strokeWidth: 3 },
                                { data: data.monthlyActivity.map(a => a.tasks), color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, strokeWidth: 3 }
                            ],
                            legend: ["Gatherings", "Milestones"]
                        }}
                        width={width - 48}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        withDots={true}
                        withInnerLines={true}
                        withOuterLines={true}
                        withVerticalLines={true}
                        withHorizontalLines={true}
                    />
                )}
            </Animatable.View>
        </>
    );

    const renderAttendanceTab = () => (
        <>
            {/* Attendance Rate Gauge */}
            <Animatable.View animation="fadeIn" style={styles.chartCard}>
                <Text style={styles.chartTitle}>Gathering Participation Rate</Text>
                <View style={styles.gaugeContainer}>
                    <View style={styles.gaugeCircle}>
                        <Text style={styles.gaugeValue}>{data?.summary?.attendanceRate}%</Text>
                        <Text style={styles.gaugeLabel}>Present</Text>
                    </View>
                </View>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{data?.summary?.totalMeetings || 0}</Text>
                        <Text style={styles.statLabel}>Total Sessions</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{data?.summary?.attendedMeetings || 0}</Text>
                        <Text style={styles.statLabel}>Attended</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#EF4444' }]}>
                            {(data?.summary?.totalMeetings || 0) - (data?.summary?.attendedMeetings || 0)}
                        </Text>
                        <Text style={styles.statLabel}>Missed</Text>
                    </View>
                </View>
            </Animatable.View>

            {/* Monthly Attendance Bar Chart */}
            <Animatable.View animation="fadeInUp" delay={300} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Monthly Participation</Text>
                {(data?.monthlyActivity?.length || 0) > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 20 }}
                    >
                        <BarChart
                            data={{
                                labels: data.monthlyActivity.map(a => a.month),
                                datasets: [{
                                    data: data.monthlyActivity.map(a => a.meetings)
                                }]
                            }}
                            width={Math.max(width - 48, data.monthlyActivity.length * 60)}
                            height={220}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                            }}
                            style={styles.chart}
                            showValuesOnTopOfBars={true}
                        />
                    </ScrollView>
                )}
            </Animatable.View>

            {/* Meeting History */}
            <Animatable.View animation="fadeInUp" delay={600} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Recent Gathering History</Text>
                <View style={styles.historyList}>
                    {data?.attendanceHistory?.length > 0 ? (
                        data.attendanceHistory.slice(0, 10).map((h, idx) => (
                            <View key={idx} style={styles.historyItem}>
                                <View style={styles.historyIconBox}>
                                    <Ionicons
                                        name={h.status === 'present' ? 'checkmark-circle' : h.status === 'late' ? 'time' : 'close-circle'}
                                        size={20}
                                        color={h.status === 'present' ? '#10B981' : h.status === 'late' ? '#F59E0B' : '#EF4444'}
                                    />
                                </View>
                                <View style={styles.historyInfo}>
                                    <Text style={styles.historyMeetingName} numberOfLines={1}>{h.name}</Text>
                                    <Text style={styles.historyDate}>{new Date(h.date).toLocaleDateString()}</Text>
                                </View>
                                <View style={[styles.statusTag, {
                                    backgroundColor: h.status === 'present' ? '#E1F8F0' : h.status === 'late' ? '#FEF3C7' : '#FEE2E2'
                                }]}>
                                    <Text style={[styles.statusTagText, {
                                        color: h.status === 'present' ? '#065F46' : h.status === 'late' ? '#92400E' : '#991B1B'
                                    }]}>
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
        </>
    );

    const renderTasksTab = () => (
        <>
            {/* Task Completion Pie Chart */}
            <Animatable.View animation="fadeIn" style={styles.chartCard}>
                <Text style={styles.chartTitle}>Task Distribution</Text>
                <PieChart
                    data={[
                        {
                            name: 'Completed',
                            population: parseInt(data?.summary?.completedTasks || 0),
                            color: '#10B981',
                            legendFontColor: '#374151',
                            legendFontSize: 13
                        },
                        {
                            name: 'Pending',
                            population: parseInt(data?.summary?.totalTasks || 0) - parseInt(data?.summary?.completedTasks || 0),
                            color: '#F59E0B',
                            legendFontColor: '#374151',
                            legendFontSize: 13
                        }
                    ]}
                    width={width - 64}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                />
            </Animatable.View>

            {/* Task Stats */}
            <Animatable.View animation="fadeInUp" delay={300} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Milestone Statistics</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Ionicons name="list" size={24} color="#0A66C2" />
                        <Text style={styles.statBoxValue}>{data?.summary?.totalTasks || 0}</Text>
                        <Text style={styles.statBoxLabel}>Total Tasks</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Ionicons name="checkmark-done" size={24} color="#10B981" />
                        <Text style={styles.statBoxValue}>{data?.summary?.completedTasks || 0}</Text>
                        <Text style={styles.statBoxLabel}>Completed</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Ionicons name="time" size={24} color="#F59E0B" />
                        <Text style={styles.statBoxValue}>
                            {(data?.summary?.totalTasks || 0) - (data?.summary?.completedTasks || 0)}
                        </Text>
                        <Text style={styles.statBoxLabel}>Pending</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Ionicons name="trending-up" size={24} color="#8B5CF6" />
                        <Text style={styles.statBoxValue}>{data?.summary?.taskCompletionRate}%</Text>
                        <Text style={styles.statBoxLabel}>Completion</Text>
                    </View>
                </View>
            </Animatable.View>

            {/* Monthly Task Trend */}
            <Animatable.View animation="fadeInUp" delay={600} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Monthly Task Completion</Text>
                {(data?.monthlyActivity?.length || 0) > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 20 }}
                    >
                        <BarChart
                            data={{
                                labels: data.monthlyActivity.map(a => a.month),
                                datasets: [{
                                    data: data.monthlyActivity.map(a => a.tasks)
                                }]
                            }}
                            width={Math.max(width - 48, data.monthlyActivity.length * 60)}
                            height={220}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                            }}
                            style={styles.chart}
                            showValuesOnTopOfBars={true}
                        />
                    </ScrollView>
                )}
            </Animatable.View>
        </>
    );

    const renderPerformanceTab = () => (
        <>
            {/* Performance Trend */}
            <Animatable.View animation="fadeIn" style={styles.chartCard}>
                <Text style={styles.chartTitle}>Performance Trend</Text>
                {(data?.monthlyActivity?.length || 0) > 0 && (
                    <LineChart
                        data={{
                            labels: data.monthlyActivity.map(a => a.month),
                            datasets: [
                                {
                                    data: data.monthlyActivity.map(a => a.meetings),
                                    color: (opacity = 1) => `rgba(10, 102, 194, ${opacity})`,
                                    strokeWidth: 3
                                },
                                {
                                    data: data.monthlyActivity.map(a => a.tasks),
                                    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                                    strokeWidth: 3
                                }
                            ],
                            legend: ["Gatherings", "Milestones"]
                        }}
                        width={width - 48}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        withDots={true}
                        withShadow={true}
                    />
                )}
            </Animatable.View>

            {/* Engagement Breakdown */}
            <Animatable.View animation="fadeInUp" delay={300} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Engagement Breakdown</Text>
                <View style={styles.breakdownList}>
                    <View style={styles.breakdownItem}>
                        <View style={styles.breakdownHeader}>
                            <Ionicons name="calendar" size={20} color="#10B981" />
                            <Text style={styles.breakdownLabel}>Gathering Participation</Text>
                        </View>
                        <View style={styles.breakdownBar}>
                            <View style={[styles.breakdownFill, { width: `${data?.summary?.attendanceRate}%`, backgroundColor: '#10B981' }]} />
                        </View>
                        <Text style={styles.breakdownValue}>{data?.summary?.attendanceRate}%</Text>
                    </View>

                    <View style={styles.breakdownItem}>
                        <View style={styles.breakdownHeader}>
                            <Ionicons name="checkmark-done" size={20} color="#F59E0B" />
                            <Text style={styles.breakdownLabel}>Milestone Completion</Text>
                        </View>
                        <View style={styles.breakdownBar}>
                            <View style={[styles.breakdownFill, { width: `${data?.summary?.taskCompletionRate}%`, backgroundColor: '#F59E0B' }]} />
                        </View>
                        <Text style={styles.breakdownValue}>{data?.summary?.taskCompletionRate}%</Text>
                    </View>
                </View>
            </Animatable.View>

            {/* Summary Stats */}
            <Animatable.View animation="fadeInUp" delay={600} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Summary Statistics</Text>
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Gatherings</Text>
                        <Text style={styles.summaryValue}>{data?.summary?.totalMeetings || 0}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Attended</Text>
                        <Text style={[styles.summaryValue, { color: '#10B981' }]}>{data?.summary?.attendedMeetings || 0}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Milestones</Text>
                        <Text style={styles.summaryValue}>{data?.summary?.totalTasks || 0}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Completed</Text>
                        <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{data?.summary?.completedTasks || 0}</Text>
                    </View>
                </View>
            </Animatable.View>
        </>
    );

    return (
        <MainLayout navigation={navigation} title="Analytics" currentRoute="Analytics">
            <View style={styles.container}>
                {/* Compact Tab Navigation - Admin Style */}
                <View style={styles.navBar}>
                    <ScrollView
                        ref={navScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.navBarScroll}
                    >
                        {tabs.map((tab) => (
                            <TouchableOpacity
                                key={tab.id}
                                style={[styles.navItem, selectedTab === tab.id && styles.navItemActive]}
                                onPress={() => setSelectedTab(tab.id)}
                                onLayout={(event) => {
                                    tabLayouts.current[tab.id] = event.nativeEvent.layout;
                                }}
                            >
                                <Text style={[styles.navText, selectedTab === tab.id && styles.navTextActive]}>
                                    {tab.label.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Content with Swipe Gesture */}
                <PanGestureHandler
                    onHandlerStateChange={onSwipeGestureEvent}
                    activeOffsetX={[-20, 20]}
                    failOffsetY={[-20, 20]}
                >
                    <View style={{ flex: 1 }}>
                        <ScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        >
                            {selectedTab === 'overview' && renderOverviewTab()}
                            {selectedTab === 'gatherings' && renderAttendanceTab()}
                            {selectedTab === 'milestones' && renderTasksTab()}
                            {selectedTab === 'performance' && renderPerformanceTab()}

                            <View style={{ height: 100 }} />
                        </ScrollView>
                    </View>
                </PanGestureHandler>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    navBar: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    navBarScroll: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
    },
    navItem: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 12,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    navItemActive: {
        backgroundColor: '#E0F2FE',
    },
    navText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    navTextActive: {
        color: '#0A66C2',
    },
    content: { flex: 1, padding: 16 },
    aiCard: { borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
    aiContent: { padding: 20 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    aiTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
    aiBody: { fontSize: 13, color: '#4B5563', lineHeight: 20, fontStyle: 'italic' },
    aiBadge: { alignSelf: 'flex-end', marginTop: 12, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    aiBadgeText: { fontSize: 10, color: '#6B7280', fontWeight: '700' },
    row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    scoreCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    scoreValue: { fontSize: 28, fontWeight: '900', color: '#1F2937' },
    scoreLabel: { fontSize: 12, color: '#6B7280', marginVertical: 4, fontWeight: '700' },
    scoreBarBase: { width: '100%', height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginTop: 8 },
    scoreBarFill: { height: '100%', borderRadius: 2 },
    chartCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    chartTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
    chart: { marginVertical: 8, borderRadius: 16 },
    gaugeContainer: { alignItems: 'center', marginVertical: 20 },
    gaugeCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 12,
        borderColor: '#0A66C2',
    },
    gaugeValue: { fontSize: 36, fontWeight: '900', color: '#0A66C2' },
    gaugeLabel: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
    statDivider: { width: 1, backgroundColor: '#E5E7EB' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statBox: {
        flex: 1,
        minWidth: (width - 64) / 2 - 6,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statBoxValue: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginTop: 8 },
    statBoxLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
    historyList: { marginTop: 10 },
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    historyIconBox: { width: 32 },
    historyInfo: { flex: 1 },
    historyMeetingName: { fontSize: 14, fontWeight: '700', color: '#374151' },
    historyDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusTagText: { fontSize: 10, fontWeight: '800' },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginVertical: 20 },
    breakdownList: { gap: 16 },
    breakdownItem: {},
    breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    breakdownLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
    breakdownBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, marginBottom: 4 },
    breakdownFill: { height: '100%', borderRadius: 4 },
    breakdownValue: { fontSize: 12, color: '#6B7280', textAlign: 'right' },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    summaryItem: { flex: 1, minWidth: (width - 64) / 2 - 8, alignItems: 'center', padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12 },
    summaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
    summaryValue: { fontSize: 28, fontWeight: '800', color: '#1F2937' },
});

export default AnalyticsScreen;
