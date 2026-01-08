import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { meetingsAPI } from '../services/api';
import StatusModal from './StatusModal';

const { width, height } = Dimensions.get('window');

const QRScannerModal = ({ visible, onClose }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'success' });

    useEffect(() => {
        if (visible) {
            setScanned(false);
            if (!permission?.granted) {
                requestPermission();
            }
        }
    }, [visible]);

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned || loading) return;
        setScanned(true);

        try {
            // Check if it's a Mavericks attendance QR
            if (data.startsWith('MAVERICKS_ATTENDANCE:')) {
                const parts = data.split(':');
                if (parts.length === 3) {
                    const meetingId = parts[1];
                    const code = parts[2];

                    setLoading(true);
                    const res = await meetingsAPI.markAttendance(meetingId, code);
                    setLoading(false);

                    if (res.success) {
                        setStatusModal({
                            visible: true,
                            title: 'Success',
                            message: 'Attendance marked successfully!',
                            type: 'success'
                        });
                    } else {
                        setStatusModal({
                            visible: true,
                            title: 'Error',
                            message: res.message || 'Failed to mark attendance',
                            type: 'error'
                        });
                    }
                } else {
                    Alert.alert('Error', 'Invalid QR code format');
                }
            } else {
                Alert.alert('Error', 'Not a valid Mavericks QR code');
            }
        } catch (error) {
            setLoading(false);
            const msg = error.message || error.response?.data?.message || 'Attendance marking failed';
            setStatusModal({
                visible: true,
                title: 'Error',
                message: msg,
                type: 'error'
            });
        }
    };

    const handleStatusClose = () => {
        setStatusModal({ ...statusModal, visible: false });
        if (statusModal.type === 'success') {
            onClose();
        } else {
            setScanned(false);
        }
    };

    if (!permission) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {!permission.granted ? (
                    <View style={styles.permissionContainer}>
                        <Ionicons name="camera-outline" size={64} color="#64748B" />
                        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
                        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                            <Text style={styles.permissionBtnText}>Grant Permission</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.cameraContainer}>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ['qr'],
                            }}
                        />

                        {/* Overlay */}
                        <View style={styles.overlay}>
                            <View style={styles.topSection}>
                                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                                    <Ionicons name="close" size={30} color="#FFFFFF" />
                                </TouchableOpacity>
                                <Text style={styles.title}>Scan Attendance QR</Text>
                            </View>

                            <View style={styles.middleSection}>
                                <View style={styles.scanWindow}>
                                    <View style={[styles.corner, styles.topLeft]} />
                                    <View style={[styles.corner, styles.topRight]} />
                                    <View style={[styles.corner, styles.bottomLeft]} />
                                    <View style={[styles.corner, styles.bottomRight]} />
                                    {loading && (
                                        <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
                                    )}
                                </View>
                            </View>

                            <View style={styles.bottomSection}>
                                <Text style={styles.hint}>Align the QR code within the frame to scan</Text>
                            </View>
                        </View>
                    </View>
                )}

                <StatusModal
                    visible={statusModal.visible}
                    title={statusModal.title}
                    message={statusModal.message}
                    type={statusModal.type}
                    onClose={handleStatusClose}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#F8FAFC',
    },
    permissionText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#64748B',
        marginTop: 16,
        marginBottom: 32,
    },
    permissionBtn: {
        backgroundColor: '#0A66C2',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    permissionBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
    closeBtn: {
        padding: 12,
    },
    closeBtnText: {
        color: '#64748B',
        fontSize: 16,
    },
    cameraContainer: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    topSection: {
        paddingTop: 60,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        marginRight: 16,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    middleSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanWindow: {
        width: width * 0.7,
        height: width * 0.7,
        borderWidth: 0,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#0A66C2',
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    bottomSection: {
        paddingBottom: 60,
        alignItems: 'center',
    },
    hint: {
        color: '#FFFFFF',
        fontSize: 14,
        opacity: 0.8,
    },
    loader: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -18,
        marginLeft: -18,
    }
});

export default QRScannerModal;
