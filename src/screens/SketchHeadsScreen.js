import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Modal,
    StatusBar,
    BackHandler,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path } from 'react-native-svg';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../contexts/AuthContext';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH - 40;

const SketchHeadsScreen = ({ navigation, route }) => {
    const { roomId, isHost } = route.params;
    const { user, socket } = useAuth();

    // Game State
    const [gameState, setGameState] = useState(null);
    const [currentWord, setCurrentWord] = useState('');
    const [wordOptions, setWordOptions] = useState([]);
    const [showWordSelection, setShowWordSelection] = useState(false);
    const [hint, setHint] = useState('');
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [remotePaths, setRemotePaths] = useState([]);
    const [guessText, setGuessText] = useState('');
    const [guessFeed, setGuessFeed] = useState([]);
    const [timeRemaining, setTimeRemaining] = useState(90);
    const [turnInfo, setTurnInfo] = useState({ round: 0, turn: 0, totalTurns: 0 });
    const [showTurnResult, setShowTurnResult] = useState(false);
    const [turnResult, setTurnResult] = useState(null);

    // Refs
    const currentPathRef = useRef([]);

    // Drawing tools state
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [isEraser, setIsEraser] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState('#000000');
    const [showBrushSlider, setShowBrushSlider] = useState(false);
    const [customBrushSize, setCustomBrushSize] = useState(5);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showPlayersList, setShowPlayersList] = useState(false);

    // Undo/Redo state
    const [pathHistory, setPathHistory] = useState([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

    // Canvas background state
    const [canvasColor, setCanvasColor] = useState('#FFFFFF');

    const PRESET_COLORS = [
        '#000000', // Black
        '#EF4444', // Red
        '#3B82F6', // Blue
        '#10B981', // Green
        '#F59E0B', // Yellow
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#FFFFFF', // White
    ];

    const CANVAS_COLORS = ['#FFFFFF', '#000000', '#F3F4F6', '#FECACA', '#BFDBFE', '#BBF7D0', '#FEF3C7'];

    const BRUSH_SIZES = [
        { size: 3, label: 'Thin' },
        { size: 6, label: 'Medium' },
        { size: 12, label: 'Thick' },
    ];

    useEffect(() => {
        if (socket) {
            if (roomId) {
                socket.emit('games:join', {
                    roomId,
                    userId: user._id,
                    userName: user.displayName || user.fullName || 'Anonymous'
                });
            }

            // Listeners
            socket.on('game:update', (state) => {
                setGameState(state);
            });

            socket.on('game:turn_start', (data) => {
                setTurnInfo({
                    round: data.round,
                    turn: data.turn,
                    totalTurns: data.totalTurns
                });
                setIsMyTurn(data.drawerId === user._id);
                setRemotePaths([]);
                setGuessFeed([]);
                setHint('');
                setCurrentWord('');
                setShowTurnResult(false);
                setTimeRemaining(90);
                // Reset undo/redo history
                setPathHistory([]);
                setCurrentHistoryIndex(-1);
                // Reset canvas color
                setCanvasColor('#FFFFFF');
            });

            socket.on('game:word_options', (data) => {
                setWordOptions(data.options);
                setShowWordSelection(true);
            });

            socket.on('game:word_selected', (data) => {
                setHint(data.hint);
                setShowWordSelection(false);
            });

            socket.on('game:hint_update', (newHint) => {
                setHint(newHint);
            });

            socket.on('game:draw_update', (path) => {
                setRemotePaths(prev => [...prev, path]);
            });

            socket.on('game:canvas_cleared', () => {
                setRemotePaths([]);
            });

            socket.on('game:paths_synced', (data) => {
                setRemotePaths(data.paths);
            });

            socket.on('game:canvas_color_update', (data) => {
                setCanvasColor(data.color);
            });

            socket.on('game:time_update', (time) => {
                setTimeRemaining(time);
            });

            socket.on('game:guess_update', (data) => {
                setGuessFeed(data.guesses);
            });

            socket.on('game:turn_end', (data) => {
                setTurnResult(data);
                setShowTurnResult(true);
                setCurrentWord(data.word);
            });

            socket.on('game:over', (data) => {
                setTurnResult({ scores: data.leaderboard, word: '' });
                setShowTurnResult(true);

                // Auto-close and redirect after 30 seconds
                setTimeout(() => {
                    setShowTurnResult(false);
                    setTimeout(() => {
                        navigation.navigate('MaverickGames');
                    }, 300);
                }, 30000);
            });

            socket.on('game:error', (data) => {
                Alert.alert("Error", data.message);
            });

            return () => {
                socket.off('game:update');
                socket.off('game:turn_start');
                socket.off('game:word_options');
                socket.off('game:word_selected');
                socket.off('game:hint_update');
                socket.off('game:draw_update');
                socket.off('game:canvas_cleared');
                socket.off('game:time_update');
                socket.off('game:guess_update');
                socket.off('game:turn_end');
                socket.off('game:over');
                socket.off('game:error');
                socket.emit('games:leave', roomId || (gameState && gameState.roomId));
            };
        }
    }, [socket, roomId]);

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
    }, []);

    // Drawing Handlers
    const onGestureEvent = (event) => {
        if (!isMyTurn || showTurnResult || showWordSelection) return;

        const { x, y } = event.nativeEvent;
        const point = `${x},${y}`;
        currentPathRef.current.push(point);
        setCurrentPath([...currentPathRef.current]);
    };

    const onHandlerStateChange = (event) => {
        if (!isMyTurn || showTurnResult || showWordSelection) return;

        if (event.nativeEvent.state === State.END) {
            if (currentPathRef.current.length > 0) {
                const pathStr = `M ${currentPathRef.current.join(' L ')}`;
                const drawColor = isEraser ? canvasColor : selectedColor;
                const drawWidth = isEraser ? brushSize * 2 : brushSize;
                const pathObj = { d: pathStr, color: drawColor, width: drawWidth };

                socket.emit('game:draw', {
                    roomId: roomId || gameState?.roomId,
                    path: pathObj
                });

                const newPaths = [...remotePaths, pathObj];
                setRemotePaths(newPaths);

                // Add to history for undo/redo
                const newHistory = pathHistory.slice(0, currentHistoryIndex + 1);
                newHistory.push(newPaths);
                setPathHistory(newHistory);
                setCurrentHistoryIndex(newHistory.length - 1);

                currentPathRef.current = [];
                setCurrentPath([]);
            }
        }
    };

    const handleUndo = () => {
        if (currentHistoryIndex > 0) {
            const newIndex = currentHistoryIndex - 1;
            setCurrentHistoryIndex(newIndex);
            const previousPaths = pathHistory[newIndex] || [];
            setRemotePaths(previousPaths);

            // Sync with other players
            socket.emit('game:sync_paths', {
                roomId: roomId || gameState?.roomId,
                paths: previousPaths
            });
        } else if (currentHistoryIndex === 0) {
            setCurrentHistoryIndex(-1);
            setRemotePaths([]);
            socket.emit('game:sync_paths', {
                roomId: roomId || gameState?.roomId,
                paths: []
            });
        }
    };

    const handleRedo = () => {
        if (currentHistoryIndex < pathHistory.length - 1) {
            const newIndex = currentHistoryIndex + 1;
            setCurrentHistoryIndex(newIndex);
            const nextPaths = pathHistory[newIndex];
            setRemotePaths(nextPaths);

            // Sync with other players
            socket.emit('game:sync_paths', {
                roomId: roomId || gameState?.roomId,
                paths: nextPaths
            });
        }
    };

    const handleClearCanvas = () => {
        socket.emit('game:clear_canvas', { roomId: roomId || gameState?.roomId });
        // Add clear state to history
        const newHistory = pathHistory.slice(0, currentHistoryIndex + 1);
        newHistory.push([]);
        setPathHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
    };

    const handleCanvasColorChange = (color) => {
        setCanvasColor(color);
        socket.emit('game:change_canvas_color', {
            roomId: roomId || gameState?.roomId,
            color: color
        });
    };

    const handleSelectWord = (word) => {
        setCurrentWord(word);
        socket.emit('game:select_word', {
            roomId: roomId || gameState?.roomId,
            word
        });
        setShowWordSelection(false);
    };

    const handleSendGuess = () => {
        if (!guessText.trim()) return;

        socket.emit('game:guess', {
            roomId: roomId || gameState?.roomId,
            userId: user._id,
            userName: user.displayName,
            guess: guessText
        });
        setGuessText('');
    };

    const handleStartGame = () => {
        socket.emit('games:start', {
            roomId: roomId || gameState?.roomId,
            userId: user._id
        });
    };

    const handleCloseLeaderboard = () => {
        setShowTurnResult(false);
        if (!turnResult?.word) {
            // If it's the final leaderboard (game over), redirect to games
            setTimeout(() => {
                navigation.navigate('MaverickGames');
            }, 300);
        }
    };

    const handleLeaveGame = () => {
        setShowLeaveConfirm(true);
    };

    const confirmLeaveGame = () => {
        setShowLeaveConfirm(false);
        navigation.goBack();
    };

    if (!gameState) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0A66C2" />
                <Text style={styles.loadingText}>Connecting to Game Lobby...</Text>
            </View>
        );
    }

    // Lobby View
    if (gameState.status === 'lobby') {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { backgroundColor: '#F3F4F6' }]}>
                    <TouchableOpacity onPress={handleLeaveGame}>
                        <Ionicons name="close" size={28} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Game Lobby</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.lobbyContent}>
                    <Image source={require('../../assets/games/sketch_heads.png')} style={styles.lobbyLogo} />
                    <Text style={styles.roomCode}>ROOM: {gameState.roomId.split('_')[1]}</Text>

                    <View style={styles.playersList}>
                        <Text style={styles.playersTitle}>Players Joined ({gameState.players.length}/8)</Text>
                        <ScrollView contentContainerStyle={styles.playersContainer}>
                            {gameState.players.map((p, idx) => (
                                <Animatable.View
                                    key={p.userId || idx}
                                    animation="bounceIn"
                                    delay={idx * 100}
                                    style={styles.playerItem}
                                >
                                    <View style={styles.playerAvatar}>
                                        <Text style={styles.avatarText}>{(p.userName || 'A')[0]}</Text>
                                    </View>
                                    <Text style={styles.playerName}>{p.userName || 'Anonymous'} {p.userId === user._id && '(You)'}</Text>
                                    {p.userId === gameState.hostId && (
                                        <Ionicons name="star" size={16} color="#EAB308" />
                                    )}
                                </Animatable.View>
                            ))}
                        </ScrollView>
                    </View>

                    {isHost ? (
                        <TouchableOpacity
                            style={[styles.startBtn, gameState.players.length < 2 && styles.btnDisabled]}
                            onPress={handleStartGame}
                            disabled={gameState.players.length < 2}
                        >
                            <LinearGradient colors={['#0A66C2', '#0E76A8']} style={styles.startBtnGradient}>
                                <Text style={styles.startBtnText}>START MATCH</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.waitingContainer}>
                            <ActivityIndicator color="#0A66C2" />
                            <Text style={styles.waitingText}>Waiting for host to start...</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    // Main Game View
    const drawerName = gameState?.players?.find(p => p.userId === gameState?.state?.currentDrawer)?.userName || 'Someone';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
            >
                {/* Game Header */}
                <View style={styles.gameHeader}>
                    <View style={styles.timerBox}>
                        <Ionicons name="time-outline" size={18} color={timeRemaining < 10 ? '#EF4444' : '#0A66C2'} />
                        <Text style={[styles.timerText, timeRemaining < 10 && { color: '#EF4444' }]}>{timeRemaining}s</Text>
                    </View>

                    <View style={styles.roundInfo}>
                        <Text style={styles.roundText}>Round {turnInfo.round} - Turn {turnInfo.turn}/{turnInfo.totalTurns}</Text>
                        <Text style={styles.hintText}>
                            {isMyTurn ? (currentWord || '_ _ _') : (hint || '_ _ _')}
                        </Text>
                    </View>


                    <View style={styles.headerButtons}>
                        <TouchableOpacity onPress={() => setShowPlayersList(true)} style={styles.headerIconBtn}>
                            <Ionicons name="people" size={24} color="#0A66C2" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLeaveGame} style={styles.headerIconBtn}>
                            <Ionicons name="exit-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {/* Canvas Area */}
                    <View style={styles.canvasWrapper}>
                        {isMyTurn && !showWordSelection && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.canvasColorPicker}>
                                {CANVAS_COLORS.map(color => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.canvasColorOption,
                                            { backgroundColor: color },
                                            canvasColor === color && styles.canvasColorSelected,
                                            color === '#FFFFFF' && { borderWidth: 1, borderColor: '#E5E7EB' }
                                        ]}
                                        onPress={() => handleCanvasColorChange(color)}
                                    />
                                ))}
                            </ScrollView>
                        )}
                        <View style={[styles.canvasContainer, { backgroundColor: canvasColor }]}>
                            <PanGestureHandler
                                onGestureEvent={onGestureEvent}
                                onHandlerStateChange={onHandlerStateChange}
                                enabled={isMyTurn && !showTurnResult && !showWordSelection}
                            >
                                <View style={[styles.canvas, { backgroundColor: canvasColor }]}>
                                    <Svg width={CANVAS_SIZE} height={CANVAS_SIZE}>
                                        {remotePaths.map((path, idx) => (
                                            <Path
                                                key={`remote-${idx}`}
                                                d={path.d}
                                                stroke={path.color}
                                                strokeWidth={path.width}
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        ))}
                                        {currentPath.length > 1 && (
                                            <Path
                                                d={`M ${currentPath.join(' L ')}`}
                                                stroke={isEraser ? canvasColor : selectedColor}
                                                strokeWidth={isEraser ? brushSize * 2 : brushSize}
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        )}
                                    </Svg>
                                </View>
                            </PanGestureHandler>

                            {/* Undo/Redo Floating Buttons */}
                            {isMyTurn && !showWordSelection && (
                                <View style={styles.undoRedoOverlay}>
                                    <TouchableOpacity
                                        style={[styles.floatingActionBtn, currentHistoryIndex <= -1 && styles.btnDisabled]}
                                        onPress={handleUndo}
                                        disabled={currentHistoryIndex <= -1}
                                    >
                                        <Ionicons name="arrow-undo" size={18} color={currentHistoryIndex <= -1 ? '#9CA3AF' : '#374151'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.floatingActionBtn, currentHistoryIndex >= pathHistory.length - 1 && styles.btnDisabled]}
                                        onPress={handleRedo}
                                        disabled={currentHistoryIndex >= pathHistory.length - 1}
                                    >
                                        <Ionicons name="arrow-redo" size={18} color={currentHistoryIndex >= pathHistory.length - 1 ? '#9CA3AF' : '#374151'} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {!isMyTurn && (
                                <View style={styles.drawerIndicator}>
                                    <Text style={styles.drawerIndicatorText}>
                                        {showWordSelection ?
                                            `${drawerName} is selecting a word...` :
                                            `${drawerName} is drawing...`
                                        }
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Drawing Tools */}
                    {isMyTurn && !showWordSelection && (
                        <View style={styles.drawingTools}>
                            {/* Color Picker */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                                {PRESET_COLORS.map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: color },
                                            selectedColor === color && !isEraser && styles.colorOptionSelected,
                                            color === '#FFFFFF' && { borderWidth: 1, borderColor: '#E5E7EB' }
                                        ]}
                                        onPress={() => {
                                            setSelectedColor(color);
                                            setIsEraser(false);
                                        }}
                                    />
                                ))}
                            </ScrollView>

                            {/* Brush Size & Tools */}
                            <View style={styles.toolsRow}>
                                {/* Brush Sizes */}
                                <View style={styles.brushSizes}>
                                    {BRUSH_SIZES.map((brush) => (
                                        <TouchableOpacity
                                            key={brush.size}
                                            style={[
                                                styles.brushOption,
                                                brushSize === brush.size && !isEraser && styles.brushOptionSelected
                                            ]}
                                            onPress={() => {
                                                setBrushSize(brush.size);
                                                setIsEraser(false);
                                            }}
                                            onLongPress={() => {
                                                setCustomBrushSize(brush.size);
                                                setShowBrushSlider(true);
                                            }}
                                        >
                                            <View style={[styles.brushDot, { width: brush.size * 2, height: brush.size * 2 }]} />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Tool Buttons */}
                                <View style={styles.toolButtons}>
                                    <TouchableOpacity
                                        style={[styles.toolBtn, isEraser && styles.toolBtnActive]}
                                        onPress={() => setIsEraser(!isEraser)}
                                        onLongPress={() => {
                                            setCustomBrushSize(brushSize);
                                            setShowBrushSlider(true);
                                        }}
                                    >
                                        <Ionicons name="color-wand" size={20} color={isEraser ? '#FFF' : '#374151'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.toolBtn} onPress={handleClearCanvas}>
                                        <Ionicons name="trash" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Guess Feed */}
                    {guessFeed.length > 0 && (
                        <View style={styles.guessFeed}>
                            <Text style={styles.guessFeedTitle}>Recent Guesses:</Text>
                            {guessFeed.map((guess, idx) => (
                                <Animatable.View
                                    key={`${guess.userId}-${guess.timestamp}`}
                                    animation="fadeInLeft"
                                    duration={300}
                                    style={styles.guessItem}
                                >
                                    <View style={styles.guessAvatar}>
                                        <Text style={styles.guessAvatarText}>{guess.userName[0]}</Text>
                                    </View>
                                    <Text style={styles.guessName}>{guess.userName}</Text>
                                    <Ionicons
                                        name={guess.isCorrect ? "checkmark-circle" : "close-circle"}
                                        size={20}
                                        color={guess.isCorrect ? "#10B981" : "#EF4444"}
                                    />
                                    {guess.isCorrect && (
                                        <Text style={styles.guessPoints}>+{guess.points}</Text>
                                    )}
                                </Animatable.View>
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* Input Area */}
                {!isMyTurn && !showTurnResult && (
                    <View style={styles.inputArea}>
                        <TextInput
                            style={styles.guessInput}
                            placeholder="Type your guess here..."
                            value={guessText}
                            onChangeText={setGuessText}
                            onSubmitEditing={handleSendGuess}
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={handleSendGuess}>
                            <Ionicons name="send" size={24} color="#0A66C2" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Word Selection Modal */}
                <Modal
                    visible={showWordSelection}
                    transparent={true}
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <Animatable.View animation="zoomIn" style={styles.wordSelectionCard}>
                            <Text style={styles.wordSelectionTitle}>Choose Your Word</Text>
                            <Text style={styles.wordSelectionSubtitle}>Pick one to draw:</Text>

                            {wordOptions.map((word, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.wordOption}
                                    onPress={() => handleSelectWord(word)}
                                >
                                    <Text style={styles.wordOptionText}>{word}</Text>
                                </TouchableOpacity>
                            ))}
                        </Animatable.View>
                    </View>
                </Modal>

                {/* Turn Result Modal */}
                <Modal
                    visible={showTurnResult}
                    transparent={true}
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <Animatable.View animation="zoomIn" duration={500} style={styles.resultsCard}>
                            <TouchableOpacity
                                style={styles.closeModalBtn}
                                onPress={handleCloseLeaderboard}
                            >
                                <Ionicons name="close-circle" size={32} color="#9CA3AF" />
                            </TouchableOpacity>

                            {/* Header */}
                            {turnResult?.word ? (
                                <>
                                    <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
                                        <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                                    </Animatable.View>
                                    <Text style={styles.resultsTitle}>Turn Complete!</Text>
                                    <Text style={styles.correctWordLabel}>The word was:</Text>
                                    <Text style={styles.correctWordText}>{turnResult.word}</Text>
                                </>
                            ) : (
                                <>
                                    <Animatable.View animation="bounce" iterationCount="infinite" duration={1500}>
                                        <Ionicons name="trophy" size={80} color="#EAB308" />
                                    </Animatable.View>
                                    <LinearGradient
                                        colors={['#EAB308', '#F59E0B', '#EAB308']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.gameOverBadge}
                                    >
                                        <Text style={styles.gameOverText}>🎉 GAME OVER 🎉</Text>
                                    </LinearGradient>
                                    {turnResult?.scores?.[0] && (
                                        <Animatable.View animation="fadeIn" delay={300} style={styles.winnerSection}>
                                            <Text style={styles.winnerLabel}>Champion</Text>
                                            <View style={styles.winnerAvatar}>
                                                <Text style={styles.winnerAvatarText}>
                                                    {turnResult.scores[0].userName[0]}
                                                </Text>
                                            </View>
                                            <Text style={styles.winnerName}>{turnResult.scores[0].userName}</Text>
                                            <Text style={styles.winnerScore}>{turnResult.scores[0].score} points</Text>
                                        </Animatable.View>
                                    )}
                                </>
                            )}

                            <View style={styles.resultsDivider} />

                            {/* Leaderboard */}
                            <Text style={styles.leaderboardTitle}>
                                {turnResult?.word ? 'Round Standings' : 'Final Leaderboard'}
                            </Text>

                            <ScrollView style={styles.leaderboardScroll} showsVerticalScrollIndicator={false}>
                                {turnResult?.scores?.sort((a, b) => {
                                    if (turnResult?.word) {
                                        return (b.turnScore || 0) - (a.turnScore || 0);
                                    }
                                    return b.score - a.score;
                                }).map((s, idx) => (
                                    <Animatable.View
                                        key={s.userId}
                                        animation="fadeInRight"
                                        delay={idx * 100}
                                        style={[
                                            styles.scoreRow,
                                            idx === 0 && !turnResult?.word && styles.scoreRowWinner,
                                            idx === 1 && !turnResult?.word && styles.scoreRowSecond,
                                            idx === 2 && !turnResult?.word && styles.scoreRowThird,
                                        ]}
                                    >
                                        <View style={styles.scoreLeft}>
                                            {/* Medal/Position */}
                                            {!turnResult?.word && idx < 3 ? (
                                                <View style={styles.medalContainer}>
                                                    <Ionicons
                                                        name="medal"
                                                        size={24}
                                                        color={idx === 0 ? '#EAB308' : idx === 1 ? '#9CA3AF' : '#CD7F32'}
                                                    />
                                                </View>
                                            ) : (
                                                <View style={styles.positionNumber}>
                                                    <Text style={styles.positionText}>{idx + 1}</Text>
                                                </View>
                                            )}

                                            {/* Avatar */}
                                            <View style={[
                                                styles.scoreAvatar,
                                                idx === 0 && !turnResult?.word && styles.scoreAvatarWinner
                                            ]}>
                                                <Text style={[
                                                    styles.scoreAvatarText,
                                                    idx === 0 && !turnResult?.word && styles.scoreAvatarTextWinner
                                                ]}>
                                                    {s.userName[0]}
                                                </Text>
                                            </View>

                                            {/* Name */}
                                            <Text style={[
                                                styles.scoreName,
                                                idx === 0 && !turnResult?.word && styles.scoreNameWinner
                                            ]}>
                                                {s.userName}
                                            </Text>
                                        </View>

                                        {/* Score */}
                                        <View style={styles.scoreRight}>
                                            <Text style={[
                                                styles.scoreValue,
                                                idx === 0 && !turnResult?.word && styles.scoreValueWinner
                                            ]}>
                                                {turnResult?.word ? `+${s.turnScore || 0}` : s.score}
                                            </Text>
                                            <Text style={styles.scoreLabel}>pts</Text>
                                        </View>
                                    </Animatable.View>
                                ))}
                            </ScrollView>

                            <Text style={styles.nextTurnText}>
                                {turnResult?.word ? 'Preparing next round...' : 'Closing game in 30 seconds...'}
                            </Text>
                        </Animatable.View>
                    </View>
                </Modal>

                {/* Brush Size Slider Modal */}
                <Modal
                    visible={showBrushSlider}
                    transparent={true}
                    animationType="fade"
                >
                    <View style={styles.sliderModalOverlay}>
                        <Animatable.View animation="slideInUp" style={styles.sliderModal}>
                            <Text style={styles.sliderTitle}>Adjust Brush Size</Text>
                            <View style={styles.sliderPreview}>
                                <View style={[
                                    styles.brushPreviewDot,
                                    { width: customBrushSize * 4, height: customBrushSize * 4 }
                                ]} />
                            </View>
                            <Slider
                                style={styles.slider}
                                minimumValue={1}
                                maximumValue={20}
                                value={customBrushSize}
                                onValueChange={setCustomBrushSize}
                                minimumTrackTintColor="#0A66C2"
                                maximumTrackTintColor="#E5E7EB"
                                thumbTintColor="#0A66C2"
                            />
                            <Text style={styles.sliderValue}>{Math.round(customBrushSize)}px</Text>
                            <View style={styles.sliderButtons}>
                                <TouchableOpacity
                                    style={styles.sliderBtnCancel}
                                    onPress={() => setShowBrushSlider(false)}
                                >
                                    <Text style={styles.sliderBtnCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.sliderBtnApply}
                                    onPress={() => {
                                        setBrushSize(Math.round(customBrushSize));
                                        setShowBrushSlider(false);
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#0A66C2', '#0E76A8']}
                                        style={styles.sliderBtnGradient}
                                    >
                                        <Text style={styles.sliderBtnApplyText}>Apply</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </Animatable.View>
                    </View>
                </Modal>

                {/* Players List Modal */}
                <Modal
                    visible={showPlayersList}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowPlayersList(false)}
                >
                    <View style={styles.confirmModalOverlay}>
                        <Animatable.View animation="fadeInUp" style={styles.playersModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Players ({gameState?.players?.length || 0})</Text>
                                <TouchableOpacity onPress={() => setShowPlayersList(false)}>
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.playersListScroll}>
                                {gameState?.players?.map((player) => (
                                    <View key={player.userId} style={styles.playerListItem}>
                                        <View style={styles.playerAvatarSmall}>
                                            <Text style={styles.playerAvatarText}>
                                                {player.userName?.charAt(0).toUpperCase()}
                                            </Text>
                                            {player.userId === gameState?.state?.currentDrawer && (
                                                <View style={styles.drawerBadge}>
                                                    <Ionicons name="brush" size={10} color="#FFF" />
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.playerInfo}>
                                            <Text style={styles.playerName}>
                                                {player.userName} {player.userId === user._id && '(You)'}
                                            </Text>
                                            <Text style={styles.playerScore}>{player.score} pts</Text>
                                        </View>
                                        {gameState?.state?.correctGuessers?.includes(player.userId) && (
                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </Animatable.View>
                    </View>
                </Modal>

                {/* Leave Confirmation Modal */}
                <Modal
                    visible={showLeaveConfirm}
                    transparent={true}
                    animationType="fade"
                >
                    <View style={styles.confirmModalOverlay}>
                        <View style={styles.confirmModal}>
                            <Ionicons name="warning" size={60} color="#EF4444" />
                            <Text style={styles.confirmTitle}>{isHost ? "End Game for Everyone?" : "Leave Game?"}</Text>
                            <Text style={styles.confirmMessage}>
                                {isHost
                                    ? "You are the host. If you leave, the game room will be closed for all players. Are you sure?"
                                    : "Are you sure you want to leave? Your progress will be lost."}
                            </Text>
                            <View style={styles.confirmButtons}>
                                <TouchableOpacity
                                    style={styles.confirmBtnCancel}
                                    onPress={() => setShowLeaveConfirm(false)}
                                >
                                    <Text style={styles.confirmBtnCancelText}>Stay</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmBtnLeave}
                                    onPress={confirmLeaveGame}
                                >
                                    <Text style={styles.confirmBtnLeaveText}>Leave</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView >
        </GestureHandlerRootView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        marginTop: 16,
        color: '#6B7280',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 70,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingTop: Platform.OS === 'ios' ? 40 : 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    gameHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    },
    timerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    timerText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0A66C2',
    },
    roundInfo: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 12,
    },
    roundText: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    hintText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0A66C2',
        letterSpacing: 2,
    },
    lobbyContent: {
        flex: 1,
        alignItems: 'center',
        padding: 24,
    },
    lobbyLogo: {
        width: 150,
        height: 150,
        borderRadius: 20,
        marginBottom: 20,
    },
    roomCode: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        letterSpacing: 2,
    },
    playersList: {
        flex: 1,
        width: '100%',
        marginTop: 32,
    },
    playersTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    playersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    playerItem: {
        width: (SCREEN_WIDTH - 80) / 3,
        alignItems: 'center',
        marginBottom: 20,
    },
    playerAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#EBF5FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#0A66C2',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0A66C2',
    },
    playerName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    startBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 20,
    },
    startBtnGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    btnDisabled: {
        opacity: 0.5,
    },
    waitingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 20,
    },
    waitingText: {
        color: '#6B7280',
        fontSize: 14,
    },
    canvasWrapper: {
        padding: 20,
        alignItems: 'center',
    },
    canvasContainer: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        position: 'relative',
    },
    canvas: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    clearBtn: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    drawerIndicator: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    drawerIndicatorText: {
        backgroundColor: 'rgba(10, 102, 194, 0.9)',
        color: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        fontSize: 12,
        fontWeight: '600',
    },
    guessFeed: {
        margin: 20,
        marginTop: 0,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    guessFeedTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 12,
    },
    guessItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    guessAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EBF5FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#0A66C2',
    },
    guessAvatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0A66C2',
    },
    guessName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    guessPoints: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    inputArea: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        alignItems: 'center',
    },
    guessInput: {
        flex: 1,
        height: 48,
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 20,
        fontSize: 15,
    },
    sendBtn: {
        marginLeft: 12,
        padding: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    wordSelectionCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFF',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
    },
    wordSelectionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1F2937',
        marginBottom: 8,
    },
    wordSelectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    wordOption: {
        width: '100%',
        backgroundColor: '#EBF5FF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#0A66C2',
    },
    wordOptionText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0A66C2',
        textAlign: 'center',
    },
    resultsCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFF',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
    },
    resultsTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0A66C2',
        marginBottom: 16,
    },
    correctWordLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    correctWordText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#EF4444',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    resultsDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 24,
    },
    leaderboardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 8,
        padding: 8,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    scoreLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    scoreAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EBF5FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#0A66C2',
    },
    scoreAvatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0A66C2',
    },
    scoreName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        flex: 1,
    },
    scoreNameWinner: {
        fontSize: 16,
        fontWeight: '800',
        color: '#EAB308',
    },
    scoreRight: {
        alignItems: 'flex-end',
    },
    scoreValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0A66C2',
    },
    scoreValueWinner: {
        fontSize: 28,
        color: '#EAB308',
    },
    scoreLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    gameOverBadge: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
        marginVertical: 16,
    },
    gameOverText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    winnerSection: {
        alignItems: 'center',
        marginVertical: 20,
        padding: 20,
        backgroundColor: '#FEF3C7',
        borderRadius: 20,
        width: '100%',
        borderWidth: 2,
        borderColor: '#EAB308',
    },
    winnerLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#92400E',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 12,
    },
    winnerAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EAB308',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
        marginBottom: 12,
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    winnerAvatarText: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFF',
    },
    winnerName: {
        fontSize: 24,
        fontWeight: '900',
        color: '#92400E',
        marginBottom: 4,
    },
    winnerScore: {
        fontSize: 18,
        fontWeight: '700',
        color: '#EAB308',
    },
    leaderboardScroll: {
        maxHeight: 300,
        width: '100%',
    },
    scoreRowWinner: {
        backgroundColor: '#FEF3C7',
        borderColor: '#EAB308',
        borderWidth: 2,
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    scoreRowSecond: {
        backgroundColor: '#F3F4F6',
        borderColor: '#9CA3AF',
        borderWidth: 2,
    },
    scoreRowThird: {
        backgroundColor: '#FED7AA',
        borderColor: '#CD7F32',
        borderWidth: 2,
    },
    medalContainer: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    positionNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    positionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
    },
    scoreAvatarWinner: {
        backgroundColor: '#EAB308',
        borderColor: '#FFF',
        borderWidth: 3,
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    scoreAvatarTextWinner: {
        color: '#FFF',
        fontSize: 20,
    },
    nextTurnText: {
        marginTop: 24,
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    drawingTools: {
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        margin: 20,
        marginTop: 0,
        gap: 12,
    },
    colorPicker: {
        flexDirection: 'row',
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: '#0A66C2',
        borderWidth: 3,
    },
    toolsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brushSizes: {
        flexDirection: 'row',
        gap: 10,
    },
    brushOption: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    brushOptionSelected: {
        borderColor: '#0A66C2',
        backgroundColor: '#EBF5FF',
    },
    brushDot: {
        backgroundColor: '#374151',
        borderRadius: 100,
    },
    toolButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    toolBtn: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    toolBtnActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    closeModalBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    },
    sliderModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sliderModal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 32,
        paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    },
    sliderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 24,
        textAlign: 'center',
    },
    sliderPreview: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
        marginBottom: 16,
    },
    brushPreviewDot: {
        backgroundColor: '#374151',
        borderRadius: 100,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0A66C2',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    sliderButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    sliderBtnCancel: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sliderBtnCancelText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    },
    sliderBtnApply: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        overflow: 'hidden',
    },
    sliderBtnGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sliderBtnApplyText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    confirmModal: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
    },
    confirmTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 12,
    },
    confirmMessage: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmBtnCancel: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnCancelText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    },
    confirmBtnLeave: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnLeaveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    drawingTools: {
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        margin: 20,
        marginTop: 0,
        gap: 12,
    },
    colorPicker: {
        flexDirection: 'row',
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: '#0A66C2',
        borderWidth: 3,
    },
    toolsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brushSizes: {
        flexDirection: 'row',
        gap: 10,
    },
    brushOption: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    brushOptionSelected: {
        borderColor: '#0A66C2',
        backgroundColor: '#EBF5FF',
    },
    brushDot: {
        backgroundColor: '#374151',
        borderRadius: 100,
    },
    toolButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    toolBtn: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    toolBtnActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    toolBtnDisabled: {
        opacity: 0.4,
    },
    undoRedoOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        gap: 8,
        zIndex: 20,
    },
    floatingActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    btnDisabled: {
        opacity: 0.5,
        backgroundColor: '#F3F4F6',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvasColorPicker: {
        flexDirection: 'row',
        marginBottom: 12,
        maxHeight: 40,
    },
    canvasColorOption: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    canvasColorSelected: {
        borderColor: '#0A66C2',
        borderWidth: 3,
        transform: [{ scale: 1.1 }],
    },
    playersModalContent: {
        backgroundColor: '#FFF',
        width: '90%',
        maxHeight: '70%',
        borderRadius: 24,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    playersListScroll: {
        maxHeight: 400,
    },
    playerListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    playerAvatarSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EBF5FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        position: 'relative',
    },
    playerAvatarText: {
        color: '#0A66C2',
        fontSize: 16,
        fontWeight: '700',
    },
    drawerBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#0A66C2',
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    playerScore: {
        fontSize: 14,
        color: '#6B7280',
    },
});

export default SketchHeadsScreen;
