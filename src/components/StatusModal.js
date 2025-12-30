import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StatusModal = ({
    visible,
    onClose,
    title,
    message,
    type = 'success' // 'success', 'error'
}) => {
    const isSuccess = type === 'success';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Icon */}
                    <View style={[
                        styles.iconContainer,
                        { backgroundColor: isSuccess ? '#DCFCE7' : '#FEE2E2' }
                    ]}>
                        <Ionicons
                            name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
                            size={48}
                            color={isSuccess ? '#10B981' : '#EF4444'}
                        />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Message */}
                    <Text style={styles.message}>{message}</Text>

                    {/* Button */}
                    <TouchableOpacity
                        onPress={onClose}
                        style={[
                            styles.button,
                            { backgroundColor: isSuccess ? '#10B981' : '#EF4444' }
                        ]}
                    >
                        <Text style={styles.buttonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.2)'
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
                elevation: 10,
            }
        })
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default StatusModal;
