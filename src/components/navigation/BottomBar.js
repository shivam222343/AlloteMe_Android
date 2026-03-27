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

    const BAR_HEIGHT = Platform.OS === 'ios' ? 65 + insets.bottom : 70;

    // Get visible tab name index
    const currentRoute = state.routes[state.index].name;

    // Hide bar for specific screens
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
        { name: 'AICounselor', icon: Bot, label: 'AS AI' },
        { name: 'Counselors', icon: User, label: 'Experts' },
    ];

    return (
        <View style={[styles.wrapper, { height: BAR_HEIGHT, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }]}>
            <View style={styles.container}>
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
                            {isActive && <View style={styles.activeIndicator} />}
                            <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                                <Icon
                                    size={23}
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
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        position: 'relative'
    },
    activeIndicator: {
        position: 'absolute',
        top: 0,
        width: 24,
        height: 3,
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
    },
    iconBox: {
        padding: 6,
        borderRadius: 14,
        marginBottom: 2,
    },
    iconBoxActive: {
        backgroundColor: Colors.primary + '12',
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: -2,
    },
    labelActive: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
});

export default BottomBar;
