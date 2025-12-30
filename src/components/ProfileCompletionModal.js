import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const ProfileCompletionModal = ({ visible, onComplete, onClose, initialData = {} }) => {
    const [fullName, setFullName] = useState(initialData.fullName || '');
    const [birthDate, setBirthDate] = useState(initialData.birthDate ? new Date(initialData.birthDate) : new Date());
    const [branch, setBranch] = useState(initialData.branch || '');
    const [passoutYear, setPassoutYear] = useState(initialData.passoutYear || '');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const branches = [
        'Computer Science',
        'Information Technology',
        'Electronics',
        'Mechanical',
        'Civil',
        'Electrical',
        'Chemical',
        'Biotechnology',
        'Other'
    ];

    const currentYear = new Date().getFullYear();
    const passoutYears = Array.from({ length: 10 }, (_, i) => (currentYear + i).toString());

    const handleSubmit = () => {
        if (!fullName.trim() || !branch || !passoutYear) {
            alert('Please fill all required fields');
            return;
        }

        onComplete({
            fullName: fullName.trim(),
            birthDate: birthDate.toISOString(),
            branch,
            passoutYear
        });
    };

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setBirthDate(selectedDate);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleClose}
                    >
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>

                    <Text style={styles.formTitle}>Complete Your Profile</Text>

                    <ScrollView
                        style={styles.form}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.formContent}
                    >
                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Enter your full name"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        {/* Birth Date */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Birth Date</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.dateText}>
                                    {birthDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={birthDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                maximumDate={new Date()}
                                minimumDate={new Date(1950, 0, 1)}
                            />
                        )}

                        {/* Branch */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Branch</Text>
                            <View style={styles.chipsContainer}>
                                {branches.map((b) => (
                                    <TouchableOpacity
                                        key={b}
                                        style={[
                                            styles.chip,
                                            branch === b && styles.chipActive
                                        ]}
                                        onPress={() => setBranch(b)}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            branch === b && styles.chipTextActive
                                        ]}>
                                            {b}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Show input field when "Other" is selected */}
                            {branch === 'Other' && (
                                <TextInput
                                    style={[styles.input, { marginTop: 12 }]}
                                    value={branch === 'Other' ? '' : branch}
                                    onChangeText={(text) => setBranch(text || 'Other')}
                                    placeholder="Enter your branch name"
                                    placeholderTextColor="#9CA3AF"
                                />
                            )}
                        </View>

                        {/* Passout Year */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Passout Year</Text>
                            <View style={styles.chipsContainer}>
                                {passoutYears.map((year) => (
                                    <TouchableOpacity
                                        key={year}
                                        style={[
                                            styles.chip,
                                            passoutYear === year && styles.chipActive
                                        ]}
                                        onPress={() => setPassoutYear(year)}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            passoutYear === year && styles.chipTextActive
                                        ]}>
                                            {year}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitButtonText}>Save Profile</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: '85%',
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 8,
    },
    formTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 20,
        marginTop: 8,
    },
    form: {
        flex: 1,
    },
    formContent: {
        paddingBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 6,
        padding: 14,
        fontSize: 15,
        color: '#111827',
    },
    dateText: {
        fontSize: 15,
        color: '#111827',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
        marginBottom: 8,
    },
    chipActive: {
        backgroundColor: '#0A66C2',
        borderColor: '#0A66C2',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4B5563',
    },
    chipTextActive: {
        color: '#FFFFFF',
    },
    submitButton: {
        backgroundColor: '#0A66C2',
        borderRadius: 6,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ProfileCompletionModal;
