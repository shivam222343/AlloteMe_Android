import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    Dimensions,
    FlatList,
    Platform,
    ActivityIndicator,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { adminAPI, mediaAPI } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

const GAMES = [
    {
        id: 'sketch_heads',
        name: 'Sketch Heads',
        description: 'Co-op drawing and guessing chaos!',
        image: require('../../assets/games/sketch_heads_corrupt.png'),
        players: '2-8 Players',
        tag: 'Social',
        color: '#FFD700'
    }
];

const MaverickGamesScreen = ({ navigation, route }) => {
    const { user, socket, selectedClubId } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRooms, setActiveRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [showLobbyModal, setShowLobbyModal] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [selectedRounds, setSelectedRounds] = useState(3);
    const [availableGames, setAvailableGames] = useState(GAMES);
    const [updatingPoster, setUpdatingPoster] = useState(false);

    const selectedGameRef = React.useRef(null);

    // Sync ref with state
    useEffect(() => {
        selectedGameRef.current = selectedGame;
    }, [selectedGame]);

    const loadGameConfigs = useCallback(async () => {
        try {
            const res = await adminAPI.getGames();
            if (res.success && res.data && res.data.length > 0) {
                const merged = GAMES.map(g => {
                    const config = res.data.find(c => c.gameId === g.id);
                    if (config) {
                        return {
                            ...g,
                            // Use config values if present, otherwise fallback to local asset
                            image: config.posterUrl ? { uri: config.posterUrl } : g.image,
                            description: config.description || g.description,
                            tag: config.tag || g.tag
                        };
                    }
                    return g;
                });
                setAvailableGames(merged);
            }
        } catch (error) {
            console.log('Error loading game configs:', error);
        }
    }, []);

    useEffect(() => {
        loadGameConfigs();
    }, [loadGameConfigs]);

    const fetchRooms = useCallback(() => {
        if (!socket || !selectedClubId || !selectedGame) return;

        setLoadingRooms(true);
        socket.emit('games:get_rooms', {
            clubId: selectedClubId,
            gameType: selectedGame.id
        });
    }, [socket, selectedClubId, selectedGame]);

    // Auto-fetch rooms when modal remains open
    useEffect(() => {
        if (showLobbyModal && selectedGame) {
            fetchRooms();
        }
    }, [showLobbyModal, selectedGame, fetchRooms]);

    // Handle deep linking / notification navigation
    useEffect(() => {
        if (route?.params?.autoOpenLobby) {
            const gameType = route.params.gameType || 'sketch_heads';
            const game = GAMES.find(g => g.id === gameType);
            if (game) {
                setSelectedGame(game);
                setShowLobbyModal(true);
                // Clear params after handling
                navigation.setParams({ autoOpenLobby: undefined, gameType: undefined });
            }
        }
    }, [route?.params]);

    useEffect(() => {
        if (socket) {
            socket.on('games:rooms_list', (data) => {
                const currentType = selectedGameRef.current?.id;
                // Only update if it matches current selected game, or if we got a raw array (legacy)
                const rooms = Array.isArray(data) ? data : data.rooms;
                const gameType = Array.isArray(data) ? null : data.gameType;

                if (!gameType || gameType === currentType) {
                    setActiveRooms(rooms);
                    setLoadingRooms(false);
                }
            });

            socket.on('games:host_success', (roomId) => {
                setShowLobbyModal(false);
                navigation.navigate('SketchHeads', { roomId, isHost: true });
            });

            return () => {
                socket.off('games:rooms_list');
                socket.off('games:host_success');
            };
        }
    }, [socket, navigation]);

    const handleSelectGame = (game) => {
        setSelectedGame(game);
        setShowLobbyModal(true);
        // Trigger room fetch
        if (socket && selectedClubId) {
            socket.emit('games:get_rooms', {
                clubId: selectedClubId,
                gameType: game.id
            });
        }
    };

    const handleHostGame = () => {
        if (!socket || !selectedClubId || !selectedGame) return;

        socket.emit('games:host', {
            clubId: selectedClubId,
            gameType: selectedGame.id,
            userId: user._id,
            userName: user.displayName,
            totalRounds: selectedRounds
        });
    };

    const handleJoinRoom = (roomId) => {
        setShowLobbyModal(false);
        navigation.navigate('SketchHeads', { roomId, isHost: false });
    };

    const handleUpdatePoster = async (game) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, // Enables cropping
                aspect: [16, 9], // Game card aspect ratio
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setUpdatingPoster(true);
                const asset = result.assets[0];
                const formData = new FormData();

                const uri = asset.uri;
                const fileName = asset.fileName || uri.split('/').pop() || 'poster.jpg';
                const fileType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

                formData.append('file', {
                    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                    name: fileName,
                    type: fileType,
                });
                formData.append('type', 'gallery');

                const uploadRes = await mediaAPI.upload(formData);
                if (uploadRes.success) {
                    await adminAPI.updateGameConfig({
                        gameId: game.id,
                        name: game.name,
                        posterUrl: uploadRes.data.url
                    });
                    loadGameConfigs();
                    Alert.alert('Success', 'Game poster updated successfully!');
                }
            }
        } catch (error) {
            console.error('Update poster error:', error);
            Alert.alert('Error', 'Failed to update poster');
        } finally {
            setUpdatingPoster(false);
        }
    };

    const renderGameCard = ({ item, index }) => (
        <Animatable.View
            animation="fadeInUp"
            delay={index * 100}
            style={styles.gameCardContainer}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleSelectGame(item)}
                style={styles.gameCard}
            >
                <Image source={item.image} style={styles.gameImage} resizeMode="cover" />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.cardOverlay}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.tagContainer}>
                                <Text style={styles.tagText}>{item.tag}</Text>
                            </View>
                            {user?.role === 'admin' && (
                                <TouchableOpacity
                                    style={styles.adminEditBtn}
                                    onPress={() => handleUpdatePoster(item)}
                                    disabled={updatingPoster}
                                >
                                    {updatingPoster ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Ionicons name="camera" size={18} color="#FFF" />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.gameTitle}>{item.name}</Text>
                        <Text style={styles.gameDescription}>{item.description}</Text>
                        <View style={styles.cardFooter}>
                            <Ionicons name="people" size={14} color="#D1D5DB" />
                            <Text style={styles.playersText}>{item.players}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animatable.View>
    );

    return (
        <MainLayout title="Maverick Games" navigation={navigation} currentRoute="MaverickGames">
            <View style={styles.container}>
                {updatingPoster && (
                    <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="large" color="#0A66C2" />
                        <Text style={styles.uploadingText}>Updating Game Poster...</Text>
                    </View>
                )}
                {/* Search & Welcome */}
                <View style={styles.headerSection}>
                    <Text style={styles.welcomeText}>Unleash the Chaos, {user?.displayName?.split(' ')[0]}! 🎮</Text>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Find a game..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Featured Game */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Available Games</Text>
                </View>

                <FlatList
                    data={availableGames.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                    renderItem={renderGameCard}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.gameList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="game-controller-outline" size={64} color="#E5E7EB" />
                            <Text style={styles.emptyText}>No games matched your search</Text>
                        </View>
                    }
                />

                {/* Lobby / Join Modal */}
                <Modal
                    visible={showLobbyModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowLobbyModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={styles.modalBackdrop}
                            activeOpacity={1}
                            onPress={() => setShowLobbyModal(false)}
                        />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedGame?.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <TouchableOpacity onPress={fetchRooms}>
                                        <Ionicons name="refresh" size={22} color="#0A66C2" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setShowLobbyModal(false)}>
                                        <Ionicons name="close" size={24} color="#71717A" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView style={styles.roomList} showsVerticalScrollIndicator={false}>
                                <Text style={styles.roomListHeader}>Join an existing game</Text>

                                {loadingRooms ? (
                                    <ActivityIndicator size="large" color="#0A66C2" style={{ marginTop: 20 }} />
                                ) : activeRooms.filter(r => r.hostId !== user?._id).length > 0 ? (
                                    activeRooms.filter(r => r.hostId !== user?._id).map(room => (
                                        <TouchableOpacity
                                            key={room.roomId}
                                            style={styles.roomCard}
                                            onPress={() => handleJoinRoom(room.roomId)}
                                        >
                                            <View style={styles.roomInfo}>
                                                <Text style={styles.hostName}>{room.hostName}'s Game</Text>
                                                <Text style={styles.playerCount}>{room.players.length}/8 players</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.joinBtn}
                                                onPress={() => handleJoinRoom(room.roomId)}
                                            >
                                                <Text style={styles.joinBtnText}>Join</Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.noRooms}>
                                        <Text style={styles.noRoomsText}>No active games. Be the first to host!</Text>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                {/* Round Selector */}
                                <View style={styles.roundSelector}>
                                    <Text style={styles.roundSelectorLabel}>Number of Rounds:</Text>
                                    <View style={styles.roundOptions}>
                                        {[1, 2, 3, 4, 5].map((num) => (
                                            <TouchableOpacity
                                                key={num}
                                                style={[
                                                    styles.roundOption,
                                                    selectedRounds === num && styles.roundOptionSelected
                                                ]}
                                                onPress={() => setSelectedRounds(num)}
                                            >
                                                <Text style={[
                                                    styles.roundOptionText,
                                                    selectedRounds === num && styles.roundOptionTextSelected
                                                ]}>{num}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.hostBtn}
                                    onPress={handleHostGame}
                                >
                                    <LinearGradient
                                        colors={['#0A66C2', '#0E76A8']}
                                        style={styles.hostBtnGradient}
                                    >
                                        <Ionicons name="add-circle" size={20} color="#FFF" />
                                        <Text style={styles.hostBtnText}>Host New Game</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerSection: {
        padding: 20,
        backgroundColor: '#FFF',
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#1F2937',
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        letterSpacing: 0.5,
    },
    gameList: {
        padding: 15,
    },
    gameCardContainer: {
        marginBottom: 20,
        borderRadius: 24,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            }
        })
    },
    gameCard: {
        width: '100%',
        height: 220,
        backgroundColor: '#000',
    },
    gameImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 20,
    },
    tagContainer: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    tagText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    adminEditBtn: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadingText: {
        marginTop: 12,
        color: '#0A66C2',
        fontWeight: '600',
    },
    gameTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    gameDescription: {
        fontSize: 14,
        color: '#E5E7EB',
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playersText: {
        fontSize: 12,
        color: '#D1D5DB',
        marginLeft: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#9CA3AF',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '80%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    roomList: {
        padding: 20,
    },
    roomListHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 16,
    },
    roomCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    hostName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    playerCount: {
        fontSize: 13,
        color: '#6B7280',
    },
    joinBtn: {
        backgroundColor: '#EBF5FF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
    },
    joinBtnText: {
        color: '#0A66C2',
        fontWeight: '700',
    },
    noRooms: {
        padding: 40,
        alignItems: 'center',
    },
    noRoomsText: {
        color: '#9CA3AF',
        textAlign: 'center',
    },
    roundSelector: {
        marginBottom: 20,
    },
    roundSelectorLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    roundOptions: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
    },
    roundOption: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    roundOptionSelected: {
        backgroundColor: '#EBF5FF',
        borderColor: '#0A66C2',
    },
    roundOptionText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6B7280',
    },
    roundOptionTextSelected: {
        color: '#0A66C2',
    },
    modalFooter: {
        padding: 20,
    },
    hostBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    hostBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    hostBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
});

export default MaverickGamesScreen;
