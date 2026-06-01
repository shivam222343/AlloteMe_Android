import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    FlatList, Image, ActivityIndicator, Alert, Modal, TextInput, Platform
} from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows, Spacing } from '../constants/theme';
import { authAPI, api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
    Users, FileText, CheckCircle, XCircle, Download, 
    ChevronRight, Search, DownloadCloud, FileCheck, 
    Calendar, User, MessageSquare, ExternalLink, Info, AlertCircle, Tag
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const AdminStudentDocumentsScreen = () => {
    const { socket } = useAuth();
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [remark, setRemark] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

    useEffect(() => {
        if (socket) {
            console.log('[AdminStudentDocuments] Registering socket listener for student updates');
            const handleStudentUpdate = (updatedStudent) => {
                console.log('[Socket] Received student document update:', updatedStudent._id);
                
                // Helper to update student documents
                setStudents(prev => prev.map(s => s._id === updatedStudent._id ? { ...s, ...updatedStudent } : s));
                setFilteredStudents(prev => prev.map(s => s._id === updatedStudent._id ? { ...s, ...updatedStudent } : s));
                
                // If the updated student is currently selected, update their detail modal too
                setSelectedStudent(prev => prev && prev._id === updatedStudent._id ? { ...prev, ...updatedStudent } : prev);
            };

            socket.on('student:document_updated', handleStudentUpdate);

            return () => {
                socket.off('student:document_updated', handleStudentUpdate);
            };
        }
    }, [socket]);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await authAPI.getAllUsers();
            // Show all students, as 'documents' field might only be available in full profile
            const submitted = res.data.filter(u => u.role !== 'admin');
            
            // Sort by most recent submission or account creation as fallback
            const sorted = submitted.sort((a, b) => {
                const latestA = a.documents ? Math.max(...Object.values(a.documents).map(d => new Date(d.createdAt).getTime() || 0)) : 0;
                const latestB = b.documents ? Math.max(...Object.values(b.documents).map(d => new Date(d.createdAt).getTime() || 0)) : 0;
                
                if (latestA === 0 && latestB === 0) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
                return latestB - latestA;
            });

            setStudents(sorted);
            setFilteredStudents(sorted);
        } catch (error) {
            console.error('Failed to fetch student documents:', error);
            Alert.alert("Error", "Failed to load student submissions.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearch(text);
        const filtered = students.filter(s => 
            s.displayName.toLowerCase().includes(text.toLowerCase()) ||
            s.email.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredStudents(filtered);
    };

    const handleSelectStudent = async (student) => {
        setIsFetchingDetail(true);
        try {
            // Fetch full user details to ensure we have the documents field
            const res = await authAPI.getUserById(student._id);
            setSelectedStudent(res.data);
        } catch (error) {
            console.error('Failed to fetch user details:', error);
            Alert.alert("Error", "Failed to load document details.");
        } finally {
            setIsFetchingDetail(false);
        }
    };

    const handleVerify = async (docName, status) => {
        if (!selectedStudent) return;
        if (status === 'rejected' && !remark.trim()) {
            Alert.alert("Remark Required", "Please provide a reason for rejection.");
            return;
        }

        setIsProcessing(true);
        try {
            const updatedDocs = { ...selectedStudent.documents };
            updatedDocs[docName] = {
                ...updatedDocs[docName],
                status: status,
                remark: status === 'rejected' ? remark : '',
                verifiedAt: new Date().toISOString()
            };

            const response = await authAPI.updateUserRole(selectedStudent._id, { documents: updatedDocs });
            
            const updatedStudent = { ...selectedStudent, ...response.data };
            setSelectedStudent(updatedStudent);
            
            setStudents(prev => prev.map(s => s._id === selectedStudent._id ? updatedStudent : s));
            
            Alert.alert("Success", `Document ${status} successfully.`);
            setRemark('');
        } catch (error) {
            console.error('Verification error:', error);
            Alert.alert("Error", "Failed to update document status.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async (url, fileName) => {
        const isPdf = url.toLowerCase().endsWith('.pdf');
        const viewUrl = isPdf 
            ? `${api.defaults.baseURL}upload/view-pdf?url=${encodeURIComponent(url)}`
            : url;

        if (Platform.OS === 'web') {
            window.open(viewUrl, '_blank');
            return;
        }

        try {
            const fileUri = FileSystem.documentDirectory + fileName;
            const downloadRes = await FileSystem.downloadAsync(url, fileUri);
            
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadRes.uri);
            } else {
                Alert.alert("Success", "File downloaded to: " + downloadRes.uri);
            }
        } catch (error) {
            Alert.alert("Download Error", "Failed to download document.");
        }
    };

    const exportToCSV = () => {
        try {
            let csvContent = "Name,Email,Admission Category,Documents,Status\n";
            
            students.forEach(s => {
                const docNames = s.documents ? Object.keys(s.documents).join("; ") : "None";
                const statuses = s.documents ? Object.values(s.documents).map(d => d.status).join("; ") : "None";
                csvContent += `"${s.displayName}","${s.email}","${s.admissionCategory || 'OPEN'}","${docNames}","${statuses}"\n`;
            });

            if (Platform.OS === 'web') {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "student_documents_report.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const path = FileSystem.cacheDirectory + "student_documents_report.csv";
                FileSystem.writeAsStringAsync(path, csvContent).then(() => {
                    Sharing.shareAsync(path);
                });
            }
        } catch (e) {
            Alert.alert("Export Failed", "Could not generate CSV.");
        }
    };

    const renderStudentItem = ({ item }) => {
        const docCount = item.documents ? Object.keys(item.documents).length : 0;
        const pendingCount = item.documents ? Object.values(item.documents).filter(d => d.status === 'pending').length : 0;
        
        return (
            <TouchableOpacity 
                style={styles.studentCard}
                onPress={() => handleSelectStudent(item)}
            >
                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.displayName}</Text>
                    <Text style={styles.studentEmail}>{item.email}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.miniBadge}>
                            <FileText size={12} color={Colors.primary} />
                            <Text style={styles.badgeText}>{docCount} Documents</Text>
                        </View>
                        {pendingCount > 0 && (
                            <View style={[styles.miniBadge, { backgroundColor: '#FEF3C7' }]}>
                                <ActivityIndicator size="small" color="#F59E0B" style={{ scaleX: 0.6, scaleY: 0.6 }} />
                                <Text style={[styles.badgeText, { color: '#D97706' }]}>{pendingCount} Pending</Text>
                            </View>
                        )}
                    </View>
                </View>
                <ChevronRight size={20} color={Colors.divider} />
            </TouchableOpacity>
        );
    };

    return (
        <MainLayout title="Student Documents" noPadding>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.searchBar}>
                        <Search size={20} color={Colors.text.tertiary} />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Search students..."
                            value={search}
                            onChangeText={handleSearch}
                        />
                    </View>
                    <TouchableOpacity style={styles.exportBtn} onPress={exportToCSV}>
                        <DownloadCloud size={20} color="#fff" />
                        <Text style={styles.exportText}>Export</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <FlatList 
                        data={filteredStudents}
                        keyExtractor={item => item._id}
                        renderItem={renderStudentItem}
                        contentContainerStyle={styles.listPadding}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <FileCheck size={48} color={Colors.divider} />
                                <Text style={styles.emptyText}>No students found.</Text>
                            </View>
                        }
                    />
                )}

                {/* Detail Modal */}
                <Modal
                    visible={!!selectedStudent || isFetchingDetail}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSelectedStudent(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {isFetchingDetail ? (
                                <View style={styles.center}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                    <Text style={{ marginTop: 12, color: Colors.text.tertiary }}>Loading documents...</Text>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View>
                                            <Text style={styles.modalTitle}>{selectedStudent?.displayName}</Text>
                                            <Text style={styles.modalSub}>{selectedStudent?.email}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                                            <XCircle size={24} color={Colors.text.tertiary} />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                        <View style={styles.studentDetailBox}>
                                            <View style={styles.detailItem}>
                                                <User size={16} color={Colors.primary} />
                                                <Text style={styles.detailLabel}>Category:</Text>
                                                <Text style={styles.detailValue}>{selectedStudent?.admissionCategory || 'OPEN'}</Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Calendar size={16} color={Colors.primary} />
                                                <Text style={styles.detailLabel}>Admission Path:</Text>
                                                <Text style={styles.detailValue}>{selectedStudent?.admissionPath || 'General'}</Text>
                                            </View>
                                        </View>

                                        <Text style={styles.sectionTitle}>Submitted Documents</Text>
                                        
                                        {selectedStudent?.documents && Object.keys(selectedStudent.documents).length > 0 ? (
                                            Object.entries(selectedStudent.documents).map(([name, doc]) => (
                                                <View key={name} style={styles.docVerifyCard}>
                                                    <View style={styles.docHeader}>
                                                        <FileText size={18} color={Colors.text.primary} />
                                                        <Text style={styles.docName}>{name}</Text>
                                                        <View style={[
                                                            styles.statusBadge, 
                                                            doc.status === 'accepted' || doc.status === 'verified' ? styles.statusAccepted : 
                                                            doc.status === 'rejected' ? styles.statusRejected : styles.statusPending
                                                        ]}>
                                                            <Text style={styles.statusText}>{(doc.status || 'pending').toUpperCase()}</Text>
                                                        </View>
                                                    </View>

                                                    {doc.category && (
                                                        <View style={styles.docCategoryBadge}>
                                                            <Tag size={10} color={Colors.primary} />
                                                            <Text style={styles.docCategoryText}>{doc.category}</Text>
                                                        </View>
                                                    )}

                                                    <View style={styles.docActions}>
                                                        <TouchableOpacity 
                                                            style={styles.viewDocBtn}
                                                            onPress={() => handleDownload(doc.uri, `${selectedStudent.displayName}_${name}.pdf`)}
                                                        >
                                                            <ExternalLink size={14} color={Colors.primary} />
                                                            <Text style={styles.viewDocText}>View / Download</Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    {doc.status !== 'accepted' && doc.status !== 'verified' && (
                                                        <View style={styles.verifyControls}>
                                                            <TextInput 
                                                                style={styles.remarkInput}
                                                                placeholder="Remark (optional for accept, required for reject)"
                                                                value={remark}
                                                                onChangeText={setRemark}
                                                            />
                                                            <View style={styles.btnGroup}>
                                                                <TouchableOpacity 
                                                                    style={[styles.verifyBtn, styles.rejectBtn]}
                                                                    onPress={() => handleVerify(name, 'rejected')}
                                                                    disabled={isProcessing}
                                                                >
                                                                    <XCircle size={16} color="#fff" />
                                                                    <Text style={styles.verifyBtnText}>Reject</Text>
                                                                </TouchableOpacity>
                                                                <TouchableOpacity 
                                                                    style={[styles.verifyBtn, styles.acceptBtn]}
                                                                    onPress={() => handleVerify(name, 'accepted')}
                                                                    disabled={isProcessing}
                                                                >
                                                                    <CheckCircle size={16} color="#fff" />
                                                                    <Text style={styles.verifyBtnText}>Accept</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    )}

                                                    {doc.remark ? (
                                                        <View style={styles.remarkBox}>
                                                            <MessageSquare size={14} color="#64748B" />
                                                            <Text style={styles.remarkText}>{doc.remark}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            ))
                                        ) : (
                                            <View style={styles.emptyDetailBox}>
                                                <AlertCircle size={24} color={Colors.text.tertiary} />
                                                <Text style={styles.emptyDetailText}>No documents uploaded yet.</Text>
                                            </View>
                                        )}
                                        
                                        <View style={styles.cleanupNotice}>
                                            <Info size={14} color="#64748B" />
                                            <Text style={styles.cleanupText}>
                                                Note: Verified documents are automatically scheduled for deletion from the server after 7 days.
                                            </Text>
                                        </View>
                                        <View style={{ height: 40 }} />
                                    </ScrollView>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { 
        flexDirection: 'row', padding: 16, gap: 12, 
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' 
    },
    searchBar: { 
        flex: 1, flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 44 
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: Colors.text.primary },
    exportBtn: { 
        backgroundColor: Colors.primary, flexDirection: 'row', 
        alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: 12 
    },
    exportText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listPadding: { padding: 16, paddingBottom: 40 },
    studentCard: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
        padding: 16, borderRadius: 16, marginBottom: 12, ...Shadows.sm 
    },
    studentInfo: { flex: 1 },
    studentName: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    studentEmail: { fontSize: 13, color: Colors.text.tertiary, marginBottom: 8 },
    badgeRow: { flexDirection: 'row', gap: 8 },
    miniBadge: { 
        flexDirection: 'row', alignItems: 'center', gap: 4, 
        backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 
    },
    badgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },

    emptyBox: { padding: 80, alignItems: 'center' },
    emptyText: { marginTop: 12, color: Colors.text.tertiary, textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { 
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, 
        height: '90%', padding: 24 
    },
    modalHeader: { 
        flexDirection: 'row', justifyContent: 'space-between', 
        alignItems: 'flex-start', marginBottom: 24 
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text.primary },
    modalSub: { fontSize: 14, color: Colors.text.tertiary },
    modalScroll: { flex: 1 },

    studentDetailBox: { 
        backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, 
        gap: 10, marginBottom: 24 
    },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailLabel: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
    detailValue: { fontSize: 13, color: Colors.text.primary, fontWeight: 'bold' },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 16 },
    docVerifyCard: { 
        backgroundColor: '#fff', borderRadius: 16, padding: 16, 
        marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' 
    },
    docHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    docName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text.primary },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    statusPending: { backgroundColor: '#FEF3C7' },
    statusAccepted: { backgroundColor: '#DCFCE7' },
    statusRejected: { backgroundColor: '#FEE2E2' },
    statusText: { fontSize: 10, fontWeight: 'bold' },

    docActions: { marginBottom: 12 },
    viewDocBtn: { 
        flexDirection: 'row', alignItems: 'center', gap: 6, 
        backgroundColor: '#EEF2FF', alignSelf: 'flex-start', padding: 8, borderRadius: 8 
    },
    viewDocText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

    verifyControls: { gap: 10, marginTop: 8 },
    remarkInput: { 
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', 
        borderRadius: 8, padding: 10, fontSize: 13 
    },
    btnGroup: { flexDirection: 'row', gap: 10 },
    verifyBtn: { 
        flex: 1, height: 40, borderRadius: 8, flexDirection: 'row', 
        alignItems: 'center', justifyContent: 'center', gap: 6 
    },
    acceptBtn: { backgroundColor: '#10B981' },
    rejectBtn: { backgroundColor: '#EF4444' },
    verifyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    remarkBox: { 
        flexDirection: 'row', gap: 8, backgroundColor: '#F8FAFC', 
        padding: 10, borderRadius: 8, marginTop: 8 
    },
    remarkText: { fontSize: 12, color: '#475569', fontStyle: 'italic' },

    cleanupNotice: { 
        flexDirection: 'row', gap: 8, padding: 16, 
        backgroundColor: '#F8FAFC', borderRadius: 12, marginTop: 10 
    },
    cleanupText: { fontSize: 11, color: '#64748B', flex: 1 },
    docCategoryBadge: { 
        flexDirection: 'row', alignItems: 'center', gap: 4, 
        backgroundColor: '#F1F5F9', alignSelf: 'flex-start', 
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 12 
    },
    docCategoryText: { fontSize: 10, fontWeight: 'bold', color: Colors.text.secondary },
    emptyDetailBox: { padding: 40, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
    emptyDetailText: { marginTop: 8, color: Colors.text.tertiary, fontSize: 13 }
});

export default AdminStudentDocumentsScreen;
