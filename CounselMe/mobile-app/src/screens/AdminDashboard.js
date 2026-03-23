import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing } from '../constants/theme';

const AdminDashboard = ({ navigation }) => {
    const { user, logout } = useAuth();

    return (
        <MainLayout style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Admin Panel 🛠️</Text>
                <Text style={styles.subtitle}>Welcome back, {user?.displayName}</Text>
            </View>

            <View style={styles.grid}>
                <TouchableOpacity onPress={() => navigation.navigate('CreateInstitution')}>
                    <View style={styles.adminCard}>
                        <Text style={styles.cardTitle}>Add Institution</Text>
                        <Text style={styles.cardDesc}>Create new college entry with AI assistance</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('UploadCutoff')}>
                    <View style={styles.adminCard}>
                        <Text style={styles.cardTitle}>Manage Cutoffs</Text>
                        <Text style={styles.cardDesc}>Upload JSON or PDF cutoff data in bulk</Text>
                    </View>
                </TouchableOpacity>
                <View style={styles.adminCard}>
                    <Text style={styles.cardTitle}>View Students</Text>
                    <Text style={styles.cardDesc}>Manage registered student base</Text>
                </View>
            </View>

            <Button title="Logout" variant="outline" onPress={logout} style={{ marginTop: 40 }} />
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { padding: Spacing.lg },
    header: { marginBottom: 32 },
    welcome: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
    subtitle: { fontSize: 14, color: Colors.text.secondary, marginTop: 4 },
    grid: { gap: 16 },
    adminCard: { backgroundColor: Colors.white, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider },
    cardTitle: { fontSize: 18, fontWeight: Typography.fontWeight.bold, color: Colors.primary, marginBottom: 4 },
    cardDesc: { fontSize: 12, color: Colors.text.secondary },
});

export default AdminDashboard;
