import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Modal as RNModal, Platform, useWindowDimensions } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { videoAPI } from '../services/api';
import { Colors, Shadows, BorderRadius } from '../constants/theme';
import { PlayCircle, Youtube, X } from 'lucide-react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import Card from '../components/ui/Card';

import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const EXAM_OPTIONS = ['MHTCET PCM', 'MHTCET PCB', 'BBA', 'NEET', 'JEE', 'Engineering', 'Pharmacy'];

const VideosScreen = () => {
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && windowWidth > 768;
    const { user, admissionPath, setAdmissionPath } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        fetchVideos();
    }, [user?.examType, user?.role, admissionPath]);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            let res;
            if (isAdmin) {
                res = await videoAPI.getAll();
            } else {
                const targetTag = admissionPath || user?.examType;
                if (!targetTag) {
                    setVideos([]);
                    setLoading(false);
                    return;
                }
                res = await videoAPI.getAll({ tag: targetTag });
            }
            setVideos(res.data.data);
        } catch (error) {
            console.error('Fetch videos error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderVideo = ({ item }) => {
        const channelName = "AlloteMe Guidance";
        const channelInitial = "A";
        
        return (
            <TouchableOpacity 
                style={[
                    styles.videoCard, 
                    isDesktop && { 
                        flex: 1, 
                        minWidth: 250, 
                        maxWidth: isDesktop ? (Math.min(windowWidth, 1200) - 48 - 40) / 3 : '100%', 
                        marginBottom: 0 
                    }
                ]} 
                activeOpacity={0.9}
                onPress={() => setSelectedVideo(item)}
            >
                <View style={styles.thumbnailContainer}>
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                    <View style={styles.playOverlay}>
                        <PlayCircle size={40} color={Colors.white} fill="rgba(0, 0, 0, 0.4)" />
                    </View>
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>12:45</Text>
                    </View>
                </View>
                
                <View style={styles.videoDetailsContainer}>
                    <View style={styles.channelAvatar}>
                        <Text style={styles.avatarText}>{channelInitial}</Text>
                    </View>
                    <View style={styles.videoTextDetails}>
                        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.channelName}>{channelName}</Text>
                        <Text style={styles.videoMetaText}>
                            {item.views || '150K'} views • {item.uploadDate || 'recently'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <MainLayout title="Videos">
            <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                    {EXAM_OPTIONS.map(tag => (
                        <TouchableOpacity 
                            key={tag} 
                            style={[styles.catPill, (admissionPath === tag || (!admissionPath && user?.examType === tag)) && styles.catPillActive]}
                            onPress={() => setAdmissionPath(tag)}
                        >
                            <Text style={[styles.catPillText, (admissionPath === tag || (!admissionPath && user?.examType === tag)) && styles.catPillTextActive]}>
                                {tag}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

        <RNModal
            visible={!!selectedVideo}
            transparent={true}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setSelectedVideo(null)}
        >
            <View style={styles.fullScreenOverlay}>
                <TouchableOpacity 
                    style={styles.fullScreenClose} 
                    onPress={() => setSelectedVideo(null)}
                >
                    <X size={28} color={Colors.white} />
                </TouchableOpacity>
                
                <View style={styles.fullScreenPlayer}>
                    {selectedVideo && (
                        Platform.OS === 'web' ? (
                            <iframe
                                width="100%"
                                height={width * (9/16)}
                                src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <YoutubePlayer
                                height={width * (9/16)}
                                width={width}
                                play={true}
                                videoId={selectedVideo.videoId}
                            />
                        )
                    )}
                </View>
            </View>
        </RNModal>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : videos.length === 0 ? (
                <View style={styles.emptyState}>
                    <Youtube size={48} color={Colors.text.tertiary} />
                    <Text style={styles.emptyText}>
                        {!user?.examType 
                            ? "Please select an exam type in your profile to see relevant guidance videos." 
                            : "No videos available for your selected category yet."}
                    </Text>
                </View>
            ) : (
                <FlatList
                    key={isDesktop ? 'desktop-videos-grid' : 'mobile-videos-list'}
                    numColumns={isDesktop ? 3 : 1}
                    data={videos}
                    renderItem={renderVideo}
                    keyExtractor={item => item._id}
                    contentContainerStyle={[styles.list, isDesktop && { maxWidth: 1200, width: '100%', alignSelf: 'center', padding: 24, rowGap: 24 }]}
                    columnWrapperStyle={isDesktop ? { gap: 20 } : null}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    list: { padding: 16 },
    videoCard: { 
        backgroundColor: 'transparent', 
        marginBottom: 24,
        overflow: 'hidden',
    },
    thumbnailContainer: { 
        width: '100%', 
        aspectRatio: 16/9, 
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative'
    },
    thumbnail: { width: '100%', height: '100%' },
    playOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    durationBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    durationText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600'
    },
    videoDetailsContainer: {
        flexDirection: 'row',
        marginTop: 12,
        paddingHorizontal: 4
    },
    channelAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
    },
    videoTextDetails: {
        flex: 1
    },
    videoTitle: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: Colors.text.primary, 
        lineHeight: 18 
    },
    channelName: {
        fontSize: 12,
        color: Colors.text.tertiary,
        marginTop: 4,
        fontWeight: '500'
    },
    videoMetaText: { 
        fontSize: 12, 
        color: Colors.text.tertiary, 
        marginTop: 2 
    },
    
    fullScreenOverlay: { 
        flex: 1, 
        backgroundColor: '#000', 
        justifyContent: 'center',
        alignItems: 'center'
    },
    fullScreenClose: { 
        position: 'absolute', 
        top: 50, 
        right: 20, 
        zIndex: 100,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25
    },
    fullScreenPlayer: { 
        width: '100%',
        aspectRatio: 16/9,
        justifyContent: 'center'
    },
    
    categoryContainer: {
        backgroundColor: Colors.white,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    categoryList: {
        paddingHorizontal: 16,
        gap: 8
    },
    catPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    catPillActive: {
        backgroundColor: Colors.primary + '15',
        borderColor: Colors.primary
    },
    catPillText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.secondary
    },
    catPillTextActive: {
        color: Colors.primary,
        fontWeight: 'bold'
    },
    
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, opacity: 0.5 },
    emptyText: { marginTop: 12, fontSize: 16, color: Colors.text.tertiary, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40 }
});

export default VideosScreen;
