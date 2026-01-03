import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Linking,
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { messagesAPI, groupChatAPI, snapsAPI, clubsAPI } from '../services/api';
import { prepareFile } from '../services/cloudinaryService';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

const MessageItem = React.memo(({ item, index, user, otherUser, messages, setReplyingTo, setShowOptionsId, isSelected, toggleSelection, isSelectionMode, isGroupChat, setMediaViewerData, setShowMediaViewer, setReactionDetailsData, setShowReactionDetails }) => {
    // Filter out malformed messages (e.g. error objects)
    if (!item) return null;

    const isAI = item.senderId === 'AI' || item.senderId?._id === 'AI' || item.senderId === '000000000000000000000000' || item.senderId?._id === '000000000000000000000000' || item.isAI;

    // In group chat, senderId might be an object or an ID
    const msgSenderId = item.senderId?._id || item.senderId;
    const isMine = !isAI && msgSenderId === user._id;

    const prevMessage = messages[index - 1];
    const prevSenderId = prevMessage?.senderId?._id || prevMessage?.senderId;
    const showAvatar = !isMine && !isAI && (!prevMessage || prevSenderId !== msgSenderId);
    const showSenderName = isGroupChat && !isMine && !isAI && (!prevMessage || prevSenderId !== msgSenderId);

    const replyingToMsg = item.replyTo && (typeof item.replyTo === 'object' ? item.replyTo : messages.find(m => m._id === item.replyTo));

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

    const renderMedia = () => {
        // Show if we have a URL, OR a fileName, OR type is media
        if (!item.fileUrl && !item.fileName && item.type !== 'media') return null;

        const urlStr = typeof item.fileUrl === 'string' ? item.fileUrl : (item.fileUrl?.url || '');

        // If it's media but no URL yet, show a placeholder
        if (!urlStr) {
            return (
                <View style={styles.fileContainer}>
                    <View style={[styles.fileIconContainer, { backgroundColor: '#F3F4F6' }]}>
                        <ActivityIndicator size="small" color="#0A66C2" />
                    </View>
                    <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{item.fileName || 'Uploading...'}</Text>
                        <Text style={styles.fileSubtext}>Please wait</Text>
                    </View>
                </View>
            );
        }

        // More robust detection
        const isImage = /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(urlStr) || urlStr.includes('image/upload');
        const isVideo = /\.(mp4|mov|avi|wmv|mkv|flv)$/i.test(urlStr) || urlStr.includes('video/upload');
        const isAudio = /\.(mp3|wav|ogg|m4a|aac)$/i.test(urlStr);

        if (isImage) {
            return (
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                        setMediaViewerData({ uri: urlStr, type: 'image', fileName: item.fileName || 'Image' });
                        setShowMediaViewer(true);
                    }}
                    onLongPress={() => setShowOptionsId(item._id)}
                    delayLongPress={200}
                >
                    <Image
                        source={{ uri: urlStr }}
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                </TouchableOpacity>
            );
        }

        const iconName = isVideo ? "videocam" : isAudio ? "musical-notes" : "document-text";

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={async () => {
                    try {
                        // For documents, try to open directly or show viewer
                        if (isVideo) {
                            setMediaViewerData({ uri: urlStr, type: 'video', fileName: item.fileName || 'Attachment' });
                            setShowMediaViewer(true);
                        } else {
                            // Try opening directly first
                            const supported = await Linking.canOpenURL(urlStr);
                            if (supported) {
                                await Linking.openURL(urlStr);
                            } else {
                                // Fallback to modal viewer -> download
                                setMediaViewerData({ uri: urlStr, type: 'file', fileName: item.fileName || 'Attachment' });
                                setShowMediaViewer(true);
                            }
                        }
                    } catch (err) {
                        console.error("Could not open URL:", err);
                        alert("Could not open file: " + (item.fileName || "Unknown"));
                    }
                }}
            >
                <View style={styles.fileContainer}>
                    <View style={[styles.fileIconContainer, { backgroundColor: isMine ? '#D1E5FF' : '#F3F4F6' }]}>
                        <Ionicons
                            name={iconName}
                            size={28}
                            color="#0A66C2"
                        />
                    </View>
                    <View style={styles.fileInfo}>
                        <Text style={[styles.fileName, isMine ? styles.myText : styles.otherText]} numberOfLines={1}>
                            {item.fileName || 'Attachment'}
                        </Text>
                        <Text style={styles.fileSubtext}>Tap to view</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetX={isMine ? [-50, 0] : [0, 50]}
            failOffsetY={[-5, 5]}
        >
            <View>
                <Animated.View style={[
                    styles.messageRow,
                    isMine ? styles.myRow : isAI ? styles.aiRow : styles.otherRow,
                    {
                        translateX: itemSwipeX.interpolate({
                            inputRange: isMine ? [-100, 0] : [0, 100],
                            outputRange: isMine ? [-40, 0] : [0, 40],
                            extrapolate: 'clamp'
                        })
                    }
                ]}>
                    {!isMine && !isAI && (
                        <View style={styles.avatarSpace}>
                            {showAvatar && (
                                <Image
                                    source={item.senderId?.profilePicture?.url
                                        ? { uri: item.senderId.profilePicture.url }
                                        : (otherUser?.profilePicture?.url && !isGroupChat)
                                            ? { uri: otherUser.profilePicture.url }
                                            : { uri: 'https://ui-avatars.com/api/?name=' + (item.senderId?.displayName || otherUser?.displayName || 'Member') }}
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
                        {renderMedia()}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onLongPress={() => toggleSelection(item._id)}
                            onPress={() => {
                                if (isSelectionMode) {
                                    toggleSelection(item._id);
                                } else {
                                    setShowOptionsId(item._id);
                                }
                            }}
                            delayLongPress={200}
                        >
                            <View style={[
                                styles.bubble,
                                isMine ? styles.myBubble : (isAI ? styles.aiBubble : styles.otherBubble),
                                item.deleted && styles.deletedBubble,
                                isSelected && { borderWidth: 3, borderColor: '#0A66C2' }
                            ]}>
                                {item.deleted ? (
                                    <Text style={[styles.messageText, styles.deletedText]}>
                                        This message was deleted
                                    </Text>
                                ) : (
                                    <>
                                        {isGroupChat && !isMine && (
                                            <Text style={styles.senderName}>{item.senderId?.displayName || 'Unknown'}</Text>
                                        )}

                                        {replyingToMsg && (
                                            <View style={styles.replyPreview}>
                                                <Text style={styles.replyUser}>
                                                    {(replyingToMsg.senderId?._id || replyingToMsg.senderId) === user._id ? 'You' : (replyingToMsg.senderId?.displayName || 'Someone')}
                                                </Text>
                                                <Text style={styles.replyContent} numberOfLines={1}>
                                                    {replyingToMsg.content || 'Attachment'}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Link content for AI */}
                                        {isAI && item.citations && item.citations.length > 0 && (
                                            <Text style={{ fontSize: 10, color: '#7C3AED', marginBottom: 2 }}>
                                                Source: {item.citations[0]}
                                            </Text>
                                        )}

                                        {item.content ? (
                                            <Text style={[styles.messageText, isMine ? styles.myText : styles.otherText]}>
                                                {item.content}
                                            </Text>
                                        ) : null}

                                        <View style={styles.messageFooter}>
                                            <Text style={styles.timeText}>
                                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            {isMine && (
                                                <Ionicons
                                                    name={item.readBy?.length > 0 ? "checkmark-done" : "checkmark"}
                                                    size={16}
                                                    color={item.readBy?.length > 0 ? "#34B7F1" : "#9CA3AF"}
                                                    style={{ marginLeft: 5 }}
                                                />
                                            )}
                                        </View>
                                    </>
                                )}
                            </View>
                            {/* Reactions Rendering */}
                            {item.reactions && item.reactions.length > 0 && (
                                <View style={[styles.reactionsContainer, isMine ? { justifyContent: 'flex-end', marginLeft: 'auto', right: 0 } : { justifyContent: 'flex-start', left: 0 }]}>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFF', borderRadius: 15, padding: 2, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 }}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            setReactionDetailsData(item.reactions);
                                            setShowReactionDetails(true);
                                        }}
                                    >
                                        {(() => {
                                            const reactionCounts = item.reactions.reduce((acc, curr) => {
                                                acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                                return acc;
                                            }, {});
                                            return Object.entries(reactionCounts).map(([emoji, count]) => (
                                                <View key={emoji} style={styles.reactionChip}>
                                                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                                                    <Text style={styles.reactionCount}>{count}</Text>
                                                </View>
                                            ));
                                        })()}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    {/* Spacer for reactions to prevent overlap */}
                    {item.reactions && item.reactions.length > 0 && <View style={{ height: 15 }} />}
                </Animated.View>

                {/* Reply Indicator (Behind the swipe) */}
                <Animated.View style={[
                    {
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 50,
                        left: 0,
                        opacity: itemSwipeX.interpolate({
                            inputRange: [0, 60],
                            outputRange: [0, 1],
                            extrapolate: 'clamp'
                        }),
                        transform: [{
                            scale: itemSwipeX.interpolate({
                                inputRange: [0, 60],
                                outputRange: [0.5, 1],
                                extrapolate: 'clamp'
                            })
                        }]
                    },
                    isMine ? { right: -50, left: undefined } : {}
                ]}>
                    <Ionicons name="arrow-undo-circle" size={30} color="#0A66C2" />
                </Animated.View>
            </View>
        </PanGestureHandler>
    );



















});

const ChatScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { otherUser, isGroupChat, clubName, groupChatData } = route.params;

    // Safeguard clubId extraction
    const rawClubId = route.params?.clubId;
    const clubId = (rawClubId && typeof rawClubId === 'object')
        ? (rawClubId._id?.toString() || rawClubId.toString())
        : rawClubId;
    const { user, socket, refreshUnreadMessageCount } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [showOptionsId, setShowOptionsId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
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
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [localGroupData, setLocalGroupData] = useState(groupChatData);
    const [currentClubName, setCurrentClubName] = useState(clubName || groupChatData?.clubId?.name);
    const [isGroupAdmin, setIsGroupAdmin] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newGroupName, setNewGroupName] = useState(currentClubName);
    const isSelectionMode = selectedMessages.length > 0;

    useEffect(() => {
        if (isGroupChat && localGroupData) {
            const memberInfo = localGroupData.members?.find(
                m => (m.userId?._id || m.userId) === user._id
            );
            setIsGroupAdmin(memberInfo?.role === 'admin' || user.role === 'admin');
        }
    }, [localGroupData, user._id]);

    useEffect(() => {
        setNewGroupName(currentClubName);
    }, [currentClubName]);

    const [attachments, setAttachments] = useState([]);
    const [showMediaViewer, setShowMediaViewer] = useState(false);
    const [mediaViewerData, setMediaViewerData] = useState(null);

    // Reaction & Details State
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
    const [showReactionDetails, setShowReactionDetails] = useState(false);
    const [reactionDetailsData, setReactionDetailsData] = useState([]);

    const flatListRef = useRef();
    const inputRef = useRef();

    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    // ... (keep useEffects for socket and fetching same)

    const sendMessage = async () => {
        if (!inputText.trim() && attachments.length === 0) return;

        const tempText = inputText;
        const tempAttachments = [...attachments];
        const tempReply = replyingTo;

        // Clear local state immediately
        setInputText('');
        setAttachments([]);
        setReplyingTo(null);
        setMentionEta(false);

        try {
            const sendSingle = async (text, attachmentItem) => {
                let file = null;
                if (attachmentItem) {
                    file = await prepareFile(attachmentItem.uri);
                }

                const messageData = {
                    content: text,
                    type: attachmentItem ? 'media' : 'text',
                    replyTo: tempReply?._id
                };

                if (!messageData.content && attachmentItem) {
                    messageData.content = ''; // No default text for secondary attachments
                }

                if (isGroupChat) {
                    await groupChatAPI.sendMessage(clubId, messageData, file);
                } else {
                    messageData.receiverId = otherUser._id;
                    if (text && /@Eta/i.test(text)) {
                        messageData.mentionAI = true;
                        setAiProcessing(true);
                    }
                    await messagesAPI.send(messageData, file);
                }
            };

            if (tempAttachments.length > 0) {
                // Send first attachment with the text caption
                await sendSingle(tempText, tempAttachments[0]);

                // Send remaining attachments as separate messages
                for (let i = 1; i < tempAttachments.length; i++) {
                    await sendSingle('', tempAttachments[i]);
                }
            } else {
                // Just text
                await sendSingle(tempText, null);
            }

            // Refresh/Scroll
            setTimeout(() => {
                fetchMessages(); // specific fetch to ensure sync
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 500);

        } catch (error) {
            console.error('Error sending message:', error);
            setAiProcessing(false);
            alert('Failed to send message');
            // Optionally restore attachments
        }
    };

    // ... (rest of simple functions)

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.8,
                allowsMultipleSelection: true,
                selectionLimit: 5
            });

            if (!result.canceled) {
                const newAttachments = result.assets.map(asset => ({
                    uri: asset.uri,
                    type: asset.type === 'video' ? 'video' : 'image',
                    name: asset.fileName || 'Media'
                }));
                setAttachments(prev => [...prev, ...newAttachments]);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
        setShowAttachMenu(false);
    };

    const handlePickCamera = async () => {
        // ... (keep camera logic, but append to attachments)
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission needed to access camera');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
            if (!result.canceled) {
                setAttachments(prev => [...prev, {
                    uri: result.assets[0].uri,
                    type: 'image',
                    name: 'CameraCapture.jpg'
                }]);
            }
        } catch (err) { console.log(err); }
        setShowAttachMenu(false);
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: true
            });

            if (result.assets) {
                const newAttachments = result.assets.map(asset => ({
                    uri: asset.uri,
                    type: 'document',
                    name: asset.name
                }));
                setAttachments(prev => [...prev, ...newAttachments]);
            }
        } catch (err) { console.log(err); }
        setShowAttachMenu(false);
    };

    const handlePickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true,
                multiple: true
            });
            if (result.assets) {
                const newAttachments = result.assets.map(asset => ({
                    uri: asset.uri,
                    type: 'document', // Backend handles as file
                    name: asset.name
                }));
                setAttachments(prev => [...prev, ...newAttachments]);
            }
        } catch (err) { console.log(err); }
        setShowAttachMenu(false);
    }

    // ... handleUpdateGroupIcon (unchanged)

    // ... renderMedia (unchanged)

    // ... Helper to remove attachment
    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // ... UI render updates (next step)

    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    useEffect(() => {
        fetchMessages();
        markRead();

        if (socket) {
            if (isGroupChat) {
                // Group chat socket listeners
                socket.on('group:message', handleReceiveMessage);
                socket.on('group:message:delete', handleDeleteSync);
                socket.on('group:message:reaction', handleReactionSync);
            } else {
                // Individual chat socket listeners
                socket.on('message:receive', handleReceiveMessage);
                socket.on('message:typing', handleTypingStatus);
                socket.on('message:delete', handleDeleteSync);
                socket.on('message:reaction', handleReactionSync);
            }
        }

        return () => {
            if (socket) {
                if (isGroupChat) {
                    socket.off('group:message', handleReceiveMessage);
                    socket.off('group:message:delete', handleDeleteSync);
                    socket.off('group:message:reaction', handleReactionSync);
                } else {
                    socket.off('message:receive', handleReceiveMessage);
                    socket.off('message:typing', handleTypingStatus);
                    socket.off('message:delete', handleDeleteSync);
                    socket.off('message:reaction', handleReactionSync);
                }
            }
        };
    }, [isGroupChat ? clubId : otherUser?._id]);

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
            if (isGroupChat) {
                const res = await groupChatAPI.getGroupChat(clubId);
                if (res.data) {
                    setLocalGroupData(res.data);
                    if (res.data.clubId?.name) setCurrentClubName(res.data.clubId.name);
                    if (res.data.messages) {
                        setMessages(res.data.messages);
                    }
                }
            } else {
                const res = await messagesAPI.getMessages(otherUser._id);
                if (res.success) setMessages(res.data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async () => {
        try {
            if (isGroupChat) {
                await groupChatAPI.markAsRead(clubId);
            } else {
                await messagesAPI.markAsRead(otherUser._id);
            }
            refreshUnreadMessageCount();
        } catch (error) {
            console.log('Error marking read');
        }
    };

    const handleReceiveMessage = (data) => {
        const message = (isGroupChat && data?.message) ? data.message : data;
        if (!message) return;

        const isAIMessage = message.senderId === 'AI' || message.senderId?._id === 'AI' || message.senderId === '000000000000000000000000' || message.senderId?._id === '000000000000000000000000' || message.isAI;
        const isRelevantMessage = isAIMessage ||
            (isGroupChat ? true : (
                message.senderId?._id === otherUser?._id ||
                message.receiverId?._id === otherUser?._id ||
                message.senderId === otherUser?._id ||
                message.receiverId === otherUser?._id
            ));

        if (isRelevantMessage) {
            setMessages(prev => {
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });

            if (isAIMessage) {
                setAiProcessing(false);
            }

            const isFromMe = (message.senderId?._id || message.senderId) === user._id;
            if (!isAIMessage && !isFromMe) {
                markRead();
            }
        }
    };

    const handleTypingStatus = (data) => {
        if (!isGroupChat && data.senderId === otherUser?._id) {
            setIsTyping(data.isTyping);
        }
    };

    const handleDeleteSync = ({ messageId, type }) => {
        if (isGroupChat || type === 'everyone') {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        }
    };

    const handleReactionSync = ({ messageId, reactions }) => {
        setMessages(prev => prev.map(m =>
            m._id === messageId ? { ...m, reactions } : m
        ));
    };


    const handleUpdateGroupIcon = async () => {
        if (!isGroupAdmin) {
            alert('Only group admins can change the icon');
            return;
        }
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: true,
                aspect: [1, 1],
            });

            if (!result.canceled) {
                setUploadingMedia(true);
                const file = await prepareFile(result.assets[0].uri);

                const formData = new FormData();
                formData.append('logo', file);

                const res = await clubsAPI.update(clubId, formData);

                if (res.success) {
                    alert('Group icon updated!');
                    fetchMessages();
                }
            }
        } catch (error) {
            console.error('Error updating group icon:', error);
            alert('Failed to update group icon');
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleUpdateGroupName = async () => {
        if (!isGroupAdmin) return;
        setIsEditingName(true);
    };

    const handleSaveGroupName = async () => {
        if (!newGroupName.trim() || newGroupName === currentClubName) {
            setIsEditingName(false);
            return;
        }
        try {
            const res = await clubsAPI.update(clubId, { name: newGroupName });
            if (res.success) {
                setCurrentClubName(newGroupName);
                setIsEditingName(false);
                alert('Group name updated!');
            }
        } catch (error) {
            console.error('Error updating group name:', error);
            alert('Failed to update group name');
        }
    };

    const handleInputTyping = (text) => {
        setInputText(text);
        if (socket && !isGroupChat) {
            socket.emit('message:typing', {
                receiverId: otherUser?._id,
                isTyping: text.length > 0,
                senderId: user._id
            });
        }
    };

    const toggleReaction = async (messageId, emoji) => {
        try {
            let res;
            if (isGroupChat) {
                res = await groupChatAPI.addReaction(clubId, messageId, { emoji });
            } else {
                res = await messagesAPI.addReaction(messageId, { emoji });
            }
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
                if (!isGroupChat && targetUserId === otherUser?._id) {
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
                if (isGroupChat) {
                    await groupChatAPI.deleteMessage(clubId, id, deleteType);
                } else {
                    await messagesAPI.deleteMessage(id, deleteType);
                }
            }

            // Completely hide for both 'me' and 'everyone'
            setMessages(prev => prev.filter(m => !idsToDelete.includes(m._id)));

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
            messages={messages}
            setReplyingTo={setReplyingTo}
            setShowOptionsId={setShowOptionsId}
            isSelected={selectedMessages.includes(item._id)}
            toggleSelection={toggleSelection}
            isSelectionMode={isSelectionMode}
            isGroupChat={isGroupChat}
            setMediaViewerData={setMediaViewerData}
            setShowMediaViewer={setShowMediaViewer}
            setReactionDetailsData={setReactionDetailsData}
            setShowReactionDetails={setShowReactionDetails}
        />
    ), [user?._id, otherUser?._id, messages.length, selectedMessages, isSelectionMode, toggleSelection, isGroupChat, setMediaViewerData, setShowMediaViewer, setReactionDetailsData, setShowReactionDetails]);

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
                                onPress={() => isGroupChat ? setShowGroupInfoModal(true) : setShowProfileModal(true)}
                            >
                                <LinearGradient
                                    colors={isGroupChat ? ['#0A66C2', '#0E76A8'] : ['#F3F4F6', '#F3F4F6']}
                                    style={styles.headerAvatar}
                                >
                                    {isGroupChat ? (
                                        localGroupData?.clubId?.logo?.url ? (
                                            <Image
                                                source={{ uri: localGroupData.clubId.logo.url }}
                                                style={styles.headerAvatarImg}
                                            />
                                        ) : (
                                            <Ionicons name="people" size={24} color="#FFF" style={{ alignSelf: 'center', marginTop: 8 }} />
                                        )
                                    ) : (
                                        <Image
                                            source={otherUser?.profilePicture?.url ? { uri: otherUser.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + (otherUser?.displayName || 'Chat') }}
                                            style={styles.headerAvatarImg}
                                        />
                                    )}
                                </LinearGradient>
                                <View>
                                    <Text style={styles.headerName}>{isGroupChat ? currentClubName : otherUser?.displayName}</Text>
                                    <Text style={styles.headerStatus}>
                                        {isGroupChat
                                            ? `${localGroupData?.members?.length || 0} members`
                                            : (isTyping ? 'typing...' : (otherUser?.isOnline ? 'online' : 'last seen recently'))}
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
                                                <Text style={styles.typingText}>{otherUser?.displayName} is typing...</Text>
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
                                    <View style={styles.attachRow}>
                                        <View style={styles.attachOptionContainer}>
                                            <TouchableOpacity
                                                style={[styles.attachOption, { backgroundColor: '#7F66FF' }]}
                                                onPress={handlePickDocument}
                                            >
                                                <Ionicons name="document" size={26} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.attachLabelText}>Document</Text>
                                        </View>
                                        <View style={styles.attachOptionContainer}>
                                            <TouchableOpacity
                                                style={[styles.attachOption, { backgroundColor: '#FF4B4B' }]}
                                                onPress={handlePickCamera}
                                            >
                                                <Ionicons name="camera" size={26} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.attachLabelText}>Camera</Text>
                                        </View>
                                        <View style={styles.attachOptionContainer}>
                                            <TouchableOpacity
                                                style={[styles.attachOption, { backgroundColor: '#A33BEF' }]}
                                                onPress={handlePickImage}
                                            >
                                                <Ionicons name="images" size={26} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.attachLabelText}>Gallery</Text>
                                        </View>
                                    </View>
                                    <View style={styles.attachRow}>
                                        <View style={styles.attachOptionContainer}>
                                            <TouchableOpacity
                                                style={[styles.attachOption, { backgroundColor: '#00A884' }]}
                                                onPress={handlePickAudio}
                                            >
                                                <Ionicons name="headset" size={26} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.attachLabelText}>Audio</Text>
                                        </View>
                                        <View style={styles.attachOptionContainer}>
                                            <TouchableOpacity
                                                style={[styles.attachOption, { backgroundColor: '#2196F3' }]}
                                                onPress={() => alert('Location sharing coming soon!')}
                                            >
                                                <Ionicons name="location" size={26} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.attachLabelText}>Location</Text>
                                        </View>
                                        <View style={styles.attachOptionContainer}>
                                            <TouchableOpacity
                                                style={[styles.attachOption, { backgroundColor: '#00D95A' }]}
                                                onPress={() => { }} // Contact placeholder
                                            >
                                                <Ionicons name="person" size={26} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.attachLabelText}>Contact</Text>
                                        </View>
                                    </View>
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



                            <View>
                                {/* Moved Attachment Preview Here - Above Input Row completely */}
                                {attachments.length > 0 && (
                                    <View style={{ paddingHorizontal: 10, paddingBottom: 5 }}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 90 }}>
                                            {attachments.map((att, i) => (
                                                <View key={i} style={{ marginRight: 10, position: 'relative' }}>
                                                    <View style={{ width: 70, height: 70, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
                                                        {att.type === 'image' || att.type === 'video' ? (
                                                            <Image source={{ uri: att.uri }} style={{ width: '100%', height: '100%' }} />
                                                        ) : (
                                                            <Ionicons name="document-text" size={30} color="#6B7280" />
                                                        )}
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => removeAttachment(i)}
                                                        style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 12, elevation: 2 }}
                                                    >
                                                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
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

                                    {inputText.length > 0 || attachments.length > 0 ? (
                                        <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage()}>
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
                                <TouchableOpacity
                                    style={[styles.reactionBtn, { backgroundColor: '#E5E7EB' }]}
                                    onPress={() => {
                                        setReactionPickerMessageId(showOptionsId);
                                        setShowOptionsId(null);
                                        setShowReactionPicker(true);
                                    }}
                                >
                                    <Ionicons name="add" size={20} color="#374151" />
                                </TouchableOpacity>
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
                                    <Text style={styles.menuText}>Delete for me</Text>
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
                                    source={otherUser?.profilePicture?.url ? { uri: otherUser.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + (otherUser?.displayName || 'Member') }}
                                    style={styles.largeAvatar}
                                />
                                <Text style={styles.profileName}>{otherUser?.displayName || 'Member'}</Text>
                                <Text style={styles.profileEmail}>{otherUser?.email || 'Member of Mavericks'}</Text>
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

                {/* Group Info Modal */}
                <Modal
                    visible={showGroupInfoModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowGroupInfoModal(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowGroupInfoModal(false)}
                    >
                        <View style={[styles.profileCard, { maxHeight: '80%' }]}>
                            <View style={styles.profileHeader}>
                                <TouchableOpacity onPress={handleUpdateGroupIcon} disabled={!isGroupAdmin}>
                                    {localGroupData?.clubId?.logo?.url ? (
                                        <Image
                                            source={{ uri: localGroupData.clubId.logo.url }}
                                            style={styles.largeAvatar}
                                        />
                                    ) : (
                                        <LinearGradient
                                            colors={['#0A66C2', '#0E76A8']}
                                            style={styles.largeAvatar}
                                        >
                                            <Ionicons name="people" size={60} color="#FFF" style={{ alignSelf: 'center', marginTop: 25 }} />
                                        </LinearGradient>
                                    )}
                                    {isGroupAdmin && (
                                        <View style={styles.editBadge}>
                                            <Ionicons name="camera" size={16} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <View style={{ width: '100%', alignItems: 'center', marginVertical: 10 }}>
                                    {isEditingName ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
                                            <TextInput
                                                style={{
                                                    flex: 1,
                                                    fontSize: 18,
                                                    fontWeight: '700',
                                                    color: '#1F2937',
                                                    borderBottomWidth: 2,
                                                    borderBottomColor: '#0A66C2',
                                                    paddingVertical: 5,
                                                    textAlign: 'center'
                                                }}
                                                value={newGroupName}
                                                onChangeText={setNewGroupName}
                                                autoFocus
                                            />
                                            <TouchableOpacity onPress={handleSaveGroupName}>
                                                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => { setIsEditingName(false); setNewGroupName(currentClubName); }}>
                                                <Ionicons name="close-circle" size={28} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Text style={styles.profileName}>{currentClubName}</Text>
                                            {isGroupAdmin && (
                                                <TouchableOpacity onPress={handleUpdateGroupName}>
                                                    <Ionicons name="pencil-outline" size={18} color="#0A66C2" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.profileEmail}>{localGroupData?.members?.length || 0} Members</Text>
                            </View>

                            <Text style={styles.sectionTitle}>Group Members</Text>
                            <FlatList
                                data={localGroupData?.members || []}
                                keyExtractor={item => item.userId?._id || item._id}
                                style={{ width: '100%', marginBottom: 20 }}
                                renderItem={({ item }) => (
                                    <View style={styles.memberListItem}>
                                        <Image
                                            source={item.userId?.profilePicture?.url ? { uri: item.userId.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + (item.userId?.displayName || 'Member') }}
                                            style={styles.memberAvatar}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.memberName}>{item.userId?.displayName || 'Member'}</Text>
                                            <Text style={styles.memberRole}>{item.role || 'member'}</Text>
                                        </View>
                                        {item.userId?.isOnline && <View style={styles.onlineDot} />}
                                    </View>
                                )}
                            />

                            <TouchableOpacity
                                style={styles.closeProfileBtn}
                                onPress={() => setShowGroupInfoModal(false)}
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
            {/* Reaction Picker Modal */}
            <Modal
                visible={showReactionPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowReactionPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowReactionPicker(false)}
                >
                    <View style={[styles.optionsPopup, { height: '50%', paddingVertical: 20 }]}>
                        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 15, alignSelf: 'center', color: '#1F2937' }}>React</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingBottom: 20 }}>
                                {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👍', '👎', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙'].map((emoji) => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={{ padding: 8, borderRadius: 20, backgroundColor: '#F3F4F6' }}
                                        onPress={() => {
                                            toggleReaction(reactionPickerMessageId, emoji);
                                            setShowReactionPicker(false);
                                        }}
                                    >
                                        <Text style={{ fontSize: 28 }}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Media Viewer Modal */}
            <Modal
                visible={showMediaViewer}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMediaViewer(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                        onPress={() => setShowMediaViewer(false)}
                    >
                        <Ionicons name="close" size={30} color="#FFF" />
                    </TouchableOpacity>

                    {mediaViewerData?.type === 'image' ? (
                        <Image
                            source={{ uri: mediaViewerData.uri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={{ alignItems: 'center', padding: 20 }}>
                            <Ionicons
                                name={mediaViewerData?.type === 'video' ? "videocam" : "document-text"}
                                size={80}
                                color="#FFF"
                                style={{ marginBottom: 20 }}
                            />
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 }}>
                                {mediaViewerData?.fileName || 'Attachment'}
                            </Text>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#0A66C2',
                                    paddingVertical: 15,
                                    paddingHorizontal: 30,
                                    borderRadius: 30,
                                    marginTop: 20
                                }}
                                onPress={() => {
                                    Linking.openURL(mediaViewerData.uri);
                                    setShowMediaViewer(false);
                                }}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>Open File</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    paddingVertical: 15,
                                    paddingHorizontal: 30,
                                    borderRadius: 30,
                                    marginTop: 15
                                }}
                                onPress={() => {
                                    Linking.openURL(mediaViewerData.uri);
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Download</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Reaction Details Modal */}
            <Modal
                visible={showReactionDetails}
                borderTopLeftRadius={20}
                borderTopRightRadius={20}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowReactionDetails(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setShowReactionDetails(false)}
                >
                    <View style={{ backgroundColor: '#FFF', height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 15, alignSelf: 'center' }}>Reactions</Text>
                        <FlatList
                            data={reactionDetailsData}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                    <Text style={{ fontSize: 24, marginRight: 15 }}>{item.emoji}</Text>
                                    <Text style={{ fontSize: 16, fontWeight: '600' }}>
                                        {item.userId?.displayName || item.senderId?.displayName || item.user?.displayName || 'User'}
                                    </Text>
                                </View>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </GestureHandlerRootView >
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
        overflow: 'hidden',
    },
    headerAvatarImg: {
        width: '100%',
        height: '100%',
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
    senderName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0A66C2',
        marginBottom: 2,
    },
    messageImage: {
        width: width * 0.6,
        height: 200,
        borderRadius: 10,
        marginBottom: 4,
    },
    fileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        marginBottom: 4,
        width: width * 0.7,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    fileIconContainer: {
        width: 45,
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fileInfo: {
        flex: 1,
    },
    fileSubtext: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
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
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 10,
        marginBottom: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    attachRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    attachOptionContainer: {
        alignItems: 'center',
        width: 80,
    },
    attachOption: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    attachLabelText: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
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
    editBadge: {
        position: 'absolute',
        bottom: 15,
        right: 0,
        backgroundColor: '#0A66C2',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
        alignSelf: 'flex-start',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    memberListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    memberRole: {
        fontSize: 12,
        color: '#6B7280',
    },
    onlineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    downloadBtn: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20
    },
});

export default ChatScreen;
