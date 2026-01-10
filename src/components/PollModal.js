import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PollModal = ({ visible, onClose, onCreate }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [maxVotes, setMaxVotes] = useState(1);

    const panY = React.useRef(new Animated.Value(0)).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gs) => {
                if (gs.dy > 0) {
                    panY.setValue(gs.dy);
                }
            },
            onPanResponderRelease: (e, gs) => {
                if (gs.dy > 150 || gs.vy > 0.5) {
                    onClose();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    React.useEffect(() => {
        if (visible) {
            panY.setValue(0);
        }
    }, [visible]);

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index) => {
        if (options.length > 2) {
            const newOptions = [...options];
            newOptions.splice(index, 1);
            setOptions(newOptions);
        }
    };

    const handleOptionChange = (text, index) => {
        const newOptions = [...options];
        newOptions[index] = text;
        setOptions(newOptions);
    };

    const handleCreate = () => {
        if (!question.trim()) return alert('Please enter a question');
        const validOptions = options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) return alert('Please provide at least 2 options');

        onCreate({
            question,
            options: validOptions.map(text => ({ text, votes: [] })),
            maxVotes
        });
        reset();
    };

    const reset = () => {
        setQuestion('');
        setOptions(['', '']);
        setMaxVotes(1);
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={[
                        styles.modalContent,
                        { transform: [{ translateY: panY }] }
                    ]}
                >
                    <View {...panResponder.panHandlers}>
                        <View style={styles.handle} />
                    </View>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={styles.header}>
                            <Text style={styles.title}>Create Poll</Text>
                        </View>

                        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Question</Text>
                            <TextInput
                                style={styles.questionInput}
                                placeholder="Ask a question..."
                                value={question}
                                onChangeText={setQuestion}
                                multiline
                            />

                            <Text style={styles.label}>Options</Text>
                            {options.map((opt, index) => (
                                <View key={index} style={styles.optionRow}>
                                    <TextInput
                                        style={styles.optionInput}
                                        placeholder={`Option ${index + 1}`}
                                        value={opt}
                                        onChangeText={(text) => handleOptionChange(text, index)}
                                    />
                                    {options.length > 2 && (
                                        <TouchableOpacity onPress={() => handleRemoveOption(index)}>
                                            <Ionicons name="remove-circle-outline" size={24} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            {options.length < 10 && (
                                <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddOption}>
                                    <Ionicons name="add-circle-outline" size={20} color="#0A66C2" />
                                    <Text style={styles.addOptionText}>Add Option</Text>
                                </TouchableOpacity>
                            )}

                            <Text style={styles.label}>Max Votes Per Person</Text>
                            <View style={styles.votesRow}>
                                {[1, 2, 3, 5].map(num => (
                                    <TouchableOpacity
                                        key={num}
                                        style={[styles.voteChip, maxVotes === num && styles.voteChipActive]}
                                        onPress={() => setMaxVotes(num)}
                                    >
                                        <Text style={[styles.voteChipText, maxVotes === num && styles.voteChipTextActive]}>
                                            {num === 5 ? 'Any' : num}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {maxVotes === 5 && (
                                <Text style={styles.helperText}>Users can vote for multiple options.</Text>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                            <Text style={styles.createBtnText}>Create Poll</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.bottomCloseBtn}
                            onPress={onClose}
                        >
                            <Text style={styles.bottomCloseText}>Close</Text>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
    },
    body: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 8,
        marginTop: 16,
    },
    questionInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    optionInput: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#1F2937',
    },
    addOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    addOptionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0A66C2',
    },
    votesRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    voteChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    voteChipActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    voteChipText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4B5563',
    },
    voteChipTextActive: {
        color: '#FFF',
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
        fontStyle: 'italic',
    },
    createBtn: {
        backgroundColor: '#0A66C2',
        paddingVertical: 16,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: '#0A66C2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    createBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 15,
    },
    bottomCloseBtn: {
        marginTop: 15,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 15,
        alignItems: 'center',
    },
    bottomCloseText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    }
});

export default PollModal;
