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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import MainLayout from '../components/MainLayout';
import { customFormsAPI } from '../services/api';
import { Colors } from '../constants/theme';

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
            const [formRes, respRes] = await Promise.all([
                customFormsAPI.getById(formId),
                customFormsAPI.getResponses(formId)
            ]);

            if (formRes.success) setForm(formRes.data);
            if (respRes.success) setResponses(respRes.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch responses');
        } finally {
            setLoading(false);
        }
    };

    const getQuestions = () => {
        if (!form) return [];
        const questions = [];
        form.sections.forEach(section => {
            section.questions.forEach(q => {
                questions.push(q);
            });
        });
        return questions;
    };

    const generateCSV = () => {
        const questions = getQuestions();
        let csv = 'Submission Date,' + questions.map(q => `"${q.label}"`).join(',') + '\n';

        responses.forEach(resp => {
            let row = `"${new Date(resp.createdAt).toLocaleString()}",`;
            row += questions.map(q => {
                const ans = resp.answers[q.id];
                if (Array.isArray(ans)) return `"${ans.join('; ')}"`;
                return `"${ans || ''}"`;
            }).join(',');
            csv += row + '\n';
        });

        return csv;
    };

    const generateHTML = () => {
        const questions = getQuestions();
        const rows = responses.map(resp => `
            <tr>
                <td>${new Date(resp.createdAt).toLocaleDateString()}</td>
                ${questions.map(q => {
            const ans = resp.answers[q.id];
            if ((q.type === 'image' || q.type === 'file') && ans) {
                const urls = Array.isArray(ans) ? ans : [ans];
                return `<td>${urls.map(url => `<a href="${url}" target="_blank" style="display:block;margin-bottom:4px;">${q.type === 'image' ? 'View Image' : 'View File'}</a>`).join('')}</td>`;
            }
            if (Array.isArray(ans)) return `<td>${ans.join(', ')}</td>`;
            return `<td>${ans || '-'}</td>`;
        }).join('')}
            </tr>
        `).join('');

        const headers = ['Date', ...questions.map(q => q.label)].map(h => `<th>${h}</th>`).join('');

        return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        table { width: 100%; border-collapse: collapse; font-family: sans-serif; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 10px; }
                        th { background-color: #0A66C2; color: white; }
                        tr:nth-child(even) { background-color: #f2f2f2; }
                        h1 { font-family: sans-serif; color: #1F2937; margin-bottom: 4px; }
                        .meta { color: #6B7280; font-size: 12px; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <h1>${form?.title || 'Form'} - Responses</h1>
                    <div class="meta">Total Submissions: ${responses.length} | Generated: ${new Date().toLocaleString()}</div>
                    <table>
                        <thead><tr>${headers}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `;
    };

    const generateMarksHTML = () => {
        const rows = responses.map(resp => `
            <tr>
                <td>${resp.submittedBy ? resp.submittedBy.displayName : (resp.email || 'Anonymous')}</td>
                <td>${resp.email || (resp.submittedBy ? resp.submittedBy.email : '-')}</td>
                <td style="font-weight: bold; color: #15803d;">${resp.score || 0}</td>
                <td>${resp.totalPossibleScore || 0}</td>
                <td>${resp.totalPossibleScore > 0 ? Math.round((resp.score / resp.totalPossibleScore) * 100) : 0}%</td>
                <td>${new Date(resp.createdAt).toLocaleString()}</td>
            </tr>
        `).join('');

        return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        table { width: 100%; border-collapse: collapse; font-family: sans-serif; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 11px; }
                        th { background-color: #15803d; color: white; }
                        tr:nth-child(even) { background-color: #f0fdf4; }
                        h1 { font-family: sans-serif; color: #166534; margin-bottom: 4px; }
                        .meta { color: #64748B; font-size: 12px; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <h1>${form?.title || 'Quiz'} - Marks Sheet</h1>
                    <div class="meta">Total Participants: ${responses.length} | Generated: ${new Date().toLocaleString()}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Score</th>
                                <th>Total</th>
                                <th>Percentage</th>
                                <th>Submitted At</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `;
    };

    const handleExport = async (format) => {
        if (responses.length === 0) {
            Alert.alert('No Data', 'There are no responses to export.');
            return;
        }

        setExporting(true);
        try {
            const fileName = `${(form?.title || 'Form').replace(/\s+/g, '_')}_Responses_${Date.now()}`;

            if (format === 'csv') {
                const csvContent = generateCSV();
                const fileUri = FileSystem.cacheDirectory + fileName + '.csv';
                await FileSystem.writeAsStringAsync(fileUri, csvContent);
                await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
            } else if (format === 'html') {
                const htmlContent = generateHTML();
                const fileUri = FileSystem.cacheDirectory + fileName + '.html';
                await FileSystem.writeAsStringAsync(fileUri, htmlContent);
                await Sharing.shareAsync(fileUri, { mimeType: 'text/html' });
            } else if (format === 'pdf') {
                const htmlContent = generateHTML();
                const { uri } = await Print.printToFileAsync({ html: htmlContent });
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
            } else if (format === 'marks') {
                const htmlContent = generateMarksHTML();
                const { uri } = await Print.printToFileAsync({ html: htmlContent });
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Export Failed', `An error occurred while exporting: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    const handleDownloadMedia = async (url, type) => {
        try {
            setExporting(true);
            const extension = url.split('.').pop().split('?')[0] || (type === 'image' ? 'jpg' : 'bin');
            const filename = `Aura_Media_${Date.now()}.${extension}`;
            const fileUri = FileSystem.cacheDirectory + filename;

            const downloadResult = await FileSystem.downloadAsync(url, fileUri);

            if (downloadResult.status === 200) {
                const mimeType = type === 'image' ? 'image/jpeg' : 'application/octet-stream';
                await Sharing.shareAsync(downloadResult.uri, { mimeType });
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Download Error', `Could not download the file: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteResponse = (responseId) => {
        Alert.alert(
            'Delete Response',
            'Are you sure you want to delete this response? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const res = await customFormsAPI.deleteResponse(responseId);
                            if (res.success) {
                                fetchData(); // Refresh list
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete response');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderResponseCard = ({ item }) => {
        const questions = getQuestions().slice(0, 3); // Show first 3 for preview
        return (
            <TouchableOpacity
                style={styles.responseCard}
                onPress={() => {
                    setSelectedResponse(item);
                    setDetailVisible(true);
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString()}</Text>
                        {item.isQuiz && (
                            <View style={styles.scoreBadgeLite}>
                                <Text style={styles.scoreBadgeLiteText}>Score: {item.score}/{item.totalPossibleScore}</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => handleDeleteResponse(item._id)}
                            style={{ padding: 4, marginRight: 8 }}
                        >
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={20} color={Colors.primary[500]} />
                    </View>
                </View>
                <View style={styles.cardBody}>
                    {questions.map(q => (
                        <View key={q.id} style={styles.ansRow}>
                            <Text style={styles.qLabel}>{q.label}:</Text>
                            <Text style={styles.qAns} numberOfLines={1}>
                                {Array.isArray(item.answers[q.id]) ? item.answers[q.id].join(', ') : (item.answers[q.id] || '-')}
                            </Text>
                        </View>
                    ))}
                </View>
            </TouchableOpacity>
        );
    };

    const renderDetailValue = (q, value) => {
        if (!value) return <Text style={styles.detailAnsText}>-</Text>;

        if ((q.type === 'image' || q.type === 'file') && value) {
            const urls = Array.isArray(value) ? value : [value];
            return (
                <View style={styles.detailMediaList}>
                    {urls.map((url, idx) => (
                        <View key={idx} style={styles.detailMediaItem}>
                            {q.type === 'image' ? (
                                <Image source={{ uri: url }} style={styles.detailImage} />
                            ) : (
                                <View style={styles.detailFilePlaceholder}>
                                    <Ionicons name="document-text" size={32} color="#64748B" />
                                    <Text style={styles.detailFileText}>File {idx + 1}</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.downloadIconBtn}
                                onPress={() => handleDownloadMedia(url, q.type)}
                            >
                                <Ionicons name="download-outline" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            );
        }

        if (Array.isArray(value)) {
            return <Text style={styles.detailAnsText}>{value.join(', ')}</Text>;
        }

        return <Text style={styles.detailAnsText}>{value}</Text>;
    };

    return (
        <MainLayout navigation={navigation} title="Form Responses" backButton>
            <View style={styles.container}>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>{formTitle}</Text>
                    <Text style={styles.subtitle}>{responses.length} Submissions Total</Text>
                </View>

                <View style={styles.exportContainer}>
                    <Text style={styles.exportLabel}>Export As:</Text>
                    <View style={styles.exportButtons}>
                        <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('csv')}>
                            <Ionicons name="file-tray-full-outline" size={20} color="#FFF" />
                            <Text style={styles.exportText}>CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#10b981' }]} onPress={() => handleExport('html')}>
                            <Ionicons name="code-slash-outline" size={20} color="#FFF" />
                            <Text style={styles.exportText}>HTML</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleExport('pdf')}>
                            <Ionicons name="document-outline" size={20} color="#FFF" />
                            <Text style={styles.exportText}>PDF</Text>
                        </TouchableOpacity>
                        {form?.settings?.isQuiz && (
                            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#15803d' }]} onPress={() => handleExport('marks')}>
                                <Ionicons name="ribbon-outline" size={20} color="#FFF" />
                                <Text style={styles.exportText}>Marks</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary[500]} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={[...responses].reverse()}
                        keyExtractor={item => item._id}
                        renderItem={renderResponseCard}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="file-tray-outline" size={64} color="#D1D5DB" />
                                <Text style={styles.emptyText}>No responses yet</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Detailed View Modal */}
            <Modal
                visible={detailVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Response Details</Text>
                                <Text style={styles.modalSubtitle}>Submitted: {selectedResponse && new Date(selectedResponse.createdAt).toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setDetailVisible(false)}>
                                <Ionicons name="close-circle" size={32} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            {form && selectedResponse && getQuestions().map(q => (
                                <View key={q.id} style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>{q.label}</Text>
                                    <View style={styles.detailValueContainer}>
                                        {renderDetailValue(q, selectedResponse.answers[q.id])}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {exporting && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={{ color: '#FFF', marginTop: 12 }}>Preparing Export...</Text>
                </View>
            )}
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    headerInfo: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    exportContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    exportLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    exportButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    exportBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary[500],
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    exportText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    listContent: {
        paddingBottom: 20,
    },
    responseCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary[500],
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 8,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    cardBody: {
        gap: 6,
    },
    ansRow: {
        flexDirection: 'row',
    },
    qLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
        width: '35%',
    },
    qAns: {
        fontSize: 13,
        color: '#1F2937',
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    modalScroll: {
        padding: 24,
    },
    detailItem: {
        marginBottom: 24,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 8,
    },
    detailValueContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    detailAnsText: {
        fontSize: 15,
        color: '#1F2937',
        lineHeight: 22,
    },
    detailMediaList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailMediaItem: {
        width: (width - 110) / 2,
        height: (width - 110) / 2,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    detailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    detailFilePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailFileText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 8,
        fontWeight: '600',
    },
    downloadIconBtn: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    scoreBadgeLite: {
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    scoreBadgeLiteText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#15803D',
    }
});

export default FormResponsesScreen;
