import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { authAPI } from '../services/api';
import {
    User as UserIcon, Mail, Phone, Calendar,
    ShieldCheck, GraduationCap, MapPin, Search,
    Activity, CheckCircle2, AlertCircle, Star, Trash2
} from 'lucide-react-native';
import GradientBorder from '../components/ui/GradientBorder';

const AdminUserDetailScreen = ({ route, navigation }) => {
    const { userId } = route.params;
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updatingRole, setUpdatingRole] = useState(false);

    useEffect(() => {
        fetchUser();
    }, [userId]);

    const fetchUser = async () => {
        try {
            const res = await authAPI.getUserById(userId);
            if (res.data) {
                setUser(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch user', error);
            Alert.alert('Error', 'Failed to load user info');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRole = async () => {
        const newRole = user.role === 'admin' ? 'student' : 'admin';
        Alert.alert(
            "Change Role",
            `Are you sure you want to change ${user.displayName}'s role from ${user.role} to ${newRole}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        setUpdatingRole(true);
                        try {
                            const res = await authAPI.updateUserRole(userId, { role: newRole });
                            setUser({ ...user, role: res.data.role });
                            Alert.alert('Success', `Role updated to ${newRole}`);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to update role');
                            console.error(error);
                        } finally {
                            setUpdatingRole(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteUser = () => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to permanently delete ${user.displayName}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await authAPI.deleteUser(user._id);
                            Alert.alert('Success', 'User removed permanently');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    const InfoRow = ({ icon: Icon, label, value }) => (
        <View style={styles.infoRow}>
            <Icon size={18} color={Colors.text.tertiary} />
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
            </View>
        </View>
    );

    const PreferenceBadge = ({ text, color }) => (
        <View style={[styles.prefBadge, { backgroundColor: color + '12', borderColor: color + '25' }]}>
            <Text style={[styles.prefBadgeText, { color: color }]}>{text}</Text>
        </View>
    );

    if (loading || !user) {
        return (
            <MainLayout title="User Loading">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="User Details" noPadding>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.avatarRow}>
                        <GradientBorder size={80} borderWidth={3}>
                            <Image
                                source={{ uri: user.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user.displayName}&background=4f46e5&color=fff&size=256` }}
                                style={styles.avatar}
                            />
                        </GradientBorder>
                        <View style={styles.nameHeader}>
                            <Text style={styles.userName}>{user.displayName}</Text>
                            <View style={styles.roleBadgeMajor}>
                                <ShieldCheck size={14} color={user.role === 'admin' ? Colors.primary : Colors.text.tertiary} />
                                <Text style={[styles.roleTextMajor, user.role === 'admin' && styles.adminRoleTextMajor]}>
                                    {user.role.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.roleBtn, user.role === 'admin' ? styles.demoteBtn : styles.promoteBtn]}
                            onPress={handleToggleRole}
                            disabled={updatingRole}
                        >
                            {updatingRole ? (
                                <ActivityIndicator size="small" color={Colors.white} />
                            ) : (
                                <>
                                    {user.role === 'admin' ? <UserIcon size={16} color={Colors.white} /> : <ShieldCheck size={16} color={Colors.white} />}
                                    <Text style={styles.btnText}>
                                        {user.role === 'admin' ? 'Make Student' : 'Make Admin'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.roleBtn, styles.deleteBtn]}
                            onPress={handleDeleteUser}
                        >
                            <Trash2 size={16} color={Colors.white} />
                            <Text style={styles.btnText}>Delete User</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Details</Text>
                    <View style={styles.card}>
                        <InfoRow icon={Mail} label="Email Address" value={user.email} />
                        <InfoRow icon={Phone} label="Mobile Number" value={user.phoneNumber ? `+91 ${user.phoneNumber}` : null} />
                        <InfoRow icon={MapPin} label="Location" value={user.location} />
                        <InfoRow icon={Calendar} label="Joined on" value={new Date(user.createdAt).toLocaleDateString()} />
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, user.isVerified ? styles.verifiedBadge : styles.unverifiedBadge]}>
                                {user.isVerified ? <CheckCircle2 size={12} color={Colors.success} /> : <AlertCircle size={12} color={Colors.error} />}
                                <Text style={[styles.statusText, user.isVerified ? styles.verifiedText : styles.unverifiedText]}>
                                    {user.isVerified ? 'Verified' : 'Unverified'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Prediction Preferences</Text>
                    <View style={styles.card}>
                        <View style={styles.academicGrid}>
                            <View style={styles.academicBox}>
                                <Text style={styles.academicLabel}>Exam</Text>
                                <Text style={styles.academicVal}>{user.examType || '?'}</Text>
                            </View>
                            <View style={styles.academicBox}>
                                <Text style={styles.academicLabel}>Percentile</Text>
                                <Text style={styles.academicVal}>{user.percentile || '0'}</Text>
                            </View>
                            <View style={styles.academicBox}>
                                <Text style={styles.academicLabel}>Rank</Text>
                                <Text style={styles.academicVal}>{user.rank || '-'}</Text>
                            </View>
                        </View>

                        <Text style={styles.innerLabel}>Target Branches</Text>
                        <View style={styles.prefGrid}>
                            {user.preferences?.preferredBranches?.length > 0 ? (
                                user.preferences.preferredBranches.map((b, i) => <PreferenceBadge key={i} text={b} color={Colors.primary} />)
                            ) : (
                                <Text style={styles.emptySmall}>No branches selected</Text>
                            )}
                        </View>

                        <Text style={[styles.innerLabel, { marginTop: 12 }]}>Preferred Regions</Text>
                        <View style={styles.prefGrid}>
                            {user.preferences?.preferredRegions?.length > 0 ? (
                                user.preferences.preferredRegions.map((r, i) => <PreferenceBadge key={i} text={r} color={Colors.success} />)
                            ) : (
                                <Text style={styles.emptySmall}>No regions selected</Text>
                            )}
                        </View>

                        <Text style={[styles.innerLabel, { marginTop: 12 }]}>College Type Preferences</Text>
                        <View style={styles.prefGrid}>
                            {user.preferences?.collegeStatusPreference?.length > 0 ? (
                                user.preferences.collegeStatusPreference.map((s, i) => <PreferenceBadge key={i} text={s} color={Colors.accent} />)
                            ) : (
                                <Text style={styles.emptySmall}>No status preferences</Text>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Interactions</Text>
                    <View style={styles.card}>
                        <View style={styles.statLine}>
                            <View style={styles.statItem}>
                                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.statText}>{user.savedColleges?.length || 0} Saved</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Activity size={16} color={Colors.success} />
                                <Text style={styles.statText}>Active Account</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {user.lastPredictorPreferences && Object.keys(user.lastPredictorPreferences).length > 0 && (
                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Search size={14} color={Colors.text.tertiary} />
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Latest Predictor Search</Text>
                            </View>
                            <TouchableOpacity onPress={fetchUser} style={styles.miniRefreshBtn}>
                                <Activity size={14} color={Colors.primary} />
                                <Text style={styles.miniRefreshText}>Refresh</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: Colors.primary }]}>
                            <View style={styles.academicGrid}>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>Search %ile</Text>
                                    <Text style={styles.academicVal}>{user.lastPredictorPreferences.percentile || '-'}</Text>
                                </View>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>Search Rank</Text>
                                    <Text style={styles.academicVal}>{user.lastPredictorPreferences.rank || '-'}</Text>
                                </View>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>Category</Text>
                                    <Text style={styles.academicVal}>{user.lastPredictorPreferences.category || '-'}</Text>
                                </View>
                            </View>

                            <View style={[styles.academicGrid, { marginBottom: 12 }]}>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>Year</Text>
                                    <Text style={styles.academicVal}>{user.lastPredictorPreferences.year || '-'}</Text>
                                </View>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>Round</Text>
                                    <Text style={styles.academicVal}>{user.lastPredictorPreferences.round || '-'}</Text>
                                </View>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>Exam Type</Text>
                                    <Text style={styles.academicVal}>{user.lastPredictorPreferences.examType || '-'}</Text>
                                </View>
                            </View>

                            <View style={[styles.academicGrid, { marginBottom: 12 }]}>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>pTolerance</Text>
                                    <Text style={styles.academicVal}>{user.lastPredictorPreferences.pTolerance || '5'}</Text>
                                </View>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>rTolerance</Text>
                                    <Text style={styles.academicVal}>{user.lastPredictorPreferences.rTolerance || '500'}</Text>
                                </View>
                                <View style={styles.academicBox}>
                                    <Text style={styles.academicLabel}>Female Seat</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: user.lastPredictorPreferences.isFemale ? Colors.error : Colors.divider }} />
                                        <Text style={styles.academicVal}>{user.lastPredictorPreferences.isFemale ? 'YES' : 'NO'}</Text>
                                    </View>
                                </View>
                            </View>

                            {user.lastPredictorPreferences.institutionTypes && (
                                <>
                                    <Text style={styles.innerLabel}>Institution Filter</Text>
                                    <View style={styles.prefGrid}>
                                        {(Array.isArray(user.lastPredictorPreferences.institutionTypes)
                                            ? user.lastPredictorPreferences.institutionTypes
                                            : user.lastPredictorPreferences.institutionTypes.split(',')).map((t, i) => (
                                                <PreferenceBadge key={i} text={t} color={Colors.text.primary} />
                                            ))}
                                    </View>
                                </>
                            )}

                            {user.lastPredictorPreferences.seatTypes && (
                                <>
                                    <Text style={styles.innerLabel}>Seat Types Context</Text>
                                    <View style={styles.prefGrid}>
                                        {(Array.isArray(user.lastPredictorPreferences.seatTypes)
                                            ? user.lastPredictorPreferences.seatTypes
                                            : user.lastPredictorPreferences.seatTypes.split(',')).map((s, i) => (
                                                <PreferenceBadge key={i} text={s} color={Colors.error} />
                                            ))}
                                    </View>
                                </>
                            )}

                            {user.lastPredictorPreferences.branches && (
                                <>
                                    <Text style={styles.innerLabel}>Queried Branches</Text>
                                    <View style={styles.prefGrid}>
                                        {(Array.isArray(user.lastPredictorPreferences.branches)
                                            ? user.lastPredictorPreferences.branches
                                            : user.lastPredictorPreferences.branches.split(',')).map((b, i) => (
                                                <PreferenceBadge key={i} text={b} color={Colors.primary} />
                                            ))}
                                    </View>
                                </>
                            )}

                            {user.lastPredictorPreferences.regions && (
                                <>
                                    <Text style={styles.innerLabel}>Target Regions</Text>
                                    <View style={styles.prefGrid}>
                                        {(Array.isArray(user.lastPredictorPreferences.regions)
                                            ? user.lastPredictorPreferences.regions
                                            : user.lastPredictorPreferences.regions.split(',')).map((r, i) => (
                                                <PreferenceBadge key={i} text={r} color={Colors.success} />
                                            ))}
                                    </View>
                                </>
                            )}

                            {user.lastPredictorPreferences.topResults && user.lastPredictorPreferences.topResults.length > 0 && (
                                <>
                                    <Text style={[styles.innerLabel, { color: Colors.primary, marginTop: 24, marginBottom: 12 }]}>Top Results from this Search</Text>
                                    <View style={styles.resultsBox}>
                                        {user.lastPredictorPreferences.topResults.map((r, i) => (
                                            <View key={i} style={styles.resultRow}>
                                                <Text style={styles.resultColl} numberOfLines={1}>{r.collegeName}</Text>
                                                <View style={styles.resultSub}>
                                                    <Text style={styles.resultBranch}>{r.branch}</Text>
                                                    <Text style={styles.resultDets}>{r.category} | {r.percentile}%ile | R{r.round}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}

                            <Text style={[styles.timeText, { marginTop: 16, textAlign: 'right', fontSize: 10 }]}>
                                Predicted on: {user.lastPredictorPreferences.timestamp ? new Date(user.lastPredictorPreferences.timestamp).toLocaleString() : 'N/A'}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 24, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    avatarRow: { alignItems: 'center', marginBottom: 20 },
    avatar: { width: '100%', height: '100%' },
    nameHeader: { alignItems: 'center', marginTop: 12 },
    userName: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary },
    roleBadgeMajor: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    roleTextMajor: { fontSize: 12, fontWeight: 'bold', color: Colors.text.tertiary, letterSpacing: 0.5 },
    adminRoleTextMajor: { color: Colors.primary },

    actionRow: { flexDirection: 'row', gap: 12, marginTop: 10, justifyContent: 'center' },
    roleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, ...Shadows.sm, minWidth: 140, justifyContent: 'center' },
    promoteBtn: { backgroundColor: Colors.primary },
    demoteBtn: { backgroundColor: Colors.text.secondary },
    deleteBtn: { backgroundColor: Colors.error },
    btnText: { color: Colors.white, fontWeight: 'bold', fontSize: 13 },

    section: { paddingHorizontal: 16, paddingTop: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    card: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, ...Shadows.xs, borderWidth: 1, borderColor: '#EFF6FF' },

    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, color: Colors.text.tertiary, marginBottom: 2 },
    infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },

    statusRow: { marginTop: 12 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
    verifiedBadge: { backgroundColor: Colors.success + '15' },
    unverifiedBadge: { backgroundColor: Colors.error + '15' },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    verifiedText: { color: Colors.success },
    unverifiedText: { color: Colors.error },

    academicGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    academicBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    academicLabel: { fontSize: 10, color: Colors.text.tertiary, marginBottom: 4 },
    academicVal: { fontSize: 15, fontWeight: 'bold', color: Colors.text.primary },

    innerLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.text.secondary, marginBottom: 8, marginTop: 12 },
    prefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    prefBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    prefBadgeText: { fontSize: 10, fontWeight: '700' },
    emptySmall: { fontSize: 12, color: Colors.text.tertiary, fontStyle: 'italic' },

    statLine: { flexDirection: 'row', gap: 24 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
    timeText: { fontSize: 11, color: Colors.text.tertiary },
    miniRefreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.primary + '10' },
    miniRefreshText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

    resultsBox: { backgroundColor: '#F1F5F9', borderRadius: 12, overflow: 'hidden' },
    resultRow: { borderBottomWidth: 1, borderBottomColor: Colors.white, padding: 10 },
    resultColl: { fontSize: 13, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 2 },
    resultSub: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultBranch: { fontSize: 11, color: Colors.text.secondary, fontWeight: '600' },
    resultDets: { fontSize: 10, color: Colors.text.tertiary }
});

export default AdminUserDetailScreen;
