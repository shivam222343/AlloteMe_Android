import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Share,
    Modal,
    ScrollView,
    Image,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import MainLayout from '../components/layouts/MainLayout';
import { customFormsAPI } from '../services/api';
import { Colors, Shadows } from '../constants/theme';
import { FIELD_TYPES } from '../constants/formFields';

const { width } = Dimensions.get('window');

const FormResponsesScreen = ({ route, navigation }) => {
    const { formId, formTitle } = route.params;
    const [responses, setResponses] = useState([]);
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [detailVisible, setDetailVisible] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            console.log(`[FormResponses] Fetching for formId: ${formId}`);
            const [formRes, respRes] = await Promise.all([
                customFormsAPI.getById(formId),
                customFormsAPI.getResponses(formId)
            ]);

            console.log(`[FormResponses] Received ${respRes.data.data?.length || 0} responses`);
            if (formRes.data.success) setForm(formRes.data.data);
            if (respRes.data.success) setResponses(respRes.data.data || []);
        } catch (error) {
            console.error('[FormResponses] Error:', error);
            Alert.alert('Error', 'Failed to fetch responses');
        } finally {
            setLoading(false);
        }
    };

    const getQuestions = () => {
        if (!form) return [];
        const questions = [];
        form.sections.forEach(section => {
            section.questions.forEach(q => questions.push(q));
        });
        return questions;
    };

    const generateCSV = () => {
        const questions = getQuestions();
        let csv = 'Submission Date,Name,Email,Score,' + questions.map(q => `"${q.label}"`).join(',') + '\n';

        responses.forEach(resp => {
            let row = `"${new Date(resp.createdAt).toLocaleString()}","${resp.name || resp.submittedBy?.displayName || ''}","${resp.email || resp.submittedBy?.email || ''}","${resp.score || 0}/${resp.totalPossibleScore || 0}",`;
            row += questions.map(q => {
                const ans = resp.answers[q.id];
                if (typeof ans === 'object' && ans !== null) return `"${JSON.stringify(ans).replace(/"/g, '""')}"`;
                if (Array.isArray(ans)) return `"${ans.join('; ')}"`;
                return `"${ans || ''}"`;
            }).join(',');
            csv += row + '\n';
        });

        return csv;
    };

    const generateHTML = (isMarks = false) => {
        const questions = getQuestions();
        if (isMarks) {
            const rows = responses.map(resp => `
                <tr>
                    <td>${resp.name || resp.submittedBy?.displayName || 'Anonymous'}</td>
                    <td>${resp.email || resp.submittedBy?.email || '-'}</td>
                    <td style="font-weight: bold; color: #15803d;">${resp.score || 0}</td>
                    <td>${resp.totalPossibleScore || 0}</td>
                    <td>${resp.totalPossibleScore > 0 ? Math.round((resp.score / resp.totalPossibleScore) * 100) : 0}%</td>
                    <td>${new Date(resp.createdAt).toLocaleString()}</td>
                </tr>
            `).join('');

            return `<html><head><style>table{width:100%;border-collapse:collapse;font-family:sans-serif;}th,td{border:1px solid #ddd;padding:12px;text-align:left;font-size:11px;}th{background-color:#15803d;color:white;}tr:nth-child(even){background-color:#f0fdf4;}h1{color:#166534;}</style></head><body><h1>${form?.title} - Marks Sheet</h1><table><thead><tr><th>Name</th><th>Email</th><th>Score</th><th>Total</th><th>%</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
        }

        const headers = ['Date', 'Name', ...questions.map(q => q.label)].map(h => `<th>${h}</th>`).join('');
        const rows = responses.map(resp => `
            <tr>
                <td>${new Date(resp.createdAt).toLocaleDateString()}</td>
                <td>${resp.name || resp.submittedBy?.displayName || '-'}</td>
                ${questions.map(q => {
            const ans = resp.answers[q.id];
            if (typeof ans === 'object' && ans !== null) return `<td>${ans.rating ? `${ans.rating} ⭐` : 'Data'}</td>`;
            return `<td>${Array.isArray(ans) ? ans.join(', ') : (ans || '-')}</td>`;
        }).join('')}
            </tr>
        `).join('');

        return `<html><head><style>table{width:100%;border-collapse:collapse;font-family:sans-serif;}th,td{border:1px solid #ddd;padding:12px;text-align:left;font-size:10px;}th{background-color:#0A66C2;color:white;}tr:nth-child(even){background-color:#f2f2f2;}</style></head><body><h1>${form?.title} - Responses</h1><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    };

    const handleExport = async (format) => {
        if (responses.length === 0) return Alert.alert('No Data', 'No responses to export.');
        setExporting(true);
        try {
            const fileName = `${(form?.title || 'Form').replace(/\s+/g, '_')}_Responses_${Date.now()}`;
            if (format === 'csv') {
                const fileUri = FileSystem.cacheDirectory + fileName + '.csv';
                await FileSystem.writeAsStringAsync(fileUri, generateCSV());
                await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
            } else {
                const html = generateHTML(format === 'marks');
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
            }
        } catch (error) {
            Alert.alert('Export Failed', error.message);
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteResponse = (responseId) => {
        Alert.alert('Delete Response', 'Permanently delete this response?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await customFormsAPI.deleteResponse(responseId);
                        fetchData();
                    } catch (error) { Alert.alert('Error', 'Failed to delete'); }
                }
            }
        ]);
    };

    const renderFormattedValue = (val) => {
        if (!val && val !== 0 && val !== false) return <Text style={[styles.detailText, { color: '#94a3b8' }]}>No answer</Text>;

        if (typeof val === 'boolean') {
            return (
                <View style={[styles.inlineBadge, { backgroundColor: val ? '#f0fdf4' : '#fef2f2' }]}>
                    <Ionicons name={val ? "checkmark-circle" : "close-circle"} size={16} color={val ? "#10b981" : "#ef4444"} />
                    <Text style={{ marginLeft: 6, fontWeight: '700', color: val ? "#166534" : "#991b1b" }}>{val ? "YES" : "NO"}</Text>
                </View>
            );
        }

        if (Array.isArray(val)) {
            return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {val.map((v, i) => (
                        <View key={i} style={styles.inlineBadge}><Text style={styles.badgeTextSmall}>{v}</Text></View>
                    ))}
                </View>
            );
        }

        if (typeof val === 'object') {
            // Handle college_review specifically
            if (val.rating || val.collegeName || val.comment) {
                return (
                    <View style={styles.objectBlock}>
                        {val.collegeName && <Text style={styles.objectSubtitle}>Institution: <Text style={{ fontWeight: '700' }}>{val.collegeName}</Text></Text>}
                        {val.rating && (
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map(s => <Ionicons key={s} name="star" size={16} color={s <= val.rating ? '#F59E0B' : '#E2E8F0'} />)}
                                <Text style={styles.ratingText}>{val.rating}/5 Rating</Text>
                            </View>
                        )}
                        {val.reviewerName && <Text style={styles.reviewerMini}>Shared as: <Text style={{ fontWeight: '600' }}>{val.reviewerName}</Text></Text>}
                        {val.comment && (
                            <View style={styles.commentBox}>
                                <Text style={styles.commentText}>"{val.comment}"</Text>
                            </View>
                        )}
                    </View>
                );
            }
            return <Text style={styles.detailText}>{JSON.stringify(val)}</Text>;
        }

        return <Text style={styles.detailText}>{val.toString()}</Text>;
    };

    const renderResponseItem = ({ item }) => {
        const answers = item.answers || {};
        const firstValue = Object.values(answers)[0];

        let preview = '...';
        let stars = null;

        if (typeof firstValue === 'object' && firstValue !== null) {
            preview = firstValue.collegeName || firstValue.comment || 'Review';
            if (firstValue.rating) {
                stars = (
                    <View style={[styles.starsRow, { marginLeft: 0, marginTop: 4 }]}>
                        {[1, 2, 3, 4, 5].map(s => (
                            <Ionicons key={s} name="star" size={12} color={s <= firstValue.rating ? '#F59E0B' : '#E2E8F0'} />
                        ))}
                    </View>
                );
            }
        } else if (firstValue) {
            preview = firstValue.toString();
        }

        return (
            <TouchableOpacity style={styles.responseCard} onPress={() => { setSelectedResponse(item); setDetailVisible(true); }}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{item.name || item.submittedBy?.displayName || 'Anonymous User'}</Text>
                        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteResponse(item._id)} style={{ padding: 8 }}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
                <View style={styles.scoreRow}>
                    {item.totalPossibleScore > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Score: {item.score}/{item.totalPossibleScore}</Text>
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.previewText} numberOfLines={1}>{preview}</Text>
                        {stars}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <MainLayout title="Responses" backButton={true}>
            <View style={styles.container}>
                <View style={styles.statsCard}>
                    <Text style={styles.statsTitle}>{formTitle}</Text>
                    <Text style={styles.statsSubtitle}>{responses.length} Submissions Received</Text>

                    <View style={styles.exportBar}>
                        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#3b82f6' }]} onPress={() => handleExport('csv')}>
                            <Ionicons name="document-text-outline" size={18} color="white" />
                            <Text style={styles.exportBtnText}>CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#10b981' }]} onPress={() => handleExport('html')}>
                            <Ionicons name="code-outline" size={18} color="white" />
                            <Text style={styles.exportBtnText}>HTML</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleExport('pdf')}>
                            <Ionicons name="document-outline" size={18} color="white" />
                            <Text style={styles.exportBtnText}>PDF</Text>
                        </TouchableOpacity>
                        {form?.settings?.isQuiz && (
                            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#15803d' }]} onPress={() => handleExport('marks')}>
                                <Ionicons name="newspaper-outline" size={18} color="white" />
                                <Text style={styles.exportBtnText}>Marks</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={responses}
                        keyExtractor={item => item._id}
                        renderItem={renderResponseItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No responses yet</Text></View>}
                    />
                )}
            </View>

            <Modal visible={detailVisible} animationType="slide" transparent={true}>
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Submission Details</Text>
                            <TouchableOpacity onPress={() => setDetailVisible(false)}><Ionicons name="close-circle" size={32} color="#64748B" /></TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll}>
                            {getQuestions().map(q => (
                                <View key={q.id} style={styles.detailItem}>
                                    <View style={styles.detailHeader}>
                                        <Ionicons name={FIELD_TYPES.find(f => f.value === q.type)?.icon || 'help'} size={14} color="#64748B" />
                                        <Text style={styles.detailLabel}>{q.label}</Text>
                                    </View>
                                    <View style={styles.detailValueBox}>
                                        {renderFormattedValue(selectedResponse?.answers[q.id])}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 16 },
    statsCard: { backgroundColor: 'white', padding: 20, borderRadius: 0, borderBottomWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
    statsTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    statsSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 16 },
    exportBar: { flexDirection: 'row', gap: 8 },
    exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
    exportBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
    list: { paddingBottom: 40 },
    responseCard: { backgroundColor: 'white', padding: 16, borderRadius: 0, marginBottom: 12, borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#f1f5f9', borderLeftWidth: 4, borderLeftColor: Colors.primary },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    userName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    dateText: { fontSize: 11, color: '#64748b' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    badge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#dcfce7' },
    chart: { marginVertical: 8 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#166534' },
    previewText: { fontSize: 13, color: '#475569', flex: 1 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    modalScroll: { padding: 20 },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    detailLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    detailValueBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' },
    detailText: { fontSize: 15, color: '#1e293b' },

    // Formatting styles
    inlineBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: '#f1f5f9' },
    badgeTextSmall: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
    objectBlock: { gap: 6 },
    objectSubtitle: { fontSize: 13, color: '#64748B' },
    starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    ratingText: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginLeft: 6 },
    commentBox: { marginTop: 8, padding: 10, backgroundColor: 'white', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: Colors.primary },
    commentText: { fontSize: 14, fontStyle: 'italic', color: '#334155', lineHeight: 20 },
    reviewerMini: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

    empty: { marginTop: 60, alignItems: 'center' },
    emptyText: { color: '#94a3b8', fontSize: 16 }
});

export default FormResponsesScreen;
