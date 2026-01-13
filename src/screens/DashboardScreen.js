import React, { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    useWindowDimensions,
    Image,
    Animated,
    Modal,
    Platform,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MainLayout from '../components/MainLayout';
import QRScannerModal from '../components/QRScannerModal';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, galleryAPI } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';



const DashboardScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const { user, socket, selectedClubId, updateSelectedClub } = useAuth();
    const [loading, setLoading] = React.useState(true);
    const [dashboardData, setDashboardData] = React.useState({
        globalStats: {
            clubsJoined: 0,
            upcomingMeetings: 0,
            pendingTasks: 0,
            attendanceRate: '0%'
        },
        clubStats: [],
        recentMeetings: [],
        birthdays: []
    });
    const [scanModalVisible, setScanModalVisible] = React.useState(false);
    const [recentImages, setRecentImages] = React.useState([]);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const sliderRef = React.useRef(null);
    const [greeting, setGreeting] = React.useState('');
    const [profilePromptVisible, setProfilePromptVisible] = React.useState(false);
    const initialLoadRef = React.useRef(true);
    const [bannerPromptVisible, setBannerPromptVisible] = useState(false);

    const clubScrollRef = useRef(null);
    const clubLayouts = useRef({});

    useEffect(() => {
        const id = selectedClubId?.toString();
        if (id && clubScrollRef.current && clubLayouts.current[id]) {
            const { x, width: tabWidth } = clubLayouts.current[id];
            clubScrollRef.current.scrollTo({
                x: x - (width / 2 - tabWidth / 2),
                animated: true
            });
        }
    }, [selectedClubId, width]);

    // Check for first-time prompts (Profile & Banner)
    React.useEffect(() => {
        const checkPrompts = async () => {
            try {
                // 1. Profile Picture Prompt
                const hasPromptedProfile = await AsyncStorage.getItem(`hasPromptedProfile_${user?._id}`);
                const hasProfilePic = user?.profilePicture?.url && !user.profilePicture.url.includes('dicebear');

                if (!hasPromptedProfile && !hasProfilePic) {
                    setProfilePromptVisible(true);
                    await AsyncStorage.setItem(`hasPromptedProfile_${user?._id}`, 'true');
                    return; // Show only one prompt at a time
                }

                // 2. Banner Change Prompt (only if profile prompt didn't fire)
                const hasPromptedBanner = await AsyncStorage.getItem(`hasPromptedBanner_${user?._id}`);
                // Assuming 'null' or undefined means default blue banner
                const hasCustomBanner = user?.preferences?.sidebarBanner;

                if (!hasPromptedBanner && !hasCustomBanner) {
                    // We can reuse the same modal mechanism or create a new state
                    // For now, let's navigate to settings directly or use a simple Alert? 
                    // User requested a "random popup". I'll add a 'bannerPromptVisible' state.
                    setBannerPromptVisible(true);
                    await AsyncStorage.setItem(`hasPromptedBanner_${user?._id}`, 'true');
                }
            } catch (e) {
                console.log('Error checking prompts', e);
            }
        };

        if (user) {
            checkPrompts();
        }
    }, [user]);

    const fetchDashboardData = React.useCallback(async (skipGallery = false) => {
        try {
            if (initialLoadRef.current) {
                setLoading(true);
            }
            if (skipGallery) {
                const dashRes = await authAPI.getDashboard();
                if (dashRes.success) {
                    setDashboardData(dashRes.data);
                }
            } else {
                const [dashRes, galleryRes] = await Promise.all([
                    authAPI.getDashboard(),
                    galleryAPI.getImages({ limit: 5, status: 'approved' })
                ]);
                if (dashRes.success) {
                    setDashboardData(dashRes.data);
                }
                if (galleryRes.success) {
                    setRecentImages(galleryRes.data.slice(0, 5));
                }
            }
        } catch (error) {
            console.error('Fetch dashboard data error:', error);
        } finally {
            setLoading(false);
            initialLoadRef.current = false;
        }
    }, []);

    const getCurrentStats = () => {
        if (selectedClubId === 'all') {
            return [
                { label: 'Clubs', value: dashboardData?.globalStats?.clubsJoined || 0, icon: 'business-outline', color: '#6366F1' },
                { label: 'Meetings', value: dashboardData?.globalStats?.upcomingMeetings || 0, icon: 'calendar-outline', color: '#0EA5E9' },
                { label: 'Tasks', value: dashboardData?.globalStats?.pendingTasks || 0, icon: 'list-outline', color: '#F59E0B' },
                { label: 'Attendance', value: dashboardData?.globalStats?.attendanceRate || '0%', icon: 'checkmark-circle-outline', color: '#10B981' },
            ];
        } else {
            const club = (dashboardData?.clubStats || []).find(c => c.clubId === selectedClubId);
            if (!club) return [];
            return [
                { label: 'Upcoming', value: club.stats?.upcomingMeetings || 0, icon: 'calendar-outline', color: '#0EA5E9' },
                { label: 'Tasks', value: club.stats?.pendingTasks || 0, icon: 'list-outline', color: '#F59E0B' },
                { label: 'Attendance', value: club.stats?.attendanceRate || '0%', icon: 'checkmark-circle-outline', color: '#10B981' },
            ];
        }
    };

    const getTimePeriod = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        else if (hour >= 12 && hour < 17) return 'afternoon';
        else return 'evening';
    };

    const isBirthday = React.useMemo(() => {
        if (!user?.birthDate) return false;
        const bday = new Date(user.birthDate);
        const today = new Date();
        return bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
    }, [user?.birthDate]);

    const loadGreeting = async () => {
        const currentPeriod = getTimePeriod();
        const storedPeriod = await AsyncStorage.getItem('greetingPeriod');
        const storedGreeting = await AsyncStorage.getItem('greetingMessage');

        // If period changed or no stored greeting, generate new one
        if (storedPeriod !== currentPeriod || !storedGreeting) {
            const morningGreetings = [
                "Rise and shine!",
                "Good morning!",
                "Start your day strong!",
                "Morning, champion!",
                "Hello, early bird!",
                "Fresh start ahead!"
            ];
            const afternoonGreetings = [
                "Good afternoon!",
                "Keep pushing forward!",
                "Afternoon, achiever!",
                "Stay productive!",
                "Halfway there!",
                "Power through!"
            ];
            const eveningGreetings = [
                "Good evening!",
                "Wind down well!",
                "Evening, star!",
                "Reflect and relax!",
                "Great work today!",
                "Almost there!"
            ];

            let greetings;
            if (currentPeriod === 'morning') greetings = morningGreetings;
            else if (currentPeriod === 'afternoon') greetings = afternoonGreetings;
            else greetings = eveningGreetings;

            const newGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            await AsyncStorage.setItem('greetingPeriod', currentPeriod);
            await AsyncStorage.setItem('greetingMessage', newGreeting);
            setGreeting(newGreeting);
        } else {
            setGreeting(storedGreeting);
        }
    };

    React.useEffect(() => {
        loadGreeting();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            fetchDashboardData();
        }, [fetchDashboardData])
    );

    // Sync with global club selection when it changes from other screens
    // Sync with global club selection
    React.useEffect(() => {
        // Only show loading if we don't have stats for this club yet
        if (selectedClubId !== 'all' && !dashboardData.clubStats.find(c => c.clubId === selectedClubId)) {
            setLoading(true);
        }
        fetchDashboardData(true); // Don't re-fetch gallery when switching clubs
    }, [selectedClubId, fetchDashboardData]);

    React.useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => fetchDashboardData();
        socket.on('attendance_started', handleUpdate);
        socket.on('attendance_marked', handleUpdate);
        socket.on('attendance_updated_manual', handleUpdate);
        socket.on('meeting_created', handleUpdate);
        socket.on('task_assigned', handleUpdate);
        return () => {
            socket.off('attendance_started', handleUpdate);
            socket.off('attendance_marked', handleUpdate);
            socket.off('attendance_updated_manual', handleUpdate);
            socket.off('meeting_created', handleUpdate);
            socket.off('task_assigned', handleUpdate);
        };
    }, [socket, fetchDashboardData]);

    const handleClubSwipe = (direction) => {
        const clubs = [{ clubId: 'all', clubName: 'Global' }, ...dashboardData.clubStats];
        if (clubs.length <= 1) return;

        const currentIndex = clubs.findIndex(c => c.clubId === selectedClubId);
        if (currentIndex === -1) return;

        let nextIndex;
        if (direction === 'left') {
            nextIndex = (currentIndex + 1) % clubs.length;
        } else {
            nextIndex = (currentIndex - 1 + clubs.length) % clubs.length;
        }

        updateSelectedClub(clubs[nextIndex].clubId);
    };

    const onSwipeGestureEvent = (event) => {
        if (event.nativeEvent.state === State.END) {
            const { translationX, velocityX } = event.nativeEvent;

            // Require both enough translation and enough velocity to prevent accidental swipes
            if (Math.abs(translationX) > 80 && Math.abs(velocityX) > 500) {
                if (translationX > 0) {
                    handleClubSwipe('right');
                } else {
                    handleClubSwipe('left');
                }
            }
        }
    };

    // Shimmer animation for skeletons
    const shimmerAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmerAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(shimmerAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [loading]);

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-300, 300],
    });

    const ShimmerSkeleton = ({ width, height, borderRadius = 8, style }) => (
        <View style={[styles.skeleton, { width, height, borderRadius, overflow: 'hidden' }, style]}>
            <Animated.View
                style={[
                    styles.shimmer,
                    {
                        transform: [{ translateX: shimmerTranslate }],
                    },
                ]}
            />
        </View>
    );

    if (loading) {
        return (
            <MainLayout navigation={navigation} currentRoute="Dashboard" title="Dashboard">
                <PanGestureHandler
                    onHandlerStateChange={onSwipeGestureEvent}
                    activeOffsetX={[-20, 20]}
                    failOffsetY={[-20, 20]}
                >
                    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                        {/* Actual Header - Not Loading */}
                        <View style={styles.header}>
                            <Text style={styles.greetingText}>{greeting}</Text>
                            <Text style={styles.nameText}>{user?.displayName || 'Maverick'}</Text>
                        </View>

                        {/* Skeleton Carousel - Loading with Shimmer */}
                        <View style={styles.carouselSection}>
                            <View style={styles.carouselHeader}>
                                <Text style={styles.carouselTitle}>Recent Gallery</Text>
                                <Text style={styles.viewAll}>View all</Text>
                            </View>
                            <ShimmerSkeleton width={width - 48} height={200} borderRadius={20} />
                            <View style={styles.pagination}>
                                {[1, 2, 3, 4].map((_, i) => (
                                    <ShimmerSkeleton key={i} width={8} height={8} borderRadius={4} />
                                ))}
                            </View>
                        </View>

                        {/* Skeleton Filter - Loading with Shimmer */}
                        <View style={styles.filterContainer}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {[1, 2, 3].map((_, i) => (
                                    <ShimmerSkeleton key={i} width={80} height={36} borderRadius={24} />
                                ))}
                            </View>
                        </View>

                        {/* Skeleton Stats Grid - Loading with Shimmer */}
                        <View style={styles.statsGrid}>
                            {[1, 2, 3, 4].map((_, i) => (
                                <View key={i} style={styles.statCard}>
                                    <ShimmerSkeleton width={44} height={44} borderRadius={12} style={{ marginBottom: 16 }} />
                                    <ShimmerSkeleton width={60} height={28} borderRadius={6} style={{ marginBottom: 8 }} />
                                    <ShimmerSkeleton width={80} height={16} borderRadius={4} />
                                </View>
                            ))}
                        </View>

                        {/* Skeleton Meetings - Loading with Shimmer */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recent Meetings</Text>
                                <Text style={styles.viewAll}>View all</Text>
                            </View>
                            {[1, 2, 3].map((_, i) => (
                                <View key={i} style={styles.meetingItem}>
                                    <ShimmerSkeleton width={56} height={56} borderRadius={14} style={{ marginRight: 16 }} />
                                    <View style={{ flex: 1 }}>
                                        <ShimmerSkeleton width="80%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                                        <ShimmerSkeleton width="60%" height={14} borderRadius={4} />
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Actual Quick Actions - Not Loading */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Quick Actions</Text>
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Tasks')}>
                                    <Ionicons name="checkbox-outline" size={24} color="#0A66C2" />
                                    <Text style={styles.actionBtnText}>Tasks</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Analytics')}>
                                    <Ionicons name="bar-chart-outline" size={24} color="#0A66C2" />
                                    <Text style={styles.actionBtnText}>Insights</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => setScanModalVisible(true)}>
                                    <Ionicons name="qr-code-outline" size={24} color="#0A66C2" />
                                    <Text style={styles.actionBtnText}>Scan QR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Profile')}>
                                    <Ionicons name="person-outline" size={24} color="#0A66C2" />
                                    <Text style={styles.actionBtnText}>Profile</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </PanGestureHandler>
            </MainLayout>
        );
    }

    const stats = getCurrentStats();

    return (
        <MainLayout navigation={navigation} currentRoute="Dashboard" title="Dashboard">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Minimal Header */}
                <View style={styles.header}>
                    <Text style={styles.greetingText}>{greeting}</Text>
                    <Text style={styles.nameText}>{user?.displayName || 'Maverick'}</Text>
                </View>

                {/* Birthday Cards Section */}
                {/* 1. Self Birthday */}
                {isBirthday && (
                    <View style={styles.bdayCard}>
                        <LinearGradient
                            colors={['#F59E0B', '#FBBF24']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.bdayBorder}
                        />
                        <View style={styles.bdayContent}>
                            <View style={styles.bdayIconBox}>
                                <Ionicons name="gift" size={24} color="#D97706" />
                            </View>
                            <View style={styles.bdayTextBox}>
                                <Text style={styles.bdayTitle}>Happy Birthday to You! 🎂</Text>
                                <Text style={styles.bdayText}>
                                    Have a wonderful day, {user?.displayName}!
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 2. Other Members Birthdays */}
                {dashboardData.birthdays && dashboardData.birthdays
                    .filter(bdayUser => bdayUser._id.toString() !== user?._id?.toString())
                    .map((bdayUser) => (
                        <View key={bdayUser._id} style={styles.bdayCard}>
                            <LinearGradient
                                colors={['#EC4899', '#F472B6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.bdayBorder}
                            />
                            <View style={styles.bdayContent}>
                                <View style={[styles.bdayIconBox, { backgroundColor: '#FDF2F8' }]}>
                                    <Ionicons name="gift-outline" size={24} color="#DB2777" />
                                </View>
                                <View style={styles.bdayTextBox}>
                                    <Text style={styles.bdayTitle}>Happy Birthday, {bdayUser.displayName}! 🎈</Text>
                                    <Text style={styles.bdayText}>
                                        Wishing them a fantastic year ahead!
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}

                {/* Gallery Carousel */}
                {recentImages.length > 0 && (
                    <View style={styles.carouselSection}>
                        <View style={styles.carouselHeader}>
                            <Text style={styles.carouselTitle}>Recent Gallery</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Gallery')}>
                                <Text style={styles.viewAll}>View all</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            ref={sliderRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                { useNativeDriver: false }
                            )}
                            scrollEventThrottle={16}
                            onMomentumScrollEnd={(e) => {
                                const CARD_WIDTH = width * 0.85;
                                const SPACING = 12;
                                const SNAP_INTERVAL = CARD_WIDTH + SPACING;
                                const index = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
                                setCurrentImageIndex(index);
                            }}
                            snapToInterval={width * 0.85 + 12}
                            snapToAlignment="center"
                            decelerationRate="fast"
                            style={styles.carousel}
                            contentContainerStyle={{ paddingHorizontal: width * 0.075 }} // Centers the first card perfectly
                        >
                            {recentImages.map((image, index) => (
                                <TouchableOpacity
                                    key={image._id}
                                    style={[
                                        styles.carouselItem,
                                        {
                                            width: width * 0.85,
                                            height: (width * 0.85) * 0.6,
                                            marginRight: index === recentImages.length - 1 ? 0 : 12
                                        }
                                    ]}
                                    onPress={() => navigation.navigate('Gallery', { imageId: image._id })}
                                >
                                    <Image
                                        source={{ uri: image.imageUrl }}
                                        style={styles.carouselImage}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.pagination}>
                            {recentImages.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.paginationDot,
                                        index === currentImageIndex && styles.paginationDotActive
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Club Filter Tags */}
                <View style={styles.filterContainer}>
                    <ScrollView
                        ref={clubScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScroll}
                    >
                        <TouchableOpacity
                            style={[styles.filterChip, selectedClubId === 'all' && styles.filterChipActive]}
                            onPress={() => updateSelectedClub('all')}
                            onLayout={(event) => {
                                clubLayouts.current['all'] = event.nativeEvent.layout;
                            }}
                        >
                            <Text style={[styles.filterChipText, selectedClubId === 'all' && styles.filterChipTextActive]}>
                                Global
                            </Text>
                        </TouchableOpacity>
                        {dashboardData.clubStats.map(club => (
                            <TouchableOpacity
                                key={club.clubId}
                                style={[styles.filterChip, selectedClubId === club.clubId && styles.filterChipActive]}
                                onPress={() => updateSelectedClub(club.clubId)}
                                onLayout={(event) => {
                                    clubLayouts.current[club.clubId.toString()] = event.nativeEvent.layout;
                                }}
                            >
                                <Text style={[styles.filterChipText, selectedClubId === club.clubId && styles.filterChipTextActive]}>
                                    {club.clubName}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Swipeable Content Area */}
                <PanGestureHandler
                    onHandlerStateChange={onSwipeGestureEvent}
                    activeOffsetX={[-20, 20]}
                    failOffsetY={[-20, 20]}
                >
                    <View>
                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            {stats.map((stat, index) => (
                                <View key={index} style={styles.statCard}>
                                    {Platform.OS === 'web' ? (
                                        <View style={[styles.iconBox, { backgroundColor: stat.color + '10' }]}>
                                            <Ionicons name={stat.icon} size={20} color={stat.color} />
                                        </View>
                                    ) : (
                                        <Ionicons name={stat.icon} size={28} color={stat.color} style={{ marginBottom: 12 }} />
                                    )}
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Recent Activity Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recent Meetings</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Meetings')}>
                                    <Text style={styles.viewAll}>View all</Text>
                                </TouchableOpacity>
                            </View>

                            {dashboardData.recentMeetings.length > 0 ? (
                                dashboardData.recentMeetings
                                    .filter(m => selectedClubId === 'all' || m.clubId?._id === selectedClubId || m.clubId === selectedClubId)
                                    .slice(0, 5).map((meeting, idx) => (
                                        <TouchableOpacity
                                            key={meeting._id || idx}
                                            style={styles.meetingItem}
                                            onPress={() => navigation.navigate('Meetings')}
                                        >
                                            <View style={[styles.meetingIcon, { backgroundColor: '#F0F9FF' }]}>
                                                <View style={styles.dateChip}>
                                                    <Text style={styles.dateChipDay}>
                                                        {new Date(meeting.date).getDate()}
                                                    </Text>
                                                    <Text style={styles.dateChipMonth}>
                                                        {new Date(meeting.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.meetingInfo}>
                                                <View style={styles.meetingTitleRow}>
                                                    <Text style={styles.meetingName} numberOfLines={1}>{meeting.name}</Text>
                                                    <View style={[
                                                        styles.attendanceBadge,
                                                        {
                                                            backgroundColor:
                                                                meeting.attendanceStatus === 'Attended' ? '#DCFCE7' :
                                                                    meeting.attendanceStatus === 'Not Attended' ? '#FEE2E2' :
                                                                        meeting.attendanceStatus === 'Upcoming' ? '#E0F2FE' : '#F1F5F9'
                                                        }
                                                    ]}>
                                                        <Text style={[
                                                            styles.attendanceBadgeText,
                                                            {
                                                                color:
                                                                    meeting.attendanceStatus === 'Attended' ? '#166534' :
                                                                        meeting.attendanceStatus === 'Not Attended' ? '#991B1B' :
                                                                            meeting.attendanceStatus === 'Upcoming' ? '#075985' : '#64748B'
                                                            }
                                                        ]}>
                                                            {meeting.attendanceStatus}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={styles.meetingMetaRow}>
                                                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                                    <Text style={styles.meetingMeta}>{meeting.time}</Text>
                                                    <View style={styles.metaDot} />
                                                    <Text style={styles.meetingClubName} numberOfLines={1}>{meeting.clubId?.name}</Text>
                                                </View>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                                        </TouchableOpacity>
                                    ))
                            ) : (
                                <View style={styles.emptyBox}>
                                    <Text style={styles.emptyText}>No recent meetings</Text>
                                </View>
                            )}
                        </View>

                        {/* Quick Actions */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Quick Actions</Text>
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Tasks')}>
                                    <Ionicons name="checkbox-outline" size={24} color="#0A66C2" />
                                    <Text style={styles.actionBtnText}>Tasks</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Analytics')}>
                                    <Ionicons name="bar-chart-outline" size={24} color="#0A66C2" />
                                    <Text style={styles.actionBtnText}>Insights</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => setScanModalVisible(true)}>
                                    <Ionicons name="qr-code-outline" size={24} color="#0A66C2" />
                                    <Text style={styles.actionBtnText}>Scan QR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Profile')}>
                                    <Ionicons name="person-outline" size={24} color="#0A66C2" />
                                    <Text style={styles.actionBtnText}>Profile</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </PanGestureHandler>

                <QRScannerModal
                    visible={scanModalVisible}
                    onClose={() => setScanModalVisible(false)}
                />

                {/* First Time Profile Prompt Modal */}
                <Modal
                    visible={profilePromptVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setProfilePromptVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Welcome, {user?.displayName}!</Text>
                            </View>

                            <Text style={styles.modalSubtitle}>
                                We've assigned you a random avatar. Do you want to keep this look or choose your own?
                            </Text>

                            <View style={styles.promptAvatarContainer}>
                                <Image
                                    source={{
                                        uri: user?.profilePicture?.url || `https://api.dicebear.com/9.x/notionists/png?seed=${user?._id}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                                    }}
                                    style={styles.promptAvatar}
                                />
                            </View>

                            <View style={styles.promptButtonRow}>
                                <TouchableOpacity
                                    style={styles.promptButtonSecondary}
                                    onPress={() => setProfilePromptVisible(false)}
                                >
                                    <Text style={styles.promptButtonTextSecondary}>It looks cool!</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.promptButtonPrimary}
                                    onPress={() => {
                                        setProfilePromptVisible(false);
                                        navigation.navigate('Profile', { openAvatarModal: true });
                                    }}
                                >
                                    <Text style={styles.promptButtonTextPrimary}>Customize</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Banner Customization Prompt Modal */}
                <Modal
                    visible={bannerPromptVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setBannerPromptVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Customize Your Experience!</Text>
                            </View>

                            <Text style={styles.modalSubtitle}>
                                Did you know you can personalize your sidebar with premium banners? Make the app truly yours!
                            </Text>

                            <View style={styles.promptButtonRow}>
                                <TouchableOpacity
                                    style={styles.promptButtonSecondary}
                                    onPress={() => setBannerPromptVisible(false)}
                                >
                                    <Text style={styles.promptButtonTextSecondary}>Maybe Later</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.promptButtonPrimary}
                                    onPress={() => {
                                        setBannerPromptVisible(false);
                                        navigation.navigate('Settings', { openBannerModal: true });
                                    }}
                                >
                                    <Text style={styles.promptButtonTextPrimary}>Customize Now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>

            {/* Floating Notes Button */}
            <TouchableOpacity
                style={styles.floatingNotesBtn}
                onPress={() => navigation.navigate('LiveNotes')}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={['#0A66C2', '#0E76A8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.floatingNotesBtnGradient}
                >
                    <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>
        </MainLayout >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        padding: 24,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    header: {
        marginBottom: 32,
    },
    greetingText: {
        fontSize: 18,
        color: '#0A66C2',
        fontWeight: '600',
    },
    nameText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 4,
    },
    bdayCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        position: 'relative',
        flexDirection: 'row',
    },
    bdayBorder: {
        width: 6,
        height: '100%',
    },
    bdayContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    bdayIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    bdayTextBox: {
        flex: 1,
    },
    bdayTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    bdayText: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    carouselSection: {
        marginBottom: 24,
    },
    carouselHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    carouselTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    carousel: {
        marginBottom: 16,
    },
    carouselItem: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        elevation: 8,
        shadowColor: '#0A66C2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    carouselImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F1F5F9',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#CBD5E1',
        transition: 'all 0.3s ease',
    },
    paginationDotActive: {
        width: 24,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0A66C2',
    },
    filterContainer: {
        marginBottom: 20,
    },
    filterScroll: {
        paddingHorizontal: 0,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    filterChipActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
        elevation: 4,
        shadowColor: '#0A66C2',
        shadowOpacity: 0.2,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 4,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    modalHeader: {
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E293B',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    promptAvatarContainer: {
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    promptAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    promptButtonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    promptButtonPrimary: {
        flex: 1,
        backgroundColor: '#0A66C2',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    promptButtonSecondary: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    promptButtonTextPrimary: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    promptButtonTextSecondary: {
        color: '#475569',
        fontWeight: '600',
        fontSize: 16,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    viewAll: {
        fontSize: 14,
        color: '#0A66C2',
        fontWeight: '600',
    },
    meetingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    meetingIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        elevation: 2,
        shadowColor: '#0A66C2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dateChip: {
        alignItems: 'center',
    },
    dateChipDay: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0A66C2',
    },
    dateChipMonth: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        marginTop: 2,
    },
    meetingInfo: {
        flex: 1,
    },
    meetingTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    meetingName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        flex: 1,
    },
    attendanceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 8,
    },
    attendanceBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    meetingMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    meetingMeta: {
        fontSize: 12,
        color: '#64748B',
        marginLeft: 4,
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#CBD5E1',
        marginHorizontal: 8,
    },
    meetingClubName: {
        fontSize: 12,
        color: '#0A66C2',
        fontWeight: '500',
    },
    emptyBox: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F9FF',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    actionBtnText: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '600',
        color: '#0A66C2',
    },
    skeleton: {
        backgroundColor: '#E8EDF2',
        position: 'relative',
    },
    shimmer: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        position: 'absolute',
        top: 0,
        left: 0,
        transform: [{ skewX: '-20deg' }],
    },
    floatingNotesBtn: {
        position: 'absolute',
        bottom: 125,
        right: 24,
        borderRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 999,
    },
    floatingNotesBtnGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default DashboardScreen;
