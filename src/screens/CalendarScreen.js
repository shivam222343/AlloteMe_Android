import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { meetingsAPI } from '../services/api';
import MainLayout from '../components/MainLayout';
import { SkeletonBox, SkeletonCard } from '../components/SkeletonLoader';
import { Colors, Shadows, Spacing, BorderRadius } from '../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { FESTIVALS, CATEGORY_COLORS } from '../constants/festivals';

const { width } = Dimensions.get('window');

const CalendarScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [markedDates, setMarkedDates] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [dayEvents, setDayEvents] = useState({ meetings: [], holiday: null });
    const [modalVisible, setModalVisible] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

    const handleTodayView = () => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentDate(today);
        handleDayPress({ dateString: today });
    };

    const fetchAllMeetings = async () => {
        try {
            setLoading(true);
            const res = await meetingsAPI.getClubMeetings('all');
            if (res.success) {
                const allMeetings = [...res.data.upcoming, ...res.data.past];
                setMeetings(allMeetings);
                generateCalendarData(allMeetings);
            }
        } catch (error) {
            console.error('Error fetching meetings for calendar:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchAllMeetings();
        }, [])
    );

    const generateCalendarData = (meetingsList) => {
        const marked = {};
        const todayStr = new Date().toISOString().split('T')[0];

        // Group meetings by date and then by club
        const meetingsByDate = {};
        meetingsList.forEach(m => {
            const dateStr = new Date(m.date).toISOString().split('T')[0];
            if (!meetingsByDate[dateStr]) meetingsByDate[dateStr] = [];
            meetingsByDate[dateStr].push(m);
        });

        // 1. Process Meetings
        Object.keys(meetingsByDate).forEach(dateStr => {
            const dayMeetings = meetingsByDate[dateStr];
            const uniqueClubs = new Set(dayMeetings.map(m => m.clubId?._id?.toString() || 'unknown'));

            // Background Logic: 
            // If any upcoming -> Green, Else if any cancelled -> Red, Else -> Gray
            let bgColor = Colors.secondary[100]; // Default Past (Gray)
            let textColor = Colors.secondary[600];

            if (dayMeetings.some(m => m.status === 'upcoming' || m.status === 'ongoing')) {
                bgColor = Colors.success[50];
                textColor = Colors.success[700];
            } else if (dayMeetings.every(m => m.status === 'cancelled' || m.status === 'canceled')) {
                bgColor = Colors.error[50];
                textColor = Colors.error[700];
            }

            // Border Logic:
            let customStyles = {
                container: {
                    backgroundColor: bgColor,
                    borderRadius: 8,
                    borderWidth: 0,
                },
                text: {
                    color: textColor,
                    fontWeight: 'bold',
                }
            };

            // Today Special Style (Orange bg, Red border, Circular)
            if (dateStr === todayStr) {
                customStyles.container.backgroundColor = '#FFD700'; // Gold/Orange
                customStyles.container.borderColor = '#FF3B30'; // Red
                customStyles.container.borderWidth = 3;
                customStyles.container.borderRadius = 25; // Create a circular effect
                customStyles.text.color = '#000000';
            }

            // Multi-club Borders
            if (uniqueClubs.size === 2) {
                // Two clubs: Inner and outer border effect using composite style
                customStyles.container.borderColor = '#A3CBFF'; // Light blue outer
                customStyles.container.borderWidth = 3;
            } else if (uniqueClubs.size > 2) {
                // More than two: Orange border
                customStyles.container.borderColor = Colors.warning[500];
                customStyles.container.borderWidth = 2;
            }

            marked[dateStr] = {
                customStyles,
                meetings: dayMeetings,
                dots: [] // Initialize dots array
            };
        });

        // 2. Add Festivals with colored dots for next 20 years
        const currentYear = new Date().getFullYear();
        const endYear = currentYear + 20; // Show festivals for next 20 years

        for (let year = currentYear; year <= endYear; year++) {
            Object.keys(FESTIVALS).forEach(dayKey => {
                const dateStr = `${year}-${dayKey}`;
                const festival = FESTIVALS[dayKey];

                // Create a colored dot for the festival
                const festivalDot = {
                    key: `${year}-${dayKey}`,
                    color: festival.color || CATEGORY_COLORS[festival.category] || '#FFD700',
                };

                if (!marked[dateStr]) {
                    // No meetings on this day, just show the festival dot
                    marked[dateStr] = {
                        dots: [festivalDot],
                        festival: festival
                    };
                } else {
                    // Add festival dot to existing meeting day
                    if (!marked[dateStr].dots) marked[dateStr].dots = [];
                    marked[dateStr].dots.push(festivalDot);
                    marked[dateStr].festival = festival;
                }
            });
        }

        // 3. Ensure Today is consistently highlighted
        if (!marked[todayStr]) {
            marked[todayStr] = {
                customStyles: {
                    container: {
                        backgroundColor: '#FFD700',
                        borderColor: '#FF3B30',
                        borderWidth: 3,
                        borderRadius: 25,
                    },
                    text: {
                        color: '#000000',
                        fontWeight: 'bold',
                    }
                }
            };
        } else {
            // Merge today's highlight with existing meeting/holiday data
            if (!marked[todayStr].customStyles) {
                marked[todayStr].customStyles = {
                    container: {},
                    text: {}
                };
            }
            marked[todayStr].customStyles = {
                container: {
                    ...marked[todayStr].customStyles.container,
                    backgroundColor: '#FFD700',
                    borderColor: '#FF3B30',
                    borderWidth: 3,
                    borderRadius: 25,
                },
                text: {
                    ...marked[todayStr].customStyles.text,
                    color: '#000000',
                    fontWeight: 'bold',
                }
            };
        }

        setMarkedDates(marked);
    };

    const handleDayPress = (day) => {
        const dateString = day.dateString;
        const data = markedDates[dateString] || {};

        if (data.meetings || data.festival) {
            setSelectedDate(dateString);
            setDayEvents({
                meetings: data.meetings || [],
                festival: data.festival || null
            });
            setModalVisible(true);
        }
    };

    return (
        <MainLayout title="Smart Calendar" navigation={navigation} currentRoute="Calendar">
            <View style={styles.container}>
                {loading ? (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Skeleton Calendar */}
                        <SkeletonCard style={{ margin: Spacing.md }}>
                            {/* Calendar Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                <SkeletonBox width={30} height={30} borderRadius={15} />
                                <SkeletonBox width={120} height={24} />
                                <SkeletonBox width={30} height={30} borderRadius={15} />
                            </View>

                            {/* Week Days */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
                                {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                                    <SkeletonBox key={i} width={30} height={16} />
                                ))}
                            </View>

                            {/* Calendar Grid */}
                            {[1, 2, 3, 4, 5].map((week, i) => (
                                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
                                    {[1, 2, 3, 4, 5, 6, 7].map((_, j) => (
                                        <SkeletonBox key={j} width={30} height={30} borderRadius={8} />
                                    ))}
                                </View>
                            ))}
                        </SkeletonCard>

                        {/* Skeleton Guide */}
                        <SkeletonCard style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.xl }}>
                            <SkeletonBox width={120} height={18} style={{ marginBottom: 16 }} />
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                {[1, 2, 3, 4, 5].map((_, i) => (
                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 12 }}>
                                        <SkeletonBox width={16} height={16} borderRadius={4} style={{ marginRight: 8 }} />
                                        <SkeletonBox width={80} height={14} />
                                    </View>
                                ))}
                            </View>
                        </SkeletonCard>
                    </ScrollView>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.headerControls}>
                            <Text style={styles.calendarTitle}>Events & Festivals</Text>
                            <TouchableOpacity onPress={handleTodayView} style={styles.todayButton}>
                                <Text style={styles.todayButtonText}>Go to Today</Text>
                                <Ionicons name="calendar-outline" size={16} color={Colors.primary[500]} style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarCard}>
                            <Calendar
                                current={currentDate}
                                onMonthChange={(month) => setCurrentDate(month.dateString)}
                                onDayPress={handleDayPress}
                                markedDates={markedDates}
                                markingType={'multi-dot'}
                                enableSwipeMonths={true}
                                theme={{
                                    backgroundColor: '#ffffff',
                                    calendarBackground: '#ffffff',
                                    textSectionTitleColor: Colors.secondary[400],
                                    selectedDayBackgroundColor: Colors.primary[500],
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: Colors.primary[600],
                                    dayTextColor: Colors.secondary[800],
                                    textDisabledColor: Colors.secondary[200],
                                    dotColor: '#FFD700',
                                    arrowColor: Colors.primary[500],
                                    monthTextColor: Colors.secondary[900],
                                    indicatorColor: Colors.primary[500],
                                    textDayFontWeight: '500',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: '600',
                                    textDayFontSize: 14,
                                    textMonthFontSize: 18,
                                    textDayHeaderFontSize: 12,
                                }}
                            />
                        </View>

                        <View style={styles.guideCard}>
                            <Text style={styles.guideTitle}>Calendar Guide</Text>
                            <View style={styles.guideGrid}>
                                <View style={styles.guideItem}>
                                    <View style={[styles.colorBox, { backgroundColor: Colors.success[100] }]} />
                                    <Text style={styles.guideText}>Upcoming</Text>
                                </View>
                                <View style={styles.guideItem}>
                                    <View style={[styles.colorBox, { backgroundColor: Colors.secondary[200] }]} />
                                    <Text style={styles.guideText}>Past</Text>
                                </View>
                                <View style={styles.guideItem}>
                                    <View style={[styles.colorBox, { backgroundColor: Colors.error[100] }]} />
                                    <Text style={styles.guideText}>Cancelled</Text>
                                </View>
                                <View style={styles.guideItem}>
                                    <View style={[styles.colorBox, { borderWidth: 2, borderColor: Colors.primary[500] }]} />
                                    <Text style={styles.guideText}>Today</Text>
                                </View>
                                <View style={styles.guideItem}>
                                    <View style={[styles.colorBox, { borderWidth: 2, borderColor: Colors.warning[500] }]} />
                                    <Text style={styles.guideText}>Multiple Clubs</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                )}

                <Modal
                    visible={modalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setModalVisible(false)}
                        />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Daily Schedule</Text>
                                    <Text style={styles.modalDate}>
                                        {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <Ionicons name="close-circle" size={32} color={Colors.secondary[300]} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.detailList}>
                                {dayEvents.festival && (
                                    <View style={styles.festivalBanner}>
                                        <Text style={styles.festivalEmoji}>{dayEvents.festival.emoji}</Text>
                                        <View style={styles.festivalContent}>
                                            <View style={styles.festivalHeader}>
                                                <Text style={styles.festivalName}>{dayEvents.festival.name}</Text>
                                                <View style={[styles.categoryBadge, { backgroundColor: dayEvents.festival.color + '20' }]}>
                                                    <Text style={[styles.categoryText, { color: dayEvents.festival.color }]}>
                                                        {dayEvents.festival.category}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.festivalInfo}>{dayEvents.festival.info}</Text>
                                        </View>
                                    </View>
                                )}

                                {dayEvents.meetings.length > 0 ? (
                                    dayEvents.meetings.map((meeting) => (
                                        <TouchableOpacity
                                            key={meeting._id}
                                            style={styles.eventItem}
                                            onPress={() => {
                                                setModalVisible(false);
                                                navigation.navigate('Meetings', { selectedMeetingId: meeting._id });
                                            }}
                                        >
                                            <View style={styles.eventLeft}>
                                                <Text style={styles.eventTime}>{meeting.time}</Text>
                                                <View style={[styles.verticalLine, { backgroundColor: meeting.status === 'upcoming' ? Colors.success[500] : Colors.secondary[300] }]} />
                                            </View>
                                            <View style={styles.eventRight}>
                                                <View style={styles.eventHeader}>
                                                    <Text style={styles.eventName}>{meeting.name}</Text>
                                                    <View style={[styles.badge, { backgroundColor: meeting.status === 'upcoming' ? Colors.success[50] : Colors.secondary[100] }]}>
                                                        <Text style={[styles.badgeText, { color: meeting.status === 'upcoming' ? Colors.success[700] : Colors.secondary[600] }]}>
                                                            {meeting.status}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={styles.eventClub}>{meeting.clubId?.name}</Text>

                                                <View style={styles.eventLoc}>
                                                    <Ionicons name="location-outline" size={14} color={Colors.secondary[400]} />
                                                    <Text style={styles.locText}>{meeting.mode === 'Online' ? meeting.platform : meeting.locationCategory}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : !dayEvents.festival && (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="calendar-outline" size={48} color={Colors.secondary[200]} />
                                        <Text style={styles.emptyText}>No club activities scheduled for this day</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.secondary[50],
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.md,
        color: Colors.secondary[500],
        fontWeight: '600',
    },
    calendarCard: {
        backgroundColor: '#FFFFFF',
        margin: Spacing.md,
        borderRadius: BorderRadius.xl,
        padding: Spacing.sm,
        ...Shadows.md,
    },
    guideCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.xl,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
    },
    guideTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary[800],
        marginBottom: Spacing.md,
    },
    guideGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    guideItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        marginBottom: Spacing.sm,
    },
    colorBox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        marginRight: Spacing.sm,
    },
    guideText: {
        fontSize: 12,
        color: Colors.secondary[600],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius['2xl'],
        width: '100%',
        maxHeight: '80%',
        padding: Spacing.lg,
        ...Shadows.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.secondary[100],
        paddingBottom: Spacing.md,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.secondary[900],
    },
    modalDate: {
        fontSize: 14,
        color: Colors.primary[600],
        fontWeight: '500',
    },
    festivalBanner: {
        flexDirection: 'row',
        backgroundColor: '#FFF7ED',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg,
        borderWidth: 2,
        borderColor: '#FFEDD5',
        alignItems: 'center',
    },
    festivalEmoji: {
        fontSize: 40,
        marginRight: Spacing.md,
    },
    festivalContent: {
        flex: 1,
    },
    festivalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    festivalName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    festivalInfo: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    eventList: {
        marginTop: Spacing.sm,
    },
    eventItem: {
        flexDirection: 'row',
        marginBottom: Spacing.lg,
    },
    eventLeft: {
        alignItems: 'center',
        width: 60,
    },
    eventTime: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.secondary[400],
        marginBottom: 4,
    },
    verticalLine: {
        flex: 1,
        width: 2,
        borderRadius: 1,
    },
    eventRight: {
        flex: 1,
        marginLeft: Spacing.md,
        paddingBottom: Spacing.md,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    eventName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary[900],
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    eventClub: {
        fontSize: 13,
        color: Colors.primary[600],
        fontWeight: '600',
        marginTop: 2,
    },
    eventLoc: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    locText: {
        fontSize: 12,
        color: Colors.secondary[500],
        marginLeft: 4,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: Spacing.md,
        color: Colors.secondary[400],
        textAlign: 'center',
        fontSize: 14,
    },
    headerControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
    },
    calendarTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.secondary[900],
    },
    todayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primary[500],
    },
    todayButtonText: {
        color: Colors.primary[500],
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default CalendarScreen;
