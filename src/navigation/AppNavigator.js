import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/theme';

// Fixed imports - removing the broken counselor references
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import StudentDashboard from '../screens/StudentDashboard';
import AdminDashboard from '../screens/AdminDashboard';
import CreateInstitutionScreen from '../screens/CreateInstitutionScreen';
import UploadCutoffScreen from '../screens/UploadCutoffScreen';
import BrowseCollegesScreen from '../screens/BrowseCollegesScreen';
import PredictorScreen from '../screens/PredictorScreen';
import PredictionResultsScreen from '../screens/PredictionResultsScreen';
import AICounselorScreen from '../screens/AICounselorScreen';
import CollegeDetailScreen from '../screens/CollegeDetailScreen';
import NearbyCollegesScreen from '../screens/NearbyCollegesScreen';
import SavedCollegesScreen from '../screens/SavedCollegesScreen';
import CounselorsScreen from '../screens/CounselorsScreen';
import CounselorDetailScreen from '../screens/CounselorDetailScreen';
import AdminCounselorsScreen from '../screens/AdminCounselorsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';
import EditInstitutionScreen from '../screens/EditInstitutionScreen';
import BranchCutoffDetailScreen from '../screens/BranchCutoffDetailScreen';
import AITrainingScreen from '../screens/AITrainingScreen';
import FrequentQuestionsManager from '../screens/FrequentQuestionsManager';
import FeaturedCollegesScreen from '../screens/FeaturedCollegesScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminUserDetailScreen from '../screens/AdminUserDetailScreen';
import TermsConditionsScreen from '../screens/TermsConditionsScreen';
import AdminCounselorLogsScreen from '../screens/AdminCounselorLogsScreen';
import AdminNotificationsScreen from '../screens/AdminNotificationsScreen';
import SystemAnalyticsScreen from '../screens/SystemAnalyticsScreen';
import AdminReviewsScreen from '../screens/AdminReviewsScreen';
import PricingScreen from '../screens/PricingScreen';
import AdminFormBuilderScreen from '../screens/AdminFormBuilderScreen';
import FormListScreen from '../screens/FormListScreen';
import FormResponsesScreen from '../screens/FormResponsesScreen';

// Custom Nav Components
import Sidebar from '../components/navigation/Sidebar';
import BottomBar from '../components/navigation/BottomBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const TabNavigator = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    return (
        <Tab.Navigator
            tabBar={props => <BottomBar {...props} />}
            screenOptions={{ headerShown: false }}
            backBehavior="history"
        >
            <Tab.Screen
                name="Dashboard"
                component={isAdmin ? AdminDashboard : StudentDashboard}
            />
            <Tab.Screen name="BrowseColleges" component={BrowseCollegesScreen} />
            <Tab.Screen name="AICounselor" component={AICounselorScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />

            {/* Counselors Flow */}
            <Tab.Screen name="Counselors" component={CounselorsScreen} />
            <Tab.Screen name="CounselorDetail" component={CounselorDetailScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="AdminCounselors" component={AdminCounselorsScreen} />

            {/* Other Sub-Screens */}
            <Tab.Screen name="Predictor" component={PredictorScreen} />
            <Tab.Screen name="PredictionResults" component={PredictionResultsScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="NearbyColleges" component={NearbyCollegesScreen} />
            <Tab.Screen name="SavedColleges" component={SavedCollegesScreen} />
            <Tab.Screen name="CreateInstitution" component={CreateInstitutionScreen} />
            <Tab.Screen name="UploadCutoff" component={UploadCutoffScreen} />
            <Tab.Screen name="AITraining" component={AITrainingScreen} />
            <Tab.Screen name="FrequentQuestionsManager" component={FrequentQuestionsManager} />
            <Tab.Screen name="FeaturedColleges" component={FeaturedCollegesScreen} />
            <Tab.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Tab.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
            <Tab.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="CollegeDetail" component={CollegeDetailScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="EditInstitution" component={EditInstitutionScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="BranchCutoffDetail" component={BranchCutoffDetailScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="AboutUs" component={AboutUsScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="TermsConditions" component={TermsConditionsScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="HelpCenter" component={HelpCenterScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="AdminCounselorLogs" component={AdminCounselorLogsScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
            <Tab.Screen name="SystemAnalytics" component={SystemAnalyticsScreen} />
            <Tab.Screen name="AdminReviews" component={AdminReviewsScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Pricing" component={PricingScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="AdminFormBuilder" component={FormListScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="FormList" component={FormListScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="FormBuilder" component={AdminFormBuilderScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="FormResponses" component={FormResponsesScreen} options={{ tabBarButton: () => null }} />
        </Tab.Navigator>
    );
};

const DrawerNavigator = () => (
    <Drawer.Navigator
        drawerContent={props => <Sidebar {...props} />}
        screenOptions={{
            headerShown: false,
            drawerType: 'front',
            overlayColor: 'rgba(0,0,0,0.5)',
            drawerStyle: { width: 280 },
        }}
    >
        <Drawer.Screen name="MainTabs" component={TabNavigator} />
    </Drawer.Navigator>
);

const AppNavigator = () => {
    const { isAuthenticated, user, loading, setLoading } = useAuth();

    // Safety timeout to ensure loading screen clears even if backend is waking up slowly
    React.useEffect(() => {
        let timer;
        if (loading) {
            timer = setTimeout(() => {
                if (typeof setLoading === 'function') {
                    console.log('[AppNavigator] Loading timeout reached. Forcing state update.');
                    setLoading(false);
                }
            }, 8000);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Signup" component={SignupScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="AppDrawer" component={DrawerNavigator} />
                </>
            )}
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }
});

export default AppNavigator;
