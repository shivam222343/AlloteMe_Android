import React, { useState, useEffect, useRef } from 'react';
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

    // Game State - Quiz Version
    const [dialogue, setDialogue] = useState('');
    const [language, setLanguage] = useState('');
    const [options, setOptions] = useState([]);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [phase, setPhase] = useState('waiting'); // waiting, answering, results
    const [timeRemaining, setTimeRemaining] = useState(30);
    const [roundResults, setRoundResults] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [currentRound, setCurrentRound] = useState(1);
    const [totalRounds, setTotalRounds] = useState(3);
    const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 });
    const [players, setPlayers] = useState([]);
    const [gameState, setGameState] = useState(null);
    const [isGameOver, setIsGameOver] = useState(false);
    const resultsTimerRef = useRef(null);
    const gameOverRedirectTimerRef = useRef(null);

    const handleLeaveGame = () => {
        const title = isHost ? "End Game for Everyone?" : "Leave Game?";
        const message = isHost
            ? "You are the host. If you leave, the game room will be closed for all players. Are you sure?"
            : "Are you sure you want to leave? Your progress will be lost.";

        Alert.alert(
            title,
            message,
            [
                { text: "Stay", style: "cancel" },
                {
                    text: isHost ? "End Game" : "Leave",
                    style: "destructive",
                    onPress: () => {
                        if (socket) socket.emit('games:leave', roomId);
                        navigation.navigate('MaverickGames');
                    }
                }
            ]
        );
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

                // Auto-sync phase and data from backend state to prevent getting stuck
                if (room.state) {
                    if (room.state.phase) setPhase(room.state.phase);
                    if (room.state.currentDialogue) setDialogue(room.state.currentDialogue);
                    if (room.state.language) setLanguage(room.state.language);
                    if (room.state.options) setOptions(room.state.options);
                    if (room.state.currentRound) setCurrentRound(room.state.currentRound);
                    if (room.state.timeRemaining !== undefined) setTimeRemaining(room.state.timeRemaining);

                    // Sync results if in results phase
                    if (room.state.phase === 'results' && !showResults) {
                        // Results are usually sent via round_end with more detail, 
                        // but we can at least show the modal if missing
                    }
                }
            });

            socket.on('game:error', (data) => {
                Alert.alert('Game Error', data.message);
            });

            socket.on('memematch:question', (data) => {
                setDialogue(data.dialogue);
                setLanguage(data.language);
                setOptions(data.options);
                setCurrentRound(data.round);
                setTotalRounds(data.totalRounds);
                setTimeRemaining(data.timeLimit);
                setPhase('answering');
                setHasAnswered(false);
                setSelectedAnswer(null);
                setAnswerCount({ answered: 0, total: data.totalPlayers || players.length });
            });

            socket.on('memematch:answer_count', (data) => {
                setAnswerCount(data);
            });

            socket.on('memematch:time_update', (time) => {
                setTimeRemaining(time);
            });

            socket.on('memematch:round_end', (data) => {
                setRoundResults(data);
                setShowResults(true);
                setPhase('results');
                setIsGameOver(false);

                // Clear any existing timer
                if (resultsTimerRef.current) clearTimeout(resultsTimerRef.current);

                // Auto-close in 5 seconds (matching backend timeout)
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
                setIsGameOver(true);
                setPhase('results');

                if (resultsTimerRef.current) clearTimeout(resultsTimerRef.current);

                // Auto-close in 30 seconds for game over
                gameOverRedirectTimerRef.current = setTimeout(() => {
                    setShowResults(false);
                    navigation.navigate('MaverickGames');
                }, 30000);
            });

            return () => {
                socket.off('game:update');
                socket.off('game:error');
                socket.off('memematch:question');
                socket.off('memematch:answer_count');
                socket.off('memematch:time_update');
                socket.off('memematch:round_end');
                socket.off('memematch:next_round');
                socket.off('memematch:game_over');
                socket.emit('memematch:leave', roomId);

                if (resultsTimerRef.current) clearTimeout(resultsTimerRef.current);
                if (gameOverRedirectTimerRef.current) clearTimeout(gameOverRedirectTimerRef.current);
            };
        }
    }, [socket, roomId]);

    const handleSelectAnswer = (answer) => {
        if (hasAnswered) return;

        socket.emit('memematch:answer', {
            roomId,
            userId: user._id,
            userName: user.displayName,
            answer
        });

        setSelectedAnswer(answer);
        setHasAnswered(true);
    };

    const renderAnsweringPhase = () => (
        <View style={styles.phaseContainer}>
            <Animatable.View animation="fadeInDown" style={styles.dialogueCard}>
                <View style={styles.languageBadge}>
                    <Text style={styles.languageBadgeText}>{language}</Text>
                </View>
                <Text style={styles.dialogueLabel}>Identify the movie for this dialogue:</Text>
                <Text style={styles.dialogueText}>"{dialogue}"</Text>
            </Animatable.View>

            <View style={styles.optionsContainer}>
                {options.map((option, index) => (
                    <Animatable.View
                        key={index}
                        animation="fadeInUp"
                        delay={index * 100}
                    >
                        <TouchableOpacity
                            style={[
                                styles.optionBtn,
                                selectedAnswer === option && styles.optionBtnSelected,
                                hasAnswered && selectedAnswer !== option && styles.optionBtnDisabled
                            ]}
                            onPress={() => handleSelectAnswer(option)}
                            disabled={hasAnswered}
                        >
                            <View style={styles.optionLetter}>
                                <Text style={[
                                    styles.optionLetterText,
                                    selectedAnswer === option && styles.optionLetterTextSelected
                                ]}>
                                    {String.fromCharCode(65 + index)}
                                </Text>
                            </View>
                            <Text style={[
                                styles.optionText,
                                selectedAnswer === option && styles.optionTextSelected
                            ]}>
                                {option}
                            </Text>
                            {selectedAnswer === option && (
                                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </Animatable.View>
                ))}
            </View>

            <View style={styles.statusBar}>
                <Text style={styles.statusText}>
                    {answerCount.answered}/{answerCount.total} players answered
                </Text>
                {hasAnswered && (
                    <Text style={styles.waitingForOthers}>Waiting for other players...</Text>
                )}
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
                {phase === 'answering' && renderAnsweringPhase()}
            </ScrollView>

            {/* Results Modal */}
            <Modal visible={showResults} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="slideInUp" style={[styles.resultsModal, isGameOver && styles.gameOverModal]}>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => {
                                setShowResults(false);
                                if (isGameOver) navigation.navigate('MaverickGames');
                            }}
                        >
                            <Ionicons name="close" size={28} color="#1F2937" />
                        </TouchableOpacity>

                        {isGameOver ? (
                            <View style={styles.gameOverContainer}>
                                <Animatable.View animation="bounceIn" style={styles.winnerSection}>
                                    <Ionicons name="trophy" size={80} color="#FFD700" />
                                    <Text style={styles.congratsText}>GAME OVER!</Text>
                                    <Text style={styles.winnerName}>{roundResults?.winner?.userName} WINS!</Text>
                                </Animatable.View>

                                <Text style={[styles.leaderboardTitle, { marginTop: 30 }]}>Final Leaderboard</Text>
                                <ScrollView style={styles.finalLeaderboardList}>
                                    {roundResults?.leaderboard?.map((score, index) => (
                                        <Animatable.View
                                            key={index}
                                            animation="fadeInLeft"
                                            delay={index * 150}
                                            style={[styles.scoreRow, index === 0 && styles.winnerRow]}
                                        >
                                            <View style={styles.rankContainer}>
                                                {index === 0 ? (
                                                    <Ionicons name="ribbon" size={24} color="#FFD700" />
                                                ) : (
                                                    <Text style={styles.scoreRank}>#{index + 1}</Text>
                                                )}
                                            </View>
                                            <Text style={styles.scoreName}>{score.userName}</Text>
                                            <Text style={styles.scoreValue}>{score.score} pts</Text>
                                        </Animatable.View>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity
                                    style={styles.exitBtn}
                                    onPress={() => navigation.navigate('MaverickGames')}
                                >
                                    <Text style={styles.exitBtnText}>Exit to Lobby</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.resultsHeader}>
                                    <View style={styles.revealedBadge}>
                                        <Text style={styles.revealedText}>ROUND OVER</Text>
                                    </View>
                                    <Text style={styles.correctLabel}>Correct Movie:</Text>
                                    <Text style={styles.correctMovieName}>{roundResults?.correctMovie}</Text>
                                    <Text style={styles.resultDialogue}>"{roundResults?.dialogue}"</Text>
                                </View>

                                <Text style={styles.resultsTitle}>Who Got it Right?</Text>

                                <ScrollView style={styles.resultsList}>
                                    {roundResults?.playerAnswers?.map((ans, index) => (
                                        <View key={index} style={styles.resultCard}>
                                            <View style={[
                                                styles.answerStatus,
                                                { backgroundColor: ans.isCorrect ? '#10B981' : '#EF4444' }
                                            ]}>
                                                <Ionicons
                                                    name={ans.isCorrect ? "checkmark" : "close"}
                                                    size={20}
                                                    color="#FFF"
                                                />
                                            </View>
                                            <View style={styles.resultContent}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={styles.resultAuthor}>{ans.userName}</Text>
                                                    {ans.isCorrect && (
                                                        <Text style={styles.pointsEarned}>+{ans.points}</Text>
                                                    )}
                                                </View>
                                                <Text style={styles.resultAnswer} numberOfLines={1}>
                                                    Answered: {ans.answer || 'No answer'}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>

                                <View style={styles.leaderboard}>
                                    <Text style={styles.leaderboardTitle}>Current Standings</Text>
                                    {roundResults?.scores?.slice(0, 3).map((score, index) => (
                                        <View key={score.userId || index} style={styles.scoreRow}>
                                            <Text style={styles.scoreRank}>#{index + 1}</Text>
                                            <Text style={styles.scoreName}>{score.userName}</Text>
                                            <View style={styles.scoreContainer}>
                                                <Text style={styles.scoreValue}>{score.score}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
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
    dialogueCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    languageBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#FCE7F3',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    languageBadgeText: {
        color: '#EC4899',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    dialogueLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
    },
    dialogueText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        lineHeight: 30,
        fontStyle: 'italic',
    },
    optionsContainer: {
        gap: 12,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    optionBtnSelected: {
        borderColor: '#EC4899',
        backgroundColor: '#EC4899',
    },
    optionBtnDisabled: {
        opacity: 0.6,
    },
    optionLetter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    optionLetterText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    },
    optionLetterTextSelected: {
        color: '#EC4899',
    },
    optionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    optionTextSelected: {
        color: '#FFF',
    },
    statusBar: {
        marginTop: 24,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    waitingForOthers: {
        marginTop: 8,
        fontSize: 14,
        color: '#EC4899',
        fontWeight: '700',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    resultsModal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingTop: 40,
        maxHeight: '90%',
    },
    gameOverModal: {
        height: '95%',
        backgroundColor: '#F9FAFB',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    resultsHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    revealedBadge: {
        backgroundColor: '#FCE7F3',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    revealedText: {
        color: '#EC4899',
        fontSize: 12,
        fontWeight: '800',
    },
    correctLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    correctMovieName: {
        fontSize: 32,
        fontWeight: '900',
        color: '#EC4899',
        textAlign: 'center',
    },
    resultDialogue: {
        fontSize: 16,
        color: '#374151',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.8,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    resultsList: {
        maxHeight: 250,
        marginBottom: 20,
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
    },
    answerStatus: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    resultContent: {
        flex: 1,
    },
    resultAuthor: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    resultAnswer: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    pointsEarned: {
        fontSize: 14,
        fontWeight: '800',
        color: '#10B981',
    },
    leaderboard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    leaderboardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 16,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    rankContainer: {
        width: 36,
    },
    scoreRank: {
        fontSize: 15,
        fontWeight: '800',
        color: '#EC4899',
    },
    scoreName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    scoreContainer: {
        alignItems: 'flex-end',
    },
    scoreValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    // Game Over Specific
    gameOverContainer: {
        flex: 1,
        alignItems: 'center',
    },
    winnerSection: {
        alignItems: 'center',
        marginTop: 20,
    },
    congratsText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#6B7280',
        marginTop: 16,
        letterSpacing: 2,
    },
    winnerName: {
        fontSize: 36,
        fontWeight: '900',
        color: '#EC4899',
        textAlign: 'center',
        marginTop: 8,
    },
    finalLeaderboardList: {
        width: '100%',
        marginTop: 10,
    },
    winnerRow: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    exitBtn: {
        backgroundColor: '#EC4899',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    exitBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
});

export default MemeMatchScreen;
