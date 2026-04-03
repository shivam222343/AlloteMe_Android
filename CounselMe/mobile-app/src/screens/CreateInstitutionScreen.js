import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { institutionAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const CreateInstitutionScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [rawText, setRawText] = useState('');
    const [showAiModal, setShowAiModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        university: '',
        category: 'Engineering',
        type: 'Government',
        feesPerYear: '',
        description: '',
        location: { region: '', city: '', address: '' },
    });

    const handleAiParse = async () => {
        if (!rawText) return;
        setAiLoading(true);
        try {
            const response = await institutionAPI.parse(rawText);
            setFormData({
                ...formData,
                ...response.data,
                feesPerYear: response.data.feesPerYear?.toString() || '',
            });
            setShowAiModal(false);
            setRawText('');
            Alert.alert('Success', 'Data extracted successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to parse text');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.type) {
            Alert.alert('Error', 'Please fill name and type');
            return;
        }
        setLoading(true);
        try {
            await institutionAPI.create(formData);
            Alert.alert('Success', 'Institution created!');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save institution');
        } finally {
            setLoading(true);
        }
    };

    return (
        <MainLayout style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>New Institution</Text>
                <Button
                    title="Magic AI Autofill"
                    variant="outline"
                    onPress={() => setShowAiModal(true)}
                    style={styles.aiBtn}
                />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Card style={styles.card}>
                    <Input
                        label="Institution Name"
                        value={formData.name}
                        onChangeText={(val) => setFormData({ ...formData, name: val })}
                        placeholder="e.g. COEP Technological University"
                    />
                    <Input
                        label="University"
                        value={formData.university}
                        onChangeText={(val) => setFormData({ ...formData, university: val })}
                        placeholder="e.g. SPPU"
                    />
                    <Input
                        label="Fees per Year"
                        value={formData.feesPerYear}
                        onChangeText={(val) => setFormData({ ...formData, feesPerYear: val })}
                        placeholder="e.g. 85000"
                        keyboardType="numeric"
                    />
                    <Input
                        label="Description"
                        value={formData.description}
                        onChangeText={(val) => setFormData({ ...formData, description: val })}
                        placeholder="Brief about the institute"
                        multiline
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {['Engineering', 'Pharmacy', 'BBA', 'NEET', 'JEE', 'MHTCET'].map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catChip, formData.category === cat && styles.catChipActive]}
                                onPress={() => setFormData({ ...formData, category: cat })}
                            >
                                <Text style={[styles.catChipText, formData.category === cat && styles.catChipTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Card>

                <Text style={styles.sectionTitle}>Location</Text>
                <Card style={styles.card}>
                    <Input
                        label="Region"
                        value={formData.location.region}
                        onChangeText={(val) => setFormData({ ...formData, location: { ...formData.location, region: val } })}
                        placeholder="e.g. Pune"
                    />
                    <Input
                        label="City"
                        value={formData.location.city}
                        onChangeText={(val) => setFormData({ ...formData, location: { ...formData.location, city: val } })}
                        placeholder="e.g. Shivajinagar"
                    />
                </Card>

                <Button
                    title="Create Institution"
                    onPress={handleSave}
                    loading={loading}
                    style={styles.saveBtn}
                />
            </ScrollView>

            {/* AI Modal */}
            <Modal visible={showAiModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>AI Data Extraction</Text>
                        <Text style={styles.modalSub}>Paste raw text about the college below</Text>
                        <Input
                            placeholder="Paste text here..."
                            value={rawText}
                            onChangeText={setRawText}
                            multiline
                            containerStyle={{ height: 200 }}
                        />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" variant="ghost" onPress={() => setShowAiModal(false)} style={{ flex: 1 }} />
                            <Button title="Parse Text" onPress={handleAiParse} loading={aiLoading} style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { padding: Spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold },
    aiBtn: { paddingVertical: 8 },
    sectionTitle: { fontSize: 16, fontWeight: Typography.fontWeight.bold, marginTop: 24, marginBottom: 12 },
    card: { marginBottom: 16 },
    saveBtn: { marginTop: 24 },
    label: { fontSize: 14, color: Colors.text.secondary, marginBottom: 8, fontWeight: '500' },
    catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    catChipText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },
    catChipTextActive: { color: Colors.white },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: Colors.white, borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: Typography.fontWeight.bold, marginBottom: 8 },
    modalSub: { fontSize: 14, color: Colors.text.secondary, marginBottom: 16 },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
});

export default CreateInstitutionScreen;
