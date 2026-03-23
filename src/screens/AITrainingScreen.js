import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows, Spacing, BorderRadius } from '../constants/theme';
import { aiAPI } from '../services/api';
import { Save, FileText, Sparkles, Plus } from 'lucide-react-native';

const AITrainingScreen = ({ navigation }) => {
    const [text, setText] = useState('');
    const [type, setType] = useState('info');
    const [loading, setLoading] = useState(false);

    const handleTrain = async () => {
        if (!text.trim()) {
            Alert.alert('Error', 'Please enter some knowledge text');
            return;
        }

        setLoading(true);
        try {
            const res = await aiAPI.trainAI({ text, type });
            Alert.alert('Success', res.data.message);
            setText('');
        } catch (error) {
            Alert.alert('Error', 'Failed to update AI knowledge base');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout title="AI Knowledge Training">
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Sparkles size={20} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Knowledge Input</Text>
                    </View>
                    <Text style={styles.cardSub}>
                        Paste text here to "train" the counselor. This data will be used as context for future student questions.
                        Separate different topics with an empty line.
                    </Text>

                    <TextInput
                        style={styles.textArea}
                        value={text}
                        onChangeText={setText}
                        placeholder="Example: COEP Pune has a legacy of 150 years. The campus is located near Shivajinagar. Most popular branch is Computer Engineering..."
                        multiline
                        numberOfLines={12}
                        textAlignVertical="top"
                    />

                    <View style={styles.typeSelector}>
                        {['info', 'qa'].map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                                onPress={() => setType(t)}
                            >
                                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                                    {t.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
                        onPress={handleTrain}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : (
                            <>
                                <Save size={20} color="#FFF" />
                                <Text style={styles.saveBtnText}>Save to Knowledge Base</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                    <FileText size={20} color={Colors.text.tertiary} />
                    <Text style={styles.infoText}>
                        Tip: You can paste contents from college brochures or FAQ documents here for better RAG performance.
                    </Text>
                </View>
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { padding: 20 },
    card: {
        backgroundColor: Colors.white,
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.divider,
        ...Shadows.sm
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    cardSub: { fontSize: 13, color: Colors.text.tertiary, lineHeight: 20, marginBottom: 20 },
    textArea: {
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        color: Colors.text.primary,
        marginBottom: 20,
        minHeight: 250,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    typeBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
        borderColor: Colors.divider, alignItems: 'center', backgroundColor: Colors.white
    },
    typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeText: { fontSize: 12, fontWeight: 'bold', color: Colors.text.secondary },
    typeTextActive: { color: Colors.white },
    saveBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
        ...Shadows.sm
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
    infoBox: {
        marginTop: 20, backgroundColor: Colors.primary + '10', padding: 16,
        borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center'
    },
    infoText: { fontSize: 12, color: Colors.text.secondary, flex: 1 }
});

export default AITrainingScreen;
