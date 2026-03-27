import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, Modal, FlatList
} from 'react-native';
import {
    Send, Users, User, Bell, Info, AlertTriangle,
    CheckCircle2, ChevronRight, Search
} from 'lucide-react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { notificationsAPI, authAPI } from '../services/api';

const AdminNotificationsScreen = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info');
    const [targetType, setTargetType] = useState('all'); // 'all' or 'specific'
    const [selectedUser, setSelectedUser] = useState(null);
    const [sending, setSending] = useState(false);

    // User selection modal
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [search, setSearch] = useState('');

    const types = [
        { id: 'info', label: 'Info', icon: Info, color: '#3b82f6' },
        { id: 'success', label: 'Success', icon: CheckCircle2, color: '#10b981' },
        { id: 'warning', label: 'Warning', icon: AlertTriangle, color: '#f59e0b' },
    ];

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await authAPI.getAllUsers();
            setUsers(res.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSend = async () => {
        if (!title || !message) {
            Alert.alert('Error', 'Please fill title and message');
            return;
        }
        if (targetType === 'specific' && !selectedUser) {
            Alert.alert('Error', 'Please select a user');
            return;
        }

        setSending(true);
        try {
            const data = {
                targetUserId: targetType === 'all' ? 'all' : selectedUser._id,
                title,
                message,
                type
            };
            await notificationsAPI.sendAdminNotification(data);
            Alert.alert('Success', 'Notification broadcasted successfully');

            // Reset form
            setTitle('');
            setMessage('');
            setSelectedUser(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.displayName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <MainLayout title="Broadcast Center">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.label}>Broadcast Type</Text>
                    <View style={styles.toggleRow}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, targetType === 'all' && styles.toggleActive]}
                            onPress={() => setTargetType('all')}
                        >
                            <Users size={18} color={targetType === 'all' ? 'white' : '#64748b'} />
                            <Text style={[styles.toggleText, targetType === 'all' && styles.textWhite]}>All Users</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, targetType === 'specific' && styles.toggleActive]}
                            onPress={() => {
                                setTargetType('specific');
                                if (users.length === 0) fetchUsers();
                                setUserModalVisible(true);
                            }}
                        >
                            <User size={18} color={targetType === 'specific' ? 'white' : '#64748b'} />
                            <Text style={[styles.toggleText, targetType === 'specific' && styles.textWhite]}>Specific User</Text>
                        </TouchableOpacity>
                    </View>

                    {targetType === 'specific' && selectedUser && (
                        <View style={styles.selectedUserBadge}>
                            <User size={14} color={Colors.primary} />
                            <Text style={styles.selectedUserName}>{selectedUser.displayName}</Text>
                            <TouchableOpacity onPress={() => setSelectedUser(null)}>
                                <Bell size={14} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.label}>Notification Level</Text>
                    <View style={styles.typeRow}>
                        {types.map(t => (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.typeBtn, type === t.id && { backgroundColor: t.color + '20', borderColor: t.color }]}
                                onPress={() => setType(t.id)}
                            >
                                <t.icon size={16} color={type === t.id ? t.color : '#94a3b8'} />
                                <Text style={[styles.typeText, type === t.id && { color: t.color }]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Compose Message</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Push Title (e.g. New Update Available)"
                        value={title}
                        onChangeText={setTitle}
                    />
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Compose your message here..."
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={4}
                    />

                    <TouchableOpacity
                        style={styles.sendBtn}
                        onPress={handleSend}
                        disabled={sending}
                    >
                        {sending ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Send size={18} color="white" />
                                <Text style={styles.sendBtnText}>Send Notification</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.infoCard}>
                    <Info size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Broadcasting to 'All Users' will trigger a real-time WebSocket alert for all active students and save a record in their history.
                    </Text>
                </View>
            </ScrollView>

            <Modal visible={userModalVisible} animationType="slide">
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Target User</Text>
                        <TouchableOpacity onPress={() => setUserModalVisible(false)} style={styles.closeBtn}>
                            <Bell size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBar}>
                        <Search size={20} color="#94a3b8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Find user by name or email..."
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    {loadingUsers ? (
                        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
                    ) : (
                        <FlatList
                            data={filteredUsers}
                            keyExtractor={item => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.userItem}
                                    onPress={() => {
                                        setSelectedUser(item);
                                        setUserModalVisible(false);
                                    }}
                                >
                                    <View style={styles.userInitial}>
                                        <Text style={styles.initialText}>{item.displayName.charAt(0)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userNameText}>{item.displayName}</Text>
                                        <Text style={styles.userEmailText}>{item.email}</Text>
                                    </View>
                                    <ChevronRight size={20} color="#e2e8f0" />
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 24, ...Shadows.md },
    label: { fontSize: 13, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 12, marginTop: 10 },
    toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    toggleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    toggleText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
    textWhite: { color: 'white' },
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' },
    typeText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
    input: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, fontSize: 15 },
    textArea: { height: 120, textAlignVertical: 'top' },
    sendBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 18, marginTop: 10, ...Shadows.lg },
    sendBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    infoCard: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: Colors.primary + '10', borderRadius: 16, marginTop: 24, alignItems: 'center' },
    infoText: { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 18 },
    selectedUserBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
    selectedUserName: { fontSize: 12, fontWeight: 'bold', color: Colors.primary },
    modalContent: { flex: 1, backgroundColor: 'white' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 16, paddingHorizontal: 12, borderRadius: 12, height: 48 },
    searchInput: { flex: 1, marginLeft: 10 },
    userItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    userInitial: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    initialText: { color: 'white', fontWeight: 'bold' },
    userNameText: { fontSize: 15, fontWeight: '600' },
    userEmailText: { fontSize: 12, color: '#64748b' }
});

export default AdminNotificationsScreen;
