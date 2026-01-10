import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableOpacity,
    Platform,
    Dimensions
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, PanResponder } from 'react-native';

const { width } = Dimensions.get('window');

const MediaUploadModal = ({ visible, onClose, onNativePick, onWebUpload, title = "Upload Media" }) => {
    const panY = React.useRef(new Animated.Value(0)).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gs) => {
                if (gs.dy > 0) {
                    panY.setValue(gs.dy);
                }
            },
            onPanResponderRelease: (e, gs) => {
                if (gs.dy > 150 || gs.vy > 0.5) {
                    onClose();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    React.useEffect(() => {
        if (visible) {
            panY.setValue(0);
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={[
                        styles.container,
                        { transform: [{ translateY: panY }] }
                    ]}
                >
                    <LinearGradient
                        colors={['#FFFFFF', '#F8FAFC']}
                        style={styles.gradientBg}
                    >
                        <View {...panResponder.panHandlers}>
                            <View style={styles.indicator} />
                        </View>

                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>{title}</Text>
                                <Text style={styles.subtitle}>Supercharge your media sharing</Text>
                            </View>
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

                        </View>

                        <TouchableOpacity
                            style={styles.bottomCloseBtn}
                            onPress={onClose}
                        >
                            <Text style={styles.bottomCloseText}>Close</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animated.View>
            </View>
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
    },
    bottomCloseBtn: {
        marginTop: 24,
        backgroundColor: '#F1F5F9',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    bottomCloseText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748B',
    }
});

export default MediaUploadModal;

