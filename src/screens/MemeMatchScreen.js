import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert,
    BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import * as Animatable from 'react-native-animatable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MemeMatchScreen = ({ navigation, route }) => {
    const { roomId, isHost } = route.params;
    const { user, socket } = useAuth();

    // Game State
    const [situation, setSituation] = useState('');
    const [caption, setCaption] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [phase, setPhase] = useState('waiting'); // waiting, submitting, voting, results
    const [timeRemaining, setTimeRemaining] = useState(60);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [roundResults, setRoundResults] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [currentRound, setCurrentRound] = useState(1);
    const [totalRounds, setTotalRounds] = useState(3);
    const [submissionCount, setSubmissionCount] = useState({ submitted: 0, total: 0 });
    const [voteCount, setVoteCount] = useState({ voted: 0, total: 0 });
    const [players, setPlayers] = useState([]);
    const [gameState, setGameState] = useState(null);
    const resultsTimerRef = useRef(null);

    const handleLeaveGame = () => {
        if (phase !== 'waiting') {
            Alert.alert(
                "Leave Game?",
                "Are you sure you want to leave? Your progress will be lost.",
                [
                    { text: "Stay", style: "cancel" },
                    { text: "Leave", style: "destructive", onPress: () => navigation.goBack() }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    useEffect(() => {
        const backAction = () => {
            handleLeaveGame();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [phase]);

    useEffect(() => {
        if (socket && user) {
            // Ensure player is added to the room list
            socket.emit('games:join', {
                roomId,
                userId: user._id,
                userName: user.displayName || user.fullName || 'Anonymous'
            });

            // Join Meme Match room
            socket.emit('memematch:join', { roomId });

            socket.on('game:update', (room) => {
                setGameState(room);
                setPlayers(room.players || []);
            });

            socket.on('game:error', (data) => {
                Alert.alert('Game Error', data.message);
            });

            socket.on('memematch:situation', (data) => {
                setSituation(data.situation);
                setCurrentRound(data.round);
                setTotalRounds(data.totalRounds);
                setTimeRemaining(data.timeLimit);
                setPhase('submitting');
                setHasSubmitted(false);
                setCaption('');
                setSubmissions([]);
            });

            socket.on('memematch:submission_count', (data) => {
                setSubmissionCount(data);
            });

            socket.on('memematch:voting_start', (data) => {
                setSubmissions(data.submissions);
                setPhase('voting');
                setTimeRemaining(data.timeLimit);
                setHasVoted(false);
                setSelectedSubmission(null);
            });

            socket.on('memematch:vote_count', (data) => {
                setVoteCount(data);
            });

            socket.on('memematch:time_update', (time) => {
                setTimeRemaining(time);
            });

            socket.on('memematch:round_end', (data) => {
                setRoundResults(data);
                setShowResults(true);
                setPhase('results');

                // Clear any existing timer
                if (resultsTimerRef.current) clearTimeout(resultsTimerRef.current);

                // Auto-close in 5 seconds
                resultsTimerRef.current = setTimeout(() => {
                    setShowResults(false);
                    resultsTimerRef.current = null;
                }, 5000);
            });

            socket.on('memematch:next_round', (data) => {
                if (resultsTimerRef.current) {
                    clearTimeout(resultsTimerRef.current);
                    resultsTimerRef.current = null;
                }
                setShowResults(false);
                setPhase('waiting');
                setTimeout(() => {
                    socket.emit('memematch:start_round', { roomId });
                }, 2000);
            });

            socket.on('memematch:game_over', (data) => {
                setRoundResults(data);
                setShowResults(true);

                if (resultsTimerRef.current) clearTimeout(resultsTimerRef.current);

                // Auto-close in 10 seconds for game over
                resultsTimerRef.current = setTimeout(() => {
                    setShowResults(false);
                    resultsTimerRef.current = null;
                }, 10000);

                setTimeout(() => {
                    navigation.navigate('MaverickGames');
                }, 30000);
            });

            return () => {
                socket.off('memematch:situation');
                socket.off('memematch:submission_count');
                socket.off('memematch:voting_start');
                socket.off('memematch:vote_count');
                socket.off('memematch:time_update');
                socket.off('memematch:round_end');
                socket.off('memematch:next_round');
                socket.off('memematch:game_over');
                socket.emit('memematch:leave', roomId);
            };
        }
    }, [socket, roomId]);

    const handleSubmitCaption = () => {
        if (caption.trim().length === 0) return;

        socket.emit('memematch:submit', {
            roomId,
            userId: user._id,
            userName: user.displayName,
            caption: caption.trim()
        });

        setHasSubmitted(true);
    };

    const handleVote = (submissionId) => {
        if (hasVoted) return;

        socket.emit('memematch:vote', {
            roomId,
            userId: user._id,
            submissionId
        });

        setSelectedSubmission(submissionId);
        setHasVoted(true);
    };

    const renderSubmittingPhase = () => (
        <View style={styles.phaseContainer}>
            <Animatable.View animation="fadeInDown" style={styles.situationCard}>
                <Text style={styles.situationLabel}>Situation:</Text>
                <Text style={styles.situationText}>{situation}</Text>
            </Animatable.View>

            <View style={styles.captionInputSection}>
                <Text style={styles.inputLabel}>Your Caption:</Text>
                <TextInput
                    style={styles.captionInput}
                    placeholder="Type your funny caption here..."
                    placeholderTextColor="#9CA3AF"
                    value={caption}
                    onChangeText={setCaption}
                    maxLength={100}
                    multiline
                    editable={!hasSubmitted}
                />
                <Text style={styles.charCount}>{caption.length}/100</Text>

                <TouchableOpacity
                    style={[styles.submitBtn, (hasSubmitted || caption.trim().length === 0) && styles.btnDisabled]}
                    onPress={handleSubmitCaption}
                    disabled={hasSubmitted || caption.trim().length === 0}
                >
                    <LinearGradient
                        colors={hasSubmitted ? ['#10B981', '#059669'] : ['#EC4899', '#DB2777']}
                        style={styles.submitBtnGradient}
                    >
                        <Ionicons
                            name={hasSubmitted ? "checkmark-circle" : "send"}
                            size={20}
                            color="#FFF"
                        />
                        <Text style={styles.submitBtnText}>
                            {hasSubmitted ? 'Submitted!' : 'Submit Caption'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.statusBar}>
                    <Text style={styles.statusText}>
                        {submissionCount.submitted}/{submissionCount.total} players submitted
                    </Text>
                </View>
            </View>
        </View>
    );

    const renderVotingPhase = () => (
        <View style={styles.phaseContainer}>
            <Text style={styles.phaseTitle}>Vote for the Funniest!</Text>
            <Text style={styles.phaseSubtitle}>{situation}</Text>

            <ScrollView style={styles.submissionsList}>
                {submissions.map((sub, index) => (
                    <Animatable.View
                        key={sub.submissionId}
                        animation="fadeInUp"
                        delay={index * 100}
                    >
                        <TouchableOpacity
                            style={[
                                styles.submissionCard,
                                selectedSubmission === sub.submissionId && styles.submissionCardSelected
                            ]}
                            onPress={() => handleVote(sub.submissionId)}
                            disabled={hasVoted}
                        >
                            <View style={styles.submissionHeader}>
                                <Text style={styles.submissionNumber}>#{index + 1}</Text>
                                {selectedSubmission === sub.submissionId && (
                                    <Ionicons name="checkmark-circle" size={24} color="#EC4899" />
                                )}
                            </View>
                            <Text style={styles.submissionCaption}>{sub.caption}</Text>
                        </TouchableOpacity>
                    </Animatable.View>
                ))}
            </ScrollView>

            <View style={styles.statusBar}>
                <Text style={styles.statusText}>
                    {voteCount.voted}/{voteCount.total} players voted
                </Text>
            </View>
        </View>
    );

    const renderLobby = () => {
        return (
            <View style={styles.lobbyContainer}>
                <Ionicons name="people-circle" size={80} color="#EC4899" />
                <Text style={styles.lobbyTitle}>Meme Match Lobby</Text>
                <Text style={styles.lobbySubtitle}>Waiting for players to join...</Text>

                <View style={styles.playersList}>
                    {players.map((p, index) => (
                        <View key={p.userId || index} style={styles.playerItem}>
                            <View style={styles.playerAvatar}>
                                <Text style={styles.avatarText}>{(p.userName || 'A').charAt(0)}</Text>
                            </View>
                            <Text style={styles.playerName}>{p.userName || 'Anonymous'} {p.userId === user?._id ? '(You)' : ''}</Text>
                            {index === 0 && <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>HOST</Text></View>}
                        </View>
                    ))}
                </View>

                {isHost && (
                    <TouchableOpacity
                        style={[styles.hostStartBtn, players.length < 2 && styles.btnDisabled]}
                        onPress={() => socket.emit('games:start', { roomId, userId: user._id })}
                        disabled={players.length < 2}
                    >
                        <LinearGradient
                            colors={players.length < 2 ? ['#9CA3AF', '#6B7280'] : ['#EC4899', '#DB2777']}
                            style={styles.hostStartGradient}
                        >
                            <Text style={styles.hostStartText}>
                                {players.length < 2 ? 'WAITING FOR PLAYERS...' : 'START GAME'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (!gameState) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EC4899" />
                <Text style={styles.loadingText}>Connecting to Meme Match...</Text>
            </View>
        );
    }

    if (gameState.status === 'waiting' || gameState.status === 'lobby') {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.header}>
                    <TouchableOpacity onPress={handleLeaveGame}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Meme Match Lobby</Text>
                    </View>
                    <View style={{ width: 28 }} />
                </LinearGradient>
                {renderLobby()}
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <LinearGradient
                colors={['#EC4899', '#DB2777']}
                style={styles.header}
            >
                <TouchableOpacity onPress={handleLeaveGame}>
                    <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Meme Match</Text>
                    <Text style={styles.headerSubtitle}>
                        Round {currentRound}/{totalRounds}
                    </Text>
                </View>
                <View style={styles.timerBox}>
                    <Ionicons name="time" size={18} color="#FFF" />
                    <Text style={styles.timerText}>{timeRemaining}s</Text>
                </View>
            </LinearGradient>

            {/* Content */}
            <ScrollView style={styles.content}>
                {phase === 'waiting' && (
                    <View style={styles.waitingContainer}>
                        <ActivityIndicator size="large" color="#EC4899" />
                        <Text style={styles.waitingText}>Preparing next round...</Text>
                    </View>
                )}
                {phase === 'submitting' && renderSubmittingPhase()}
                {phase === 'voting' && renderVotingPhase()}
            </ScrollView>

            {/* Results Modal */}
            <Modal visible={showResults} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="zoomIn" style={styles.resultsModal}>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setShowResults(false)}
                        >
                            <Ionicons name="close" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                        <Text style={styles.resultsTitle}>Round Results!</Text>

                        <ScrollView style={styles.resultsList}>
                            {roundResults?.submissions?.slice(0, 3).map((sub, index) => (
                                <View key={sub.submissionId} style={styles.resultCard}>
                                    <View style={styles.resultRank}>
                                        <Text style={styles.resultRankText}>#{index + 1}</Text>
                                    </View>
                                    <View style={styles.resultContent}>
                                        <Text style={styles.resultAuthor}>{sub.userName}</Text>
                                        <Text style={styles.resultCaption}>{sub.caption}</Text>
                                        <View style={styles.resultVotes}>
                                            <Ionicons name="heart" size={16} color="#EC4899" />
                                            <Text style={styles.resultVoteCount}>
                                                {sub.voteCount} vote{sub.voteCount !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.leaderboard}>
                            <Text style={styles.leaderboardTitle}>Scores</Text>
                            {roundResults?.scores?.slice(0, 3).map((score, index) => (
                                <View key={score.userId} style={styles.scoreRow}>
                                    <Text style={styles.scoreRank}>#{index + 1}</Text>
                                    <Text style={styles.scoreName}>{score.userName}</Text>
                                    <Text style={styles.scoreValue}>{score.score} pts</Text>
                                </View>
                            ))}
                        </View>
                    </Animatable.View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    lobbyContainer: {
        flex: 1,
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#F9FAFB',
    },
    lobbyTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 20,
    },
    lobbySubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 40,
    },
    playersList: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    playerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    playerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FCE7F3',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    avatarText: {
        color: '#EC4899',
        fontWeight: '700',
        fontSize: 18,
    },
    playerName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    hostBadge: {
        backgroundColor: '#EC4899',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    hostBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    hostStartBtn: {
        marginTop: 40,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    hostStartGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    hostStartText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    timerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    timerText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    waitingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        minHeight: 400,
    },
    waitingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    phaseContainer: {
        padding: 20,
    },
    phaseTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    phaseSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    situationCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#EC4899',
    },
    situationLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EC4899',
        marginBottom: 8,
    },
    situationText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        lineHeight: 28,
    },
    captionInputSection: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    captionInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 8,
    },
    submitBtn: {
        marginTop: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    btnDisabled: {
        opacity: 0.5,
    },
    statusBar: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    submissionsList: {
        maxHeight: 500,
    },
    submissionCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    submissionCardSelected: {
        borderColor: '#EC4899',
        backgroundColor: '#FEF2F8',
    },
    submissionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    submissionNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EC4899',
    },
    submissionCaption: {
        fontSize: 16,
        color: '#1F2937',
        lineHeight: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultsModal: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    },
    resultsTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 20,
    },
    resultsList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    resultCard: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    resultRank: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EC4899',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    resultRankText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    resultContent: {
        flex: 1,
    },
    resultAuthor: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    resultCaption: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    resultVotes: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    resultVoteCount: {
        fontSize: 12,
        color: '#EC4899',
        fontWeight: '600',
    },
    leaderboard: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 16,
    },
    leaderboardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        marginBottom: 8,
    },
    scoreRank: {
        fontSize: 16,
        fontWeight: '700',
        color: '#EC4899',
        width: 40,
    },
    scoreName: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
    },
    scoreValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
});

export default MemeMatchScreen;
