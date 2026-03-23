import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

const MainLayout = ({ children, scrollable = true, style }) => {
    const Container = scrollable ? ScrollView : View;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
            <Container
                style={[styles.container, style]}
                contentContainerStyle={scrollable ? styles.scrollContent : undefined}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </Container>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
});

export default MainLayout;
