import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
    Dimensions,
    ScrollView,
    Keyboard,
    Animated,
    Easing,
    Vibration,
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { messagesAPI } from '../services/api';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { snapsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

const DateSeparator = ({ date }) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let dateText = "";
    if (d.toDateString() === today.toDateString()) {
        dateText = "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
        dateText = "Yesterday";
    } else {
        dateText = d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
    }

    return (
        <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{dateText}</Text>
            </View>
        </View>
    );
};

const MessageItem = React.memo(({ item, index, user, otherUser, messages, setReplyingTo, setShowOptionsId, isSelected, toggleSelection, isSelectionMode }) => {
    // Filter out malformed messages (e.g. error objects)
    if (!item) return null;
    if (item.type === 'date_separator') {
        return <DateSeparator date={item.date} />;
    }
    if (typeof item.content !== 'string') return null;

    const isAI = item.senderId === 'AI' || item.senderId?._id === 'AI' || item.senderId === '000000000000000000000000' || item.senderId?._id === '000000000000000000000000' || item.isAI;
    const isMine = !isAI && (item.senderId === user._id || (item.senderId?._id === user._id));
    const prevMessage = messages[index - 1];
    const showAvatar = !isMine && !isAI && (!prevMessage || (prevMessage.senderId?._id || prevMessage.senderId) !== (item.senderId?._id || item.senderId));

    const itemSwipeX = useRef(new Animated.Value(0)).current;

    const onGestureEvent = Animated.event(
        [{ nativeEvent: { translationX: itemSwipeX } }],
        { useNativeDriver: false }
    );

    const onHandlerStateChange = (event) => {
        if (event.nativeEvent.state === State.END) {
            const swipeDistance = isMine ? -event.nativeEvent.translationX : event.nativeEvent.translationX;
            if (swipeDistance > 60) {
                Vibration.vibrate(50);
                setReplyingTo(item);
            }
            Animated.spring(itemSwipeX, {
                toValue: 0,
                useNativeDriver: false,
                tension: 50,
                friction: 7
            }).start();
        }
    };

    return (
        <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetX={isMine ? [-50, 0] : [0, 50]}
            failOffsetY={[-5, 5]}
        >
            <Animated.View style={[
                styles.messageRow,
                isMine ? styles.myRow : isAI ? styles.aiRow : styles.otherRow,
                // Add extra margin if previous message has reactions
                prevMessage && prevMessage.reactions && prevMessage.reactions.length > 0 && { marginTop: 12 },
                {
                    transform: [{
                        translateX: itemSwipeX.interpolate({
                            inputRange: isMine ? [-100, 0] : [0, 100],
                            outputRange: isMine ? [-40, 0] : [0, 40],
                            extrapolate: 'clamp'
                        })
                    }]
                }
            ]}>
                {!isMine && !isAI && (
                    <View style={styles.avatarSpace}>
                        {showAvatar && (
                            <Image
                                source={otherUser.profilePicture?.url ? { uri: otherUser.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + otherUser.displayName }}
                                style={styles.miniAvatar}
                            />
                        )}
                    </View>
                )}

                {isAI && (
                    <View style={styles.avatarSpace}>
                        <View style={styles.aiAvatar}>
                            <Ionicons name="sparkles" size={16} color="#FFF" />
                        </View>
                    </View>
                )}

                <View style={{ position: 'relative' }}>
                    {/* Reply Hint Icon */}
                    <Animated.View style={[
                        styles.replyHint,
                        isMine ? styles.myReplyHint : styles.otherReplyHint,
                        {
                            opacity: itemSwipeX.interpolate({
                                inputRange: isMine ? [-60, 0] : [0, 60],
                                outputRange: isMine ? [1, 0] : [0, 1],
                                extrapolate: 'clamp'
                            }),
                            transform: [{
                                scale: itemSwipeX.interpolate({
                                    inputRange: isMine ? [-60, 0] : [0, 60],
                                    outputRange: [1, 0.5],
                                    extrapolate: 'clamp'
                                })
                            }]
                        }
                    ]}>
                        <Ionicons name="arrow-undo-circle" size={24} color="#0A66C2" />
                    </Animated.View>

                    <TouchableOpacity
                        onLongPress={() => {
                            if (!isSelectionMode) {
                                Vibration.vibrate(50);
                                toggleSelection(item._id);
                            }
                        }}
                        onPress={() => {
                            if (isSelectionMode) {
                                toggleSelection(item._id);
                            } else if (!item.deleted && !isAI) {
                                setShowOptionsId(item._id);
                            } else if (item.deleted) {
                                // Allow options for deleted messages too (Delete for me)
                                setShowOptionsId(item._id);
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        <Animatable.View
                            animation={isMine ? "slideInRight" : "slideInLeft"}
                            duration={300}
                            style={[
                                styles.bubble,
                                isMine ? styles.myBubble : isAI ? styles.aiBubble : styles.otherBubble,
                                item.deleted && styles.deletedBubble,
                                isSelected && styles.selectedBubble
                            ]}
                        >
                            {isSelected && (
                                <View style={styles.selectionOverlay}>
                                    <Ionicons name="checkmark-circle" size={20} color="#0A66C2" />
                                </View>
                            )}
                            {isAI && (
                                <View style={styles.aiHeader}>
                                    <Ionicons name="sparkles" size={12} color="#7C3AED" />
                                    <Text style={styles.aiLabel}>Eta AI</Text>
                                </View>
                            )}

                            {(item.forwarded || item.isForwarded) && (
                                <View style={styles.forwardedBadge}>
                                    <Ionicons name="arrow-redo" size={10} color="#6B7280" />
                                    <Text style={styles.forwardedText}>Forwarded</Text>
                                </View>
                            )}

                            {item.replyTo && (
                                <View style={styles.replyPreview}>
                                    <Text style={styles.replyUser}>{item.replyTo.senderId === user._id ? 'You' : 'Member'}</Text>
                                    <Text style={styles.replyContent} numberOfLines={1}>{item.replyTo.content}</Text>
                                </View>
                            )}

                            {item.fileUrl && !item.deleted && (
                                <Image
                                    source={{ uri: item.fileUrl }}
                                    style={styles.messageImage}
                                    resizeMode="cover"
                                />
                            )}
                            <Text style={[styles.messageText, isMine ? styles.myText : isAI ? styles.aiText : styles.otherText, item.deleted && styles.deletedText]}>
                                {item.content}
                            </Text>
                            <View style={styles.messageFooter}>
                                <Text style={styles.timeText}>
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {isMine && !item.deleted && (
                                    <Ionicons
                                        name={item.read ? "checkmark-done" : "checkmark"}
                                        size={14}
                                        color={item.read ? "#34B7F1" : "#9CA3AF"}
                                        style={{ marginLeft: 4 }}
                                    />
                                )}
                            </View>

                            {/* Reactions Display */}
                            {item.reactions && item.reactions.length > 0 && (
                                <View style={[styles.reactionsContainer, isMine ? styles.myReactions : styles.otherReactions]}>
                                    {item.reactions.map((r, i) => (
                                        <Text key={i} style={styles.reactionEmoji}>{r.emoji}</Text>
                                    ))}
                                    <Text style={styles.reactionCount}>{item.reactions.length}</Text>
                                </View>
                            )}
                        </Animatable.View>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </PanGestureHandler>
    );
});

const ChatScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { otherUser } = route.params;
    const { user, socket, refreshUnreadMessageCount } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [showOptionsId, setShowOptionsId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [mentionEta, setMentionEta] = useState(false);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);
    const [deleteType, setDeleteType] = useState('me');
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [forwardLoading, setForwardLoading] = useState(false);

    const isSelectionMode = selectedMessages.length > 0;

    const formattedMessages = useMemo(() => {
        const sorted = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const formatted = [];
        let lastDate = null;

        sorted.forEach((msg) => {
            const dateStr = new Date(msg.createdAt).toDateString();
            if (dateStr !== lastDate) {
                formatted.push({
                    type: 'date_separator',
                    date: dateStr,
                    _id: `date-${dateStr}`
                });
                lastDate = dateStr;
            }
            formatted.push(msg);
        });
        return formatted;
    }, [messages]);

    const flatListRef = useRef();
    const inputRef = useRef();

    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    useEffect(() => {
        fetchMessages();
        markRead();

        if (socket) {
            socket.on('message:receive', handleReceiveMessage);
            socket.on('message:typing', handleTypingStatus);
            socket.on('message:delete', handleDeleteSync);
            socket.on('message:reaction', handleReactionSync);
        }

        return () => {
            if (socket) {
                socket.off('message:receive', handleReceiveMessage);
                socket.off('message:typing', handleTypingStatus);
                socket.off('message:delete', handleDeleteSync);
                socket.off('message:reaction', handleReactionSync);
            }
        };
    }, [otherUser._id]);

    useEffect(() => {
        if (showForwardModal) {
            fetchConversations();
        }
    }, [showForwardModal]);

    const fetchConversations = async () => {
        try {
            const res = await messagesAPI.getConversations();
            if (res.success) setConversations(res.data);
        } catch (error) {
            console.log('Error fetching conversations');
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await messagesAPI.getMessages(otherUser._id);
            if (res.success) setMessages(res.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async () => {
        try {
            await messagesAPI.markAsRead(otherUser._id);
            refreshUnreadMessageCount(); // Update badge in sidebar
        } catch (error) {
            console.log('Error marking read');
        }
    };

    const handleReceiveMessage = (message) => {
        // Handle regular messages and AI messages
        const isAIMessage = message.senderId === 'AI' || message.senderId?._id === 'AI' || message.senderId === '000000000000000000000000' || message.senderId?._id === '000000000000000000000000' || message.isAI;
        const isRelevantMessage = isAIMessage ||
            message.senderId._id === otherUser._id ||
            message.receiverId._id === otherUser._id ||
            message.senderId === otherUser._id ||
            message.receiverId === otherUser._id;

        if (isRelevantMessage) {
            setMessages(prev => {
                // Prevent duplicates
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });

            // Clear AI processing state when AI responds
            if (isAIMessage) {
                setAiProcessing(false);
            }

            // Mark as read if it's from the other user
            if (!isAIMessage && (message.senderId._id === otherUser._id || message.senderId === otherUser._id)) {
                markRead();
            }
        }
    };

    const handleTypingStatus = (data) => {
        if (data.senderId === otherUser._id) {
            setIsTyping(data.isTyping);
        }
    };

    const handleDeleteSync = ({ messageId, type }) => {
        if (type === 'everyone') {
            setMessages(prev => prev.map(m =>
                m._id === messageId ? { ...m, deleted: true, content: 'This message was deleted' } : m
            ));
        }
    };

    const handleReactionSync = ({ messageId, reactions }) => {
        setMessages(prev => prev.map(m =>
            m._id === messageId ? { ...m, reactions } : m
        ));
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const tempText = inputText;
        setInputText('');
        const tempReply = replyingTo;
        setReplyingTo(null);
        setMentionEta(false);

        try {
            const messageData = {
                receiverId: otherUser._id,
                content: tempText,
                type: 'text',
                replyTo: tempReply?._id
            };

            // Check if message mentions @Eta (Case-insensitive)
            const mentionsEta = /@Eta/i.test(tempText);
            if (mentionsEta) {
                messageData.mentionAI = true;
                setAiProcessing(true); // Show AI is processing
            }

            const res = await messagesAPI.send(messageData);
            if (res.success) {
                setMessages(prev => [...prev, res.data]);
                // Auto scroll to bottom
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            } else {
                setAiProcessing(false);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setAiProcessing(false);
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
            });

            if (!result.canceled) {
                uploadAttachment(result.assets[0].uri, 'image');
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
        setShowAttachMenu(false);
    };

    const handlePickCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                alert('Sorry, we need camera permissions to make this work!');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                quality: 0.8,
            });

            if (!result.canceled) {
                uploadAttachment(result.assets[0].uri, 'image');
            }
        } catch (error) {
            console.error('Error launching camera:', error);
        }
        setShowAttachMenu(false);
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.assets && result.assets.length > 0) {
                uploadAttachment(result.assets[0].uri, 'document');
            }
        } catch (error) {
            console.error('Error picking document:', error);
        }
        setShowAttachMenu(false);
    };

    const uploadAttachment = async (uri, type) => {
        try {
            setLoading(true); // Show some loading state
            const formData = new FormData();

            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const ext = match ? match[1] : (type === 'image' ? 'jpg' : 'pdf');

            formData.append('file', {
                uri,
                type: type === 'image' ? `image/${ext}` : `application/${ext}`,
                name: filename
            });
            formData.append('receiverId', otherUser._id);
            formData.append('type', type);
            formData.append('content', type === 'image' ? '📷 Photo' : '📎 Attachment');

            const res = await messagesAPI.send(formData);
            if (res.success) {
                setMessages(prev => [...prev, res.data]);
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        } catch (error) {
            console.error('Error uploading:', error);
            alert("Failed to upload file. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputTyping = (text) => {
        setInputText(text);
        if (socket) {
            socket.emit('message:typing', {
                receiverId: otherUser._id,
                isTyping: text.length > 0,
                senderId: user._id
            });
        }
    };

    const toggleReaction = async (messageId, emoji) => {
        try {
            const res = await messagesAPI.addReaction(messageId, { emoji });
            if (res.success) {
                setMessages(prev => prev.map(m =>
                    m._id === messageId ? { ...m, reactions: res.data } : m
                ));
                setShowOptionsId(null);
            }
        } catch (error) {
            console.log('Error reacting');
        }
    };

    const deleteMessage = async (messageId, type) => {
        setMessageToDelete(messageId);
        setDeleteType(type);
        setDeleteConfirmModalVisible(true);
    };

    const forwardMessage = async (targetUserId) => {
        if (!messageToForward) return;
        setForwardLoading(true);
        try {
            const res = await messagesAPI.send({
                receiverId: targetUserId,
                content: messageToForward.content,
                type: messageToForward.type || 'text',
                isForwarded: true
            });
            if (res.success) {
                // If forwarding to current chat, update UI
                if (targetUserId === otherUser._id) {
                    setMessages(prev => [...prev, res.data]);
                }
                setShowForwardModal(false);
                setMessageToForward(null);
                alert('Message forwarded');
            }
        } catch (error) {
            console.error('Error forwarding:', error);
            alert('Failed to forward message');
        } finally {
            setForwardLoading(false);
        }
    };

    const toggleSelection = useCallback((id) => {
        setSelectedMessages(prev => {
            if (prev.includes(id)) {
                return prev.filter(mId => mId !== id);
            } else {
                return [...prev, id];
            }
        });
    }, []);

    const deleteSelectedMessages = (type) => {
        setDeleteType(type);
        setDeleteConfirmModalVisible(true);
    };

    const confirmDeleteMessage = async () => {
        const idsToDelete = isSelectionMode ? selectedMessages : [messageToDelete];
        if (idsToDelete.length === 0) return;

        try {
            // If multiple, loop or use a bulk endpoint if available. 
            // The provided API only shows single delete. We will loop for now or assume single if not in selection mode.
            for (const id of idsToDelete) {
                await messagesAPI.deleteMessage(id, deleteType);
            }

            if (deleteType === 'me') {
                setMessages(prev => prev.filter(m => !idsToDelete.includes(m._id)));
            } else {
                setMessages(prev => prev.map(m =>
                    idsToDelete.includes(m._id) ? { ...m, deleted: true, content: 'This message was deleted' } : m
                ));
            }

            setSelectedMessages([]);
            setMessageToDelete(null);
            setDeleteConfirmModalVisible(false);
            setShowOptionsId(null);
        } catch (error) {
            console.error('Error deleting messages:', error);
            alert('Failed to delete some messages');
            setDeleteConfirmModalVisible(false);
        }
    };

    const renderMessage = useCallback(({ item, index }) => (
        <MessageItem
            item={item}
            index={index}
            user={user}
            otherUser={otherUser}
            messages={formattedMessages}
            setReplyingTo={setReplyingTo}
            setShowOptionsId={setShowOptionsId}
            isSelected={selectedMessages.includes(item._id)}
            toggleSelection={toggleSelection}
            isSelectionMode={isSelectionMode}
        />
    ), [user._id, otherUser._id, formattedMessages.length, selectedMessages, isSelectionMode, toggleSelection]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: '#FFF' }}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    {isSelectionMode ? (
                        <>
                            <TouchableOpacity onPress={() => setSelectedMessages([])} style={styles.backButton}>
                                <Ionicons name="close" size={28} color="#0A66C2" />
                            </TouchableOpacity>
                            <View style={styles.headerInfo}>
                                <Text style={styles.selectionCount}>{selectedMessages.length}</Text>
                            </View>
                            <View style={styles.headerActions}>
                                <TouchableOpacity
                                    style={styles.headerActionBtn}
                                    onPress={() => deleteSelectedMessages('me')}
                                >
                                    <Ionicons name="trash-outline" size={24} color="#0A66C2" />
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={28} color="#0A66C2" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerInfo}
                                onPress={() => setShowProfileModal(true)}
                            >
                                <Image
                                    source={otherUser.profilePicture?.url ? { uri: otherUser.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + otherUser.displayName }}
                                    style={styles.headerAvatar}
                                />
                                <View>
                                    <Text style={[styles.headerName, { flex: 1 }]} numberOfLines={1}>{otherUser.displayName}</Text>
                                    <Text style={styles.headerStatus}>
                                        {isTyping ? 'typing...' : (otherUser.isOnline ? 'online' : `last seen ${formatRelativeTime(otherUser.lastSeen)}`)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <View style={styles.headerActions}>
                                <TouchableOpacity style={styles.headerActionBtn}>
                                    <Ionicons name="call-outline" size={22} color="#0A66C2" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.headerActionBtn}>
                                    <Ionicons name="videocam-outline" size={24} color="#0A66C2" />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <View style={{ flex: 1, backgroundColor: '#E5DDD5' }}>
                        {/* Chat Background */}
                        <View
                            style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E5DDD5', opacity: 0.5, zIndex: -1 }]}
                            pointerEvents="none"
                        />

                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#0A66C2" />
                            </View>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                renderItem={renderMessage}
                                keyExtractor={item => item._id}
                                style={{ flex: 1 }}
                                contentContainerStyle={[styles.messageList, { paddingBottom: 20 }]}
                                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                keyboardDismissMode="on-drag"
                                ListFooterComponent={() => (
                                    <>
                                        {aiProcessing && (
                                            <Animatable.View animation="fadeIn" style={styles.aiProcessingContainer}>
                                                <View style={styles.aiThumbnail}>
                                                    <Ionicons name="sparkles" size={14} color="#FFF" />
                                                </View>
                                                <Text style={styles.aiProcessingText}>Eta is thinking...</Text>
                                                <ActivityIndicator size="small" color="#7C3AED" style={{ marginLeft: 8 }} />
                                            </Animatable.View>
                                        )}
                                        {isTyping && (
                                            <View style={styles.typingContainer}>
                                                <Text style={styles.typingText}>{otherUser.displayName} is typing...</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            />
                        )}

                        {/* Input Area - Now part of flex flow */}
                        <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                            {replyingTo && (
                                <View style={styles.inputReplyBar}>
                                    <View style={styles.replyBarIndicator} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.replyBarUser}>Replying to {replyingTo.senderId === user._id ? 'yourself' : 'member'}</Text>
                                        <Text style={styles.replyBarText} numberOfLines={1}>{replyingTo.content}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                        <Ionicons name="close-circle" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Attachment Menu */}
                            {showAttachMenu && (
                                <View style={styles.attachMenu}>
                                    <TouchableOpacity
                                        style={[styles.attachOption, { backgroundColor: '#7F66FF' }]}
                                        onPress={handlePickDocument}
                                    >
                                        <Ionicons name="document" size={24} color="#FFF" />
                                        <Text style={styles.attachLabel}>Document</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.attachOption, { backgroundColor: '#5F85DB' }]}
                                        onPress={handlePickCamera}
                                    >
                                        <Ionicons name="camera" size={24} color="#FFF" />
                                        <Text style={styles.attachLabel}>Camera</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.attachOption, { backgroundColor: '#D3396D' }]}
                                        onPress={handlePickImage}
                                    >
                                        <Ionicons name="images" size={24} color="#FFF" />
                                        <Text style={styles.attachLabel}>Gallery</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.attachOption, { backgroundColor: '#F09433' }]}
                                        onPress={handlePickImage}
                                    >
                                        <Ionicons name="videocam" size={24} color="#FFF" />
                                        <Text style={styles.attachLabel}>Video</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Emoji Picker */}
                            {showEmojiPicker && (
                                <View style={styles.emojiPicker}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👏', '🙏', '❤️', '🔥', '✨', '🎉', '💯', '👌', '✅'].map(emoji => (
                                            <TouchableOpacity
                                                key={emoji}
                                                style={styles.emojiButton}
                                                onPress={() => {
                                                    setInputText(prev => prev + emoji);
                                                    setShowEmojiPicker(false);
                                                }}
                                            >
                                                <Text style={styles.emojiText}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <View style={styles.inputContainer}>
                                <TouchableOpacity
                                    style={styles.attachButton}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setShowAttachMenu(!showAttachMenu);
                                        setShowEmojiPicker(false);
                                    }}
                                >
                                    <Ionicons name={showAttachMenu ? "close" : "add"} size={26} color="#0A66C2" />
                                </TouchableOpacity>

                                <View style={styles.inputFieldContainer}>
                                    <TextInput
                                        ref={inputRef}
                                        style={styles.input}
                                        placeholder="Message..."
                                        value={inputText}
                                        onChangeText={handleInputTyping}
                                        onFocus={() => {
                                            setShowEmojiPicker(false);
                                            setShowAttachMenu(false);
                                        }}
                                        multiline
                                        placeholderTextColor="#9CA3AF"
                                    />

                                    <View style={styles.inputActions}>
                                        <TouchableOpacity
                                            style={[styles.quickActionBtn, mentionEta && styles.quickActionActive]}
                                            onPress={() => {
                                                if (!inputText.includes('@Eta')) {
                                                    setInputText('@Eta ' + inputText);
                                                    setMentionEta(true);
                                                }
                                            }}
                                        >
                                            <Text style={[styles.etaText, mentionEta && { color: '#0A66C2' }]}>@Eta</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.quickActionBtn}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowEmojiPicker(!showEmojiPicker);
                                                setShowAttachMenu(false);
                                            }}
                                        >
                                            <Ionicons name="happy-outline" size={22} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {inputText.length > 0 ? (
                                    <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                                        <Ionicons name="send" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.micButton}>
                                        <Ionicons name="mic" size={24} color="#0A66C2" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>

                {/* Message Options Modal */}
                <Modal
                    visible={!!showOptionsId}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowOptionsId(null)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowOptionsId(null)}
                    >
                        <View style={styles.optionsPopup}>
                            <View style={styles.reactionBar}>
                                {['❤️', '😂', '😮', '😢', '🙏', '👍'].map(emoji => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={styles.reactionBtn}
                                        onPress={() => toggleReaction(showOptionsId, emoji)}
                                    >
                                        <Text style={styles.reactionText}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.menuList}>
                                {(() => {
                                    const msg = messages.find(m => m._id === showOptionsId);
                                    if (!msg || msg.deleted) return null;
                                    return (
                                        <>
                                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                                                setReplyingTo(msg);
                                                setShowOptionsId(null);
                                            }}>
                                                <Ionicons name="arrow-undo-outline" size={20} color="#374151" />
                                                <Text style={styles.menuText}>Reply</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.menuItem} onPress={async () => {
                                                await Clipboard.setStringAsync(msg.content);
                                                setShowOptionsId(null);
                                                alert('Message copied');
                                            }}>
                                                <Ionicons name="copy-outline" size={20} color="#374151" />
                                                <Text style={styles.menuText}>Copy</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                                                setMessageToForward(msg);
                                                setShowForwardModal(true);
                                                setShowOptionsId(null);
                                            }}>
                                                <Ionicons name="arrow-redo-outline" size={20} color="#374151" />
                                                <Text style={styles.menuText}>Forward</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                                                toggleSelection(msg._id);
                                                setShowOptionsId(null);
                                            }}>
                                                <Ionicons name="checkbox-outline" size={20} color="#374151" />
                                                <Text style={styles.menuText}>Select</Text>
                                            </TouchableOpacity>
                                        </>
                                    );
                                })()}
                                <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={() => deleteMessage(showOptionsId, 'me')}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete for me</Text>
                                </TouchableOpacity>
                                {(() => {
                                    const msg = messages.find(m => m._id === showOptionsId);
                                    if (!msg) return null;
                                    const msgSenderId = msg.senderId?._id || msg.senderId;
                                    const isMsgMine = msgSenderId === user._id;
                                    // Allow "Delete for everyone" only for user's own messages (not AI messages) and if it's NOT already deleted
                                    if (!isMsgMine || msg.deleted) return null;
                                    return (
                                        <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={() => deleteMessage(showOptionsId, 'everyone')}>
                                            <Ionicons name="trash-bin-outline" size={20} color="#EF4444" />
                                            <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete for everyone</Text>
                                        </TouchableOpacity>
                                    );
                                })()}
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Member Profile Modal */}
                <Modal
                    visible={showProfileModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowProfileModal(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowProfileModal(false)}
                    >
                        <View style={styles.profileCard}>
                            <View style={styles.profileHeader}>
                                <Image
                                    source={otherUser.profilePicture?.url ? { uri: otherUser.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + otherUser.displayName }}
                                    style={styles.largeAvatar}
                                />
                                <Text style={styles.profileName}>{otherUser.displayName}</Text>
                                <Text style={styles.profileEmail}>{otherUser.email || 'Member of Mavericks'}</Text>
                            </View>

                            <View style={styles.profileActions}>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Ionicons name="chatbubble-ellipses" size={24} color="#0A66C2" />
                                    <Text style={styles.actionText}>Message</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Ionicons name="call" size={24} color="#0A66C2" />
                                    <Text style={styles.actionText}>Call</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Ionicons name="videocam" size={24} color="#0A66C2" />
                                    <Text style={styles.actionText}>Video</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.closeProfileBtn}
                                onPress={() => setShowProfileModal(false)}
                            >
                                <Text style={styles.closeProfileText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    visible={deleteConfirmModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setDeleteConfirmModalVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setDeleteConfirmModalVisible(false)}
                    >
                        <View style={styles.deleteConfirmCard}>
                            <View style={styles.deleteIconContainer}>
                                <Ionicons name="trash" size={40} color="#EF4444" />
                            </View>
                            <Text style={styles.deleteConfirmTitle}>
                                {isSelectionMode ? `Delete ${selectedMessages.length} messages?` : 'Delete Message?'}
                            </Text>
                            <Text style={styles.deleteConfirmText}>
                                {isSelectionMode
                                    ? 'How would you like to delete these messages?'
                                    : (deleteType === 'everyone'
                                        ? 'Are you sure you want to delete this message for everyone?'
                                        : 'Are you sure you want to delete this message for yourself?')}
                            </Text>

                            {isSelectionMode ? (
                                <View style={{ width: '100%', gap: 10 }}>
                                    <TouchableOpacity
                                        style={[styles.confirmDeleteBtn, { width: '100%' }]}
                                        onPress={() => {
                                            setDeleteType('me');
                                            confirmDeleteMessage();
                                        }}
                                    >
                                        <Text style={styles.confirmDeleteBtnText}>Delete for me</Text>
                                    </TouchableOpacity>

                                    {(() => {
                                        const selectedItems = messages.filter(m => selectedMessages.includes(m._id));
                                        const allMine = selectedItems.every(m => {
                                            const senderId = m.senderId?._id || m.senderId;
                                            return senderId === user._id && !m.deleted;
                                        });
                                        if (allMine && selectedItems.length > 0) {
                                            return (
                                                <TouchableOpacity
                                                    style={[styles.confirmDeleteBtn, { width: '100%' }]}
                                                    onPress={() => {
                                                        setDeleteType('everyone');
                                                        confirmDeleteMessage();
                                                    }}
                                                >
                                                    <Text style={styles.confirmDeleteBtnText}>Delete for everyone</Text>
                                                </TouchableOpacity>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <TouchableOpacity
                                        style={[styles.cancelBtn, { width: '100%' }]}
                                        onPress={() => setDeleteConfirmModalVisible(false)}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.deleteConfirmActions}>
                                    <TouchableOpacity
                                        style={[styles.cancelBtn, { flex: 1 }]}
                                        onPress={() => setDeleteConfirmModalVisible(false)}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.confirmDeleteBtn, { flex: 1 }]}
                                        onPress={confirmDeleteMessage}
                                    >
                                        <Text style={styles.confirmDeleteBtnText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Forward Message Modal */}
                <Modal
                    visible={showForwardModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowForwardModal(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowForwardModal(false)}
                    >
                        <View style={styles.forwardCard}>
                            <Text style={styles.forwardTitle}>Forward Message To</Text>
                            <FlatList
                                data={conversations}
                                keyExtractor={item => item.otherUser._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.forwardMemberItem}
                                        onPress={() => forwardMessage(item.otherUser._id)}
                                    >
                                        <Image
                                            source={item.otherUser.profilePicture?.url ? { uri: item.otherUser.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + item.otherUser.displayName }}
                                            style={styles.forwardAvatar}
                                        />
                                        <Text style={styles.forwardName}>{item.otherUser.displayName}</Text>
                                        <Ionicons name="send-outline" size={20} color="#0A66C2" />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: '#6B7280' }}>No recent chats found</Text>
                                    </View>
                                )}
                            />
                            <TouchableOpacity
                                style={styles.closeForwardBtn}
                                onPress={() => setShowForwardModal(false)}
                            >
                                <Text style={styles.closeForwardText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E5DDD5', // WhatsApp classic background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 10,
        paddingHorizontal: 10,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        zIndex: 10,
    },
    backButton: {
        padding: 5,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 5,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerStatus: {
        fontSize: 12,
        color: '#10B981',
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerActionBtn: {
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageList: {
        paddingHorizontal: 15,
        paddingVertical: 20,
        // paddingBottom will be dynamically set
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 10,
        width: '100%',
    },
    myRow: {
        justifyContent: 'flex-end',
    },
    otherRow: {
        justifyContent: 'flex-start',
    },
    aiRow: {
        justifyContent: 'flex-start',
    },
    aiAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiBubble: {
        backgroundColor: '#F3E8FF',
        borderTopLeftRadius: 2,
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    aiLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#7C3AED',
        marginLeft: 4,
    },
    aiText: {
        color: '#1F2937',
    },
    messageImage: {
        width: 200,
        height: 150,
        borderRadius: 10,
        marginBottom: 8,
    },
    avatarSpace: {
        width: 35,
        marginRight: 5,
        justifyContent: 'flex-end',
    },
    miniAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    bubble: {
        maxWidth: width * 0.75,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        position: 'relative',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    myBubble: {
        backgroundColor: '#EBF5FF',
        borderTopRightRadius: 2,
    },
    otherBubble: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 2,
    },
    deletedBubble: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myText: {
        color: '#1F2937',
    },
    otherText: {
        color: '#1F2937',
    },
    deletedText: {
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    replyPreview: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderLeftWidth: 3,
        borderLeftColor: '#0A66C2',
        padding: 5,
        borderRadius: 4,
        marginBottom: 5,
    },
    replyUser: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0A66C2',
    },
    replyContent: {
        fontSize: 12,
        color: '#6B7280',
    },
    messageFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 2,
    },
    timeText: {
        fontSize: 10,
        color: '#9CA3AF',
    },
    reactionsContainer: {
        position: 'absolute',
        bottom: -15,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        zIndex: 5,
    },
    myReactions: {
        right: 0,
    },
    otherReactions: {
        left: 0,
    },
    reactionEmoji: {
        fontSize: 12,
        marginRight: 2,
    },
    reactionCount: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '700',
        marginLeft: 2,
    },
    inputWrapper: {
        paddingHorizontal: 10,
        paddingTop: 10,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        width: '100%',
    },
    attachMenu: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    attachOption: {
        alignItems: 'center',
        width: 60,
    },
    attachLabel: {
        fontSize: 10,
        color: '#FFF',
        marginTop: 5,
        fontWeight: '600',
    },
    emojiPicker: {
        backgroundColor: '#F9FAFB',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    emojiButton: {
        padding: 8,
        marginRight: 5,
    },
    emojiText: {
        fontSize: 28,
    },
    inputReplyBar: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
    },
    replyBarIndicator: {
        width: 4,
        height: '100%',
        backgroundColor: '#0A66C2',
        borderRadius: 2,
        marginRight: 10,
    },
    replyBarUser: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0A66C2',
    },
    replyBarText: {
        fontSize: 12,
        color: '#6B7280',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    attachButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputFieldContainer: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        marginHorizontal: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 40,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 80,
        color: '#1F2937',
        ...Platform.select({
            web: { outlineWidth: 0 }
        }),
    },
    inputActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    quickActionBtn: {
        padding: 6,
        marginLeft: 4,
    },
    quickActionActive: {
        backgroundColor: '#EBF5FF',
        borderRadius: 12,
    },
    etaText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateSeparatorContainer: {
        alignItems: 'center',
        marginVertical: 15,
    },
    dateBadge: {
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    micButton: {
        padding: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    optionsPopup: {
        width: width * 0.8,
        backgroundColor: '#FFF',
        borderRadius: 20,
        overflow: 'hidden',
    },
    reactionBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 15,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    reactionBtn: {
        padding: 5,
    },
    reactionText: {
        fontSize: 24,
    },
    menuList: {
        paddingVertical: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    menuText: {
        fontSize: 16,
        color: '#374151',
        marginLeft: 15,
        fontWeight: '500',
    },
    dangerItem: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    profileCard: {
        width: width * 0.85,
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    largeAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 15,
        borderWidth: 4,
        borderColor: '#EBF5FF',
    },
    profileName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
    },
    profileEmail: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 5,
    },
    profileActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 30,
    },
    actionBtn: {
        alignItems: 'center',
    },
    actionText: {
        fontSize: 12,
        color: '#0A66C2',
        fontWeight: '600',
        marginTop: 5,
    },
    closeProfileBtn: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    closeProfileText: {
        color: '#4B5563',
        fontWeight: '700',
    },
    deleteConfirmCard: {
        backgroundColor: '#FFF',
        width: width * 0.85,
        borderRadius: 25,
        padding: 25,
        alignItems: 'center',
    },
    deleteIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    deleteConfirmTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 10,
    },
    deleteConfirmText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 25,
    },
    deleteConfirmActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 12,
        borderRadius: 15,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        color: '#4B5563',
        fontWeight: '700',
    },
    confirmDeleteBtn: {
        paddingVertical: 12,
        borderRadius: 15,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmDeleteBtnText: {
        color: '#FFF',
        fontWeight: '700',
    },
    forwardedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    forwardedText: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#6B7280',
        marginLeft: 3,
    },
    forwardCard: {
        width: width * 0.9,
        maxHeight: '70%',
        backgroundColor: '#FFF',
        borderRadius: 25,
        paddingVertical: 20,
    },
    forwardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 15,
    },
    forwardMemberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    forwardAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15,
    },
    forwardName: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '600',
    },
    closeForwardBtn: {
        marginTop: 10,
        alignItems: 'center',
        padding: 10,
    },
    closeForwardText: {
        color: '#EF4444',
        fontWeight: '700',
    },
    replyHint: {
        position: 'absolute',
        top: '50%',
        marginTop: -12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    otherReplyHint: {
        left: -35,
    },
    myReplyHint: {
        right: -35,
    },
    aiProcessingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 5,
    },
    aiThumbnail: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    aiProcessingText: {
        fontSize: 13,
        color: '#7C3AED',
        fontStyle: 'italic',
        fontWeight: '600',
    },
    typingContainer: {
        paddingHorizontal: 40,
        paddingVertical: 5,
        marginBottom: 10,
    },
    typingText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    selectedBubble: {
        backgroundColor: '#D1E5FF',
        borderColor: '#0A66C2',
        borderWidth: 1,
    },
    selectionOverlay: {
        position: 'absolute',
        top: -10,
        right: -10,
        zIndex: 10,
        backgroundColor: '#FFF',
        borderRadius: 12,
    },
    selectionCount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
});

export default ChatScreen;
