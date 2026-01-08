import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';

const EditProfileModal = ({ visible, onClose }) => {
    const { user, updateProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        phoneNumber: '',
        branch: '',
        passoutYear: '',
        birthDate: new Date(),
    });

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                phoneNumber: user.phoneNumber || '',
                branch: user.branch || '',
                passoutYear: user.passoutYear || '',
                birthDate: user.birthDate ? new Date(user.birthDate) : new Date(),
            });
        }
    }, [user, visible]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setFormData(prev => ({ ...prev, birthDate: selectedDate }));
        }
    };

    const handleSave = async () => {
        if (!formData.displayName.trim()) {
            alert('Name is required');
            return;
        }

        setLoading(true);
        try {
            const result = await updateProfile({
                displayName: formData.displayName,
                phoneNumber: formData.phoneNumber,
                branch: formData.branch,
                passoutYear: formData.passoutYear,
                birthDate: formData.birthDate.toISOString(),
            });
            if (result.success) {
                onClose();
            } else {
                alert(result.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Update profile error:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalOverlay}
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.input}
                                    value={formData.displayName}
                                    onChangeText={(text) => handleChange('displayName', text)}
                                    placeholder="Enter your name"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        {/* Phone Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.input}
                                    value={formData.phoneNumber}
                                    onChangeText={(text) => handleChange('phoneNumber', text)}
                                    placeholder="Enter your phone number"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        {/* Branch Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Branch</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="school-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.input}
                                    value={formData.branch}
                                    onChangeText={(text) => handleChange('branch', text)}
                                    placeholder="e.g., Computer Science"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        {/* Passout Year Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Passout Year</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.input}
                                    value={formData.passoutYear}
                                    onChangeText={(text) => handleChange('passoutYear', text)}
                                    placeholder="e.g., 2025"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </View>
                        </View>

                        {/* Birth Date Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Birth Date</Text>
                            <TouchableOpacity
                                style={styles.inputContainer}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="gift-outline" size={20} color="#6B7280" />
                                <Text style={styles.dateText}>
                                    {formData.birthDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </Text>
                                <Ionicons name="chevron-down-outline" size={20} color="#6B7280" style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={formData.birthDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                            />
                        )}

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        minHeight: '50%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeButton: {
        padding: 4,
    },
    form: {
        paddingTop: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#1F2937',
        height: '100%',
        ...Platform.select({
            web: { outlineStyle: 'none' }
        }),
    },
    dateText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#1F2937',
    },
    saveButton: {
        backgroundColor: '#0A66C2',
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default EditProfileModal;
