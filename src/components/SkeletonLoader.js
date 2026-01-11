import React from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width } = Dimensions.get('window');

export const SkeletonBox = ({ width: w, height: h, style, borderRadius = 8 }) => {
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width],
    });

    return (
        <View style={[styles.skeleton, { width: w, height: h, borderRadius, overflow: 'hidden' }, style]}>
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        transform: [{ translateX }],
                    }
                ]}
            >
                <View style={styles.shimmerGradient} />
            </Animated.View>
        </View>
    );
};

export const SkeletonCard = ({ children, style }) => (
    <View style={[styles.card, style]}>
        {children}
    </View>
);

// Generic List Item
export const SkeletonListItem = ({ showAvatar = true, lines = 2 }) => (
    <View style={styles.listItem}>
        {showAvatar && <SkeletonBox width={48} height={48} borderRadius={12} style={{ marginRight: 16 }} />}
        <View style={{ flex: 1 }}>
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonBox
                    key={i}
                    width={i === 0 ? '80%' : '60%'}
                    height={i === 0 ? 16 : 12}
                    style={{ marginBottom: i < lines - 1 ? 6 : 0 }}
                />
            ))}
        </View>
    </View>
);

// Meeting Card Skeleton
export const SkeletonMeetingCard = () => (
    <SkeletonCard>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <SkeletonBox width={48} height={48} borderRadius={12} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
                <SkeletonBox width="80%" height={18} style={{ marginBottom: 6 }} />
                <SkeletonBox width="60%" height={14} />
            </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <SkeletonBox width={80} height={12} />
            <SkeletonBox width={80} height={12} />
        </View>
        <SkeletonBox width="100%" height={36} borderRadius={8} />
    </SkeletonCard>
);

// Member Card Skeleton (List Style)
export const SkeletonMemberCard = () => (
    <View style={styles.memberCardList}>
        <SkeletonBox width={54} height={54} borderRadius={27} />
        <View style={{ flex: 1, marginLeft: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <SkeletonBox width="45%" height={16} />
                <SkeletonBox width="25%" height={12} />
            </View>
            <SkeletonBox width="75%" height={14} />
        </View>
        <SkeletonBox width={16} height={16} borderRadius={8} style={{ marginLeft: 8 }} />
    </View>
);

// Chat Message Skeleton
export const SkeletonChatMessage = ({ isMine = false }) => (
    <View style={[styles.chatMessage, isMine && styles.chatMessageMine]}>
        {!isMine && <SkeletonBox width={32} height={32} borderRadius={16} style={{ marginRight: 8 }} />}
        <View style={{ flex: 1, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
            <SkeletonBox width="70%" height={40} borderRadius={12} />
        </View>
    </View>
);

// Task Card Skeleton
export const SkeletonTaskCard = () => (
    <SkeletonCard>
        <SkeletonBox width={60} height={20} borderRadius={6} style={{ marginBottom: 12 }} />
        <SkeletonBox width="90%" height={18} style={{ marginBottom: 8 }} />
        <SkeletonBox width="70%" height={14} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
            <SkeletonBox width={80} height={12} />
            <SkeletonBox width={80} height={12} />
        </View>
        <SkeletonBox width="100%" height={40} borderRadius={8} />
    </SkeletonCard>
);

// Gallery Grid Skeleton
export const SkeletonGalleryGrid = ({ items = 6 }) => {
    const leftItems = [];
    const rightItems = [];
    const heights = [180, 220, 200, 240, 190, 210];

    // Split items into two columns
    for (let i = 0; i < items; i++) {
        const item = (
            <SkeletonBox
                key={i}
                width={(width - 60) / 2} // Precise math for perfect fit with gaps
                height={heights[i % heights.length]}
                borderRadius={16}
                style={{ marginBottom: 12 }}
            />
        );
        if (i % 2 === 0) {
            leftItems.push(item);
        } else {
            rightItems.push(item);
        }
    }

    return (
        <View style={styles.masonry}>
            <View style={[styles.masonryColumn, { marginRight: 6 }]}>
                {leftItems}
            </View>
            <View style={[styles.masonryColumn, { marginLeft: 6 }]}>
                {rightItems}
            </View>
        </View>
    );
};

// Analytics Stat Card Skeleton
export const SkeletonStatCard = ({ borderColor = '#0A66C2' }) => (
    <View style={[styles.statCardSkeleton, { borderLeftColor: borderColor, borderLeftWidth: 4 }]}>
        <SkeletonBox width={80} height={12} style={{ marginBottom: 8 }} />
        <SkeletonBox width={40} height={28} />
    </View>
);

// Admin Table Row Skeleton
export const SkeletonTableRow = ({ columns = 4 }) => (
    <View style={styles.tableRow}>
        {Array.from({ length: columns }).map((_, i) => (
            <SkeletonBox
                key={i}
                width={`${100 / columns - 2}%`}
                height={14}
                style={{ marginRight: i < columns - 1 ? 8 : 0 }}
            />
        ))}
    </View>
);

// Filter Chips Skeleton
export const SkeletonFilterChips = ({ count = 3 }) => (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonBox key={i} width={80} height={32} borderRadius={20} />
        ))}
    </View>
);

// Stats Grid Skeleton
export const SkeletonStatsGrid = ({ items = 4 }) => (
    <View style={styles.statsGrid}>
        {Array.from({ length: items }).map((_, i) => (
            <View key={i} style={styles.statGridItem}>
                <SkeletonBox width={36} height={36} borderRadius={10} style={{ marginBottom: 12 }} />
                <SkeletonBox width="70%" height={20} style={{ marginBottom: 4 }} />
                <SkeletonBox width="50%" height={14} />
            </View>
        ))}
    </View>
);

// Notification Item Skeleton
export const SkeletonNotification = () => (
    <View style={styles.notificationItem}>
        <SkeletonBox width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
            <SkeletonBox width="90%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonBox width="70%" height={12} style={{ marginBottom: 4 }} />
            <SkeletonBox width={60} height={10} />
        </View>
    </View>
);

// Snaps List Skeleton
export const SkeletonSnaps = ({ count = 4 }) => (
    <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 }}>
        {Array.from({ length: count }).map((_, i) => (
            <View key={i} style={{ alignItems: 'center', marginRight: 15 }}>
                <SkeletonBox width={60} height={60} borderRadius={30} />
                <SkeletonBox width={40} height={10} style={{ marginTop: 8 }} />
            </View>
        ))}
    </View>
);

// Group Chat Card Skeleton
export const SkeletonGroupChat = () => (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <SkeletonBox width="100%" height={100} borderRadius={16} />
    </View>
);

// Banner Item Skeleton
export const SkeletonBannerItem = ({ fullWidth = false }) => (
    <View style={{ width: fullWidth ? '100%' : '48%', height: 80, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
        <SkeletonBox width="100%" height="100%" borderRadius={12} />
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E2E8F0',
    },
    shimmerGradient: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    card: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    memberCardList: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    chatMessage: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    chatMessageMine: {
        justifyContent: 'flex-end',
    },
    masonry: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    masonryColumn: {
        flex: 1,
        marginHorizontal: 4,
    },
    masonryItem: {
        marginBottom: 0,
    },
    statCardSkeleton: {
        flex: 1,
        borderRadius: 12,
        padding: 15,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statGridItem: {
        width: (width - 64) / 2,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
});
