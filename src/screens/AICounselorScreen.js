import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { aiAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Send, User, Bot, Mic, MicOff, X, Sparkles, Key } from 'lucide-react-native';
import Voice from '@react-native-voice/voice';
import Markdown from 'react-native-markdown-display';
import GradientBorder from '../components/ui/GradientBorder';
import { Image, Modal, ScrollView as horizontalScroll } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const AICounselorScreen = ({ navigation }) => {
    const { user } = useAuth();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [chatId, setChatId] = useState(null);
    const [frequentQuestions, setFrequentQuestions] = useState([]);
    const [isDirty, setIsDirty] = useState(false);
    const flatListRef = useRef();
    const scrollX = useSharedValue(0);

    React.useEffect(() => {
        loadFrequentQuestions();
        startNewChat();

        // Handle leaving screen - Confirm Save
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!isDirty || messages.length <= 1) return;

            // Prevent default action
            e.preventDefault();

            Alert.alert(
                'Save Conversation?',
                'Would you like to save this chat history before leaving?',
                [
                    { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
                    { text: 'Save', onPress: async () => {
                        await handleSaveChat();
                        navigation.dispatch(e.data.action);
                    }},
                    { text: 'Continue Chatting', style: 'cancel', onPress: () => {} }
                ]
            );
        });

        return unsubscribe;
    }, [navigation, isDirty, messages]);

    const loadFrequentQuestions = async () => {
        try {
            const res = await aiAPI.getFrequentQuestions();
            setFrequentQuestions(res.data);
        } catch (e) {
            setFrequentQuestions([
                { question: "What is the cutoff for COEP?" },
                { question: "Top engineering colleges in Pune" },
                { question: "Best branches for 95 percentile" },
                { question: "Admission process for VJTI" }
            ]);
        }
    };

    const startNewChat = () => {
        setMessages([
            { id: '1', text: `Hi ${user?.displayName || 'there'}! I'm your Alloteme0077 Counselor. Only remembering your profile info now. How can I help?`, sender: 'bot' }
        ]);
        setChatId(null);
        setIsDirty(false);
    };

    const handleSaveChat = async () => {
        try {
            const history = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
            await aiAPI.saveChat({ chatId, messages: history });
            setIsDirty(false);
        } catch (e) {
            Alert.alert('Error', 'Failed to save chat');
        }
    };

    const startListening = async () => {
        if (!Voice || Platform.OS === 'web') {
            Alert.alert('Not Supported', 'Voice features are only available in the native app.');
            return;
        }
        try {
            await Voice.start('en-US');
        } catch (e) {
            console.error(e);
        }
    };

    const stopListening = async () => {
        if (!Voice || Platform.OS === 'web') return;
        try {
            await Voice.stop();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSend = async (overrideInput = null) => {
        const textToSend = overrideInput || input;
        if (!textToSend.trim() || loading) return;

        const userMsg = { id: Date.now().toString(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setIsDirty(true);

        try {
            const history = messages.slice(1).map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            }));

            const res = await aiAPI.counsel({
                message: textToSend,
                chatId,
                history,
                userProfile: {
                    examType: user?.examType,
                    percentile: user?.percentile,
                    rank: user?.rank,
                    location: user?.location
                }
            });

            const botMsg = { id: (Date.now() + 1).toString(), text: res.data.reply, sender: 'bot' };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errorMsg = { id: (Date.now() + 1).toString(), text: "Sorry, I'm having trouble connecting to the Alloteme0077 brain right now.", sender: 'bot' };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const MessageItem = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.messageContainer, isUser ? styles.userContainer : styles.botContainer]}>
                {!isUser && (
                    <View style={{ marginRight: 8 }}>
                        <GradientBorder size={36} borderWidth={2}>
                            <Image
                                source={{ uri: 'https://api.dicebear.com/9.x/bottts/png?seed=Counselor&backgroundColor=c7ecee&radius=50' }}
                                style={styles.avatarImg}
                            />
                        </GradientBorder>
                    </View>
                )}
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                    {isUser ? (
                        <Text style={[styles.messageText, styles.userText]}>{item.text}</Text>
                    ) : (
                        <Markdown style={markdownStyles}>
                            {item.text}
                        </Markdown>
                    )}
                </View>
                {isUser && (
                    <View style={{ marginLeft: 8 }}>
                        <GradientBorder size={36} borderWidth={2}>
                            <Image
                                source={{ uri: user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=Random&size=128` }}
                                style={styles.avatarImg}
                            />
                        </GradientBorder>
                    </View>
                )}
            </View>
        );
    };

    return (
        <MainLayout scrollable={false} showHeader={false} noPadding={true} botSafe={true}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerIcon}>
                        <GradientBorder size={44} borderWidth={2}>
                            <View style={styles.botIconCircle}>
                                <Bot size={22} color={Colors.primary} />
                            </View>
                        </GradientBorder>
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>Alloteme Assistant</Text>
                        <View style={styles.statusContainer}>
                            <View style={styles.statusDot} />
                            <Text style={styles.status}>Knowledge Base Connected</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.newChatBtn} onPress={startNewChat}>
                        <Sparkles size={18} color={Colors.primary} />
                        <Text style={styles.newChatText}>New Chat</Text>
                    </TouchableOpacity>
                </View>

                {/* Question Tags Marquee */}
                <View style={styles.tagsWrapper}>
                    <FlatList
                        horizontal
                        data={[...frequentQuestions, ...frequentQuestions]} // Simple duplication for infinite-like feel
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.tag} 
                                onPress={() => handleSend(item.question)}
                            >
                                <Text style={styles.tagText}>{item.question}</Text>
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item, index) => index.toString()}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 10 }}
                    />
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
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
                >
                    <View style={styles.inputArea}>
                        <TouchableOpacity
                            style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
                            onPress={isListening ? stopListening : startListening}
                        >
                            {isListening ? (
                                <MicOff size={20} color={Colors.white} />
                            ) : (
                                <Mic size={20} color={Colors.primary} />
                            )}
                        </TouchableOpacity>

                        <TextInput
                            style={styles.textInput}
                            placeholder={isListening ? "Listening..." : "Type your question..."}
                            value={input}
                            onChangeText={setInput}
                            multiline
                        />

                        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading || !input.trim()}>
                            <Send size={20} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                {/* API Key Recruitment Popup */}
                <Modal
                    visible={showKeyPopup}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowKeyPopup(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.popupContent}>
                            <View style={styles.popupHeader}>
                                <View style={styles.sparkleIcon}>
                                    <Sparkles size={24} color={Colors.primary} />
                                </View>
                                <TouchableOpacity onPress={() => setShowKeyPopup(false)} style={styles.closeBtn}>
                                    <X size={20} color={Colors.text.tertiary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.popupTitle}>Boost Your AI Experience!</Text>
                            <Text style={styles.popupSub}>
                                You've sent {userMessageCount} messages! To ensure uninterrupted, lighting-fast counseling, consider adding your own Groq API key.
                            </Text>

                            <View style={styles.benefitRow}>
                                <Key size={16} color={Colors.success} />
                                <Text style={styles.benefitText}>100% Free & Unlimited Usage</Text>
                            </View>
                            <View style={styles.benefitRow}>
                                <Sparkles size={16} color={Colors.success} />
                                <Text style={styles.benefitText}>Priority Processing Speed</Text>
                            </View>

                            <TouchableOpacity 
                                style={styles.primaryAction} 
                                onPress={() => {
                                    setShowKeyPopup(false);
                                    navigation.navigate('Profile');
                                }}
                            >
                                <Text style={styles.primaryActionText}>Add My Personal Key</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.secondaryAction} 
                                onPress={() => setShowKeyPopup(false)}
                            >
                                <Text style={styles.secondaryActionText}>Skip for now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    header: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.white,
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerIcon: {
        marginRight: 12
    },
    botIconCircle: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerInfo: { flex: 1 },
    title: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginRight: 6 },
    status: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '500' },
    chatContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    messageContainer: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
    userContainer: { justifyContent: 'flex-end' },
    botContainer: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '85%', padding: 12, borderRadius: 20 },
    userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4, ...Shadows.sm },
    botBubble: { backgroundColor: Colors.background, borderBottomLeftRadius: 4 },
    messageText: { fontSize: 14, lineHeight: 22 },
    userText: { color: Colors.white },
    botText: { color: Colors.text.primary },
    avatarImg: { width: '100%', height: '100%' },
    newChatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6
    },
    newChatText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.primary
    },
    tagsWrapper: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: '#F8FAFC'
    },
    tag: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 6,
        ...Shadows.sm
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text.secondary
    },
    inputArea: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        alignItems: 'center'
    },
    voiceBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    voiceBtnActive: { backgroundColor: Colors.error },
    textInput: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 120,
        fontSize: 14,
        color: Colors.text.primary,
        borderWidth: 1,
        borderColor: Colors.divider
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        ...Shadows.sm
    },
    
    // Popup Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    popupContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 30,
        alignItems: 'center',
    },
    popupHeader: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        marginBottom: 20,
    },
    sparkleIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    popupTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text.primary,
        textAlign: 'center',
        marginBottom: 12,
    },
    popupSub: {
        fontSize: 14,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
        alignSelf: 'flex-start',
        backgroundColor: Colors.background,
        padding: 12,
        borderRadius: 12,
        width: '100%',
    },
    benefitText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text.secondary,
    },
    primaryAction: {
        backgroundColor: Colors.primary,
        width: '100%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
        ...Shadows.md,
    },
    primaryActionText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryAction: {
        marginTop: 16,
        padding: 8,
    },
    secondaryActionText: {
        color: Colors.text.tertiary,
        fontSize: 14,
        fontWeight: '600',
    }
});

const markdownStyles = {
    body: {
        color: Colors.text.primary,
        fontSize: 14,
        lineHeight: 22,
    },
    strong: {
        fontWeight: 'bold',
        color: Colors.primary,
    },
    bullet_list: {
        marginVertical: 4,
    },
    list_item: {
        marginVertical: 2,
    },
    link: {
        color: Colors.primary,
        textDecorationLine: 'underline',
    },
    heading1: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
        marginVertical: 8,
    },
    heading2: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        marginVertical: 6,
    }
};

export default AICounselorScreen;
