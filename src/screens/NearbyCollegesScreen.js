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
import OptimizedImage from '../components/ui/OptimizedImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CITY_COORDS = {
    'Pune': { latitude: 18.5204, longitude: 73.8567 },
    'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
    'Nagpur': { latitude: 21.1458, longitude: 79.0882 },
    'Nashik': { latitude: 19.9975, longitude: 73.7898 },
    'Aurangabad': { latitude: 19.8762, longitude: 75.3433 },
    'Chhatrapati Sambhajinagar': { latitude: 19.8762, longitude: 75.3433 },
    'Kolhapur': { latitude: 16.7050, longitude: 74.2433 },
    'Sangli': { latitude: 16.8524, longitude: 74.5815 },
    'Solapur': { latitude: 17.6599, longitude: 75.9064 },
    'Amravati': { latitude: 20.9320, longitude: 77.7523 },
    'Latur': { latitude: 18.4088, longitude: 76.5604 },
    'Ahmednagar': { latitude: 19.0948, longitude: 74.7480 },
    'Jalgaon': { latitude: 21.0077, longitude: 75.5626 },
    'Dhule': { latitude: 20.9042, longitude: 74.7749 },
    'Satara': { latitude: 17.6805, longitude: 73.9918 },
    'Nanded': { latitude: 19.1383, longitude: 77.3210 },
    'Thane': { latitude: 19.2183, longitude: 72.9781 },
    'Navi Mumbai': { latitude: 19.0330, longitude: 73.0297 },
    'Ratnagiri': { latitude: 16.9902, longitude: 73.3120 },
    'Raigad': { latitude: 18.5158, longitude: 73.1822 },
    'Sindhudurg': { latitude: 16.1158, longitude: 73.6917 },
    'Wardha': { latitude: 20.7453, longitude: 78.6022 },
    'Akola': { latitude: 20.7002, longitude: 77.0082 },
    'Parbhani': { latitude: 19.2644, longitude: 76.7721 },
    'Yavatmal': { latitude: 20.3899, longitude: 78.1311 },
    'Beed': { latitude: 18.9891, longitude: 75.7601 },
    'Jalna': { latitude: 19.8297, longitude: 75.8800 },
    'Osmanabad': { latitude: 18.1861, longitude: 76.0419 },
    'Gondia': { latitude: 21.4624, longitude: 80.1983 },
    'Chandrapur': { latitude: 19.9615, longitude: 79.2961 },
    'Buldhana': { latitude: 20.5290, longitude: 76.1842 },
    'Washim': { latitude: 20.1005, longitude: 77.1306 },
    'Bhandara': { latitude: 21.1702, longitude: 79.6521 },
    'Gadchiroli': { latitude: 20.1845, longitude: 79.9935 },
    'Nandurbar': { latitude: 21.3670, longitude: 74.2433 }
};

const NearbyCollegesScreen = ({ navigation }) => {
    const { user, admissionPath } = useAuth();
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

            // Speed up fetching on Android/iOS by trying last known position first
            const lastLoc = await Location.getLastKnownPositionAsync();
            if (lastLoc) {
                setLocation(lastLoc.coords);
                await fetchNearbyColleges(lastLoc.coords);
                setLoading(false);
                // Also trigger a background higher-accuracy fetch to update the map if it differs significantly
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(fresh => {
                    if (fresh) {
                        setLocation(fresh.coords);
                        fetchNearbyColleges(fresh.coords);
                    }
                }).catch(() => { });
                return;
            }

            const freshLoc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 5000 // Shorter timeout for user responsiveness
            });
            if (freshLoc) {
                setLocation(freshLoc.coords);
                await fetchNearbyColleges(freshLoc.coords);
            }
        } catch (err) { handleLocationFallback('GPS failed (Timeout).'); }
    };

    const handleLocationFallback = (error) => {
        const userCity = user?.location;
        if (userCity && CITY_COORDS[userCity]) {
            const coords = CITY_COORDS[userCity];
            setLocation(coords);
            fetchNearbyColleges(coords);
            setErrorMsg(`Using ${userCity} from profile (GPS slow/off)`);
        } else { setErrorMsg(error || 'Location unavailable'); }
        setLoading(false);
    };

    useEffect(() => {
        if (!location) {
            const userCity = user?.location;
            if (userCity && CITY_COORDS[userCity]) {
                const coords = CITY_COORDS[userCity];
                setLocation(coords);
                fetchNearbyColleges(coords);
            } else {
                fetchCurrentLocation();
            }
        }
    }, [user?.location, admissionPath]);

    const fetchNearbyColleges = async (coords) => {
        try {
            const res = await institutionAPI.getAll(admissionPath);
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
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; OpenStreetMap &copy; CARTO'
                    }).addTo(map);
                    L.marker([${location.latitude}, ${location.longitude}], { icon: L.divIcon({ className:'u-mark', iconSize:[16,16]}) }).addTo(map);
                    var markers = ${JSON.stringify(collegeMarkers)};
                    function safeSend(msg) { 
                        try { 
                            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                                window.ReactNativeWebView.postMessage(msg); 
                            } else {
                                window.parent.postMessage(msg, "*"); 
                            }
                        } catch(e){} 
                    }
                    markers.forEach(function(m) {
                        var icon = L.divIcon({ className:'c-icon', html:'<div class="inst-m">🎓 '+m.name.substring(0,8)+'...</div>', iconSize:[80,24], iconAnchor:[40,24] });
                        var div = document.createElement('div');
                        div.style.textAlign = 'center';
                        var b = document.createElement('b'); b.innerText = m.name;
                        var btnContainer = document.createElement('div'); btnContainer.className = 'btns';
                        var bi = document.createElement('div'); bi.className = 'btn btn-i'; bi.innerText = 'INFO';
                        bi.onclick = function() { safeSend(JSON.stringify({type:'NAV', id:m.id})); };
                        var br = document.createElement('div'); br.className = 'btn btn-r'; br.innerText = 'ROUTE';
                        br.onclick = function() { safeSend(JSON.stringify({type:'ROUTE', id:m.id})); };
                        btnContainer.appendChild(bi); btnContainer.appendChild(br);
                        div.appendChild(b); div.appendChild(btnContainer);
                        L.marker([m.lat, m.lng], { icon: icon }).addTo(map).bindPopup(div);
                    });
                    var rLayer = null;
                    function handleMsg(e) { try { var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if(d.type === 'DRAW') {
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
                if (Platform.OS === 'web') webViewRef.current?.contentWindow?.postMessage(msg, "*");
                else webViewRef.current?.postMessage(msg);
                setColleges(colleges.map(c => c._id === college._id ? { ...c, realDist: (rt.distance / 1000).toFixed(1), duration: Math.round(rt.duration / 60) } : c));
            }
        } catch (e) { }
    };

    const onMessage = (event) => {
        try {
            const payload = event.nativeEvent?.data || event.data;
            if (!payload) return;
            const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

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
    }, [colleges, location]);

    const [locationSearch, setLocationSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearchLocation = async (cityName) => {
        const city = cityName || locationSearch;
        if (!city) return;

        setIsSearching(true);
        try {
            // Try CITY_COORDS first
            const matchedKey = Object.keys(CITY_COORDS).find(k => k.toLowerCase() === city.toLowerCase());
            if (matchedKey) {
                const coords = CITY_COORDS[matchedKey];
                setLocation(coords);
                await fetchNearbyColleges(coords);
                setLocationSearch('');
                return;
            }

            // Simple Geocoding fallback using Nominatim
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Maharashtra')}&limit=1`;
            const response = await fetch(url, { headers: { 'User-Agent': 'AlloteMe App' } });
            const data = await response.json();

            if (data && data.length > 0) {
                const coords = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
                setLocation(coords);
                await fetchNearbyColleges(coords);
                setLocationSearch('');
            } else {
                Alert.alert("Location Not Found", "Couldn't find that city. Try Pune, Mumbai, etc.");
            }
        } catch (err) {
            Alert.alert("Error", "Failed to search location.");
        } finally {
            setIsSearching(false);
        }
    };

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
                        <TextInput
                            style={[styles.input, { marginBottom: 12 }]}
                            placeholder="Enter City Name (e.g. Pune)"
                            value={locationSearch}
                            onChangeText={setLocationSearch}
                        />
                        <TouchableOpacity style={styles.setBtn} onPress={() => handleSearchLocation()}><Text style={styles.setBtnText}>Find City</Text></TouchableOpacity>
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
                                <Navigation size={20} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.mapActionBtn} onPress={() => setIsFullscreen(true)}>
                                <Maximize2 size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {!isFullscreen && (
                    <ScrollView style={styles.listArea} showsVerticalScrollIndicator={false}>
                        <View style={styles.searchSection}>
                            <View style={styles.searchBar}>
                                <MapPin size={20} color={Colors.primary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search location/city..."
                                    value={locationSearch}
                                    onChangeText={setLocationSearch}
                                    onSubmitEditing={() => handleSearchLocation()}
                                />
                                {isSearching ? (
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                ) : (
                                    <TouchableOpacity onPress={() => handleSearchLocation()}>
                                        <RefreshCcw size={20} color={Colors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickSearch}>
                                {['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Aurangabad'].map(city => (
                                    <TouchableOpacity
                                        key={city}
                                        style={styles.quickCity}
                                        onPress={() => handleSearchLocation(city)}
                                    >
                                        <Text style={styles.quickCityText}>{city}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

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
                            <View style={styles.emptyState}>
                                <AlertCircle size={40} color="#CBD5E1" />
                                <Text style={styles.emptyText}>No colleges found within {maxDistance}km.</Text>
                                <Text style={styles.emptySubText}>Try increasing the radius or searching for a different city.</Text>
                            </View>
                        ) : (
                            filteredColleges.map((item) => (
                                <TouchableOpacity key={item._id} style={styles.collegeCard} onPress={() => navigation.navigate('CollegeDetail', { id: item._id })}>
                                    <View style={styles.cardTop}>
                                        <OptimizedImage
                                            source={{ uri: item.galleryImages?.[0] || 'https://images.unsplash.com/photo-1541339907198-e08756eaa589?q=80&w=200' }}
                                            style={styles.collegeImage}
                                        />
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

    // Search Section
    searchSection: { marginBottom: 20 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        gap: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
    quickSearch: { marginTop: 10 },
    quickCity: {
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: Colors.primary + '20'
    },
    quickCityText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

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
    emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: 30 },
    emptyText: { color: Colors.text.primary, fontWeight: 'bold', fontSize: 16, marginTop: 12 },
    emptySubText: { color: Colors.text.tertiary, textAlign: 'center', marginTop: 8, fontSize: 13 }
});

export default NearbyCollegesScreen;
