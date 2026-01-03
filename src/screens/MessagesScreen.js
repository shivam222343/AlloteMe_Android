import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    TextInput,
    RefreshControl,
    ScrollView,
    Dimensions,
    Modal,
    Platform,
    Alert,
    TouchableWithoutFeedback,
    ActivityIndicator, // Added ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MainLayout from '../components/MainLayout';
import GroupChatCard from '../components/GroupChatCard';
import { useAuth } from '../contexts/AuthContext';
import { messagesAPI, clubsAPI, membersAPI, snapsAPI, groupChatAPI } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const MessagesScreen = ({ navigation }) => {
    const { user, socket, selectedClubId, updateSelectedClub } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [groupChats, setGroupChats] = useState([]); // Group chat state
    // Initialize with global state to prevent flickering
    const [selectedClub, setSelectedClub] = useState(selectedClubId || null);
    const [clubMembers, setClubMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [snaps, setSnaps] = useState([]);
    const [viewingSnaps, setViewingSnaps] = useState(null); // Stores { user, snaps, index }
    const [snapModalVisible, setSnapModalVisible] = useState(false);
    const [viewers, setViewers] = useState([]);
    const [viewersModalVisible, setViewersModalVisible] = useState(false);
    const [editCaptionModalVisible, setEditCaptionModalVisible] = useState(false);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [snapToDelete, setSnapToDelete] = useState(null);

    // Listen for new snaps
    useEffect(() => {
        if (socket) {
            socket.on('snap:new', () => {
                fetchData(); // Refresh to show new snap
            });
            return () => {
                socket.off('snap:new');
            };
        }
    }, [socket]);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [newCaption, setNewCaption] = useState('');
    const [editingSnapId, setEditingSnapId] = useState(null);
    const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch conversations and clubs
            const [conversationsRes, clubsRes] = await Promise.all([
                messagesAPI.getConversations(),
                clubsAPI.getAll() // Fetch user's clubs
            ]);

            if (conversationsRes.success) setConversations(conversationsRes.data);
            if (clubsRes.success) {
                // Filter clubs to only show those the user has joined
                const userClubIds = user.clubsJoined.map(c =>
                    (c.clubId?._id || c.clubId).toString()
                );
                const joinedClubs = clubsRes.data.filter(club =>
                    userClubIds.includes(club._id.toString())
                );
                setClubs(joinedClubs);

                // Fetch group chats for all joined clubs
                const groupChatPromises = joinedClubs.map(async (club) => {
                    try {
                        const clubId = club._id?.toString() || club._id;
                        const res = await groupChatAPI.getGroupChat(clubId);
                        if (res && res.success) {
                            return {
                                ...res.data,
                                club: club
                            };
                        }
                        return null;
                    } catch (err) {
                        console.log(`Error fetching group chat for ${club.name}:`, err);
                        return null;
                    }
                });

                const groupChatResults = await Promise.all(groupChatPromises);
                const validGroupChats = groupChatResults.filter(chat => chat !== null);

                console.log('Group chats loaded:', validGroupChats.length);
                setGroupChats(validGroupChats);

                // Only set initial club if not already set (prevents flickering on refresh)
                if (!selectedClub && joinedClubs.length > 0) {
                    // Sync with global club selection
                    if (selectedClubId && selectedClubId !== 'all') {
                        const sId = selectedClubId?._id || selectedClubId;
                        const globalClub = joinedClubs.find(c => (c._id?.toString() || c._id) === sId.toString());
                        if (globalClub) {
                            setSelectedClub(globalClub._id);
                        } else {
                            setSelectedClub(joinedClubs[0]._id);
                            updateSelectedClub(joinedClubs[0]._id);
                        }
                    } else {
                        setSelectedClub(joinedClubs[0]._id);
                        updateSelectedClub(joinedClubs[0]._id);
                    }
                }
            }

            // Fetch snaps for the selected club
            try {
                if (selectedClub) {
                    const snapsRes = await snapsAPI.getClubSnaps(selectedClub);
                    if (snapsRes.success) setSnaps(snapsRes.data);
                } else {
                    setSnaps([]);
                }
            } catch (snapError) {
                console.error('Error fetching snaps:', snapError);
                setSnaps([]);
            }
        } catch (error) {
            console.error('Error fetching messages data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Sync with global club selection on mount and when it changes
    useEffect(() => {
        if (selectedClubId && selectedClubId !== 'all' && clubs.length > 0) {
            const globalClub = clubs.find(c => c._id === selectedClubId);
            // Only update if different to prevent unnecessary re-renders
            if (globalClub && selectedClub !== globalClub._id) {
                setSelectedClub(globalClub._id);
            }
        }
    }, [selectedClubId, clubs]);

    const handleViewSnaps = (snapGroup) => {
        setViewingSnaps({ ...snapGroup, index: 0 });
        setIsCaptionExpanded(false);
        setSnapModalVisible(true);
        // Mark first snap as viewed
        if (snapGroup.snaps[0]) {
            snapsAPI.view(snapGroup.snaps[0]._id);
        }
    };

    const nextSnap = () => {
        if (!viewingSnaps) return;
        if (viewingSnaps.index < viewingSnaps.snaps.length - 1) {
            const nextIdx = viewingSnaps.index + 1;
            setViewingSnaps({ ...viewingSnaps, index: nextIdx });
            setIsCaptionExpanded(false);
            snapsAPI.view(viewingSnaps.snaps[nextIdx]._id);
        } else {
            setSnapModalVisible(false);
            setIsCaptionExpanded(false);
        }
    };

    const [replySuccess, setReplySuccess] = useState(false);

    const handleDeleteSnap = async (snapId) => {
        setSnapToDelete(snapId);
        setDeleteConfirmModalVisible(true);
    };

    const confirmDeleteSnap = async () => {
        if (!snapToDelete) return;
        try {
            const res = await snapsAPI.delete(snapToDelete);
            if (res.success) {
                setDeleteConfirmModalVisible(false);
                setSnapModalVisible(false);
                setSnapToDelete(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error deleting snap:', error);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !viewingSnaps) return;
        setSendingReply(true);
        try {
            const currentSnap = viewingSnaps.snaps[viewingSnaps.index];
            const replyMsg = `Replying to snap: ${currentSnap.caption || 'Photo'}\n\n${replyText}`;

            const res = await messagesAPI.send({
                receiverId: viewingSnaps.user._id,
                content: replyMsg,
                type: 'text'
            });

            if (res.success) {
                setReplyText('');
                setReplySuccess(true);
                setTimeout(() => {
                    setReplySuccess(false);
                    setSnapModalVisible(false); // Close snap viewer
                    navigation.navigate('Chat', { otherUser: viewingSnaps.user }); // Navigate to chat
                }, 1000);
            }
        } catch (error) {
            console.error('Error sending snap reply:', error);
        } finally {
            setSendingReply(false);
        }
    };

    const fetchViewersList = async (snapId) => {
        try {
            const res = await snapsAPI.getViewers(snapId);
            if (res.success) {
                setViewers(res.data);
                setViewersModalVisible(true);
            }
        } catch (error) {
            console.error('Error fetching viewers:', error);
        }
    };

    const handleUpdateCaption = async () => {
        if (!editingSnapId) return;
        try {
            const res = await snapsAPI.updateCaption(editingSnapId, newCaption);
            if (res.success) {
                setEditCaptionModalVisible(false);
                setViewingSnaps(prev => {
                    const updatedSnaps = [...prev.snaps];
                    updatedSnaps[prev.index] = { ...updatedSnaps[prev.index], caption: newCaption };
                    return { ...prev, snaps: updatedSnaps };
                });
                fetchData();
            }
        } catch (error) {
            console.error('Error updating caption:', error);
        }
    };

    const fetchClubMembers = async (clubId) => {
        if (!clubId) {
            setClubMembers([]);
            return;
        }
        try {
            const res = await membersAPI.getAll(clubId);
            if (res.success) {
                // Filter out current user
                setClubMembers(res.data.filter(m => m._id.toString() !== user._id.toString()));
            }
        } catch (error) {
            console.error('Error fetching club members:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    useEffect(() => {
        fetchClubMembers(selectedClub);
        // Also refresh snaps when club changes
        if (selectedClub && selectedClub !== 'all') {
            snapsAPI.getClubSnaps(selectedClub)
                .then(res => {
                    if (res.success) setSnaps(res.data);
                })
                .catch(err => {
                    console.error('Error fetching snaps:', err);
                    setSnaps([]);
                });
        } else {
            setSnaps([]);
        }
    }, [selectedClub]);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
            fetchData(); // Refresh list to update last message and unread count
        };

        socket.on('message:receive', handleNewMessage);
        socket.on('message:delete', handleNewMessage);
        socket.on('group:message', handleNewMessage); // Added: Refresh list on group message
        socket.on('group:message:delete', handleNewMessage); // Added: Refresh list on group message delete
        socket.on('snap:new', (snap) => {
            if (!selectedClub || snap.clubId === selectedClub) {
                fetchData();
            }
        });

        socket.on('snap:delete', (snapId) => {
            fetchData();
        });

        return () => {
            socket.off('message:receive', handleNewMessage);
            socket.off('message:delete', handleNewMessage);
            socket.off('group:message', handleNewMessage);
            socket.off('group:message:delete', handleNewMessage);
            socket.off('snap:new');
            socket.off('snap:delete');
        };
    }, [socket]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filteredConversations = conversations.filter(conv => {
        const matchesSearch = conv.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase());
        if (!selectedClub) return matchesSearch;

        // Filter by selected club
        const isInClub = (conv.otherUser.clubsJoined || []).some(c =>
            (c.clubId?._id || c.clubId || '').toString() === selectedClub.toString()
        );
        return matchesSearch && isInClub;
    });

    const renderSnapItem = ({ item }) => {
        const hasUnviewed = item.snaps.some(s => !s.viewedBy.some(v => v.userId === user._id));
        return (
            <TouchableOpacity style={styles.snapItem} onPress={() => handleViewSnaps(item)}>
                <LinearGradient
                    colors={hasUnviewed ? ['#FF4B2B', '#FF416C'] : ['#D1D5DB', '#9CA3AF']}
                    style={styles.snapGradient}
                >
                    <View style={styles.snapImageContainer}>
                        {item.user.profilePicture?.url ? (
                            <Image source={{ uri: item.user.profilePicture.url }} style={styles.snapImage} />
                        ) : (
                            <View style={styles.snapPlaceholder}>
                                <Ionicons name="person" size={24} color="#FFF" />
                            </View>
                        )}
                    </View>
                </LinearGradient>
                <Text style={styles.snapName} numberOfLines={1}>{(item.user?.displayName || 'User').split(' ')[0]}</Text>
            </TouchableOpacity>
        );
    };

    const renderClubChip = (club) => {
        const isSelected = selectedClub === club._id;
        return (
            <TouchableOpacity
                key={club._id}
                style={[styles.clubChip, isSelected && styles.clubChipActive]}
                onPress={() => {
                    setSelectedClub(club._id);
                    updateSelectedClub(club._id);
                }}
            >
                <Text style={[styles.clubChipText, isSelected && styles.clubChipTextActive]}>
                    {club.name}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderMemberListItem = ({ item }) => (
        <TouchableOpacity
            style={styles.memberItem}
            onPress={() => navigation.navigate('Chat', { otherUser: item })}
        >
            <View style={styles.memberAvatarContainer}>
                {item?.profilePicture?.url ? (
                    <Image source={{ uri: item.profilePicture.url }} style={styles.memberAvatar} />
                ) : (
                    <View style={styles.memberPlaceholder}>
                        <Text style={styles.placeholderText}>{item?.displayName?.charAt(0) || '?'}</Text>
                    </View>
                )}
                {item?.isOnline && <View style={styles.onlineIndicator} />}
            </View>
            <Text style={styles.memberName} numberOfLines={1}>{item?.displayName || 'Member'}</Text>
        </TouchableOpacity>
    );

    const renderConversationItem = ({ item }) => {
        const { otherUser, lastMessage, unreadCount } = item;
        const time = new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <TouchableOpacity
                style={styles.convItem}
                onPress={() => navigation.navigate('Chat', { otherUser: otherUser })}
            >
                <View style={styles.convAvatarContainer}>
                    {otherUser?.profilePicture?.url ? (
                        <Image source={{ uri: otherUser.profilePicture.url }} style={styles.convAvatar} />
                    ) : (
                        <View style={styles.convPlaceholder}>
                            <Text style={styles.placeholderText}>{otherUser?.displayName?.charAt(0) || '?'}</Text>
                        </View>
                    )}
                    {otherUser?.isOnline && <View style={styles.onlineIndicator} />}
                </View>

                <View style={styles.convContent}>
                    <View style={styles.convHeader}>
                        <Text style={styles.convName}>{otherUser?.displayName || 'Chat'}</Text>
                        <Text style={styles.convTime}>{time}</Text>
                    </View>
                    <View style={styles.convFooter}>
                        <Text style={styles.convLastMsg} numberOfLines={1}>
                            {lastMessage.deleted ? 'Message deleted' : lastMessage.content || 'Sent an attachment'}
                        </Text>
                        {unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <MainLayout navigation={navigation} title="Messages" currentRoute="Messages">
            <View style={styles.container}>
                {/* Check if user has joined any clubs */}
                {clubs.length === 0 ? (
                    <View style={styles.noClubsContainer}>
                        <Ionicons name="people-outline" size={80} color="#D1D5DB" />
                        <Text style={styles.noClubsTitle}>Join a Club to Start Chatting</Text>
                        <Text style={styles.noClubsText}>
                            You need to join at least one club to access messages and connect with other members.
                        </Text>
                        <TouchableOpacity
                            style={styles.joinClubButton}
                            onPress={() => navigation.navigate('Members')}
                        >
                            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                            <Text style={styles.joinClubButtonText}>Browse Clubs</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search chats..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        >
                            {/* Club Filter */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Clubs</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clubScroll}>
                                {clubs.map(renderClubChip)}
                            </ScrollView>

                            {/* Member List Overlay (if club selected) */}
                            {clubMembers.length > 0 && (
                                <View style={styles.membersContainer}>
                                    <FlatList
                                        data={clubMembers}
                                        renderItem={renderMemberListItem}
                                        keyExtractor={item => item._id}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.memberList}
                                    />
                                </View>
                            )}

                            {/* Snaps Section */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Active Snaps</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Camera', { type: 'snap' })}>
                                    <Ionicons name="camera" size={24} color="#0A66C2" />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={snaps}
                                renderItem={renderSnapItem}
                                keyExtractor={(item, index) => {
                                    const id = item.user?._id || item.user || index;
                                    return typeof id === 'object' ? id.toString() : id.toString();
                                }}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.snapList}
                                scrollEnabled={false}
                                ListEmptyComponent={() => (
                                    <TouchableOpacity style={styles.addSnapItem} onPress={() => navigation.navigate('Camera', { type: 'snap' })}>
                                        <View style={styles.addSnapCircle}>
                                            <Ionicons name="add" size={30} color="#0A66C2" />
                                        </View>
                                        <Text style={styles.snapName}>Add Snap</Text>
                                    </TouchableOpacity>
                                )}
                            />

                            {/* Group Chats Section */}
                            {groupChats.filter(gc => {
                                const gcClubId = gc.clubId?._id || gc.clubId;
                                return !selectedClub || selectedClub === 'all' || gcClubId.toString() === selectedClub.toString();
                            }).length > 0 && (
                                    <>
                                        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                                            <Text style={styles.sectionTitle}>Group Chats</Text>
                                        </View>
                                        {groupChats
                                            .filter(gc => {
                                                const gcClubId = gc.clubId?._id || gc.clubId;
                                                return !selectedClub || selectedClub === 'all' || gcClubId.toString() === selectedClub.toString();
                                            })
                                            .map(groupChat => {
                                                const unreadCount = groupChat.messages?.filter(msg =>
                                                    !msg.deleted &&
                                                    msg.senderId?._id !== user._id && // Exclude my own messages
                                                    msg.senderId !== user._id &&
                                                    !msg.readBy?.some(r => r.userId?.toString() === user._id.toString())
                                                ).length || 0;
                                                const lastMessage = groupChat.messages?.[groupChat.messages.length - 1];

                                                return (
                                                    <GroupChatCard
                                                        key={groupChat.clubId}
                                                        club={groupChat.club}
                                                        unreadCount={unreadCount}
                                                        lastMessage={lastMessage}
                                                        onPress={() => navigation.navigate('Chat', {
                                                            isGroupChat: true,
                                                            clubId: groupChat.clubId,
                                                            clubName: groupChat.club.name,
                                                            groupChatData: groupChat
                                                        })}
                                                    />
                                                );
                                            })}
                                    </>
                                )}

                            {/* Conversations List */}
                            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                                <Text style={styles.sectionTitle}>Recent Chats</Text>
                            </View>
                            <FlatList
                                data={filteredConversations}
                                renderItem={renderConversationItem}
                                keyExtractor={item => `conv-${item.otherUser?._id || Math.random()}`}
                                scrollEnabled={false}
                                contentContainerStyle={styles.convList}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                                        <Text style={styles.emptyText}>No conversations yet</Text>
                                        <Text style={styles.emptySubtext}>Select a member from a club to start chatting</Text>
                                    </View>
                                )}
                            />
                        </ScrollView>
                    </>
                )}
            </View>

            {/* Snap Viewer Modal */}
            <Modal
                visible={snapModalVisible}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setSnapModalVisible(false)}
            >
                {viewingSnaps && viewingSnaps.snaps[viewingSnaps.index] && (
                    <TouchableOpacity
                        style={styles.fullSnapContainer}
                        activeOpacity={1}
                        onPress={nextSnap}
                    >
                        <Image
                            source={{ uri: viewingSnaps.snaps[viewingSnaps.index].mediaUrl.url }}
                            style={styles.fullSnapImage}
                            resizeMode="cover"
                        />
                        <View style={styles.snapOverlay}>
                            <View style={styles.snapHeader}>
                                <View style={styles.snapUserInfo}>
                                    {viewingSnaps.user.profilePicture?.url ? (
                                        <Image source={{ uri: viewingSnaps.user.profilePicture.url }} style={styles.snapUserAvatar} />
                                    ) : (
                                        <View style={styles.snapUserPlaceholder}>
                                            <Text style={styles.snapUserPlaceholderText}>{viewingSnaps.user.displayName.charAt(0)}</Text>
                                        </View>
                                    )}
                                    <View>
                                        <Text style={styles.snapUserName}>{viewingSnaps.user.displayName}</Text>
                                        <Text style={styles.snapTime}>
                                            {new Date(viewingSnaps.snaps[viewingSnaps.index].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.snapActions}>
                                    {viewingSnaps.user._id.toString() === user._id.toString() && (
                                        <>
                                            <TouchableOpacity
                                                style={styles.snapActionBtn}
                                                onPress={() => fetchViewersList(viewingSnaps.snaps[viewingSnaps.index]._id)}
                                            >
                                                <Ionicons name="eye" size={24} color="#FFF" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.snapActionBtn}
                                                onPress={() => {
                                                    setEditingSnapId(viewingSnaps.snaps[viewingSnaps.index]._id);
                                                    setNewCaption(viewingSnaps.snaps[viewingSnaps.index].caption || '');
                                                    setEditCaptionModalVisible(true);
                                                }}
                                            >
                                                <Ionicons name="create" size={24} color="#FFF" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.snapActionBtn}
                                                onPress={() => handleDeleteSnap(viewingSnaps.snaps[viewingSnaps.index]._id)}
                                            >
                                                <Ionicons name="trash" size={24} color="#FFF" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                    <TouchableOpacity onPress={() => setSnapModalVisible(false)}>
                                        <Ionicons name="close" size={32} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Snap Progress */}
                            <View style={styles.progressContainer}>
                                {viewingSnaps.snaps.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.progressBar,
                                            { flex: 1, backgroundColor: i <= viewingSnaps.index ? '#FFF' : 'rgba(255,255,255,0.3)' }
                                        ]}
                                    />
                                ))}
                            </View>

                            {/* Center Content for dismissal */}
                            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={nextSnap} />

                            {/* Bottom Content Area */}
                            <TouchableWithoutFeedback onPress={(e) => { }}>
                                <View style={styles.snapBottomArea}>
                                    {/* Caption Overlay */}
                                    {viewingSnaps.snaps[viewingSnaps.index].caption ? (
                                        <View style={styles.snapCaptionContainer}>
                                            <Text
                                                style={styles.snapCaptionText}
                                                numberOfLines={isCaptionExpanded ? undefined : 3}
                                            >
                                                {viewingSnaps.snaps[viewingSnaps.index].caption}
                                            </Text>
                                            {viewingSnaps.snaps[viewingSnaps.index].caption.length > 100 && (
                                                <TouchableOpacity onPress={() => setIsCaptionExpanded(!isCaptionExpanded)}>
                                                    <Text style={styles.viewMoreText}>
                                                        {isCaptionExpanded ? 'View less' : 'View more...'}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ) : null}

                                    {/* Reply Input Area - Always show if not own snap */}
                                    {viewingSnaps.user._id.toString() !== user._id.toString() && (
                                        <View style={styles.snapReplyContainer}>
                                            <TextInput
                                                style={styles.snapReplyInput}
                                                placeholder="Reply via chat..."
                                                placeholderTextColor="rgba(255,255,255,0.6)"
                                                value={replyText}
                                                onChangeText={setReplyText}
                                            />
                                            {replyText.length > 0 && (
                                                <TouchableOpacity
                                                    style={[styles.snapReplySendBtn, replySuccess && { backgroundColor: '#10B981' }]}
                                                    onPress={handleSendReply}
                                                    disabled={sendingReply}
                                                >
                                                    <Ionicons
                                                        name={replySuccess ? "checkmark" : "send"}
                                                        size={20}
                                                        color={replySuccess ? "#FFF" : "#0A66C2"}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableOpacity>
                )}
            </Modal>

            {/* Viewers Modal */}
            <Modal
                visible={viewersModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setViewersModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.viewerModalOverlay}
                    activeOpacity={1}
                    onPress={() => setViewersModalVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.viewerModalContent}>
                        <View style={styles.viewerModalHeader}>
                            <Text style={styles.viewerModalTitle}>Viewed by</Text>
                            <TouchableOpacity onPress={() => setViewersModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={viewers}
                            keyExtractor={item => item._id}
                            renderItem={({ item }) => (
                                <View style={styles.viewerItem}>
                                    <Image
                                        source={item.profilePicture?.url ? { uri: item.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + item.displayName }}
                                        style={styles.viewerAvatar}
                                    />
                                    <View style={styles.viewerInfo}>
                                        <Text style={styles.viewerName}>{item.displayName}</Text>
                                        <Text style={styles.viewerTime}>
                                            {new Date(item.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={() => (
                                <Text style={styles.noViewersText}>No views yet</Text>
                            )}
                        />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Edit Caption Modal */}
            <Modal
                visible={editCaptionModalVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setEditCaptionModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.viewerModalOverlay}
                    activeOpacity={1}
                    onPress={() => setEditCaptionModalVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.viewerModalContent}>
                        <View style={styles.viewerModalHeader}>
                            <Text style={styles.viewerModalTitle}>Edit Caption</Text>
                            <TouchableOpacity onPress={() => setEditCaptionModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.captionInput}
                            placeholder="Add a caption..."
                            value={newCaption}
                            onChangeText={setNewCaption}
                            multiline
                            autoFocus
                        />
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleUpdateCaption}
                        >
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
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
                    style={styles.viewerModalOverlay}
                    activeOpacity={1}
                    onPress={() => setDeleteConfirmModalVisible(false)}
                >
                    <View style={styles.deleteConfirmCard}>
                        <View style={styles.deleteIconContainer}>
                            <Ionicons name="trash" size={40} color="#EF4444" />
                        </View>
                        <Text style={styles.deleteConfirmTitle}>Delete Snap?</Text>
                        <Text style={styles.deleteConfirmText}>
                            Are you sure you want to delete this snap? It will be removed for everyone and cannot be recovered.
                        </Text>
                        <View style={styles.deleteConfirmActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setDeleteConfirmModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={confirmDeleteSnap}
                            >
                                <Text style={styles.confirmDeleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    fullSnapContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullSnapImage: {
        flex: 1,
    },
    snapOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 15,
        justifyContent: 'space-between',
    },
    snapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 15,
        paddingHorizontal: 15,
        marginHorizontal: -15, // Extend to edges
    },
    snapUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    snapUserAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    snapUserPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    snapUserPlaceholderText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    snapUserName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    snapTime: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    progressContainer: {
        flexDirection: 'row',
        marginTop: 15,
        gap: 5,
    },
    progressBar: {
        height: 2,
        borderRadius: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        margin: 16,
        paddingHorizontal: 15,
        borderRadius: 25,
        height: 45,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        ...Platform.select({
            web: { outlineWidth: 0 }
        }),
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    clubScroll: {
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    clubChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFF',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    clubChipActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    clubChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    clubChipTextActive: {
        color: '#FFF',
    },
    membersContainer: {
        marginBottom: 20,
    },
    memberList: {
        paddingHorizontal: 15,
    },
    memberItem: {
        alignItems: 'center',
        width: 80,
        marginRight: 15,
    },
    memberAvatarContainer: {
        position: 'relative',
        marginBottom: 5,
    },
    memberAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    memberPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    placeholderText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '700',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    memberName: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '600',
        textAlign: 'center',
    },
    snapList: {
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    snapItem: {
        alignItems: 'center',
        marginRight: 15,
    },
    snapGradient: {
        width: 70,
        height: 70,
        borderRadius: 35,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    snapImageContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF',
        padding: 2,
    },
    snapImage: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
    snapPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        backgroundColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addSnapItem: {
        alignItems: 'center',
        marginRight: 15,
    },
    addSnapCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#EBF5FF',
        borderWidth: 2,
        borderColor: '#0A66C2',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    snapName: {
        marginTop: 5,
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '600',
    },
    convList: {
        paddingBottom: 20,
    },
    convItem: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    convAvatarContainer: {
        position: 'relative',
        marginRight: 15,
    },
    convAvatar: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
    },
    convPlaceholder: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    convContent: {
        flex: 1,
        justifyContent: 'center',
    },
    convHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    convName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    convTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    convFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    convLastMsg: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
        marginRight: 10,
    },
    unreadBadge: {
        backgroundColor: '#0A66C2',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 10,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginTop: 5,
    },
    snapActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    snapActionBtn: {
        padding: 8,
        marginRight: 5,
    },
    viewerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', // Slightly darker
        justifyContent: 'flex-end',
        width: '100%',
        height: '100%',
    },
    viewerModalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        maxHeight: '70%',
        padding: 20,
    },
    viewerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    viewerModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    viewerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    viewerAvatar: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 15,
    },
    viewerInfo: {
        flex: 1,
    },
    viewerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    viewerTime: {
        fontSize: 12,
        color: '#6B7280',
    },
    noViewersText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 30,
        fontSize: 16,
    },
    snapBottomArea: {
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        paddingHorizontal: 15,
    },
    snapCaptionContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    snapCaptionText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', // Increased opacity for better visibility
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
    },
    viewMoreText: {
        color: '#34B7F1',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 5,
        ...Platform.select({
            web: {
                textShadow: '0px 1px 1px rgba(0,0,0,0.5)',
            },
            default: {
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 1,
            },
        }),
    },
    snapReplyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        marginTop: 15,
    },
    snapReplyInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        paddingVertical: 8,
        ...Platform.select({
            web: { outlineWidth: 0 }
        }),
    },
    snapReplySendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    deleteConfirmCard: {
        backgroundColor: '#FFF',
        width: width * 0.85,
        borderRadius: 25,
        padding: 25,
        alignSelf: 'center',
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
        flex: 1,
        paddingVertical: 12,
        borderRadius: 15,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#4B5563',
        fontWeight: '700',
    },
    confirmDeleteBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 15,
        backgroundColor: '#EF4444',
        alignItems: 'center',
    },
    confirmDeleteBtnText: {
        color: '#FFF',
        fontWeight: '700',
    },
    captionInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: '#1F2937',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    saveBtn: {
        backgroundColor: '#0A66C2',
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    noClubsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    noClubsTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    noClubsText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    joinClubButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0A66C2',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
        gap: 8,
    },
    joinClubButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MessagesScreen;
