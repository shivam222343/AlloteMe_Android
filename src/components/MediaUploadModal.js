import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableWithoutFeedback,
    Platform,
    Dimensions
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MediaUploadModal = ({ visible, onClose, onNativePick, onWebUpload, title = "Upload Media" }) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animatable.View
                            animation="slideInUp"
                            duration={400}
                            style={styles.container}
                        >
                            <LinearGradient
                                colors={['#FFFFFF', '#F8FAFC']}
                                style={styles.gradientBg}
                            >
                                <View style={styles.indicator} />

                                <View style={styles.header}>
                                    <View>
                                        <Text style={styles.title}>{title}</Text>
                                        <Text style={styles.subtitle}>Supercharge your media sharing</Text>
                                    </View>
                                    <Pressable
                                        onPress={onClose}
                                        style={({ pressed }) => [
                                            styles.closeButton,
                                            { backgroundColor: pressed ? '#F1F5F9' : '#F8FAFC' }
                                        ]}
                                    >
                                        <Ionicons name="close" size={20} color="#64748B" />
                                    </Pressable>
                                </View>

                                <View style={styles.options}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.optionCard,
                                            pressed && styles.optionPressed
                                        ]}
                                        onPress={() => {
                                            onClose();
                                            onNativePick();
                                        }}
                                    >
                                        <LinearGradient
                                            colors={['#3B82F6', '#2563EB']}
                                            style={styles.iconWrapper}
                                        >
                                            <Ionicons name="phone-portrait" size={24} color="#FFF" />
                                        </LinearGradient>
                                        <View style={styles.optionContent}>
                                            <Text style={styles.optionTitle}>App Gallery</Text>
                                            <Text style={styles.optionDesc}>Swift & Native experience</Text>
                                        </View>
                                        <View style={styles.arrowBg}>
                                            <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                                        </View>
                                    </Pressable>

                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.optionCard,
                                            { borderColor: '#10B98133' },
                                            pressed && styles.optionPressed
                                        ]}
                                        onPress={() => {
                                            onClose();
                                            onWebUpload();
                                        }}
                                    >
                                        <LinearGradient
                                            colors={['#10B981', '#059669']}
                                            style={styles.iconWrapper}
                                        >
                                            <Ionicons name="globe" size={24} color="#FFF" />
                                        </LinearGradient>
                                        <View style={styles.optionContent}>
                                            <Text style={styles.optionTitle}>Web Browser</Text>
                                            <Text style={styles.optionDesc}>Reliable fallback solution</Text>
                                        </View>
                                        <View style={[styles.arrowBg, { backgroundColor: '#F0FDF4' }]}>
                                            <Ionicons name="chevron-forward" size={16} color="#10B981" />
                                        </View>
                                    </Pressable>
                                </View>

                                {Platform.OS === 'android' && (
                                    <Animatable.View
                                        animation="fadeIn"
                                        delay={500}
                                        style={styles.tipContainer}
                                    >
                                        <Ionicons name="sparkles" size={16} color="#F59E0B" />
                                        <Text style={styles.tipText}>
                                            Pro tip: Browser upload solves network issues instantly.
                                        </Text>
                                    </Animatable.View>
                                )}
                            </LinearGradient>
                        </Animatable.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    gradientBg: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    },
    indicator: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '500',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    options: {
        gap: 16,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Shadows.sm,
    },
    optionPressed: {
        backgroundColor: '#F8FAFC',
        transform: [{ scale: 0.98 }],
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.md,
    },
    optionContent: {
        flex: 1,
        marginLeft: 16,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    optionDesc: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    arrowBg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12,
        marginTop: 24,
        gap: 10,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    tipText: {
        flex: 1,
        fontSize: 12,
        color: '#92400E',
        fontWeight: '600',
        lineHeight: 18,
    }
});

export default MediaUploadModal;

