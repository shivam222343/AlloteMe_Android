import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions, Vibration, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

const IncomingCallModal = () => {
    const { callState, callData, acceptCall, endCall } = useCall();

    if (callState !== 'incoming' || !callData) return null;

    const caller = callData.caller || { displayName: 'Unknown', profilePicture: null };
    const isVideo = callData.type === 'video';

    return (
        <Modal visible={true} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <LinearGradient
                    colors={['rgba(17, 24, 39, 0.95)', 'rgba(31, 41, 55, 0.98)']}
                    style={styles.container}
                >
                    <Animatable.View
                        animation="pulse"
                        easing="ease-out"
                        iterationCount="infinite"
                        style={styles.incomingHeader}
                    >
                        <View style={styles.callerImageContainer}>
                            <Image
                                source={caller.profilePicture?.url ? { uri: caller.profilePicture.url } : { uri: `https://ui-avatars.com/api/?name=${caller.displayName}` }}
                                style={styles.callerImage}
                            />
                        </View>
                        <Text style={styles.callerName}>{caller.displayName}</Text>
                        <Text style={styles.callStatus}>Incoming {isVideo ? 'Video' : 'Audio'} Call...</Text>
                    </Animatable.View>

                    <View style={styles.incomingActions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.declineBtn]}
                            onPress={() => endCall()}
                        >
                            <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                            <Text style={styles.btnLabel}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={acceptCall}
                        >
                            <Animatable.View animation="tada" iterationCount="infinite" duration={1500}>
                                <Ionicons name={isVideo ? "videocam" : "call"} size={32} color="#FFF" />
                            </Animatable.View>
                            <Text style={styles.btnLabel}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
};

const ActiveCallModal = () => {
    const { callState, callData, endCall } = useCall();
    const { user } = useAuth();

    if (callState !== 'active' && callState !== 'outgoing') return null;

    // Check if I am the caller or the recipient
    const amICaller = callData?.recipients && !callData?.caller;
    // If callData has 'recipients' array and NO 'caller' object (or caller is me), I started it.
    // Correction: In CallContext.startCall, we set callData with recipients. 
    // In socket.on('call:incoming'), we set callData with caller.
    // So if callData.recipients exists, I am the caller.

    const roomId = callData?.roomId || `call-fallback-${Date.now()}`;
    const displayName = user?.displayName || 'Maverick';

    // Config for Jitsi
    const jitsiConfig = `config.prejoinPageEnabled=false&config.disableDeepLinking=true&userInfo.displayName="${encodeURIComponent(displayName)}"`;
    const jitsiUrl = `https://meet.jit.si/${roomId}#${jitsiConfig}`;

    return (
        <Modal visible={true} transparent animationType="slide">
            <View style={styles.activeContainer}>
                {Platform.OS === 'web' ? (
                    <iframe
                        src={jitsiUrl}
                        style={{ height: '100%', width: '100%', border: 'none' }}
                        allow="camera; microphone; fullscreen; display-capture; autoplay"
                    />
                ) : (
                    <WebView
                        source={{ uri: jitsiUrl }}
                        style={{ flex: 1 }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        mediaPlaybackRequiresUserAction={false}
                        allowsInlineMediaPlayback={true}
                        originWhitelist={['*']}
                    />
                )}

                {/* Overlay Controls */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.controlsOverlay}
                >
                    {amICaller ? (
                        <View style={styles.doubleActionContainer}>
                            {/* Leave Quietly */}
                            <TouchableOpacity
                                style={[styles.controlBtn, styles.leaveBtn]}
                                onPress={() => endCall(false)} // Don't emit 'end for everyone', just leave
                            >
                                <Ionicons name="log-out-outline" size={24} color="#FFF" />
                                <Text style={styles.controlText}>Leave</Text>
                            </TouchableOpacity>

                            {/* End For Everyone */}
                            <TouchableOpacity
                                style={[styles.controlBtn, styles.endCallBtn, { width: 140 }]}
                                onPress={() => endCall(true)}
                            >
                                <Ionicons name="call" size={24} color="#FFF" />
                                <Text style={styles.controlText}>End for All</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.controlBtn, styles.endCallBtn]}
                            onPress={() => endCall()}
                        >
                            <Ionicons name="call" size={32} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </LinearGradient>
            </View>
        </Modal>
    );
};

const CallManager = () => {
    return (
        <>
            <IncomingCallModal />
            <ActiveCallModal />
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    container: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 80,
    },
    incomingHeader: {
        alignItems: 'center',
        marginTop: 60,
    },
    callerImageContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#374151',
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: "#0A66C2",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    callerImage: {
        width: '100%',
        height: '100%',
    },
    callerName: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    callStatus: {
        fontSize: 18,
        color: '#E5E7EB',
        fontWeight: '500',
        letterSpacing: 1,
    },
    incomingActions: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        marginBottom: 60,
        width: '100%',
    },
    actionBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    acceptBtn: {
        backgroundColor: '#10B981',
    },
    declineBtn: {
        backgroundColor: '#EF4444',
    },
    btnLabel: {
        color: '#FFF',
        marginTop: 8,
        position: 'absolute',
        bottom: -25,
        fontWeight: '600',
    },

    // Active Call
    activeContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    controlsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    doubleActionContainer: {
        flexDirection: 'row',
        gap: 20,
        alignItems: 'center',
    },
    controlBtn: {
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)', // For web
        flexDirection: 'row',
        paddingHorizontal: 20,
    },
    controlText: {
        color: '#FFF',
        fontWeight: '700',
        marginLeft: 8,
        fontSize: 16,
    },
    endCallBtn: {
        backgroundColor: '#EF4444',
        width: 60,
    },
    leaveBtn: {
        backgroundColor: '#4B5563',
    }
});

export default CallManager;
