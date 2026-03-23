import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import {
    Search, LayoutGrid, Cpu, MapPin,
    MessageSquare, Bookmark, GraduationCap, TrendingUp
} from 'lucide-react-native';

const StudentDashboard = ({ navigation }) => {
    const { user, hasSkippedProfile } = useAuth();

    React.useEffect(() => {
        if (user?.role === 'student' && !user?.preferences?.isProfileComplete && !hasSkippedProfile) {
            navigation.navigate('CompleteProfile');
        }
    }, [user, hasSkippedProfile]);

    const stats = [
        { label: 'Percentile', value: user?.percentile ? `${user.percentile}%` : '0.0%', icon: TrendingUp, color: Colors.primary },
        { label: 'Rank', value: user?.rank || 'N/A', icon: GraduationCap, color: '#10B981' },
        { label: 'Saved', value: user?.savedColleges?.length || 0, icon: Bookmark, color: '#F59E0B' },
        { label: 'Applied', value: '0', icon: LayoutGrid, color: '#EF4444' }, // Placeholder for now
    ];

    const menuItems = [
        { label: 'Browse Colleges', icon: Search, sub: 'Explore 500+ institutes', route: 'BrowseColleges' },
        { label: 'College Predictor', icon: LayoutGrid, sub: 'Check your chances', route: 'Predictor' },
        { label: 'AI Counselor', icon: Cpu, sub: '24/7 AI Guidance', route: 'AICounselor' },
        { label: 'Nearby Colleges', icon: MapPin, sub: 'Find local institutes', route: 'NearbyColleges' },
        { label: 'Connect Counselor', icon: MessageSquare, sub: 'Chat with experts', route: 'ConnectCounselor' },
        { label: 'Saved Colleges', icon: Bookmark, sub: 'Your favorite list', route: 'SavedColleges' },
    ];

    const StatCard = ({ item }) => {
        const Icon = item.icon;
        return (
            <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: item.color + '15' }]}>
                    <Icon size={20} color={item.color} />
                </View>
                <View>
                    <Text style={styles.statVal}>{item.value}</Text>
                    <Text style={styles.statLab}>{item.label}</Text>
                </View>
            </View>
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

                <View style={styles.statsRow}>
                    {stats.map((s, i) => <StatCard key={i} item={s} />)}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Counseling Tools</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('BrowseColleges')}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2; // (Screen - PaddingHorizontal*2 - Gap) / 2

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 8 },
    welcomeSection: { marginBottom: 24, marginTop: 8 },
    welcomeText: { fontSize: 16, color: Colors.text.tertiary },
    nameText: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary, marginTop: 4 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
    statCard: {
        width: CARD_WIDTH, backgroundColor: Colors.white, padding: 16, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadows.sm, borderWidth: 1, borderColor: Colors.divider
    },
    statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statVal: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    statLab: { fontSize: 11, color: Colors.text.tertiary },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    seeAll: { fontSize: 12, fontWeight: '600', color: Colors.primary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridCard: {
        width: CARD_WIDTH, backgroundColor: Colors.white, padding: 16, borderRadius: 20,
        borderWidth: 1, borderColor: Colors.divider, ...Shadows.xs
    },
    gridIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    gridLabel: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary },
    gridSub: { fontSize: 10, color: Colors.text.tertiary, marginTop: 4 },
    promoCard: {
        marginTop: 32, backgroundColor: Colors.primary, borderRadius: 24,
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
