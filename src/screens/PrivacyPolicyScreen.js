import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Spacing } from '../constants/theme';

const PrivacyPolicyScreen = ({ navigation }) => {
    const sections = [
        {
            title: "Information We Collect",
            content: "We collect information you provide directly to us, such as when you create or modify your account, use the college predictor, or communicate with us. This includes name, email, phone number, and academic preferences."
        },
        {
            title: "How We Use Information",
            content: "We use the information we collect to provide, maintain, and improve our services, develop new features like AI counseling, and protect AlloteMe and our students. We also use information to personalize your college recommendation experience."
        },
        {
            title: "Sharing of Information",
            content: "Your academic data is used to provide accurate college predictions. AlloteMe utilizes official historical allotment data sourced from the Maharashtra State CET Cell and DTE (Directorate of Technical Education). We do not sell your personal data to third parties."
        },
        {
            title: "Data Security",
            content: "We use robust measures to help protect your identity and academic information from loss, theft, misuse, and unauthorized access."
        },
        {
            title: "Your Choices",
            content: "You may update, correct, or delete your account and associated data at any time by logging into your account settings or contacting us."
        }
    ];

    return (
        <MainLayout title="Privacy Policy">
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <View style={styles.lastUpdated}>
                    <Text style={styles.updatedText}>Last updated: March 27, 2026</Text>
                </View>

                <Text style={styles.introText}>
                    Welcome to AlloteMe. We value your privacy and are committed to protecting your personal data.
                    This Privacy Policy explains how we collect, use, and share information about you.
                </Text>

                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.dot} />
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                        </View>
                        <Text style={styles.sectionContent}>{section.content}</Text>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Ionicons name="shield-checkmark" size={40} color={Colors.primary} style={{ marginBottom: 15 }} />
                    <Text style={styles.footerText}>
                        If you have any questions about this Privacy Policy, please contact us at alloteme1@gmail.com
                    </Text>
                </View>
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 25,
    },
    lastUpdated: {
        marginTop: 25,
        marginBottom: 20,
        backgroundColor: '#F1F5F9',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    updatedText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    introText: {
        fontSize: 16,
        color: '#475569',
        lineHeight: 24,
        marginBottom: 30,
    },
    section: {
        marginBottom: 35,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0A66C2',
        marginRight: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    sectionContent: {
        fontSize: 15,
        color: '#64748B',
        lineHeight: 22,
        paddingLeft: 20,
    },
    footer: {
        marginTop: 20,
        padding: 30,
        backgroundColor: '#F8FAFC',
        borderRadius: 25,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    }
});

export default PrivacyPolicyScreen;
