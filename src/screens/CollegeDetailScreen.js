import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity,
    Alert, Image, Dimensions, Platform, ActivityIndicator, TextInput
} from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import {
    Globe, MapPin, Info, Award, ShieldCheck, ExternalLink, BookOpen,
    Wifi, Utensils, Library, FlaskConical, Dumbbell, Home, Car, Trees,
    CheckCircle2, LayoutGrid, Image as ImageIcon, BedDouble, GitBranch,
    ChevronRight, Trash2, Edit, Maximize2, X as CloseIcon, Star
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, institutionAPI, cutoffAPI, reviewAPI } from '../services/api';
import { Colors, Shadows } from '../constants/theme';
import OptimizedImage from '../components/ui/OptimizedImage';
import { Modal } from 'react-native';

const { width, height: screenHeight } = Dimensions.get('window');

const TABS = ['Overview', 'Branches', 'Map', 'Hostel', 'Facilities', 'Gallery'];

// Leaflet HTML builder
const buildLeafletHTML = (lat, lng, name) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:sans-serif; background:#f0f4f8; }
#map { width:100vw; height:calc(100vh - 52px); }
.view-toggle { position:absolute; top:0; left:0; right:0; z-index:1000; display:flex; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.12); height:52px; align-items:stretch; }
.vbtn { flex:1; border:none; background:#fff; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; transition:all 0.2s; border-bottom:3px solid transparent; }
.vbtn.active { color:#2563eb; border-bottom-color:#2563eb; background:#eff6ff; }
</style>
</head>
<body>
<div class="view-toggle">
  <button class="vbtn active" id="btn-street" onclick="setLayer('street')">Street</button>
  <button class="vbtn" id="btn-satellite" onclick="setLayer('satellite')">Satellite</button>
  <button class="vbtn" id="btn-terrain" onclick="setLayer('terrain')">Terrain</button>
</div>
<div id="map"></div>
<script>
var map = L.map('map').setView([${lat}, ${lng}], 16);
var layers = {
  street: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution:'&copy; CARTO', maxZoom:19 }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'Tiles &copy; Esri', maxZoom:19 }),
  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution:'&copy; OpenTopoMap', maxZoom:17 })
};
var currentLayer = layers.street.addTo(map);
L.marker([${lat}, ${lng}]).addTo(map).bindPopup('<b>${name.replace(/'/g, "\\'")}</b>',{maxWidth:200}).openPopup();
function setLayer(type){
  map.removeLayer(currentLayer);
  currentLayer = layers[type].addTo(map);
  ['street','satellite','terrain'].forEach(t=>document.getElementById('btn-'+t).classList.remove('active'));
  document.getElementById('btn-'+type).classList.add('active');
}
</script>
</body>
</html>`;

const FACILITY_ICONS = { 'WiFi': Wifi, 'Canteen': Utensils, 'Library': Library, 'Labs': FlaskConical, 'Sports': Dumbbell, 'Hostel': Home, 'Parking': Car, 'Garden': Trees };

const CollegeDetailScreen = ({ route, navigation }) => {
    const { id } = route.params;
    const { user, socket, refreshUser, toggleSaveOptimistic } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [inst, setInst] = useState(null);
    const [cutoffs, setCutoffs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview');
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ avgRating: 0, count: 0 });
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [myReview, setMyReview] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    const TABS = ['Overview', 'Branches', 'Map', 'Hostel', 'Facilities', 'Gallery', 'Reviews'];
    const [showFullMap, setShowFullMap] = useState(false);

    useEffect(() => {
        setLoading(true);
        setInst(null);
        fetchData();

        if (socket) {
            const handleInstUpdate = (data) => {
                const updatedId = data?._id || data;
                if (updatedId === id) {
                    console.log('[Socket] Institution info updated, refreshing...');
                    fetchData();
                }
            };

            const handleCutoffUpdate = (data) => {
                if (data?.institutionId === id) {
                    console.log('[Socket] Cutoffs updated, refreshing...');
                    fetchData();
                }
            };

            socket.on('institution:updated', handleInstUpdate);
            socket.on('cutoff:updated', handleCutoffUpdate);

            return () => {
                socket.off('institution:updated', handleInstUpdate);
                socket.off('cutoff:updated', handleCutoffUpdate);
            };
        }
    }, [id, socket]);

    const fetchData = async () => {
        try {
            const [instRes, cutoffRes, reviewRes] = await Promise.all([
                institutionAPI.getById(id),
                cutoffAPI.getByInstitution(id),
                reviewAPI.getForInstitution(id)
            ]);
            setInst(instRes.data);
            setCutoffs(cutoffRes.data);
            if (reviewRes.data?.success) {
                setReviews(reviewRes.data.data);
                setReviewStats(reviewRes.data.stats || { avgRating: 0, count: 0 });
            }
        } catch (error) {
            console.error('FetchData Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!myReview.comment.trim()) {
            Alert.alert('Incomplete', 'Please write a message about the college.');
            return;
        }
        try {
            setSubmittingReview(true);
            await reviewAPI.submit({
                ...myReview,
                institutionId: id
            });
            setMyReview({ rating: 5, comment: '' });

            // Refresh reviews
            const res = await reviewAPI.getForInstitution(id);
            if (res.data?.success) {
                setReviews(res.data.data);
                setReviewStats(res.data.stats || { avgRating: 0, count: 0 });
            }

            Alert.alert('Success', 'Your review has been posted! ✨');
        } catch (error) {
            Alert.alert('Error', 'Unable to post review.');
        } finally {
            setSubmittingReview(false);
            setShowReviewModal(false);
        }
    };

    const handleToggleSave = async () => {
        await toggleSaveOptimistic(id);
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Institution",
            "This will permanently remove this institution and ALL its cutoff data. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await institutionAPI.delete(id);
                            Alert.alert("Success", "Institution deleted.");
                            navigation.navigate('Dashboard');
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete.");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading || !inst) {
        return (
            <MainLayout title="College Details">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </MainLayout>
        );
    }

    const hasCoords = inst.location?.coordinates?.lat && inst.location?.coordinates?.lng;

    // ─── Tab Content Renderers (no nested ScrollView) ───────────────

    const renderOverview = () => (
        <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.desc}>{inst.description || 'No description provided.'}</Text>

            <View style={styles.infoGrid}>
                <View style={styles.infoBox}><Text style={styles.infoLabel}>University</Text><Text style={styles.infoVal} numberOfLines={2}>{inst.university || '—'}</Text></View>
                <View style={styles.infoBox}><Text style={styles.infoLabel}>Fees / Year</Text><Text style={styles.infoVal}>₹{inst.feesPerYear?.toLocaleString() || '—'}</Text></View>
            </View>
            <View style={styles.infoGrid}>
                {inst.established ? <View style={styles.infoBox}><Text style={styles.infoLabel}>Established</Text><Text style={styles.infoVal}>{inst.established}</Text></View> : null}
                {inst.totalStudents ? <View style={styles.infoBox}><Text style={styles.infoLabel}>Students</Text><Text style={styles.infoVal}>{inst.totalStudents?.toLocaleString()}</Text></View> : null}
                {inst.campusArea ? <View style={styles.infoBox}><Text style={styles.infoLabel}>Campus Area</Text><Text style={styles.infoVal}>{inst.campusArea}</Text></View> : null}
                {inst.accreditation ? <View style={styles.infoBox}><Text style={styles.infoLabel}>Accreditation</Text><Text style={styles.infoVal}>{inst.accreditation}</Text></View> : null}
            </View>
            <View style={{ height: 40 }} />
        </View>
    );

    const renderBranches = () => {
        const branches = inst.branches || [];
        return (
            <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>{(inst.category || 'MHTCET')} Branches & Cutoffs</Text>
                {branches.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Info size={40} color={Colors.text.tertiary} />
                        <Text style={styles.emptyText}>No branches listed for this institution.</Text>
                    </View>
                ) : (
                    branches.map((b, i) => (
                        <View key={i} style={styles.branchRowContainer}>
                            <TouchableOpacity
                                style={styles.branchRow}
                                onPress={() => navigation.navigate('BranchCutoffDetail', {
                                    institutionId: inst._id,
                                    branchName: b.name,
                                    institutionName: inst.name
                                })}
                            >
                                <View style={styles.branchIndex}><Text style={styles.branchIndexText}>{i + 1}</Text></View>
                                <View style={styles.branchInfo}>
                                    <Text style={styles.branchRowName}>{b.name}</Text>
                                    {b.code ? <Text style={styles.branchCode}>{b.code}</Text> : null}
                                </View>
                                <View style={styles.viewCutoffBadge}>
                                    <Text style={styles.viewCutoffText}>View Cutoffs</Text>
                                    <ChevronRight size={14} color={Colors.primary} />
                                </View>
                            </TouchableOpacity>
                            {isAdmin && (
                                <TouchableOpacity
                                    style={styles.deleteBranchBtn}
                                    onPress={() => {
                                        Alert.alert("Delete Branch", `Are you sure you want to remove ${b.name}? This will permanently delete the branch AND all associated cutoff data for this institution.`, [
                                            { text: "Cancel" },
                                            {
                                                text: "Delete",
                                                style: "destructive",
                                                onPress: async () => {
                                                    try {
                                                        const res = await institutionAPI.deleteBranch(inst._id, b.name);
                                                        setInst({ ...inst, branches: res.data.branches });
                                                        Alert.alert("Success", "Branch and its cutoffs removed.");
                                                    } catch (e) {
                                                        Alert.alert("Error", "Failed to delete branch");
                                                    }
                                                }
                                            }
                                        ])
                                    }}
                                >
                                    <Trash2 size={16} color={Colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )}
                <View style={{ height: 40 }} />
            </View>
        );
    };

    const renderMap = () => {
        if (!hasCoords) {
            return (
                <View style={[styles.tabContent, styles.emptyCard]}>
                    <MapPin size={48} color={Colors.text.tertiary} />
                    <Text style={styles.emptyText}>No map coordinates provided for this institution.</Text>
                </View>
            );
        }
        const lat = inst.location.coordinates.lat;
        const lng = inst.location.coordinates.lng;
        const html = buildLeafletHTML(lat, lng, inst.name);

        if (Platform.OS === 'web') {
            return (
                <View style={{ width, height: 420 }}>
                    <iframe title="map" srcDoc={html} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin" />
                </View>
            );
        }

        try {
            const { WebView } = require('react-native-webview');
            return (
                <View style={{ width, height: 420 }}>
                    <WebView source={{ html }} style={{ flex: 1 }} javaScriptEnabled originWhitelist={['*']} scrollEnabled={false} />

                    <View style={styles.mapActions}>
                        <TouchableOpacity style={styles.miniMapBtn} onPress={() => setShowFullMap(true)}>
                            <Maximize2 size={16} color={Colors.primary} />
                        </TouchableOpacity>

                        {inst.mapUrl && (
                            <TouchableOpacity style={styles.openMapsBtnSmall} onPress={() => Linking.openURL(inst.mapUrl)}>
                                <MapPin size={16} color={Colors.white} />
                                <Text style={styles.openMapsBtnTextSmall}>Open in Maps</Text>
                                <ExternalLink size={12} color={Colors.white} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Full Screen Map Modal */}
                    <Modal visible={showFullMap} animationType="fade" transparent={false} onRequestClose={() => setShowFullMap(false)}>
                        <View style={{ flex: 1, backgroundColor: '#000' }}>
                            <View style={styles.fullMapHeader}>
                                <Text style={styles.fullMapTitle}>Campus Location</Text>
                                <TouchableOpacity onPress={() => setShowFullMap(false)} style={styles.closeFullMap}>
                                    <CloseIcon size={24} color={Colors.white} />
                                </TouchableOpacity>
                            </View>
                            <WebView
                                source={{ html }}
                                style={{ flex: 1 }}
                                javaScriptEnabled
                                originWhitelist={['*']}
                                containerStyle={{ backgroundColor: '#f0f4f8' }}
                            />
                        </View>
                    </Modal>
                </View>
            );
        } catch {
            return (
                <View style={[styles.tabContent, styles.emptyCard]}>
                    <MapPin size={32} color={Colors.primary} />
                    <Text style={styles.emptyText}>Coords: {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
                    {inst.mapUrl && (
                        <TouchableOpacity style={styles.openMapsFallbackBtn} onPress={() => Linking.openURL(inst.mapUrl)}>
                            <Text style={styles.openMapsFallbackText}>Open in Google Maps</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }
    };

    const renderHostel = () => {
        const hostel = inst.hostel;
        if (!hostel?.available) {
            return (
                <View style={[styles.tabContent, styles.emptyCard]}>
                    <BedDouble size={48} color={Colors.text.tertiary} />
                    <Text style={styles.emptyText}>Hostel information not available.</Text>
                </View>
            );
        }
        return (
            <View style={styles.tabContent}>
                <View style={styles.hostelRow}>
                    <View style={[styles.hostelCard, { borderLeftColor: '#3B82F6' }]}>
                        <Text style={styles.hostelCardTitle}>Boys Hostel</Text>
                        <View style={styles.hostelStat}><Text style={styles.hostelStatLabel}>Fees/Year</Text><Text style={styles.hostelStatVal}>₹{hostel.boys?.fees?.toLocaleString() || '—'}</Text></View>
                        <View style={styles.hostelStat}><Text style={styles.hostelStatLabel}>Capacity</Text><Text style={styles.hostelStatVal}>{hostel.boys?.capacity || '—'}</Text></View>
                    </View>
                    <View style={[styles.hostelCard, { borderLeftColor: '#EC4899' }]}>
                        <Text style={styles.hostelCardTitle}>Girls Hostel</Text>
                        <View style={styles.hostelStat}><Text style={styles.hostelStatLabel}>Fees/Year</Text><Text style={styles.hostelStatVal}>₹{hostel.girls?.fees?.toLocaleString() || '—'}</Text></View>
                        <View style={styles.hostelStat}><Text style={styles.hostelStatLabel}>Capacity</Text><Text style={styles.hostelStatVal}>{hostel.girls?.capacity || '—'}</Text></View>
                    </View>
                </View>
                {hostel.notes ? <View style={styles.hostelNotes}><Text style={styles.sectionTitle}>Notes</Text><Text style={styles.desc}>{hostel.notes}</Text></View> : null}
                <View style={{ height: 40 }} />
            </View>
        );
    };

    const renderFacilities = () => {
        const facs = inst.facilities;
        if (!facs || facs.length === 0) {
            return (
                <View style={[styles.tabContent, styles.emptyCard]}>
                    <LayoutGrid size={48} color={Colors.text.tertiary} />
                    <Text style={styles.emptyText}>No facilities information available.</Text>
                </View>
            );
        }
        return (
            <View style={styles.tabContent}>
                <View style={styles.facilitiesGrid}>
                    {facs.map((fac, i) => {
                        const IconComp = FACILITY_ICONS[fac] || CheckCircle2;
                        return (
                            <View key={i} style={styles.facItem}>
                                <View style={styles.facIconBox}><IconComp size={22} color={Colors.primary} /></View>
                                <Text style={styles.facLabel}>{fac}</Text>
                            </View>
                        );
                    })}
                </View>
                <View style={{ height: 40 }} />
            </View>
        );
    };

    const renderGallery = () => {
        const images = inst.galleryImages || [];
        if (images.length === 0) {
            return (
                <View style={[styles.tabContent, styles.emptyCard]}>
                    <ImageIcon size={48} color={Colors.text.tertiary} />
                    <Text style={styles.emptyText}>No gallery images uploaded yet.</Text>
                </View>
            );
        }
        return (
            <View style={styles.tabContent}>
                <View style={styles.galleryGrid}>
                    {images.map((img, i) => (
                        <OptimizedImage
                            key={i}
                            source={{ uri: img }}
                            style={styles.galleryImg}
                        />
                    ))}
                </View>
                <View style={{ height: 40 }} />
            </View>
        );
    };

    const renderReviews = () => {
        return (
            <View style={styles.tabContent}>
                <View style={styles.reviewSummary}>
                    <View style={styles.avgBox}>
                        <Text style={styles.avgText}>{reviewStats.avgRating ? Number(reviewStats.avgRating).toFixed(1) : '0.0'}</Text>
                        <View style={styles.starsBox}>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} color={s <= Math.round(reviewStats.avgRating || 0) ? '#F59E0B' : '#CBD5E1'} fill={s <= Math.round(reviewStats.avgRating || 0) ? '#F59E0B' : 'transparent'} />)}
                            </View>
                            <Text style={styles.reviewCount}>{reviewStats.count || 0} reviews</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewModal(true)}>
                        <Edit size={16} color="white" />
                        <Text style={styles.writeReviewText}>Write a Review</Text>
                    </TouchableOpacity>
                </View>

                {/* Review Submission Modal */}
                <Modal visible={showReviewModal} animationType="slide" transparent={true} onRequestClose={() => setShowReviewModal(false)}>
                    <View style={styles.modalOverlayAlt}>
                        <View style={styles.reviewModalContent}>
                            <View style={styles.modalHeaderAlt}>
                                <Text style={styles.modalTitleAlt}>Post Regular Review</Text>
                                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                                    <CloseIcon size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ padding: 20 }}>
                                <Text style={styles.modalSubLabel}>Your Rating</Text>
                                <View style={styles.starsSelector}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <TouchableOpacity key={s} onPress={() => setMyReview(prev => ({ ...prev, rating: s }))}>
                                            <Star size={32} color={s <= myReview.rating ? '#F59E0B' : '#E2E8F0'} fill={s <= myReview.rating ? '#F59E0B' : 'transparent'} />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.modalSubLabel}>Share your experience</Text>
                                <TextInput
                                    style={styles.reviewInputModal}
                                    placeholder="Tell others about the campus life, faculty, or placements..."
                                    multiline
                                    value={myReview.comment}
                                    onChangeText={(t) => setMyReview(prev => ({ ...prev, comment: t }))}
                                />

                                <TouchableOpacity
                                    style={[styles.submitBtnAlt, submittingReview && styles.disabledBtn]}
                                    onPress={handleSubmitReview}
                                    disabled={submittingReview}
                                >
                                    {submittingReview ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.submitBtnTextAlt}>Post Review</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                <View style={[styles.reviewsList, { marginTop: 20 }]}>
                    {loadingReviews ? (
                        <ActivityIndicator color={Colors.primary} />
                    ) : reviews.length === 0 ? (
                        <View style={styles.emptyReviews}>
                            <Star size={32} color={Colors.divider} />
                            <Text style={styles.emptyText}>Be the first to review!</Text>
                        </View>
                    ) : (
                        reviews.map((r, i) => (
                            <View key={i} style={styles.reviewItem}>
                                <View style={styles.reviewHeader}>
                                    <Image
                                        source={{ uri: r.userAvatar || `https://ui-avatars.com/api/?name=${r.userName || 'U'}&background=random` }}
                                        style={styles.reviewerAvatar}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.reviewerName}>{r.userName || 'Anonymous'}</Text>
                                        <View style={styles.starsRow}>
                                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} color={s <= r.rating ? '#F59E0B' : '#CBD5E1'} fill={s <= r.rating ? '#F59E0B' : 'transparent'} />)}
                                        </View>
                                    </View>
                                    <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <Text style={styles.reviewComment}>{r.comment}</Text>
                            </View>
                        ))
                    )}
                </View>
                <View style={{ height: 40 }} />
            </View>
        );
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'Overview': return renderOverview();
            case 'Branches': return renderBranches();
            case 'Map': return renderMap();
            case 'Hostel': return renderHostel();
            case 'Facilities': return renderFacilities();
            case 'Gallery': return renderGallery();
            case 'Reviews': return renderReviews();
            default: return renderOverview();
        }
    };

    const isSaved = user?.savedColleges?.some(c => (c._id === id || c === id));

    return (
        <MainLayout noPadding>
            {/*
              The entire page is one ScrollView.
              stickyHeaderIndices={[2]} keeps the tab bar pinned while everything else scrolls.
              Index 0 = carousel, 1 = identity section, 2 = tab bar, 3 = tab content
            */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[2]}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                {/* 0 – Image Carousel */}
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
                    {inst.galleryImages && inst.galleryImages.length > 0 ? (
                        inst.galleryImages.map((img, i) => (
                            <OptimizedImage
                                key={i}
                                source={{ uri: img }}
                                style={styles.bannerImg}
                            />
                        ))
                    ) : (
                        <Image source={require('../assets/images/college_default.jpg')} style={styles.bannerImg} />
                    )}
                </ScrollView>

                {/* 1 – Identity Section */}
                <View style={styles.identitySection}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.badgeRow}>
                                <View style={styles.premiumTag}>
                                    <ShieldCheck size={13} color={Colors.primary} />
                                    <Text style={styles.premiumTagText}>{inst.type}</Text>
                                </View>
                                {inst.rating?.value && (
                                    <View style={styles.nirfBadge}>
                                        <Award size={13} color="#B8860B" />
                                        <Text style={styles.nirfText}>{inst.rating.value} {inst.rating.platform}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.name}>{inst.name}</Text>
                        </View>

                        {user?.role === 'student' && (
                            <TouchableOpacity
                                style={[styles.saveFab, isSaved && styles.saveFabActive]}
                                onPress={handleToggleSave}
                                activeOpacity={0.7}
                            >
                                <Star
                                    size={24}
                                    color={isSaved ? Colors.white : Colors.text.tertiary}
                                    fill={isSaved ? Colors.white : 'transparent'}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isAdmin && (
                        <View style={styles.adminBar}>
                            <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('EditInstitution', { id })}>
                                <Edit size={16} color={Colors.primary} />
                                <Text style={styles.adminBtnText}>Edit College</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.adminBtn, styles.deleteBtnSmall]} onPress={handleDelete}>
                                <Trash2 size={16} color={Colors.error} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.uniRow}>
                        <BookOpen size={13} color={Colors.text.tertiary} />
                        <Text style={styles.uniText}>{inst.university}</Text>
                        {inst.dteCode && (
                            <View style={styles.dteBadge}>
                                <Text style={styles.dteBadgeText}>DTE: {inst.dteCode}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => {
                            if (!inst.website) return;
                            const url = inst.website.startsWith('http') ? inst.website : `https://${inst.website}`;
                            Linking.openURL(url).catch(() => Alert.alert('Error', 'Invalid website URL'));
                        }}>
                            <Globe size={16} color={Colors.primary} />
                            <Text style={styles.actionText}>Website</Text>
                            <ExternalLink size={10} color={Colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => {
                            if (hasCoords) setActiveTab('Map');
                            else if (inst.mapUrl) Linking.openURL(inst.mapUrl);
                        }}>
                            <MapPin size={16} color={Colors.primary} />
                            <Text style={styles.actionText}>Location</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2 – Tab Bar (STICKY) */}
                <View style={styles.tabBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
                        {TABS.map(tab => {
                            const isActive = activeTab === tab;
                            return (
                                <TouchableOpacity key={tab} style={[styles.tabItem, isActive && styles.activeTabItem]} onPress={() => setActiveTab(tab)}>
                                    <Text style={[styles.tabItemText, isActive && styles.activeTabText]}>{tab}</Text>
                                    {isActive && <View style={styles.activeLine} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 3 – Tab Content (inline, no nested ScrollView) */}
                {renderTab()}
            </ScrollView>

            {/* Floating Action Button for Reviews */}
            {activeTab === 'Reviews' && (
                <TouchableOpacity
                    style={styles.reviewFab}
                    onPress={() => setShowReviewModal(true)}
                    activeOpacity={0.8}
                >
                    <Edit size={24} color="white" />
                    <Text style={styles.reviewFabText}>Write Review</Text>
                </TouchableOpacity>
            )}
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    contentContainer: { paddingBottom: 100 },

    carousel: { height: 260, maxHeight: 260 },
    bannerImg: { width, height: 260, resizeMode: 'cover' },

    identitySection: { padding: 20, paddingBottom: 16, backgroundColor: Colors.white },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 15 },
    saveFab: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.xs },
    saveFabActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    premiumTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary + '12', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary + '25' },
    premiumTagText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary, textTransform: 'uppercase' },
    nirfBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF8E1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#FFD54F' },
    nirfText: { fontSize: 10, fontWeight: 'bold', color: '#B8860B' },
    name: { fontSize: 22, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 5 },
    uniRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    uniText: { fontSize: 13, color: Colors.text.tertiary, fontWeight: '500', flex: 1 },
    dteBadge: { backgroundColor: Colors.primary + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: Colors.primary + '20' },
    dteBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: 'bold' },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, borderWidth: 1, borderColor: '#E2E8F0' },
    actionText: { fontSize: 13, fontWeight: 'bold', color: Colors.primary },

    tabBar: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    tabBarInner: { paddingHorizontal: 8 },
    tabItem: { paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    activeTabItem: {},
    tabItemText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    activeTabText: { color: Colors.primary, fontWeight: 'bold' },
    activeLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: Colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },

    tabContent: { padding: 20, backgroundColor: Colors.white },

    sectionTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 12, marginTop: 4, color: Colors.text.primary },
    desc: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22, marginBottom: 4 },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, marginBottom: 4 },
    infoBox: { flex: 1, minWidth: '40%', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    infoLabel: { fontSize: 10, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
    infoVal: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', textAlign: 'center' },

    // Cutoffs
    cutoffCard: { marginBottom: 14, padding: 16, borderRadius: 18, backgroundColor: Colors.white, ...Shadows.xs, borderWidth: 1, borderColor: '#E2E8F0' },
    cutoffHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 10 },
    branchName: { fontWeight: 'bold', fontSize: 15, color: Colors.text.primary, flex: 1 },
    roundTag: { fontSize: 11, color: Colors.primary, fontWeight: 'bold', backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    cutoffGrid: { gap: 10 },
    cutoffRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catName: { fontSize: 13, color: Colors.text.secondary },
    catPercent: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },

    // Branches
    branchRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingVertical: 4
    },
    branchRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    branchIndex: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: Colors.primary + '12',
        justifyContent: 'center',
        alignItems: 'center'
    },
    branchIndexText: { fontSize: 12, fontWeight: 'bold', color: Colors.primary },
    branchInfo: {
        flex: 1,
        marginRight: 8 // Space before the badge
    },
    branchRowName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 2
    },
    branchCode: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '500' },

    // Map
    mapActions: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 10, alignItems: 'center' },
    miniMapBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.md },
    openMapsBtnSmall: { flex: 1, backgroundColor: Colors.primary, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...Shadows.md },
    openMapsBtnTextSmall: { color: Colors.white, fontWeight: 'bold', fontSize: 13 },
    openMapsFallbackBtn: { marginTop: 16, backgroundColor: Colors.primary + '10', padding: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
    openMapsFallbackText: { color: Colors.primary, fontWeight: 'bold' },

    // Full Map Modal
    fullMapHeader: { height: 60, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    fullMapTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
    closeFullMap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

    // Hostel
    hostelRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    hostelCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 4 },
    hostelCardTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 14 },
    hostelStat: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    hostelStatLabel: { fontSize: 12, color: Colors.text.tertiary },
    hostelStatVal: { fontSize: 13, fontWeight: 'bold', color: Colors.text.primary },
    hostelNotes: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    viewCutoffBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    viewCutoffText: { fontSize: 11, fontWeight: 'bold', color: Colors.primary },

    // Facilities
    facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    facItem: { width: '30%', alignItems: 'center', gap: 8 },
    facIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: Colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
    facLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, textAlign: 'center' },

    // Gallery
    galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    galleryImg: { width: (width - 52) / 2, height: 160, borderRadius: 14, backgroundColor: '#E2E8F0' },

    deleteBranchBtn: { padding: 10, backgroundColor: Colors.error + '10', borderRadius: 10, borderWidth: 1, borderColor: Colors.error + '20' },

    // Shared empty
    emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 14 },
    emptyText: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },

    adminBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 15 },
    adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '10', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary + '20' },
    adminBtnText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },
    deleteBtnSmall: { backgroundColor: Colors.error + '10', borderColor: Colors.error + '25' },

    // Review Styles
    reviewSummary: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, marginBottom: 20 },
    avgBox: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avgText: { fontSize: 32, fontWeight: 'bold', color: Colors.text.primary },
    starsBox: { flex: 1 },
    starsRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    reviewCount: { fontSize: 12, color: Colors.text.tertiary, marginTop: 4 },
    submitSection: { backgroundColor: 'white', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
    starsSelector: { flexDirection: 'row', gap: 10, marginBottom: 15, justifyContent: 'center' },
    reviewInput: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, height: 80, textAlignVertical: 'top', fontSize: 14, color: Colors.text.primary, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
    submitBtn: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    disabledBtn: { opacity: 0.6 },
    reviewItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    reviewerAvatar: { width: 32, height: 32, borderRadius: 16 },
    reviewerName: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
    reviewDate: { fontSize: 11, color: Colors.text.tertiary },
    reviewComment: { fontSize: 13, color: Colors.text.secondary, lineHeight: 18 },
    emptyReviews: { alignItems: 'center', paddingVertical: 40, gap: 10 },

    writeReviewBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, marginTop: 15 },
    writeReviewText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    modalOverlayAlt: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    reviewModalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '60%' },
    modalHeaderAlt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitleAlt: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
    modalSubLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 10, marginTop: 5 },
    reviewInputModal: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, height: 120, textAlignVertical: 'top', fontSize: 15, color: Colors.text.primary, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    submitBtnAlt: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
    submitBtnTextAlt: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    reviewFab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        ...Shadows.md,
        zIndex: 100
    },
    reviewFabText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});

export default CollegeDetailScreen;
