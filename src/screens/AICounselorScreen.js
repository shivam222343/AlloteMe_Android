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
import { Image, Modal } from 'react-native';

const AICounselorScreen = ({ navigation }) => {
    const { user } = useAuth();

    const [messages, setMessages] = useState([
        { id: '1', text: `Hi ${user?.displayName || 'there'}! I'm your AI counselor. Ask me anything about ${user?.examType || 'MHTCET/JEE'} admissions!`, sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [userMessageCount, setUserMessageCount] = useState(0);
    const [showKeyPopup, setShowKeyPopup] = useState(false);
    const flatListRef = useRef();

    React.useEffect(() => {
        if (user?.role === 'student' && !user?.preferences?.isProfileComplete) {
            Alert.alert(
                'Unlock AI Insights',
                'Complete your admission profile to get personalized AI counseling recommendations.',
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Complete Now', onPress: () => navigation.navigate('CompleteProfile') }
                ]
            );
        }

        if (Voice && Platform.OS !== 'web') {
            Voice.onSpeechStart = () => setIsListening(true);
            Voice.onSpeechEnd = () => setIsListening(false);
            Voice.onSpeechResults = (e) => {
                if (e.value && e.value[0]) {
                    setInput(e.value[0]);
                }
            };
            Voice.onSpeechError = (e) => {
                console.error(e);
                setIsListening(false);
            };
        }

        return () => {
            if (Voice && Platform.OS !== 'web') {
                Voice.destroy().then(Voice.removeAllListeners).catch(() => { });
            }
        };
    }, [user]);

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

            // Track message count for popup
            const newCount = userMessageCount + 1;
            setUserMessageCount(newCount);

            if (newCount === 5 && !user?.groqApiKey) {
                setShowKeyPopup(true);
            }
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
                        <Text style={styles.title}>AI Counselor</Text>
                        <View style={styles.statusContainer}>
                            <View style={styles.statusDot} />
                            <Text style={styles.status}>Online • Ready to help</Text>
                        </View>
                    </View>
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
