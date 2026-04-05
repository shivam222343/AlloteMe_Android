import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../components/layouts/MainLayout';
import { customFormsAPI } from '../services/api';
import { Colors, Shadows } from '../constants/theme';

const FormListScreen = ({ navigation }) => {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchForms = async () => {
        try {
            setLoading(true);
            const res = await customFormsAPI.getAllAdmin();
            if (res.data.success) {
                setForms(res.data.data);
            }
        } catch (error) {
            console.error('Fetch forms error:', error);
            Alert.alert('Error', 'Failed to fetch forms');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchForms();
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Form',
            'Are you sure you want to delete this form? All responses will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await customFormsAPI.delete(id);
                            if (res.data.success) {
                                fetchForms();
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete form');
                        }
                    }
                }
            ]
        );
    };

    const handleShare = async (item) => {
        // Domain forms.alloteme.online handled here
        const url = `https://forms.alloteme.online/view/${item._id}`;
        try {
            await Share.share({
                message: `Please fill out this form: ${item.title}\n\nLink: ${url}`,
                url: url
            });
        } catch (error) {
            await Clipboard.setStringAsync(url);
            Alert.alert('Link Copied', 'Form link copied to clipboard');
        }
    };

    const renderFormItem = ({ item }) => (
        <View style={styles.formCard}>
            <View style={styles.formInfo}>
                <View style={styles.titleRow}>
                    <Text style={styles.formTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.badge, { backgroundColor: item.status === 'published' ? '#dcfce7' : item.status === 'closed' ? '#fee2e2' : '#f1f5f9' }]}>
                        <Text style={[styles.badgeText, { color: item.status === 'published' ? '#166534' : item.status === 'closed' ? '#991b1b' : '#64748b' }]}>
                            {item.status?.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.formSubtitle}>{item.responseCount || 0} Responses • {item.sections?.length || 0} Sections</Text>
            </View>
            <View style={styles.formActions}>
                <TouchableOpacity onPress={() => handleShare(item)} style={styles.actionButton}>
                    <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate('FormResponses', { formId: item._id, formTitle: item.title })}
                    style={styles.actionButton}
                >
                    <Ionicons name="list-outline" size={20} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate('FormBuilder', { formId: item._id })}
                    style={styles.actionButton}
                >
                    <Ionicons name="create-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <MainLayout title="My Forms">
            <View style={styles.container}>
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
                ) : (
                    <FlatList
                        data={forms}
                        renderItem={renderFormItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
                                <Text style={styles.emptyText}>No forms created yet</Text>
                                <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('FormBuilder')}>
                                    <Text style={styles.createBtnText}>Create Your First Form</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('FormBuilder')}
                >
                    <Ionicons name="add" size={30} color="#FFF" />
                </TouchableOpacity>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    listContent: { paddingVertical: 16, paddingBottom: 100 },
    formCard: {
        backgroundColor: '#FFF',
        borderRadius: 0,
        padding: 16,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    formInfo: { flex: 1, marginBottom: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
    formTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800' },
    formSubtitle: { fontSize: 12, color: '#64748B' },
    formActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, justifyContent: 'flex-end' },
    actionButton: { padding: 8, marginLeft: 12 },
    loader: { flex: 1, justifyContent: 'center' },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.md
    },
    emptyState: { alignItems: 'center', marginTop: 100, padding: 20 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#64748B', textAlign: 'center' },
    createBtn: { marginTop: 24, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    createBtnText: { color: 'white', fontWeight: '700' }
});

export default FormListScreen;
