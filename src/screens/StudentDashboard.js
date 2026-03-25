import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, FlatList, Image, ActivityIndicator
} from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import {
    Search, LayoutGrid, Cpu, MapPin,
    MessageSquare, Bookmark, GraduationCap, TrendingUp, Star, Settings
} from 'lucide-react-native';
import { institutionAPI } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 32;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12 - 4) / 2; // Extra buffer for rounding

const StudentDashboard = ({ navigation }) => {
    const { user, hasSkippedProfile } = useAuth();
    const [featuredColleges, setFeaturedColleges] = useState([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = React.useRef(null);

    useEffect(() => {
        if (user?.role === 'student' && !user?.preferences?.isProfileComplete && !hasSkippedProfile) {
            navigation.navigate('CompleteProfile');
        }
        fetchFeatured();
    }, [user, hasSkippedProfile]);

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
            }, 3500);
            return () => clearInterval(timer);
        }
    }, [currentIndex, featuredColleges]);

    const fetchFeatured = async () => {
        try {
            const res = await institutionAPI.getFeatured();
            setFeaturedColleges(res.data);
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

    const stats = [
        { label: 'Percentile', value: user?.percentile ? `${user.percentile}%` : '0.0%', icon: TrendingUp, color: Colors.primary },
        { label: 'Rank', value: user?.rank || 'N/A', icon: GraduationCap, color: '#10B981' },
        { label: 'Saved', value: user?.savedColleges?.length || 0, icon: Bookmark, color: '#F59E0B' },
        { label: 'Settings', value: 'Manage', icon: Settings, color: '#8B5CF6', route: 'Settings' },
    ];

    const menuItems = [
        { label: 'Browse Colleges', icon: Search, sub: 'Explore 500+ institutes', route: 'BrowseColleges' },
        { label: 'College Predictor', icon: LayoutGrid, sub: 'Check your chances', route: 'Predictor' },
        { label: 'AI Counselor', icon: Cpu, sub: '24/7 AI Guidance', route: 'AICounselor' },
        { label: 'Nearby Colleges', icon: MapPin, sub: 'Find local institutes', route: 'NearbyColleges' },
        { label: 'Connect Counselor', icon: MessageSquare, sub: 'Chat with experts', route: 'ConnectCounselor' },
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
                style={styles.statCard}
                onPress={() => item.route && navigation.navigate(item.route)}
                disabled={!item.route}
            >
                <View style={[styles.statIcon, { backgroundColor: item.color + '15' }]}>
                    <Icon size={20} color={item.color} />
                </View>
                <View>
                    <Text style={styles.statVal}>{item.value}</Text>
                    <Text style={styles.statLab}>{item.label}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const GridItem = ({ item }) => {
        const Icon = item.icon;
        return (
            <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate(item.route)}
                activeOpacity={0.7}
            >
                <View style={styles.gridIconBox}>
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
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.nameText}>{user?.displayName} 👋</Text>
                </View>

                {featuredColleges.length > 0 && (
                    <View style={styles.featuredSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Top Trending Colleges</Text>
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
                        <TouchableOpacity style={styles.promoBtn} onPress={() => navigation.navigate('ConnectCounselor')}>
                            <Text style={styles.promoBtnText}>Contact Now</Text>
                        </TouchableOpacity>
                    </View>
                    <GraduationCap size={60} color={Colors.white} style={styles.promoIcon} />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 8 },
    welcomeSection: { marginBottom: 20, marginTop: 8 },
    welcomeText: { fontSize: 16, color: Colors.text.tertiary },
    nameText: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary, marginTop: 4 },

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
        flexDirection: 'row', alignItems: 'center', gap: 10, ...Shadows.sm, borderWidth: 1, borderColor: Colors.divider
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
        borderWidth: 1, borderColor: Colors.divider, ...Shadows.xs
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
});

export default StudentDashboard;
