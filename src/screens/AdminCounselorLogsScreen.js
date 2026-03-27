import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { counselorAPI } from '../services/api';
import { MessageSquare, Phone, User, Clock, ChevronLeft, Mail } from 'lucide-react-native';

const AdminCounselorLogsScreen = ({ route, navigation }) => {
    const { counselor } = route.params;
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await counselorAPI.getLogs(counselor._id);
            setLogs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderLog = ({ item }) => (
        <View style={styles.logCard}>
            <View style={styles.logHeader}>
                <View style={styles.userIcon}>
                    <User size={20} color={Colors.primary} />
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.userId?.displayName || 'Unknown User'}</Text>
                    <Text style={styles.userEmail}>{item.userId?.email || 'No email'}</Text>
                    {item.userId?.phoneNumber && (
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.userId.phoneNumber}`)}>
                            <Text style={styles.userPhone}>{item.userId.phoneNumber}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={[styles.actionTag, { backgroundColor: item.action === 'chat' ? '#f0fdf4' : '#eff6ff' }]}>
                    {item.action === 'chat' ? <MessageSquare size={12} color="#16a34a" /> : <Phone size={12} color="#2563eb" />}
                    <Text style={[styles.actionText, { color: item.action === 'chat' ? '#16a34a' : '#2563eb' }]}>
                        {item.action === 'chat' ? 'WhatsApp' : 'Call'}
                    </Text>
                </View>
            </View>
            <View style={styles.logFooter}>
                <Clock size={12} color="#94a3b8" />
                <Text style={styles.timeText}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
        </View>
    );

    return (
        <MainLayout title="Counselor Activity" hideHeader>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Interaction Logs</Text>
                    <Text style={styles.subtitle}>Tracking for {counselor.name}</Text>
                </View>
            </View>

            <View style={styles.container}>
                <View style={styles.statsOverview}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{logs.filter(l => l.action === 'chat').length}</Text>
                        <Text style={styles.statLabel}>WhatsApp Chats</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{logs.filter(l => l.action === 'call').length}</Text>
                        <Text style={styles.statLabel}>Phone Calls</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={logs}
                        keyExtractor={item => item._id}
                        renderItem={renderLog}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>No interactions recorded yet.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { padding: 5, marginRight: 15 },
    headerInfo: { flex: 1 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 13, color: '#64748b' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    statsOverview: { flexDirection: 'row', backgroundColor: 'white', margin: 20, padding: 20, borderRadius: 20, ...Shadows.sm },
    statBox: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
    statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
    statDivider: { width: 1, backgroundColor: '#f1f5f9' },
    list: { padding: 20, paddingTop: 0 },
    logCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, ...Shadows.xs },
    logHeader: { flexDirection: 'row', alignItems: 'center' },
    userIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
    userEmail: { fontSize: 12, color: '#64748b' },
    userPhone: { fontSize: 12, color: Colors.primary, marginTop: 2, fontWeight: '600' },
    actionTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    actionText: { fontSize: 10, fontWeight: 'bold' },
    logFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' },
    timeText: { fontSize: 11, color: '#94a3b8' },
    empty: { marginTop: 100, alignItems: 'center' },
    emptyText: { color: '#94a3b8' }
});

export default AdminCounselorLogsScreen;
