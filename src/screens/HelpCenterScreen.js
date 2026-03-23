import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Linking,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Spacing, Shadows, BorderRadius } from '../constants/theme';

const HelpCenterScreen = ({ navigation }) => {
    const faqs = [
        {
            question: "How do I predict my colleges?",
            answer: "Go to the Predictor section, enter your percentile/score and select your category. The AI will show you colleges where you have a high chance based on historical cutoff data."
        },
        {
            question: "How to browse all colleges?",
            answer: "Go to the 'Explore Colleges' tab. You can search by name or university and filter results to find your preferred institutions."
        },
        {
            question: "Is the cutoff data accurate?",
            answer: "We use official historical data from previous rounds. While it's highly indicative, actual cutoffs vary each year based on student performance."
        },
        {
            question: "How can I contact a counselor?",
            answer: "You can use the AI Counselor for instant help, or visit the 'Connect' section to find professional admission consultants."
        }
    ];

    const contactMethods = [
        {
            icon: "mail-outline",
            title: "Email Support",
            subtitle: "support@alloteme.com",
            color: Colors.primary,
            onPress: () => Linking.openURL('mailto:support@alloteme.com')
        },
        {
            icon: "chatbubble-ellipses-outline",
            title: "Live Chat",
            subtitle: "Available 24/7",
            color: Colors.accent,
            onPress: () => alert('Live chat coming soon!')
        }
    ];

    return (
        <MainLayout title="Help Center">
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={Colors.text.tertiary} />
                        <Text style={styles.searchText}>Search for help...</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                {faqs.map((faq, index) => (
                    <View key={index} style={styles.faqCard}>
                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    </View>
                ))}

                <Text style={styles.sectionTitle}>Contact Us</Text>
                <View style={styles.contactRow}>
                    {contactMethods.map((method, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.contactCard}
                            onPress={method.onPress}
                        >
                            <View style={[styles.contactIcon, { backgroundColor: method.color + '15' }]}>
                                <Ionicons name={method.icon} size={24} color={method.color} />
                            </View>
                            <Text style={styles.contactTitle}>{method.title}</Text>
                            <Text style={styles.contactSubtitle}>{method.subtitle}</Text>
                        </TouchableOpacity>
                    ))}
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
    header: {
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
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
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
    },
    headerStats: {
        alignItems: 'center',
        marginTop: 20,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        marginTop: -20,
        paddingHorizontal: 20,
    },
    searchContainer: {
        marginBottom: 25,
    },
    searchBar: {
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
    },
    searchText: {
        color: '#64748B',
        marginLeft: 10,
        fontSize: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 15,
        marginTop: 10,
    },
    faqCard: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    faqQuestion: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
    },
    faqAnswer: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    contactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    contactCard: {
        backgroundColor: '#FFF',
        width: '48%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    contactIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    contactTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    contactSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    communityBtn: {
        marginTop: 10,
        borderRadius: 15,
        overflow: 'hidden',
    },
    communityGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    communityText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    }
});

export default HelpCenterScreen;
