import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, Image, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { institutionAPI, uploadAPI } from '../services/api';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, Plus, Image as ImageIcon, Globe, MapPin, Hash, ShieldCheck, Award, Bot } from 'lucide-react-native';

const CreateInstitutionScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [rawText, setRawText] = useState('');
    const [showAiModal, setShowAiModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        university: '',
        dteCode: '',
        type: 'Autonomous',
        feesPerYear: '',
        website: '',
        mapUrl: '',
        description: '',
        location: { region: '', city: '', address: '', coordinates: { lat: '', lng: '' } },
        rating: { value: '', platform: 'NIRF' },
        galleryImages: [],
        established: '',
        totalStudents: '',
        campusArea: '',
        accreditation: '',
        facilities: [],
        hostel: { available: false, boys: { available: false, fees: '', capacity: '' }, girls: { available: false, fees: '', capacity: '' }, notes: '' },
        branches: []
    });

    const addBranch = () => setFormData(prev => ({ ...prev, branches: [...prev.branches, { name: '', code: '' }] }));
    const removeBranch = (idx) => setFormData(prev => ({ ...prev, branches: prev.branches.filter((_, i) => i !== idx) }));
    const updateBranch = (idx, field, val) => setFormData(prev => ({
        ...prev,
        branches: prev.branches.map((b, i) => i === idx ? { ...b, [field]: val } : b)
    }));


    const FACILITY_OPTIONS = ['WiFi', 'Canteen', 'Library', 'Labs', 'Sports', 'Hostel', 'Parking', 'Garden', 'Medical', 'ATM', 'Gym', 'Auditorium'];

    const toggleFacility = (fac) => {
        const current = formData.facilities;
        const updated = current.includes(fac) ? current.filter(f => f !== fac) : [...current, fac];
        setFormData({ ...formData, facilities: updated });
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.7,
        });

        if (!result.canceled) {
            handleUploadMultiple(result.assets.map(a => a.uri));
        }
    };

    const handleUploadMultiple = async (uris) => {
        setLoading(true);
        try {
            const uploadedUrls = [];
            for (const uri of uris) {
                const formDataFile = new FormData();
                const fileName = uri.split('/').pop();

                if (Platform.OS === 'web') {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    formDataFile.append('image', blob, fileName);
                } else {
                    const fileExt = fileName.split('.').pop();
                    formDataFile.append('image', {
                        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                        name: fileName,
                        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                    });
                }

                const res = await uploadAPI.upload(formDataFile);
                uploadedUrls.push(res.data.url);
            }
            setFormData({
                ...formData,
                galleryImages: [...formData.galleryImages, ...uploadedUrls]
            });
        } catch (error) {
            console.error('Upload failed', error);
            Alert.alert('Error', 'Failed to upload images');
        } finally {
            setLoading(false);
        }
    };

    const removeImage = (index) => {
        const updated = [...formData.galleryImages];
        updated.splice(index, 1);
        setFormData({ ...formData, galleryImages: updated });
    };

    const handleAiParse = async () => {
        if (!rawText.trim()) return Alert.alert('Empty', 'Please paste some text first.');
        setAiLoading(true);
        try {
            const response = await institutionAPI.parse(rawText);
            const p = response.data;
            setFormData(prev => ({
                ...prev,
                name: p.name || prev.name,
                university: p.university || prev.university,
                dteCode: p.dteCode || prev.dteCode,
                type: p.type || prev.type,
                feesPerYear: p.feesPerYear != null ? p.feesPerYear.toString() : prev.feesPerYear,
                website: p.website || prev.website,
                mapUrl: p.mapUrl || prev.mapUrl,
                description: p.description || prev.description,
                established: p.established != null ? p.established.toString() : prev.established,
                totalStudents: p.totalStudents != null ? p.totalStudents.toString() : prev.totalStudents,
                campusArea: p.campusArea || prev.campusArea,
                accreditation: p.accreditation || prev.accreditation,
                location: {
                    ...prev.location,
                    ...(p.location ? {
                        region: p.location.region || prev.location.region,
                        city: p.location.city || prev.location.city,
                        address: p.location.address || prev.location.address,
                    } : {}),
                },
                rating: {
                    value: p.rating?.value != null ? p.rating.value.toString() : prev.rating.value,
                    platform: p.rating?.platform || prev.rating.platform,
                },
                facilities: (Array.isArray(p.facilities) && p.facilities.length > 0) ? p.facilities : prev.facilities,
                hostel: p.hostel ? {
                    available: p.hostel.available ?? prev.hostel.available,
                    notes: p.hostel.notes || prev.hostel.notes,
                    boys: {
                        available: p.hostel.boys?.available ?? prev.hostel.boys?.available,
                        fees: p.hostel.boys?.fees != null ? p.hostel.boys.fees.toString() : prev.hostel.boys?.fees,
                        capacity: p.hostel.boys?.capacity != null ? p.hostel.boys.capacity.toString() : prev.hostel.boys?.capacity,
                    },
                    girls: {
                        available: p.hostel.girls?.available ?? prev.hostel.girls?.available,
                        fees: p.hostel.girls?.fees != null ? p.hostel.girls.fees.toString() : prev.hostel.girls?.fees,
                        capacity: p.hostel.girls?.capacity != null ? p.hostel.girls.capacity.toString() : prev.hostel.girls?.capacity,
                    },
                } : prev.hostel,
                galleryImages: prev.galleryImages,
            }));
            setShowAiModal(false);
            setRawText('');
            Alert.alert('✨ Done!', 'Form auto-filled from AI. Review and save.');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to parse text. Try again.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.type) {
            Alert.alert('Error', 'Please fill name and type');
            return;
        }
        setLoading(true);
        try {
            const n = (v) => (v !== '' && v != null && !isNaN(parseFloat(v))) ? parseFloat(v) : undefined;
            const i = (v) => (v !== '' && v != null && !isNaN(parseInt(v))) ? parseInt(v) : undefined;

            const payload = {
                name: formData.name,
                university: formData.university || undefined,
                dteCode: formData.dteCode || undefined,
                type: formData.type,
                feesPerYear: n(formData.feesPerYear),
                website: formData.website || undefined,
                mapUrl: formData.mapUrl || undefined,
                description: formData.description || undefined,
                established: i(formData.established),
                totalStudents: i(formData.totalStudents),
                campusArea: formData.campusArea || undefined,
                accreditation: formData.accreditation || undefined,
                galleryImages: formData.galleryImages,
                facilities: formData.facilities.length > 0 ? formData.facilities : undefined,
                location: {
                    region: formData.location.region || undefined,
                    city: formData.location.city || undefined,
                    address: formData.location.address || undefined,
                    coordinates: {
                        lat: n(formData.location.coordinates?.lat),
                        lng: n(formData.location.coordinates?.lng),
                    }
                },
                rating: {
                    value: n(formData.rating.value),
                    platform: formData.rating.platform || undefined,
                },
                hostel: {
                    available: !!(formData.hostel.boys?.fees || formData.hostel.girls?.fees),
                    notes: formData.hostel.notes || undefined,
                    boys: {
                        available: !!formData.hostel.boys?.fees,
                        fees: n(formData.hostel.boys?.fees),
                        capacity: i(formData.hostel.boys?.capacity),
                    },
                    girls: {
                        available: !!formData.hostel.girls?.fees,
                        fees: n(formData.hostel.girls?.fees),
                        capacity: i(formData.hostel.girls?.capacity),
                    },
                },
            };

            await institutionAPI.create(payload);
            Alert.alert('Success', 'Institution created!');
            navigation.goBack();
        } catch (error) {
            console.error('Save error:', error?.response?.data || error.message);
            Alert.alert('Error', 'Failed to save institution');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>New Institution</Text>
                <Button
                    title="Magic AI"
                    variant="outline"
                    onPress={() => setShowAiModal(true)}
                    style={styles.aiBtn}
                    icon={Bot}
                />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <Card style={styles.card}>
                    <Input
                        label="Institution Name"
                        value={formData.name}
                        onChangeText={(val) => setFormData({ ...formData, name: val })}
                        placeholder="e.g. COEP Technological University"
                        leftIcon={ImageIcon}
                    />
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="University"
                                value={formData.university}
                                onChangeText={(val) => setFormData({ ...formData, university: val })}
                                placeholder="e.g. SPPU"
                                leftIcon={Globe}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="DTE Code"
                                value={formData.dteCode}
                                onChangeText={(val) => setFormData({ ...formData, dteCode: val })}
                                placeholder="e.g. 6006"
                                leftIcon={Hash}
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Fees per Year"
                                value={formData.feesPerYear}
                                onChangeText={(val) => setFormData({ ...formData, feesPerYear: val })}
                                placeholder="e.g. 85000"
                                keyboardType="numeric"
                                leftIcon={Hash}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Inst. Type"
                                value={formData.type}
                                onChangeText={(val) => setFormData({ ...formData, type: val })}
                                placeholder="Autonomous"
                                leftIcon={ShieldCheck}
                            />
                        </View>
                    </View>
                </Card>

                <Text style={styles.sectionTitle}>Ratings & Media</Text>
                <Card style={styles.card}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Rating Score"
                                value={formData.rating.value?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, rating: { ...formData.rating, value: val } })}
                                placeholder="e.g. 85"
                                keyboardType="numeric"
                                leftIcon={Award}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Platform"
                                value={formData.rating.platform}
                                onChangeText={(val) => setFormData({ ...formData, rating: { ...formData.rating, platform: val } })}
                                placeholder="NIRF"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Gallery Images (Max 5)</Text>
                    <View style={styles.imageGallery}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {formData.galleryImages.map((img, index) => (
                                <View key={index} style={styles.imageWrapper}>
                                    <Image source={{ uri: img }} style={styles.previewImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                                        <X size={12} color={Colors.white} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {formData.galleryImages.length < 5 && (
                                <TouchableOpacity style={styles.addImgBtn} onPress={pickImages} disabled={loading}>
                                    {loading ? <ActivityIndicator color={Colors.primary} /> : <Plus size={24} color={Colors.primary} />}
                                    <Text style={styles.addImgText}>Add</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </Card>

                <Text style={styles.sectionTitle}>Digital Presence</Text>
                <Card style={styles.card}>
                    <Input
                        label="Official Website"
                        value={formData.website}
                        onChangeText={(val) => setFormData({ ...formData, website: val })}
                        placeholder="e.g. www.coep.org.in"
                        keyboardType="url"
                        leftIcon={Globe}
                    />
                    <Input
                        label="Google Maps URL"
                        value={formData.mapUrl}
                        onChangeText={(val) => setFormData({ ...formData, mapUrl: val })}
                        placeholder="Paste Google Maps link"
                        leftIcon={MapPin}
                    />
                    <Input
                        label="Description"
                        value={formData.description}
                        onChangeText={(val) => setFormData({ ...formData, description: val })}
                        placeholder="Brief about the institute"
                        multiline
                    />
                </Card>

                <Text style={styles.sectionTitle}>Location Details</Text>
                <Card style={styles.card}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="City"
                                value={formData.location.city}
                                onChangeText={(val) => setFormData({ ...formData, location: { ...formData.location, city: val } })}
                                placeholder="e.g. Pune"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Region"
                                value={formData.location.region}
                                onChangeText={(val) => setFormData({ ...formData, location: { ...formData.location, region: val } })}
                                placeholder="e.g. West"
                            />
                        </View>
                    </View>
                    <Input
                        label="Address"
                        value={formData.location.address}
                        onChangeText={(val) => setFormData({ ...formData, location: { ...formData.location, address: val } })}
                        placeholder="Full address"
                        multiline
                    />
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Latitude (optional)"
                                value={formData.location.coordinates?.lat?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, location: { ...formData.location, coordinates: { ...formData.location.coordinates, lat: val } } })}
                                placeholder="e.g. 18.5196"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Longitude (optional)"
                                value={formData.location.coordinates?.lng?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, location: { ...formData.location, coordinates: { ...formData.location.coordinates, lng: val } } })}
                                placeholder="e.g. 73.8554"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.coordHelper}
                        onPress={() => Linking.openURL('https://www.latlong.net/')}
                    >
                        <MapPin size={14} color={Colors.primary} />
                        <Text style={styles.coordHelperText}>Get Coordinates from Map</Text>
                    </TouchableOpacity>
                </Card>

                {/* General Stats */}
                <Text style={styles.sectionTitle}>General Info (Optional)</Text>
                <Card style={styles.card}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Established Year"
                                value={formData.established?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, established: val })}
                                placeholder="e.g. 1854"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Total Students"
                                value={formData.totalStudents?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, totalStudents: val })}
                                placeholder="e.g. 5000"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Campus Area"
                                value={formData.campusArea}
                                onChangeText={(val) => setFormData({ ...formData, campusArea: val })}
                                placeholder="e.g. 45 Acres"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Accreditation"
                                value={formData.accreditation}
                                onChangeText={(val) => setFormData({ ...formData, accreditation: val })}
                                placeholder="e.g. NAAC A+"
                            />
                        </View>
                    </View>
                </Card>

                {/* Facilities */}
                <Text style={styles.sectionTitle}>Facilities (Optional)</Text>
                <Card style={styles.card}>
                    <View style={styles.facilityGrid}>
                        {FACILITY_OPTIONS.map((fac) => {
                            const isSelected = formData.facilities.includes(fac);
                            return (
                                <TouchableOpacity
                                    key={fac}
                                    style={[styles.facChip, isSelected && styles.facChipActive]}
                                    onPress={() => toggleFacility(fac)}
                                >
                                    <Text style={[styles.facChipText, isSelected && styles.facChipTextActive]}>{fac}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Card>

                {/* Hostel Info */}
                <Text style={styles.sectionTitle}>Hostel Info (Optional)</Text>
                <Card style={styles.card}>
                    <Text style={styles.label}>Boys Hostel</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Fees / Year"
                                value={formData.hostel.boys.fees?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, hostel: { ...formData.hostel, boys: { ...formData.hostel.boys, fees: val, available: true } } })}
                                placeholder="₹ Amount"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Capacity"
                                value={formData.hostel.boys.capacity?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, hostel: { ...formData.hostel, boys: { ...formData.hostel.boys, capacity: val, available: true } } })}
                                placeholder="No. of Seats"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Girls Hostel</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Fees / Year"
                                value={formData.hostel.girls.fees?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, hostel: { ...formData.hostel, girls: { ...formData.hostel.girls, fees: val, available: true } } })}
                                placeholder="₹ Amount"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Capacity"
                                value={formData.hostel.girls.capacity?.toString()}
                                onChangeText={(val) => setFormData({ ...formData, hostel: { ...formData.hostel, girls: { ...formData.hostel.girls, capacity: val, available: true } } })}
                                placeholder="No. of Seats"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <Input
                        label="Hostel Notes"
                        value={formData.hostel.notes}
                        onChangeText={(val) => setFormData({ ...formData, hostel: { ...formData.hostel, notes: val, available: true } })}
                        placeholder="Any additional hostel information"
                        multiline
                    />
                </Card>

                {/* Branches Section */}
                <View style={styles.header}>
                    <Text style={styles.sectionTitle}>Branches (Mandatory for Cutoffs)</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={addBranch}>
                        <Plus size={18} color={Colors.primary} />
                        <Text style={styles.addBtnText}>Add Branch</Text>
                    </TouchableOpacity>
                </View>
                <Card style={styles.card}>
                    {formData.branches.length === 0 ? (
                        <Text style={styles.emptyText}>No branches added. Add branches to enable cutoff management for those fields.</Text>
                    ) : (
                        formData.branches.map((branch, idx) => (
                            <View key={idx} style={styles.branchItem}>
                                <View style={styles.branchInputs}>
                                    <View style={{ flex: 2 }}>
                                        <Input
                                            label="Branch Name"
                                            value={branch.name}
                                            onChangeText={(val) => updateBranch(idx, 'name', val)}
                                            placeholder="e.g. Computer Engineering"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Input
                                            label="Code"
                                            value={branch.code}
                                            onChangeText={(val) => updateBranch(idx, 'code', val)}
                                            placeholder="e.g. CE"
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.removeBranchBtn} onPress={() => removeBranch(idx)}>
                                    <X size={16} color={Colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </Card>

                <Button
                    title="Create Institution"
                    onPress={handleSave}
                    loading={loading}
                    style={styles.saveBtn}
                />
            </ScrollView>

            {/* AI Modal */}
            <Modal visible={showAiModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>✨ Magic AI Extraction</Text>
                        <Text style={styles.modalSub}>Paste raw text from a website or brochure to auto-fill the form.</Text>

                        <View style={styles.templateNote}>
                            <Text style={styles.templateNoteTitle}>💡 Recommended Format:</Text>
                            <Text style={styles.templateNoteText}>
                                Name: COEP Pune\n
                                Established: 1854\n
                                Hostel Boys: Fees 55k, Cap 600\n
                                Facilities: WiFi, Canteen, Library\n
                                Branches: Comp Sci (CS), IT (IT)
                            </Text>
                        </View>

                        <Input
                            placeholder="Paste text here..."
                            value={rawText}
                            onChangeText={setRawText}
                            multiline
                            containerStyle={{ height: 400 }}
                            inputStyle={{ height: 380, textAlignVertical: 'top' }}
                        />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" variant="ghost" onPress={() => setShowAiModal(false)} style={{ flex: 1 }} />
                            <Button title="Parse Text" onPress={handleAiParse} loading={aiLoading} style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary, marginTop: 20 },
    aiBtn: { paddingVertical: 4, paddingHorizontal: 12, marginTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 12, color: Colors.primary, paddingHorizontal: 16 },
    card: { marginBottom: 16, marginHorizontal: 16, padding: 16 },
    row: { flexDirection: 'row', gap: 12 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary, marginBottom: 8, marginTop: 12 },
    imageGallery: { flexDirection: 'row', gap: 12, marginTop: 8 },
    imageWrapper: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', marginRight: 12, position: 'relative', ...Shadows.sm },
    previewImage: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.error, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    addImgBtn: { width: 80, height: 80, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary + '05' },
    addImgText: { fontSize: 10, color: Colors.primary, fontWeight: 'bold', marginTop: 4 },
    saveBtn: { marginTop: 24, marginBottom: 40, marginHorizontal: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, ...Shadows.lg },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: Colors.text.primary },
    modalSub: { fontSize: 14, color: Colors.text.secondary, marginBottom: 20 },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
    facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    facChip: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, backgroundColor: '#F1F5F9',
        borderWidth: 1, borderColor: '#E2E8F0'
    },
    facChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
    facChipText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
    facChipTextActive: { color: Colors.primary },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16, marginTop: 24 },
    addBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
    branchItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    branchInputs: { flex: 1, flexDirection: 'row', gap: 10 },
    removeBranchBtn: { padding: 8, marginTop: 15 },
    emptyText: { textAlign: 'center', color: Colors.text.tertiary, marginVertical: 10, fontSize: 14 },
    templateNote: { backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BAE6FD' },
    templateNoteTitle: { fontSize: 13, fontWeight: 'bold', color: '#0369A1', marginBottom: 4 },
    templateNoteText: { fontSize: 11, color: '#0EA5E9', lineHeight: 16 },
    coordHelper: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 15, padding: 10, borderRadius: 10, backgroundColor: Colors.primary + '08', borderColor: Colors.primary + '20', borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center' },
    coordHelperText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
});

export default CreateInstitutionScreen;
