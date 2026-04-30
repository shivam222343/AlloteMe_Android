import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Modal as RNModal, Platform } from 'react-native';
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

    const renderVideo = ({ item }) => (
        <TouchableOpacity 
            style={styles.videoCard} 
            activeOpacity={0.9}
            onPress={() => setSelectedVideo(item)}
        >
            <View style={styles.thumbnailContainer}>
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                <View style={styles.playOverlay}>
                    <PlayCircle size={40} color={Colors.white} />
                </View>
            </View>
            <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.videoMeta}>
                    <Text style={styles.videoMetaText}>{item.views} • {item.uploadDate}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

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
                    data={videos}
                    renderItem={renderVideo}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    list: { padding: 16 },
    videoCard: { 
        backgroundColor: Colors.white, 
        borderRadius: 20, 
        marginBottom: 20,
        overflow: 'hidden',
        ...Shadows.sm,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    thumbnailContainer: { width: '100%', height: 200, backgroundColor: '#eee' },
    thumbnail: { width: '100%', height: '100%' },
    playOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    videoInfo: { padding: 16 },
    videoTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 6 },
    videoMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    videoMetaText: { fontSize: 12, color: Colors.text.tertiary },
    
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
