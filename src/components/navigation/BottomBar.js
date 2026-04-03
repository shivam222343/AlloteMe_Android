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

    const currentRoute = state.routes[state.index].name;

    if (currentRoute === 'PredictionResults' || currentRoute === 'CollegeDetail' || currentRoute === 'AdminUserDetail') {
        return null;
    }

    const tabs = isAdmin ? [
        { name: 'Dashboard', icon: Home, label: 'Admin' },
        { name: 'UploadCutoff', icon: CloudUpload, label: 'Upload' },
        { name: 'BrowseColleges', icon: Search, label: 'Institutes' },
        { name: 'Profile', icon: User, label: 'Profile' },
    ] : [
        { name: 'Dashboard', icon: Home, label: 'Home' },
        { name: 'BrowseColleges', icon: Search, label: 'Browse' },
        { name: 'AICounselor', icon: Bot, label: 'ETA AI' },
        { name: 'Counselors', icon: User, label: 'Experts' },
    ];

    // On Android, ensuring icons sit further upward and don't merge with system nav bar
    const safeBottom = Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 15);

    return (
        <View style={[styles.wrapper, { paddingBottom: safeBottom }]}>
            <View style={styles.tabRow}>
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
                            {isActive && <View style={styles.activeBar} />}
                            <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                                <Icon
                                    size={22}
                                    color={isActive ? Colors.primary : '#94A3B8'}
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
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        ...Shadows.lg,
        elevation: 10,
    },
    tabRow: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    activeBar: {
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        width: 28,
        height: 3,
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
    },
    iconBox: {
        padding: 5,
        borderRadius: 12,
        marginBottom: 2,
    },
    iconBoxActive: {
        backgroundColor: Colors.primary + '15',
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
    },
    labelActive: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
});

export default BottomBar;
