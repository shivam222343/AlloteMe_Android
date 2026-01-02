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
    Alert,
    Dimensions,
    Vibration,
    Animated,
    ScrollView,
    Keyboard,
    LayoutAnimation
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { groupChatAPI, messagesAPI } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Animatable from 'react-native-animatable';

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

const MessageItem = React.memo(({
    item,
    index,
    user,
    messages,
    setReplyingTo,
    setShowOptionsId,
    isSelected,
    isSelectionMode,
    toggleSelection
}) => {
    if (!item) return null;
    if (item.type === 'date_separator') {
        return <DateSeparator date={item.date} />;
    }

    const isAI = item.senderId === 'AI' || item.senderId?._id === 'AI' || item.senderId === '000000000000000000000000' || item.senderId?._id === '000000000000000000000000' || item.isAI;
    const isMine = !isAI && (item.senderId?._id === user._id || item.senderId === user._id);
    const prevMessage = messages[index - 1];
    const isFirstFromUser = !prevMessage || prevMessage.type === 'date_separator' || (prevMessage.senderId?._id || prevMessage.senderId) !== (item.senderId?._id || item.senderId);

    // In group chat, show avatar only for first message in a sequence from others
    const showAvatar = !isMine && !isAI && isFirstFromUser;

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

    const handlePress = () => {
        if (isSelectionMode) {
            toggleSelection(item._id);
        } else {
            // WhatsApp style: click to show options if not deleted
            setShowOptionsId(item._id);
        }
    };

    const handleLongPress = () => {
        Vibration.vibrate(50);
        toggleSelection(item._id);
    };

    return (
        <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetX={isMine ? [-50, 0] : [0, 50]}
            failOffsetY={[-5, 5]}
            enabled={!isSelectionMode && !item.deleted}
        >
            <Animated.View style={[
                styles.messageRow,
                isMine ? styles.myRow : styles.otherRow,
                isSelected && styles.selectedRow,
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
                {!isMine && (
                    <View style={styles.avatarSpace}>
                        {showAvatar && (
                            <Image
                                source={{ uri: item.senderId?.profilePicture?.url || `https://ui-avatars.com/api/?name=${item.senderId?.displayName}` }}
                                style={styles.miniAvatar}
                            />
                        )}
                    </View>
                )}

                <View style={{ position: 'relative' }}>
                    {!isSelectionMode && !item.deleted && (
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
                    )}

                    <TouchableOpacity
                        onPress={handlePress}
                        onLongPress={handleLongPress}
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
                            {/* Selection Checkmark */}
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

                            {/* Sender Name for group chat */}
                            {!isMine && !isAI && isFirstFromUser && (
                                <Text style={styles.senderName} numberOfLines={1}>
                                    {item.senderId?.displayName}
                                </Text>
                            )}

                            {/* Forwarded Badge */}
                            {(item.forwarded || item.isForwarded) && (
                                <View style={styles.forwardedBadge}>
                                    <Ionicons name="arrow-redo" size={10} color="#6B7280" />
                                    <Text style={styles.forwardedText}>Forwarded</Text>
                                </View>
                            )}

                            {/* Reply Preview */}
                            {item.replyTo && (
                                <View style={styles.replyPreview}>
                                    <Text style={styles.replyUser}>
                                        {item.replyTo.senderId?._id === user._id || item.replyTo.senderId === user._id ? 'You' : (item.replyTo.senderId?.displayName || 'Member')}
                                    </Text>
                                    <Text style={styles.replyContent} numberOfLines={1}>
                                        {item.replyTo.content}
                                    </Text>
                                </View>
                            )}

                            {/* Attachment */}
                            {item.fileUrl && !item.deleted && (
                                <Image
                                    source={{ uri: item.fileUrl }}
                                    style={styles.messageImage}
                                    resizeMode="cover"
                                />
                            )}

                            {/* Content */}
                            <Text style={[
                                styles.messageText,
                                isMine ? styles.myText : styles.otherText,
                                item.deleted && styles.deletedText
                            ]}>
                                {item.content}
                            </Text>

                            {/* Footer (Time + Status) */}
                            <View style={styles.messageFooter}>
                                <Text style={styles.timeText}>
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {isMine && !item.deleted && (
                                    <Ionicons
                                        name={item.readBy?.length > 0 ? "checkmark-done" : "checkmark"}
                                        size={14}
                                        color={item.readBy?.length > 0 ? "#34B7F1" : "#9CA3AF"}
                                        style={{ marginLeft: 4 }}
                                    />
                                )}
                            </View>

                            {/* Reactions Display */}
                            {item.reactions && item.reactions.length > 0 && (
                                <View style={[styles.reactionsContainer, isMine ? styles.myReactions : styles.otherReactions]}>
                                    {item.reactions.slice(0, 3).map((r, i) => (
                                        <Text key={i} style={styles.reactionEmoji}>{r.emoji}</Text>
                                    ))}
                                    {item.reactions.length > 3 && <Text style={styles.reactionCount}>+{item.reactions.length - 3}</Text>}
                                    {item.reactions.length <= 3 && item.reactions.length > 0 && (
                                        <Text style={styles.reactionCount}>{item.reactions.length}</Text>
                                    )}
                                </View>
                            )}
                        </Animatable.View>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </PanGestureHandler>
    );
});

const GroupChatScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { clubId, clubName } = route.params;
    const { user, socket, refreshUnreadMessageCount } = useAuth();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [groupInfo, setGroupInfo] = useState(null);
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [updatingSettings, setUpdatingSettings] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showOptionsId, setShowOptionsId] = useState(null);
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [showMenu, setShowMenu] = useState(false);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [deleteType, setDeleteType] = useState('me');
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);
    const [otherConversations, setOtherConversations] = useState([]);
    const [forwardLoading, setForwardLoading] = useState(false);
    const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchModal, setShowSearchModal] = useState(false);

    const flatListRef = useRef();
    const typingTimeoutRef = useRef();
    const inputRef = useRef();

    const isSelectionMode = selectedMessages.length > 0;

    // Format messages with date separators
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

    useEffect(() => {
        fetchGroupChat();
        fetchOtherConversations();

        if (socket) {
            socket.emit('group:join', clubId);
            socket.on('group:message', handleNewMessage);
            socket.on('group:typing', handleTyping);
            socket.on('group:message:delete', handleMessageDelete);
            socket.on('group:message:reaction', handleReactionSync);
            socket.on('group:settings_update', handleSettingsUpdate);

            return () => {
                socket.emit('group:leave', clubId);
                socket.off('group:message', handleNewMessage);
                socket.off('group:typing', handleTyping);
                socket.off('group:message:delete', handleMessageDelete);
                socket.off('group:message:reaction', handleReactionSync);
                socket.off('group:settings_update', handleSettingsUpdate);
            };
        }
    }, [clubId]);

    const fetchGroupChat = async () => {
        try {
            const res = await groupChatAPI.getGroupChat(clubId);
            if (res.success) {
                setMessages(res.data.messages || []);
                setGroupInfo(res.data);
                setNewGroupName(res.data.name);
                // Mark initial load as read
                await groupChatAPI.markAsRead(clubId);
                refreshUnreadMessageCount();
            }
        } catch (error) {
            console.error('Error fetching group chat:', error);
            Alert.alert('Error', 'Failed to load group chat');
        } finally {
            setLoading(false);
        }
    };

    const fetchOtherConversations = async () => {
        try {
            const res = await messagesAPI.getConversations();
            if (res.success) {
                setOtherConversations(res.data);
            }
        } catch (error) {
            console.log('Error fetching other conversations');
        }
    };

    const handleNewMessage = (data) => {
        if (data.clubId === clubId) {
            setMessages(prev => {
                if (prev.some(m => m._id === data.message._id)) return prev;
                return [...prev, data.message];
            });

            // Mark as read immediately if active
            groupChatAPI.markAsRead(clubId).then(() => refreshUnreadMessageCount());

            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const handleTyping = (data) => {
        if (data.clubId === clubId && data.userId !== user._id) {
            if (data.isTyping) {
                setTypingUsers(prev => {
                    if (!prev.includes(data.userName)) return [...prev, data.userName];
                    return prev;
                });
            } else {
                setTypingUsers(prev => prev.filter(name => name !== data.userName));
            }
        }
    };

    const handleMessageDelete = (data) => {
        if (data.clubId === clubId) {
            setMessages(prev => prev.map(msg =>
                msg._id === data.messageId
                    ? { ...msg, deleted: true, content: 'This message was deleted', fileUrl: null }
                    : msg
            ));
        }
    };

    const handleReactionSync = (data) => {
        if (data.clubId === clubId) {
            setMessages(prev => prev.map(msg =>
                msg._id === data.messageId
                    ? { ...msg, reactions: data.reactions }
                    : msg
            ));
        }
    };

    const handleSettingsUpdate = (data) => {
        if (data.clubId.toString() === clubId.toString()) {
            setGroupInfo(prev => ({ ...prev, ...data }));
            setNewGroupName(data.name);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const tempText = inputText;
        const tempReply = replyingTo;

        setInputText('');
        setReplyingTo(null);
        setSending(true);

        try {
            const formData = new FormData();
            formData.append('content', tempText);
            formData.append('type', 'text');
            if (tempReply) formData.append('replyTo', tempReply._id);

            const res = await groupChatAPI.sendMessage(clubId, formData);
            if (res.success) {
                setMessages(prev => [...prev, res.data]);
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message');
            setInputText(tempText);
            setReplyingTo(tempReply);
        } finally {
            setSending(false);
        }
    };

    const handleInputChange = (text) => {
        setInputText(text);

        if (socket) {
            socket.emit('group:typing', {
                clubId,
                isTyping: text.length > 0,
                userName: user.displayName
            });

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('group:typing', {
                    clubId,
                    isTyping: false,
                    userName: user.displayName
                });
            }, 2000);
        }
    };

    const toggleSelection = useCallback((id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedMessages(prev => {
            if (prev.includes(id)) {
                return prev.filter(mId => mId !== id);
            } else {
                return [...prev, id];
            }
        });
    }, []);

    const toggleReaction = async (messageId, emoji) => {
        try {
            const res = await groupChatAPI.addReaction(clubId, messageId, emoji);
            if (res.success) {
                setMessages(prev => prev.map(m =>
                    m._id === messageId ? { ...m, reactions: res.data } : m
                ));
            }
        } catch (error) {
            console.error('Error reacting:', error);
        } finally {
            setShowOptionsId(null);
        }
    };

    const uploadMedia = async (uri, type) => {
        setSending(true);
        setUploadProgress(10);

        try {
            const formData = new FormData();
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const fileExt = match ? match[1] : 'jpg';

            formData.append('file', {
                uri,
                type: type === 'image' ? `image/${fileExt}` : `application/${fileExt}`,
                name: filename
            });
            formData.append('type', type);
            formData.append('content', type === 'image' ? '📷 Photo' : '📎 File');

            const res = await groupChatAPI.sendMessage(clubId, formData, (progress) => {
                setUploadProgress(progress);
            });

            if (res.success) {
                setMessages(prev => [...prev, res.data]);
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        } catch (error) {
            console.error('Error uploading media:', error);
            Alert.alert('Error', 'Failed to upload file.');
        } finally {
            setSending(false);
            setUploadProgress(0);
        }
    };

    const clearChat = () => {
        Alert.alert(
            'Clear Chat',
            'Are you sure you want to clear all messages in this group? This action only affects your view.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        setMessages([]); // Local clear for Now
                        setShowMenu(false);
                    }
                }
            ]
        );
    };

    const searchMessages = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const results = messages.filter(msg =>
            msg.content && msg.content.toLowerCase().includes(query.toLowerCase()) && !msg.deleted
        );
        setSearchResults(results);
    };

    const scrollToMessage = (messageId) => {
        const index = formattedMessages.findIndex(m => m._id === messageId);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
            setShowSearchModal(false);
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    const reportGroup = () => {
        Alert.alert(
            'Report Group',
            'Are you sure you want to report this group for violating community guidelines?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Report',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Reported', 'Thank you for your report. We will review this group.');
                        setShowMenu(false);
                    }
                }
            ]
        );
    };

    const handleConfirmDelete = async () => {
        const idsToDelete = isSelectionMode ? selectedMessages : [showOptionsId];
        if (idsToDelete.length === 0) return;

        try {
            for (const id of idsToDelete) {
                const msg = messages.find(m => m._id === id);
                const isMsgMine = msg && (msg.senderId?._id === user._id || msg.senderId === user._id);

                if (deleteType === 'everyone' && isMsgMine) {
                    await groupChatAPI.deleteMessage(clubId, id);
                } else {
                    // Logic for delete for me (local state filtering)
                    setMessages(prev => prev.filter(m => m._id !== id));
                }
            }

            if (deleteType === 'everyone') {
                // Sockets will handle the sync
            }

            setSelectedMessages([]);
            setShowOptionsId(null);
            setDeleteConfirmModalVisible(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to delete some messages');
        }
    };

    const handleForward = async (targetId, isTargetGroup = false) => {
        if (!messageToForward) return;
        setForwardLoading(true);

        try {
            const formData = new FormData();
            formData.append('content', messageToForward.content);
            formData.append('type', messageToForward.type || 'text');
            formData.append('isForwarded', 'true');
            if (messageToForward.fileUrl) formData.append('fileUrl', messageToForward.fileUrl);

            let res;
            if (isTargetGroup) {
                res = await groupChatAPI.sendMessage(targetId, formData);
            } else {
                // Forward to individual chat
                const forwardData = {
                    receiverId: targetId,
                    content: messageToForward.content,
                    type: messageToForward.type || 'text',
                    isForwarded: true
                };
                if (messageToForward.fileUrl) forwardData.fileUrl = messageToForward.fileUrl;
                res = await messagesAPI.send(forwardData);
            }

            if (res.success) {
                Alert.alert('Success', 'Message forwarded');
                setShowForwardModal(false);
                setMessageToForward(null);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to forward message');
        } finally {
            setForwardLoading(false);
        }
    };

    const handleUpdateSettings = async (imageUri = null) => {
        setUpdatingSettings(true);
        try {
            const formData = new FormData();
            if (newGroupName) formData.append('name', newGroupName);

            if (imageUri) {
                const filename = imageUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const fileType = match ? `image/${match[1]}` : `image`;
                formData.append('file', {
                    uri: imageUri,
                    type: fileType,
                    name: filename
                });
            }

            const res = await groupChatAPI.updateSettings(clubId, formData);
            if (res.success) {
                setGroupInfo(prev => ({ ...prev, ...res.data }));
                setIsSettingsModalVisible(false);
                Alert.alert('Success', 'Group settings updated');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            Alert.alert('Error', 'Failed to update group settings');
        } finally {
            setUpdatingSettings(false);
        }
    };

    const renderMessage = useCallback(({ item, index }) => (
        <MessageItem
            item={item}
            index={index}
            user={user}
            messages={formattedMessages}
            setReplyingTo={setReplyingTo}
            setShowOptionsId={setShowOptionsId}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages.includes(item?._id)}
            toggleSelection={toggleSelection}
        />
    ), [user._id, formattedMessages.length, selectedMessages, isSelectionMode, toggleSelection]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: '#FFF' }}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    {isSelectionMode ? (
                        <Animatable.View animation="fadeIn" style={styles.selectionHeader}>
                            <TouchableOpacity onPress={() => setSelectedMessages([])} style={styles.backButton}>
                                <Ionicons name="close" size={28} color="#0A66C2" />
                            </TouchableOpacity>
                            <Text style={styles.selectionCount}>{selectedMessages.length}</Text>
                            <View style={styles.headerActions}>
                                <TouchableOpacity
                                    style={styles.headerActionBtn}
                                    onPress={() => {
                                        setDeleteType('me');
                                        setDeleteConfirmModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={24} color="#0A66C2" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.headerActionBtn}
                                    onPress={() => {
                                        if (selectedMessages.length === 1) {
                                            const msg = messages.find(m => m._id === selectedMessages[0]);
                                            if (msg) {
                                                setMessageToForward(msg);
                                                setShowForwardModal(true);
                                            }
                                        } else {
                                            Alert.alert('Forward', 'Multiple message forward coming soon');
                                        }
                                    }}
                                >
                                    <Ionicons name="arrow-redo-outline" size={24} color="#0A66C2" />
                                </TouchableOpacity>
                            </View>
                        </Animatable.View>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={28} color="#0A66C2" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerInfo}
                                onPress={() => setShowMenu(true)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={{ uri: groupInfo?.groupIcon?.url || `https://ui-avatars.com/api/?name=${groupInfo?.name || clubName}` }}
                                    style={styles.headerAvatar}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.headerName} numberOfLines={1}>{groupInfo?.name || clubName}</Text>
                                    <Text style={styles.headerStatus}>
                                        {typingUsers.length > 0 ? (
                                            <Text style={{ color: '#0A66C2', fontWeight: '600' }}>
                                                {typingUsers.join(', ')} typing...
                                            </Text>
                                        ) : `${groupInfo?.members?.length || 0} members`}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <View style={styles.headerActions}>
                                <TouchableOpacity style={styles.headerActionBtn} onPress={() => Alert.alert('Call', 'Group calls coming soon')}>
                                    <Ionicons name="call-outline" size={22} color="#0A66C2" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowMenu(true)}>
                                    <Ionicons name="ellipsis-vertical" size={24} color="#0A66C2" />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={{ flex: 1, backgroundColor: '#E5DDD5' }}>
                        {/* Chat Background Image Overlay */}
                        <View
                            style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E5DDD5', opacity: 0.4, zIndex: -1 }]}
                            pointerEvents="none"
                        />

                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#0A66C2" />
                            </View>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={formattedMessages}
                                renderItem={renderMessage}
                                keyExtractor={item => item._id}
                                style={{ flex: 1 }}
                                contentContainerStyle={[styles.messageList, { paddingBottom: insets.bottom + 20 }]}
                                onContentSizeChange={() => !isSelectionMode && flatListRef.current?.scrollToEnd({ animated: true })}
                                onLayout={() => !isSelectionMode && flatListRef.current?.scrollToEnd({ animated: true })}
                            />
                        )}

                        {/* Input Area */}
                        {!isSelectionMode && (
                            <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                                {replyingTo && (
                                    <Animatable.View animation="slideInUp" duration={200} style={styles.inputReplyBar}>
                                        <View style={styles.replyBarIndicator} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.replyBarUser}>
                                                Replying to {replyingTo.senderId?._id === user._id ? 'yourself' : replyingTo.senderId?.displayName}
                                            </Text>
                                            <Text style={styles.replyBarText} numberOfLines={1}>{replyingTo.content}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                            <Ionicons name="close-circle" size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    </Animatable.View>
                                )}

                                {uploadProgress > 0 && (
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                                    </View>
                                )}

                                <View style={styles.inputContainer}>
                                    <TouchableOpacity
                                        style={styles.iconBtn}
                                        onPress={() => setShowAttachMenu(!showAttachMenu)}
                                    >
                                        <Ionicons name="add" size={28} color="#0A66C2" />
                                    </TouchableOpacity>

                                    <TextInput
                                        ref={inputRef}
                                        style={styles.input}
                                        placeholder="Message"
                                        placeholderTextColor="#9CA3AF"
                                        value={inputText}
                                        onChangeText={handleInputChange}
                                        multiline
                                        onFocus={() => {
                                            setShowEmojiPicker(false);
                                            setShowAttachMenu(false);
                                        }}
                                    />

                                    {inputText.length > 0 ? (
                                        <TouchableOpacity
                                            style={styles.sendButton}
                                            onPress={sendMessage}
                                            disabled={sending}
                                        >
                                            {sending ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Ionicons name="send" size={20} color="#FFF" />
                                            )}
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Voice', 'Voice features coming soon')}>
                                            <Ionicons name="camera-outline" size={26} color="#0A66C2" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {showAttachMenu && (
                                    <Animatable.View animation="slideInUp" duration={250} style={styles.attachMenu}>
                                        <TouchableOpacity style={styles.attachOption} onPress={() => { DocumentPicker.getDocumentAsync().then(res => { if (!res.canceled) uploadMedia(res.assets[0].uri, 'file'); }); setShowAttachMenu(false); }}>
                                            <View style={[styles.attachIcon, { backgroundColor: '#7F66FF' }]}>
                                                <Ionicons name="document" size={24} color="#FFF" />
                                            </View>
                                            <Text style={styles.attachLabel}>Document</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.attachOption} onPress={() => { ImagePicker.launchCameraAsync().then(res => { if (!res.canceled) uploadMedia(res.assets[0].uri, 'image'); }); setShowAttachMenu(false); }}>
                                            <View style={[styles.attachIcon, { backgroundColor: '#FF4B2B' }]}>
                                                <Ionicons name="camera" size={24} color="#FFF" />
                                            </View>
                                            <Text style={styles.attachLabel}>Camera</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.attachOption} onPress={() => { ImagePicker.launchImageLibraryAsync().then(res => { if (!res.canceled) uploadMedia(res.assets[0].uri, 'image'); }); setShowAttachMenu(false); }}>
                                            <View style={[styles.attachIcon, { backgroundColor: '#D3396D' }]}>
                                                <Ionicons name="image" size={24} color="#FFF" />
                                            </View>
                                            <Text style={styles.attachLabel}>Gallery</Text>
                                        </TouchableOpacity>
                                    </Animatable.View>
                                )}
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>

                {/* Message Options Modal */}
                <Modal
                    visible={!!showOptionsId}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowOptionsId(null)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowOptionsId(null)}
                    >
                        <Animatable.View animation="zoomIn" duration={200} style={styles.optionsContent}>
                            <View style={styles.reactionPicker}>
                                {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                                    <TouchableOpacity key={emoji} onPress={() => toggleReaction(showOptionsId, emoji)} style={styles.reactionBtn}>
                                        <Text style={styles.reactionEmojiText}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.optionsList}>
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => {
                                        const msg = messages.find(m => m._id === showOptionsId);
                                        setReplyingTo(msg);
                                        setShowOptionsId(null);
                                    }}
                                >
                                    <Ionicons name="arrow-undo-outline" size={22} color="#1F2937" />
                                    <Text style={styles.optionText}>Reply</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={async () => {
                                        const msg = messages.find(m => m._id === showOptionsId);
                                        await Clipboard.setStringAsync(msg.content);
                                        setShowOptionsId(null);
                                        toast('Copied to clipboard');
                                    }}
                                >
                                    <Ionicons name="copy-outline" size={22} color="#1F2937" />
                                    <Text style={styles.optionText}>Copy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => {
                                        const msg = messages.find(m => m._id === showOptionsId);
                                        setMessageToForward(msg);
                                        setShowForwardModal(true);
                                        setShowOptionsId(null);
                                    }}
                                >
                                    <Ionicons name="arrow-redo-outline" size={22} color="#1F2937" />
                                    <Text style={styles.optionText}>Forward</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => {
                                        toggleSelection(showOptionsId);
                                        setShowOptionsId(null);
                                    }}
                                >
                                    <Ionicons name="checkbox-outline" size={22} color="#1F2937" />
                                    <Text style={styles.optionText}>Select</Text>
                                </TouchableOpacity>

                                <View style={styles.optionDivider} />

                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => {
                                        setDeleteType('me');
                                        setDeleteConfirmModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                                    <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete for me</Text>
                                </TouchableOpacity>

                                {messages.find(m => m._id === showOptionsId)?.senderId?._id === user._id && (
                                    <TouchableOpacity
                                        style={styles.optionItem}
                                        onPress={() => {
                                            setDeleteType('everyone');
                                            setDeleteConfirmModalVisible(true);
                                        }}
                                    >
                                        <Ionicons name="trash-bin-outline" size={22} color="#EF4444" />
                                        <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete for everyone</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Animatable.View>
                    </TouchableOpacity>
                </Modal>

                {/* Top Right Actions Menu */}
                <Modal
                    visible={showMenu}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowMenu(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowMenu(false)}
                    >
                        <Animatable.View animation="fadeInRight" duration={200} style={[styles.topMenuContent, { top: insets.top + 50 }]}>
                            <TouchableOpacity style={styles.menuListItem} onPress={() => { setShowMenu(false); setIsSettingsModalVisible(true); }}>
                                <Ionicons name="settings-outline" size={20} color="#1F2937" />
                                <Text style={styles.menuListText}>Group Settings</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuListItem} onPress={() => { setShowMenu(false); setShowGroupInfoModal(true); }}>
                                <Ionicons name="people-outline" size={20} color="#1F2937" />
                                <Text style={styles.menuListText}>Group Information</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuListItem} onPress={() => { setShowMenu(false); setShowSearchModal(true); }}>
                                <Ionicons name="search-outline" size={20} color="#1F2937" />
                                <Text style={styles.menuListText}>Search Chat</Text>
                            </TouchableOpacity>
                            <View style={styles.optionDivider} />
                            <TouchableOpacity style={styles.menuListItem} onPress={clearChat}>
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                <Text style={[styles.menuListText, { color: '#EF4444' }]}>Clear Chat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuListItem} onPress={reportGroup}>
                                <Ionicons name="flag-outline" size={20} color="#EF4444" />
                                <Text style={[styles.menuListText, { color: '#EF4444' }]}>Report Group</Text>
                            </TouchableOpacity>
                        </Animatable.View>
                    </TouchableOpacity>
                </Modal>

                {/* Forward Modal */}
                <Modal
                    visible={showForwardModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowForwardModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Animatable.View animation="slideInUp" style={styles.forwardModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Forward Message To</Text>
                                <TouchableOpacity onPress={() => setShowForwardModal(false)}>
                                    <Ionicons name="close" size={28} color="#1F2937" />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={otherConversations}
                                keyExtractor={(item, index) => item.otherUser?._id || `conv-${index}`}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.forwardItem}
                                        onPress={() => handleForward(item.otherUser?._id)}
                                        disabled={forwardLoading}
                                    >
                                        <Image
                                            source={{ uri: item.otherUser?.profilePicture?.url || `https://ui-avatars.com/api/?name=${item.otherUser?.displayName}` }}
                                            style={styles.forwardAvatar}
                                        />
                                        <Text style={styles.forwardName}>{item.otherUser?.displayName}</Text>
                                        {forwardLoading ? <ActivityIndicator size="small" color="#0A66C2" /> : <Ionicons name="send" size={20} color="#0A66C2" />}
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <Text style={styles.emptyText}>No other conversations found</Text>
                                )}
                            />
                        </Animatable.View>
                    </View>
                </Modal>

                {/* Delete Confirmation */}
                <Modal
                    visible={deleteConfirmModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setDeleteConfirmModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Animatable.View animation="zoomIn" style={styles.confirmBox}>
                            <View style={styles.deleteIconContainer}>
                                <Ionicons name="trash" size={36} color="#EF4444" />
                            </View>
                            <Text style={styles.confirmTitle}>Delete Message?</Text>
                            <Text style={styles.confirmText}>
                                {deleteType === 'everyone'
                                    ? 'Are you sure you want to delete this message for everyone in the group?'
                                    : `Are you sure you want to delete ${isSelectionMode ? selectedMessages.length : 'this'} message(s)? This will only remove them from your view.`}
                            </Text>
                            <View style={styles.confirmActions}>
                                <TouchableOpacity style={styles.cancelAction} onPress={() => setDeleteConfirmModalVisible(false)}>
                                    <Text style={styles.cancelActionText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteAction} onPress={handleConfirmDelete}>
                                    <Text style={styles.deleteActionText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </Animatable.View>
                    </View>
                </Modal>

                {/* Settings Modal (Group Profile) */}
                <Modal
                    visible={isSettingsModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsSettingsModalVisible(false)}
                >
                    <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                        <View style={styles.settingsModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Group Settings</Text>
                                <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)}>
                                    <Ionicons name="close" size={28} color="#1F2937" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.settingsSection}>
                                    <TouchableOpacity style={styles.iconContainer} onPress={() => {
                                        ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1] }).then(res => {
                                            if (!res.canceled) handleUpdateSettings(res.assets[0].uri);
                                        });
                                    }}>
                                        {groupInfo?.groupIcon?.url ? (
                                            <Image source={{ uri: groupInfo.groupIcon.url }} style={styles.groupIconLarge} />
                                        ) : (
                                            <View style={styles.iconPlaceholder}>
                                                <Ionicons name="camera" size={40} color="#9CA3AF" />
                                            </View>
                                        )}
                                        <View style={styles.editIconBadge}>
                                            <Ionicons name="pencil" size={16} color="#FFF" />
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={styles.settingsLabel}>Tap to change icon</Text>
                                </View>

                                <View style={styles.inputFieldContainer}>
                                    <Text style={styles.fieldLabel}>Group Name</Text>
                                    <TextInput
                                        style={styles.settingsInput}
                                        value={newGroupName}
                                        onChangeText={setNewGroupName}
                                        placeholder="Enter group name"
                                    />
                                </View>

                                <View style={[styles.inputFieldContainer, { marginTop: 20 }]}>
                                    <Text style={styles.fieldLabel}>Group ID: {clubId}</Text>
                                    <Text style={styles.fieldDescription}>Only club administrators can change the name and icon.</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveButton, updatingSettings && styles.saveButtonDisabled]}
                                    onPress={() => handleUpdateSettings()}
                                    disabled={updatingSettings}
                                >
                                    {updatingSettings ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Update Settings</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Group Information Modal */}
                <Modal visible={showGroupInfoModal} animationType="slide" transparent={true} onRequestClose={() => setShowGroupInfoModal(false)}>
                    <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                        <View style={styles.settingsModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Group Information</Text>
                                <TouchableOpacity onPress={() => setShowGroupInfoModal(false)}>
                                    <Ionicons name="close" size={28} color="#1F2937" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.settingsSection}>
                                    {groupInfo?.groupIcon?.url ? (
                                        <Image source={{ uri: groupInfo.groupIcon.url }} style={styles.groupIconLarge} />
                                    ) : (
                                        <View style={styles.iconPlaceholder}>
                                            <Ionicons name="people" size={40} color="#9CA3AF" />
                                        </View>
                                    )}
                                    <Text style={[styles.modalTitle, { marginTop: 15 }]}>{groupInfo?.name || clubName}</Text>
                                    <Text style={styles.settingsLabel}>Group · {groupInfo?.members?.length || 0} members</Text>
                                </View>
                                <View style={styles.inputFieldContainer}>
                                    <Text style={styles.fieldLabel}>Members</Text>
                                    {groupInfo?.members?.map((member, index) => (
                                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                            <Image source={{ uri: member.userId?.profilePicture?.url || `https://ui-avatars.com/api/?name=${member.userId?.displayName}` }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>{member.userId?.displayName}{member.userId?._id === user._id && ' (You)'}</Text>
                                                <Text style={{ fontSize: 12, color: '#6B7280' }}>{member.role === 'admin' ? '👑 Admin' : 'Member'}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Search Messages Modal */}
                <Modal visible={showSearchModal} animationType="slide" transparent={true} onRequestClose={() => setShowSearchModal(false)}>
                    <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                        <View style={styles.settingsModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Search Messages</Text>
                                <TouchableOpacity onPress={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]); }}>
                                    <Ionicons name="close" size={28} color="#1F2937" />
                                </TouchableOpacity>
                            </View>
                            <View style={{ paddingHorizontal: 5, marginBottom: 15 }}>
                                <View style={[styles.input, { marginHorizontal: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }]}>
                                    <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                    <TextInput style={{ flex: 1, fontSize: 16, color: '#1F2937' }} placeholder="Search in messages..." placeholderTextColor="#9CA3AF" value={searchQuery} onChangeText={searchMessages} autoFocus />
                                </View>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {searchResults.length > 0 ? (
                                    searchResults.map((msg, index) => (
                                        <TouchableOpacity key={index} style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={() => scrollToMessage(msg._id)}>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0A66C2', marginBottom: 4 }}>{msg.senderId?.displayName || 'Unknown'}</Text>
                                            <Text style={{ fontSize: 14, color: '#1F2937' }} numberOfLines={2}>{msg.content}</Text>
                                            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{new Date(msg.createdAt).toLocaleString()}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : searchQuery.trim() ? (
                                    <View style={{ padding: 40, alignItems: 'center' }}>
                                        <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                                        <Text style={{ fontSize: 16, color: '#9CA3AF', marginTop: 16 }}>No messages found</Text>
                                    </View>
                                ) : (
                                    <View style={{ padding: 40, alignItems: 'center' }}>
                                        <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                                        <Text style={{ fontSize: 16, color: '#9CA3AF', marginTop: 16 }}>Type to search messages</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </GestureHandlerRootView>
    );
};

// Toast helper
const toast = (msg) => Alert.alert('', msg, [], { cancelable: true });

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        zIndex: 10,
    },
    selectionHeader: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: { padding: 8 },
    headerInfo: {
        flex: 1,
        marginLeft: 8,
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        paddingVertical: 5
    },
    headerAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 10 },
    headerName: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
    headerStatus: { fontSize: 12, color: '#6B7280', marginTop: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerActionBtn: { padding: 10 },
    selectionCount: { fontSize: 20, fontWeight: '700', color: '#0A66C2', marginLeft: 15, flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    messageList: { paddingHorizontal: 10, paddingTop: 10 },
    messageRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
    myRow: { justifyContent: 'flex-end' },
    otherRow: { justifyContent: 'flex-start' },
    selectedRow: { backgroundColor: 'rgba(10, 102, 194, 0.1)' },
    avatarSpace: { width: 35, marginRight: 5, justifyContent: 'flex-end' },
    miniAvatar: { width: 30, height: 30, borderRadius: 15 },
    bubble: {
        maxWidth: width * 0.75,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        position: 'relative',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 1
    },
    myBubble: { backgroundColor: '#EBF5FF', borderTopRightRadius: 2 },
    otherBubble: { backgroundColor: '#FFF', borderTopLeftRadius: 2 },
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
    deletedBubble: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    selectedBubble: { borderLeftWidth: 4, borderLeftColor: '#0A66C2' },
    selectionOverlay: { position: 'absolute', top: 5, right: 5, zIndex: 10 },
    senderName: { fontSize: 12, fontWeight: '800', color: '#0A66C2', marginBottom: 4 },
    forwardedBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    forwardedText: { fontSize: 10, fontStyle: 'italic', color: '#6B7280', marginLeft: 3 },
    messageImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 8 },
    messageText: { fontSize: 15, lineHeight: 20, color: '#1F2937' },
    deletedText: { color: '#9CA3AF', fontStyle: 'italic' },
    messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
    timeText: { fontSize: 10, color: '#9CA3AF' },
    replyHint: { position: 'absolute', top: '30%' },
    myReplyHint: { left: -40 },
    otherReplyHint: { right: -40 },
    replyPreview: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderLeftWidth: 3,
        borderLeftColor: '#0A66C2',
        padding: 6,
        borderRadius: 6,
        marginBottom: 8
    },
    replyUser: { fontSize: 11, fontWeight: '800', color: '#0A66C2' },
    replyContent: { fontSize: 12, color: '#4B5563' },
    reactionsContainer: {
        position: 'absolute',
        bottom: -15,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        elevation: 3,
        shadowOpacity: 0.2,
        alignItems: 'center',
        zIndex: 5
    },
    myReactions: { right: 5 },
    otherReactions: { left: 5 },
    reactionEmoji: { fontSize: 13, marginRight: 2 },
    reactionCount: { fontSize: 10, color: '#6B7280', fontWeight: '800' },
    dateSeparatorContainer: { alignItems: 'center', marginVertical: 20 },
    dateBadge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, elevation: 1 },
    dateText: { fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
    inputWrapper: {
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingTop: 10
    },
    inputContainer: { flexDirection: 'row', alignItems: 'center' },
    iconBtn: { padding: 8 },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 120,
        fontSize: 16,
        color: '#1F2937',
        marginHorizontal: 5
    },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0A66C2', justifyContent: 'center', alignItems: 'center' },
    inputReplyBar: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#0A66C2'
    },
    replyBarIndicator: { width: 2, height: '100%', backgroundColor: '#E5E7EB', marginRight: 10 },
    replyBarUser: { fontSize: 12, fontWeight: '800', color: '#0A66C2' },
    replyBarText: { fontSize: 12, color: '#6B7280' },
    progressBar: { height: 3, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#0A66C2' },
    attachMenu: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        marginTop: 10,
        elevation: 2
    },
    attachOption: { alignItems: 'center', width: 75 },
    attachIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    attachLabel: { fontSize: 11, color: '#4B5563', fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    optionsContent: { backgroundColor: '#FFF', borderRadius: 25, width: '85%', padding: 20, shadowOpacity: 0.3, shadowRadius: 15, elevation: 15 },
    reactionPicker: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    reactionBtn: { padding: 5 },
    reactionEmojiText: { fontSize: 28 },
    optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 5 },
    optionText: { fontSize: 16, marginLeft: 15, color: '#1F2937', fontWeight: '500' },
    optionDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 5 },
    topMenuContent: { position: 'absolute', right: 20, backgroundColor: '#FFF', width: 200, borderRadius: 18, paddingVertical: 8, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    menuListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    menuListText: { fontSize: 14, color: '#1F2937', marginLeft: 12, fontWeight: '600' },
    confirmBox: { backgroundColor: '#FFF', width: '85%', borderRadius: 25, padding: 25, alignItems: 'center' },
    deleteIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    confirmTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
    confirmText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 25, lineHeight: 20 },
    confirmActions: { flexDirection: 'row', width: '100%', gap: 12 },
    cancelAction: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: '#F3F4F6' },
    cancelActionText: { color: '#4B5563', fontWeight: '700' },
    deleteAction: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 14 },
    deleteActionText: { color: '#FFF', fontWeight: '700' },
    settingsModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, width: '100%', height: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
    settingsSection: { alignItems: 'center', marginBottom: 30 },
    iconContainer: { position: 'relative' },
    groupIconLarge: { width: 110, height: 110, borderRadius: 55 },
    iconPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    editIconBadge: { position: 'absolute', right: 2, bottom: 2, backgroundColor: '#0A66C2', width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    settingsLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginTop: 10 },
    inputFieldContainer: { width: '100%', marginBottom: 15 },
    fieldLabel: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginBottom: 8 },
    fieldDescription: { fontSize: 12, color: '#9CA3AF', marginTop: 5 },
    settingsInput: { backgroundColor: '#F3F4F6', borderRadius: 14, padding: 16, fontSize: 16, color: '#1F2937', fontWeight: '500' },
    saveButton: { backgroundColor: '#0A66C2', padding: 18, borderRadius: 16, alignItems: 'center', width: '100%', marginTop: 20, marginBottom: 40 },
    saveButtonDisabled: { backgroundColor: '#9CA3AF' },
    saveButtonText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    forwardModalContent: { backgroundColor: '#FFF', width: '100%', height: '70%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, position: 'absolute', bottom: 0 },
    forwardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    forwardAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
    forwardName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1F2937' },
});

export default GroupChatScreen;
