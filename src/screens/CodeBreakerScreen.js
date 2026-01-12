import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    Modal,
    Alert,
    FlatList,
    BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import * as Animatable from 'react-native-animatable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CODE_TYPES = {
    numbers: { options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], label: 'Numbers', icon: 'keypad' },
    colors: {
        options: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '🩷', '🩵'],
        label: 'Colors',
        icon: 'color-palette'
    },
    symbols: {
        options: ['★', '♠', '♥', '♦', '♣', '●', '■', '▲'],
        label: 'Symbols',
        icon: 'shapes'
    }
};

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const CodeBreakerScreen = ({ navigation, route }) => {
    const { roomId, isHost } = route.params;
    const { user, socket } = useAuth();

    // Game State
    const [gameState, setGameState] = useState(null);
    const [players, setPlayers] = useState([]);
    const [currentGuess, setCurrentGuess] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [timeRemaining, setTimeRemaining] = useState(180);
    const [showSettings, setShowSettings] = useState(false);
    const [selectedCodeType, setSelectedCodeType] = useState('numbers');
    const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
    const [showResults, setShowResults] = useState(false);
    const [turnResult, setTurnResult] = useState(null);
    const [isCodeMaker, setIsCodeMaker] = useState(false);
    const [codeLength, setCodeLength] = useState(4);
    const [maxAttempts, setMaxAttempts] = useState(10);
    const [gameStarted, setGameStarted] = useState(false);
    const [roundInProgress, setRoundInProgress] = useState(false);
    const [codeMakerName, setCodeMakerName] = useState('');
    const [makerSecretCode, setMakerSecretCode] = useState(null);
    const [showPickCode, setShowPickCode] = useState(false);
    const [codeOptions, setCodeOptions] = useState([]);
    const [pickedCode, setPickedCode] = useState([]);

    const handleLeaveGame = () => {
        if (roundInProgress || showPickCode) {
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
    }, [roundInProgress, showPickCode]);

    useEffect(() => {
        if (socket && user) {
            // Ensure player is added to the room list in the global game state
            socket.emit('games:join', {
                roomId,
                userId: user._id,
                userName: user.displayName || user.fullName || 'Anonymous'
            });

            // Also join the specific game namespace handlers
            socket.emit('codebreaker:join', { roomId });

            socket.on('game:update', (room) => {
                console.log('Game updated:', room);
                setGameState(room);
                setPlayers(room.players || []);
                if (room.status === 'playing' || room.state?.phase) {
                    setGameStarted(true);
                    if (room.state) {
                        const isMaker = room.state.currentCodeMaker === user._id;
                        setIsCodeMaker(isMaker);

                        if (room.state.phase === 'guessing') {
                            setRoundInProgress(true);
                            setShowPickCode(false);
                            setShowSettings(false);
                        } else if (room.state.phase === 'picking') {
                            setRoundInProgress(false);
                            // If I am maker, show picking screen. If not, show waiting screen.
                            setShowPickCode(isMaker);
                            setShowSettings(false);

                            // Initialize code options if I'm the maker
                            if (isMaker && room.state.codeType) {
                                setCodeOptions(CODE_TYPES[room.state.codeType]?.options || []);
                                setCodeLength(room.state.codeLength || 4);
                                // Initialize pickedCode array if it's empty or wrong length
                                setPickedCode(prev => (prev.length === room.state.codeLength) ? prev : Array(room.state.codeLength || 4).fill(null));
                            }
                        }

                        if (room.state.attempts) setAttempts(room.state.attempts);
                    }
                }
            });

            socket.on('game:error', (data) => {
                Alert.alert('Game Error', data.message);
            });

            socket.on('codebreaker:select_settings', (data) => {
                setShowSettings(true);
                setIsCodeMaker(true);
                setRoundInProgress(false);
                setShowPickCode(false);
            });

            socket.on('codebreaker:pick_code', (data) => {
                setShowSettings(false);
                setShowPickCode(true);
                setCodeOptions(data.options);
                setCodeLength(data.codeLength);
                setPickedCode(Array(data.codeLength).fill(null));
                setIsCodeMaker(true);
            });

            socket.on('codebreaker:game_started', (data) => {
                setShowSettings(false);
                setSelectedCodeType(data.codeType);
                setSelectedDifficulty(data.difficulty);
                setCodeLength(data.codeLength);
                setMaxAttempts(data.maxAttempts);
                setTimeRemaining(data.timeLimit);

                const isMaker = data.codeMaker === user._id;
                setIsCodeMaker(isMaker);

                if (data.phase === 'picking') {
                    setRoundInProgress(false);
                    setShowPickCode(isMaker);
                } else {
                    setRoundInProgress(true);
                    setShowPickCode(false);
                    setAttempts([]);
                    setCurrentGuess([]);
                }

                if (data.secretCode) {
                    setMakerSecretCode(data.secretCode);
                }
            });

            socket.on('codebreaker:attempt_made', (data) => {
                setAttempts(prev => [...prev, data.attempt]);
            });

            socket.on('codebreaker:time_update', (time) => {
                setTimeRemaining(time);
            });

            socket.on('codebreaker:turn_end', (data) => {
                setTurnResult(data);
                setShowResults(true);
                setRoundInProgress(false);
            });

            socket.on('codebreaker:new_turn', (data) => {
                setShowResults(false);
                setAttempts([]);
                setCurrentGuess([]);
                setIsCodeMaker(data.codeMakerId === user._id);
                setCodeMakerName(data.codeMaker);
                setRoundInProgress(false);
                setMakerSecretCode(null);
            });

            socket.on('codebreaker:game_over', (data) => {
                setTurnResult(data);
                setShowResults(true);
                setRoundInProgress(false);
                setTimeout(() => {
                    navigation.navigate('MaverickGames');
                }, 30000);
            });

            return () => {
                socket.off('codebreaker:select_settings');
                socket.off('codebreaker:game_started');
                socket.off('codebreaker:attempt_made');
                socket.off('codebreaker:time_update');
                socket.off('codebreaker:turn_end');
                socket.off('codebreaker:new_turn');
                socket.off('codebreaker:game_over');
                socket.emit('codebreaker:leave', roomId);
            };
        }
    }, [socket, roomId]);

    const handleStartGame = () => {
        socket.emit('codebreaker:start_turn', {
            roomId,
            codeType: selectedCodeType,
            difficulty: selectedDifficulty
        });
    };

    // ... helper functions ...

    const renderWaitingForCodeMaker = () => (
        <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.waitingTitle}>Waiting for Code Maker</Text>
            <Text style={styles.waitingText}>
                {codeMakerName} is setting up the secret code...
            </Text>
            <View style={styles.waitingTip}>
                <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
                <Text style={styles.waitingTipText}>
                    Tip: Look for patterns in previous guesses!
                </Text>
            </View>
        </View>
    );

    const handleAddToGuess = (value) => {
        if (currentGuess.length < codeLength) {
            setCurrentGuess([...currentGuess, value]);
        }
    };

    const handleRemoveFromGuess = () => {
        setCurrentGuess(currentGuess.slice(0, -1));
    };

    const handleConfirmSecretCode = () => {
        if (pickedCode.some(c => c === null)) {
            Alert.alert('Incomplete Code', 'Please fill all slots for your secret code.');
            return;
        }

        socket.emit('codebreaker:set_code', {
            roomId,
            secretCode: pickedCode
        });
    };

    const handlePickSlot = (index, value) => {
        const newCode = [...pickedCode];
        newCode[index] = value;
        setPickedCode(newCode);
    };

    const handleSubmitGuess = () => {
        if (currentGuess.length !== codeLength) {
            Alert.alert('Incomplete Code', `Please select ${codeLength} items`);
            return;
        }

        socket.emit('codebreaker:guess', {
            roomId,
            userId: user._id,
            userName: user.displayName || user.fullName || user.userName || 'Anonymous',
            guess: currentGuess
        });

        setCurrentGuess([]);
    };

    const renderCodeInput = () => {
        const options = CODE_TYPES[selectedCodeType].options;

        return (
            <View style={styles.codeInputSection}>
                <Text style={styles.sectionTitle}>Your Guess</Text>
                <View style={styles.guessDisplay}>
                    {Array.from({ length: codeLength }).map((_, index) => (
                        <View key={index} style={styles.guessSlot}>
                            <Text style={styles.guessSlotText}>
                                {currentGuess[index] || '?'}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.optionsGrid}>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.optionButton}
                            onPress={() => handleAddToGuess(option)}
                            disabled={currentGuess.length >= codeLength}
                        >
                            <Text style={styles.optionText}>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.clearBtn]}
                        onPress={handleRemoveFromGuess}
                        disabled={currentGuess.length === 0}
                    >
                        <Ionicons name="backspace" size={20} color="#FFF" />
                        <Text style={styles.actionBtnText}>Clear</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.submitBtn, currentGuess.length !== codeLength && styles.btnDisabled]}
                        onPress={handleSubmitGuess}
                        disabled={currentGuess.length !== codeLength}
                    >
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                        <Text style={styles.actionBtnText}>Submit</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderAttemptHistory = () => {
        return (
            <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>
                    Attempts ({attempts.length}/{maxAttempts})
                </Text>
                <ScrollView style={styles.historyScroll}>
                    {[...attempts].reverse().map((attempt, index) => (
                        <Animatable.View
                            key={attempts.length - 1 - index}
                            animation="fadeInLeft"
                            delay={index * 50}
                            style={styles.attemptCard}
                        >
                            <View style={styles.attemptHeader}>
                                <Text style={styles.attemptNumber}>#{attempts.length - index}</Text>
                                <Text style={styles.attemptUser}>{attempt.userName}</Text>
                            </View>
                            <View style={styles.attemptGuess}>
                                {attempt.guess.map((item, i) => (
                                    <View key={i} style={styles.attemptSlot}>
                                        <Text style={styles.attemptSlotText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.clueRow}>
                                <View style={styles.clueItem}>
                                    <View style={[styles.clueDot, { backgroundColor: '#10B981' }]} />
                                    <Text style={styles.clueText}>×{attempt.clue.correct}</Text>
                                </View>
                                <View style={styles.clueItem}>
                                    <View style={[styles.clueDot, { backgroundColor: '#F59E0B' }]} />
                                    <Text style={styles.clueText}>×{attempt.clue.wrongPosition}</Text>
                                </View>
                                <View style={styles.clueItem}>
                                    <View style={[styles.clueDot, { backgroundColor: '#6B7280' }]} />
                                    <Text style={styles.clueText}>×{attempt.clue.wrong}</Text>
                                </View>
                            </View>
                        </Animatable.View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderPickCode = () => {
        return (
            <View style={styles.pickCodeContainer}>
                <Text style={styles.pickCodeTitle}>Create your Secret Code</Text>
                <Text style={styles.pickCodeSubtitle}>Choose {codeLength} items that players must guess</Text>

                <View style={styles.pickedSlots}>
                    {pickedCode.map((item, idx) => (
                        <View key={idx} style={[styles.pickSlot, item === null && styles.pickSlotEmpty]}>
                            <Text style={styles.pickSlotText}>{item || '?'}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.optionsGrid}>
                    {(codeOptions && codeOptions.length > 0 ? codeOptions : CODE_TYPES[selectedCodeType]?.options || []).map((opt, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.optionBtn}
                            onPress={() => {
                                const nextSlot = pickedCode.findIndex(c => c === null);
                                if (nextSlot !== -1) handlePickSlot(nextSlot, opt);
                                else handlePickSlot(codeLength - 1, opt); // Replace last if full
                            }}
                        >
                            <Text style={styles.optionText}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.pickActions}>
                    <TouchableOpacity
                        style={styles.clearBtn}
                        onPress={() => setPickedCode(Array(codeLength).fill(null))}
                    >
                        <Text style={styles.clearBtnText}>Clear</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.confirmBtn, pickedCode.some(c => c === null) && styles.confirmBtnDisabled]}
                        onPress={handleConfirmSecretCode}
                        disabled={pickedCode.some(c => c === null)}
                    >
                        <LinearGradient
                            colors={pickedCode.some(c => c === null) ? ['#9CA3AF', '#6B7280'] : ['#8B5CF6', '#7C3AED']}
                            style={styles.confirmGradient}
                        >
                            <Text style={styles.confirmBtnText}>CONFIRM CODE</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderLobby = () => {
        return (
            <View style={styles.lobbyContainer}>
                <Ionicons name="people-circle" size={80} color="#8B5CF6" />
                <Text style={styles.lobbyTitle}>Game Lobby</Text>
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
                            colors={players.length < 2 ? ['#9CA3AF', '#6B7280'] : ['#8B5CF6', '#7C3AED']}
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
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Connecting to Code Breaker...</Text>
            </View>
        );
    }

    if ((gameState.status === 'waiting' || gameState.status === 'lobby') && !gameState.state?.phase) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.header}>
                    <TouchableOpacity onPress={handleLeaveGame}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Code Breaker Lobby</Text>
                    </View>
                    <View style={{ width: 28 }} />
                </LinearGradient>
                {renderLobby()}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.header}
            >
                <TouchableOpacity onPress={handleLeaveGame}>
                    <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Code Breaker</Text>
                    <Text style={styles.headerSubtitle}>
                        {CODE_TYPES[selectedCodeType]?.label} • {selectedDifficulty}
                    </Text>
                </View>
                <View style={styles.timerBox}>
                    <Ionicons name="time" size={18} color="#FFF" />
                    <Text style={styles.timerText}>{timeRemaining}s</Text>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content}>
                {isCodeMaker && !showPickCode ? (
                    <View style={styles.codeMakerView}>
                        <Ionicons name="lock-closed" size={64} color="#8B5CF6" />
                        <Text style={styles.codeMakerTitle}>You're the Code Maker!</Text>
                        <Text style={styles.codeMakerText}>
                            Watch as others try to crack your secret code:
                        </Text>
                        {makerSecretCode && (
                            <View style={styles.makerCodeDisplay}>
                                {makerSecretCode.map((val, idx) => (
                                    <View key={idx} style={styles.makerCodeSlot}>
                                        <Text style={styles.makerCodeText}>{val}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <View style={{ flex: 1, width: '100%', marginTop: 20 }}>
                            {renderAttemptHistory()}
                        </View>
                    </View>
                ) : !roundInProgress ? (
                    showPickCode ? renderPickCode() : renderWaitingForCodeMaker()
                ) : (
                    <>
                        {renderCodeInput()}
                        {renderAttemptHistory()}
                    </>
                )}
            </ScrollView>

            {/* Settings Modal */}
            <Modal visible={showSettings} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.settingsModal}>
                        <Text style={styles.modalTitle}>Choose Game Settings</Text>

                        <Text style={styles.settingLabel}>Code Type</Text>
                        <View style={styles.codeTypeOptions}>
                            {Object.keys(CODE_TYPES).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.codeTypeBtn,
                                        selectedCodeType === type && styles.codeTypeBtnActive
                                    ]}
                                    onPress={() => setSelectedCodeType(type)}
                                >
                                    <Ionicons
                                        name={CODE_TYPES[type].icon}
                                        size={24}
                                        color={selectedCodeType === type ? '#8B5CF6' : '#6B7280'}
                                    />
                                    <Text style={[
                                        styles.codeTypeText,
                                        selectedCodeType === type && styles.codeTypeTextActive
                                    ]}>
                                        {CODE_TYPES[type].label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.settingLabel}>Difficulty</Text>
                        <View style={styles.difficultyOptions}>
                            {DIFFICULTIES.map((diff) => (
                                <TouchableOpacity
                                    key={diff}
                                    style={[
                                        styles.difficultyBtn,
                                        selectedDifficulty === diff && styles.difficultyBtnActive
                                    ]}
                                    onPress={() => setSelectedDifficulty(diff)}
                                >
                                    <Text style={[
                                        styles.difficultyText,
                                        selectedDifficulty === diff && styles.difficultyTextActive
                                    ]}>
                                        {diff.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.startGameBtn} onPress={handleStartGame}>
                            <LinearGradient
                                colors={['#8B5CF6', '#7C3AED']}
                                style={styles.startGameGradient}
                            >
                                <Text style={styles.startGameText}>START GAME</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Results Modal */}
            <Modal visible={showResults} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="zoomIn" style={styles.resultsModal}>
                        <TouchableOpacity
                            style={styles.closeModalBtn}
                            onPress={() => setShowResults(false)}
                        >
                            <Ionicons name="close-circle" size={32} color="#9CA3AF" />
                        </TouchableOpacity>

                        {turnResult?.reason === 'solved' ? (
                            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                        ) : (
                            <Ionicons name="close-circle" size={64} color="#EF4444" />
                        )}

                        <Text style={styles.resultsTitle}>
                            {turnResult?.reason === 'solved' ? 'Code Cracked!' : 'Code Not Cracked'}
                        </Text>

                        <Text style={styles.secretCodeLabel}>The secret code was:</Text>
                        <View style={styles.secretCodeDisplay}>
                            {turnResult?.secretCode?.map((item, index) => (
                                <View key={index} style={styles.secretCodeSlot}>
                                    <Text style={styles.secretCodeText}>{item}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.leaderboard}>
                            <Text style={styles.leaderboardTitle}>Scores</Text>
                            {turnResult?.scores?.slice(0, 3).map((score, index) => (
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
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
    codeMakerView: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        minHeight: 400,
    },
    codeMakerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 20,
    },
    codeMakerText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    makerCodeDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        padding: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    makerCodeSlot: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#8B5CF6',
    },
    makerCodeText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
    },
    codeInputSection: {
        padding: 20,
    },
    pickCodeContainer: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    pickCodeTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    pickCodeSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 32,
    },
    pickedSlots: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 40,
    },
    pickSlot: {
        width: 55,
        height: 55,
        borderRadius: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#8B5CF6',
        elevation: 2,
    },
    pickSlotEmpty: {
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    pickSlotText: {
        fontSize: 24,
        fontWeight: '700',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 40,
    },
    optionBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 1,
    },
    optionText: {
        fontSize: 20,
    },
    pickActions: {
        width: '100%',
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
    },
    clearBtn: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
    },
    clearBtnText: {
        color: '#4B5563',
        fontWeight: '600',
        fontSize: 16,
    },
    confirmBtn: {
        flex: 2,
        borderRadius: 16,
        overflow: 'hidden',
    },
    confirmBtnDisabled: {
        opacity: 0.7,
    },
    confirmGradient: {
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    guessDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    guessSlot: {
        width: 60,
        height: 60,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    guessSlotText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginBottom: 20,
    },
    optionButton: {
        width: 60,
        height: 60,
        backgroundColor: '#FFF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    optionText: {
        fontSize: 24,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    clearBtn: {
        backgroundColor: '#6B7280',
    },
    submitBtn: {
        backgroundColor: '#8B5CF6',
    },
    btnDisabled: {
        opacity: 0.5,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    historySection: {
        padding: 20,
    },
    historyScroll: {
        maxHeight: 300,
    },
    attemptCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    attemptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    attemptNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    attemptUser: {
        fontSize: 14,
        color: '#6B7280',
    },
    attemptGuess: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    attemptSlot: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
    },
    attemptSlotText: {
        fontSize: 18,
        fontWeight: '600',
    },
    clueRow: {
        flexDirection: 'row',
        gap: 16,
    },
    clueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    clueDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    clueText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsModal: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        width: SCREEN_WIDTH - 40,
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 24,
        textAlign: 'center',
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginTop: 16,
    },
    codeTypeOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    codeTypeBtn: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    codeTypeBtnActive: {
        backgroundColor: '#EDE9FE',
        borderColor: '#8B5CF6',
    },
    codeTypeText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
        fontWeight: '600',
    },
    codeTypeTextActive: {
        color: '#8B5CF6',
    },
    difficultyOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    difficultyBtn: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    difficultyBtnActive: {
        backgroundColor: '#EDE9FE',
        borderColor: '#8B5CF6',
    },
    difficultyText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
    },
    difficultyTextActive: {
        color: '#8B5CF6',
    },
    startGameBtn: {
        marginTop: 24,
        borderRadius: 12,
        overflow: 'hidden',
    },
    startGameGradient: {
        padding: 16,
        alignItems: 'center',
    },
    startGameText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    resultsModal: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 32,
        width: SCREEN_WIDTH - 40,
        maxWidth: 400,
        alignItems: 'center',
    },
    closeModalBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    resultsTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 24,
    },
    secretCodeLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
    },
    secretCodeDisplay: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    secretCodeSlot: {
        width: 50,
        height: 50,
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secretCodeText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    leaderboard: {
        width: '100%',
    },
    leaderboardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 8,
    },
    scoreRank: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B5CF6',
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
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    avatarText: {
        color: '#8B5CF6',
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
        backgroundColor: '#8B5CF6',
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
    waitingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        minHeight: 400,
    },
    waitingTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 20,
        marginBottom: 8,
    },
    waitingText: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 30,
        textAlign: 'center',
    },
    waitingTip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    waitingTipText: {
        flex: 1,
        color: '#92400E',
        fontSize: 14,
        lineHeight: 20,
    },
});

export default CodeBreakerScreen;
