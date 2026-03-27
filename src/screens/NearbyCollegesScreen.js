import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Linking, Platform, Dimensions, Image, TextInput, BackHandler
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Navigation, Maximize2, X, Route, Star, Clock, RefreshCcw, Map as MapIcon, ChevronRight, SlidersHorizontal, AlertCircle, Info } from 'lucide-react-native';
import { institutionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CITY_COORDS = {
    'Pune': { latitude: 18.5204, longitude: 73.8567 },
    'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
    'Nagpur': { latitude: 21.1458, longitude: 79.0882 },
    'Nashik': { latitude: 19.9975, longitude: 73.7898 },
    'Aurangabad': { latitude: 19.8762, longitude: 75.3433 }
};

const NearbyCollegesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [colleges, setColleges] = useState([]);
    const [maxDistance, setMaxDistance] = useState(500);
    const [showRadius, setShowRadius] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualLat, setManualLat] = useState('18.5204');
    const [manualLng, setManualLng] = useState('73.8567');
    const [WebViewComp, setWebViewComp] = useState(null);
    const webViewRef = useRef(null);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;
            const onBackPress = () => {
                if (isFullscreen) { setIsFullscreen(false); return true; }
                return false;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [isFullscreen])
    );

    useEffect(() => {
        if (Platform.OS !== 'web') {
            try {
                const { WebView } = require('react-native-webview');
                setWebViewComp(() => WebView);
            } catch (e) { }
        }
    }, []);

    const fetchCurrentLocation = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { handleLocationFallback('Permission denied'); return; }
            const freshLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeout: 8000 });
            if (freshLoc) {
                setLocation(freshLoc.coords);
                await fetchNearbyColleges(freshLoc.coords);
            }
        } catch (err) { handleLocationFallback('GPS failed.'); }
    };

    const handleLocationFallback = (error) => {
        if (user?.location && CITY_COORDS[user.location]) {
            const coords = CITY_COORDS[user.location];
            setLocation(coords);
            fetchNearbyColleges(coords);
            setErrorMsg(`Using ${user.location} coordinates (GPS failed)`);
        } else { setErrorMsg(error || 'Location unavailable'); }
        setLoading(false);
    };

    useEffect(() => {
        if (!location) {
            if (user?.location && CITY_COORDS[user.location]) {
                const coords = CITY_COORDS[user.location];
                setLocation(coords);
                fetchNearbyColleges(coords);
            } else { fetchCurrentLocation(); }
        }
    }, []);

    const fetchNearbyColleges = async (coords) => {
        try {
            const res = await institutionAPI.getAll();
            if (!res.data || res.data.length === 0) { setColleges([]); setLoading(false); return; }
            const allColleges = res.data.filter(c => c.location?.coordinates?.lat && c.location?.coordinates?.lng);

            // Initial Haversine sort
            let processed = allColleges.map(c => ({
                ...c,
                distanceKm: calculateDistance(coords.latitude, coords.longitude, c.location.coordinates.lat, c.location.coordinates.lng)
            })).sort((a, b) => a.distanceKm - b.distanceKm);

            setColleges(processed.slice(0, 20));
            setLoading(false);

            // Fetch EXACT Road Distances for top 10 using OSRM Table API
            fetchExactRoadDistances(coords, processed.slice(0, 10));
        } catch (error) { setLoading(false); }
    };

    const fetchExactRoadDistances = async (userCoords, topColleges) => {
        try {
            const coordsString = `${userCoords.longitude},${userCoords.latitude};` +
                topColleges.map(c => `${c.location.coordinates.lng},${c.location.coordinates.lat}`).join(';');

            const url = `https://router.project-osrm.org/table/v1/driving/${coordsString}?sources=0&annotations=distance,duration`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.distances?.[0]) {
                const distances = data.distances[0];
                const durations = data.durations[0];

                setColleges(prevColleges => {
                    return prevColleges.map(c => {
                        const index = topColleges.findIndex(tc => tc._id === c._id);
                        if (index !== -1 && distances[index + 1] !== null) {
                            return {
                                ...c,
                                realDist: (distances[index + 1] / 1000).toFixed(1),
                                duration: Math.round(durations[index + 1] / 60)
                            };
                        }
                        return c;
                    }).sort((a, b) => (parseFloat(a.realDist || a.distanceKm) - parseFloat(b.realDist || b.distanceKm)));
                });
            }
        } catch (e) { console.log("OSRM Table error", e); }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const handleManualSet = () => {
        const lat = parseFloat(manualLat); const lng = parseFloat(manualLng);
        if (isNaN(lat) || isNaN(lng)) { Alert.alert("Error", "Enter numeric coordinates."); return; }
        const coords = { latitude: lat, longitude: lng };
        setLocation(coords); setManualMode(false); fetchNearbyColleges(coords);
    };

    const formatDuration = (mins) => {
        if (!mins) return '';
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const getMapHTML = () => {
        if (!location) return '';
        const collegeMarkers = colleges.map(c => ({ lat: c.location.coordinates.lat, lng: c.location.coordinates.lng, name: c.name, id: c._id }));
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    body { margin: 0; padding: 0; } #map { height: 100vh; width: 100vw; background: #f1f5f9; }
                    .u-mark { background:#2563eb; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3); }
                    .inst-m { background:#fff; border:2px solid #2563eb; border-radius:8px; padding:2px 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space:nowrap; font-weight:bold; font-size:10px; display:flex; gap:4px; align-items:center; }
                    .btns { display:flex; gap:8px; margin-top:8px; }
                    .btn { flex:1; padding:6px; border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer; text-align:center; border:1px solid; }
                    .btn-i { background:#f0f9ff; color:#0369a1; border-color:#bae6fd; }
                    .btn-r { background:#2563eb; color:white; border-color:#2563eb; }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <script>
                    var map = L.map('map').setView([${location.latitude}, ${location.longitude}], 12);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    L.marker([${location.latitude}, ${location.longitude}], { icon: L.divIcon({ className:'u-mark', iconSize:[16,16]}) }).addTo(map);
                    var markers = ${JSON.stringify(collegeMarkers)};
                    function safeSend(msg) { try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg); else window.parent.postMessage({ nativeEvent: { data: msg } }, "*"); } catch(e){} }
                    markers.forEach(function(m) {
                        var icon = L.divIcon({ className:'c-icon', html:'<div class="inst-m">🎓 '+m.name.substring(0,8)+'...</div>', iconSize:[80,24], iconAnchor:[40,24] });
                        L.marker([m.lat, m.lng], { icon: icon }).addTo(map).bindPopup(
                            '<div style="text-align:center"><b>'+m.name+'</b><div class="btns">' +
                            '<div class="btn btn-i" onclick="safeSend(JSON.stringify({type:\\'NAV\\', id:\\''+m.id+'\\'}))">INFO</div>' +
                            '<div class="btn btn-r" onclick="safeSend(JSON.stringify({type:\\'ROUTE\\', id:\\''+m.id+'\\'}))">ROUTE</div>' +
                            '</div></div>'
                        );
                    });
                    var rLayer = null;
                    function handleMsg(e) { try { var d = JSON.parse(e.data); if(d.type === 'DRAW') {
                        if(rLayer) map.removeLayer(rLayer);
                        rLayer = L.polyline(d.pts, {color:'#2563eb', weight:6, opacity:0.8}).addTo(map);
                        map.fitBounds(rLayer.getBounds(), {padding:[40,40]});
                    }} catch(err){} }
                    window.addEventListener('message', handleMsg);
                    document.addEventListener('message', handleMsg);
                </script>
            </body>
            </html>
        `;
    };

    const handleRoute = async (college) => {
        try {
            const url = "https://router.project-osrm.org/route/v1/driving/" + location.longitude + "," + location.latitude + ";" + college.location.coordinates.lng + "," + college.location.coordinates.lat + "?overview=full&geometries=geojson";
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes?.[0]) {
                const rt = data.routes[0];
                const pts = rt.geometry.coordinates.map(c => [c[1], c[0]]);
                const msg = JSON.stringify({ type: 'DRAW', pts });
                if (Platform.OS === 'web') webViewRef.current?.contentWindow.postMessage(msg, "*");
                else webViewRef.current?.postMessage(msg);
                setColleges(colleges.map(c => c._id === college._id ? { ...c, realDist: (rt.distance / 1000).toFixed(1), duration: Math.round(rt.duration / 60) } : c));
            }
        } catch (e) { }
    };

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent?.data || event.data);
            if (data.type === 'NAV') navigation.navigate('CollegeDetail', { id: data.id });
            else if (data.type === 'ROUTE') {
                const college = colleges.find(c => c._id === data.id);
                if (college) handleRoute(college);
            }
        } catch (e) { }
    };

    useEffect(() => {
        if (Platform.OS === 'web') {
            const listener = (e) => onMessage(e);
            window.addEventListener('message', listener);
            return () => window.removeEventListener('message', listener);
        }
    }, [colleges]);

    if (loading) return <MainLayout title="Nearby Colleges"><View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View></MainLayout>;

    if (errorMsg && !location) {
        return (
            <MainLayout title="Location Settings">
                <View style={styles.errorContainer}>
                    <RefreshCcw size={50} color="#94a3b8" style={{ marginBottom: 20 }} />
                    <Text style={styles.errorSub}>{errorMsg}</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={fetchCurrentLocation}><Text style={styles.primaryBtnText}>Retry GPS Fetch</Text></TouchableOpacity>
                    <Text style={styles.orText}>- OR -</Text>
                    <View style={styles.manualForm}>
                        <View style={styles.inputRow}>
                            <View style={styles.inputWrap}><Text style={styles.label}>Lat</Text><TextInput style={styles.input} value={manualLat} onChangeText={setManualLat} keyboardType="numeric" /></View>
                            <View style={styles.inputWrap}><Text style={styles.label}>Lng</Text><TextInput style={styles.input} value={manualLng} onChangeText={setManualLng} keyboardType="numeric" /></View>
                        </View>
                        <TouchableOpacity style={styles.setBtn} onPress={handleManualSet}><Text style={styles.setBtnText}>Use Coordinates</Text></TouchableOpacity>
                    </View>
                </View>
            </MainLayout>
        );
    }

    const filteredColleges = colleges.filter(c => parseFloat(c.realDist || c.distanceKm) <= maxDistance);

    return (
        <MainLayout title="Nearby" hideBack={isFullscreen} hideHeader={isFullscreen}>
            <View style={styles.container}>
                {isFullscreen && (
                    <TouchableOpacity style={styles.fsCloseBtn} onPress={() => setIsFullscreen(false)}>
                        <X size={28} color="white" />
                    </TouchableOpacity>
                )}

                <View style={[styles.mapContainer, isFullscreen && styles.fullscreenMap]}>
                    {Platform.OS === 'web' ? (
                        <iframe ref={webViewRef} srcDoc={getMapHTML()} style={{ border: 'none', width: '100%', height: '100%' }} />
                    ) : (
                        WebViewComp && <WebViewComp ref={webViewRef} source={{ html: getMapHTML() }} style={{ flex: 1 }} onMessage={onMessage} originWhitelist={['*']} javaScriptEnabled={true} />
                    )}

                    {!isFullscreen && (
                        <View style={styles.mapActions}>
                            <TouchableOpacity style={styles.mapActionBtn} onPress={fetchCurrentLocation}>
                                <RefreshCcw size={20} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.mapActionBtn} onPress={() => setIsFullscreen(true)}>
                                <Maximize2 size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {!isFullscreen && (
                    <ScrollView style={styles.listArea} showsVerticalScrollIndicator={false}>
                        {showRadius ? (
                            <View style={styles.rangeBox}>
                                <View style={styles.rangeLabels}>
                                    <View style={styles.headerRow}>
                                        <SlidersHorizontal size={18} color={Colors.primary} />
                                        <Text style={styles.rangeTitle}>Radius Filter</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowRadius(false)}><X size={18} color="#94a3b8" /></TouchableOpacity>
                                </View>
                                <View style={styles.sliderRow}>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={50} maximumValue={5000} step={50}
                                        value={maxDistance} onValueChange={setMaxDistance}
                                        minimumTrackTintColor={Colors.primary} thumbTintColor={Colors.primary}
                                    />
                                    <View style={styles.rangeTag}><Text style={styles.rangeTagText}>{maxDistance}km</Text></View>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.showRadiusBtn} onPress={() => setShowRadius(true)}>
                                <SlidersHorizontal size={16} color={Colors.primary} />
                                <Text style={styles.showRadiusText}>Show Filter</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.listHeader}>
                            <MapPin size={22} color={Colors.primary} />
                            <Text style={styles.listTitle}>Institutes Near You</Text>
                        </View>

                        {filteredColleges.length === 0 ? (
                            <View style={styles.emptyState}><Text style={styles.emptyText}>No results within {maxDistance}km.</Text></View>
                        ) : (
                            filteredColleges.map((item) => (
                                <TouchableOpacity key={item._id} style={styles.collegeCard} onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}>
                                    <View style={styles.cardTop}>
                                        <Image source={{ uri: item.galleryImages?.[0] || 'https://images.unsplash.com/photo-1541339907198-e08756eaa589?q=80&w=200' }} style={styles.collegeImage} />
                                        <View style={styles.collegeMain}>
                                            <Text style={styles.collegeTitle}>{item.name}</Text>
                                            <Text style={styles.subtitle}>{item.university}</Text>
                                            <View style={styles.blueBadge}><Text style={styles.blueBadgeText}>{item.type?.toUpperCase()}</Text></View>
                                        </View>
                                    </View>
                                    <View style={styles.cardBottom}>
                                        <View style={styles.locRow}><MapPin size={14} color="#94a3b8" /><Text style={styles.locText}>{item.location.city}</Text></View>
                                        <TouchableOpacity style={styles.distBadge} onPress={(e) => { e.stopPropagation(); handleRoute(item); }}>
                                            <Navigation size={12} color={Colors.primary} />
                                            <Text style={styles.distVal}>{item.realDist ? `${item.realDist}km Road` : `${item.distanceKm.toFixed(1)}km Approx.`}</Text>
                                            {item.duration && <Text style={styles.durationText}> • {formatDuration(item.duration)}</Text>}
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.divider} />
                                </TouchableOpacity>
                            ))
                        )}

                        <View style={styles.disclaimerBox}>
                            <AlertCircle size={14} color="#64748b" />
                            <Text style={styles.disclaimerText}>Note: Distances shown are approximate and may vary depending on road conditions & traffic.</Text>
                        </View>
                        <View style={{ height: 60 }} />
                    </ScrollView>
                )}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mapContainer: { height: 260, position: 'relative' },
    fullscreenMap: { height: SCREEN_HEIGHT, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
    fsCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 50 },
    mapActions: { position: 'absolute', bottom: 15, right: 15, gap: 10 },
    mapActionBtn: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 12 },
    listArea: { flex: 1, padding: 16 },
    rangeBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    rangeTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    slider: { flex: 1, height: 40 },
    rangeTag: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    rangeTagText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    showRadiusBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#f1f5f9', borderRadius: 12, marginBottom: 20, alignSelf: 'flex-start' },
    showRadiusText: { color: Colors.primary, fontWeight: 'bold', fontSize: 13 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    collegeCard: { marginBottom: 12 },
    cardTop: { flexDirection: 'row', gap: 16 },
    collegeImage: { width: 70, height: 70, borderRadius: 12 },
    collegeMain: { flex: 1 },
    collegeTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    subtitle: { fontSize: 12, color: '#64748b', marginBottom: 6 },
    blueBadge: { alignSelf: 'flex-start', backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bae6fd' },
    blueBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#0369a1' },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 41 },
    locText: { fontSize: 13, color: '#475569' },
    distBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    distVal: { fontSize: 13, fontWeight: 'bold', color: Colors.primary },
    durationText: { fontSize: 12, color: '#64748b' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginTop: 16 },
    disclaimerBox: { flexDirection: 'row', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, gap: 10, marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    disclaimerText: { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 18 },
    errorContainer: { padding: 30, alignItems: 'center', flex: 1, justifyContent: 'center' },
    errorSub: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 30 },
    primaryBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
    primaryBtnText: { color: 'white', fontWeight: 'bold' },
    orText: { marginVertical: 20, color: '#94a3b8', fontWeight: 'bold' },
    manualForm: { width: '100%', backgroundColor: '#f8fafc', padding: 15, borderRadius: 16 },
    inputRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    inputWrap: { flex: 1 }, label: { fontSize: 12, color: '#64748b', marginBottom: 4 },
    input: { backgroundColor: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    setBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center' },
    setBtnText: { color: 'white', fontWeight: 'bold' },
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#64748b' }
});

export default NearbyCollegesScreen;
