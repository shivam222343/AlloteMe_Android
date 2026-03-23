import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constants/theme';
import { Bookmark, MapPin } from 'lucide-react-native';

const SavedCollegesScreen = ({ navigation }) => {
    const [saved, setSaved] = useState([]);

    useEffect(() => {
        loadSaved();
    }, []);

    const loadSaved = async () => {
        const data = await AsyncStorage.getItem('savedColleges');
        if (data) setSaved(JSON.parse(data));
    };

    const CollegeCard = ({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}>
            <Card style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Bookmark size={18} color={Colors.primary} fill={Colors.primary} />
                </View>
                <View style={styles.locRow}>
                    <MapPin size={14} color={Colors.text.tertiary} />
                    <Text style={styles.locText}>{item.location.city}</Text>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <MainLayout>
            <View style={styles.container}>
                <Text style={styles.title}>Saved Colleges</Text>

                <FlatList
                    data={saved}
                    keyExtractor={item => item._id}
                    renderItem={({ item }) => <CollegeCard item={item} />}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>Your saved colleges will appear here.</Text>}
                />
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { paddingVertical: Spacing.lg },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    card: { marginBottom: 12, padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    name: { fontSize: 16, fontWeight: 'bold' },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locText: { fontSize: 12, color: Colors.text.tertiary },
    empty: { textAlign: 'center', marginTop: 40, color: Colors.text.tertiary }
});

export default SavedCollegesScreen;
