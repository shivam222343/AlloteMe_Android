import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Platform,
    Modal,
    FlatList,
    TextInput,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Video } from 'expo-av'; // For video preview
import * as ImagePicker from 'expo-image-picker';
import { snapsAPI, clubsAPI, membersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { prepareFile } from '../services/cloudinaryService';

const CameraScreen = ({ navigation, route }) => {
    const { user } = useAuth();
    const { type, clubId: initialClubId } = route.params || {};
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [cameraType, setCameraType] = useState('back');
    const [mode, setMode] = useState('picture');
    const [previewVisible, setPreviewVisible] = useState(false);
    const [capturedMedia, setCapturedMedia] = useState(null); // Renamed from capturedImage
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [clubs, setClubs] = useState([]);
    const [selectedClubId, setSelectedClubId] = useState(initialClubId);

    // Member selection states
    const [members, setMembers] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]); // Empty array means "All"
    const [showRecipientModal, setShowRecipientModal] = useState(false);
    const [snapCaption, setSnapCaption] = useState('');

    const cameraRef = useRef();

    const recordingTimer = useRef(null);

    useEffect(() => {
        fetchClubs();
        if (!micPermission?.granted) {
            requestMicPermission();
        }
    }, []);

    useEffect(() => {
        if (selectedClubId) {
            fetchMembers(selectedClubId);
            setSelectedRecipients([]);
        }
    }, [selectedClubId]);

    const fetchClubs = async () => {
        try {
            const res = await clubsAPI.getAll();
            if (res.success) {
                const userClubIds = (user.clubsJoined || []).map(c => (c.clubId?._id || c.clubId).toString());
                const joinedClubs = res.data.filter(club => userClubIds.includes(club._id.toString()));
                setClubs(joinedClubs);
                if (!selectedClubId && joinedClubs.length > 0) {
                    setSelectedClubId(joinedClubs[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching clubs:', error);
        }
    };

    const fetchMembers = async (clubId) => {
        try {
            const res = await membersAPI.getAll(clubId);
            if (res.success) {
                setMembers(res.data);
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const pickMedia = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'], // Updated from MediaTypeOptions
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setCapturedMedia({
                    uri: asset.uri,
                    type: asset.type,
                    width: asset.width,
                    height: asset.height
                });
                setPreviewVisible(true);
            }
        } catch (error) {
            console.error('Error picking media:', error);
            Alert.alert('Error', 'Failed to pick media from gallery');
        }
    };

    const handleShutterPress = () => {
        if (mode === 'picture') {
            takePicture();
        } else {
            // Video Mode
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                setCapturedMedia({ ...photo, type: 'image' });
                setPreviewVisible(true);
            } catch (error) {
                console.error("Failed to take picture", error);
            }
        }
    };

    const startRecording = async () => {
        if (cameraRef.current) {
            try {
                // Determine mode if needed, but 'picture' mode often fails to record.
                // Switching mode is async, so we might need to handle this.
                // For now, we assume CameraView might be in 'video' mode or we switch.
                // Since switching is slow, we might just try to record.
                // If it fails, we know we need to switch mode.

                // However, let's try setting mode to 'video' based on a state wrapper
                setMode('video');
                // Give a tiny delay for mode switch?
                await new Promise(r => setTimeout(r, 200));

                setIsRecording(true);
                const videoData = await cameraRef.current.recordAsync({ maxDuration: 30 });
                // recordAsync returns promise that resolves when recording stops
                setCapturedMedia({ uri: videoData.uri, type: 'video' });
                setPreviewVisible(true);

                // Cleanup after recording
                setMode('picture');
                setIsRecording(false);
                setDuration(0);
                clearInterval(recordingTimer.current);
            } catch (error) {
                console.error("Failed to record video", error);
                setIsRecording(false); // Reset on error
                setMode('picture');
            }
        }
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
            // isRecording will be set false in startRecording's await continuation
        }
    };

    const handleLongPress = () => {
        // Start recording
        startRecording();

        // Timer for max duration (30s)
        let startTime = Date.now();
        recordingTimer.current = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            setDuration(elapsed);
            if (elapsed >= 30) {
                stopRecording();
            }
        }, 100);
    };

    const handlePressOut = () => {
        if (isRecording) {
            stopRecording();
        }
    };

    const handleUpload = async () => {
        if (!selectedClubId) {
            Alert.alert('Selection Required', 'Please select a club first');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();

            // Prepare file using centralized service
            const file = await prepareFile(capturedMedia.uri);
            formData.append('file', file);

            formData.append('clubId', selectedClubId);
            formData.append('type', capturedMedia.type); // 'image' or 'video'
            formData.append('caption', snapCaption);
            formData.append('recipients', JSON.stringify(selectedRecipients));

            const res = await snapsAPI.upload(formData, (progress) => {
                setUploadProgress(progress);
            });
            if (res.success) {
                navigation.goBack();
            } else {
                Alert.alert('Upload Failed', res.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Snap upload error details:', {
                message: error.message,
                originalError: error.originalError,
                code: error.code,
                url: error.url || error.config?.url,
                method: error.config?.method,
                timeout: error.config?.timeout
            });
            Alert.alert('Upload Failed', error.message || 'Network error while uploading snap. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const toggleRecipient = (id) => {
        if (selectedRecipients.includes(id)) {
            setSelectedRecipients(prev => prev.filter(mid => mid !== id));
        } else {
            setSelectedRecipients(prev => [...prev, id]);
        }
    };

    if (previewVisible && capturedMedia) {
        return (
            <SafeAreaView style={styles.container}>
                {capturedMedia.type === 'video' ? (
                    <Video
                        source={{ uri: capturedMedia.uri }}
                        style={styles.preview}
                        resizeMode="cover"
                        shouldPlay
                        isLooping
                    />
                ) : (
                    <Image source={{ uri: capturedMedia.uri }} style={styles.preview} />
                )}
                <View style={styles.topControls}>
                    <TouchableOpacity onPress={() => setPreviewVisible(false)} style={styles.closeButton}>
                        <Ionicons name="close" size={30} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomControls}>
                    <View style={styles.clubPicker}>
                        <Text style={styles.pickerLabel}>Post to:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {clubs.map(club => (
                                <TouchableOpacity
                                    key={club._id}
                                    style={[styles.clubTab, selectedClubId === club._id && styles.clubTabActive]}
                                    onPress={() => setSelectedClubId(club._id)}
                                >
                                    <Text style={[styles.clubTabText, selectedClubId === club._id && styles.clubTabTextActive]}>
                                        {club.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.recipientSelector}
                            onPress={() => setShowRecipientModal(true)}
                        >
                            <Ionicons name={selectedRecipients.length === 0 ? "people" : "lock-closed"} size={18} color="#FFF" />
                            <Text style={styles.recipientText}>
                                {selectedRecipients.length === 0 ? 'Send to Everyone' : `Send to ${selectedRecipients.length} Selected`}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.captionInput}
                        placeholder="Add a caption..."
                        placeholderTextColor="rgba(255,255,255,0.7)"
                        value={snapCaption}
                        onChangeText={setSnapCaption}
                        multiline
                    />

                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={handleUpload}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <View style={{ width: '100%', alignItems: 'center' }}>
                                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Uploading... {uploadProgress}%</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.uploadButtonText}>Post Snap</Text>
                                <Ionicons name="send" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Recipient Modal */}
                <Modal
                    visible={showRecipientModal}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowRecipientModal(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowRecipientModal(false)}
                    >
                        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Recipients</Text>
                                <TouchableOpacity onPress={() => setShowRecipientModal(false)}>
                                    <Ionicons name="close" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.recipientOption}
                                onPress={() => setSelectedRecipients([])}
                            >
                                <View style={[styles.checkbox, selectedRecipients.length === 0 && styles.checkboxActive]}>
                                    {selectedRecipients.length === 0 && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                </View>
                                <Text style={styles.recipientName}>Everyone in {clubs.find(c => c._id === selectedClubId)?.name}</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalSubtitle}>Or select specific members:</Text>
                            <FlatList
                                data={members}
                                keyExtractor={item => item._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.recipientOption}
                                        onPress={() => toggleRecipient(item._id)}
                                    >
                                        <View style={[styles.checkbox, selectedRecipients.includes(item._id) && styles.checkboxActive]}>
                                            {selectedRecipients.includes(item._id) && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                        </View>
                                        <Image
                                            source={item.profilePicture?.url ? { uri: item.profilePicture.url } : { uri: 'https://ui-avatars.com/api/?name=' + item.displayName }}
                                            style={styles.recipientAvatar}
                                        />
                                        <Text style={styles.recipientName}>{item.displayName}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity
                                style={styles.doneButton}
                                onPress={() => setShowRecipientModal(false)}
                            >
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={cameraType}
                mode={mode}
            />
            <View style={styles.cameraOverlay}>
                <View style={styles.topControls}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Ionicons name="close" size={30} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.cameraBottom}>
                    {/* Mode Switcher */}
                    <View style={styles.modeSwitcher}>
                        <TouchableOpacity onPress={() => setMode('picture')}>
                            <Text style={[styles.modeText, mode === 'picture' && styles.modeTextActive]}>PHOTO</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setMode('video')}>
                            <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>VIDEO</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.controlsRow}>
                        {/* Gallery Button */}
                        <TouchableOpacity style={styles.iconButton} onPress={pickMedia}>
                            <Ionicons name="images" size={28} color="#FFF" />
                        </TouchableOpacity>

                        {/* Shutter Button */}
                        <View style={styles.shootButtonContainer}>
                            <Svg height="88" width="88" viewBox="0 0 100 100" style={styles.progressRing}>
                                <Circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke={mode === 'video' || isRecording ? "#FF0000" : "#0A66C2"}
                                    strokeWidth="5"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 45}
                                    strokeDashoffset={2 * Math.PI * 45 * (1 - duration / 30)}
                                    // strokeLinecap="round"
                                    rotation="-90"
                                    {...(Platform.OS !== 'web' ? { origin: "50, 50" } : {})}
                                />
                            </Svg>
                            <TouchableOpacity
                                style={[
                                    styles.shootButton,
                                    mode === 'video' && styles.videoButton,
                                    isRecording && styles.recordingButton
                                ]}
                                onPress={handleShutterPress}
                                onLongPress={mode === 'picture' ? handleLongPress : undefined}
                                onPressOut={mode === 'picture' ? handlePressOut : undefined}
                                delayLongPress={300}
                            />
                        </View>

                        {/* Flip Button (Moved here for balance) */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setCameraType(prev => prev === 'back' ? 'front' : 'back')}
                        >
                            <Ionicons name="camera-reverse" size={28} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>

    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 20,
    },
    closeButton: {
        padding: 5,
    },
    flipButton: {
        padding: 5,
    },
    cameraBottom: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    shootButtonContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    progressRing: {
        position: 'absolute',
        top: -4,
        left: -4,
    },
    shootButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFF',
    },
    recordingButton: {
        width: 50,
        height: 50,
        borderRadius: 10,
        backgroundColor: '#F00', // Red square when recording
    },
    preview: {
        ...StyleSheet.absoluteFillObject,
    },
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    clubPicker: {
        marginBottom: 20,
    },
    pickerLabel: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
    },
    clubTab: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginRight: 10,
    },
    clubTabActive: {
        backgroundColor: '#0A66C2',
    },
    clubTabText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    clubTabTextActive: {
        fontWeight: '700',
    },
    uploadButton: {
        backgroundColor: '#0A66C2',
        flexDirection: 'row',
        height: 55,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    uploadButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    permissionText: {
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 40,
    },
    permissionButton: {
        backgroundColor: '#0A66C2',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        alignSelf: 'center',
    },
    permissionButtonText: {
        color: '#FFF',
        fontWeight: '700',
    },
    recipientSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 10,
        borderRadius: 12,
    },
    recipientText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        width: '100%',
        height: '100%',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        height: '70%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    modalSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 15,
        marginBottom: 10,
    },
    recipientOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    checkboxActive: {
        backgroundColor: '#0A66C2',
    },
    recipientAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    recipientName: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    doneButton: {
        backgroundColor: '#0A66C2',
        paddingVertical: 15,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 20,
    },
    doneButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    captionInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 12,
        color: '#FFF',
        fontSize: 16,
        marginBottom: 15,
        maxHeight: 100,
        ...Platform.select({
            web: { outlineWidth: 0 }
        }),
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 30,
        marginBottom: 20,
    },
    iconButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeSwitcher: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 25,
        gap: 30,
    },
    modeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '800',
        paddingVertical: 6,
        paddingHorizontal: 12,
        letterSpacing: 1,
    },
    modeTextActive: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        overflow: 'hidden',
        color: '#F4B400',
        textShadowColor: 'rgba(244, 180, 0, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    videoButton: {
        backgroundColor: '#FF0000',
        transform: [{ scale: 0.9 }],
    },
});

export default CameraScreen;
