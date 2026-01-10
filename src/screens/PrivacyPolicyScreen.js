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
import { SafeAreaView } from 'react-native-safe-area-context';

const PrivacyPolicyScreen = ({ navigation }) => {
    const sections = [
        {
            title: "Information We Collect",
            content: "We collect information you provide directly to us, such as when you create or modify your account, participate in clubs, or communicate with us. This includes name, email, phone number, profile picture, and club affiliations."
        },
        {
            title: "How We Use Information",
            content: "We use the information we collect to provide, maintain, and improve our services, develop new features, and protect Mavericks and our users. We also use information to personalize your experience and provide relevant content."
        },
        {
            title: "Sharing of Information",
            content: "Your club activities and snaps are shared with members of the respective clubs based on your privacy settings. We do not sell your personal data to third parties."
        },
        {
            title: "Data Security",
            content: "We use reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction."
        },
        {
            title: "Your Choices",
            content: "You may update, correct, or delete information about you at any time by logging into your account or contacting us."
        }
    ];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1e293b', '#0f172a']}
                style={styles.header}
            >
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="close" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Privacy Policy</Text>
                        <View style={{ width: 28 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <View style={styles.lastUpdated}>
                    <Text style={styles.updatedText}>Last updated: January 1, 2026</Text>
                </View>

                <Text style={styles.introText}>
                    Welcome to Mavericks. We value your privacy and are committed to protecting your personal data.
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
                    <Ionicons name="shield-checkmark" size={40} color="#0A66C2" style={{ marginBottom: 15 }} />
                    <Text style={styles.footerText}>
                        If you have any questions about this Privacy Policy, please contact us at privacy@mavericks.app
                    </Text>
                </View>
            </ScrollView>
        </View>
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
