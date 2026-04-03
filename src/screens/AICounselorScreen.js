import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image, Modal, ScrollView, ActivityIndicator, Animated, Easing, Keyboard, TouchableWithoutFeedback, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainLayout from '../components/layouts/MainLayout';
import { aiAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Send, User, Bot, Mic, MicOff, X, Sparkles, Key, Image as ImageIcon } from 'lucide-react-native';
import Voice from '@react-native-voice/voice';
import Markdown from 'react-native-markdown-display';
import GradientBorder from '../components/ui/GradientBorder';
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { History, Trash2, Clock, Calendar } from 'lucide-react-native';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

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
    em: {
        fontStyle: 'italic',
        color: Colors.text.secondary,
    },
    bullet_list: {
        marginVertical: 4,
    },
    list_item: {
        marginVertical: 4,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bullet_list_icon: {
        color: Colors.primary,
        marginRight: 8,
        fontSize: 18,
    },
    link: {
        color: Colors.primary,
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    heading1: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1E293B',
        marginVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        paddingBottom: 4,
    },
    heading2: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#334155',
        marginVertical: 8,
    },
    heading3: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        marginVertical: 6,
    },
    paragraph: {
        marginVertical: 6,
    },
    blockquote: {
        backgroundColor: '#F1F5F9',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        marginVertical: 8,
    },
    code_inline: {
        backgroundColor: '#F1F5F9',
        color: '#E11D48',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        paddingHorizontal: 4,
        borderRadius: 4,
        fontSize: 13,
    },
    code_block: {
        backgroundColor: '#1E293B',
        color: '#F8FAFC',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        padding: 12,
        borderRadius: 8,
        marginVertical: 10,
    },
    table: {
        borderWidth: 1,
        borderColor: Colors.divider,
        borderRadius: 12,
        overflow: 'hidden',
    },
    thead: {
        backgroundColor: '#F1F5F9',
    },
    th: {
        padding: 12,
        fontWeight: 'bold',
        color: Colors.text.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        minWidth: 120,
    },
    td: {
        padding: 12,
        color: Colors.text.secondary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        minWidth: 120,
    }
};

const MessageItem = React.memo(({ item, user, onDelete }) => {
    const isUser = item.sender === 'user';
    const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    const [displayedText, setDisplayedText] = useState(isUser || !item.isNew ? item.text : '');

    React.useEffect(() => {
        if (!isUser && item.isNew) {
            let index = 0;
            const text = item.text;
            const timer = setInterval(() => {
                index += 5; // Type faster for long messages
                if (index >= text.length) {
                    setDisplayedText(text);
                    clearInterval(timer);
                } else {
                    setDisplayedText(text.substring(0, index));
                }
            }, 10);
            return () => clearInterval(timer);
        }
    }, [item.text, isUser, item.isNew]);

    if (!isUser) {
        return (
            <View style={[styles.messageContainer, { width: '100%', flexDirection: 'column', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 25 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <GradientBorder size={28} borderWidth={1.5}>
                        <Image
                            source={{ uri: 'https://api.dicebear.com/9.x/bottts/png?seed=Counselor&backgroundColor=c7ecee&radius=50' }}
                            style={styles.avatarImg}
                        />
                    </GradientBorder>
                    <View style={{ marginLeft: 10, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.timestamp, { fontSize: 11 }]}>{time}</Text>
                        <TouchableOpacity onPress={() => onDelete(item.id)} style={{ marginLeft: 8 }}>
                            <Trash2 size={11} color={Colors.text.tertiary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ width: '100%' }}>
                    <Markdown
                        style={markdownStyles}
                        rules={{
                            table: (node, children, parent, styles) => (
                                <ScrollView
                                    key={node.key}
                                    horizontal
                                    showsHorizontalScrollIndicator={true}
                                    persistentScrollbar={true}
                                    nestedScrollEnabled={true}
                                    contentContainerStyle={{
                                        paddingRight: 30,
                                        paddingBottom: 4,
                                        alignItems: 'flex-start'
                                    }}
                                    style={{ marginVertical: 12 }}
                                >
                                    <View style={[styles.table, { marginVertical: 0 }]}>
                                        {children}
                                    </View>
                                </ScrollView>
                            ),
                        }}
                    >
                        {displayedText}
                    </Markdown>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.messageContainer, styles.userContainer]}>
            <View style={[styles.bubbleWrapper, { alignItems: 'flex-end', maxWidth: '85%' }]}>
                <View style={[styles.bubble, styles.userBubble]}>
                    <Text style={[styles.messageText, styles.userText]}>{item.text}</Text>
                </View>
                <View style={styles.messageMeta}>
                    <Text style={styles.timestamp}>{time}</Text>
                    <TouchableOpacity onPress={() => onDelete(item.id)} style={{ marginLeft: 6 }}>
                        <Trash2 size={11} color={Colors.text.tertiary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ marginLeft: 8, marginTop: 4 }}>
                <GradientBorder size={32} borderWidth={2}>
                    <Image
                        source={{ uri: user?.preferences?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=Random&size=128` }}
                        style={styles.avatarImg}
                    />
                </GradientBorder>
            </View>
        </View>
    );
});

const ChatHeader = React.memo(({ navigation, startNewChat, openHistory }) => (
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
                <Text style={styles.status}>Online AI Assistant</Text>
            </View>
        </View>
        <View style={styles.headerActions}>
            <TouchableOpacity style={styles.historyBtn} onPress={openHistory}>
                <History size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.newChatBtn} onPress={startNewChat}>
                <Sparkles size={16} color={Colors.primary} />
            </TouchableOpacity>
        </View>
    </View>
));

const FAQMarquee = React.memo(({ data, handleSend, tagListRef, setTagContentWidth, tagContentWidth }) => (
    <View style={styles.tagsWrapper}>
        <FlatList
            ref={tagListRef}
            horizontal
            data={data}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={styles.tag}
                    onPress={() => handleSend(item.question)}
                >
                    <Text style={styles.tagText}>{item.question}</Text>
                </TouchableOpacity>
            )}
            keyExtractor={(item, index) => `tag-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 8 }}
            onContentSizeChange={(w) => setTagContentWidth(w)}
            onScroll={(e) => {
                if (tagContentWidth <= 0) return;
                const x = e.nativeEvent.contentOffset.x;
                const unitWidth = tagContentWidth / 3;

                // Infinite loop jump trick for triple-set data
                if (x > unitWidth * 1.5) {
                    tagListRef.current?.scrollToOffset({ offset: x - unitWidth, animated: false });
                } else if (x < unitWidth * 0.5) {
                    tagListRef.current?.scrollToOffset({ offset: x + unitWidth, animated: false });
                }
            }}
            scrollEventThrottle={16}
        />
    </View>
));

const ChatInput = React.memo(({ loading, isListening, startListening, stopListening, handleSend, input, setInput }) => (
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

        <TouchableOpacity style={styles.sendBtn} onPress={() => handleSend()} disabled={loading || !input.trim()}>
            <Send size={20} color={Colors.white} />
        </TouchableOpacity>
    </View>
));

const AICounselorScreen = ({ navigation }) => {
    const { user, refreshUser } = useAuth();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const inputRef = useRef('');
    React.useEffect(() => { inputRef.current = input; }, [input]);

    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [chatId, setChatId] = useState(null);
    const [frequentQuestions, setFrequentQuestions] = useState([]);
    const [isDirty, setIsDirty] = useState(false);
    const [showKeyPopup, setShowKeyPopup] = useState(false);
    const [userMessageCount, setUserMessageCount] = useState(0);
    const [pastChats, setPastChats] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('Eta is thinking...');
    const [popupType, setPopupType] = useState('reminder'); // 'reminder' or 'error'
    const [showKeyInputModal, setShowKeyInputModal] = useState(false);
    const [tempKey, setTempKey] = useState('');
    const [submittingKey, setSubmittingKey] = useState(false);

    const DEEP_QUERY_REGEX = /predict|chance|cutoff|can i get|get into|admission|percentile|rank|college|suggest|branch|coep|vjti|vit|ict/i;

    const uniqueQuestions = React.useMemo(() => {
        const seen = new Set();
        return frequentQuestions.filter(q => {
            if (!q.question) return false;
            const duplicate = seen.has(q.question);
            seen.add(q.question);
            return !duplicate;
        });
    }, [frequentQuestions]);

    const marqueeData = React.useMemo(() => {
        if (!uniqueQuestions.length) return [];
        // Triple is enough for manual loop with jump trick
        return [...uniqueQuestions, ...uniqueQuestions, ...uniqueQuestions];
    }, [uniqueQuestions]);

    const flatListRef = useRef();
    const tagListRef = useRef();
    const [tagContentWidth, setTagContentWidth] = useState(0);

    React.useEffect(() => {
        // Just load history and questions
        loadFrequentQuestions();
        loadHistory();
        startNewChat();
    }, []);

    // Sync tempKey with user on modal open
    React.useEffect(() => {
        if (showKeyInputModal && user?.groqApiKey) {
            setTempKey(user.groqApiKey);
        }
    }, [showKeyInputModal, user?.groqApiKey]);

    // Auto-scroll to bottom on message updates
    React.useEffect(() => {
        if (messages.length > 0) {
            const timer = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [messages.length]);

    const loadHistory = async () => {
        try {
            const localData = await AsyncStorage.getItem('ALLOTEME_LOCAL_CHATS');
            if (localData) {
                setPastChats(JSON.parse(localData));
            }
        } catch (e) {
            console.log('Failed to load local history');
        }
    };

    // Auto-save logic
    React.useEffect(() => {
        if (messages.length > 1) {
            saveCurrentToLocal();
        }
    }, [messages]);

    const saveCurrentToLocal = async () => {
        try {
            const currentChatId = chatId || `local_${Date.now()}`;
            if (!chatId) setChatId(currentChatId);

            const localData = await AsyncStorage.getItem('ALLOTEME_LOCAL_CHATS');
            let chats = localData ? JSON.parse(localData) : [];

            const existingIdx = chats.findIndex(c => c.id === currentChatId);
            const chatObj = {
                id: currentChatId,
                title: messages[1]?.text?.substring(0, 35) || 'New Chat',
                messages,
                updatedAt: new Date().toISOString(),
                isLocal: true
            };

            if (existingIdx > -1) {
                chats[existingIdx] = chatObj;
            } else {
                chats.unshift(chatObj);
            }

            await AsyncStorage.setItem('ALLOTEME_LOCAL_CHATS', JSON.stringify(chats));
            setPastChats(chats);
        } catch (e) {
            console.error('Local save error', e);
        }
    };

    React.useEffect(() => {
        // Automatically stores locally – no need to ask or confirm anymore
        return () => { };
    }, []);

    const loadFrequentQuestions = React.useCallback(async () => {
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
    }, []);

    const startNewChat = React.useCallback(() => {
        setMessages([
            {
                id: '1',
                text: `Hi ${user?.displayName || 'there'}! I'm **Eta powered by AlloteMe - AI Education Counselor**. How can I help you today?`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isNew: true
            }
        ]);
        setChatId(null);
        setIsDirty(false);
    }, [user?.displayName]);

    const handleSaveChat = React.useCallback(async () => {
        // Redundant with auto-save but kept for API consistency / No-op
        saveCurrentToLocal();
    }, [messages, chatId]);

    const startListening = React.useCallback(async () => {
        if (Platform.OS === 'web') {
            // Use Web Speech API on web
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                Alert.alert('Not Supported', 'Your browser does not support voice input.');
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-IN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
            };
            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);
            setIsListening(true);
            recognition.start();
            return;
        }
        // Native Android: use react-native-voice
        if (!Voice) return;
        try {
            await Voice.start('en-IN');
        } catch (e) {
            console.error(e);
        }
    }, []);

    const stopListening = React.useCallback(async () => {
        if (Platform.OS === 'web') {
            setIsListening(false);
            return;
        }
        if (!Voice) return;
        try {
            await Voice.stop();
        } catch (e) {
            console.error(e);
        }
    }, []);

    const handleSend = React.useCallback(async (overrideInput = null) => {
        const textToSend = typeof overrideInput === 'string' ? overrideInput : inputRef.current;
        if (!textToSend || !textToSend.trim() || loading) return;

        const userMsg = {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setIsDirty(true);
        setUserMessageCount(prev => {
            const newCount = prev + 1;
            if (newCount === 5 && !user?.groqApiKey) {
                setPopupType('reminder');
                setShowKeyPopup(true);
            }
            return newCount;
        });

        const isDeepQuery = DEEP_QUERY_REGEX.test(textToSend);
        let statusInterval;

        if (isDeepQuery) {
            const statuses = [
                'Searching database...',
                'Retrieving cutoffs...',
                'Analyzing college trends...',
                'Formatting best matches...',
                'Finalizing response for you...'
            ];
            let sIdx = 0;
            setLoadingStatus(statuses[0]);
            statusInterval = setInterval(() => {
                sIdx = (sIdx + 1) % statuses.length;
                setLoadingStatus(statuses[sIdx]);
            }, 1800);
        } else {
            setLoadingStatus('Eta is thinking...');
        }

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
                    location: user?.location,
                    expectedRegion: user?.expectedRegion
                }
            });

            const botMsg = {
                id: (Date.now() + 1).toString(),
                text: res.data.reply,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isNew: true
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const status = error.response?.status;
            const serverMsg = error.response?.data?.message || '';

            let friendlyMessage;

            if (status === 401 || serverMsg.toLowerCase().includes('api key') || serverMsg.toLowerCase().includes('invalid')) {
                friendlyMessage = `🔑 **API Key Issue**\n\nYour Groq API key seems to be invalid or missing. Please update it from your profile to continue chatting with Eta.\n\n*Tap the key icon or visit Profile → AI Settings to update.*`;
                setPopupType('error');
                setShowKeyPopup(true);
            } else if (status === 429 || serverMsg.toLowerCase().includes('rate') || serverMsg.toLowerCase().includes('limit')) {
                friendlyMessage = `⏳ **Too Many Requests**\n\nEta is getting a lot of questions right now! Please wait a moment and try again.\n\nIf this keeps happening, consider adding your own Groq API key in Settings.`;
            } else if (error.code === 'ECONNABORTED' || serverMsg.toLowerCase().includes('timeout')) {
                friendlyMessage = `🕐 **Response Timed Out**\n\nEta took too long to respond — this can happen when searching through a large amount of college data.\n\n**Try rephrasing your question** or ask about a specific college or branch.`;
            } else if (!error.response || error.message?.toLowerCase().includes('network')) {
                friendlyMessage = `📶 **No Internet Connection**\n\nPlease check your internet connection and try again. Eta needs to be online to answer your questions.`;
            } else {
                // Generic server error — show key popup too, might be API key issue
                friendlyMessage = `😕 **Something went wrong**\n\nEta ran into an unexpected issue while processing your question. Please try again in a moment.\n\n*If the problem persists, try updating your API key or starting a new chat.*`;
                setPopupType('error');
                setShowKeyPopup(true);
            }

            const errorMsg = {
                id: 'bot-error',
                text: friendlyMessage,
                sender: 'bot',
                isError: true,
                timestamp: new Date().toISOString(),
                isNew: true
            };
            setMessages(prev => [...prev.filter(m => m.id !== 'bot-error'), errorMsg]);
        } finally {
            if (statusInterval) clearInterval(statusInterval);
            setLoading(false);
        }
    }, [loading, messages, chatId, user]);

    const deleteMessage = React.useCallback((id) => {
        Alert.alert(
            "Delete Message",
            "Are you sure you want to remove this message?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        setMessages(prev => prev.filter(m => m.id !== id));
                        setIsDirty(true);
                    }
                }
            ]
        );
    }, []);

    const openPastChat = async (id) => {
        try {
            const chat = pastChats.find(c => (c.id || c._id) === id);
            if (chat) {
                let formatted;
                if (chat.isLocal) {
                    formatted = chat.messages.map(m => ({ ...m, isNew: false }));
                } else {
                    formatted = chat.messages.map((m, i) => ({
                        id: `old-${i}`,
                        text: m.content,
                        sender: m.role === 'user' ? 'user' : 'bot',
                        timestamp: chat.updatedAt,
                        isNew: false
                    }));
                }
                setMessages(formatted);
                setChatId(id);
                setShowHistoryModal(false);

                // Ensure we scroll to bottom after loading history
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 300);
            }
        } catch (e) {
            Alert.alert('Error', 'Could not load chat');
        }
    };

    const handleUpdateApiKey = async () => {
        if (!tempKey.trim()) {
            Alert.alert('Error', 'Please enter a valid API key');
            return;
        }
        setSubmittingKey(true);
        try {
            await authAPI.updateProfile({ groqApiKey: tempKey });
            await refreshUser();
            setShowKeyInputModal(false);
            setShowKeyPopup(false);

            // AUTO-RETRY LOGIC: Clear error and resend last user message
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== 'bot-error');
                const lastUserMsg = [...filtered].reverse().find(m => m.sender === 'user');

                // If we found a user message, we can re-trigger handleSend(lastUserMsg.text)
                // but handleSend is a useCallback dependent on 'user'.
                // We'll give it a tiny delay to ensure the refreshed 'user' is propagation.
                if (lastUserMsg) {
                    setTimeout(() => {
                        handleSend(lastUserMsg.text);
                    }, 500);
                }

                return filtered;
            });

            Alert.alert('Success', 'Groq API Key updated! Re-trying your message...');
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to update API key. Please try again.';
            Alert.alert('Update Error', errorMsg);
        } finally {
            setSubmittingKey(false);
        }
    };

    return (
        <MainLayout scrollable={false} showHeader={false} noPadding={true} botSafe={true}>
            <View style={styles.container}>
                <ChatHeader
                    navigation={navigation}
                    startNewChat={startNewChat}
                    openHistory={() => setShowHistoryModal(true)}
                />

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <MessageItem
                            item={item}
                            user={user}
                            onDelete={deleteMessage}
                        />
                    )}
                    onTouchStart={() => Keyboard.dismiss()}
                    ListFooterComponent={loading && (
                        <View style={[styles.messageContainer, styles.botContainer, { marginBottom: 20 }]}>
                            <View style={[styles.bubble, styles.botBubble, { padding: 15, width: 220, alignItems: 'flex-start' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                    <Text style={[styles.loadingText, { color: Colors.primary, fontSize: 13, fontWeight: '500' }]}>
                                        {loadingStatus}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.chatContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
                >
                    <FAQMarquee
                        data={marqueeData}
                        handleSend={handleSend}
                        tagListRef={tagListRef}
                        setTagContentWidth={setTagContentWidth}
                        tagContentWidth={tagContentWidth}
                    />

                    <ChatInput
                        loading={loading}
                        isListening={isListening}
                        startListening={startListening}
                        stopListening={stopListening}
                        handleSend={handleSend}
                        input={input}
                        setInput={setInput}
                    />
                </KeyboardAvoidingView>

                {/* History Modal */}
                <Modal
                    visible={showHistoryModal}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setShowHistoryModal(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowHistoryModal(false)}
                    >
                        <TouchableWithoutFeedback>
                            <View style={styles.historyPopup}>
                                <View style={styles.popupHeader}>
                                    <Text style={styles.popupTitle}>Chat History</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowHistoryModal(false)}
                                        style={styles.closeBtn}
                                    >
                                        <X size={24} color={Colors.text.primary} />
                                    </TouchableOpacity>
                                </View>

                                {pastChats.length > 0 ? (
                                    <FlatList
                                        data={pastChats}
                                        keyExtractor={item => item.id || item._id}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.historyItem}
                                                onPress={() => openPastChat(item.id || item._id)}
                                            >
                                                <View style={styles.historyIcon}>
                                                    <Calendar size={18} color={Colors.primary} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.historyText} numberOfLines={1}>
                                                        {item.title || (item.messages && item.messages[0]?.content) || 'History Chat'}
                                                    </Text>
                                                    <Text style={styles.historyTime}>
                                                        {new Date(item.updatedAt).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    />
                                ) : (
                                    <View style={styles.emptyHistory}>
                                        <Clock size={48} color={Colors.divider} />
                                        <Text style={styles.emptyHistoryText}>No past chats found</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </TouchableOpacity>
                </Modal>

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

                            <Text style={styles.popupTitle}>
                                {popupType === 'error' ? 'AI Connection Trouble' : 'Boost Your AI Experience!'}
                            </Text>
                            <Text style={styles.popupSub}>
                                {popupType === 'error'
                                    ? messages.find(m => m.id === 'bot-error')?.text || "I'm having trouble connecting. Please check or update your Groq API key to continue using the counselor AI."
                                    : `You've sent ${userMessageCount} messages! To ensure uninterrupted, lighting-fast counseling, consider adding your own Groq API key.`
                                }
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
                                    setShowKeyInputModal(true);
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

                {/* Groq Key Input Modal (Matching Profile Screen) */}
                <Modal
                    visible={showKeyInputModal}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setShowKeyInputModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.centeredModal}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Update Groq API Key</Text>
                                    <Text style={styles.modalSub}>Your profile credentials</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowKeyInputModal(false)}>
                                    <X size={20} color={Colors.text.tertiary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.keyInfoText}>
                                Your personal key avoids service interruptions. Keys are stored securely and never shared.
                            </Text>

                            <View style={styles.guideBox}>
                                <Text style={styles.guideTitle}>How to get your key:</Text>
                                <Text style={styles.guideStep}>1. Visit Groq Console</Text>
                                <Text style={styles.guideStep}>2. Click "API Keys" in sidebar</Text>
                                <Text style={styles.guideStep}>3. Create and Copy a new key</Text>

                                <TouchableOpacity
                                    style={styles.webLink}
                                    onPress={() => Linking.openURL('https://console.groq.com/keys')}
                                >
                                    <Text style={styles.webLinkText}>Go to Groq Console</Text>
                                    <ImageIcon size={14} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Bot size={18} color={Colors.primary} style={styles.inputIcon} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.miniLabel}>Groq API Key</Text>
                                    <Input
                                        value={tempKey}
                                        onChangeText={setTempKey}
                                        placeholder="gsk_..."
                                        secureTextEntry={true}
                                        containerStyle={{ marginBottom: 0 }}
                                    />
                                </View>
                            </View>

                            <Button
                                title="Save API Key"
                                onPress={handleUpdateApiKey}
                                loading={submittingKey}
                                style={styles.saveKeyBtn}
                            />

                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={async () => {
                                    setTempKey('');
                                    try {
                                        await authAPI.updateProfile({ groqApiKey: null });
                                        await refreshUser();
                                        setShowKeyInputModal(false);
                                        Alert.alert('Success', 'Personal API key removed.');
                                    } catch (e) {
                                        Alert.alert('Error', 'Failed to remove key');
                                    }
                                }}
                            >
                                <Text style={styles.removeText}>Remove Key (Use System Default)</Text>
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
    botContainer: { justifyContent: 'flex-start', alignSelf: 'stretch' },
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
        paddingVertical: 2,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
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
        alignItems: 'center',
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
    },
    centeredModal: {
        backgroundColor: Colors.white,
        margin: 20,
        borderRadius: 24,
        padding: 24,
        width: '90%',
        alignSelf: 'center',
        marginBottom: 'auto',
        marginTop: 'auto'
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    modalSub: { fontSize: 13, color: Colors.text.tertiary, marginTop: 2 },
    keyInfoText: { fontSize: 13, color: Colors.text.tertiary, marginBottom: 20, lineHeight: 18 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 20
    },
    inputIcon: { marginRight: 12 },
    miniLabel: { fontSize: 10, fontWeight: 'bold', color: Colors.primary, marginBottom: 2, textTransform: 'uppercase' },
    saveKeyBtn: { marginTop: 8 },
    removeBtn: { marginTop: 16, alignItems: 'center' },
    removeText: { color: Colors.error, fontSize: 12, fontWeight: '600' },
    guideBox: {
        backgroundColor: Colors.background,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.divider
    },
    guideTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 10 },
    guideStep: { fontSize: 12, color: Colors.text.secondary, marginBottom: 4 },
    webLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.divider
    },
    webLinkText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: '100%',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.divider
    },
    keyInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text.primary,
        height: 40
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    historyBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: Colors.background,
    },
    bubbleWrapper: {
        maxWidth: '92%',
    },
    messageMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        paddingHorizontal: 4,
    },
    timestamp: {
        fontSize: 10,
        color: Colors.text.tertiary,
    },
    historyPopup: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '80%',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.background,
        borderRadius: 16,
        marginBottom: 12,
        gap: 12,
    },
    historyIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    historyTime: {
        fontSize: 12,
        color: Colors.text.tertiary,
        marginTop: 2,
    },
    emptyHistory: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyHistoryText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.text.tertiary,
    }
});

export default AICounselorScreen;