import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, ScrollView, TouchableOpacity,
    Linking, ActivityIndicator, Dimensions, Share, BackHandler
} from 'react-native';
import {
    Phone, MessageSquare, MapPin, Briefcase, Star,
    ChevronLeft, Share2, Award, Clock, ShieldCheck, Mail, Send
} from 'lucide-react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { counselorAPI } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CounselorDetailScreen = ({ route, navigation }) => {
    const { id } = route.params;
    const [counselor, setCounselor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCounselor();
    }, [id]);

    const fetchCounselor = async () => {
        try {
            const res = await counselorAPI.getById(id);
            setCounselor(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = () => {
        if (counselor?.contactNumber) {
            Linking.openURL(`tel:${counselor.contactNumber}`);
        }
    };

    const handleWhatsApp = () => {
        if (counselor?.contactNumber) {
            const phoneNumber = counselor.contactNumber.startsWith('+91')
                ? counselor.contactNumber
                : `+91${counselor.contactNumber}`;

            const messages = [
                `Hi ${counselor.name}, I'm interested in educational counseling. Can we chat?`,
                `Hello! I saw your profile on AlloteMe and need guidance regarding college admissions.`,
                `Hi Counselor, I have some doubts about my career path. Are you available?`
            ];
            const randomMsg = messages[Math.floor(Math.random() * messages.length)];
            const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(randomMsg)}`;

            Linking.canOpenURL(url).then(supported => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Linking.openURL(`https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(randomMsg)}`);
                }
            });
        }
    };

    if (loading) return (
        <MainLayout title="Counselor Details">
            <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        </MainLayout>
    );

    if (!counselor) return (
        <MainLayout title="Error">
            <View style={styles.center}><Text>Counselor not found.</Text></View>
        </MainLayout>
    );

    return (
        <MainLayout title={counselor.name} hideHeader>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header Image Section */}
                <View style={styles.imageHeader}>
                    <Image source={{ uri: counselor.profileImage }} style={styles.profileImg} />
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <ChevronLeft color="white" size={28} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.mainInfo}>
                        <View style={styles.titleRow}>
                            <Text style={styles.name}>{counselor.name}</Text>
                            <View style={styles.ratingBox}>
                                <Star size={16} color="#fbbf24" fill="#fbbf24" />
                                <Text style={styles.ratingText}>{counselor.rating || '4.8'}</Text>
                            </View>
                        </View>
                        <Text style={styles.field}>{counselor.field} Expert</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Award size={20} color={Colors.primary} />
                                <Text style={styles.statVal}>{counselor.experience}</Text>
                                <Text style={styles.statLabel}>Exp.</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Clock size={20} color={Colors.primary} />
                                <Text style={styles.statVal}>Available</Text>
                                <Text style={styles.statLabel}>Status</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <ShieldCheck size={20} color={Colors.primary} />
                                <Text style={styles.statVal}>Verified</Text>
                                <Text style={styles.statLabel}>Expert</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About Me</Text>
                        <Text style={styles.description}>{counselor.description}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Contact Information</Text>
                        <View style={styles.contactItem}>
                            <MapPin size={20} color="#64748b" />
                            <Text style={styles.contactText}>{counselor.location}</Text>
                        </View>
                        {counselor.email && (
                            <View style={styles.contactItem}>
                                <Mail size={20} color="#64748b" />
                                <Text style={styles.contactText}>{counselor.email}</Text>
                            </View>
                        )}
                        <View style={styles.contactItem}>
                            <Phone size={20} color="#64748b" />
                            <Text style={styles.contactText}>{counselor.contactNumber}</Text>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={[styles.actionBtn, styles.chatBtn]} onPress={handleWhatsApp}>
                    <MessageSquare size={20} color="white" />
                    <Text style={styles.actionBtnText}>Chat on WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={handleCall}>
                    <Phone size={20} color="white" />
                    <Text style={styles.actionBtnText}>Book Now (Call)</Text>
                </TouchableOpacity>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageHeader: { height: 350, position: 'relative' },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 50 },
    content: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        padding: 24,
        ...Shadows.lg
    },
    mainInfo: { marginBottom: 30 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    name: { fontSize: 26, fontWeight: 'bold', color: '#0f172a' },
    ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    ratingText: { fontWeight: 'bold', color: '#ea580c' },
    field: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 20 },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 20,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    statItem: { alignItems: 'center', flex: 1 },
    statVal: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginTop: 4 },
    statLabel: { fontSize: 12, color: '#64748b' },
    statDivider: { width: 1, height: '100%', backgroundColor: '#cbd5e1' },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
    description: { fontSize: 15, color: '#475569', lineHeight: 24 },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    contactText: { fontSize: 15, color: '#475569' },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        ...Shadows.lg
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 16
    },
    chatBtn: { backgroundColor: '#25d366' },
    callBtn: { backgroundColor: Colors.primary },
    actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});

export default CounselorDetailScreen;
