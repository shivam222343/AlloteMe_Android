import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, FlatList, Image, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import {
    Search, LayoutGrid, Cpu, MapPin,
    MessageSquare, Bookmark, GraduationCap, TrendingUp, Star, Settings, Bot, Info, Pencil, Target
} from 'lucide-react-native';
import { institutionAPI } from '../services/api';
import VerificationBanner from '../components/ui/VerificationBanner';
import VerificationModal from '../components/ui/VerificationModal';
import RatingSection from '../components/ui/RatingSection';
import TestimonialSlider from '../components/ui/TestimonialSlider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 32;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12 - 4) / 2; // Extra buffer for rounding

const StudentDashboard = ({ navigation }) => {
    useFocusEffect(
        useCallback(() => {
            fetchFeatured();
        }, [])
    );

    const { user, hasSkippedProfile, socket, refreshUser, admissionPath, setAdmissionPath } = useAuth();
    const [featuredColleges, setFeaturedColleges] = useState([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const flatListRef = React.useRef(null);
    const pathScrollRef = React.useRef(null);

    const ADMISSION_PATHS = ['MHTCET PCM', 'MHTCET PCB', 'BBA', 'NEET', 'JEE'];

    useEffect(() => {
        if (socket) {
            const handleRefresh = () => fetchFeatured();
            socket.on('institution:updated', handleRefresh);
            socket.on('institution:created', handleRefresh);
            socket.on('institution:deleted', handleRefresh);
            return () => {
                socket.off('institution:updated', handleRefresh);
                socket.off('institution:created', handleRefresh);
                socket.off('institution:deleted', handleRefresh);
            };
        }
    }, [socket, admissionPath]);

    useEffect(() => {
        if (user && !user.isVerified && !user.phoneNumber) {
            setShowVerificationModal(true);
        }
    }, [user?.isVerified, user?.phoneNumber]);

    useEffect(() => {
        if (user?.role === 'student' && !user?.preferences?.isProfileComplete && !hasSkippedProfile) {
            navigation.navigate('CompleteProfile');
        }
    }, [user, hasSkippedProfile]);

    useFocusEffect(
        useCallback(() => {
            fetchFeatured();
        }, [admissionPath])
    );

    useEffect(() => {
        const index = ADMISSION_PATHS.indexOf(admissionPath);
        if (index !== -1 && pathScrollRef.current) {
            // Magnetic slide to the selected tag
            const chipWidth = 100; // Average chip width with margin
            pathScrollRef.current.scrollTo({
                x: Math.max(0, (index * chipWidth) - (Dimensions.get('window').width / 2) + (chipWidth / 2)),
                animated: true
            });
        }
    }, [admissionPath]);

    useEffect(() => {
        if (featuredColleges.length > 0) {
            const timer = setInterval(() => {
                let nextIndex = currentIndex + 1;
                if (nextIndex >= featuredColleges.length) {
                    nextIndex = 0;
                }
                setCurrentIndex(nextIndex);
                flatListRef.current?.scrollToIndex({
                    index: nextIndex,
                    animated: true
                });
            }, 4500); // Increased to 4.5s for readability
            return () => clearInterval(timer);
        }
    }, [currentIndex, featuredColleges]);

    const fetchFeatured = async () => {
        setLoadingFeatured(true);
        try {
            const res = await institutionAPI.getFeatured(admissionPath);
            setFeaturedColleges(res.data);
            setCurrentIndex(0); // Reset index on path change
        } catch (error) {
            console.error('Featured fetch error:', error);
        } finally {
            setLoadingFeatured(false);
        }
    };

    const handleScroll = (event) => {
        const slideSize = SLIDER_WIDTH - 20 + 16; // Card width + marginRight
        const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    const getPathScore = () => {
        // Check new multi-score map first
        if (user?.scores && user.scores[admissionPath]) {
            const s = user.scores[admissionPath];
            return s.percentile ? `${s.percentile}%` : 'Not Set';
        }

        const matchesPath = (user?.examType === admissionPath) ||
            (admissionPath === 'MHTCET PCM' && (user?.examType === 'MHTCET' || user?.examType === 'Engineering')) ||
            (admissionPath === 'MHTCET PCB' && (user?.examType === 'Pharmacy'));

        if (matchesPath) {
            return user?.percentile ? `${user.percentile}%` : 'Not Set';
        }
        return 'Not Set';
    };

    const getPathRank = () => {
        // Check new multi-score map first
        if (user?.scores && user.scores[admissionPath]) {
            const s = user.scores[admissionPath];
            return s.rank || 'Not Set';
        }

        const matchesPath = (user?.examType === admissionPath) ||
            (admissionPath === 'MHTCET PCM' && (user?.examType === 'MHTCET' || user?.examType === 'Engineering')) ||
            (admissionPath === 'MHTCET PCB' && (user?.examType === 'Pharmacy'));

        if (matchesPath) {
            return user?.rank || 'Not Set';
        }
        return 'Not Set';
    };

    const stats = [
        { label: `${admissionPath} Percentile`, value: getPathScore(), icon: TrendingUp, color: Colors.primary, isEditable: getPathScore() === 'Not Set' },
        { label: `${admissionPath} Rank`, value: getPathRank(), icon: GraduationCap, color: '#10B981', isEditable: getPathRank() === 'Not Set' },
        { label: 'Saved', value: user?.savedColleges?.length || 0, icon: Bookmark, color: '#F59E0B', route: 'BrowseColleges' },
        { label: 'Settings', value: 'Manage', icon: Settings, color: '#8B5CF6', route: 'Settings' },
    ];

    const menuItems = [
        { label: 'Browse Colleges', icon: Search, sub: 'Explore 500+ institutes', route: 'BrowseColleges' },
        { label: 'College Predictor', icon: Target, sub: 'Check your chances', route: 'Predictor', highlight: true },
        { label: 'Eta AI Counselor', icon: Bot, sub: '24/7 AI Guidance', route: 'AICounselor' },
        { label: 'Nearby Colleges', icon: MapPin, sub: 'Find local institutes', route: 'NearbyColleges' },
        { label: 'Connect Counselor', icon: MessageSquare, sub: 'Chat with experts', route: 'Counselors' },
        { label: 'App Settings', icon: Settings, sub: 'Profile & Preferences', route: 'Settings' },
    ];

    const renderFeaturedCard = ({ item }) => {
        const institutionImage = item.bannerUrl || (item.galleryImages && item.galleryImages.length > 0 ? item.galleryImages[0] : 'https://images.unsplash.com/photo-1541339907198-e08756eaa589?q=80&w=400');

        return (
            <TouchableOpacity
                style={styles.featuredCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}
            >
                <Image
                    source={{ uri: institutionImage }}
                    style={styles.featuredImage}
                />
                <View style={styles.imageOverlay} />
                <View style={styles.featuredContent}>
                    <View style={styles.featuredHeader}>
                        <View style={styles.ratingBadge}>
                            <Star size={10} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.ratingValue}>{item.rating?.value || '4.5'}</Text>
                        </View>
                    </View>
                    <View style={styles.featuredFooter}>
                        <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.featuredLocRow}>
                            <MapPin size={10} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.featuredLocText}>{item.location?.city || 'Verified'}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const StatCard = ({ item }) => {
        const Icon = item.icon;
        return (
            <TouchableOpacity
                style={[styles.statCard, item.isEditable && styles.statCardEditable]}
                onPress={() => {
                    if (item.isEditable) {
                        navigation.navigate('Profile', { autoOpenEdit: true, admissionPath });
                    } else if (item.route) {
                        navigation.navigate(item.route);
                    }
                }}
            >
                <View style={[styles.statIcon, { backgroundColor: item.color + '15' }]}>
                    <Icon size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statVal} numberOfLines={1}>{item.value}</Text>
                    <Text style={styles.statLab} numberOfLines={1}>{item.label}</Text>
                </View>
                {item.isEditable && (
                    <View style={styles.editBadge}>
                        <Pencil size={8} color={Colors.white} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const GridItem = ({ item }) => {
        const Icon = item.icon;
        return (
            <TouchableOpacity
                style={[styles.gridCard, item.highlight && styles.premiumGridCard]}
                onPress={() => navigation.navigate(item.route)}
                activeOpacity={0.7}
            >
                {item.highlight && <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PREMIUM</Text></View>}
                <View style={[styles.gridIconBox, item.highlight && styles.premiumIconBox]}>
                    <Icon size={24} color={Colors.primary} />
                </View>
                <Text style={styles.gridLabel}>{item.label}</Text>
                <Text style={styles.gridSub}>{item.sub}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <MainLayout title="Dashboard" hideBack>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={[styles.welcomeSection, { marginBottom: 12 }]}>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.nameText}>{user?.displayName} 👋</Text>
                </View>

                {/* Admission Path Selector */}
                <View style={styles.pathSelectorContainer}>
                    <ScrollView
                        ref={pathScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pathList}
                        decelerationRate="fast"
                    >
                        {ADMISSION_PATHS.map((path) => (
                            <TouchableOpacity
                                key={path}
                                style={[styles.pathChip, admissionPath === path && styles.activePathChip]}
                                onPress={() => setAdmissionPath(path)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.pathText, admissionPath === path && styles.activePathText]}>
                                    {path}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {loadingFeatured ? (
                    <View style={[styles.featuredSection, { height: 180, justifyContent: 'center' }]}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                ) : featuredColleges.length > 0 ? (
                    <View style={styles.featuredSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{admissionPath} Trends</Text>
                            <View style={styles.dotContainer}>
                                {featuredColleges.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.indicatorDot,
                                            currentIndex === i && styles.activeDot
                                        ]}
                                    />
                                ))}
                            </View>
                        </View>
                        <FlatList
                            ref={flatListRef}
                            horizontal
                            data={featuredColleges}
                            renderItem={renderFeaturedCard}
                            keyExtractor={item => item._id}
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={SLIDER_WIDTH - 20 + 16}
                            snapToAlignment="start"
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                            decelerationRate="fast"
                            contentContainerStyle={styles.featuredList}
                            getItemLayout={(data, index) => ({
                                length: SLIDER_WIDTH - 20 + 16,
                                offset: (SLIDER_WIDTH - 20 + 16) * index,
                                index,
                            })}
                        />
                    </View>
                ) : (
                    <View style={styles.emptyFeatured}>
                        <Info size={24} color={Colors.text.tertiary} />
                        <Text style={styles.emptyFeaturedText}>No featured {admissionPath} colleges at the moment.</Text>
                    </View>
                )}

                <View style={styles.statsRow}>
                    {stats.map((s, i) => <StatCard key={i} item={s} />)}
                </View>

                <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                    <Text style={styles.sectionTitle}>Counseling Tools</Text>
                </View>

                <View style={styles.grid}>
                    {menuItems.map((item, index) => <GridItem key={index} item={item} />)}
                </View>

                <View style={styles.promoCard}>
                    <View style={styles.promoInfo}>
                        <Text style={styles.promoTitle}>Need Admission Help?</Text>
                        <Text style={styles.promoSub}>Connect with senior counselors for direct guidance.</Text>
                        <TouchableOpacity style={styles.promoBtn} onPress={() => navigation.navigate('Counselors')}>
                            <Text style={styles.promoBtnText}>Contact Now</Text>
                        </TouchableOpacity>
                    </View>
                    <GraduationCap size={60} color={Colors.white} style={styles.promoIcon} />
                </View>

                <View style={{ marginTop: 24 }}>
                    <TestimonialSlider />
                </View>

                <View style={{ marginTop: 8 }}>
                    <RatingSection />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <VerificationModal
                visible={showVerificationModal}
                user={user}
                onVerified={refreshUser}
                onClose={() => setShowVerificationModal(false)}
            />
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 8 },
    welcomeSection: { marginBottom: 20, marginTop: 8 },
    welcomeText: { fontSize: 16, color: Colors.text.tertiary },
    nameText: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary, marginTop: 4 },

    pathSelectorContainer: { marginBottom: 24, marginTop: 8 },
    pathList: { paddingHorizontal: 16, gap: 10 },
    pathChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        borderWidth: 1.5,
        borderColor: '#E2E8F0'
    },
    activePathChip: {
        backgroundColor: Colors.primary + '15',
        borderColor: Colors.primary,
    },
    pathText: { fontSize: 13, fontWeight: '600', color: Colors.text.tertiary },
    activePathText: { color: Colors.primary },

    // Featured Slider
    featuredSection: { marginBottom: 32 },
    featuredList: { paddingHorizontal: 16 },
    featuredCard: {
        width: SLIDER_WIDTH - 20,
        height: 180,
        borderRadius: 24,
        marginRight: 16,
        overflow: 'hidden',
        backgroundColor: '#eee',
        ...Shadows.md
    },
    featuredImage: { width: '100%', height: '100%' },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    featuredContent: {
        ...StyleSheet.absoluteFillObject,
        padding: 20,
        justifyContent: 'space-between'
    },
    featuredHeader: { alignItems: 'flex-start' },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ratingValue: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
    featuredFooter: {},
    featuredName: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
    featuredLocRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    featuredLocText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
    statCard: {
        width: CARD_WIDTH, backgroundColor: Colors.white, padding: 12, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', gap: 10, ...Shadows.sm,
        borderWidth: 1.5, borderColor: Colors.primary
    },
    statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statVal: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    statLab: { fontSize: 11, color: Colors.text.tertiary },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    seeAll: { fontSize: 12, fontWeight: '600', color: Colors.primary },
    dotContainer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    indicatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
    activeDot: { width: 14, backgroundColor: Colors.primary, height: 6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridCard: {
        width: CARD_WIDTH, backgroundColor: Colors.white, padding: 12, borderRadius: 20,
        borderWidth: 1.5, borderColor: Colors.primary, ...Shadows.xs
    },
    gridIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    gridLabel: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    gridSub: { fontSize: 10, color: Colors.text.tertiary, marginTop: 4 },
    promoCard: {
        marginTop: 32, marginHorizontal: 16, backgroundColor: Colors.primary, borderRadius: 24,
        padding: 24, flexDirection: 'row', overflow: 'hidden'
    },
    promoInfo: { flex: 1, zIndex: 1 },
    promoTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
    promoSub: { fontSize: 12, color: Colors.white + 'CC', marginTop: 8, lineHeight: 18 },
    promoBtn: { backgroundColor: Colors.white, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30, marginTop: 16 },
    promoBtnText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },
    promoIcon: { position: 'absolute', right: -10, bottom: -10, opacity: 0.2 },

    // Premium Highlight Styles
    premiumGridCard: {
        backgroundColor: Colors.white,
        shadowColor: Colors.primary,
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    premiumIconBox: {
        backgroundColor: Colors.primary + '15',
    },
    premiumBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    premiumBadgeText: {
        color: Colors.white,
        fontSize: 8,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    emptyFeatured: {
        height: 180,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        marginHorizontal: 16,
        marginBottom: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed'
    },
    emptyFeaturedText: {
        marginTop: 10,
        fontSize: 13,
        color: Colors.text.tertiary,
        fontWeight: '500'
    },
    statCardEditable: {
        borderColor: Colors.primary,
        borderStyle: 'dashed',
        backgroundColor: Colors.primary + '05'
    },
    editBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.primary,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.white
    }
});

export default StudentDashboard;
