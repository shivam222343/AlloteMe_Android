import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import { Colors, Spacing, Shadows } from '../constants/theme';
import { Phone, MessageSquare, Star, ArrowRight } from 'lucide-react-native';

const counselors = [
    { id: '1', name: 'Priya Sharma', exp: '12 yrs', rating: '4.9', specialized: 'MHTCET/JEE', image: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', name: 'Dr. Sameer Patil', exp: '8 yrs', rating: '4.8', specialized: 'NEET/Medical', image: 'https://i.pravatar.cc/150?u=2' },
];

const ConnectCounselorScreen = () => {
    const CounselorCard = ({ item }) => (
        <Card style={styles.card}>
            <View style={styles.row}>
                <Image source={{ uri: item.image }} style={styles.avatar} />
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.special}>{item.specialized} Expert</Text>
                    <View style={styles.ratingRow}>
                        <Star size={12} color={Colors.warning} fill={Colors.warning} />
                        <Text style={styles.ratingText}>{item.rating} ({item.exp})</Text>
                    </View>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn}>
                    <MessageSquare size={16} color={Colors.primary} />
                    <Text style={styles.actionText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]}>
                    <Phone size={16} color={Colors.white} />
                    <Text style={[styles.actionText, styles.whiteText]}>Book Call</Text>
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <MainLayout>
            <View style={styles.container}>
                <Text style={styles.title}>Expert Counselors</Text>
                <Text style={styles.subtitle}>Get personalized guidance from top experts</Text>

                <FlatList
                    data={counselors}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <CounselorCard item={item} />}
                    contentContainerStyle={styles.list}
                />
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { padding: Spacing.lg },
    title: { fontSize: 24, fontWeight: 'bold' },
    subtitle: { fontSize: 14, color: Colors.text.secondary, marginBottom: 20 },
    card: { marginBottom: 16, padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 16, backgroundColor: Colors.divider },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold' },
    special: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginVertical: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 12, color: Colors.text.tertiary },
    actions: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary },
    primaryBtn: { backgroundColor: Colors.primary },
    actionText: { fontSize: 13, fontWeight: 'bold', color: Colors.primary },
    whiteText: { color: Colors.white }
});

export default ConnectCounselorScreen;
