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
import MainLayout from '../components/MainLayout';
import { customFormsAPI } from '../services/api';
import { API_CONFIG } from '../constants/theme';

const FormListScreen = ({ navigation }) => {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchForms = async () => {
        try {
            setLoading(true);
            const res = await customFormsAPI.getAllAdmin();
            if (res.success) {
                setForms(res.data);
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
                            if (res.success) {
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
        const url = `${API_CONFIG.WEB_FORM_URL}/form/${item._id}`;
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
                <Text style={styles.formTitle}>{item.title}</Text>
                <Text style={styles.formSubtitle}>{item.status.toUpperCase()} • {item.sections.length} Sections</Text>
            </View>
            <View style={styles.formActions}>
                <TouchableOpacity
                    onPress={() => handleShare(item)}
                    style={styles.actionButton}
                >
                    <Ionicons name="share-social-outline" size={20} color="#0A66C2" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate('FormResponses', { formId: item._id, formTitle: item.title })}
                    style={styles.actionButton}
                >
                    <Ionicons name="list-outline" size={20} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate('FormAnalytics', { formId: item._id, formTitle: item.title })}
                    style={styles.actionButton}
                >
                    <Ionicons name="bar-chart-outline" size={20} color="#8b5cf6" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate('FormBuilder', { formId: item._id })}
                    style={styles.actionButton}
                >
                    <Ionicons name="create-outline" size={20} color="#0A66C2" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleDelete(item._id)}
                    style={styles.actionButton}
                >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <MainLayout navigation={navigation} currentRoute="FormList" title="My Forms">
            <View style={styles.container}>
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#0A66C2" style={styles.loader} />
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
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    formCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    formInfo: {
        flex: 1,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    formSubtitle: {
        fontSize: 12,
        color: '#64748B',
    },
    formActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    loader: {
        flex: 1,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
    }
});

export default FormListScreen;
