import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import MainLayout from '../components/layouts/MainLayout';
import { Colors, Shadows } from '../constants/theme';
import { authAPI, systemAPI } from '../services/api';
import { TrendingUp, Users, Home, Activity, FileText, ChevronRight, Settings, Tag, Trash2, Save, Plus } from 'lucide-react-native';

const SystemAnalyticsScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    
    const [basicPrice, setBasicPrice] = useState('99');
    const [premiumPrice, setPremiumPrice] = useState('499');
    
    const [coupons, setCoupons] = useState([]);
    const [newCouponCode, setNewCouponCode] = useState('');
    const [newCouponDiscount, setNewCouponDiscount] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, settingsRes, couponsRes] = await Promise.all([
                authAPI.getStats(),
                systemAPI.getSettings(),
                systemAPI.getCoupons()
            ]);
            setData(statsRes.data);
            if (settingsRes.data.basicPrice) setBasicPrice(settingsRes.data.basicPrice.toString());
            if (settingsRes.data.premiumPrice) setPremiumPrice(settingsRes.data.premiumPrice.toString());
            setCoupons(couponsRes.data || []);
        } catch (error) {
            console.error('Failed to fetch admin data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePrices = async () => {
        try {
            await systemAPI.updateSetting({ key: 'basicPrice', value: Number(basicPrice) });
            await systemAPI.updateSetting({ key: 'premiumPrice', value: Number(premiumPrice) });
            Alert.alert('Success', 'Pricing updated successfully!');
        } catch (e) {
            Alert.alert('Error', 'Failed to update pricing');
        }
    };

    const handleCreateCoupon = async () => {
        if (!newCouponCode || !newCouponDiscount) return;
        try {
            const res = await systemAPI.createCoupon({
                code: newCouponCode.toUpperCase(),
                discountPercentage: Number(newCouponDiscount),
                maxUses: 0 // Unlimited by default here, can enhance later
            });
            setCoupons([res.data, ...coupons]);
            setNewCouponCode('');
            setNewCouponDiscount('');
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to create coupon');
        }
    };

    const handleToggleCoupon = async (id) => {
        try {
            const res = await systemAPI.toggleCoupon(id);
            setCoupons(coupons.map(c => c._id === id ? res.data : c));
        } catch (e) {
            Alert.alert('Error', 'Failed to toggle coupon');
        }
    };

    const handleDeleteCoupon = async (id) => {
        Alert.alert('Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await systemAPI.deleteCoupon(id);
                    setCoupons(coupons.filter(c => c._id !== id));
                } catch (e) {
                    Alert.alert('Error', 'Failed to delete coupon');
                }
            }}
        ]);
    };

    if (loading) {
        return (
            <MainLayout title="System Analytics">
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </MainLayout>
        );
    }

    const regData = {
        labels: data?.analytics?.registrations.map(r => r._id.slice(5)) || ['Mon'],
        datasets: [{ data: data?.analytics?.registrations.map(r => r.count) || [0] }]
    };
    if (regData.labels.length === 0) { regData.labels = ['None']; regData.datasets[0].data = [0]; }

    const predictData = {
        labels: data?.analytics?.predictionHits.map(p => p.day) || ['M'],
        datasets: [{ data: data?.analytics?.predictionHits.map(p => p.count) || [0] }]
    };
    if (predictData.labels.length === 0) { predictData.labels = ['None']; predictData.datasets[0].data = [0]; }

    return (
        <MainLayout title="Intelligence Dashboard">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statItem, { backgroundColor: '#eff6ff' }]}>
                        <Users size={20} color="#3b82f6" />
                        <Text style={styles.statValue}>{data?.users || 0}</Text>
                        <Text style={styles.statLabel}>Total Students</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: '#f0fdf4' }]}>
                        <Home size={20} color="#10b981" />
                        <Text style={styles.statValue}>{data?.institutions || 0}</Text>
                        <Text style={styles.statLabel}>Institutions</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: '#fef2f2' }]}>
                        <Activity size={20} color="#ef4444" />
                        <Text style={styles.statValue}>{data?.analytics?.activeSessions || 0}</Text>
                        <Text style={styles.statLabel}>Active Now</Text>
                    </View>
                </View>

                {/* Pricing Configuration */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Settings size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Pricing Configuration</Text>
                    </View>
                    
                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Basic Plan Price (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={basicPrice}
                            onChangeText={setBasicPrice}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Premium Plan Price (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={premiumPrice}
                            onChangeText={setPremiumPrice}
                            keyboardType="numeric"
                        />
                    </View>
                    
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrices}>
                        <Save size={18} color="white" />
                        <Text style={styles.saveBtnText}>Save Pricing</Text>
                    </TouchableOpacity>
                </View>

                {/* Coupon Manager */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Tag size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Coupon Codes</Text>
                    </View>
                    
                    <View style={styles.addCouponBox}>
                        <TextInput
                            style={[styles.input, { flex: 2, marginRight: 8 }]}
                            placeholder="CODE (e.g. FLAT50)"
                            value={newCouponCode}
                            onChangeText={setNewCouponCode}
                            autoCapitalize="characters"
                        />
                        <TextInput
                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                            placeholder="% Off"
                            value={newCouponDiscount}
                            onChangeText={setNewCouponDiscount}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity style={styles.addBtn} onPress={handleCreateCoupon}>
                            <Plus size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {coupons.map(coupon => (
                        <View key={coupon._id} style={styles.couponItem}>
                            <View>
                                <Text style={styles.couponCode}>{coupon.code} <Text style={styles.couponDiscount}>({coupon.discountPercentage}% OFF)</Text></Text>
                                <Text style={styles.couponUses}>Used: {coupon.timesUsed}</Text>
                            </View>
                            <View style={styles.couponActions}>
                                <Switch 
                                    value={coupon.isActive} 
                                    onValueChange={() => handleToggleCoupon(coupon._id)} 
                                    trackColor={{ true: Colors.primary, false: '#cbd5e1' }}
                                />
                                <TouchableOpacity onPress={() => handleDeleteCoupon(coupon._id)} style={styles.delBtn}>
                                    <Trash2 size={18} color={Colors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Form Builder Entry */}
                <TouchableOpacity
                    style={styles.formBuilderCard}
                    onPress={() => navigation.navigate('AdminFormBuilder')}
                >
                    <View style={styles.formInfo}>
                        <FileText size={24} color={Colors.primary} />
                        <View>
                            <Text style={styles.formBuilderTitle}>Custom Form Builder</Text>
                            <Text style={styles.formBuilderDesc}>Create surveys & feedback forms</Text>
                        </View>
                    </View>
                    <ChevronRight size={20} color={Colors.text.tertiary} />
                </TouchableOpacity>

                {/* Registration Chart */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <TrendingUp size={18} color={Colors.primary} />
                        <Text style={styles.chartTitle}>New Registrations (7 Days)</Text>
                    </View>
                    <LineChart
                        data={regData}
                        width={Dimensions.get('window').width}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </MainLayout>
    );
};

const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: Colors.primary }
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingVertical: 20 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statsGrid: { flexDirection: 'row', gap: 0, marginBottom: 20 },
    statItem: { flex: 1, padding: 16, borderRadius: 0, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
    statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
    chartCard: { backgroundColor: 'white', paddingVertical: 16, borderRadius: 0, marginBottom: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9' },
    chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingHorizontal: 16 },
    chartTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    chart: { marginVertical: 8, borderRadius: 16 },

    sectionCard: { backgroundColor: 'white', padding: 20, marginBottom: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
    inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    inputLabel: { fontSize: 14, color: Colors.text.secondary, fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, minWidth: 100, backgroundColor: '#f8fafc' },
    saveBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8, marginTop: 5 },
    saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

    addCouponBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    addBtn: { backgroundColor: Colors.primary, padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    couponItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    couponCode: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
    couponDiscount: { fontSize: 13, fontWeight: '600', color: '#10b981' },
    couponUses: { fontSize: 12, color: Colors.text.tertiary, marginTop: 4 },
    couponActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    delBtn: { padding: 5 },

    formBuilderCard: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 0,
        marginBottom: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f1f5f9'
    },
    formInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    formBuilderTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
    formBuilderDesc: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 }
});

export default SystemAnalyticsScreen;
