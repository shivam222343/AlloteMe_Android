import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    Switch,
    Image,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../components/layouts/MainLayout';
import { customFormsAPI, authAPI, uploadAPI } from '../services/api';
import { Colors, Shadows } from '../constants/theme';
import * as ImagePicker from 'expo-image-picker';

const FIELD_TYPES = [
    { label: 'Short Text', value: 'short_text', icon: 'text' },
    { label: 'Long Text', value: 'long_text', icon: 'document-text' },
    { label: 'Multiple Choice (Single)', value: 'radio', icon: 'radio-button-on' },
    { label: 'Checkboxes (Multi)', value: 'checkbox', icon: 'checkbox' },
    { label: 'Dropdown List', value: 'dropdown', icon: 'chevron-down-circle' },
    { label: 'Number', value: 'number', icon: 'calculator' },
    { label: 'Email Address', value: 'email', icon: 'mail' },
    { label: 'Contact Number', value: 'phone', icon: 'call' },
    { label: 'College Selector', value: 'college_list', icon: 'business' },
    { label: 'College Review (⭐)', value: 'college_review', icon: 'star' },
    { label: 'Info/Media Block', value: 'info_media', icon: 'image' },
];

const ADMISSION_PATHS = ['MHTCET PCM', 'MHTCET PCB', 'NEET', 'JEE', 'BBA', 'MBA', 'B-PHARM'];

const AdminFormBuilderScreen = ({ route, navigation }) => {
    const { formId } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('draft');
    const [bannerImage, setBannerImage] = useState('');
    const [sections, setSections] = useState([{ id: Date.now().toString(), title: 'Main Section', questions: [] }]);
    const [settings, setSettings] = useState({ isQuiz: false, showMarks: true });

    // Tab Management
    const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'settings' | 'share'
    const [adminList, setAdminList] = useState([]);
    const [sharedAdmins, setSharedAdmins] = useState([]);

    // Question Type Modal
    const [typeModalVisible, setTypeModalVisible] = useState(false);
    const [activeSectionIdx, setActiveSectionIdx] = useState(0);

    useEffect(() => {
        if (formId) loadForm();
        loadAdmins();
    }, [formId]);

    const loadForm = async () => {
        try {
            setLoading(true);
            const res = await customFormsAPI.getById(formId);
            if (res.data.success) {
                const f = res.data.data;
                setTitle(f.title);
                setDescription(f.description);
                setStatus(f.status);
                setBannerImage(f.bannerImage);
                setSections(f.sections || []);
                setSettings(f.settings || { isQuiz: false, showMarks: true });
                setSharedAdmins(f.sharedWith || []);
            }
        } catch (error) { Alert.alert('Error', 'Failed to load form'); }
        finally { setLoading(false); }
    };

    const loadAdmins = async () => {
        try {
            const res = await authAPI.getAdmins();
            if (res.data.success) setAdminList(res.data.data);
        } catch (err) { console.error('Admin Fetch Failed', err); }
    };

    const handleBannerPick = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.5 });
        if (!result.canceled) {
            setLoading(true);
            try {
                const formData = new FormData();
                formData.append('image', { uri: result.assets[0].uri, name: 'banner.jpg', type: 'image/jpeg' });
                const upRes = await uploadAPI.upload(formData);
                if (upRes.data.success) {
                    setBannerImage(upRes.data.url);
                    Alert.alert('Success', 'Banner uploaded successfully');
                }
            } catch (err) { Alert.alert('Upload Error', 'Could not upload banner to cloud'); }
            finally { setLoading(false); }
        }
    };

    const addSection = () => {
        setSections([...sections, { id: Date.now().toString(), title: 'New Section', questions: [] }]);
    };

    const removeSection = (sIdx) => {
        if (sections.length === 1) return;
        setSections(sections.filter((_, i) => i !== sIdx));
    };

    const addQuestion = (sIdx, type = 'short_text') => {
        const newSections = [...sections];
        newSections[sIdx].questions.push({
            id: Date.now().toString() + Math.random(),
            label: 'Question Title',
            type: type,
            required: false,
            options: (type === 'radio' || type === 'checkbox' || type === 'dropdown') ? [{ label: 'Option 1', isCorrect: false }] : [],
            admissionPath: type === 'college_list' ? 'MHTCET PCM' : null,
            mediaUrl: '',
            mediaType: 'image',
            autoPostReview: type === 'college_review' ? true : false
        });
        setSections(newSections);
    };

    const updateQuestion = (sIdx, qIdx, data) => {
        const newSecs = [...sections];
        newSecs[sIdx].questions[qIdx] = { ...newSecs[sIdx].questions[qIdx], ...data };
        setSections(newSecs);
    };

    const removeQuestion = (sIdx, qIdx) => {
        const newSecs = [...sections];
        newSecs[sIdx].questions.splice(qIdx, 1);
        setSections(newSecs);
    };

    const duplicateQuestion = (sIdx, qIdx) => {
        const newSecs = [...sections];
        const qToCopy = newSecs[sIdx].questions[qIdx];
        const newQ = {
            ...qToCopy,
            id: Date.now().toString() + Math.random(),
            label: qToCopy.label + ' (Copy)'
        };
        newSecs[sIdx].questions.splice(qIdx + 1, 0, newQ);
        setSections(newSecs);
    };

    const handleSave = async () => {
        if (!title) return Alert.alert('Validation', 'Title is required');
        setLoading(true);
        try {
            const payload = { title, description, bannerImage, status, sections, settings, sharedWith: sharedAdmins.map(a => a._id) };
            const res = formId ? await customFormsAPI.update(formId, payload) : await customFormsAPI.create(payload);
            if (res.data.success) {
                Alert.alert('Saved!', 'Form updated successfully');
                navigation.goBack();
            }
        } catch (error) { Alert.alert('Error', error.response?.data?.message || 'Save failed'); }
        finally { setLoading(false); }
    };

    const renderQuestion = (q, sIdx, qIdx) => (
        <View key={q.id} style={styles.qCard}>
            <View style={styles.qHeader}>
                <TextInput size="small" style={styles.qTitleInput} value={q.label} onChangeText={(val) => updateQuestion(sIdx, qIdx, { label: val })} placeholder="Untitled Question" />
                <View style={styles.qActionRow}>
                    <TouchableOpacity onPress={() => duplicateQuestion(sIdx, qIdx)} style={styles.qHeaderBtn}>
                        <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeQuestion(sIdx, qIdx)} style={styles.qHeaderBtn}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.typeRow}>
                <Ionicons name={FIELD_TYPES.find(f => f.value === q.type)?.icon || 'help'} size={18} color={Colors.primary} />
                <Text style={styles.typeText}>{FIELD_TYPES.find(f => f.value === q.type)?.label}</Text>
                <View style={{ flex: 1 }} />
                <View style={styles.mandatoryRow}>
                    <Text style={styles.mandatoryLabel}>Mandatory</Text>
                    <Switch
                        size="small"
                        value={q.required}
                        onValueChange={(val) => updateQuestion(sIdx, qIdx, { required: val })}
                        thumbColor={q.required ? Colors.primary : '#f4f3f4'}
                        trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    />
                </View>
            </View>

            {(q.type === 'radio' || q.type === 'checkbox' || q.type === 'dropdown') && (
                <View style={styles.optionsArea}>
                    <Text style={styles.areaSubtitle}>Manage Options</Text>
                    {q.options.map((opt, oIdx) => (
                        <View key={oIdx} style={styles.optionRow}>
                            <Ionicons name={q.type === 'radio' ? 'radio-button-off' : q.type === 'checkbox' ? 'square-outline' : 'list-outline'} size={18} color="#94A3B8" />
                            <TextInput
                                style={styles.optInput}
                                value={opt.label}
                                placeholder={`Option ${oIdx + 1}`}
                                onChangeText={(v) => {
                                    const newOpts = [...q.options];
                                    newOpts[oIdx].label = v;
                                    updateQuestion(sIdx, qIdx, { options: newOpts });
                                }}
                            />
                            {settings.isQuiz && (
                                <TouchableOpacity
                                    style={styles.correctToggle}
                                    onPress={() => {
                                        const newOpts = [...q.options];
                                        if (q.type !== 'checkbox') newOpts.forEach(o => o.isCorrect = false);
                                        newOpts[oIdx].isCorrect = !newOpts[oIdx].isCorrect;
                                        updateQuestion(sIdx, qIdx, { options: newOpts });
                                    }}
                                >
                                    <Ionicons name="checkmark-circle" size={22} color={opt.isCorrect ? '#10B981' : '#E2E8F0'} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.removeOpt} onPress={() => {
                                const newOpts = q.options.filter((_, i) => i !== oIdx);
                                updateQuestion(sIdx, qIdx, { options: newOpts });
                            }}>
                                <Ionicons name="close-circle" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addOptBtn} onPress={() => {
                        const newOpts = [...q.options, { label: 'Option ' + (q.options.length + 1), isCorrect: false }];
                        updateQuestion(sIdx, qIdx, { options: newOpts });
                    }}>
                        <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                        <Text style={styles.addOptText}>Add Another Option</Text>
                    </TouchableOpacity>
                </View>
            )}

            {q.type === 'college_list' && (
                <View style={styles.configArea}>
                    <Text style={styles.configLabel}>Filter by Admission Path:</Text>
                    <View style={styles.pathRow}>
                        {ADMISSION_PATHS.map(p => (
                            <TouchableOpacity key={p} onPress={() => updateQuestion(sIdx, qIdx, { admissionPath: p })} style={[styles.pathChip, q.admissionPath === p && styles.pathChipActive]}>
                                <Text style={[styles.pathText, q.admissionPath === p && styles.pathTextActive]}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {q.type === 'college_review' && (
                <View style={styles.configArea}>
                    <View style={styles.mandatoryRow}>
                        <Text style={[styles.mandatoryLabel, { flex: 1 }]}>Auto-post to College Review Tab</Text>
                        <Switch
                            size="small"
                            value={q.autoPostReview}
                            onValueChange={(val) => updateQuestion(sIdx, qIdx, { autoPostReview: val })}
                            thumbColor={q.autoPostReview ? '#10B981' : '#f4f3f4'}
                            trackColor={{ false: '#CBD5E1', true: '#6EE7B7' }}
                        />
                    </View>
                    <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>If enabled, genuine reviews will be visible on the college's detail page immediately after submission.</Text>
                </View>
            )}

            {q.type === 'info_media' && (
                <View style={styles.configArea}>
                    <TextInput style={styles.mediaInput} placeholder="Image/Media URL" value={q.mediaUrl} onChangeText={(v) => updateQuestion(sIdx, qIdx, { mediaUrl: v })} />
                </View>
            )}
        </View>
    );

    return (
        <MainLayout title={formId ? "Edit Form" : "Create Form"} backButton={true}>
            <View style={styles.tabBar}>
                <TouchableOpacity onPress={() => setActiveTab('questions')} style={[styles.tabItem, activeTab === 'questions' && styles.tabActive]}><Text style={[styles.tabText, activeTab === 'questions' && styles.tabTextActive]}>Questions</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('settings')} style={[styles.tabItem, activeTab === 'settings' && styles.tabActive]}><Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Settings</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('share')} style={[styles.tabItem, activeTab === 'share' && styles.tabActive]}><Text style={[styles.tabText, activeTab === 'share' && styles.tabTextActive]}>Sharing</Text></TouchableOpacity>
            </View>

            <ScrollView style={styles.container}>
                {activeTab === 'questions' && (
                    <View style={{ paddingVertical: 16 }}>
                        <View style={styles.headerForm}>
                            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="Form Title" />
                            <TextInput style={styles.descInput} value={description} onChangeText={setDescription} placeholder="Form description..." multiline />

                            <TouchableOpacity style={styles.bannerBtn} onPress={handleBannerPick}>
                                {bannerImage ? <Image source={{ uri: bannerImage }} style={styles.bannerImg} /> : <View style={styles.bannerPlacer}><Ionicons name="image-outline" size={24} color="#64748B" /><Text style={{ color: '#64748B', fontSize: 12 }}>Add Header Banner</Text></View>}
                            </TouchableOpacity>

                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>Form Status:</Text>
                                {['draft', 'published', 'closed'].map(s => (
                                    <TouchableOpacity key={s} onPress={() => setStatus(s)} style={[styles.statusChip, status === s && styles.statusChipActive]}>
                                        <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>{s.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {sections.map((sec, sIdx) => (
                            <View key={sec.id} style={styles.sectionWrap}>
                                <View style={styles.sectionHeader}>
                                    <TextInput style={styles.secTitle} value={sec.title} onChangeText={(v) => {
                                        const n = [...sections]; n[sIdx].title = v; setSections(n);
                                    }} />
                                    <TouchableOpacity onPress={() => removeSection(sIdx)}><Ionicons name="close-circle" size={20} color="#EF4444" /></TouchableOpacity>
                                </View>
                                {sec.questions.map((q, qIdx) => renderQuestion(q, sIdx, qIdx))}
                                <TouchableOpacity style={styles.addQBtn} onPress={() => {
                                    setActiveSectionIdx(sIdx);
                                    setTypeModalVisible(true);
                                }}>
                                    <Ionicons name="add-circle" size={24} color={Colors.primary} />
                                    <Text style={styles.addQText}>Add Question</Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.addSecBtn} onPress={addSection}>
                            <Ionicons name="layers-outline" size={20} color={Colors.primary} />
                            <Text style={styles.addSecText}>Add New Section</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab === 'settings' && (
                    <View style={styles.settingsView}>
                        <View style={styles.settingCard}>
                            <View style={styles.settingRow}>
                                <View>
                                    <Text style={styles.settingTitle}>Make this a quiz</Text>
                                    <Text style={styles.settingDesc}>Assign point values, set answers, and automatically provide feedback.</Text>
                                </View>
                                <Switch value={settings.isQuiz} onValueChange={(v) => setSettings({ ...settings, isQuiz: v })} trackColor={{ true: '#C4B5FD' }} thumbColor={settings.isQuiz ? Colors.primary : Colors.surface} />
                            </View>
                            {settings.isQuiz && (
                                <View style={[styles.settingRow, { marginTop: 16, borderTopWidth: 1, paddingTop: 16, borderColor: '#f1f5f9' }]}>
                                    <View>
                                        <Text style={styles.settingTitle}>Release marks</Text>
                                        <Text style={styles.settingDesc}>Show score immediately after submission.</Text>
                                    </View>
                                    <Switch value={settings.showMarks} onValueChange={(v) => setSettings({ ...settings, showMarks: v })} trackColor={{ true: '#C4B5FD' }} thumbColor={settings.showMarks ? Colors.primary : Colors.surface} />
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {activeTab === 'share' && (
                    <View style={styles.shareView}>
                        <Text style={styles.shareLabel}>Shared Administrators</Text>
                        <Text style={styles.shareDesc}>Admins shared here can view and edit this form.</Text>
                        <View style={styles.adminList}>
                            {adminList.map(admin => {
                                const isShared = sharedAdmins.find(a => a._id === admin._id);
                                return (
                                    <TouchableOpacity key={admin._id} style={styles.adminRow} onPress={() => {
                                        if (isShared) setSharedAdmins(sharedAdmins.filter(a => a._id !== admin._id));
                                        else setSharedAdmins([...sharedAdmins, admin]);
                                    }}>
                                        <Image source={{ uri: admin.profilePicture || `https://ui-avatars.com/api/?name=${admin.displayName}` }} style={styles.adminAvatar} />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.adminName}>{admin.displayName}</Text>
                                            <Text style={styles.adminEmail}>{admin.email}</Text>
                                        </View>
                                        <Ionicons name={isShared ? "checkmark-circle" : "ellipse-outline"} size={22} color={isShared ? Colors.primary : "#CBD5E1"} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Form Changes</Text>}
                </TouchableOpacity>
            </View>

            {/* Question Type Modal */}
            <Modal visible={typeModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.typeModalContent}>
                        <View style={styles.typeModalHeader}>
                            <Text style={styles.typeModalTitle}>Choose Field Type</Text>
                            <TouchableOpacity onPress={() => setTypeModalVisible(false)}><Ionicons name="close" size={24} color="#64748B" /></TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.typeGrid}>
                            {FIELD_TYPES.map(f => (
                                <TouchableOpacity key={f.value} style={styles.typeItem} onPress={() => {
                                    addQuestion(activeSectionIdx, f.value);
                                    setTypeModalVisible(false);
                                }}>
                                    <View style={styles.typeIconBox}><Ionicons name={f.icon} size={20} color={Colors.primary} /></View>
                                    <Text style={styles.typeLabel}>{f.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    tabBar: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: Colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    tabTextActive: { color: Colors.primary },
    headerForm: { backgroundColor: 'white', padding: 20, borderRadius: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 20 },
    titleInput: { fontSize: 24, fontWeight: '700', color: '#1E293B', marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    descInput: { fontSize: 14, color: '#64748B', lineHeight: 20, minHeight: 40 },
    bannerBtn: { marginTop: 16, height: 100, borderRadius: 12, overflow: 'hidden', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
    bannerImg: { width: '100%', height: '100%' },
    bannerPlacer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
    statusLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f1f5f9' },
    statusChipActive: { backgroundColor: Colors.primary },
    statusChipText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    statusChipTextActive: { color: 'white' },
    sectionWrap: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 12 },
    secTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
    qCard: { backgroundColor: 'white', padding: 16, borderRadius: 0, marginBottom: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9' },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    qTitleInput: { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1, paddingRight: 10 },
    qActionRow: { flexDirection: 'row', gap: 12 },
    qHeaderBtn: { padding: 4 },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: '#f0f9ff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e0f2fe' },
    typeText: { fontSize: 13, fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.5 },
    mandatoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    mandatoryLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
    optionsArea: { marginLeft: 10, marginTop: 10, backgroundColor: '#fcfcfc', borderLeftWidth: 2, borderLeftColor: '#e2e8f0', paddingLeft: 12 },
    areaSubtitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase' },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    optInput: { flex: 1, fontSize: 15, color: '#1e293b', paddingVertical: 4, borderBottomWidth: 1.5, borderBottomColor: '#f1f5f9' },
    correctToggle: { padding: 4 },
    removeOpt: { padding: 4 },
    addOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginTop: 4 },
    addOptText: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
    configArea: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    configLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8 },
    pathRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pathChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f1f5f9' },
    pathChipActive: { backgroundColor: '#FDE047' },
    pathText: { fontSize: 10, fontWeight: '600', color: '#64748B' },
    pathTextActive: { color: '#000' },
    mediaInput: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, fontSize: 13 },
    addQBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.primary, borderRadius: 12, gap: 10, marginTop: 8 },
    addQText: { color: Colors.primary, fontWeight: '700' },
    addSecBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#FEF9C3', borderRadius: 12, gap: 8 },
    addSecText: { color: '#854d0e', fontWeight: '700' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', ...Shadows.md },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    settingsView: { padding: 16 },
    settingCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, ...Shadows.sm },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    settingTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    settingDesc: { fontSize: 12, color: '#64748B', marginTop: 4, maxWidth: '80%' },
    shareView: { padding: 20 },
    shareLabel: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    shareDesc: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 20 },
    adminList: { gap: 12 },
    adminRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 16, ...Shadows.xs },
    adminAvatar: { width: 44, height: 44, borderRadius: 22 },
    adminName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    adminEmail: { fontSize: 12, color: '#64748B' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    typeModalContent: { backgroundColor: 'white', width: '90%', borderRadius: 24, padding: 20, maxHeight: '80%' },
    typeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    typeModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    typeItem: { width: '47%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#f1f5f9' },
    typeIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', ...Shadows.xs },
    typeLabel: { fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' }
});

export default AdminFormBuilderScreen;
