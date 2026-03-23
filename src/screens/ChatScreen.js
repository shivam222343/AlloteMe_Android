import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
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
import { messagesAPI, groupChatAPI, snapsAPI, clubsAPI, mediaAPI } from '../services/api';
import { API_CONFIG } from '../constants/theme';
import { prepareFile } from '../services/cloudinaryService';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useWebUpload } from '../hooks/useWebUpload';
import MediaUploadModal from '../components/MediaUploadModal';
import PollModal from '../components/PollModal';
import SpinnerModal from '../components/SpinnerModal';
import ViewedByModal from '../components/ViewedByModal';
import VoterListModal from '../components/VoterListModal';



import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

// Utility function to format last seen time
const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return 'last seen recently';

    const now = new Date();
    const lastSeen = new Date(lastSeenDate);
    const diffMs = now - lastSeen;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Within last 24 hours: show time with AM/PM
    if (diffHours < 24) {
        return `last seen at ${lastSeen.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })}`;
    }

    // Yesterday
    if (diffDays < 2 && lastSeen.getDate() === now.getDate() - 1) {
        return 'last seen yesterday';
    }

    // Older: show date
    return `last seen ${lastSeen.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    })}`;
};

const isDifferentDay = (d1, d2) => {
    if (!d1 || !d2) return true;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.toDateString() !== date2.toDateString();
};

const getDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
};

const MessageItem = React.memo(({ item, index, user, otherUser, messages, setReplyingTo, setShowOptionsId, isSelected, toggleSelection, isSelectionMode, isGroupChat, setMediaViewerData, setShowMediaViewer, setReactionDetailsData, setShowReactionDetails, onVote, onSpin, clubId, onShowVoters }) => {
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

    const renderPoll = () => {
        if (item.type !== 'poll' || !item.pollData) return null;
        const totalVotes = item.pollData.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

        return (
            <View style={styles.pollContainer}>
                <Text style={styles.pollQuestion}>{item.pollData.question}</Text>
                {item.pollData.options.map((opt, idx) => {
                    const voteCount = opt.votes?.length || 0;
                    const percentage = totalVotes > 0 ? (voteCount / totalVotes) : 0;
                    const hasVoted = opt.votes?.includes(user._id);

                    return (
                        <TouchableOpacity
                            key={idx}
                            style={styles.pollOption}
                            onPress={() => onVote(item._id, idx)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.pollBar, { width: `${percentage * 100}%` }]} />
                            <View style={styles.pollOptionContent}>
                                <Text style={styles.pollOptionText}>{opt.text}</Text>
                                <TouchableOpacity
                                    style={styles.pollOptionRight}
                                    onPress={() => onShowVoters && onShowVoters(item._id, idx, opt.text)}
                                >
                                    {hasVoted && <Ionicons name="checkmark-circle" size={16} color="#0A66C2" />}
                                    <Text style={styles.pollVoteCount}>{voteCount}</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                })}
                <Text style={styles.pollFooter}>{totalVotes} votes • {item.pollData.maxVotes === 1 ? 'Single choice' : `Multiple choice (max ${item.pollData.maxVotes})`}</Text>
            </View>
        );
    };

    const renderSpinner = () => {
        if (item.type !== 'spinner' || !item.spinnerData) return null;

        const isSpinning = item.spinnerData.status === 'spinning';
        const isCompleted = item.spinnerData.status === 'completed';
        const result = item.spinnerData.result;

        return (
            <View style={styles.spinnerContainer}>
                <View style={styles.spinnerHeader}>
                    <Text style={styles.spinnerIcon}>🎡</Text>
                    <Text style={styles.spinnerTitle}>{item.pollData?.question || 'Random Choice'}</Text>
                </View>

                <View style={[styles.spinnerInner, isSpinning && styles.spinningActive]}>
                    {isSpinning ? (
                        <Animatable.Text
                            animation="pulse"
                            iterationCount="infinite"
                            style={styles.spinningText}
                        >
                            Spinning...
                        </Animatable.Text>
                    ) : isCompleted ? (
                        <Animatable.View animation="bounceIn" style={styles.winnerBox}>
                            <Text style={styles.winnerText}>{result}</Text>
                            <Text style={styles.winnerLabel}>WINNER!</Text>
                        </Animatable.View>
                    ) : (
                        <Text style={styles.idleText}>Ready to spin</Text>
                    )}
                </View>

                {isMine && !isSpinning && (
                    <TouchableOpacity
                        style={styles.spinBtn}
                        onPress={() => onSpin(item._id, item.spinnerData.items, isCompleted)}
                    >
                        <Text style={styles.spinBtnText}>{isCompleted ? 'SPIN AGAIN' : 'SPIN'}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
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
                                        {isAI ? (
                                            <View style={styles.aiHeader}>
                                                <Ionicons name="sparkles" size={12} color="#7C3AED" />
                                                <Text style={styles.aiLabel}>Eta (AI Assistant)</Text>
                                            </View>
                                        ) : (
                                            isGroupChat && !isMine && (
                                                <Text style={styles.senderName}>{item.senderId?.displayName || 'Unknown'}</Text>
                                            )
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

                                        {item.type === 'poll' && renderPoll()}
                                        {item.type === 'spinner' && renderSpinner()}

                                        {item.content && item.type !== 'poll' && item.type !== 'spinner' ? (
                                            <Text style={[styles.messageText, isMine ? styles.myText : styles.otherText]}>
                                                {item.content}
                                            </Text>
                                        ) : null}

                                        <View style={styles.messageFooter}>
                                            <Text style={styles.timeText}>
                                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            {isMine && (
                                                <>
                                                    <Ionicons
                                                        name={(isGroupChat ? (item.readBy && item.readBy.length > 0) : item.read) ? "checkmark-done" : "checkmark"}
                                                        size={16}
                                                        color={(isGroupChat ? (item.readBy && item.readBy.length > 0) : item.read) ? "#34B7F1" : "#9CA3AF"}
                                                        style={{ marginLeft: 5 }}
                                                    />
                                                    {/* Viewed By count - only for group chats and sender's messages */}
                                                    {isGroupChat && item.readBy && item.readBy.length > 0 && (
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                setViewedByMessageId(item._id);
                                                                setShowViewedByModal(true);
                                                            }}
                                                            style={{ marginLeft: 3 }}
                                                        >
                                                            <Text style={{ fontSize: 10, color: '#0A66C2', fontWeight: '700' }}>
                                                                {item.readBy.length}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </>
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

                                            const reactionEntries = Object.entries(reactionCounts);
                                            const totalReactionTypes = reactionEntries.length;
                                            const displayReactions = reactionEntries.slice(0, 4);
                                            const remainingCount = totalReactionTypes - 4;

                                            const myUserId = user._id;
                                            const myReactions = item.reactions
                                                .filter(r => (r.userId?._id || r.userId) === myUserId)
                                                .map(r => r.emoji);

                                            return (
                                                <>
                                                    {displayReactions.map(([emoji, count]) => (
                                                        <View
                                                            key={emoji}
                                                            style={[
                                                                styles.reactionChip,
                                                                myReactions.includes(emoji) && { backgroundColor: '#D1E5FF', borderRadius: 10, paddingHorizontal: 4 }
                                                            ]}
                                                        >
                                                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                                                            {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                                                        </View>
                                                    ))}
                                                    {remainingCount > 0 && (
                                                        <View style={[styles.reactionChip, { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 6 }]}>
                                                            <Text style={[styles.reactionCount, { marginLeft: 0 }]}>+{remainingCount}</Text>
                                                        </View>
                                                    )}
                                                </>
                                            );
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
    const { startWebUpload } = useWebUpload();
    const [messages, setMessages] = useState([]);

    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [lastSentMessageId, setLastSentMessageId] = useState(null);
    const timerRef = useRef(null);
    const [showOptionsId, setShowOptionsId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [mentionEta, setMentionEta] = useState(false);
    const [deleting, setDeleting] = useState(false);
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
    const [showViewedByModal, setShowViewedByModal] = useState(false);
    const [viewedByMessageId, setViewedByMessageId] = useState(null);
    const isSelectionMode = selectedMessages.length > 0;

    useEffect(() => {
        if (isGroupChat && localGroupData) {
            const memberInfo = localGroupData.members?.find(
                m => (m.userId?._id || m.userId) === user._id
            );
            setIsGroupAdmin(memberInfo?.role === 'admin' || user.role === 'admin');
        }
    }, [localGroupData, user._id]);

    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);

    useEffect(() => {
        setNewGroupName(currentClubName);
    }, [currentClubName]);

    // Auto-scroll to bottom when new messages arrive, but not in selection mode
    useEffect(() => {
        if (messages.length > 0 && !isSelectionMode && isAtBottom) {
            const timer = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [messages.length, isSelectionMode]);

    const handleScroll = (event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 30; // Increased sensitivity (was 100)
        const reachedBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

        setIsAtBottom(reachedBottom);
        setShowScrollToBottom(!reachedBottom);
    };

    const scrollToBottom = () => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setIsAtBottom(true);
        setShowScrollToBottom(false);
    };

    useEffect(() => {
        if (showGroupInfoModal && isGroupChat) {
            fetchMessages();
        }
    }, [showGroupInfoModal]);

    const [attachments, setAttachments] = useState([]);
    const [showMediaViewer, setShowMediaViewer] = useState(false);
    const [mediaViewerData, setMediaViewerData] = useState(null);

    // Reaction & Details State
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
    const [showGroupIconModalChoice, setShowGroupIconModalChoice] = useState(false);

    // Poll & Spinner states
    const [showPollModal, setShowPollModal] = useState(false);
    const [showSpinnerModal, setShowSpinnerModal] = useState(false);
    const [clubMembers, setClubMembers] = useState([]);

    const [showReactionDetails, setShowReactionDetails] = useState(false);
    const [reactionDetailsData, setReactionDetailsData] = useState([]);

    const [voterModal, setVoterModal] = useState({ visible: false, messageId: null, optionIndex: null, optionText: '' });

    const flatListRef = useRef();
    const inputRef = useRef();

    // Simplified recording state - no voice recognition, just visual feedback
    const recordingAnimValue = useRef(new Animated.Value(0)).current;

    // Start recording with cool animation
    const startRecording = async () => {
        try {
            setIsRecording(true);
            setRecordingDuration(0);
            Vibration.vibrate(50);

            // Start pulsing animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(recordingAnimValue, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease)
                    }),
                    Animated.timing(recordingAnimValue, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease)
                    })
                ])
            ).start();

            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (e) {
            console.error(e);
            setIsRecording(false);
        }
    };

    const stopRecording = async (shouldSend = true) => {
        try {
            clearInterval(timerRef.current);
            const duration = recordingDuration;
            setRecordingDuration(0);
            recordingAnimValue.stopAnimation();
            recordingAnimValue.setValue(0);
            setIsRecording(false);

            if (shouldSend && duration > 0) {
                // Send a message indicating voice note was recorded
                const voiceNoteMessage = `🎤 Voice note (${formatDuration(duration)})`;
                setInputText(voiceNoteMessage);

                // Auto-send after a brief delay
                setTimeout(() => {
                    sendMessage();
                }, 100);
            }
        } catch (e) {
            console.error(e);
            setIsRecording(false);
        }
    };

    // Socket listener for real-time read receipts
    useEffect(() => {
        if (!socket || !isGroupChat) return;

        const handleMessagesRead = (data) => {
            if (data.clubId === clubId) {
                // Update messages with new readBy data
                setMessages(prev => prev.map(msg => {
                    const alreadyRead = msg.readBy?.some(r =>
                        (r.userId?._id || r.userId) === data.userId
                    );

                    if (!alreadyRead) {
                        return {
                            ...msg,
                            readBy: [
                                ...(msg.readBy || []),
                                {
                                    userId: data.reader,
                                    readAt: data.readAt
                                }
                            ]
                        };
                    }
                    return msg;
                }));
            }
        };

        socket.on('group:messages:read', handleMessagesRead);

        return () => {
            socket.off('group:messages:read', handleMessagesRead);
        };
    }, [socket, isGroupChat, clubId]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const sendMessage = async () => {
        if (!inputText.trim() && attachments.length === 0) return;

        // Check if all attachments are uploaded
        if (attachments.some(att => att.uploading)) {
            alert('Please wait for media to finish uploading...');
            return;
        }

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
                const messageData = {
                    content: text,
                    type: attachmentItem ? 'media' : 'text',
                    replyTo: tempReply?._id
                };

                // Use pre-uploaded Cloudinary URL if available
                if (attachmentItem && attachmentItem.uploaded) {
                    messageData.fileUrl = attachmentItem.uri;
                    messageData.publicId = attachmentItem.publicId || '';
                    messageData.fileName = attachmentItem.name || 'Attachment';
                } else if (attachmentItem && attachmentItem.isWebUpload) {
                    messageData.fileUrl = attachmentItem.uri;
                    messageData.publicId = attachmentItem.publicId || '';
                    messageData.fileName = attachmentItem.name || 'Attachment';
                } else if (attachmentItem && attachmentItem.base64) {
                    // Fallback for non-instant uploads if any
                    messageData.image = attachmentItem.base64;
                    messageData.fileName = attachmentItem.name || 'Attachment';
                }

                if (!messageData.content && attachmentItem) {
                    messageData.content = '';
                }

                if (isGroupChat) {
                    if (text && /@Eta/i.test(text)) {
                        setAiProcessing(true);
                    }

                    let res;
                    // If we have a fileUrl, we don't need sendBase64Message
                    if (messageData.image && !messageData.fileUrl) {
                        res = await groupChatAPI.sendBase64Message(clubId, messageData);
                    } else {
                        res = await groupChatAPI.sendMessage(clubId, messageData);
                    }

                    if (res.success && res.data) {
                        setLastSentMessageId(res.data._id);
                        setMessages(prev => {
                            if (prev.some(m => m._id === res.data._id)) return prev;
                            return [...prev, res.data];
                        });
                    }
                } else {
                    messageData.receiverId = otherUser._id;
                    if (text && /@Eta/i.test(text)) {
                        messageData.mentionAI = true;
                        setAiProcessing(true);
                    }

                    let res;
                    if (messageData.image && !messageData.fileUrl) {
                        res = await messagesAPI.sendBase64(messageData);
                    } else {
                        res = await messagesAPI.send(messageData);
                    }

                    if (res.success && res.data) {
                        setLastSentMessageId(res.data._id);
                        setMessages(prev => {
                            if (prev.some(m => m._id === res.data._id)) return prev;
                            return [...prev, res.data];
                        });
                    }
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

    const uploadAttachment = async (attachment, tempId) => {
        try {
            let res;
            if (attachment.base64) {
                res = await mediaAPI.uploadBase64({
                    image: attachment.base64,
                    type: 'chat'
                }, (progress) => {
                    setUploadProgress(progress);
                });
            } else {
                const file = await prepareFile(attachment.uri);
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'chat');
                res = await mediaAPI.upload(formData, (progress) => {
                    setUploadProgress(progress);
                });
            }

            if (res.success) {
                setAttachments(prev => {
                    return prev.map(att => {
                        if (att.tempId === tempId) {
                            return {
                                ...att,
                                uri: res.data.url,
                                publicId: res.data.publicId,
                                uploading: false,
                                uploaded: true
                            };
                        }
                        return att;
                    });
                });
            } else {
                throw new Error(res.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Instant upload error:', error);
            setAttachments(prev => {
                return prev.map(att => {
                    if (att.tempId === tempId) {
                        return { ...att, uploading: false, error: true };
                    }
                    return att;
                });
            });
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.3,
                base64: true,
                allowsMultipleSelection: true,
                selectionLimit: 5
            });

            if (!result.canceled) {
                const newItems = result.assets.map((asset) => {
                    const tempId = Math.random().toString(36).substring(7);
                    const item = {
                        tempId,
                        uri: asset.uri,
                        type: asset.type === 'video' ? 'video' : 'image',
                        name: asset.fileName || (asset.type === 'video' ? 'Video.mp4' : 'Image.jpg'),
                        base64: asset.base64 ? `data:${asset.type === 'video' ? 'video/mp4' : 'image/jpeg'};base64,${asset.base64}` : null,
                        uploading: true,
                        uploaded: false
                    };
                    return item;
                });

                setAttachments(prev => [...prev, ...newItems]);

                // Start uploads
                newItems.forEach(item => {
                    uploadAttachment(item, item.tempId);
                });
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
                alert('Permission needed to access camera');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                quality: 0.3,
                base64: true
            });
            if (!result.canceled) {
                const tempId = Math.random().toString(36).substring(7);
                const asset = result.assets[0];
                const newItem = {
                    tempId,
                    uri: asset.uri,
                    base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null,
                    type: 'image',
                    name: 'CameraCapture.jpg',
                    uploading: true,
                    uploaded: false
                };
                setAttachments(prev => [...prev, newItem]);
                uploadAttachment(newItem, tempId);
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
                const newItems = result.assets.map(asset => {
                    const tempId = Math.random().toString(36).substring(7);
                    return {
                        tempId,
                        uri: asset.uri,
                        type: 'document',
                        name: asset.name,
                        uploading: true,
                        uploaded: false
                    };
                });
                setAttachments(prev => [...prev, ...newItems]);
                newItems.forEach(item => {
                    uploadAttachment(item, item.tempId);
                });
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
                const newItems = result.assets.map(asset => {
                    const tempId = Math.random().toString(36).substring(7);
                    return {
                        tempId,
                        uri: asset.uri,
                        type: 'document', // Backend handles as file
                        name: asset.name,
                        uploading: true,
                        uploaded: false
                    };
                });
                setAttachments(prev => [...prev, ...newItems]);
                newItems.forEach(item => {
                    uploadAttachment(item, item.tempId);
                });
            }
        } catch (err) { console.log(err); }
        setShowAttachMenu(false);
    }

    const handleWebUploadFlow = async () => {
        const result = await startWebUpload({ type: 'chat' });
        if (result.success && result.url) {
            const newAttachment = {
                uri: result.url,
                type: 'image', // Assume image for now or detect from URL
                name: 'BrowserUpload.jpg',
                isWebUpload: true,
                publicId: result.publicId
            };
            setAttachments(prev => [...prev, newAttachment]);
        } else if (result.message && result.message !== 'Upload cancelled or failed' && result.message !== 'Upload cancelled') {
            alert(result.message);
        }
        setShowAttachMenu(false);
    };

    const handleGroupIconWebUpload = async () => {
        const result = await startWebUpload({ type: 'profile' }); // Reuse profile type for logos
        if (result.success && result.url) {
            setUploadingMedia(true);
            const res = await clubsAPI.update(clubId, {
                logoUrl: result.url,
                publicId: result.publicId
            });

            if (res.success) {
                alert('Group icon updated!');
                fetchMessages();
            } else {
                alert('Failed to update group icon');
            }
            setUploadingMedia(false);
        }
    };



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

    const handleCreatePoll = async (pollData) => {
        setShowPollModal(false);
        try {
            const res = await groupChatAPI.sendMessage(clubId, {
                type: 'poll',
                pollData
            });
            if (res.success) {
                // Socket will handle the update for everyone, but we update locally too if needed
                // Message is already sent and handled by existing logic
            }
        } catch (err) {
            console.error('Poll creation error:', err);
            alert('Failed to create poll');
        }
    };

    const handleCreateSpinner = async (spinnerData) => {
        setShowSpinnerModal(false);
        try {
            const res = await groupChatAPI.sendMessage(clubId, {
                type: 'spinner',
                spinnerData
            });
            if (res.success) {
                // Done
            }
        } catch (err) {
            console.error('Spinner creation error:', err);
            alert('Failed to create spinner');
        }
    };

    const handleMessageUpdateSync = ({ messageId, pollData, spinnerData }) => {
        setMessages(prev => prev.map(m => {
            if (m._id === messageId) {
                return { ...m, pollData: pollData || m.pollData, spinnerData: spinnerData || m.spinnerData };
            }
            return m;
        }));
    };

    const handleVote = useCallback(async (messageId, optionIndex) => {
        if (!user?._id) return;

        // Optimistic update
        setMessages(prev => prev.map(m => {
            if (m._id === messageId && m.pollData) {
                const newPollData = JSON.parse(JSON.stringify(m.pollData));
                const opt = newPollData.options[optionIndex];
                const userId = user._id;

                // Toggle vote logic
                const alreadyVotedIndex = opt.votes.indexOf(userId);
                if (alreadyVotedIndex > -1) {
                    opt.votes.splice(alreadyVotedIndex, 1);
                } else {
                    // Logic for maxVotes
                    const maxVotes = newPollData.maxVotes || 1;
                    let userTotalVotes = 0;
                    newPollData.options.forEach(o => {
                        if (o.votes.includes(userId)) userTotalVotes++;
                    });

                    if (userTotalVotes >= maxVotes) {
                        if (maxVotes === 1) {
                            // Replace existing vote
                            newPollData.options.forEach(o => {
                                const vIdx = o.votes.indexOf(userId);
                                if (vIdx > -1) o.votes.splice(vIdx, 1);
                            });
                        } else {
                            return m; // Can't vote more
                        }
                    }
                    opt.votes.push(userId);
                }
                return { ...m, pollData: newPollData };
            }
            return m;
        }));

        try {
            const res = await groupChatAPI.votePoll(clubId, messageId, { optionIndex });
            if (res.success) {
                // Sync with server truth
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, pollData: res.pollData } : m));
            }
        } catch (err) {
            console.error('Vote error:', err);
            fetchMessages(); // Rollback to server state
        }
    }, [clubId, user?._id]);

    const handleSpin = useCallback(async (messageId, items, reset = false) => {
        try {
            if (reset) {
                await groupChatAPI.updateSpinner(clubId, messageId, { status: 'idle', result: null });
                return;
            }

            // 1. Set status to spinning
            await groupChatAPI.updateSpinner(clubId, messageId, { status: 'spinning' });

            // 2. Wait for animation then set result
            setTimeout(async () => {
                const winner = items[Math.floor(Math.random() * items.length)];
                await groupChatAPI.updateSpinner(clubId, messageId, {
                    status: 'completed',
                    result: winner
                });
            }, 3000);

        } catch (err) {
            console.error('Spin error:', err);
        }
    }, [clubId]);

    useEffect(() => {
        fetchMessages();
        markRead();

        if (socket) {
            if (isGroupChat) {
                // Group chat socket listeners
                socket.emit('club:join', clubId);
                socket.on('group:message', handleReceiveMessage);
                socket.on('group:message:delete', handleDeleteSync);
                socket.on('group:message:reaction', handleReactionSync);
                socket.on('group:message:update', handleMessageUpdateSync);
                socket.on('group:typing', handleTypingStatus);
                socket.on('club:members:update', fetchMessages);
                socket.on('group:message:read', handleGroupReadSync);
            } else {
                // Individual chat socket listeners
                socket.on('message:receive', handleReceiveMessage);
                socket.on('message:typing', handleTypingStatus);
                socket.on('message:delete', handleDeleteSync);
                socket.on('message:reaction', handleReactionSync);
                socket.on('message:read', handleReadSync);
            }
        }

        return () => {
            if (socket) {
                // Clear typing status on exit
                socket.emit('message:typing', {
                    receiverId: isGroupChat ? null : otherUser?._id,
                    clubId: isGroupChat ? clubId : null,
                    isTyping: false,
                    senderId: user._id
                });
                if (isGroupChat) {
                    socket.off('group:message', handleReceiveMessage);
                    socket.off('group:message:delete', handleDeleteSync);
                    socket.off('group:message:reaction', handleReactionSync);
                    socket.off('group:typing', handleTypingStatus);
                    socket.off('club:members:update');
                    socket.off('group:message:read', handleGroupReadSync);
                } else {
                    socket.off('message:receive', handleReceiveMessage);
                    socket.off('message:typing', handleTypingStatus);
                    socket.off('message:delete', handleDeleteSync);
                    socket.off('message:reaction', handleReactionSync);
                    socket.off('message:read', handleReadSync);
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
                        setMessages(prev => {
                            const merged = [...prev];
                            res.data.messages.forEach(m => {
                                const idx = merged.findIndex(old => old._id === m._id);
                                if (idx === -1) merged.push(m);
                                else merged[idx] = m;
                            });
                            return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        });
                    }
                }
            } else {
                const res = await messagesAPI.getMessages(otherUser._id);
                if (res.success) {
                    setMessages(prev => {
                        const merged = [...prev];
                        res.data.forEach(m => {
                            const idx = merged.findIndex(old => old._id === m._id);
                            if (idx === -1) merged.push(m);
                            else merged[idx] = m;
                        });
                        return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    });
                }
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
        const currentConversationId = !isGroupChat && otherUser?._id ? [user._id.toString(), otherUser._id.toString()].sort().join('-') : null;

        const isRelevantMessage = isGroupChat ? (
            isAIMessage || true
        ) : (
            isAIMessage ? (
                // AI messages are relevant if they belong to this conversation
                (message.conversationId && message.conversationId === currentConversationId) ||
                message.receiverId === user._id ||
                message.senderId === otherUser?._id ||
                // Fallback for missing/mismatched IDs
                message.replyTo?.senderId === user._id ||
                message.replyTo === lastSentMessageId
            ) : (
                message.senderId?._id === otherUser?._id ||
                message.receiverId?._id === otherUser?._id ||
                message.senderId === otherUser?._id ||
                message.receiverId === otherUser?._id
            )
        );

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

    const handleReadSync = ({ readerId, senderId }) => {
        if (senderId === user._id) {
            setMessages(prev => prev.map(m =>
                (m.receiverId === readerId || m.receiverId?._id === readerId) ? { ...m, read: true } : m
            ));
        }
    };

    const handleGroupReadSync = ({ userId: readerId }) => {
        setMessages(prev => prev.map(m => {
            if (m.senderId !== readerId && !m.readBy?.some(r => (r.userId?._id || r.userId) === readerId)) {
                return { ...m, readBy: [...(m.readBy || []), { userId: readerId, readAt: new Date() }] };
            }
            return m;
        }));
    };

    const handleShowVoters = (msgId, optIdx, optText) => {
        setVoterModal({ visible: true, messageId: msgId, optionIndex: optIdx, optionText: optText });
    };

    const handleUpdateGroupIcon = async () => {
        if (!isGroupAdmin) {
            alert('Only group admins can change the icon');
            return;
        }
        if (Platform.OS === 'android') {
            setShowGroupIconModalChoice(true);
        } else {
            handleNativeGroupIconPick();
        }
    };

    const handleNativeGroupIconPick = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.3,
                base64: true, // Enable base64 for Android
                allowsEditing: true,
                aspect: [1, 1],
            });

            if (!result.canceled) {
                setUploadingMedia(true);
                const asset = result.assets[0];
                const base64Img = `data:image/jpeg;base64,${asset.base64}`;

                const res = await clubsAPI.updateLogoBase64(clubId, { logo: base64Img });

                if (res.success) {
                    alert('Group icon updated!');
                    fetchMessages();
                } else {
                    alert('Failed to update group icon');
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
        if (socket) {
            socket.emit('message:typing', {
                receiverId: isGroupChat ? null : otherUser?._id,
                clubId: isGroupChat ? clubId : null,
                isTyping: text.length > 0,
                senderId: user._id
            });
        }
    };

    const toggleReaction = async (messageId, emoji) => {
        // 1. Close UI immediately for best responsiveness
        setShowOptionsId(null);

        try {
            const myUserId = user._id?.toString();

            // 2. Optimistic Update
            setMessages(prev => prev.map(m => {
                if (m._id === messageId) {
                    const currentReactions = m.reactions || [];

                    // Robust check for existing reaction using string comparison
                    const myExistingReactionIndex = currentReactions.findIndex(r => {
                        const rUserId = (r.userId?._id || r.userId)?.toString();
                        return r.emoji === emoji && rUserId === myUserId;
                    });

                    let newReactions;
                    if (myExistingReactionIndex > -1) {
                        // Remove instantly
                        newReactions = currentReactions.filter((_, i) => i !== myExistingReactionIndex);
                    } else {
                        // Add instantly
                        newReactions = [...currentReactions, { emoji, userId: user._id }];
                    }

                    return { ...m, reactions: newReactions };
                }
                return m;
            }));

            // 3. API Call in background
            let res;
            if (isGroupChat) {
                res = await groupChatAPI.addReaction(clubId, messageId, { emoji });
            } else {
                res = await messagesAPI.addReaction(messageId, { emoji });
            }

            // 4. Final Sync with server
            if (res.success) {
                setMessages(prev => prev.map(m =>
                    m._id === messageId ? { ...m, reactions: res.data } : m
                ));
            }
        } catch (error) {
            console.log('Error reacting:', error);
            // On hard error, resync to be safe
            fetchMessages();
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

    const confirmDeleteMessage = () => {
        const idsToDelete = isSelectionMode ? [...selectedMessages] : [messageToDelete];
        if (idsToDelete.length === 0) return;

        // 1. Optimistic UI Update - Remove instantly from background list
        setMessages(prev => prev.filter(m => !idsToDelete.includes(m._id)));
        setDeleting(true); // Show brief loading spinner in modal

        // 2. Clear selection state
        setSelectedMessages([]);
        setMessageToDelete(null);
        setShowOptionsId(null);

        // 3. Initiate Background deletion (don't await)
        idsToDelete.forEach(id => {
            const deleteCall = isGroupChat
                ? groupChatAPI.deleteMessage(clubId, id, deleteType)
                : messagesAPI.deleteMessage(id, deleteType);

            deleteCall.catch(err => console.error(`Background delete failed for ${id}:`, err));
        });

        // 4. Brief 500ms delay for visual feedback then close modal
        // This makes the UI feel responsive yet professional
        setTimeout(() => {
            setDeleting(false);
            setDeleteConfirmModalVisible(false);
        }, 500);
    };

    const renderMessage = useCallback(({ item, index }) => {
        const showDateLabel = index === 0 || (index > 0 && isDifferentDay(messages[index - 1].createdAt, item.createdAt));

        return (
            <View key={item._id}>
                {showDateLabel && (
                    <View style={styles.dateLabelContainer}>
                        <View style={styles.dateLabelLine} />
                        <View style={styles.dateLabelBadge}>
                            <Text style={styles.dateLabelText}>{getDateLabel(item.createdAt)}</Text>
                        </View>
                        <View style={styles.dateLabelLine} />
                    </View>
                )}
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
                    onVote={handleVote}
                    onSpin={handleSpin}
                    clubId={clubId}
                    onShowVoters={handleShowVoters}
                />
            </View>
        );
    }, [user?._id, otherUser?._id, messages, selectedMessages, isSelectionMode, toggleSelection, isGroupChat, setMediaViewerData, setShowMediaViewer, setReactionDetailsData, setShowReactionDetails, handleVote, handleSpin, clubId, handleShowVoters]);

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
                                            ? (isTyping ? 'Someone is typing...' : `${localGroupData?.members?.length || 0} members`)
                                            : (isTyping ? 'typing...' : (otherUser?.isOnline ? 'online' : formatLastSeen(otherUser?.lastSeen)))}
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
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                                contentContainerStyle={[styles.messageList, { paddingBottom: 20 }]}
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
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                onContentSizeChange={() => {
                                    if (isAtBottom && !isSelectionMode) {
                                        // Use a small timeout to ensure the list has rendered the new content
                                        setTimeout(() => {
                                            flatListRef.current?.scrollToEnd({ animated: true });
                                        }, 100);
                                    }
                                }}
                            />
                        )}

                        {/* Scroll to Bottom Button */}
                        {showScrollToBottom && (
                            <TouchableOpacity
                                style={styles.scrollToBottomBtn}
                                onPress={scrollToBottom}
                            >
                                <Ionicons name="chevron-down" size={24} color="#FFF" />
                                {refreshUnreadMessageCount > 0 && (
                                    <View style={styles.scrollBadge}>
                                        <Text style={styles.scrollBadgeText}>{refreshUnreadMessageCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Input Area - Outside the scrollable area */}
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
                                            style={[styles.attachOption, { backgroundColor: '#F59E0B' }]}
                                            onPress={() => {
                                                setShowAttachMenu(false);
                                                setShowPollModal(true);
                                            }}
                                        >
                                            <Ionicons name="bar-chart" size={26} color="#FFF" />
                                        </TouchableOpacity>
                                        <Text style={styles.attachLabelText}>Poll</Text>
                                    </View>
                                </View>

                                {isGroupChat && (
                                    <View style={styles.attachRow}>
                                        <View style={styles.attachOptionContainer}>
                                            <TouchableOpacity
                                                style={[styles.attachOption, { backgroundColor: '#FF8C00' }]}
                                                onPress={async () => {
                                                    setShowAttachMenu(false);
                                                    // Fetch members first
                                                    try {
                                                        const res = await clubsAPI.getMembers(clubId);
                                                        if (res.success) setClubMembers(res.data);
                                                    } catch (err) { console.error(err); }
                                                    setShowSpinnerModal(true);
                                                }}
                                            >
                                                <Ionicons name="sync-circle" size={28} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.attachLabelText}>Spinner</Text>
                                        </View>
                                        <View style={styles.attachOptionContainer}>
                                            <Pressable
                                                style={({ pressed }) => [
                                                    styles.attachOption,
                                                    { backgroundColor: '#4361EE', opacity: pressed ? 0.8 : 1 }
                                                ]}
                                                onPress={handleWebUploadFlow}
                                            >
                                                <Ionicons name="globe" size={26} color="#FFF" />
                                            </Pressable>
                                            <Text style={styles.attachLabelText}>Browser</Text>
                                        </View>
                                        <View style={[styles.attachOptionContainer, { opacity: 0 }]} pointerEvents='none'>
                                            <View style={styles.attachOption} />
                                        </View>
                                    </View>
                                )}

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
                                                    {att.uploading && (
                                                        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                                                            <ActivityIndicator size="small" color="#0A66C2" />
                                                        </View>
                                                    )}
                                                    {att.uploaded && (
                                                        <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: '#10B981', borderRadius: 8, padding: 1 }}>
                                                            <Ionicons name="checkmark-circle" size={12} color="#FFF" />
                                                        </View>
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

                                    {isRecording ? (
                                        <Animated.View style={[
                                            styles.recordingOverlay,
                                            {
                                                opacity: recordingAnimValue.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.7, 1]
                                                })
                                            }
                                        ]}>
                                            <Animated.View style={[
                                                styles.recordingDot,
                                                {
                                                    transform: [{
                                                        scale: recordingAnimValue.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [1, 1.5]
                                                        })
                                                    }]
                                                }
                                            ]} />
                                            <Animated.View style={[
                                                styles.recordingWave,
                                                {
                                                    transform: [{
                                                        scale: recordingAnimValue.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [1, 2]
                                                        })
                                                    }],
                                                    opacity: recordingAnimValue.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.5, 0]
                                                    })
                                                }
                                            ]} />
                                            <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
                                            <Text style={styles.recordingHint}>Recording voice note...</Text>
                                            <TouchableOpacity onPress={() => stopRecording(false)} style={styles.cancelRecord}>
                                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                                                <Text style={styles.cancelText}>Cancel</Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    ) : (
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
                                    )}

                                    <View style={styles.inputActions}>
                                        {!isRecording && (
                                            <>
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
                                            </>
                                        )}
                                    </View>
                                </View>

                                {inputText.length > 0 || attachments.length > 0 || isRecording ? (
                                    <TouchableOpacity
                                        style={styles.sendButton}
                                        onPress={() => isRecording ? stopRecording(true) : sendMessage()}
                                    >
                                        <Ionicons name={isRecording ? "checkmark" : "send"} size={20} color="#FFF" />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.micButton}
                                        onLongPress={startRecording}
                                        onPress={startRecording} // Start on simple tap too for ease
                                    >
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

                                            {/* Hide Forward for Polls and Spinners */}
                                            {msg.type !== 'poll' && msg.type !== 'spinner' && (
                                                <TouchableOpacity style={styles.menuItem} onPress={() => {
                                                    setMessageToForward(msg);
                                                    setShowForwardModal(true);
                                                    setShowOptionsId(null);
                                                }}>
                                                    <Ionicons name="arrow-redo-outline" size={20} color="#374151" />
                                                    <Text style={styles.menuText}>Forward</Text>
                                                </TouchableOpacity>
                                            )}

                                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                                                toggleSelection(msg._id);
                                                setShowOptionsId(null);
                                            }}>
                                                <Ionicons name="checkbox-outline" size={20} color="#374151" />
                                                <Text style={styles.menuText}>Select</Text>
                                            </TouchableOpacity>

                                            {/* Viewed By - only for sender in group chat */}
                                            {isGroupChat && (msg.senderId?._id || msg.senderId) === user._id && (
                                                <TouchableOpacity style={styles.menuItem} onPress={() => {
                                                    setViewedByMessageId(msg._id);
                                                    setShowViewedByModal(true);
                                                    setShowOptionsId(null);
                                                }}>
                                                    <Ionicons name="eye-outline" size={20} color="#374151" />
                                                    <Text style={styles.menuText}>Viewed By</Text>
                                                </TouchableOpacity>
                                            )}
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
                                <Text style={styles.profileEmail}>{otherUser?.email || 'Member of Aura'}</Text>
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

                {/* Poll Modal */}
                <PollModal
                    visible={showPollModal}
                    onClose={() => setShowPollModal(false)}
                    onCreate={handleCreatePoll}
                />

                {/* Spinner Modal */}
                <SpinnerModal
                    visible={showSpinnerModal}
                    onClose={() => setShowSpinnerModal(false)}
                    onCreate={handleCreateSpinner}
                    members={clubMembers}
                />

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
                                style={{ width: '100%', marginBottom: 20, maxHeight: 400 }}
                                nestedScrollEnabled={true}
                                scrollEnabled={true}
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
                                    {deleting ? (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <ActivityIndicator size="small" color="#0A66C2" />
                                            <Text style={{ marginTop: 10, color: '#6B7280' }}>Deleting messages...</Text>
                                        </View>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.deleteConfirmActions}>
                                    {deleting ? (
                                        <ActivityIndicator size="small" color="#0A66C2" style={{ flex: 1 }} />
                                    ) : (
                                        <>
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
                                        </>
                                    )}
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
                    <View style={[styles.optionsPopup, { height: '55%', paddingVertical: 20 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 }}>
                            <View style={{ width: 40 }} />
                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937' }}>React</Text>
                            <TouchableOpacity
                                onPress={() => setShowReactionPicker(false)}
                                style={{ backgroundColor: '#F3F4F6', padding: 5, borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
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
            </Modal >

            {/* Media Viewer Modal */}
            < Modal
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
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowReactionDetails(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
                    activeOpacity={1}
                    onPress={() => setShowReactionDetails(false)}
                >
                    <View style={{ backgroundColor: '#FFF', width: '85%', maxHeight: '60%', borderRadius: 25, padding: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 20, alignSelf: 'center', color: '#1F2937' }}>Reactions</Text>

                        {/* Summary at top */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 15 }}>
                            {(() => {
                                const counts = reactionDetailsData.reduce((acc, curr) => {
                                    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                    return acc;
                                }, {});
                                return Object.entries(counts).map(([emoji, count]) => (
                                    <View key={emoji} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 }}>
                                        <Text style={{ fontSize: 18, marginRight: 4 }}>{emoji}</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#4B5563' }}>{count}</Text>
                                    </View>
                                ));
                            })()}
                        </View>

                        <FlatList
                            data={reactionDetailsData}
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                                        <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                                    </View>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                                        {item.userId?.displayName || item.senderId?.displayName || item.user?.displayName || 'Member'}
                                    </Text>
                                </View>
                            )}
                        />
                        <TouchableOpacity
                            onPress={() => setShowReactionDetails(false)}
                            style={{ marginTop: 20, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 15 }}
                        >
                            <Text style={{ fontWeight: '700', color: '#4B5563' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal >
            <MediaUploadModal
                visible={showGroupIconModalChoice}
                onClose={() => setShowGroupIconModalChoice(false)}
                onNativePick={handleNativeGroupIconPick}
                onWebUpload={handleGroupIconWebUpload}
            />
            <VoterListModal
                visible={voterModal.visible}
                clubId={clubId}
                messageId={voterModal.messageId}
                optionIndex={voterModal.optionIndex}
                optionText={voterModal.optionText}
                onClose={() => setVoterModal(prev => ({ ...prev, visible: false }))}
                pollData={messages.find(m => m._id === voterModal.messageId)?.pollData}
            />
            <ViewedByModal
                visible={showViewedByModal}
                clubId={clubId}
                messageId={viewedByMessageId}
                onClose={() => {
                    setShowViewedByModal(false);
                    setViewedByMessageId(null);
                }}
            />
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
    },
    reactionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 1,
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
    dateLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 15,
        paddingHorizontal: 20,
    },
    dateLabelLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    dateLabelBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 15,
        marginHorizontal: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dateLabelText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
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
    recordingOverlay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        backgroundColor: '#FEF3F2',
        borderRadius: 20,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
        marginRight: 10,
    },
    recordingWave: {
        position: 'absolute',
        left: 15,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
    },
    recordingTime: {
        fontSize: 16,
        fontWeight: '700',
        color: '#EF4444',
        marginRight: 10,
    },
    recordingHint: {
        fontSize: 12,
        color: '#DC2626',
        fontStyle: 'italic',
        flex: 1,
    },
    cancelRecord: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#FFF',
        borderRadius: 15,
        gap: 5,
    },
    cancelText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 14,
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
    recordingOverlay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
        marginRight: 8,
    },
    recordingTime: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '700',
        flex: 1,
    },
    cancelRecord: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
        backgroundColor: '#F3F4F6',
    },
    cancelText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 14,
    },
    pollContainer: {
        width: 250,
        padding: 5,
    },
    pollQuestion: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    pollOption: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        height: 40,
        marginBottom: 8,
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    pollBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: '#D1E5FF',
    },
    pollOptionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        zIndex: 1,
    },
    pollOptionText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
    },
    pollOptionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    pollVoteCount: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '700',
    },
    pollFooter: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 5,
    },
    spinnerContainer: {
        width: 240,
        padding: 10,
        alignItems: 'center',
    },
    spinnerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 8,
    },
    spinnerIcon: {
        fontSize: 22,
    },
    spinnerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
    },
    spinnerInner: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 8,
        borderColor: '#F3F4F6',
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    spinningActive: {
        borderColor: '#0A66C2',
        borderStyle: 'dashed',
    },
    spinningText: {
        color: '#0A66C2',
        fontWeight: '800',
        fontSize: 14,
    },
    winnerBox: {
        alignItems: 'center',
    },
    winnerText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0A66C2',
        textAlign: 'center',
    },
    winnerLabel: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '800',
        marginTop: 5,
    },
    idleText: {
        color: '#9CA3AF',
        fontWeight: '600',
    },
    spinBtn: {
        backgroundColor: '#0A66C2',
        paddingHorizontal: 30,
        paddingVertical: 10,
        borderRadius: 20,
    },
    spinBtnText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 14,
    },
    scrollToBottomBtn: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 100,
    },
    scrollBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    scrollBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
});

export default ChatScreen;
