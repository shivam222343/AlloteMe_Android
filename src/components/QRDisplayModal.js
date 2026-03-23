import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const QRDisplayModal = ({ visible, onClose, meetingName, meetingId, code }) => {
    // Format: MAVERICKS_ATTENDANCE:meetingId:code
    const qrValue = `AURA_ATTENDANCE:${meetingId}:${code}`;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title} numberOfLines={1}>{meetingName}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Scan this code to mark attendance</Text>

                    <View style={styles.qrContainer}>
                        <QRCode
                            value={qrValue}
                            size={width * 0.6}
                            color="#1E293B"
                            backgroundColor="#FFFFFF"
                        />
                    </View>

                    <View style={styles.codeBox}>
                        <Text style={styles.codeLabel}>Manual Code</Text>
                        <Text style={styles.codeText}>{code}</Text>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
    },
    closeBtn: {
        padding: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 24,
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    codeBox: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginBottom: 24,
    },
    codeLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    codeText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0A66C2',
        letterSpacing: 4,
    },
    button: {
        backgroundColor: '#0A66C2',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    }
});

export default QRDisplayModal;
