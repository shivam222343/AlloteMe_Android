import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert,
    ActivityIndicator,
    Modal,
    Platform,
    Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../components/MainLayout';
import { customFormsAPI, mediaAPI, adminAPI } from '../services/api';
import { API_CONFIG } from '../constants/theme';

const QUESTION_TYPES = [
    { label: 'Short Text', value: 'short_text', icon: 'text' },
    { label: 'Long Text', value: 'long_text', icon: 'document-text' },
    { label: 'Number', value: 'number', icon: 'calculator' },
    { label: 'Dropdown', value: 'dropdown', icon: 'chevron-down-circle' },
    { label: 'Radio Buttons', value: 'radio', icon: 'radio-button-on' },
    { label: 'Checkboxes', value: 'checkbox', icon: 'checkbox' },
    { label: 'Image Upload', value: 'image', icon: 'image' },
    { label: 'File Upload', value: 'file', icon: 'attach' },
    { label: 'Phone Number', value: 'phone', icon: 'call' },
    { label: 'Email', value: 'email', icon: 'mail' },
    { label: 'Display Image/File', value: 'info_media', icon: 'information-circle' },
];

const FormBuilderScreen = ({ route, navigation }) => {
    const { formId } = route.params || {};
    const [loading, setLoading] = useState(!!formId);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formTitle, setFormTitle] = useState('Untitled Form');
    const [formDesc, setFormDesc] = useState('');
    const [formBanner, setFormBanner] = useState('');
    const [status, setStatus] = useState('draft');
    const [sharedWith, setSharedWith] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [isQuiz, setIsQuiz] = useState(false);
    const [showMarks, setShowMarks] = useState(false);

    const handleBannerUpload = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 6],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled) {
                setUploading(true);
                const asset = result.assets[0];

                const res = await mediaAPI.uploadBase64({
                    image: `data:image/jpeg;base64,${asset.base64}`,
                    folder: 'form-banners'
                });

                if (res.success) {
                    setFormBanner(res.data.url);
                } else {
                    Alert.alert('Error', 'Failed to upload image');
                }
            }
        } catch (error) {
            console.error('Banner upload error:', error);
            Alert.alert('Error', 'An error occurred during upload');
        } finally {
            setUploading(false);
        }
    };
    const [sections, setSections] = useState([
        { id: 'sec_1', title: 'Basic Info', questions: [] }
    ]);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);

    useEffect(() => {
        fetchAdmins();
        if (formId) {
            fetchForm();
        }
    }, [formId]);

    const fetchAdmins = async () => {
        try {
            const res = await adminAPI.getAdmins();
            if (res.success) {
                setAdmins(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch admins:', error);
        }
    };

    const fetchForm = async () => {
        try {
            const res = await customFormsAPI.getById(formId);
            if (res.success) {
                const form = res.data;
                setFormTitle(form.title);
                setFormDesc(form.description);
                setFormBanner(form.bannerImage || '');
                setStatus(form.status);
                setSharedWith(form.sharedWith?.map(u => u._id) || []);
                setSections(form.sections || [{ id: 'sec_1', title: 'Basic Info', questions: [] }]);
                setIsQuiz(form.settings?.isQuiz || false);
                setShowMarks(form.settings?.showMarks || false);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch form data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = (type) => {
        const newQuestion = {
            id: 'q_' + Date.now(),
            type,
            label: 'New Question',
            required: false,
            options: type === 'dropdown' || type === 'radio' || type === 'checkbox' ? [
                { id: 'opt_1', label: 'Option 1' }
            ] : []
        };

        const updatedSections = [...sections];
        updatedSections[activeSectionIndex].questions.push(newQuestion);
        setSections(updatedSections);
    };

    const handleUpdateQuestion = (qIndex, updates) => {
        const updatedSections = [...sections];
        updatedSections[activeSectionIndex].questions[qIndex] = {
            ...updatedSections[activeSectionIndex].questions[qIndex],
            ...updates
        };
        setSections(updatedSections);
    };

    const handleDeleteQuestion = (qIndex) => {
        const updatedSections = [...sections];
        updatedSections[activeSectionIndex].questions.splice(qIndex, 1);
        setSections(updatedSections);
    };

    const handleAddSection = () => {
        setSections([...sections, {
            id: 'sec_' + Date.now(),
            title: 'New Section',
            questions: []
        }]);
        setActiveSectionIndex(sections.length);
    };

    const handleDeleteSection = () => {
        if (sections.length <= 1) {
            Alert.alert('Error', 'Form must have at least one section');
            return;
        }

        Alert.alert(
            'Delete Section',
            'Are you sure you want to delete this entire section and all its questions?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const newSecs = sections.filter((_, i) => i !== activeSectionIndex);
                        setSections(newSecs);
                        setActiveSectionIndex(Math.max(0, activeSectionIndex - 1));
                    }
                }
            ]
        );
    };

    const handleMediaUpload = async (qIndex) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled) {
                setUploading(true);
                const asset = result.assets[0];
                const type = asset.type === 'image' ? 'image' : 'file';

                const res = await mediaAPI.uploadBase64({
                    image: asset.type === 'image' ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri,
                    folder: 'form-media'
                });

                if (res.success) {
                    handleUpdateQuestion(qIndex, {
                        mediaUrl: res.data.url,
                        mediaType: type
                    });
                } else {
                    Alert.alert('Error', 'Failed to upload media');
                }
            }
        } catch (error) {
            console.error('Media upload error:', error);
            Alert.alert('Error', 'An error occurred during upload');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!formTitle.trim()) {
            Alert.alert('Error', 'Please provide a form title');
            return;
        }

        const formData = {
            title: formTitle,
            description: formDesc,
            bannerImage: formBanner,
            status,
            sharedWith,
            sections,
            settings: {
                isQuiz,
                showMarks
            }
        };

        try {
            setSaving(true);
            let res;
            if (formId) {
                res = await customFormsAPI.update(formId, formData);
            } else {
                res = await customFormsAPI.create(formData);
            }

            if (res.success) {
                const publicUrl = `${API_CONFIG.WEB_FORM_URL}/form/${res.data._id || formId}`;
                Alert.alert(
                    'Success',
                    `Form saved successfully!\n\nPublic URL:\n${publicUrl}`,
                    [
                        {
                            text: 'Copy & Close',
                            onPress: async () => {
                                await Clipboard.setStringAsync(publicUrl);
                                navigation.goBack();
                            }
                        },
                        {
                            text: 'Close',
                            onPress: () => navigation.goBack()
                        }
                    ]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to save form');
        } finally {
            setSaving(false);
        }
    };

    const renderQuestionEditor = (q, qIndex) => {
        return (
            <View key={q.id} style={styles.questionCard}>
                <View style={styles.qHeader}>
                    <Ionicons name={QUESTION_TYPES.find(t => t.value === q.type)?.icon || 'help'} size={18} color="#64748B" />
                    <Text style={styles.qTypeText}>
                        {QUESTION_TYPES.find(t => t.value === q.type)?.label}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteQuestion(qIndex)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={styles.qLabelInput}
                    value={q.label}
                    onChangeText={(text) => handleUpdateQuestion(qIndex, { label: text })}
                    placeholder="Question Label"
                />

                {(q.type === 'radio' || q.type === 'checkbox' || q.type === 'dropdown') && (
                    <View style={styles.optionsContainer}>
                        {q.options.map((opt, optIndex) => (
                            <View key={opt.id} style={styles.optionRow}>
                                <Ionicons
                                    name={q.type === 'checkbox' ? 'square-outline' : q.type === 'radio' ? 'radio-button-off' : 'chevron-forward'}
                                    size={16}
                                    color="#94A3B8"
                                />
                                <TextInput
                                    style={styles.optionInput}
                                    value={opt.label}
                                    onChangeText={(text) => {
                                        const newOpts = [...q.options];
                                        newOpts[optIndex].label = text;
                                        handleUpdateQuestion(qIndex, { options: newOpts });
                                    }}
                                    placeholder={`Option ${optIndex + 1}`}
                                />
                                <TouchableOpacity onPress={() => {
                                    const newOpts = q.options.filter((_, i) => i !== optIndex);
                                    handleUpdateQuestion(qIndex, { options: newOpts });
                                }}>
                                    <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                                {(q.type === 'radio' || q.type === 'checkbox' || q.type === 'dropdown') && (
                                    <TouchableOpacity
                                        style={[styles.correctIndicator, opt.isCorrect && styles.correctIndicatorActive]}
                                        onPress={() => {
                                            const newOpts = [...q.options];
                                            if (q.type === 'radio' || q.type === 'dropdown') {
                                                // Only one correct for radio/dropdown
                                                newOpts.forEach(o => o.isCorrect = false);
                                                newOpts[optIndex].isCorrect = true;
                                            } else {
                                                newOpts[optIndex].isCorrect = !newOpts[optIndex].isCorrect;
                                            }
                                            handleUpdateQuestion(qIndex, { options: newOpts });
                                        }}
                                    >
                                        <Ionicons name={opt.isCorrect ? "checkmark-circle" : "checkmark-circle-outline"} size={20} color={opt.isCorrect ? "#10B981" : "#CBD5E1"} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        <TouchableOpacity
                            style={styles.addOptionBtn}
                            onPress={() => {
                                const newOpts = [...q.options, { id: 'opt_' + Date.now(), label: `Option ${q.options.length + 1}` }];
                                handleUpdateQuestion(qIndex, { options: newOpts });
                            }}
                        >
                            <Ionicons name="plus" size={14} color="#0A66C2" />
                            <Text style={styles.addOptionText}>Add Option</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {q.type !== 'info_media' && (
                    <View style={styles.validationRow}>
                        <Text style={styles.label}>Min Length:</Text>
                        <TextInput
                            style={styles.smallInput}
                            keyboardType="numeric"
                            value={q.validation?.minLength?.toString()}
                            onChangeText={(v) => handleUpdateQuestion(qIndex, { validation: { ...q.validation, minLength: parseInt(v) || 0 } })}
                        />
                        <Text style={styles.label}>Max Length:</Text>
                        <TextInput
                            style={styles.smallInput}
                            keyboardType="numeric"
                            value={q.validation?.maxLength?.toString()}
                            onChangeText={(v) => handleUpdateQuestion(qIndex, { validation: { ...q.validation, maxLength: parseInt(v) || 0 } })}
                        />
                    </View>
                )}

                {q.type === 'phone' && (
                    <Text style={styles.infoText}>* Automatically restricted to numeric 10 digits</Text>
                )}

                {q.type === 'info_media' && (
                    <View style={styles.mediaUploadSection}>
                        {q.mediaUrl ? (
                            <View style={styles.mediaPreview}>
                                {q.mediaType === 'image' ? (
                                    <Image source={{ uri: q.mediaUrl }} style={styles.infoMediaImg} />
                                ) : (
                                    <View style={styles.fileIconBox}>
                                        <Ionicons name="document-attach" size={32} color="#64748B" />
                                        <Text style={styles.fileName}>File Attached</Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.removeMediaBtn}
                                    onPress={() => handleUpdateQuestion(qIndex, { mediaUrl: '', mediaType: '' })}
                                >
                                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.uploadMediaBtn} onPress={() => handleMediaUpload(qIndex)}>
                                <Ionicons name="cloud-upload" size={24} color="#0A66C2" />
                                <Text style={styles.uploadMediaText}>Upload Image or File for Users</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {q.type !== 'info_media' && (
                    <View style={styles.qFooter}>
                        {(q.type === 'image' || q.type === 'file') && (
                            <View style={styles.requiredRow}>
                                <Text style={styles.requiredText}>Allow Multiple</Text>
                                <Switch
                                    value={q.multiple || false}
                                    onValueChange={(val) => handleUpdateQuestion(qIndex, { multiple: val })}
                                    trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                                    thumbColor={q.multiple ? "#0A66C2" : "#9CA3AF"}
                                />
                            </View>
                        )}
                        <View style={styles.requiredRow}>
                            <Text style={styles.requiredText}>Required</Text>
                            <Switch
                                value={q.required}
                                onValueChange={(val) => handleUpdateQuestion(qIndex, { required: val })}
                                trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                                thumbColor={q.required ? "#0A66C2" : "#9CA3AF"}
                            />
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <MainLayout navigation={navigation} title="Form Builder">
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#0A66C2" />
                </View>
            </MainLayout>
        );
    }

    return (
        <MainLayout navigation={navigation} title="Form Builder">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{formId ? 'Edit Form' : 'Create Form'}</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.metaCard}>
                    <TextInput
                        style={styles.titleInput}
                        value={formTitle}
                        onChangeText={setFormTitle}
                        placeholder="Form Title"
                    />
                    <TextInput
                        style={styles.descInput}
                        value={formDesc}
                        onChangeText={setFormDesc}
                        placeholder="Form Description"
                        multiline
                    />
                    <View style={styles.bannerRow}>
                        <View style={{ flex: 1 }}>
                            <TextInput
                                style={styles.bannerInput}
                                value={formBanner}
                                onChangeText={setFormBanner}
                                placeholder="Banner Image URL"
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleBannerUpload}
                            disabled={uploading}
                            style={styles.uploadBtn}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="#0A66C2" />
                            ) : (
                                <Ionicons name="cloud-upload-outline" size={24} color="#0A66C2" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {formBanner ? (
                        <View style={styles.bannerPreviewContainer}>
                            <Image source={{ uri: formBanner }} style={styles.bannerPreview} />
                            <TouchableOpacity
                                style={styles.removeBannerBtn}
                                onPress={() => setFormBanner('')}
                            >
                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <View style={styles.statusRow}>
                        <Text style={styles.label}>Status:</Text>
                        {['draft', 'published', 'closed'].map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.statusChip, status === s && styles.statusChipActive]}
                                onPress={() => setStatus(s)}
                            >
                                <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>
                                    {s.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.quizSettingsSection}>
                        <View style={styles.settingRow}>
                            <Text style={styles.settingLabel}>Enable Quiz Mode:</Text>
                            <Switch
                                value={isQuiz}
                                onValueChange={setIsQuiz}
                                trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                                thumbColor={isQuiz ? "#0A66C2" : "#9CA3AF"}
                            />
                        </View>
                        {isQuiz && (
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>Show Marks to User after Submit:</Text>
                                <Switch
                                    value={showMarks}
                                    onValueChange={setShowMarks}
                                    trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                                    thumbColor={showMarks ? "#0A66C2" : "#9CA3AF"}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.shareSection}>
                        <View style={styles.shareHeader}>
                            <Text style={styles.label}>Shared Access:</Text>
                            <TouchableOpacity onPress={() => setShowAdminModal(true)} style={styles.addShareBtn}>
                                <Ionicons name="person-add-outline" size={16} color="#0A66C2" />
                                <Text style={styles.addShareText}>Share</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.sharedList}>
                            {sharedWith.length === 0 ? (
                                <Text style={styles.noShareText}>Only you have access to this form.</Text>
                            ) : (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {sharedWith.map(adminId => {
                                        const admin = admins.find(a => a._id === adminId);
                                        return (
                                            <View key={adminId} style={styles.sharedChip}>
                                                <Text style={styles.sharedChipText} numberOfLines={1}>{admin?.displayName || 'Admin'}</Text>
                                                <TouchableOpacity onPress={() => setSharedWith(prev => prev.filter(id => id !== adminId))}>
                                                    <Ionicons name="close-circle" size={14} color="#64748B" />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.tabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {sections.map((sec, idx) => (
                            <TouchableOpacity
                                key={sec.id}
                                style={[styles.tab, activeSectionIndex === idx && styles.activeTab]}
                                onPress={() => setActiveSectionIndex(idx)}
                            >
                                <Text style={[styles.tabText, activeSectionIndex === idx && styles.activeTabText]}>
                                    Section {idx + 1}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.addSectionBtn} onPress={handleAddSection}>
                            <Ionicons name="add" size={20} color="#0A66C2" />
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <TextInput
                        style={[styles.sectionTitleInput, { flex: 1 }]}
                        value={sections[activeSectionIndex].title}
                        onChangeText={(text) => {
                            const newSecs = [...sections];
                            newSecs[activeSectionIndex].title = text;
                            setSections(newSecs);
                        }}
                        placeholder="Section Title"
                    />
                    <TouchableOpacity onPress={handleDeleteSection} style={styles.deleteSecBtn}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                {sections[activeSectionIndex].questions.map(renderQuestionEditor)}

                <View style={styles.addActions}>
                    <Text style={styles.addActionTitle}>Add a question:</Text>
                    <View style={styles.typeGrid}>
                        {QUESTION_TYPES.map(type => (
                            <TouchableOpacity
                                key={type.value}
                                style={styles.typeItem}
                                onPress={() => handleAddQuestion(type.value)}
                            >
                                <Ionicons name={type.icon} size={20} color="#0A66C2" />
                                <Text style={styles.typeLabel}>{type.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={showAdminModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAdminModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.adminModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Share Access with Admins</Text>
                            <TouchableOpacity onPress={() => setShowAdminModal(false)}>
                                <Ionicons name="close" size={24} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.adminList}>
                            {admins.length === 0 ? (
                                <View style={styles.centered}>
                                    <Text style={styles.infoText}>No other admins found.</Text>
                                </View>
                            ) : (
                                admins.map(admin => (
                                    <TouchableOpacity
                                        key={admin._id}
                                        style={styles.adminItem}
                                        onPress={() => {
                                            if (sharedWith.includes(admin._id)) {
                                                setSharedWith(prev => prev.filter(id => id !== admin._id));
                                            } else {
                                                setSharedWith(prev => [...prev, admin._id]);
                                            }
                                        }}
                                    >
                                        <View style={styles.adminAvatar}>
                                            {admin.profilePicture ? (
                                                <Image source={{ uri: admin.profilePicture }} style={styles.avatarImg} />
                                            ) : (
                                                <Text style={styles.avatarInitial}>{admin.displayName?.[0] || 'A'}</Text>
                                            )}
                                        </View>
                                        <View style={styles.adminInfo}>
                                            <Text style={styles.adminName}>{admin.displayName}</Text>
                                            <Text style={styles.adminEmail}>{admin.email}</Text>
                                        </View>
                                        <View style={[styles.checkbox, sharedWith.includes(admin._id) && styles.checkboxActive]}>
                                            {sharedWith.includes(admin._id) && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalDoneBtn}
                            onPress={() => setShowAdminModal(false)}
                        >
                            <Text style={styles.modalDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F5F9',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    saveBtn: {
        backgroundColor: '#0A66C2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 70,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#FFF',
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    metaCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    titleInput: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8,
    },
    descInput: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 12,
    },
    bannerInput: {
        fontSize: 12,
        color: '#0A66C2',
        backgroundColor: '#F0F9FF',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BEE3F8',
    },
    bannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    uploadBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerPreviewContainer: {
        position: 'relative',
        width: '100%',
        height: 100,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    bannerPreview: {
        width: '100%',
        height: '100%',
    },
    removeBannerBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#FFF',
        borderRadius: 12,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    statusChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
    },
    statusChipActive: {
        backgroundColor: '#DBEAFE',
    },
    statusChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
    },
    statusChipTextActive: {
        color: '#0A66C2',
    },
    tabsContainer: {
        marginBottom: 16,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#E2E8F0',
    },
    activeTab: {
        backgroundColor: '#0A66C2',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    activeTabText: {
        color: '#FFF',
    },
    addSectionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitleInput: {
        fontSize: 18,
        fontWeight: '600',
        color: '#334155',
        borderBottomWidth: 1,
        borderBottomColor: '#CBD5E1',
        paddingVertical: 4,
    },
    deleteSecBtn: {
        padding: 8,
        marginLeft: 8,
    },
    questionCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
    },
    qHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    qTypeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginLeft: 8,
        flex: 1,
    },
    deleteBtn: {
        padding: 4,
    },
    qLabelInput: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    validationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    smallInput: {
        width: 40,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
        fontSize: 12,
        textAlign: 'center',
    },
    infoText: {
        fontSize: 10,
        color: '#0A66C2',
        fontStyle: 'italic',
        marginBottom: 8,
    },
    optionsContainer: {
        marginBottom: 12,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    optionInput: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
        paddingVertical: 2,
    },
    addOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    addOptionText: {
        fontSize: 13,
        color: '#0A66C2',
        fontWeight: '600',
        marginLeft: 6,
    },
    qFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20,
    },
    requiredRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requiredText: {
        fontSize: 12,
        color: '#64748B',
    },
    addActions: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 40,
    },
    addActionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 12,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    typeItem: {
        width: '30%',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    typeLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 4,
        textAlign: 'center',
    },
    // Share Section Styles
    shareSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    shareHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    addShareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addShareText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0A66C2',
    },
    sharedList: {
        marginTop: 4,
    },
    noShareText: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic',
    },
    sharedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        gap: 4,
        maxWidth: 150,
    },
    sharedChipText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '500',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    adminModalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    adminList: {
        maxHeight: 400,
    },
    adminItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    adminAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0A66C2',
    },
    adminInfo: {
        flex: 1,
        marginLeft: 12,
    },
    adminName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    adminEmail: {
        fontSize: 12,
        color: '#64748B',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    modalDoneBtn: {
        backgroundColor: '#0A66C2',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    modalDoneText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    correctIndicator: {
        padding: 4,
        marginLeft: 4,
    },
    correctIndicatorActive: {
        // Option specific styles if needed
    },
    mediaUploadSection: {
        marginTop: 12,
        marginBottom: 12,
    },
    uploadMediaBtn: {
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#0A66C2',
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    uploadMediaText: {
        color: '#0A66C2',
        fontSize: 12,
        fontWeight: '600',
    },
    mediaPreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#F1F5F9',
    },
    infoMediaImg: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    fileIconBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    fileName: {
        fontSize: 12,
        color: '#64748B',
    },
    removeMediaBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFF',
        borderRadius: 15,
        elevation: 2,
    },
    quizSettingsSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    settingLabel: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
});

export default FormBuilderScreen;
