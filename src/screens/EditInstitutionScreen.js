import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Alert, Image,
    TouchableOpacity, ActivityIndicator, Platform, Modal, Linking
} from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { institutionAPI, uploadAPI } from '../services/api';
import { Colors, Shadows } from '../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { X, Plus, Globe, MapPin, Bot, ShieldCheck, Award } from 'lucide-react-native';


const FACILITY_OPTIONS = ['WiFi', 'Canteen', 'Library', 'Labs', 'Sports', 'Hostel', 'Parking', 'Garden', 'Medical', 'ATM', 'Gym', 'Auditorium'];
const INST_TYPES = ['Government', 'Government Autonomous', 'Autonomous', 'Private-Autonomous', 'Private', 'Deemed'];

const EditInstitutionScreen = ({ route, navigation }) => {
    const { id } = route.params;
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [formData, setFormData] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [rawText, setRawText] = useState('');
    const [showAiModal, setShowAiModal] = useState(false);


    useEffect(() => {
        loadInstitution();
    }, [id]);

    const loadInstitution = async () => {
        try {
            const res = await institutionAPI.getById(id);
            const d = res.data;
            setFormData({
                name: d.name || '',
                university: d.university || '',
                dteCode: d.dteCode || '',
                type: d.type || 'Autonomous',
                feesPerYear: d.feesPerYear?.toString() || '',
                website: d.website || '',
                mapUrl: d.mapUrl || '',
                description: d.description || '',
                established: d.established?.toString() || '',
                totalStudents: d.totalStudents?.toString() || '',
                campusArea: d.campusArea || '',
                accreditation: d.accreditation || '',
                location: {
                    region: d.location?.region || '',
                    city: d.location?.city || '',
                    address: d.location?.address || '',
                    coordinates: {
                        lat: d.location?.coordinates?.lat?.toString() || '',
                        lng: d.location?.coordinates?.lng?.toString() || '',
                    }
                },
                rating: { value: d.rating?.value?.toString() || '', platform: d.rating?.platform || 'NIRF' },
                galleryImages: d.galleryImages || [],
                facilities: d.facilities || [],
                hostel: d.hostel || { available: false, boys: { available: false, fees: '', capacity: '' }, girls: { available: false, fees: '', capacity: '' }, notes: '' },
                branches: d.branches || []
            });
        } catch (err) {
            Alert.alert('Error', 'Failed to load institution data');
            navigation.goBack();
        } finally {
            setFetchLoading(false);
        }
    };

    const addBranch = () => setFormData(prev => ({ ...prev, branches: [...prev.branches, { name: '', code: '' }] }));
    const removeBranch = (idx) => setFormData(prev => ({ ...prev, branches: prev.branches.filter((_, i) => i !== idx) }));
    const updateBranch = (idx, field, val) => setFormData(prev => ({
        ...prev,
        branches: prev.branches.map((b, i) => i === idx ? { ...b, [field]: val } : b)
    }));

    const handleAiParse = async () => {
        if (!rawText.trim()) return Alert.alert('Empty', 'Please paste some text first.');
        setAiLoading(true);
        try {
            const response = await institutionAPI.parse(rawText);
            const p = response.data;

            setFormData(prev => ({
                ...prev,
                // Basic
                name: p.name || prev.name,
                university: p.university || prev.university,
                dteCode: p.dteCode || prev.dteCode,
                type: p.type || prev.type,
                feesPerYear: p.feesPerYear != null ? p.feesPerYear.toString() : prev.feesPerYear,
                website: p.website || prev.website,
                mapUrl: p.mapUrl || prev.mapUrl,
                description: p.description || prev.description,
                // General Info
                established: p.established != null ? p.established.toString() : prev.established,
                totalStudents: p.totalStudents != null ? p.totalStudents.toString() : prev.totalStudents,
                campusArea: p.campusArea || prev.campusArea,
                accreditation: p.accreditation || prev.accreditation,
                // Location
                location: {
                    ...prev.location,
                    ...(p.location ? {
                        region: p.location.region || prev.location.region,
                        city: p.location.city || prev.location.city,
                        address: p.location.address || prev.location.address,
                    } : {}),
                },
                // Rating
                rating: {
                    value: p.rating?.value != null ? p.rating.value.toString() : prev.rating.value,
                    platform: p.rating?.platform || prev.rating.platform,
                },
                // Facilities
                facilities: (Array.isArray(p.facilities) && p.facilities.length > 0) ? p.facilities : prev.facilities,
                // Hostel
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
                // Branches
                branches: (Array.isArray(p.branches) && p.branches.length > 0) ? p.branches : prev.branches,
                // Always preserve gallery images
                galleryImages: prev.galleryImages,
            }));
            setShowAiModal(false);
            setRawText('');
            Alert.alert('✨ Done!', 'Form auto-filled from AI. Review and save.');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to parse text. Try again.');
        } finally {
            setAiLoading(false);
        }
    };

    const toggleFacility = (fac) => {

        const updated = formData.facilities.includes(fac)
            ? formData.facilities.filter(f => f !== fac)
            : [...formData.facilities, fac];
        setFormData({ ...formData, facilities: updated });
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.7,
        });
        if (!result.canceled) handleUploadMultiple(result.assets.map(a => a.uri));
    };

    const handleUploadMultiple = async (uris) => {
        setLoading(true);
        try {
            const uploadedUrls = [];
            for (const uri of uris) {
                const fd = new FormData();
                const fileName = uri.split('/').pop();
                if (Platform.OS === 'web') {
                    const blob = await (await fetch(uri)).blob();
                    fd.append('image', blob, fileName);
                } else {
                    const uriParts = uri.split('.');
                    const fileExt = uriParts[uriParts.length - 1] || 'jpg';
                    const fileName = uri.split('/').pop();

                    const mimeMapping = {
                        'jpg': 'image/jpeg',
                        'jpeg': 'image/jpeg',
                        'png': 'image/png',
                        'webp': 'image/webp'
                    };
                    const mimeType = mimeMapping[fileExt.toLowerCase()] || 'image/jpeg';

                    fd.append('image', {
                        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                        name: fileName.includes('.') ? fileName : `${fileName}.${fileExt}`,
                        type: mimeType,
                    });
                }
                const res = await uploadAPI.upload(fd);
                uploadedUrls.push(res.data.url);
            }
            setFormData({ ...formData, galleryImages: [...formData.galleryImages, ...uploadedUrls] });
        } catch (err) {
            Alert.alert('Upload Error', 'Failed to upload some images');
        } finally {
            setLoading(false);
        }
    };

    const removeImage = (index) => {
        const imgs = [...formData.galleryImages];
        imgs.splice(index, 1);
        setFormData({ ...formData, galleryImages: imgs });
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
                branches: formData.branches.length > 0 ? formData.branches : undefined,
            };

            await institutionAPI.update(id, payload);
            Alert.alert('Success', 'Institution updated!');
            navigation.goBack();
        } catch (error) {
            console.error('Update error:', error?.response?.data || error.message);
            Alert.alert('Error', error?.response?.data?.message || 'Failed to update institution');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Institution",
            "Are you sure you want to delete this institution and ALL its cutoff data? This action IS IRREVERSIBLE.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await institutionAPI.delete(id);
                            Alert.alert("Success", "Institution deleted.");
                            navigation.navigate('Dashboard');
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete institution.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (fetchLoading || !formData) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    const f = formData;
    const setF = (update) => setFormData({ ...formData, ...update });

    return (
        <MainLayout>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Edit Institution</Text>
                    <Button
                        title="Magic AI"
                        variant="outline"
                        onPress={() => setShowAiModal(true)}
                        style={styles.aiBtn}
                        icon={Bot}
                    />
                </View>

                {/* Basic Info */}
                <Text style={styles.sectionTitle}>Basic Info</Text>
                <Card style={styles.card}>
                    <Input label="Institution Name *" value={f.name} onChangeText={v => setF({ name: v })} placeholder="e.g. COEP Technological University" />
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input label="University" value={f.university} onChangeText={v => setF({ university: v })} placeholder="e.g. SPPU" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input label="DTE Code" value={f.dteCode} onChangeText={v => setF({ dteCode: v })} placeholder="e.g. 6006" />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input label="Fees / Year (₹)" value={f.feesPerYear} onChangeText={v => setF({ feesPerYear: v })} placeholder="e.g. 100000" keyboardType="numeric" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input label="NIRF / Rating" value={f.rating.value} onChangeText={v => setFormData({ ...f, rating: { ...f.rating, value: v } })} placeholder="e.g. 85" keyboardType="numeric" />
                        </View>
                    </View>
                    <Text style={styles.label}>Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
                            {INST_TYPES.map(t => (
                                <TouchableOpacity key={t} style={[styles.typeChip, f.type === t && styles.typeChipActive]} onPress={() => setF({ type: t })}>
                                    <Text style={[styles.typeChipText, f.type === t && styles.typeChipTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </Card>

                {/* Gallery */}
                <Text style={styles.sectionTitle}>Gallery Images</Text>
                <Card style={styles.card}>
                    <View style={styles.imageGallery}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {f.galleryImages.map((img, i) => (
                                <View key={i} style={styles.imageWrapper}>
                                    <Image source={{ uri: img }} style={styles.previewImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                                        <X size={12} color={Colors.white} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {f.galleryImages.length < 5 && (
                                <TouchableOpacity style={styles.addImgBtn} onPress={pickImages} disabled={loading}>
                                    {loading ? <ActivityIndicator color={Colors.primary} /> : <Plus size={24} color={Colors.primary} />}
                                    <Text style={styles.addImgText}>Add</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </Card>

                {/* Digital Presence */}
                <Text style={styles.sectionTitle}>Digital Presence</Text>
                <Card style={styles.card}>
                    <Input label="Official Website" value={f.website} onChangeText={v => setF({ website: v })} placeholder="www.college.edu.in" keyboardType="url" leftIcon={Globe} />
                    <Input label="Google Maps URL" value={f.mapUrl} onChangeText={v => setF({ mapUrl: v })} placeholder="Paste Google Maps link" leftIcon={MapPin} />
                    <Input label="Description" value={f.description} onChangeText={v => setF({ description: v })} placeholder="Brief about the institute" multiline />
                </Card>

                {/* Location */}
                <Text style={styles.sectionTitle}>Location</Text>
                <Card style={styles.card}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}><Input label="City" value={f.location.city} onChangeText={v => setFormData({ ...f, location: { ...f.location, city: v } })} placeholder="e.g. Pune" /></View>
                        <View style={{ flex: 1 }}><Input label="Region" value={f.location.region} onChangeText={v => setFormData({ ...f, location: { ...f.location, region: v } })} placeholder="e.g. West" /></View>
                    </View>
                    <Input label="Address" value={f.location.address} onChangeText={v => setFormData({ ...f, location: { ...f.location, address: v } })} placeholder="Full address" multiline />
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}><Input label="Latitude" value={f.location.coordinates?.lat?.toString()} onChangeText={v => setFormData({ ...f, location: { ...f.location, coordinates: { ...f.location.coordinates, lat: v } } })} placeholder="e.g. 18.5196" keyboardType="numeric" /></View>
                        <View style={{ flex: 1 }}><Input label="Longitude" value={f.location.coordinates?.lng?.toString()} onChangeText={v => setFormData({ ...f, location: { ...f.location, coordinates: { ...f.location.coordinates, lng: v } } })} placeholder="e.g. 73.8554" keyboardType="numeric" /></View>
                    </View>

                    <TouchableOpacity
                        style={styles.coordHelper}
                        onPress={() => Linking.openURL('https://www.latlong.net/')}
                    >
                        <MapPin size={14} color={Colors.primary} />
                        <Text style={styles.coordHelperText}>Get Coordinates from Map</Text>
                    </TouchableOpacity>
                </Card>

                {/* General Info */}
                <Text style={styles.sectionTitle}>General Info (Optional)</Text>
                <Card style={styles.card}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}><Input label="Established Year" value={f.established?.toString()} onChangeText={v => setF({ established: v })} placeholder="e.g. 1854" keyboardType="numeric" /></View>
                        <View style={{ flex: 1 }}><Input label="Total Students" value={f.totalStudents?.toString()} onChangeText={v => setF({ totalStudents: v })} placeholder="e.g. 5000" keyboardType="numeric" /></View>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}><Input label="Campus Area" value={f.campusArea} onChangeText={v => setF({ campusArea: v })} placeholder="e.g. 45 Acres" /></View>
                        <View style={{ flex: 1 }}><Input label="Accreditation" value={f.accreditation} onChangeText={v => setF({ accreditation: v })} placeholder="e.g. NAAC A+" /></View>
                    </View>
                </Card>

                {/* Facilities */}
                <Text style={styles.sectionTitle}>Facilities (Optional)</Text>
                <Card style={styles.card}>
                    <View style={styles.facilityGrid}>
                        {FACILITY_OPTIONS.map(fac => {
                            const sel = f.facilities.includes(fac);
                            return (
                                <TouchableOpacity key={fac} style={[styles.facChip, sel && styles.facChipActive]} onPress={() => toggleFacility(fac)}>
                                    <Text style={[styles.facChipText, sel && styles.facChipTextActive]}>{fac}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Card>

                {/* Branches */}
                <View style={styles.sectionHeader}>
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
                                <TouchableOpacity style={styles.removeBtnSmall} onPress={() => removeBranch(idx)}>
                                    <X size={16} color={Colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </Card>

                {/* Hostel */}
                <Text style={styles.sectionTitle}>Hostel Info (Optional)</Text>
                <Card style={styles.card}>
                    <Text style={styles.label}>Boys Hostel</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}><Input label="Fees / Year" value={f.hostel.boys?.fees?.toString()} onChangeText={v => setFormData({ ...f, hostel: { ...f.hostel, boys: { ...f.hostel.boys, fees: v, available: true } } })} placeholder="₹ Amount" keyboardType="numeric" /></View>
                        <View style={{ flex: 1 }}><Input label="Capacity" value={f.hostel.boys?.capacity?.toString()} onChangeText={v => setFormData({ ...f, hostel: { ...f.hostel, boys: { ...f.hostel.boys, capacity: v, available: true } } })} placeholder="Seats" keyboardType="numeric" /></View>
                    </View>
                    <Text style={styles.label}>Girls Hostel</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}><Input label="Fees / Year" value={f.hostel.girls?.fees?.toString()} onChangeText={v => setFormData({ ...f, hostel: { ...f.hostel, girls: { ...f.hostel.girls, fees: v, available: true } } })} placeholder="₹ Amount" keyboardType="numeric" /></View>
                        <View style={{ flex: 1 }}><Input label="Capacity" value={f.hostel.girls?.capacity?.toString()} onChangeText={v => setFormData({ ...f, hostel: { ...f.hostel, girls: { ...f.hostel.girls, capacity: v, available: true } } })} placeholder="Seats" keyboardType="numeric" /></View>
                    </View>
                    <Input label="Hostel Notes" value={f.hostel.notes} onChangeText={v => setFormData({ ...f, hostel: { ...f.hostel, notes: v } })} placeholder="Additional hostel info" multiline />
                </Card>

                <View style={styles.bottomActions}>
                    <Button title="Save Changes" onPress={handleSave} loading={loading} style={{ flex: 2 }} />
                    <TouchableOpacity style={styles.deleteInstBtn} onPress={handleDelete}>
                        <X size={20} color={Colors.error} />
                        <Text style={styles.deleteInstText}>Delete College</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Magic AI Modal */}
            <Modal visible={showAiModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>✨ Magic AI Extraction</Text>
                        <Text style={styles.modalSub}>Paste raw text from a website or brochure to auto-fill the form.</Text>

                        <View style={styles.templateNote}>
                            <Text style={styles.templateNoteTitle}>💡 Recommended Format:</Text>
                            <Text style={styles.templateNoteText}>
                                Name: COEP Pune
                                Established: 1854
                                Hostel Boys: Fees 55k, Cap 600
                                Facilities: WiFi, Canteen, Library
                                Branches: Comp Sci (CS), IT (IT)
                            </Text>
                        </View>

                        <Input
                            placeholder="Paste college brochure, website text, etc..."
                            value={rawText}
                            onChangeText={setRawText}
                            multiline
                            containerStyle={{ height: 400 }}
                            inputStyle={{ height: 380, textAlignVertical: 'top' }}
                        />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" variant="ghost" onPress={() => setShowAiModal(false)} style={{ flex: 1 }} />
                            <Button title="Parse & Fill" onPress={handleAiParse} loading={aiLoading} style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 16, marginTop: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: Colors.primary, paddingHorizontal: 16 },
    card: { marginBottom: 12, marginHorizontal: 16, padding: 16 },
    row: { flexDirection: 'row', gap: 12 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary, marginBottom: 8, marginTop: 12 },
    imageGallery: { flexDirection: 'row', gap: 12 },
    imageWrapper: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', marginRight: 12, position: 'relative', ...Shadows.sm },
    previewImage: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.error || '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    removeBtnSmall: { padding: 8, marginTop: 15 },
    addImgBtn: { width: 80, height: 80, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary + '05' },
    addImgText: { fontSize: 10, color: Colors.primary, fontWeight: 'bold', marginTop: 4 },
    typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeChipText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },
    typeChipTextActive: { color: Colors.white },
    facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    facChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    facChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
    facChipText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
    facChipTextActive: { color: Colors.primary },
    aiBtn: { paddingVertical: 4, paddingHorizontal: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: Colors.white, borderRadius: 24, padding: 24, ...Shadows.lg },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 6, color: Colors.text.primary },
    modalSub: { fontSize: 14, color: Colors.text.secondary, marginBottom: 18, lineHeight: 20 },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16, marginTop: 24 },
    addBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
    branchItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    branchInputs: { flex: 1, flexDirection: 'row', gap: 10 },
    emptyText: { textAlign: 'center', color: Colors.text.tertiary, marginVertical: 10, fontSize: 14 },
    templateNote: { backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BAE6FD' },
    templateNoteTitle: { fontSize: 13, fontWeight: 'bold', color: '#0369A1', marginBottom: 4 },
    templateNoteText: { fontSize: 11, color: '#0EA5E9', lineHeight: 16 },
    coordHelper: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 15, padding: 10, borderRadius: 10, backgroundColor: Colors.primary + '08', borderColor: Colors.primary + '20', borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center' },
    coordHelperText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },

    // New bottom actions
    bottomActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        marginBottom: 60,
        marginHorizontal: 16,
        alignItems: 'center'
    },
    deleteInstBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: Colors.error + '10',
        borderWidth: 1,
        borderColor: Colors.error + '25'
    },
    deleteInstText: { color: Colors.error, fontWeight: 'bold', fontSize: 13 }
});

export default EditInstitutionScreen;
