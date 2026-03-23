import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import {
    PlusCircle, FileUp, Users, Settings,
    BarChart3, ShieldCheck, ChevronRight
} from 'lucide-react-native';

const AdminDashboard = ({ navigation }) => {
    const { user } = useAuth();

    const stats = [
        { label: 'Institutes', value: '42', icon: BarChart3, color: Colors.primary },
        { label: 'Users', value: '1.2k', icon: Users, color: '#8B5CF6' },
    ];

    const adminActions = [
        {
            title: 'Add Institution',
            desc: 'Create new entries with AI text parsing',
            icon: PlusCircle,
            route: 'CreateInstitution',
            color: '#10B981'
        },
        {
            title: 'Manage Cutoffs',
            desc: 'Upload and link cutoff data (JSON/PDF)',
            icon: FileUp,
            route: 'UploadCutoff',
            color: '#F59E0B'
        },
        {
            title: 'Train AI Counselor',
            desc: 'Upload knowledge base and text for RAG',
            icon: BarChart3,
            route: 'AITraining',
            color: '#8B5CF6'
        },
        {
            title: 'Frequent Questions',
            desc: 'Set sliding question tags for chat',
            icon: Settings,
            route: 'FrequentQuestionsManager',
            color: '#EC4899'
        },
        {
            title: 'User Management',
            desc: 'View and manage student registrations',
            icon: Users,
            route: 'Dashboard',
            color: '#3B82F6'
        },
    ];

    const ActionCard = ({ item }) => {
        const Icon = item.icon;
        return (
            <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate(item.route)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                    <Icon size={24} color={item.color} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>
                <ChevronRight size={20} color={Colors.divider} />
            </TouchableOpacity>
        );
    };

    return (
        <MainLayout title="Admin Console" hideBack>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.welcomeSection}>
                    <View style={styles.badge}>
                        <ShieldCheck size={12} color={Colors.white} />
                        <Text style={styles.badgeText}>ADMINISTRATOR</Text>
                    </View>
                    <Text style={styles.welcomeText}>System Overview</Text>
                    <Text style={styles.nameText}>{user?.displayName}</Text>
                </View>

                <View style={styles.statsRow}>
                    {stats.map((s, i) => (
                        <View key={i} style={styles.statBox}>
                            <s.icon size={20} color={s.color} />
                            <Text style={styles.statVal}>{s.value}</Text>
                            <Text style={styles.statLab}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Management Tools</Text>
                <View style={styles.actionList}>
                    {adminActions.map((action, idx) => <ActionCard key={idx} item={action} />)}
                </View>

                <View style={styles.infoBox}>
                    <Settings size={20} color={Colors.text.tertiary} />
                    <Text style={styles.infoText}>System health: Optimal. All services operational.</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 8 },
    welcomeSection: { marginBottom: 32, marginTop: 8 },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20, alignSelf: 'flex-start', marginBottom: 12
    },
    badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    welcomeText: { fontSize: 14, color: Colors.text.tertiary },
    nameText: { fontSize: 28, fontWeight: 'bold', color: Colors.text.primary, marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    statBox: {
        flex: 1, backgroundColor: Colors.white, padding: 20, borderRadius: 20,
        borderWidth: 1, borderColor: Colors.divider, ...Shadows.sm
    },
    statVal: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary, marginTop: 8 },
    statLab: { fontSize: 12, color: Colors.text.tertiary },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 16 },
    actionList: { gap: 12 },
    actionCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
        padding: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.divider, ...Shadows.xs
    },
    iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1, marginLeft: 16 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    cardDesc: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
    infoBox: {
        marginTop: 32, flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 16, borderRadius: 16, backgroundColor: Colors.divider + '40'
    },
    infoText: { fontSize: 12, color: Colors.text.secondary, flex: 1 }
});

export default AdminDashboard;
