import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows, Spacing, BorderRadius } from '../constants/theme';
import { aiAPI } from '../services/api';
import { Plus, Trash2, MessageSquare, Send } from 'lucide-react-native';

const FrequentQuestionsManager = ({ navigation }) => {
    const [questions, setQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        setLoading(true);
        try {
            const res = await aiAPI.getFrequentQuestions();
            setQuestions(res.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load frequent questions');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newQuestion.trim()) return;

        try {
            await aiAPI.setFrequentQuestion({ question: newQuestion });
            setNewQuestion('');
            loadQuestions();
        } catch (error) {
            Alert.alert('Error', 'Failed to add question');
        }
    };

    const QuestionItem = ({ item }) => (
        <View style={styles.item}>
            <View style={styles.itemContent}>
                <MessageSquare size={16} color={Colors.primary} />
                <Text style={styles.itemText}>{item.question}</Text>
            </View>
            <TouchableOpacity onPress={() => {/* Implement delete */}}>
                <Trash2 size={16} color={Colors.error} />
            </TouchableOpacity>
        </View>
    );

    return (
        <MainLayout title="Frequent Questions">
            <View style={styles.container}>
                <Text style={styles.subtitle}>
                    These questions will appear as sliding auto-tags in the AI Counselor interface.
                </Text>

                <View style={styles.inputCard}>
                    <TextInput
                        style={styles.input}
                        value={newQuestion}
                        onChangeText={setNewQuestion}
                        placeholder="Add a new frequent question..."
                        placeholderTextColor={Colors.text.tertiary}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                        <Send size={20} color={Colors.white} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={questions}
                        renderItem={({ item }) => <QuestionItem item={item} />}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>No frequent questions configured.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
    subtitle: { fontSize: 13, color: Colors.text.tertiary, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
    inputCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 8,
        paddingLeft: 16,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.divider,
        ...Shadows.sm
    },
    input: { flex: 1, fontSize: 14, color: Colors.text.primary, height: 44 },
    addBtn: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center'
    },
    list: { gap: 12 },
    item: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
        padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: Colors.primary
    },
    itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    itemText: { fontSize: 14, color: Colors.text.primary, fontWeight: '500' },
    empty: { marginTop: 40, alignItems: 'center' },
    emptyText: { color: Colors.text.tertiary, fontSize: 14 }
});

export default FrequentQuestionsManager;
