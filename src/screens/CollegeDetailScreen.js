import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity,
    Alert, Image, Dimensions, Platform
} from 'react-native';
import MainLayout from '../components/layouts/MainLayout';
import Card from '../components/ui/Card';
import { institutionAPI, cutoffAPI } from '../services/api';
import { Colors, Shadows } from '../constants/theme';
import {
    Globe, MapPin, Info, Award, ShieldCheck, ExternalLink, BookOpen,
    Wifi, Utensils, Library, FlaskConical, Dumbbell, Home, Car, Trees,
    CheckCircle2, LayoutGrid, Image as ImageIcon, BedDouble, GitBranch,
    ChevronRight
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const TABS = ['Overview', 'Branches', 'Map', 'Hostel', 'Facilities', 'Gallery'];

// Leaflet HTML builder
const buildLeafletHTML = (lat, lng, name) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'&copy; OpenStreetMap', maxZoom:19 }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'Tiles &copy; Esri', maxZoom:19 }),
  terrain: L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', { attribution:'Stamen Terrain', maxZoom:14 })
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
    const [inst, setInst] = useState(null);
    const [cutoffs, setCutoffs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview');

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        try {
            const [instRes, cutoffRes] = await Promise.all([
                institutionAPI.getById(id),
                cutoffAPI.getByInstitution(id)
            ]);
            setInst(instRes.data);
            setCutoffs(cutoffRes.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    if (loading || !inst) return null;

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
                <Text style={styles.sectionTitle}>Engineering Branches & Cutoffs</Text>
                {branches.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Info size={40} color={Colors.text.tertiary} />
                        <Text style={styles.emptyText}>No branches listed for this institution.</Text>
                    </View>
                ) : (
                    branches.map((b, i) => (
                        <TouchableOpacity
                            key={i}
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
                    {inst.mapUrl && (
                        <TouchableOpacity style={styles.openMapsBtn} onPress={() => Linking.openURL(inst.mapUrl)}>
                            <MapPin size={16} color={Colors.white} />
                            <Text style={styles.openMapsBtnText}>Open in Maps</Text>
                            <ExternalLink size={14} color={Colors.white} />
                        </TouchableOpacity>
                    )}
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
                    {images.map((img, i) => <Image key={i} source={{ uri: img }} style={styles.galleryImg} />)}
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
            default: return renderOverview();
        }
    };

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
                        inst.galleryImages.map((img, i) => <Image key={i} source={{ uri: img }} style={styles.bannerImg} />)
                    ) : (
                        <Image source={require('../assets/images/college_default.jpg')} style={styles.bannerImg} />
                    )}
                </ScrollView>

                {/* 1 – Identity Section */}
                <View style={styles.identitySection}>
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
                    <View style={styles.uniRow}>
                        <BookOpen size={13} color={Colors.text.tertiary} />
                        <Text style={styles.uniText}>{inst.university}</Text>
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
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    contentContainer: { paddingBottom: 100 },

    carousel: { height: 260, maxHeight: 260 },
    bannerImg: { width, height: 260, resizeMode: 'cover' },

    identitySection: { padding: 20, paddingBottom: 16, backgroundColor: Colors.white },
    badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    premiumTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary + '12', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary + '25' },
    premiumTagText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary, textTransform: 'uppercase' },
    nirfBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF8E1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#FFD54F' },
    nirfText: { fontSize: 10, fontWeight: 'bold', color: '#B8860B' },
    name: { fontSize: 22, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 5 },
    uniRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    uniText: { fontSize: 13, color: Colors.text.tertiary, fontWeight: '500', flex: 1 },
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
    branchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    branchIndex: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
    branchIndexText: { fontSize: 13, fontWeight: 'bold', color: Colors.primary },
    branchInfo: { flex: 1 },
    branchRowName: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, marginBottom: 2 },
    branchCode: { fontSize: 12, color: Colors.text.tertiary, fontWeight: '500' },

    // Map
    openMapsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, margin: 16, borderRadius: 16, padding: 14 },
    openMapsBtnText: { color: Colors.white, fontSize: 15, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    openMapsFallbackBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 12 },
    openMapsFallbackText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },

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

    // Shared empty
    emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 14 },
    emptyText: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 },
});

export default CollegeDetailScreen;
