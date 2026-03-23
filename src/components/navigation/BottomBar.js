import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Home, Search, LayoutGrid, User, Bot, CloudUpload } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BottomBar = ({ state, navigation }) => {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const isAdmin = user?.role === 'admin';
    
    // Adjust height based on insets - Increased for "upside" look
    const BAR_HEIGHT = Platform.OS === 'ios' ? 70 + insets.bottom : 80 + (insets.bottom > 0 ? insets.bottom : 20);

    const tabs = isAdmin ? [
        { name: 'Dashboard', icon: Home, label: 'Admin' },
        { name: 'UploadCutoff', icon: CloudUpload, label: 'Upload' },
        { name: 'BrowseColleges', icon: Search, label: 'Institutes' },
        { name: 'Profile', icon: User, label: 'Profile' },
    ] : [
        { name: 'Dashboard', icon: Home, label: 'Home' },
        { name: 'BrowseColleges', icon: Search, label: 'Browse' },
        { name: 'AICounselor', icon: Bot, label: 'ETA AI' },
        { name: 'ConnectCounselor', icon: User, label: 'Experts' },
    ];

    return (
        <View style={[styles.container, { height: BAR_HEIGHT, paddingBottom: insets.bottom || 20 }]}>
            {tabs.map((tab, index) => {
                const isActive = state.routes[state.index].name === tab.name;
                const Icon = tab.icon;

                return (
                    <TouchableOpacity
                        key={index}
                        style={styles.tab}
                        onPress={() => navigation.navigate(tab.name)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                            <Icon
                                size={22}
                                color={isActive ? Colors.primary : Colors.text.tertiary}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                        </View>
                        <Text style={[styles.label, isActive && styles.labelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        ...Shadows.md,
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBox: {
        padding: 4,
        borderRadius: 12,
        marginBottom: 2,
    },
    iconBoxActive: {
        backgroundColor: Colors.primary + '08',
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.text.tertiary,
    },
    labelActive: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
    tabAvatar: { width: '100%', height: '100%' },
});

export default BottomBar;
