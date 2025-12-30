import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const BottomBar = ({ navigation, currentRoute, onScanPress }) => {
    const insets = useSafeAreaInsets();

    // Bottom padding for mobile home indicators and navigation buttons
    const bottomPadding = Platform.OS === 'android'
        ? Math.max(insets.bottom, 20)
        : Math.max(insets.bottom, 20);

    const navItems = [
        { route: 'Members', icon: 'people', iconOutline: 'people-outline' },
        { route: 'Meetings', icon: 'calendar', iconOutline: 'calendar-outline' },
        { route: 'Scan', isSpecial: true },
        { route: 'Analytics', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
        { route: 'Profile', icon: 'person', iconOutline: 'person-outline' },
    ];

    const handlePress = (item) => {
        if (item.isSpecial) {
            if (onScanPress) onScanPress();
        } else {
            navigation.navigate(item.route);
        }
    };

    return (
        <View style={[styles.container, { paddingBottom: bottomPadding }]}>
            <View style={styles.barContent}>
                {navItems.map((item, index) => {
                    if (item.isSpecial) {
                        return (
                            <View key="scan-btn" style={styles.specialItemContainer}>
                                <TouchableOpacity
                                    style={styles.scanButton}
                                    onPress={() => handlePress(item)}
                                >
                                    <View style={styles.scanButtonInner}>
                                        <Ionicons name="qr-code" size={28} color="#FFFFFF" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    }

                    const isActive = currentRoute === item.route;
                    return (
                        <TouchableOpacity
                            key={item.route}
                            style={styles.navItem}
                            onPress={() => handlePress(item)}
                        >
                            <Ionicons
                                name={isActive ? item.icon : item.iconOutline}
                                size={26}
                                color={isActive ? '#0A66C2' : '#6B7280'}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 20,
    },
    barContent: {
        flexDirection: 'row',
        height: 65,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    specialItemContainer: {
        width: 70,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    scanButton: {
        bottom: 25,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        padding: 5,
        shadowColor: '#0A66C2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    scanButtonInner: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
        backgroundColor: '#0A66C2',
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default BottomBar;
