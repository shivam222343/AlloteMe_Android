import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { aiAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Send, User, Bot } from 'lucide-react-native';

const AICounselorScreen = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        { id: '1', text: `Hi ${user?.displayName || 'there'}! I'm your AI counselor. Ask me anything about ${user?.examType || 'MHTCET/JEE'} admissions!`, sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef();

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const context = {
                examType: user?.examType,
                percentile: user?.percentile,
                rank: user?.rank,
                location: user?.location
            };
            const res = await aiAPI.counsel(input, context);
            const botMsg = { id: (Date.now() + 1).toString(), text: res.data.answer, sender: 'bot' };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errorMsg = { id: (Date.now() + 1).toString(), text: "Sorry, I'm having trouble connecting right now.", sender: 'bot' };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const MessageItem = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.messageContainer, isUser ? styles.userContainer : styles.botContainer]}>
                {!isUser && <View style={styles.avatarBot}><Bot size={16} color={Colors.white} /></View>}
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                    <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>{item.text}</Text>
                </View>
                {isUser && <View style={styles.avatarUser}><User size={16} color={Colors.white} /></View>}
            </View>
        );
    };

    return (
        <MainLayout scrollable={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>AI Counselor</Text>
                    <Text style={styles.status}>Online • Ready to help</Text>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <MessageItem item={item} />}
                    contentContainerStyle={styles.chatContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                >
                    <View style={styles.inputArea}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type your question..."
                            value={input}
                            onChangeText={setInput}
                            multiline
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
                            <Send size={20} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    title: { fontSize: 20, fontWeight: 'bold' },
    status: { fontSize: 12, color: Colors.success, fontWeight: '600' },
    chatContent: { padding: Spacing.lg, paddingBottom: 20 },
    messageContainer: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
    userContainer: { justifyContent: 'flex-end' },
    botContainer: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
    userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 2 },
    botBubble: { backgroundColor: Colors.white, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: Colors.divider },
    messageText: { fontSize: 14, lineHeight: 20 },
    userText: { color: Colors.white },
    botText: { color: Colors.text.primary },
    avatarBot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarUser: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    inputArea: { flexDirection: 'row', padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.divider, alignItems: 'center' },
    textInput: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 14 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 12 }
});

export default AICounselorScreen;
