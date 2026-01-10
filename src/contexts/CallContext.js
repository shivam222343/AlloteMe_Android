import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
    const { user, socket } = useAuth();
    const [callState, setCallState] = useState('idle'); // idle, incoming, outgoing, active
    const [callData, setCallData] = useState(null); // { caller, type: 'audio'|'video', roomId, isGroup }
    const [soundObject, setSoundObject] = useState(null);
    const [participants, setParticipants] = useState([]);

    // Call settings
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [cameraType, setCameraType] = useState('front');

    const ringtoneRef = useRef(null);

    // Play ringtone for incoming call
    const playRingtone = async () => {
        try {
            // Stop any existing sound
            if (ringtoneRef.current) {
                await ringtoneRef.current.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/ringtone.mp3'), // We'll need to ensure this exists or use a default
                { shouldPlay: true, isLooping: true }
            );
            ringtoneRef.current = sound;

            // Vibration pattern
            Vibration.vibrate([1000, 2000, 1000, 2000], true);
        } catch (error) {
            console.log('Error playing ringtone:', error);
            // Fallback vibration
            Vibration.vibrate([500, 500, 500], true);
        }
    };

    const stopRingtone = async () => {
        try {
            if (ringtoneRef.current) {
                await ringtoneRef.current.stopAsync();
                await ringtoneRef.current.unloadAsync();
                ringtoneRef.current = null;
            }
            Vibration.cancel();
        } catch (error) {
            console.log('Error stopping ringtone:', error);
        }
    };

    // Socket Listeners for Signaling
    useEffect(() => {
        if (!socket) return;

        socket.on('call:incoming', (data) => {
            // data: { caller: userObject, type: 'audio'|'video', roomId, isGroup, chatName }
            if (callState !== 'idle') {
                // Already in a call, busy
                socket.emit('call:busy', { callerId: data.caller._id });
                return;
            }

            setCallData(data);
            setCallState('incoming');
            playRingtone();

            // Auto decline after 60 seconds
            const timeout = setTimeout(() => {
                if (callState === 'incoming') {
                    endCall();
                }
            }, 60000);
            return () => clearTimeout(timeout);
        });

        socket.on('call:ended', () => {
            endCall(false); // Remote ended
        });

        socket.on('call:accepted', (data) => {
            if (callState === 'outgoing') {
                setCallState('active');
                stopRingtone(); // Stop outgoing ring
            }
        });

        socket.on('call:participant-joined', (user) => {
            setParticipants(prev => [...prev, user]);
        });

        socket.on('call:participant-left', (userId) => {
            setParticipants(prev => prev.filter(p => p._id !== userId));
        });

        return () => {
            socket.off('call:incoming');
            socket.off('call:ended');
            socket.off('call:accepted');
            socket.off('call:participant-joined');
            socket.off('call:participant-left');
        };
    }, [socket, callState]);

    const startCall = (recipients, type = 'audio', isGroup = false, groupName = '') => {
        setCallState('outgoing');
        setCallData({
            recipients, // Array of users
            type,
            isGroup,
            groupName
        });

        // Emit init event
        socket.emit('call:start', {
            recipientIds: recipients.map(r => r._id),
            type,
            isGroup
        });
    };

    const acceptCall = () => {
        stopRingtone();
        setCallState('active');
        socket.emit('call:accept', { callerId: callData.caller._id });
    };

    const endCall = (emit = true) => {
        stopRingtone();

        if (emit && socket) {
            const to = [];
            // If I am the recipient (I have a caller in data), notify the caller
            if (callData?.caller) {
                to.push(callData.caller._id);
            }
            // If I am the caller (I have recipients), notify them
            if (callData?.recipients) {
                callData.recipients.forEach(r => to.push(r._id || r));
            }
            // Also pass the roomId for group cleanup
            socket.emit('call:end', { to, roomId: callData?.roomId });
        }

        setCallState('idle');
        setCallData(null);
        setParticipants([]);
    };

    const value = {
        callState,
        callData,
        participants,
        startCall,
        acceptCall,
        endCall,
        isMuted, setIsMuted,
        isSpeakerOn, setIsSpeakerOn,
        isVideoOff, setIsVideoOff,
        cameraType, setCameraType
    };

    return (
        <CallContext.Provider value={value}>
            {children}
        </CallContext.Provider>
    );
};
