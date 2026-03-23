import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { institutionAPI, cutoffAPI } from '../services/api';
import { Colors, Typography, Spacing, Shadows } from '../constants/theme';
import { Sparkles, FileJson, Layers, CheckCircle, List } from 'lucide-react-native';

const UploadCutoffScreen = ({ navigation }) => {
    const [institutions, setInstitutions] = useState([]);
    const [selectedInst, setSelectedInst] = useState(null);
    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    
    // Mode states
    const [uploadMode, setUploadMode] = useState('single'); // 'single' | 'bulk'
    const [inputType, setInputType] = useState('magic'); // 'magic' | 'json'

    const [textData, setTextData] = useState('');
    const [parsedPreview, setParsedPreview] = useState(null);

    const [metaData, setMetaData] = useState({
        branchName: '',
        examType: 'MHTCET',
        year: '2024',
        round: '1'
    });

    useEffect(() => {
        fetchInstitutions();
    }, []);

    const fetchInstitutions = async () => {
        try {
            const res = await institutionAPI.getAll();
            setInstitutions(res.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch institutions');
        }
    };

    const handleMagicParse = async () => {
        if (!textData) return Alert.alert('Error', 'Please enter some text');
        setParsing(true);
        try {
            const res = uploadMode === 'bulk' 
                ? await cutoffAPI.parseBulk(textData)
                : await cutoffAPI.parse(textData);
            
            setParsedPreview(res.data);
            Alert.alert('AI Success', 'Data extracted successfully! review and upload.');
        } catch (error) {
            Alert.alert('AI Error', 'Failed to parse text. Try JSON mode if text is too complex.');
        } finally {
            setParsing(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedInst || !textData) {
            Alert.alert('Error', 'Institution and Data are required');
            return;
        }

        setLoading(true);
        try {
            if (uploadMode === 'single') {
                const finalData = inputType === 'json' ? JSON.parse(textData) : parsedPreview?.cutoffData;
                if (!finalData) throw new Error('No valid data to upload');
                
                await cutoffAPI.add({
                    institutionId: selectedInst._id,
                    ...metaData,
                    year: parseInt(metaData.year),
                    round: parseInt(metaData.round),
                    cutoffData: finalData
                });
            } else {
                // Bulk Mode
                const branches = inputType === 'json' ? JSON.parse(textData).branches : parsedPreview?.branches;
                if (!branches) throw new Error('No valid branch data found');

                const items = branches.map(b => ({
                    branchName: b.branchName,
                    examType: metaData.examType,
                    year: parseInt(metaData.year),
                    round: parseInt(metaData.round),
                    cutoffData: b.cutoffData
                }));

                await cutoffAPI.bulkAdd({
                    institutionId: selectedInst._id,
                    items
                });
            }

            Alert.alert('Success', 'Cutoff data uploaded successfully!');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Upload Failed', error.message || 'Invalid format or server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout style={styles.container} title="Upload Cutoffs">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* 1. Select Institution */}
                <Text style={styles.label}>Select Institution</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.instScroll}>
                    {institutions.map(inst => (
                        <TouchableOpacity
                            key={inst._id}
                            style={[styles.instChip, selectedInst?._id === inst._id && styles.instChipActive]}
                            onPress={() => setSelectedInst(inst)}
                        >
                            <Text style={[styles.instChipText, selectedInst?._id === inst._id && styles.instChipTextActive]}>
                                {inst.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* 2. Mode Toggles */}
                <View style={styles.toggleRow}>
                    <TouchableOpacity 
                        style={[styles.modeBtn, uploadMode === 'single' && styles.modeBtnActive]} 
                        onPress={() => { setUploadMode('single'); setParsedPreview(null); }}
                    >
                        <List size={18} color={uploadMode === 'single' ? Colors.white : Colors.text.secondary} />
                        <Text style={[styles.modeText, uploadMode === 'single' && styles.modeTextActive]}>Single Branch</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.modeBtn, uploadMode === 'bulk' && styles.modeBtnActive]} 
                        onPress={() => { setUploadMode('bulk'); setParsedPreview(null); }}
                    >
                        <Layers size={18} color={uploadMode === 'bulk' ? Colors.white : Colors.text.secondary} />
                        <Text style={[styles.modeText, uploadMode === 'bulk' && styles.modeTextActive]}>Bulk Upload</Text>
                    </TouchableOpacity>
                </View>

                {/* 3. Metadata Card */}
                <Card style={styles.card}>
                    {uploadMode === 'single' && (
                        <Input
                            label="Branch Name"
                            value={metaData.branchName}
                            onChangeText={(val) => setMetaData({ ...metaData, branchName: val })}
                            placeholder="e.g. Computer Science"
                            leftIcon={<List size={18} color={Colors.text.tertiary} />}
                        />
                    )}
                    <View style={styles.row}>
                        <Input
                            label="Year"
                            value={metaData.year}
                            onChangeText={(val) => setMetaData({ ...metaData, year: val })}
                            placeholder="2024"
                            keyboardType="numeric"
                            containerStyle={{ flex: 1, marginRight: 8 }}
                        />
                        <Input
                            label="Round"
                            value={metaData.round}
                            onChangeText={(val) => setMetaData({ ...metaData, round: val })}
                            placeholder="1"
                            keyboardType="numeric"
                            containerStyle={{ flex: 1 }}
                        />
                    </View>
                </Card>

                {/* 4. Input Type Toggle */}
                <View style={styles.inputToggle}>
                    <TouchableOpacity 
                        style={[styles.typeBtn, inputType === 'magic' && styles.typeBtnActive]} 
                        onPress={() => setInputType('magic')}
                    >
                        <Sparkles size={16} color={inputType === 'magic' ? Colors.primary : Colors.text.tertiary} />
                        <Text style={[styles.typeText, inputType === 'magic' && styles.typeTextActive]}>Magic AI</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.typeBtn, inputType === 'json' && styles.typeBtnActive]} 
                        onPress={() => setInputType('json')}
                    >
                        <FileJson size={16} color={inputType === 'json' ? Colors.primary : Colors.text.tertiary} />
                        <Text style={[styles.typeText, inputType === 'json' && styles.typeTextActive]}>Direct JSON</Text>
                    </TouchableOpacity>
                </View>

                {/* 5. Data Input */}
                <Text style={styles.label}>{inputType === 'magic' ? 'Paste Cutoff Text (Magic AI)' : 'Paste JSON Data'}</Text>
                <Input
                    placeholder={inputType === 'magic' ? "Paste or type cutoff details here..." : "Paste raw JSON array here..."}
                    value={textData}
                    onChangeText={(t) => { setTextData(t); setParsedPreview(null); }}
                    multiline
                    containerStyle={styles.textInput}
                />

                {inputType === 'magic' && (
                    <Button
                        title="Analyze with Magic AI"
                        onPress={handleMagicParse}
                        loading={parsing}
                        variant="secondary"
                        style={styles.actionBtn}
                        icon={<Sparkles size={18} color={Colors.primary} />}
                    />
                )}

                {/* 6. Preview & Final Upload */}
                {parsedPreview && (
                    <View style={styles.previewBox}>
                        <View style={styles.previewHeader}>
                            <CheckCircle size={16} color={Colors.success} />
                            <Text style={styles.previewTitle}>Ready to Upload ({uploadMode === 'bulk' ? `${parsedPreview.branches?.length} branches` : '1 branch'})</Text>
                        </View>
                        
                        {uploadMode === 'bulk' && parsedPreview.branches && (
                            <View style={styles.branchPreviewList}>
                                {parsedPreview.branches.slice(0, 5).map((b, i) => (
                                    <View key={i} style={styles.branchPreviewItem}>
                                        <Text style={styles.branchPreviewText}>• {b.branchName}</Text>
                                        <Text style={styles.branchCountText}>{b.cutoffData?.length || 0} categories</Text>
                                    </View>
                                ))}
                                {parsedPreview.branches.length > 5 && (
                                    <Text style={styles.moreText}>+ {parsedPreview.branches.length - 5} more branches...</Text>
                                )}
                            </View>
                        )}
                        
                        <Text style={styles.previewHint}>Verify the data above is correct before proceeding.</Text>
                    </View>
                )}

                <Button
                    title={parsedPreview ? "Confirm & Upload Now" : "Upload Data Directly"}
                    onPress={handleUpload}
                    loading={loading}
                    disabled={!textData || (inputType === 'magic' && !parsedPreview && !parsing)}
                    style={styles.submitBtn}
                />
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary, marginBottom: 8, marginTop: 12 },
    instScroll: { marginBottom: 16 },
    instChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: Colors.divider, marginRight: 10, backgroundColor: Colors.white, ...Shadows.sm },
    instChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
    instChipText: { fontSize: 13, color: Colors.text.secondary },
    instChipTextActive: { color: Colors.primary, fontWeight: '700' },
    toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.white },
    modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    modeText: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary },
    modeTextActive: { color: Colors.white },
    card: { padding: 16, marginBottom: 20 },
    row: { flexDirection: 'row', marginTop: 12 },
    inputToggle: { flexDirection: 'row', backgroundColor: Colors.divider + '40', borderRadius: 12, padding: 4, marginBottom: 12 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
    typeBtnActive: { backgroundColor: Colors.white, ...Shadows.sm },
    typeText: { fontSize: 12, fontWeight: '600', color: Colors.text.tertiary },
    typeTextActive: { color: Colors.primary },
    textInput: { height: 180, textAlignVertical: 'top' },
    actionBtn: { marginVertical: 12 },
    previewBox: { padding: 12, backgroundColor: Colors.success + '08', borderRadius: 12, borderWidth: 1, borderColor: Colors.success + '20', marginBottom: 16 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    previewTitle: { fontSize: 14, fontWeight: '700', color: Colors.success },
    previewHint: { fontSize: 11, color: Colors.text.secondary, marginTop: 4 },
    branchPreviewList: { marginTop: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.success + '20' },
    branchPreviewItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    branchPreviewText: { fontSize: 12, color: Colors.text.primary, fontWeight: '500' },
    branchCountText: { fontSize: 11, color: Colors.text.tertiary },
    moreText: { fontSize: 11, color: Colors.text.tertiary, fontStyle: 'italic', marginTop: 4 },
    submitBtn: { marginTop: 10 }
});

export default UploadCutoffScreen;
