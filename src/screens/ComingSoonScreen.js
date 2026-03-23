import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Typography, Spacing } from '../constants/theme';
import { Rocket } from 'lucide-react-native';

const ComingSoonScreen = ({ route }) => {
    const pageName = route.params?.title || 'This Page';

    return (
        <MainLayout title={pageName}>
            <View style={styles.container}>
                <View style={styles.iconBox}>
                    <Rocket size={60} color={Colors.primary} />
                </View>
                <Text style={styles.title}>{pageName}</Text>
                <Text style={styles.subtitle}>is coming soon!</Text>
                <Text style={styles.desc}>
                    We're working hard to bring you this feature. Stay tuned for updates!
                </Text>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: Colors.white,
    },
    iconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text.primary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: 4,
    },
    desc: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 22,
    },
});

export default ComingSoonScreen;
