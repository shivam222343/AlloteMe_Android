import React from 'react';
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
} from 'react-native';
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
    const [bannerPromptVisible, setBannerPromptVisible] = React.useState(false);

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

    const fetchDashboardData = React.useCallback(async () => {
        try {
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
        } catch (error) {
            console.error('Fetch dashboard data error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const getCurrentStats = () => {
        if (selectedClubId === 'all') {
            return [
                { label: 'Clubs', value: dashboardData.globalStats.clubsJoined, icon: 'business-outline', color: '#6366F1' },
                { label: 'Meetings', value: dashboardData.globalStats.upcomingMeetings, icon: 'calendar-outline', color: '#0EA5E9' },
                { label: 'Tasks', value: dashboardData.globalStats.pendingTasks, icon: 'list-outline', color: '#F59E0B' },
                { label: 'Attendance', value: dashboardData.globalStats.attendanceRate, icon: 'checkmark-circle-outline', color: '#10B981' },
            ];
        } else {
            const club = dashboardData.clubStats.find(c => c.clubId === selectedClubId);
            if (!club) return [];
            return [
                { label: 'Upcoming', value: club.stats.upcomingMeetings, icon: 'calendar-outline', color: '#0EA5E9' },
                { label: 'Tasks', value: club.stats.pendingTasks, icon: 'list-outline', color: '#F59E0B' },
                { label: 'Attendance', value: club.stats.attendanceRate, icon: 'checkmark-circle-outline', color: '#10B981' },
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
        setLoading(true);
        fetchDashboardData();
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

    if (loading) {
        return (
            <MainLayout navigation={navigation} currentRoute="Dashboard" title="Dashboard">
                <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                    {/* Actual Header - Not Loading */}
                    <View style={styles.header}>
                        <Text style={styles.greetingText}>{greeting}</Text>
                        <Text style={styles.nameText}>{user?.displayName || 'Maverick'}</Text>
                    </View>

                    {/* Skeleton Carousel - Loading */}
                    <View style={styles.carouselSection}>
                        <View style={styles.carouselHeader}>
                            <Text style={styles.carouselTitle}>Recent Gallery</Text>
                            <Text style={styles.viewAll}>View all</Text>
                        </View>
                        <View style={[styles.skeleton, { width: width - 48, height: 200, borderRadius: 16 }]} />
                        <View style={styles.pagination}>
                            {[1, 2, 3, 4].map((_, i) => (
                                <View key={i} style={[styles.skeleton, { width: 6, height: 6, borderRadius: 3 }]} />
                            ))}
                        </View>
                    </View>

                    {/* Skeleton Filter - Loading */}
                    <View style={styles.filterContainer}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {[1, 2, 3].map((_, i) => (
                                <View key={i} style={[styles.skeleton, { width: 80, height: 32, borderRadius: 20 }]} />
                            ))}
                        </View>
                    </View>

                    {/* Skeleton Stats Grid - Loading */}
                    <View style={styles.statsGrid}>
                        {[1, 2, 3, 4].map((_, i) => (
                            <View key={i} style={styles.statCard}>
                                <View style={[styles.skeleton, { width: 36, height: 36, borderRadius: 10, marginBottom: 12 }]} />
                                <View style={[styles.skeleton, { width: 50, height: 24, marginBottom: 4 }]} />
                                <View style={[styles.skeleton, { width: 70, height: 14 }]} />
                            </View>
                        ))}
                    </View>

                    {/* Skeleton Meetings - Loading */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Meetings</Text>
                            <Text style={styles.viewAll}>View all</Text>
                        </View>
                        {[1, 2, 3].map((_, i) => (
                            <View key={i} style={styles.meetingItem}>
                                <View style={[styles.skeleton, { width: 48, height: 48, borderRadius: 12, marginRight: 16 }]} />
                                <View style={{ flex: 1 }}>
                                    <View style={[styles.skeleton, { width: '80%', height: 16, marginBottom: 6 }]} />
                                    <View style={[styles.skeleton, { width: '60%', height: 12 }]} />
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <TouchableOpacity
                            style={[styles.filterChip, selectedClubId === 'all' && styles.filterChipActive]}
                            onPress={() => updateSelectedClub('all')}
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
                            >
                                <Text style={[styles.filterChipText, selectedClubId === club.clubId && styles.filterChipTextActive]}>
                                    {club.clubName}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <View key={index} style={styles.statCard}>
                            <View style={[styles.iconBox, { backgroundColor: stat.color + '10' }]}>
                                <Ionicons name={stat.icon} size={20} color={stat.color} />
                            </View>
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
                                        navigation.navigate('Settings', { openBannerModal: true });
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
        </MainLayout>
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
        marginBottom: 12,
    },
    carouselItem: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    carouselImage: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    paginationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#CBD5E1',
    },
    paginationDotActive: {
        width: 20,
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
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterChipActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
    },
    statLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 2,
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
        paddingVertical: 12,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    meetingIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    dateChip: {
        alignItems: 'center',
    },
    dateChipDay: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0A66C2',
    },
    dateChipMonth: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
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
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
        opacity: 0.6,
    },
});

export default DashboardScreen;
