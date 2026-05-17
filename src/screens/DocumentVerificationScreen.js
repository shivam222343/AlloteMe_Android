import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    FlatList, Alert, Modal, ActivityIndicator, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadows, Spacing } from '../constants/theme';
import MainLayout from '../components/layouts/MainLayout';
import { 
    CheckCircle, Circle, Info, FileUp, 
    XCircle, Clock, Languages, ChevronRight,
    ShieldCheck, AlertCircle, Trash2
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { uploadAPI } from '../services/api';

const DOCUMENT_DATA = {
    "OPEN": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Recent Passport Size Photo"
    ],
    "EWS": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "EWS Certificate (Proforma V)",
        "Income Certificate",
        "Recent Passport Size Photo"
    ],
    "OBC": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Caste Certificate",
        "Caste Validity Certificate",
        "Non-Creamy Layer Certificate",
        "Income Certificate",
        "Recent Passport Size Photo"
    ],
    "SEBC": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Caste Certificate",
        "Caste Validity Certificate",
        "Non-Creamy Layer Certificate",
        "Income Certificate",
        "Recent Passport Size Photo"
    ],
    "NT/SBC": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Caste Certificate",
        "Caste Validity Certificate",
        "Non-Creamy Layer Certificate",
        "Recent Passport Size Photo"
    ],
    "SC/ST": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Caste Certificate",
        "Caste Validity Certificate",
        "Recent Passport Size Photo"
    ],
    "TFWS": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Income Certificate (Below 8 Lakhs)",
        "Recent Passport Size Photo"
    ],
    "Minority": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Minority Declaration / Proforma O",
        "Recent Passport Size Photo"
    ],
    "Defence": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Father's Domicile Certificate",
        "Defence Proforma C/D/E",
        "Recent Passport Size Photo"
    ],
    "PH": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Medical Disability Certificate (Proforma F1/F2)",
        "Recent Passport Size Photo"
    ],
    "Orphan": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Leaving Certificate / Transfer Certificate",
        "Nationality Certificate / Birth Certificate",
        "Domicile Certificate",
        "Orphan Certificate (Proforma U)",
        "Recent Passport Size Photo"
    ],
    "OMS / Migration": [
        "MHT-CET / JEE Score Card",
        "10th Marksheet",
        "12th Marksheet",
        "Migration Certificate",
        "Nationality Certificate / Birth Certificate",
        "Recent Passport Size Photo"
    ]
};

const DOCUMENT_INFO = {
    "MHT-CET / JEE Score Card": "Official result sheet showing your percentile or rank. Necessary for merit calculation.",
    "10th Marksheet": "Statement of marks for SSC or equivalent examination. Used for birth date verification.",
    "12th Marksheet": "Statement of marks for HSC or equivalent examination. Mandatory for eligibility.",
    "Leaving Certificate / Transfer Certificate": "Document issued by your last school/college at the time of leaving.",
    "Nationality Certificate / Birth Certificate": "Proof of Indian nationality. A school leaving certificate mentioning nationality is also valid.",
    "Domicile Certificate": "Proof that you are a resident of Maharashtra state. Critical for state quota.",
    "EWS Certificate (Proforma V)": "Economic Weaker Section certificate issued by competent authority for current year.",
    "Income Certificate": "Annual family income certificate issued by Tahsildar for the financial year.",
    "Caste Certificate": "Certificate issued by the competent authority indicating the candidate's caste.",
    "Caste Validity Certificate": "Mandatory document for category candidates to prove the validity of their caste claim.",
    "Non-Creamy Layer Certificate": "Proof that the candidate does not belong to the creamy layer. Must be valid up to March 31, 2027.",
    "Recent Passport Size Photo": "Clear, recent color photograph with a light background.",
    "Minority Declaration / Proforma O": "Declaration for candidates claiming linguistic or religious minority status.",
    "Defence Proforma C/D/E": "Specific proforma based on the type of defence claim (Active, Retired, etc.)",
    "Medical Disability Certificate (Proforma F1/F2)": "Certificate from authorized medical board for PH candidates.",
    "Orphan Certificate (Proforma U)": "Certificate from Women and Child Development department for Orphan candidates.",
    "Migration Certificate": "Required for candidates who have passed HSC from boards other than Maharashtra State Board."
};

const TRANSLATIONS = {
    'English': {
        title: 'Document Verification',
        subtitle: (cat) => `Checklist for ${cat} Category`,
        premiumTitle: 'Premium Verification',
        premiumSub: 'Get your documents verified by experts',
        autoDelete: 'Uploaded documents are auto-deleted after 7 days for security.',
        gotIt: 'Got it',
        uploadBtn: 'Upload',
        pending: 'Pending Verification',
        verified: 'Verified & Accepted',
        rejected: 'Rejected',
        remark: 'Remark: ',
        upgradeMsg: 'Document upload and verification is available for premium users only.',
        successMsg: 'Document uploaded for verification. Our counselors will review it within 24-48 hours.',
        noInfo: 'No detailed information available for this document.'
    },
    'Marathi': {
        title: 'कागदपत्र पडताळणी',
        subtitle: (cat) => `${cat} प्रवर्गासाठी कागदपत्रांची यादी`,
        premiumTitle: 'प्रीमियम पडताळणी',
        premiumSub: 'तज्ञांकडून तुमची कागदपत्रे तपासून घ्या',
        autoDelete: 'सुरक्षेसाठी अपलोड केलेली कागदपत्रे ७ दिवसांनंतर आपोआप हटविली जातात.',
        gotIt: 'समजले',
        uploadBtn: 'अपलोड करा',
        pending: 'पडताळणी प्रलंबित',
        verified: 'पडताळणी पूर्ण',
        rejected: 'नाकारले',
        remark: 'टीप: ',
        upgradeMsg: 'कागदपत्र अपलोड आणि पडताळणी केवळ प्रीमियम वापरकर्त्यांसाठी उपलब्ध आहे.',
        successMsg: 'कागदपत्र पडताळणीसाठी अपलोड केले. आमचे समुपदेशक २४-४८ तासांत याचे पुनरावलोकन करतील.',
        noInfo: 'या कागदपत्राबद्दल अधिक माहिती उपलब्ध नाही.'
    }
};

const DOCUMENT_DISPLAY_NAMES = {
    "MHT-CET / JEE Score Card": { en: "MHT-CET / JEE Score Card", mr: "MHT-CET / JEE निकाल पत्रक" },
    "10th Marksheet": { en: "10th Marksheet", mr: "१०वीचे गुणपत्रक" },
    "12th Marksheet": { en: "12th Marksheet", mr: "१२वीचे गुणपत्रक" },
    "Leaving Certificate / Transfer Certificate": { en: "Leaving Certificate (LC/TC)", mr: "शाळा सोडल्याचा दाखला" },
    "Nationality Certificate / Birth Certificate": { en: "Nationality / Birth Certificate", mr: "राष्ट्रीयत्व / जन्माचा दाखला" },
    "Domicile Certificate": { en: "Domicile Certificate", mr: "अधिवास प्रमाणपत्र" },
    "Recent Passport Size Photo": { en: "Recent Passport Size Photo", mr: "नुकताच काढलेला पासपोर्ट फोटो" },
    "EWS Certificate (Proforma V)": { en: "EWS Certificate", mr: "EWS प्रमाणपत्र" },
    "Income Certificate": { en: "Income Certificate", mr: "उत्पन्नाचा दाखला" },
    "Caste Certificate": { en: "Caste Certificate", mr: "जातीचे प्रमाणपत्र" },
    "Caste Validity Certificate": { en: "Caste Validity Certificate", mr: "जाती वैधता प्रमाणपत्र" },
    "Non-Creamy Layer Certificate": { en: "Non-Creamy Layer Certificate", mr: "नॉन-क्रीमी लेअर प्रमाणपत्र" },
    "Minority Declaration / Proforma O": { en: "Minority Declaration", mr: "अल्पसंख्याक घोषणापत्र" },
    "Defence Proforma C/D/E": { en: "Defence Proforma", mr: "डिफेन्स प्रोफॉर्मा" },
    "Medical Disability Certificate (Proforma F1/F2)": { en: "Medical Disability Certificate", mr: "अपंगत्व प्रमाणपत्र" },
    "Orphan Certificate (Proforma U)": { en: "Orphan Certificate", mr: "अनाथ प्रमाणपत्र" },
    "Migration Certificate": { en: "Migration Certificate", mr: "स्थलांतर प्रमाणपत्र" },
    "Income Certificate (Below 8 Lakhs)": { en: "Income Certificate (Below 8L)", mr: "उत्पन्नाचा दाखला (८ लाखांच्या खाली)" },
    "Father's Domicile Certificate": { en: "Father's Domicile Certificate", mr: "वडिलांचे अधिवास प्रमाणपत्र" }
};

const DocumentVerificationScreen = () => {
    const { user, updateProfile } = useAuth();
    const [checklist, setChecklist] = useState(user?.documentChecklist || {});
    const [category, setCategory] = useState(user?.admissionCategory || 'OPEN');
    const [infoModal, setInfoModal] = useState({ visible: false, title: '', content: '' });
    const [language, setLanguage] = useState('English');
    const [uploads, setUploads] = useState(user?.documents || {}); 
    const [isUploading, setIsUploading] = useState(null);

    // Sync state with user profile updates (e.g. after refresh or background updates)
    useEffect(() => {
        if (user?.documents) {
            setUploads(user.documents);
        }
        if (user?.admissionCategory) {
            setCategory(user.admissionCategory);
        }
        if (user?.documentChecklist) {
            setChecklist(user.documentChecklist);
        }
    }, [user?.documents, user?.admissionCategory, user?.documentChecklist]);

    const isPremium = user?.subscription?.type === 'standard' || user?.subscription?.type === 'advance' || user?.isPremium === true;
    const t = TRANSLATIONS[language];

    const toggleCheck = async (doc) => {
        const newChecklist = { ...checklist, [doc]: !checklist[doc] };
        setChecklist(newChecklist);
        try {
            await updateProfile({ documentChecklist: newChecklist });
        } catch (e) {
            console.error("Failed to save checklist to profile", e);
        }
    };

    const handleUpload = async (docName) => {
        if (!isPremium) {
            if (Platform.OS === 'web') {
                // Better alert for web
                alert(language === 'English' 
                    ? "Premium Feature: Document upload and verification is available for premium users only." 
                    : "प्रीमियम सुविधा: कागदपत्र अपलोड आणि पडताळणी केवळ प्रीमियम वापरकर्त्यांसाठी उपलब्ध आहे.");
            } else {
                Alert.alert(language === 'English' ? "Premium Feature" : "प्रीमियम सुविधा", t.upgradeMsg, [
                    { text: "Cancel", style: "cancel" },
                    { text: language === 'English' ? "Upgrade Now" : "आताच अपग्रेड करा", onPress: () => navigation.navigate('Pricing') }
                ]);
            }
            return;
        }

        try {
            console.log(`[DocumentVerification] Starting picker for: ${docName}`);
            
            // On Web, type: '*/*' is more reliable than an array for some browser environments
            const pickerOptions = {
                type: Platform.OS === 'web' ? '*/*' : ['*/*'],
                copyToCacheDirectory: true,
                multiple: false
            };

            const result = await DocumentPicker.getDocumentAsync(pickerOptions);

            // Handle both legacy and assets-based results for cross-platform compatibility
            const isCanceled = result.canceled === true || result.type === 'cancel';
            const assets = result.assets || (result.uri ? [result] : []);

            if (isCanceled || assets.length === 0) {
                console.log('[DocumentVerification] Picker canceled');
                return;
            }

            const asset = assets[0];
            setIsUploading(docName);
            
            // 1. Prepare FormData for real upload
            const formData = new FormData();
            if (Platform.OS === 'web') {
                // Fetch the blob from URI
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                formData.append('image', blob, asset.name || 'document.pdf');
            } else {
                formData.append('image', {
                    uri: asset.uri,
                    type: asset.mimeType || 'application/octet-stream',
                    name: asset.name || 'document.pdf'
                });
            }

            // 2. Upload to Server
            const uploadRes = await uploadAPI.upload(formData);
            const fileUrl = uploadRes.data.url;

            // 3. Update User Profile on Backend
            const newUploads = { 
                ...uploads, 
                [docName]: { 
                    status: 'pending', 
                    fileName: asset.name || 'document',
                    uri: fileUrl,
                    createdAt: new Date().toISOString(),
                    category: category // Tag the document with the category used during upload
                } 
            };

            const updateRes = await updateProfile({ 
                documents: newUploads,
                admissionCategory: category // Ensure category is also saved
            });
            
            if (updateRes.success) {
                setUploads(newUploads);
                setIsUploading(null);
                const msg = language === 'English' ? "Success" : "यशस्वी";
                if (Platform.OS === 'web') alert(t.successMsg);
                else Alert.alert(msg, t.successMsg);
            } else {
                throw new Error("Failed to update profile");
            }

        } catch (err) {
            console.error('[DocumentVerification] Upload Error:', err);
            setIsUploading(null);
            const errMsg = "Upload failed. Please try again or check your connection.";
            if (Platform.OS === 'web') alert(errMsg);
            else Alert.alert("Error", errMsg);
        }
    };

    const showInfo = (doc) => {
        const displayName = language === 'English' ? DOCUMENT_DISPLAY_NAMES[doc]?.en : DOCUMENT_DISPLAY_NAMES[doc]?.mr;
        setInfoModal({
            visible: true,
            title: displayName || doc,
            content: DOCUMENT_INFO[doc] || t.noInfo
        });
    };

    const renderStatus = (docName) => {
        const upload = uploads[docName];
        if (!upload) return null;

        if (upload.status === 'pending') {
            return (
                <View style={styles.statusBadge}>
                    <Clock size={12} color="#F59E0B" />
                    <Text style={[styles.statusText, { color: '#F59E0B' }]}>{t.pending}</Text>
                </View>
            );
        }
        if (upload.status === 'verified' || upload.status === 'accepted') {
            return (
                <View style={styles.statusBadge}>
                    <CheckCircle size={12} color="#10B981" />
                    <Text style={[styles.statusText, { color: '#10B981' }]}>{t.verified}</Text>
                </View>
            );
        }
        if (upload.status === 'rejected') {
            return (
                <View>
                    <View style={styles.statusBadge}>
                        <XCircle size={12} color="#EF4444" />
                        <Text style={[styles.statusText, { color: '#EF4444' }]}>{t.rejected}</Text>
                    </View>
                    {upload.remark ? (
                        <Text style={styles.remarkText}>{t.remark}{upload.remark}</Text>
                    ) : null}
                </View>
            );
        }
    };

    const renderItem = ({ item }) => {
        const displayName = language === 'English' ? DOCUMENT_DISPLAY_NAMES[item]?.en : DOCUMENT_DISPLAY_NAMES[item]?.mr;
        
        return (
            <View style={styles.docCard}>
                <TouchableOpacity 
                    style={styles.checkArea} 
                    onPress={() => toggleCheck(item)}
                    activeOpacity={0.7}
                >
                    {checklist[item] ? (
                        <CheckCircle size={24} color={Colors.primary} fill={Colors.primary + '20'} />
                    ) : (
                        <Circle size={24} color={Colors.text.tertiary} />
                    )}
                    <View style={styles.docInfo}>
                        <Text style={[styles.docName, checklist[item] && styles.docNameChecked]}>{displayName || item}</Text>
                        {renderStatus(item)}
                    </View>
                </TouchableOpacity>

                <View style={styles.actionArea}>
                    <TouchableOpacity onPress={() => showInfo(item)} style={styles.iconBtn}>
                        <Info size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => handleUpload(item)} 
                        style={[
                            styles.uploadBtn, 
                            isPremium && styles.uploadBtnPremium,
                            isUploading === item && styles.uploadingBtn
                        ]}
                        disabled={isUploading === item}
                    >
                        {isUploading === item ? (
                            <ActivityIndicator size="small" color={isPremium ? "#fff" : Colors.primary} />
                        ) : (
                            <>
                                <FileUp size={16} color={isPremium ? "#fff" : Colors.text.tertiary} />
                                {isPremium && <Text style={styles.uploadBtnText}>{t.uploadBtn}</Text>}
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <MainLayout scrollable={false}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{t.title}</Text>
                    <Text style={styles.subtitle}>{t.subtitle(category)}</Text>
                </View>
                <TouchableOpacity 
                    style={styles.langBtn}
                    onPress={() => setLanguage(language === 'English' ? 'Marathi' : 'English')}
                >
                    <Languages size={18} color={Colors.primary} />
                    <Text style={styles.langText}>{language === 'English' ? 'Marathi' : 'English'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.categoryBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                    {Object.keys(DOCUMENT_DATA).map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.catTab, category === cat && styles.catTabActive]}
                            onPress={async () => {
                                setCategory(cat);
                                await updateProfile({ admissionCategory: cat });
                            }}
                        >
                            <Text style={[styles.catTabText, category === cat && styles.catTabTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={DOCUMENT_DATA[category]}
                renderItem={renderItem}
                keyExtractor={item => item}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.premiumBanner}>
                        <LinearGradient
                            colors={isPremium ? ['#10B981', '#059669'] : ['#4F46E5', '#7C3AED']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.bannerGradient}
                        >
                            <View style={styles.bannerContent}>
                                {isPremium ? <ShieldCheck color="#fff" size={32} /> : <AlertCircle color="#fff" size={32} />}
                                <View style={styles.bannerText}>
                                    <Text style={styles.bannerTitle}>{isPremium ? t.verified : t.premiumTitle}</Text>
                                    <Text style={styles.bannerSub}>{t.premiumSub}</Text>
                                </View>
                                {!isPremium && <ChevronRight color="#fff" size={20} />}
                            </View>
                        </LinearGradient>
                    </View>
                }
                ListFooterComponent={
                    <View style={styles.footerNote}>
                        <AlertCircle size={14} color={Colors.text.tertiary} />
                        <Text style={styles.footerText}>{t.autoDelete}</Text>
                    </View>
                }
            />

            <Modal
                visible={infoModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setInfoModal({ ...infoModal, visible: false })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{infoModal.title}</Text>
                            <TouchableOpacity onPress={() => setInfoModal({ ...infoModal, visible: false })}>
                                <XCircle size={24} color={Colors.text.tertiary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalBody}>{infoModal.content}</Text>
                        <TouchableOpacity 
                            style={styles.modalBtn}
                            onPress={() => setInfoModal({ ...infoModal, visible: false })}
                        >
                            <Text style={styles.modalBtnText}>{t.gotIt}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '500', color: Colors.text.primary },
    subtitle: { fontSize: 13, color: Colors.text.tertiary, marginTop: 4 },
    langBtn: { 
        flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '10', 
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginLeft: 10
    },
    langText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

    categoryBar: { marginBottom: 15, marginHorizontal: -20 },
    catScroll: { paddingHorizontal: 20 },
    catTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8, backgroundColor: '#F1F5F9' },
    catTabActive: { backgroundColor: Colors.primary },
    catTabText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '500' },
    catTabTextActive: { color: '#fff' },

    listContainer: { paddingBottom: 40 },
    docCard: { 
        backgroundColor: '#fff', padding: 16, borderRadius: 16, 
        marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        flexDirection: 'row', alignItems: 'center', ...Shadows.soft
    },
    checkArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    docInfo: { flex: 1 },
    docName: { fontSize: 14, color: Colors.text.primary, fontWeight: '400' },
    docNameChecked: { textDecorationLine: 'line-through', color: Colors.text.tertiary, opacity: 0.7 },
    
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    statusText: { fontSize: 10, fontWeight: '700', marginLeft: 4 },
    remarkText: { fontSize: 10, color: '#EF4444', fontStyle: 'italic', marginTop: 2, marginLeft: 20 },

    actionArea: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    iconBtn: { padding: 10, borderRadius: 12, backgroundColor: '#F8FAFC' },
    uploadBtn: { 
        padding: 10, borderRadius: 12, backgroundColor: '#F8FAFC', 
        flexDirection: 'row', alignItems: 'center', gap: 6 
    },
    uploadBtnPremium: { backgroundColor: Colors.primary },
    uploadBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    uploadingBtn: { opacity: 0.5 },

    premiumBanner: { marginBottom: 20 },
    bannerGradient: { borderRadius: 16, padding: 16 },
    bannerContent: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    bannerText: { flex: 1 },
    bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
    bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

    footerNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, justifyContent: 'center' },
    footerText: { fontSize: 11, color: Colors.text.tertiary, textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: '500', color: Colors.text.primary, flex: 1, marginRight: 10 },
    modalBody: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22, marginBottom: 25 },
    modalBtn: { backgroundColor: Colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
    modalBtnText: { color: '#fff', fontWeight: '500', fontSize: 15 }
});

export default DocumentVerificationScreen;
