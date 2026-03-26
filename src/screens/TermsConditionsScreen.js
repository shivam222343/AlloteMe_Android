import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../components/layouts/MainLayout';
import { Colors } from '../constants/theme';

const TermsConditionsScreen = ({ navigation }) => {
    const sections = [
        {
            title: "1. Acceptance of Terms",
            content: "By accessing and using AlloteMe, you agree to be bound by these Terms and Conditions. Our services assist in Maharashtra technical admissions guidance."
        },
        {
            title: "2. Accuracy of Predictions",
            content: "All college predictions and AI counseling results are based on historical data. While we strive for 100% accuracy, final allotments are determined solely by the State CET Cell/DTE Maharashtra."
        },
        {
            title: "3. User Responsibilities",
            content: "You agree to provide accurate percentile and rank information to receive the best counseling results. Misuse of the platform or data scraping is strictly prohibited."
        },
        {
            title: "4. AI Counselor (Eta)",
            content: "Eta provides educational guidance. Users should cross-verify critical information with official DTE brochures."
        },
        {
            title: "5. Account Termination",
            content: "We reserve the right to terminate accounts that violate our usage policies or engage in fraudulent activities."
        }
    ];

    return (
        <MainLayout title="Terms & Conditions">
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <View style={styles.lastUpdated}>
                    <Text style={styles.updatedText}>Last updated: March 27, 2026</Text>
                </View>

                <Text style={styles.introText}>
                    Please read these terms carefully before using the AlloteMe platform. Your use of the service constitutes acceptance of these rules.
                </Text>

                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionContent}>{section.content}</Text>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        For legal inquiries, contact alloteme1@gmail.com
                    </Text>
                </View>
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 10,
    },
    sectionContent: {
        fontSize: 15,
        color: '#64748B',
        lineHeight: 22,
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
    }
});

export default TermsConditionsScreen;
