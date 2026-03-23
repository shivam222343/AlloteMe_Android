import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { institutionAPI, cutoffAPI } from '../services/api';
import { Colors, Typography, Shadows } from '../constants/theme';
import { ChevronRight, Search, Bot, Code, CheckCircle2, Building2, MapPin, LayoutGrid } from 'lucide-react-native';

const UploadCutoffScreen = ({ navigation }) => {
    const [step, setStep] = useState(1);
    const [institutions, setInstitutions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInst, setSelectedInst] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [inputMode, setInputMode] = useState('AI'); // 'AI' or 'JSON'
    const [rawText, setRawText] = useState('');
    const [jsonText, setJsonText] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkParsedData, setBulkParsedData] = useState(null);

    const [metaData, setMetaData] = useState({
        examType: 'MHTCET',
        year: '2025',
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

    const filteredInstitutions = institutions.filter(inst =>
    (inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.location?.city?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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

        setLoading(true);
        try {
            let parsedData = JSON.parse(jsonText);

            // 1. Auto-Add Missing Branches if in Bulk Mode
            if (isBulkMode) {
                const incomingBranchNames = [...new Set(parsedData.map(item => item.branchName).filter(Boolean))];
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
            }

            if (isBulkMode) {
                // Filter out empty branches or invalid entries
                const bulkItems = parsedData
                    .filter(item => item.branchName && item.cutoffData && Array.isArray(item.cutoffData))
                    .map(item => ({
                        branchName: item.branchName,
                        examType: metaData.examType,
                        year: parseInt(metaData.year),
                        round: parseInt(metaData.round),
                        cutoffData: item.cutoffData.filter(c => c.category && c.percentile != null)
                    }))
                    .filter(item => item.cutoffData.length > 0);

                // 2. Remove older cutoffs for each branch being uploaded (Replace mode)
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
                // Filter out invalid single entries
                const cleanData = parsedData.filter(c => c.category && c.percentile != null);

                // 2. Remove older cutoffs for this branch (Replace mode)
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
            Alert.alert('Success', 'Cutoff data uploaded successfully (Previous data replaced)!');
            navigation.goBack();
        } catch (error) {
            console.error('Upload Error:', error.response?.data || error.message);
            Alert.alert('Error', 'Upload failed: ' + (error.response?.data?.message || 'Check JSON format or connection.'));
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.stepContainer}>
            {[1, 2, 3, 4].map(s => (
                <View key={s} style={styles.stepRow}>
                    <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
                        {step > s ? <CheckCircle2 size={16} color={Colors.white} /> : <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>}
                    </View>
                    {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
                </View>
            ))}
        </View>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1: // Select Institution
                return (
                    <View style={{ flex: 1 }}>
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
                                        <Text style={styles.instName}>{inst.name}</Text>
                                        <Text style={styles.instLoc}>{inst.location?.city || 'Location N/A'}</Text>
                                    </View>
                                    <ChevronRight size={20} color={Colors.divider} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
                                loading={loading}
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
                {renderStepIndicator()}
                <View style={{ flex: 1, paddingVertical: 10 }}>
                    {renderStepContent()}
                </View>
            </View>
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
});

export default UploadCutoffScreen;
