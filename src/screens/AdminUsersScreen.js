import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { authAPI } from '../services/api';
import { Search, ChevronRight, User as UserIcon, Users, ShieldCheck, Mail, Trash2 } from 'lucide-react-native';
import GradientBorder from '../components/ui/GradientBorder';

const AdminUsersScreen = ({ navigation }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await authAPI.getAllUsers();
            setUsers(res.data);
            setFilteredUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearch(text);
        if (text.trim() === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(u =>
                u.displayName.toLowerCase().includes(text.toLowerCase()) ||
                u.email.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    };

    const renderUserItem = ({ item }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => navigation.navigate('AdminUserDetail', { userId: item._id })}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                <GradientBorder size={50} borderWidth={2}>
                    <Image
                        source={{ uri: item.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${item.displayName}&background=6366f1&color=fff&size=100` }}
                        style={styles.avatar}
                    />
                </GradientBorder>
            </View>
            <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                    <Text style={styles.userName} numberOfLines={1}>{item.displayName}</Text>
                    <Text style={styles.userTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.detailRow}>
                    <View style={styles.roleBadge}>
                        {item.role === 'admin' ? (
                            <ShieldCheck size={12} color={Colors.primary} />
                        ) : (
                            <UserIcon size={12} color={Colors.text.tertiary} />
                        )}
                        <Text style={[styles.roleText, item.role === 'admin' && styles.adminText]}>
                            {item.role.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                </View>
            </View>
            <View style={styles.actionColumn}>
                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert('Delete User', `Permanently delete ${item.displayName}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                    try {
                                        await authAPI.deleteUser(item._id);
                                        fetchUsers();
                                    } catch (e) {
                                        Alert.alert('Error', 'Failed to delete user');
                                    }
                                }
                            }
                        ]);
                    }}
                >
                    <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
                <ChevronRight size={18} color={Colors.text.tertiary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <MainLayout title="User Management" noPadding>
            <View style={styles.container}>
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Search size={20} color={Colors.text.tertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or email..."
                            value={search}
                            onChangeText={handleSearch}
                        />
                    </View>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={item => item._id}
                        renderItem={renderUserItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Users size={40} color={Colors.divider} />
                                <Text style={styles.emptyText}>No users found</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    searchSection: { padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9',
        borderRadius: 12, paddingHorizontal: 12, height: 48
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: Colors.text.primary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingBottom: 20 },
    userCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
    },
    avatarContainer: { marginRight: 12 },
    avatar: { width: '100%', height: '100%' },
    userInfo: { flex: 1, marginRight: 8 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    userName: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, flex: 1 },
    userTime: { fontSize: 11, color: Colors.text.tertiary },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    roleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4
    },
    roleText: { fontSize: 9, fontWeight: 'bold', color: Colors.text.tertiary },
    adminText: { color: Colors.primary },
    userEmail: { fontSize: 13, color: Colors.text.tertiary, marginTop: 4 },
    actionColumn: { flexDirection: 'row', alignItems: 'center' },
    deleteBtn: { padding: 8, marginRight: 4 },
    emptyBox: { padding: 60, alignItems: 'center' },
    emptyText: { marginTop: 12, color: Colors.text.tertiary }
});

export default AdminUsersScreen;
