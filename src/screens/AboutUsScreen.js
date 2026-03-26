import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

const AboutUsScreen = ({ navigation }) => {
    return (
        <MainLayout noPadding>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80' }}
                        style={styles.heroImage}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroOverlay}
                    >
                        <View style={styles.heroContent}>
                            <Text style={styles.heroTitle}>AlloteMe</Text>
                            <Text style={styles.heroSubtitle}>Simplifying college admissions, one student at a time.</Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.body}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Our Mission</Text>
                        <Text style={styles.text}>
                            AlloteMe is dedicated to empowering students across Maharashtra to navigate the complex world of technical admissions.
                            We bridge the gap between historical cutoff data and real-time student aspirations through advanced AI modeling and intuitive allocation analysis.
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>Meet our Founders</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foundersScroll}>
                        <View style={styles.founderCardContainer}>
                            <Image
                                source={require('../../assets/founders/shivam.png')}
                                style={styles.founderAvatar}
                            />
                            <Text style={styles.founderName}>Shivam Dombe</Text>
                            <Text style={styles.founderRole}>Lead Architect</Text>
                        </View>
                        <View style={styles.founderCardContainer}>
                            <Image
                                source={require('../../assets/founders/rohan.png')}
                                style={styles.founderAvatar}
                            />
                            <Text style={styles.founderName}>Rohan Mane</Text>
                            <Text style={styles.founderRole}>Technical Director</Text>
                        </View>
                        <View style={styles.founderCardContainer}>
                            <Image
                                source={require('../../assets/founders/tejas.png')}
                                style={styles.founderAvatar}
                            />
                            <Text style={styles.founderName}>Tejas Choudhari</Text>
                            <Text style={styles.founderRole}>Innovation Lead</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>100k+</Text>
                            <Text style={styles.statLabel}>Data Points</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>500+</Text>
                            <Text style={styles.statLabel}>Colleges</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>AI</Text>
                            <Text style={styles.statLabel}>Enabled</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Our Core Values</Text>
                    <View style={styles.valuesGrid}>
                        <View style={styles.valueCard}>
                            <Ionicons name="flash-outline" size={32} color={Colors.primary} />
                            <Text style={styles.valueTitle}>Precision</Text>
                        </View>
                        <View style={styles.valueCard}>
                            <Ionicons name="heart-outline" size={32} color={Colors.error} />
                            <Text style={styles.valueTitle}>Integrity</Text>
                        </View>
                        <View style={styles.valueCard}>
                            <Ionicons name="shield-outline" size={32} color={Colors.success} />
                            <Text style={styles.valueTitle}>Security</Text>
                        </View>
                        <View style={styles.valueCard}>
                            <Ionicons name="globe-outline" size={32} color={Colors.accent} />
                            <Text style={styles.valueTitle}>Impact</Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Developed by AlloteMe Engineers</Text>
                        <Text style={styles.footerText}>&copy; 2026 AlloteMe</Text>
                    </View>
                </View>
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    heroSection: {
        height: 400,
        width: width,
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        marginBottom: 30,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 5,
    },
    heroSubtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
        lineHeight: 24,
    },
    body: {
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    card: {
        backgroundColor: '#FFF',
        padding: 25,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 10,
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 15,
    },
    text: {
        fontSize: 16,
        color: '#64748B',
        lineHeight: 26,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0A66C2',
    },
    statLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 4,
    },
    valuesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    valueCard: {
        backgroundColor: '#FFF',
        width: '47%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    valueTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#475569',
        marginTop: 10,
    },
    teamSection: {
        padding: 30,
        borderRadius: 30,
        marginBottom: 40,
    },
    joinBtn: {
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 15,
        alignSelf: 'flex-start',
        marginTop: 20,
    },
    joinBtnText: {
        color: '#0A66C2',
        fontWeight: '700',
        fontSize: 15,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 60,
    },
    logo: {
        width: 100,
        height: 60,
        opacity: 0.2,
        marginBottom: 10,
    },
    footerText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '500',
    },
    foundersScroll: {
        marginBottom: 30,
        marginHorizontal: -20,
        paddingLeft: 20,
    },
    founderCardContainer: {
        width: 160,
        marginRight: 20,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    founderAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
        backgroundColor: '#F8FAFC',
    },
    founderName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
    },
    founderRole: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: 2,
    }
});

export default AboutUsScreen;
