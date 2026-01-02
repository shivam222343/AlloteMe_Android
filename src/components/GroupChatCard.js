import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const GroupChatCard = ({ club, unreadCount, lastMessage, onPress }) => {
    const time = lastMessage
        ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            {(club.logo && (club.logo.url || typeof club.logo === 'string')) ? (
                <Image
                    source={{ uri: club.logo.url || club.logo }}
                    style={styles.iconContainer}
                />
            ) : (
                <LinearGradient
                    colors={['#0A66C2', '#0E76A8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconContainer}
                >
                    <Ionicons name="people" size={24} color="#FFFFFF" />
                </LinearGradient>
            )}

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>
                        {club.name}
                    </Text>
                    {time && <Text style={styles.time}>{time}</Text>}
                </View>
                <View style={styles.footer}>
                    <Text style={styles.lastMsg} numberOfLines={1}>
                        {lastMessage
                            ? lastMessage.deleted
                                ? 'Message deleted'
                                : lastMessage.content || 'Sent an attachment'
                            : 'No messages yet'}
                    </Text>
                    {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    time: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 8,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMsg: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
    },
    unreadBadge: {
        backgroundColor: '#0A66C2',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
        minWidth: 20,
        alignItems: 'center',
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default GroupChatCard;
