import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { authAPI, institutionAPI } from '../services/api';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { User, Mail, Lock, Building2, Search, X, CheckCircle2 } from 'lucide-react-native';

const RegisterCollegeAdminScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [fetchingInstitutions, setFetchingInstitutions] = useState(false);
    const [institutions, setInstitutions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [collegeAdmins, setCollegeAdmins] = useState([]);
    
    const categories = ['ALL', 'MHTCET PCM', 'MHTCET PCB', 'JEE', 'NEET', 'BBA', 'MBA'];
    
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        managedInstitution: null // This will hold the institution object
    });

    useEffect(() => {
        loadInstitutions();
        loadCollegeAdmins();
    }, []);

    const loadCollegeAdmins = async () => {
        try {
            const res = await authAPI.getCollegeAdmins();
            if (res.data.success) {
                setCollegeAdmins(res.data.data);
            }
        } catch (error) {
            console.error('Failed to load college admins', error);
        }
    };

    const loadInstitutions = async () => {
        setFetchingInstitutions(true);
        try {
            const res = await institutionAPI.getAll();
            setInstitutions(res.data);
        } catch (error) {
            console.error('Failed to load institutions', error);
        } finally {
            setFetchingInstitutions(false);
        }
    };

    const filteredInstitutions = institutions.filter(inst => {
        const matchesSearch = searchQuery.trim() === '' || 
            inst.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            inst.dteCode?.toString().includes(searchQuery);
        
        const matchesCategory = selectedCategory === 'ALL' || inst.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });

    const handleRegister = async () => {
        if (!formData.displayName || !formData.email || !formData.password || !formData.managedInstitution) {
            Alert.alert('Missing Fields', 'Please fill all fields and select an institution.');
            return;
        }

        if (formData.password.length < 8) {
            Alert.alert('Short Password', 'Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                displayName: formData.displayName,
                email: formData.email,
                password: formData.password,
                managedInstitution: formData.managedInstitution._id
            };

            await authAPI.registerCollegeAdmin(payload);
            Alert.alert(
                'Success', 
                `College Administrator ${formData.displayName} has been registered for ${formData.managedInstitution.name}.`,
                [{ text: 'OK' }]
            );
            // Clear form
            setFormData({
                displayName: '',
                email: '',
                password: '',
                managedInstitution: null
            });
            loadCollegeAdmins(); // Refresh list
        } catch (error) {
            console.error('Registration error:', error.response?.data || error.message);
            Alert.alert('Error', error.response?.data?.message || 'Failed to register college administrator');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout title="Register College Admin">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.subtitle}>Create a new administrative account for a specific educational institution.</Text>
                </View>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Administrator Details</Text>
                    
                    <Input
                        label="Full Name"
                        placeholder="e.g. Dr. Satish Patil"
                        value={formData.displayName}
                        onChangeText={(val) => setFormData({...formData, displayName: val})}
                        leftIcon={User}
                    />

                    <Input
                        label="Official Email"
                        placeholder="e.g. admin@coep.ac.in"
                        value={formData.email}
                        onChangeText={(val) => setFormData({...formData, email: val})}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        leftIcon={Mail}
                    />

                    <Input
                        label="Temporary Password"
                        placeholder="Min 8 characters"
                        value={formData.password}
                        onChangeText={(val) => setFormData({...formData, password: val})}
                        secureTextEntry
                        leftIcon={Lock}
                    />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Assign Institution</Text>
                    
                    <TouchableOpacity 
                        style={[styles.selector, formData.managedInstitution && styles.selectorSelected]} 
                        onPress={() => setShowModal(true)}
                    >
                        <Building2 size={20} color={formData.managedInstitution ? Colors.primary : Colors.text.tertiary} />
                        <View style={styles.selectorContent}>
                            <Text style={[styles.selectorText, formData.managedInstitution && styles.selectorTextSelected]}>
                                {formData.managedInstitution ? formData.managedInstitution.name : 'Select Institution'}
                            </Text>
                            {formData.managedInstitution && (
                                <Text style={styles.selectorSubtext}>DTE Code: {formData.managedInstitution.dteCode}</Text>
                            )}
                        </View>
                        <Search size={18} color={Colors.text.tertiary} />
                    </TouchableOpacity>

                    {formData.managedInstitution && (
                        <View style={styles.infoBanner}>
                            <CheckCircle2 size={16} color={Colors.success} />
                            <Text style={styles.infoBannerText}>
                                This admin will have full access to manage {formData.managedInstitution.name} profile.
                            </Text>
                        </View>
                    )}
                </Card>

                <Button
                    title="Register Administrator"
                    onPress={handleRegister}
                    loading={loading}
                    style={styles.submitBtn}
                />

                {/* Registered Admins List */}
                <View style={styles.adminsSection}>
                    <Text style={styles.adminsSectionTitle}>Registered College Admins</Text>
                    {collegeAdmins.length === 0 ? (
                        <Text style={styles.emptyAdminsText}>No administrators registered yet.</Text>
                    ) : (
                        collegeAdmins.map(admin => (
                            <View key={admin._id} style={styles.adminListItem}>
                                <View style={styles.adminListIcon}>
                                    <CheckCircle2 size={16} color={Colors.success} />
                                </View>
                                <View style={styles.adminListDetails}>
                                    <Text style={styles.adminListName}>{admin.displayName}</Text>
                                    <Text style={styles.adminListInst}>{admin.managedInstitution?.name || 'No institution'}</Text>
                                </View>
                                <Text style={styles.adminListEmail}>{admin.email}</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Institution Selection Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Institution</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color={Colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchBox}>
                            <Search size={18} color={Colors.text.tertiary} />
                            <Input
                                placeholder="Search by name or code..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                containerStyle={styles.searchInputContainer}
                                inputStyle={styles.searchInput}
                            />
                        </View>
                        
                        <View style={styles.categoryContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                                {categories.map(cat => (
                                    <TouchableOpacity 
                                        key={cat}
                                        style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                                        onPress={() => setSelectedCategory(cat)}
                                    >
                                        <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {fetchingInstitutions ? (
                            <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
                        ) : (
                            <FlatList
                                data={filteredInstitutions}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={[styles.instItem, collegeAdmins.some(a => a.managedInstitution?._id === item._id) && styles.instItemAssigned]}
                                        onPress={() => {
                                            setFormData({...formData, managedInstitution: item});
                                            setShowModal(false);
                                        }}
                                    >
                                        <View style={styles.instIcon}>
                                            {collegeAdmins.some(a => a.managedInstitution?._id === item._id) ? (
                                                <CheckCircle2 size={18} color={Colors.success} />
                                            ) : (
                                                <Building2 size={18} color={Colors.primary} />
                                            )}
                                        </View>
                                        <View style={styles.instDetails}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.instName}>{item.name}</Text>
                                                {collegeAdmins.some(a => a.managedInstitution?._id === item._id) && (
                                                    <View style={styles.assignedBadge}>
                                                        <Text style={styles.assignedBadgeText}>ASSIGNED</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.instCode}>DTE: {item.dteCode} • {item.location?.city}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <Text style={styles.emptyText}>No institutions found matching your search.</Text>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    scrollContent: { padding: 16, paddingBottom: 40 },
    header: { marginBottom: 24 },
    subtitle: { fontSize: 14, color: Colors.text.tertiary, lineHeight: 20 },
    card: { padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 20 },
    submitBtn: { marginTop: 8 },
    
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: Colors.divider,
        gap: 12
    },
    selectorSelected: {
        backgroundColor: Colors.primary + '05',
        borderColor: Colors.primary,
    },
    selectorContent: { flex: 1 },
    selectorText: { fontSize: 15, color: Colors.text.tertiary, fontWeight: '500' },
    selectorTextSelected: { color: Colors.text.primary, fontWeight: 'bold' },
    selectorSubtext: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
    
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F0FDF4',
        padding: 12,
        borderRadius: 10,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#DCFCE7'
    },
    infoBannerText: { fontSize: 12, color: '#166534', flex: 1, lineHeight: 18 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { 
        backgroundColor: Colors.white, 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30, 
        height: '85%', 
        padding: 24 
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text.primary },
    searchBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F1F5F9', 
        paddingHorizontal: 16, 
        borderRadius: 12,
        marginBottom: 20
    },
    searchInputContainer: { flex: 1, borderBottomWidth: 0, marginTop: 0, marginBottom: 0 },
    searchInput: { fontSize: 15 },
    
    instItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: Colors.divider,
        gap: 16
    },
    instIcon: { 
        width: 40, 
        height: 40, 
        borderRadius: 10, 
        backgroundColor: Colors.primary + '10', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    instDetails: { flex: 1 },
    instName: { fontSize: 15, fontWeight: 'bold', color: Colors.text.primary },
    instCode: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 40, color: Colors.text.tertiary },

    categoryContainer: {
        marginBottom: 16,
    },
    categoryScroll: {
        paddingHorizontal: 4,
        gap: 8,
    },
    catPill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 100,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    catPillActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    catText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.text.tertiary,
    },
    catTextActive: {
        color: Colors.white,
    },

    adminsSection: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        borderStyle: 'dashed',
    },
    adminsSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 16,
    },
    adminListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.divider,
        gap: 12,
    },
    adminListIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adminListDetails: {
        flex: 1,
    },
    adminListName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    adminListInst: {
        fontSize: 11,
        color: Colors.text.tertiary,
        marginTop: 2,
    },
    adminListEmail: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
    },
    emptyAdminsText: {
        textAlign: 'center',
        color: Colors.text.tertiary,
        fontSize: 13,
        fontStyle: 'italic',
        padding: 20,
    },
    instItemAssigned: {
        backgroundColor: '#F8FAFC',
    },
    assignedBadge: {
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    assignedBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: Colors.success,
    },
});

export default RegisterCollegeAdminScreen;
