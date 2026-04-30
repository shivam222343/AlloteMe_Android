import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import { videoAPI } from '../services/api';
import { Colors, Shadows, BorderRadius } from '../constants/theme';
import { Youtube, Plus, Trash2, ExternalLink, PlayCircle } from 'lucide-react-native';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const EXAM_OPTIONS = ['MHTCET PCM', 'MHTCET PCB', 'BBA', 'NEET', 'JEE', 'Engineering', 'Pharmacy'];

const AdminVideosScreen = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [formData, setFormData] = useState({ youtubeUrl: '', tags: [] });

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        try {
            const res = await videoAPI.getAll();
            setVideos(res.data.data);
        } catch (error) {
            console.error('Fetch videos error:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTag = (tag) => {
        setFormData(prev => {
            const tags = [...prev.tags];
            const idx = tags.indexOf(tag);
            if (idx > -1) tags.splice(idx, 1);
            else tags.push(tag);
            return { ...prev, tags };
        });
    };

    const handleAdd = async () => {
        if (!formData.youtubeUrl) {
            Alert.alert('Error', 'Please provide a YouTube link');
            return;
        }
        setAdding(true);
        try {
            await videoAPI.add(formData);
            setFormData({ youtubeUrl: '', tags: [] });
            fetchVideos();
            Alert.alert('Success', 'Video added and info fetched!');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to add video');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Video',
            'Are you sure you want to remove this video?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await videoAPI.delete(id);
                            fetchVideos();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete video');
                        }
                    }
                }
            ]
        );
    };

    return (
        <MainLayout title="Manage Videos">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <Card style={styles.addCard}>
                    <Text style={styles.cardTitle}>Add New Video</Text>
                    <Text style={styles.cardDesc}>Just paste the YouTube link. We'll fetch the title and details for you.</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YouTube Link (https://youtu.be/...)"
                        value={formData.youtubeUrl}
                        onChangeText={(t) => setFormData({ ...formData, youtubeUrl: t })}
                    />

                    <Text style={styles.label}>Select Exam Categories (Multiple):</Text>
                    <View style={styles.tagSelector}>
                        {EXAM_OPTIONS.map(tag => (
                            <TouchableOpacity 
                                key={tag} 
                                style={[styles.tagPill, formData.tags.includes(tag) && styles.tagPillActive]}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={[styles.tagPillText, formData.tags.includes(tag) && styles.tagPillTextActive]}>
                                    {tag}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Button
                        title="Add & Fetch Info"
                        onPress={handleAdd}
                        loading={adding}
                        icon={<Plus size={20} color={Colors.white} />}
                    />
                </Card>

                <Text style={styles.sectionTitle}>All Videos ({videos.length})</Text>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : videos.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Youtube size={48} color={Colors.text.tertiary} />
                        <Text style={styles.emptyText}>No videos added yet</Text>
                    </View>
                ) : (
                    videos.map((video) => (
                        <Card key={video._id} style={styles.videoCard}>
                            <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                            <View style={styles.videoInfo}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                                    <View style={styles.videoMetaContainer}>
                                        <Text style={styles.videoMeta}>{video.views} • {video.uploadDate}</Text>
                                        <View style={styles.itemTags}>
                                            {video.tags?.map(t => (
                                                <View key={t} style={styles.smallTag}><Text style={styles.smallTagText}>{t}</Text></View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    style={styles.deleteBtn}
                                    onPress={() => handleDelete(video._id)}
                                >
                                    <Trash2 size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    addCard: { padding: 16, marginBottom: 24 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 8 },
    cardDesc: { fontSize: 13, color: Colors.text.tertiary, marginBottom: 16 },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        fontSize: 14,
        color: Colors.text.primary
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 16 },
    videoCard: { marginBottom: 16, overflow: 'hidden', padding: 0 },
    thumbnail: { width: '100%', height: 180, backgroundColor: '#eee' },
    videoInfo: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    videoTitle: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, marginBottom: 4 },
    videoMetaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    videoMeta: { fontSize: 12, color: Colors.text.tertiary },
    itemTags: { flexDirection: 'row', gap: 4 },
    smallTag: { backgroundColor: Colors.primary + '10', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    smallTagText: { fontSize: 10, color: Colors.primary, fontWeight: 'bold' },
    actions: { flexDirection: 'row', gap: 12 },
    deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: '#FEE2E2' },
    emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
    emptyText: { marginTop: 12, fontSize: 16, color: Colors.text.tertiary, fontWeight: '600' },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary, marginBottom: 10, marginTop: 8 },
    tagSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    tagPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    tagPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tagPillText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '500' },
    tagPillTextActive: { color: Colors.white, fontWeight: 'bold' },
});

export default AdminVideosScreen;
