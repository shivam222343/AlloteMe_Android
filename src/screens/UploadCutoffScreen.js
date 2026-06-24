import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';
import { institutionAPI, cutoffAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Shadows } from '../constants/theme';
import { ChevronRight, Search, Bot, Code, CheckCircle2, Building2, MapPin, LayoutGrid } from 'lucide-react-native';
import AdminPrivacyLock from '../components/AdminPrivacyLock';

const UploadCutoffScreen = ({ navigation }) => {
    const { admissionPath } = useAuth();
    const [step, setStep] = useState(1);
    const [institutions, setInstitutions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInst, setSelectedInst] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
    };
    const hideToast = () => setToast(prev => ({ ...prev, visible: false }));
    const [inputMode, setInputMode] = useState('AI'); // 'AI' or 'JSON'
    const [rawText, setRawText] = useState('');
    const [jsonText, setJsonText] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkParsedData, setBulkParsedData] = useState(null);
    const [cutoffSummary, setCutoffSummary] = useState({});

    // Auto Upload States
    const [autoUploadMode, setAutoUploadMode] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingState, setUploadingState] = useState('idle'); // 'idle', 'parsing', 'review', 'uploading', 'completed'
    const [collegesToProcess, setCollegesToProcess] = useState([]);
    const [selectedCollegesMap, setSelectedCollegesMap] = useState({});
    const [activeUploadIndex, setActiveUploadIndex] = useState(0);
    const [statusLogs, setStatusLogs] = useState([]);
    const [lastClickedIndex, setLastClickedIndex] = useState(null);

    const consoleScrollRef = React.useRef(null);

    const [metaData, setMetaData] = useState({
        examType: (admissionPath || 'MHTCET').toUpperCase(),
        year: '2025',
        round: '1'
    });

    const filteredInstitutions = institutions.filter(inst => {
        const matchesQuery = inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inst.location?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inst.dteCode?.toString().includes(searchQuery.toLowerCase());

        if (!matchesQuery) return false;

        // Since backend already filters by admissionPath, we just need to ensure 
        // the client-side filter is inclusive enough for searched results.
        if (!admissionPath) return true;

        const isPCM = admissionPath === 'MHTCET PCM' || admissionPath === 'MHTCET' || admissionPath === 'Engineering';
        const isPCB = admissionPath === 'MHTCET PCB' || admissionPath === 'Pharmacy';

        const instCat = inst.category || 'MHTCET'; // Default legacy to MHTCET

        if (isPCM) {
            return instCat === 'MHTCET PCM' || instCat === 'MHTCET' || instCat === 'Engineering';
        }
        if (isPCB) {
            return instCat === 'MHTCET PCB' || instCat === 'Pharmacy';
        }

        return instCat === admissionPath;
    });

    const currentIndex = filteredInstitutions.findIndex(inst => inst._id === selectedInst?._id);
    const hasNext = currentIndex < filteredInstitutions.length - 1;
    const hasPrev = currentIndex > 0;

    const goToNextInst = () => {
        if (hasNext) {
            const nextInst = filteredInstitutions[currentIndex + 1];
            setSelectedInst(nextInst);
            setStep(2);
            setSelectedBranch(null);
            setRawText('');
            setJsonText('');
        } else {
            Alert.alert('Finished', 'You have reached the end of the college list.');
            navigation.goBack();
        }
    };

    const goToPrevInst = () => {
        if (hasPrev) {
            const prevInst = filteredInstitutions[currentIndex - 1];
            setSelectedInst(prevInst);
            setStep(2);
            setSelectedBranch(null);
            setRawText('');
            setJsonText('');
        }
    };

    useEffect(() => {
        fetchInstitutions();
    }, [admissionPath]);

    const fetchInstitutions = async () => {
        setLoading(true);
        try {
            const [resInst, resSummary] = await Promise.all([
                institutionAPI.getAll(admissionPath),
                cutoffAPI.getSummary()
            ]);
            setInstitutions(resInst.data);
            if (resSummary.data) {
                setCutoffSummary(resSummary.data);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleClearAllData = () => {
        const performClear = async () => {
            setLoading(true);
            try {
                const res = await cutoffAPI.clearAllData();
                if (res.data && res.data.success) {
                    const msg = `Successfully wiped database!\n\nDeleted Cutoffs: ${res.data.deletedCutoffsCount}\nColleges Reset: ${res.data.updatedCollegesCount}`;
                    if (Platform.OS === 'web') {
                        window.alert(msg);
                        fetchInstitutions();
                    } else {
                        Alert.alert('Dataset Cleared', msg, [{ text: 'OK', onPress: () => fetchInstitutions() }]);
                    }
                } else {
                    const errMsg = res.data?.message || 'Failed to clear data';
                    if (Platform.OS === 'web') window.alert('Error: ' + errMsg);
                    else Alert.alert('Error', errMsg);
                }
            } catch (err) {
                console.error('Clear All Error:', err);
                const errMsg = err.response?.data?.message || err.message || 'Network error';
                if (Platform.OS === 'web') window.alert('Error: ' + errMsg);
                else Alert.alert('Error', errMsg);
            } finally {
                setLoading(false);
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(
                '⚠️ WARNING: Critical Action\n\nThis will permanently delete ALL cutoff entries and clear ALL branches from ALL colleges in the database.\n\nThis action CANNOT be undone. Are you absolutely sure?'
            );
            if (confirmed) performClear();
        } else {
            Alert.alert(
                '⚠️ WARNING: Critical Action',
                'This will permanently delete ALL cutoff entries and clear ALL branches from ALL colleges in the database.\n\nThis action CANNOT be undone. Are you absolutely sure?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Yes, Delete Everything', style: 'destructive', onPress: performClear }
                ]
            );
        }
    };

    const handleAiParse = async () => {
        if (!rawText.trim()) return Alert.alert('Empty', 'Paste some text first');
        setAiLoading(true);
        try {
            const res = isBulkMode
                ? await cutoffAPI.parseBulk(rawText)
                : await cutoffAPI.parse(rawText);

            if (isBulkMode) {
                // Backend returns { branches: [...] }
                const branches = res.data.branches || [];
                setJsonText(JSON.stringify(branches, null, 2));
                Alert.alert('✨ Success', `AI extracted the data for ${branches.length} branches. Please review.`);
            } else {
                // Backend returns { cutoffData: [...] }
                setJsonText(JSON.stringify(res.data.cutoffData, null, 2));
                Alert.alert('✨ Success', 'AI extracted the data for this branch. Please review.');
            }
            setInputMode('JSON');
        } catch (error) {
            console.error('Parse error:', error);
            const serverMsg = error.response?.data?.message || '';
            const isGroqError = serverMsg.toLowerCase().includes('groq') || serverMsg.toLowerCase().includes('api_key') || serverMsg.toLowerCase().includes('model');

            Alert.alert(
                isGroqError ? '🔧 AI Configuration Error' : '❌ AI Parse Error',
                isGroqError
                    ? `There was an issue with the AI configuration:\n\n"${serverMsg}"\n\nPlease ensure your Groq API Key is valid in your Profile Settings.`
                    : 'AI failed to parse text. Please check the text format or try again later.',
                [
                    { text: 'OK' },
                    {
                        text: 'Update Profile',
                        onPress: () => navigation.navigate('Profile')
                    }
                ]
            );
        } finally {
            setAiLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedInst || (!isBulkMode && !selectedBranch) || !jsonText) {
            Alert.alert('Error', 'Missing required fields. Select ' + (!isBulkMode ? 'branch' : 'institution') + ' first.');
            return;
        }

        setUploading(true);
        try {
            let parsedData = JSON.parse(jsonText);

            // ─── Normalize cutoff entry fields (cat/val → category/percentile) ───
            const normalizeEntry = (entry) => ({
                category: entry.category ?? entry.cat ?? entry.Category ?? null,
                percentile: entry.percentile ?? entry.val ?? entry.Percentile ?? null,
                ...entry,
            });

            // ─── Normalize bulk data: accept object {"Branch": [data]} OR array [{branchName, cutoffData}] ───
            const normalizeBulkData = (data) => {
                if (Array.isArray(data)) {
                    // Already array format — [{branchName, cutoffData: [...]}]
                    return data.map(item => ({
                        branchName: item.branchName || item.branch || item.Branch || '',
                        cutoffData: Array.isArray(item.cutoffData)
                            ? item.cutoffData.map(normalizeEntry)
                            : [],
                    }));
                } else if (data && typeof data === 'object') {
                    // Object format: {"Computer": [{cat, val}], "IT": [{...}]}
                    return Object.entries(data).map(([branchName, entries]) => ({
                        branchName,
                        cutoffData: Array.isArray(entries) ? entries.map(normalizeEntry) : [],
                    }));
                }
                return [];
            };

            if (isBulkMode) {
                const normalizedBranches = normalizeBulkData(parsedData);

                // 1. Auto-Add Missing Branches
                const incomingBranchNames = normalizedBranches.map(b => b.branchName).filter(Boolean);
                const existingBranchNames = (selectedInst.branches || []).map(b => b.name);
                const missingBranches = incomingBranchNames.filter(name => !existingBranchNames.includes(name));

                if (missingBranches.length > 0) {
                    const newBranchObjects = missingBranches.map(name => ({
                        name,
                        code: name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 5)
                    }));
                    const updatedBranches = [...(selectedInst.branches || []), ...newBranchObjects];
                    await institutionAPI.update(selectedInst._id, { branches: updatedBranches });
                }

                // 2. Build valid bulk items
                const bulkItems = normalizedBranches
                    .filter(item => item.branchName && item.cutoffData.length > 0)
                    .map(item => ({
                        branchName: item.branchName,
                        examType: metaData.examType,
                        year: parseInt(metaData.year),
                        round: parseInt(metaData.round),
                        cutoffData: item.cutoffData.filter(c => c.category && c.percentile != null)
                    }))
                    .filter(item => item.cutoffData.length > 0);

                if (bulkItems.length === 0) throw new Error('No valid branch data found after parsing.');

                // 3. Delete existing + re-upload (Replace mode)
                for (const item of bulkItems) {
                    await cutoffAPI.delete(selectedInst._id, item.branchName, {
                        examType: item.examType,
                        year: item.year,
                        round: item.round
                    });
                }

                await cutoffAPI.bulkAdd({
                    institutionId: selectedInst._id,
                    items: bulkItems
                });
            } else {
                // Single branch mode — ensure it's an array
                const rawArray = Array.isArray(parsedData) ? parsedData : [parsedData];
                const cleanData = rawArray
                    .map(normalizeEntry)
                    .filter(c => c.category && c.percentile != null);

                if (cleanData.length === 0) throw new Error('No valid cutoff entries found. Check that entries have category and percentile/val fields.');

                await cutoffAPI.delete(selectedInst._id, selectedBranch.name, {
                    examType: metaData.examType,
                    year: parseInt(metaData.year),
                    round: parseInt(metaData.round)
                });

                await cutoffAPI.add({
                    institutionId: selectedInst._id,
                    branchName: selectedBranch.name,
                    examType: metaData.examType,
                    year: parseInt(metaData.year),
                    round: parseInt(metaData.round),
                    cutoffData: cleanData
                });
            }

            showToast(isBulkMode ? 'Bulk cutoffs uploaded successfully!' : `Cutoffs uploaded for ${selectedBranch?.name}!`, 'success');
            // Move to next college after a short delay so toast is visible
            setTimeout(() => goToNextInst(), 1800);
        } catch (error) {
            console.error('Upload Error:', error.response?.data || error.message);
            showToast('Upload failed: ' + (error.response?.data?.message || error.message || 'Check JSON format or connection.'), 'error');
        } finally {
            setUploading(false);
        }

    };

    const handlePickDocument = async () => {
        try {
            const pickerOptions = {
                type: 'application/pdf',
                copyToCacheDirectory: true,
                multiple: false
            };

            const result = await DocumentPicker.getDocumentAsync(pickerOptions);
            const isCanceled = result.canceled === true || result.type === 'cancel';
            const assets = result.assets || (result.uri ? [result] : []);

            if (isCanceled || assets.length === 0) {
                console.log('[AutoUpload] Document picker canceled');
                return;
            }

            const asset = assets[0];
            setSelectedFile(asset);
        } catch (err) {
            console.error('[AutoUpload] Document picker error:', err);
            Alert.alert('Error', 'Failed to pick PDF file');
        }
    };

    const handleAutoUploadStart = async () => {
        if (!selectedFile) {
            return Alert.alert('Error', 'Please select a PDF file first.');
        }

        setUploadingState('parsing');
        setStatusLogs(['[System] Preparing PDF file...']);
        
        try {
            const formData = new FormData();
            if (Platform.OS === 'web') {
                const response = await fetch(selectedFile.uri);
                const blob = await response.blob();
                formData.append('file', blob, selectedFile.name || 'cutoffs.pdf');
            } else {
                formData.append('file', {
                    uri: selectedFile.uri,
                    type: selectedFile.mimeType || 'application/pdf',
                    name: selectedFile.name || 'cutoffs.pdf'
                });
            }

            setStatusLogs(prev => [...prev, '[System] Uploading PDF and starting ML parsing engine... (This can take 15-30s)']);
            
            const parseRes = await cutoffAPI.parsePdf(formData);
            
            if (!parseRes.data.success || !Array.isArray(parseRes.data.data) || parseRes.data.data.length === 0) {
                setUploadingState('idle');
                setStatusLogs(prev => [...prev, '❌ [Error] Failed to extract any college data from PDF.']);
                Alert.alert('Error', 'ML parser returned no data.');
                return;
            }

            const colleges = parseRes.data.data;
            setCollegesToProcess(colleges);

            // Default all extracted colleges to selected
            const initialMap = {};
            colleges.forEach(c => {
                initialMap[c["DTE code"]] = true;
            });
            setSelectedCollegesMap(initialMap);
            setLastClickedIndex(null);

            setUploadingState('review');
            setStatusLogs(prev => [
                ...prev, 
                `✨ [ML Success] Extracted data for ${colleges.length} colleges successfully!`,
                `📋 Please select the colleges you wish to import/update.`
            ]);

        } catch (err) {
            console.error('[AutoUpload] Error during upload workflow:', err);
            setUploadingState('idle');
            const errMsg = err.response?.data?.message || err.message || 'An error occurred during extraction';
            setStatusLogs(prev => [...prev, `❌ [Fatal Error] ${errMsg}`]);
            Alert.alert('Upload Failed', errMsg);
        }
    };

    const handleStartImportSelected = async () => {
        const selectedColleges = collegesToProcess.filter(c => selectedCollegesMap[c["DTE code"]]);
        if (selectedColleges.length === 0) {
            return Alert.alert('Error', 'Please select at least one college to import.');
        }

        setUploadingState('uploading');
        setActiveUploadIndex(0);
        setStatusLogs(prev => [
            ...prev,
            `🚀 [System] Starting database import for ${selectedColleges.length} selected colleges...`
        ]);

        let successCount = 0;
        let warningCount = 0;

        for (let i = 0; i < selectedColleges.length; i++) {
            const college = selectedColleges[i];
            setActiveUploadIndex(i);
            
            setStatusLogs(prev => [...prev, `⏳ [${i+1}/${selectedColleges.length}] Importing: ${college.college} (DTE: ${college["DTE code"]})`]);

            try {
                const payload = {
                    collegeName: college.college,
                    dteCode: college["DTE code"],
                    examType: metaData.examType,
                    year: parseInt(metaData.year),
                    round: parseInt(metaData.round),
                    branches: college.branches
                };

                const importRes = await cutoffAPI.importCollege(payload);
                
                if (importRes.data.success) {
                    successCount++;
                    setStatusLogs(prev => [
                        ...prev, 
                        `✅ [Success] ${importRes.data.institutionName}: Inserted ${importRes.data.cutoffsInserted} cutoffs (${importRes.data.branchesAdded} new branches)`
                    ]);
                } else {
                    warningCount++;
                    setStatusLogs(prev => [...prev, `⚠️ [Skip] ${college.college}: ${importRes.data.message || 'Unknown issue'}`]);
                }
            } catch (err) {
                warningCount++;
                const errMsg = err.response?.data?.message || err.message || 'Network error';
                setStatusLogs(prev => [...prev, `❌ [Failed] ${college.college}: ${errMsg}`]);
            }
        }

        setUploadingState('completed');
        setStatusLogs(prev => [
            ...prev, 
            `🏁 [Completed] Process finished. Successfully imported ${successCount} colleges, skipped/failed ${warningCount} colleges.`
        ]);
    };

    const renderAutoUploadContent = () => {
        const selectedColleges = collegesToProcess.filter(c => selectedCollegesMap[c["DTE code"]]);
        const total = selectedColleges.length;
        const progress = total > 0 ? (activeUploadIndex + 1) / total : 0;

        return (
            <View style={{ flex: 1 }}>
                <View style={styles.autoUploadHeader}>
                    <TouchableOpacity onPress={() => setAutoUploadMode(false)} style={styles.backLink}>
                        <Text style={styles.backLinkText}>← Back to Manual Mode</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepTitle}>Auto Cutoff Upload (ML Engine)</Text>
                </View>

                {uploadingState === 'idle' && (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Card style={[styles.card, { padding: 20 }]}>
                            <Text style={styles.label}>1. Select Target Metadata</Text>
                            <Input
                                label="Exam"
                                value={metaData.examType}
                                editable={false}
                            />
                            <View style={styles.row}>
                                <Input
                                    label="Year"
                                    value={metaData.year}
                                    onChangeText={(v) => setMetaData({ ...metaData, year: v })}
                                    placeholder="2025"
                                    keyboardType="numeric"
                                    containerStyle={{ flex: 1, marginRight: 12 }}
                                />
                                <Input
                                    label="Round"
                                    value={metaData.round}
                                    onChangeText={(v) => setMetaData({ ...metaData, round: v })}
                                    placeholder="1"
                                    keyboardType="numeric"
                                    containerStyle={{ flex: 1 }}
                                />
                            </View>
                        </Card>

                        <TouchableOpacity style={styles.uploadArea} onPress={handlePickDocument}>
                            <Bot size={32} color={Colors.primary} style={{ marginBottom: 12 }} />
                            <Text style={styles.uploadTitle}>
                                {selectedFile ? selectedFile.name : 'Click to select PDF Cutoff File'}
                            </Text>
                            <Text style={styles.uploadSub}>
                                {selectedFile ? `Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'MHT-CET official cutoff PDF document'}
                            </Text>
                        </TouchableOpacity>

                        <Button 
                            title="🚀 Start Auto Upload" 
                            onPress={handleAutoUploadStart}
                            disabled={!selectedFile}
                            style={{ marginTop: 20 }}
                        />
                    </ScrollView>
                )}

                {uploadingState === 'review' && (
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>2. Review & Select Colleges to Upload</Text>
                        
                        <View style={styles.reviewActions}>
                            <TouchableOpacity 
                                style={styles.reviewActionBtn}
                                onPress={() => {
                                    const newMap = {};
                                    collegesToProcess.forEach(c => {
                                        newMap[c["DTE code"]] = true;
                                    });
                                    setSelectedCollegesMap(newMap);
                                }}
                            >
                                <Text style={styles.reviewActionBtnText}>Select All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.reviewActionBtn}
                                onPress={() => {
                                    setSelectedCollegesMap({});
                                }}
                            >
                                <Text style={styles.reviewActionBtnText}>Deselect All</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.reviewList} showsVerticalScrollIndicator={false}>
                            {(() => {
                                const sortedColleges = [...collegesToProcess]
                                    .sort((a, b) => (a.college || '').localeCompare(b.college || ''));
                                
                                return sortedColleges.map((c, idx) => {
                                    const isChecked = !!selectedCollegesMap[c["DTE code"]];
                                    return (
                                        <TouchableOpacity 
                                            key={idx}
                                            style={[styles.reviewItem, isChecked && styles.reviewItemChecked]}
                                            onPress={(event) => {
                                                const isShift = event.shiftKey || event.nativeEvent?.shiftKey;
                                                if (isShift && lastClickedIndex !== null) {
                                                    const start = Math.min(lastClickedIndex, idx);
                                                    const end = Math.max(lastClickedIndex, idx);
                                                    const targetVal = !isChecked;
                                                    
                                                    setSelectedCollegesMap(prev => {
                                                        const newMap = { ...prev };
                                                        for (let i = start; i <= end; i++) {
                                                            newMap[sortedColleges[i]["DTE code"]] = targetVal;
                                                        }
                                                        return newMap;
                                                    });
                                                } else {
                                                    setSelectedCollegesMap(prev => ({
                                                        ...prev,
                                                        [c["DTE code"]]: !prev[c["DTE code"]]
                                                    }));
                                                }
                                                setLastClickedIndex(idx);
                                            }}
                                        >
                                            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                {isChecked && <CheckCircle2 size={12} color={Colors.white} />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.reviewItemTitle} numberOfLines={1}>{c.college}</Text>
                                                <Text style={[styles.reviewItemSub, (c.branches?.length || 0) === 0 && { color: '#EF4444', fontWeight: '600' }]}>DTE Code: {c["DTE code"]} | {c.branches?.length || 0} branches found</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                });
                            })()}
                        </ScrollView>

                        <View style={{ gap: 12, marginTop: 20 }}>
                            <Button 
                                title={`🚀 Import Selected (${total} Colleges)`}
                                onPress={handleStartImportSelected}
                                disabled={total === 0}
                            />
                            <Button 
                                title="Cancel" 
                                type="secondary"
                                onPress={() => {
                                    setUploadingState('idle');
                                    setSelectedFile(null);
                                }}
                            />
                        </View>
                    </View>
                )}

                {(uploadingState === 'parsing' || uploadingState === 'uploading' || uploadingState === 'completed') && (
                    <View style={{ flex: 1 }}>
                        <Card style={styles.progressCard}>
                            <View style={styles.progressHeader}>
                                {uploadingState === 'parsing' ? (
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                ) : uploadingState === 'uploading' ? (
                                    <ActivityIndicator size="small" color="#F59E0B" />
                                ) : (
                                    <CheckCircle2 size={20} color="#10B981" />
                                )}
                                <Text style={styles.progressStatusText}>
                                    {uploadingState === 'parsing' ? 'Extracting text via ML...' :
                                     uploadingState === 'uploading' ? `Uploading college ${activeUploadIndex+1} of ${total}...` :
                                     'Auto Import Complete!'}
                                </Text>
                            </View>

                            {total > 0 && (
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                                </View>
                            )}
                        </Card>

                        <Text style={[styles.label, { marginTop: 16 }]}>Console Log Output:</Text>
                        <ScrollView 
                            style={styles.consoleLogBox}
                            contentContainerStyle={{ padding: 12 }}
                            ref={consoleScrollRef}
                            onContentSizeChange={() => consoleScrollRef.current?.scrollToEnd({ animated: true })}
                        >
                            {statusLogs.map((log, idx) => (
                                <Text 
                                    key={idx} 
                                    style={[
                                        styles.consoleLogText,
                                        log.startsWith('✅') && { color: '#10B981' },
                                        log.startsWith('⚠️') && { color: '#F59E0B' },
                                        log.startsWith('❌') && { color: '#EF4444' },
                                        log.startsWith('✨') && { color: '#3B82F6', fontWeight: 'bold' }
                                    ]}
                                >
                                    {log}
                                </Text>
                            ))}
                        </ScrollView>

                        {uploadingState === 'completed' && (
                            <Button 
                                title="Done & Return" 
                                onPress={() => {
                                    setAutoUploadMode(false);
                                    setStep(1);
                                    fetchInstitutions();
                                }} 
                                style={{ marginTop: 20 }}
                            />
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderStatusDots = (collegeId) => {
        const yearsData = cutoffSummary[collegeId];
        if (!yearsData || yearsData.length === 0) return null;
        
        // Sort years descending
        const sortedYears = [...yearsData].sort((a, b) => b.year - a.year);
        
        const maxDots = 3;
        const dotsToShow = sortedYears.slice(0, maxDots);
        const extraCount = sortedYears.length > maxDots ? sortedYears.length - maxDots : 0;
        
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {dotsToShow.map((data, index) => {
                    const numRounds = data.rounds.map(r => Number(r));
                    const hasR1 = numRounds.includes(1);
                    const hasR2 = numRounds.includes(2);
                    const hasR3 = numRounds.includes(3);

                    const coreColor = '#10b981'; // Green dot

                    let dotComponent;
                    if (hasR1 && hasR2) {
                        dotComponent = (
                            <View style={{
                                width: 14, height: 14, borderRadius: 7,
                                borderWidth: 2, borderColor: '#3b82f6', // Blue for R2
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                                <View style={{
                                    width: 10, height: 10, borderRadius: 5,
                                    borderWidth: 2, borderColor: '#f59e0b', // Yellow for R1
                                    justifyContent: 'center', alignItems: 'center'
                                }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: coreColor }} />
                                </View>
                            </View>
                        );
                    } else if (hasR1 || hasR2 || hasR3) {
                        dotComponent = (
                            <View style={{
                                width: 12, height: 12, borderRadius: 6,
                                borderWidth: 2, borderColor: hasR1 ? '#f59e0b' : (hasR2 ? '#3b82f6' : '#8b5cf6'),
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: coreColor }} />
                            </View>
                        );
                    } else {
                        dotComponent = <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: coreColor }} />;
                    }

                    return (
                        <View key={index} style={{ alignItems: 'center' }}>
                            {dotComponent}
                            <Text style={{ fontSize: 8, color: Colors.text.tertiary, marginTop: 2 }}>{data.year}</Text>
                        </View>
                    );
                })}
                {extraCount > 0 && (
                    <View style={{ alignItems: 'center', justifyContent: 'flex-start', height: '100%' }}>
                        <View style={{ 
                            width: 16, height: 16, borderRadius: 8, 
                            backgroundColor: Colors.primary + '20', 
                            justifyContent: 'center', alignItems: 'center' 
                        }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: Colors.primary }}>
                                +{extraCount}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 8, color: 'transparent', marginTop: 2 }}>-</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderStepContent = () => {
        if (autoUploadMode) {
            return renderAutoUploadContent();
        }
        switch (step) {
            case 1: // Select Institution
                return (
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                            <TouchableOpacity 
                                style={[styles.autoUploadHeaderBtn, { flex: 1, marginBottom: 0 }]}
                                onPress={() => {
                                    setAutoUploadMode(true);
                                    setUploadingState('idle');
                                    setSelectedFile(null);
                                    setStatusLogs([]);
                                    setCollegesToProcess([]);
                                }}
                            >
                                <Bot size={18} color={Colors.white} />
                                <Text style={styles.autoUploadHeaderBtnText}>✨ PDF Auto-Import</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.autoUploadHeaderBtn, { backgroundColor: '#EF4444', flex: 1, marginBottom: 0 }]}
                                onPress={handleClearAllData}
                            >
                                <Building2 size={18} color={Colors.white} />
                                <Text style={styles.autoUploadHeaderBtnText}>⚠️ Clear Dataset</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchBar}>
                            <Search size={20} color={Colors.text.tertiary} />
                            <TextInput
                                placeholder="Search by name or city..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={styles.searchInput}
                                placeholderTextColor={Colors.text.tertiary}
                            />
                        </View>
                        {loading && institutions.length === 0 ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                                <Text style={styles.loadingText}>Fetching Colleges...</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                                {filteredInstitutions.map(inst => (
                                    <TouchableOpacity
                                        key={inst._id}
                                        style={[styles.instItem, selectedInst?._id === inst._id && styles.selectedItem]}
                                        onPress={() => {
                                            setSelectedInst(inst);
                                            setStep(2);
                                            // Reset branch selection when switching inst
                                            setSelectedBranch(null);
                                            setIsBulkMode(false);
                                        }}
                                    >
                                        <View style={styles.instIconBg}>
                                            <Building2 size={20} color={Colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                <Text style={styles.instName}>{inst.name}</Text>
                                                {inst.dteCode && (
                                                    <View style={styles.dteBadge}>
                                                        <Text style={styles.dteBadgeText}>{inst.dteCode}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.instLoc}>{inst.location?.city || 'Location N/A'}</Text>
                                            {renderStatusDots(inst._id)}
                                        </View>
                                        <ChevronRight size={20} color={Colors.divider} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                );

            case 2: // Single vs Bulk Branch selection
                return (
                    <View style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>Select Upload Mode for {selectedInst.name}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.modeItem, !isBulkMode && selectedBranch && styles.selectedItem]}
                                onPress={() => setIsBulkMode(false)}
                            >
                                <View style={styles.modeIcon}>
                                    <Code size={20} color={!isBulkMode ? Colors.primary : Colors.text.tertiary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modeTitle}>Single Branch</Text>
                                    <Text style={styles.modeSub}>Upload data for one specific department</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modeItem, isBulkMode && styles.selectedItem]}
                                onPress={() => {
                                    setIsBulkMode(true);
                                    setSelectedBranch(null);
                                    setStep(3); // Go straight to meta
                                }}
                            >
                                <View style={styles.modeIcon}>
                                    <LayoutGrid size={20} color={isBulkMode ? Colors.primary : Colors.text.tertiary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modeTitle}>Bulk Upload (All Branches)</Text>
                                    <Text style={styles.modeSub}>Magic AI will detect all branches from the text automatically</Text>
                                </View>
                            </TouchableOpacity>

                            {!isBulkMode && (
                                <View style={{ marginTop: 20 }}>
                                    <Text style={styles.label}>Or Pick a Branch Below:</Text>
                                    {(!selectedInst.branches || selectedInst.branches.length === 0) ? (
                                        <View style={styles.emptyContainer}>
                                            <Text style={styles.emptyText}>No branches defined.</Text>
                                            <Button
                                                title="Edit Institution"
                                                type="secondary"
                                                onPress={() => navigation.navigate('EditInstitution', { id: selectedInst._id })}
                                            />
                                        </View>
                                    ) : (
                                        selectedInst.branches.map((br, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[styles.branchItem, selectedBranch?.name === br.name && styles.selectedItem]}
                                                onPress={() => {
                                                    setSelectedBranch(br);
                                                    setIsBulkMode(false);
                                                    setStep(3);
                                                }}
                                            >
                                                <Text style={styles.instName}>{br.name}</Text>
                                                {selectedBranch?.name === br.name && <CheckCircle2 size={16} color={Colors.primary} />}
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </ScrollView>
                        <Button title="Back" type="secondary" onPress={() => setStep(1)} style={{ marginTop: 20 }} />
                    </View>
                );

            case 3: // Meta Data
                return (
                    <View style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>Step 3: Cutoff Meta Data ({isBulkMode ? 'Bulk' : selectedBranch?.name})</Text>
                        <Card style={styles.card}>
                            <Input
                                label="Exam"
                                value={metaData.examType}
                                editable={false}
                            />
                            <View style={styles.row}>
                                <Input
                                    label="Year"
                                    value={metaData.year}
                                    onChangeText={(v) => setMetaData({ ...metaData, year: v })}
                                    placeholder="2024"
                                    keyboardType="numeric"
                                    containerStyle={{ flex: 1, marginRight: 12 }}
                                />
                                <Input
                                    label="Round"
                                    value={metaData.round}
                                    onChangeText={(v) => setMetaData({ ...metaData, round: v })}
                                    placeholder="1"
                                    keyboardType="numeric"
                                    containerStyle={{ flex: 1 }}
                                />
                            </View>
                        </Card>
                        <View style={{ gap: 12, marginTop: 20 }}>
                            <Button title="Next" onPress={() => setStep(4)} />
                            <Button title="Back" type="secondary" onPress={() => setStep(2)} />
                        </View>
                    </View>
                );

            case 4: // Data Input
                return (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={styles.navHeader}>
                            <TouchableOpacity 
                                onPress={goToPrevInst} 
                                disabled={!hasPrev}
                                style={[styles.navBtn, !hasPrev && { opacity: 0.3 }]}
                            >
                                <Text style={styles.navBtnText}>← Previous College</Text>
                            </TouchableOpacity>
                            <View style={styles.navInfo}>
                                <Text style={styles.navInstName} numberOfLines={1}>{selectedInst?.name}</Text>
                                <Text style={styles.navCount}>{selectedInst?.dteCode ? `DTE: ${selectedInst.dteCode} | ` : ''}#{currentIndex + 1} of {filteredInstitutions.length}</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={goToNextInst} 
                                disabled={!hasNext}
                                style={[styles.navBtn, !hasNext && { opacity: 0.3 }]}
                            >
                                <Text style={styles.navBtnText}>Next College →</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tabHeader}>
                            <TouchableOpacity
                                style={[styles.tab, inputMode === 'AI' && styles.activeTab]}
                                onPress={() => setInputMode('AI')}
                            >
                                <Bot size={18} color={inputMode === 'AI' ? Colors.primary : Colors.text.tertiary} />
                                <Text style={[styles.tabText, inputMode === 'AI' && styles.activeTabText]}>Magic AI</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, inputMode === 'JSON' && styles.activeTab]}
                                onPress={() => setInputMode('JSON')}
                            >
                                <Code size={18} color={inputMode === 'JSON' ? Colors.primary : Colors.text.tertiary} />
                                <Text style={[styles.tabText, inputMode === 'JSON' && styles.activeTabText]}>JSON</Text>
                            </TouchableOpacity>
                        </View>

                        {inputMode === 'AI' ? (
                            <View>
                                <Text style={styles.label}>Paste {isBulkMode ? 'all cutoff text here' : 'cutoff text for ' + selectedBranch?.name}</Text>
                                <TextInput
                                    multiline
                                    placeholder={isBulkMode ? "Computer Engineering: 98.5...\nIT: 97.2..." : "Open: 98.4, SC: 92.1..."}
                                    value={rawText}
                                    onChangeText={setRawText}
                                    style={styles.textArea}
                                    placeholderTextColor={Colors.text.tertiary}
                                />
                                <Button
                                    title="✨ Magic Parse"
                                    onPress={handleAiParse}
                                    loading={aiLoading}
                                    style={{ marginTop: 12 }}
                                />
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.label}>
                                    {isBulkMode ? 'JSON Object { "Branch": [data] }' : 'JSON Data Array'}
                                </Text>
                                <TextInput
                                    multiline
                                    placeholder={isBulkMode ? '{"Computer": [{"cat":"OPEN","val":98}]}' : '[{"category":"OPEN","percentile":98.5}]'}
                                    value={jsonText}
                                    onChangeText={setJsonText}
                                    style={[styles.textArea, { fontFamily: 'monospace' }]}
                                    placeholderTextColor={Colors.text.tertiary}
                                />
                            </View>
                        )}

                        <View style={{ gap: 12, marginTop: 32 }}>
                            <Button
                                title={isBulkMode ? "Confirm & Upload Bulk" : "Confirm & Upload"}
                                onPress={handleUpload}
                                loading={uploading}
                            />
                            <Button title="Back" type="secondary" onPress={() => setStep(3)} />
                        </View>
                    </ScrollView>
                );
        }
    };

    return (
        <MainLayout style={styles.container} title="Upload Cutoffs">
            <View style={{ flex: 1 }}>
                <View style={{ flex: 1, paddingVertical: 10 }}>
                    {renderStepContent()}
                </View>
            </View>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    stepContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, paddingVertical: 10 },
    stepRow: { flexDirection: 'row', alignItems: 'center' },
    stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.divider, justifyContent: 'center', alignItems: 'center' },
    stepCircleActive: { backgroundColor: Colors.primary },
    stepNum: { fontSize: 14, fontWeight: 'bold', color: Colors.text.secondary },
    stepNumActive: { color: Colors.white },
    stepLine: { width: 40, height: 2, backgroundColor: Colors.divider, marginHorizontal: 4 },
    stepLineActive: { backgroundColor: Colors.primary },

    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, height: 50, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },

    instItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.white, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
    selectedItem: { borderColor: Colors.primary, backgroundColor: Colors.primary + '05' },
    instIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    instName: { fontSize: 15, fontWeight: 'bold', color: Colors.text.primary, flex: 1 },
    instLoc: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },

    stepTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: Colors.text.primary },
    card: { padding: 16, marginBottom: 16 },
    row: { flexDirection: 'row' },

    tabHeader: { flexDirection: 'row', backgroundColor: Colors.divider + '40', borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 8 },
    activeTab: { backgroundColor: Colors.white, ...Shadows.xs },
    tabText: { fontSize: 14, color: Colors.text.tertiary, fontWeight: '600' },
    activeTabText: { color: Colors.primary },

    label: { fontSize: 14, color: Colors.text.secondary, marginBottom: 8, fontWeight: '500' },
    textArea: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 16, height: 200, textAlignVertical: 'top', fontSize: 14 },

    emptyContainer: { padding: 40, alignItems: 'center', gap: 16 },
    emptyText: { textAlign: 'center', color: Colors.text.tertiary, fontSize: 14 },

    modeItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, gap: 16 },
    modeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
    modeTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },
    modeSub: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
    branchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.divider, backgroundColor: Colors.white },

    navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
    navBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: Colors.primary + '10' },
    navBtnText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },
    navInfo: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
    navInstName: { fontSize: 13, fontWeight: 'bold', color: Colors.text.primary, textAlign: 'center' },
    navCount: { fontSize: 10, color: Colors.text.tertiary, marginTop: 2 },

    dteBadge: { backgroundColor: Colors.primary + '10', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: Colors.primary + '30' },
    dteBadgeText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { marginTop: 12, fontSize: 14, color: Colors.text.tertiary, fontWeight: '500' },
    autoUploadHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 16,
        gap: 10,
        ...Shadows.sm
    },
    autoUploadHeaderBtnText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: 15
    },
    autoUploadHeader: {
        marginBottom: 20
    },
    backLink: {
        marginBottom: 8
    },
    backLinkText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600'
    },
    uploadArea: {
        borderWidth: 2,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        backgroundColor: Colors.white,
        marginTop: 16
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text.primary,
        textAlign: 'center'
    },
    uploadSub: {
        fontSize: 12,
        color: Colors.text.tertiary,
        marginTop: 4,
        textAlign: 'center'
    },
    progressCard: {
        padding: 16,
        gap: 12
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    progressStatusText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.text.primary
    },
    progressBarBg: {
        height: 8,
        backgroundColor: Colors.divider,
        borderRadius: 4,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 4
    },
    consoleLogBox: {
        flex: 1,
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 250,
        maxHeight: 400
    },
    consoleLogText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        color: '#D4D4D4',
        fontSize: 12,
        marginBottom: 6,
        lineHeight: 16
    },
    reviewActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12
    },
    reviewActionBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: Colors.divider + '40',
        borderWidth: 1,
        borderColor: Colors.border
    },
    reviewActionBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.text.secondary
    },
    reviewList: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 12,
        paddingVertical: 6
    },
    reviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        gap: 12
    },
    reviewItemChecked: {
        backgroundColor: Colors.primary + '03'
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white
    },
    checkboxChecked: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary
    },
    reviewItemTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text.primary
    },
    reviewItemSub: {
        fontSize: 11,
        color: Colors.text.tertiary,
        marginTop: 2
    }
});

export default function LockedUploadCutoffScreen(props) {
    return (
        <AdminPrivacyLock>
            <UploadCutoffScreen {...props} />
        </AdminPrivacyLock>
    );
}
