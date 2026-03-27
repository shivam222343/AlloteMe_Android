import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Image, ActivityIndicator, Alert, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Trash2, Camera, X, User as UserIcon, MapPin, Briefcase, Phone, Mail, Award } from 'lucide-react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { counselorAPI, institutionAPI } from '../services/api';

const AdminCounselorsScreen = ({ navigation }) => {
    const [counselors, setCounselors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [field, setField] = useState('');
    const [experience, setExperience] = useState('');
    const [location, setLocation] = useState('');
    const [contact, setContact] = useState('');
    const [email, setEmail] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState(null);

    useEffect(() => {
        fetchCounselors();
    }, []);

    const fetchCounselors = async () => {
        try {
            const res = await counselorAPI.getAll();
            setCounselors(res.data);
        } catch (error) {
            Alert.alert("Error", "Failed to load counselors");
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleAdd = async () => {
        if (!name || !field || !experience || !contact) {
            Alert.alert("Error", "Please fill required fields (Name, Field, Exp, Contact)");
            return;
        }

        setSubmitting(true);
        try {
            let imageUrl = 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=200';

            if (image) {
                const formData = new FormData();
                formData.append('image', {
                    uri: image,
                    name: 'counselor_profile.jpg',
                    type: 'image/jpeg',
                });
                const uploadRes = await institutionAPI.uploadImage(formData);
                imageUrl = uploadRes.data.url;
            }

            const data = {
                name,
                field,
                experience,
                location: location || "India",
                contactNumber: contact,
                email,
                description,
                profileImage: imageUrl
            };

            await counselorAPI.add(data);
            Alert.alert("Success", "Counselor added successfully");
            setModalVisible(false);
            resetForm();
            fetchCounselors();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save counselor");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert("Delete", "Are you sure you want to remove this counselor?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: 'destructive', onPress: async () => {
                    await counselorAPI.delete(id);
                    fetchCounselors();
                }
            }
        ]);
    };

    const resetForm = () => {
        setName(''); setField(''); setExperience(''); setLocation('');
        setContact(''); setEmail(''); setDescription(''); setImage(null);
    };

    return (
        <MainLayout title="Manage Counselors">
            <View style={styles.container}>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <Plus size={20} color="white" />
                    <Text style={styles.addBtnText}>Add New Counselor</Text>
                </TouchableOpacity>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={counselors}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <Image source={{ uri: item.profileImage }} style={styles.cardImg} />
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardName}>{item.name}</Text>
                                    <View style={styles.cardRow}><Briefcase size={12} color="#64748b" /><Text style={styles.cardSub}>{item.field}</Text></View>
                                    <View style={styles.cardRow}><Award size={12} color="#64748b" /><Text style={styles.cardSub}>{item.experience}</Text></View>
                                </View>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
                                    <Trash2 size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.empty}>No counselors added yet.</Text>}
                    />
                )}
            </View>

            {/* Add Modal */}
            <Modal visible={modalVisible} animationType="slide">
                <MainLayout title="New Counselor">
                    <ScrollView style={styles.modalScroll}>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.pickedImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Camera size={28} color="#94a3b8" />
                                    <Text style={styles.imagePlaceholderText}>Upload Profile Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput style={styles.input} placeholder="e.g. Dr. Rahul Shinde" value={name} onChangeText={setName} />
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Consulting Field *</Text>
                            <TextInput style={styles.input} placeholder="e.g. JEE Admissions / Engineering" value={field} onChangeText={setField} />
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Experience *</Text>
                            <TextInput style={styles.input} placeholder="e.g. 8+ Years" value={experience} onChangeText={setExperience} />
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Contact Number *</Text>
                            <TextInput style={styles.input} placeholder="e.g. 9876543210" value={contact} onChangeText={setContact} keyboardType="numeric" />
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput style={styles.input} placeholder="e.g. rahul@alloteme.in" value={email} onChangeText={setEmail} />
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Location</Text>
                            <TextInput style={styles.input} placeholder="e.g. Pune, Maharashtra" value={location} onChangeText={setLocation} />
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Bio / Description</Text>
                            <TextInput style={[styles.input, { height: 100 }]} placeholder="Summary of expertise..." value={description} onChangeText={setDescription} multiline />
                        </View>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={submitting}>
                                {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Counselor</Text>}
                            </TouchableOpacity>
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </MainLayout>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    addBtn: { backgroundColor: Colors.primary, flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, ...Shadows.md },
    addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    card: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', ...Shadows.sm },
    cardImg: { width: 50, height: 50, borderRadius: 25 },
    cardInfo: { flex: 1, marginLeft: 15 },
    cardName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    cardSub: { fontSize: 12, color: '#64748b' },
    deleteBtn: { padding: 10 },
    empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },
    modalScroll: { flex: 1, padding: 20 },
    imagePicker: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f8fafc', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    pickedImage: { width: '100%', height: '100%' },
    imagePlaceholder: { alignItems: 'center' },
    imagePlaceholderText: { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },
    inputBox: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 15 },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 10 },
    cancelBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: '#f1f5f9' },
    cancelBtnText: { fontWeight: 'bold', color: '#64748b' },
    saveBtn: { flex: 2, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.primary },
    saveBtnText: { fontWeight: 'bold', color: 'white' }
});

export default AdminCounselorsScreen;
