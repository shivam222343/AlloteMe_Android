import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Linking, Platform, Dimensions, Image
} from 'react-native';
import * as Location from 'expo-location';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { MapPin, Navigation, Maximize2, X, Route, Star, Clock } from 'lucide-react-native';
import { institutionAPI } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NearbyCollegesScreen = ({ navigation }) => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [colleges, setColleges] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [WebViewComp, setWebViewComp] = useState(null);
    const webViewRef = useRef(null);

    useEffect(() => {
        if (Platform.OS !== 'web') {
            try {
                const WV = require('react-native-webview').WebView;
                setWebViewComp(() => WV);
            } catch (e) {
                console.log("Native WebView not loaded");
            }
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Location permission denied');
                    setLoading(false);
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
                fetchNearbyColleges(loc.coords);
            } catch (err) {
                setLoading(false);
            }
        })();
    }, []);

    const fetchNearbyColleges = async (coords) => {
        try {
            const res = await institutionAPI.getAll();
            const allColleges = res.data.filter(c => c.location?.coordinates?.lat && c.location?.coordinates?.lng);
            const processed = allColleges.map(c => ({
                ...c,
                distanceKm: calculateDistance(coords.latitude, coords.longitude, c.location.coordinates.lat, c.location.coordinates.lng)
            })).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 15);
            setColleges(processed);
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const formatDuration = (mins) => {
        if (!mins) return '';
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const getMapHTML = () => {
        if (!location) return '';
        const collegeMarkers = colleges.map(c => ({ lat: c.location.coordinates.lat, lng: c.location.coordinates.lng, name: c.name, id: c._id }));

        // Use single quotes for inner string to avoid backtick nesting issues
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    body { margin: 0; padding: 0; } #map { height: 100vh; width: 100vw; }
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
                    var map = L.map('map').setView([${location.latitude}, ${location.longitude}], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    L.marker([${location.latitude}, ${location.longitude}], { icon: L.divIcon({ className:'u-mark', iconSize:[16,16]}) }).addTo(map);
                    
                    var markers = ${JSON.stringify(collegeMarkers)};
                    function safeSend(msg) {
                        try {
                            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
                            else window.parent.postMessage({ nativeEvent: { data: msg } }, "*");
                        } catch(e){}
                    }
                    markers.forEach(function(m) {
                        var icon = L.divIcon({ 
                            className: 'c-icon', 
                            html: '<div class="inst-m">🎓 ' + m.name.substring(0,8) + '...</div>', 
                            iconSize: [80, 24], 
                            iconAnchor: [40, 24] 
                        });
                        L.marker([m.lat, m.lng], { icon: icon }).addTo(map).bindPopup(
                            '<div style="text-align:center">' +
                            '<b>' + m.name + '</b>' +
                            '<div class="btns">' +
                            '<div class="btn btn-i" onclick="safeSend(JSON.stringify({type:\\'NAV\\', id:\\'' + m.id + '\\'}))">INFO</div>' +
                            '<div class="btn btn-r" onclick="safeSend(JSON.stringify({type:\\'ROUTE\\', id:\\'' + m.id + '\\'}))">ROUTE</div>' +
                            '</div>' +
                            '</div>'
                        );
                    });

                    var rLayer = null;
                    window.addEventListener('message', function(e) {
                        try {
                            var d = JSON.parse(e.data);
                            if(d.type === 'DRAW') {
                                if(rLayer) map.removeLayer(rLayer);
                                rLayer = L.polyline(d.pts, {color:'#2563eb', weight:6, opacity:0.8}).addTo(map);
                                map.fitBounds(rLayer.getBounds(), {padding:[40,40]});
                            }
                        } catch(err){}
                    });
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
            if (data.routes && data.routes[0]) {
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

    if (loading) return <MainLayout title="Nearby"><View style={styles.center}><ActivityIndicator color={Colors.primary} /></View></MainLayout>;

    return (
        <MainLayout title="Nearby Colleges" hideBack={isFullscreen}>
            <View style={styles.container}>
                <View style={[styles.mapContainer, isFullscreen && styles.fullscreenMap]}>
                    {Platform.OS === 'web' ? (
                        <iframe ref={webViewRef} srcDoc={getMapHTML()} style={{ border: 'none', width: '100%', height: '100%' }} />
                    ) : (
                        WebViewComp && <WebViewComp ref={webViewRef} source={{ html: getMapHTML() }} style={{ flex: 1 }} onMessage={onMessage} />
                    )}
                    <TouchableOpacity style={styles.fullscreenBtn} onPress={() => setIsFullscreen(!isFullscreen)}>
                        {isFullscreen ? <X size={24} color="white" /> : <Maximize2 size={24} color="white" />}
                    </TouchableOpacity>
                </View>
                {!isFullscreen && (
                    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                        <View style={styles.headerRow}>
                            <MapPin size={22} color={Colors.primary} />
                            <Text style={styles.listTitle}>Top Rated Institutes Near You</Text>
                        </View>
                        {colleges.map((item) => (
                            <TouchableOpacity key={item._id} style={styles.collegeCard} onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}>
                                <View style={styles.cardTop}>
                                    <View style={styles.collegeImageContainer}>
                                        <Image source={{ uri: item.galleryImages?.[0] || 'https://images.unsplash.com/photo-1541339907198-e08756eaa589?q=80&w=200' }} style={styles.collegeImage} />
                                    </View>
                                    <View style={styles.collegeMain}>
                                        <Text style={styles.collegeTitle} numberOfLines={2}>{item.name}</Text>
                                        <Text style={styles.subtitle} numberOfLines={1}>{item.university}</Text>
                                        <View style={styles.blueBadge}><Text style={styles.blueBadgeText}>{item.type?.toUpperCase()}</Text></View>
                                    </View>
                                </View>
                                <View style={styles.cardBottom}>
                                    <View style={styles.locRow}><MapPin size={14} color="#94a3b8" /><Text style={styles.locText}>{item.location.city}, Maharashtra</Text></View>
                                    <TouchableOpacity style={styles.distBadge} onPress={(e) => { e.stopPropagation(); handleRoute(item); }}>
                                        <Navigation size={12} color={Colors.primary} />
                                        <Text style={styles.distVal}>{item.realDist || item.distanceKm.toFixed(1)}km</Text>
                                        {item.duration && <Text style={styles.durationText}> • {formatDuration(item.duration)}</Text>}
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.divider} />
                            </TouchableOpacity>
                        ))}
                        <View style={{ height: 40 }} />
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
    fullscreenBtn: { position: 'absolute', bottom: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 10 },
    listContainer: { flex: 1, padding: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    collegeCard: { marginBottom: 12 },
    cardTop: { flexDirection: 'row', gap: 16 },
    collegeImageContainer: { width: 70, height: 70, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9' },
    collegeImage: { width: '100%', height: '100%' },
    collegeMain: { flex: 1 },
    collegeTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
    subtitle: { fontSize: 12, color: '#64748b', marginBottom: 6 },
    blueBadge: { alignSelf: 'flex-start', backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bae6fd' },
    blueBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#0369a1' },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    locText: { fontSize: 13, color: '#475569' },
    distBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    distVal: { fontSize: 13, fontWeight: 'bold', color: Colors.primary },
    durationText: { fontSize: 12, color: '#64748b' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginTop: 16 }
});

export default NearbyCollegesScreen;
