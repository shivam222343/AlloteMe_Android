import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, Modal, ActivityIndicator, FlatList, Platform
} from 'react-native';
import { Colors, Shadows, Spacing } from '../constants/theme';
import MainLayout from '../components/layouts/MainLayout';
import { 
    Plus, Trash2, Edit3, Save, X, 
    ChevronRight, FileText, Info,
    Settings, CheckCircle, List
} from 'lucide-react-native';

// Initial data (same as in DocumentVerificationScreen)
const INITIAL_DOC_DATA = {
    "OPEN": ["MHT-CET / JEE Score Card", "10th Marksheet", "12th Marksheet", "Leaving Certificate / Transfer Certificate", "Nationality Certificate / Birth Certificate", "Domicile Certificate", "Recent Passport Size Photo"],
    "EWS": ["MHT-CET / JEE Score Card", "10th Marksheet", "12th Marksheet", "Leaving Certificate / Transfer Certificate", "Nationality Certificate / Birth Certificate", "Domicile Certificate", "EWS Certificate (Proforma V)", "Income Certificate", "Recent Passport Size Photo"],
    "OBC": ["MHT-CET / JEE Score Card", "10th Marksheet", "12th Marksheet", "Leaving Certificate / Transfer Certificate", "Nationality Certificate / Birth Certificate", "Domicile Certificate", "Caste Certificate", "Caste Validity Certificate", "Non-Creamy Layer Certificate", "Income Certificate", "Recent Passport Size Photo"],
    "SC/ST": ["MHT-CET / JEE Score Card", "10th Marksheet", "12th Marksheet", "Leaving Certificate / Transfer Certificate", "Nationality Certificate / Birth Certificate", "Domicile Certificate", "Caste Certificate", "Caste Validity Certificate", "Recent Passport Size Photo"]
};

const AdminDocumentManagerScreen = () => {
    const [docData, setDocData] = useState(INITIAL_DOC_DATA);
    const [selectedCat, setSelectedCat] = useState("OPEN");
    const [newDocName, setNewDocName] = useState("");
    const [editModal, setEditModal] = useState({ visible: false, oldName: "", newName: "" });

    const handleAddDoc = () => {
        if (!newDocName.trim()) return;
        if (docData[selectedCat].includes(newDocName.trim())) {
            Alert.alert("Error", "This document already exists in this category.");
            return;
        }

        const updated = { ...docData, [selectedCat]: [...docData[selectedCat], newDocName.trim()] };
        setDocData(updated);
        setNewDocName("");
        Alert.alert("Success", "Document added to list.");
    };

    const handleDeleteDoc = (name) => {
        const title = "Delete Document";
        const message = `Are you sure you want to remove "${name}" from the ${selectedCat} list?`;

        if (Platform.OS === 'web') {
            if (window.confirm(`${title}\n\n${message}`)) {
                const updated = { ...docData, [selectedCat]: docData[selectedCat].filter(d => d !== name) };
                setDocData(updated);
            }
            return;
        }

        Alert.alert(
            title,
            message,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: () => {
                        const updated = { ...docData, [selectedCat]: docData[selectedCat].filter(d => d !== name) };
                        setDocData(updated);
                    }
                }
            ]
        );
    };

    const handleSaveList = () => {
        // In a real app, this would call systemAPI.updateSetting
        Alert.alert("Success", "Document configuration updated globally.");
    };

    const renderDocItem = (item) => (
        <View style={styles.docItem}>
            <FileText size={18} color={Colors.text.tertiary} />
            <Text style={styles.docName}>{item}</Text>
            <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => handleDeleteDoc(item)} style={styles.actionBtn}>
                    <Trash2 size={18} color={Colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <MainLayout title="Manage Documents">
            <View style={styles.container}>
                <View style={styles.catSelector}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                        {Object.keys(docData).map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.catTab, selectedCat === cat && styles.catTabActive]}
                                onPress={() => setSelectedCat(cat)}
                            >
                                <Text style={[styles.catTabText, selectedCat === cat && styles.catTabTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.addSection}>
                    <TextInput 
                        style={styles.input}
                        placeholder="Add new document name..."
                        value={newDocName}
                        onChangeText={setNewDocName}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddDoc}>
                        <Plus size={20} color="#fff" />
                        <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.listHeader}>
                    <List size={18} color={Colors.text.secondary} />
                    <Text style={styles.listTitle}>Document List ({docData[selectedCat].length})</Text>
                </View>

                <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                    {docData[selectedCat].map((doc, idx) => (
                        <View key={idx}>{renderDocItem(doc)}</View>
                    ))}
                </ScrollView>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveList}>
                    <Save size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Global Configuration</Text>
                </TouchableOpacity>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    catSelector: { marginBottom: 20, marginHorizontal: -16 },
    catScroll: { paddingHorizontal: 16 },
    catTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 8, backgroundColor: '#F1F5F9' },
    catTabActive: { backgroundColor: Colors.primary },
    catTabText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
    catTabTextActive: { color: '#fff' },

    addSection: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    input: { 
        flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, 
        borderWidth: 1, borderColor: '#E2E8F0', height: 48 
    },
    addBtn: { 
        backgroundColor: Colors.primary, paddingHorizontal: 20, borderRadius: 12, 
        flexDirection: 'row', alignItems: 'center', gap: 8 
    },
    addBtnText: { color: '#fff', fontWeight: 'bold' },

    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    listTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary },

    scrollList: { flex: 1 },
    docItem: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
        padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9'
    },
    docName: { flex: 1, fontSize: 14, color: Colors.text.primary, marginLeft: 12 },
    itemActions: { flexDirection: 'row', gap: 12 },
    actionBtn: { padding: 4 },

    saveBtn: { 
        backgroundColor: Colors.success, padding: 16, borderRadius: 16, 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginTop: 20, ...Shadows.soft
    },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default AdminDocumentManagerScreen;
