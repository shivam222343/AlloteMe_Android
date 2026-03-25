import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/theme';

// Screens
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
import ConnectCounselorScreen from '../screens/ConnectCounselorScreen';
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
            {/* Main Tabs (Visible in BottomBar) */}
            <Tab.Screen
                name="Dashboard"
                component={isAdmin ? AdminDashboard : StudentDashboard}
            />
            <Tab.Screen name="BrowseColleges" component={BrowseCollegesScreen} />
            <Tab.Screen name="AICounselor" component={AICounselorScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />

            {/* Sub-Screens (Hidden from BottomBar, but keep BottomBar visible) */}
            <Tab.Screen name="Predictor" component={PredictorScreen} />
            <Tab.Screen
                name="PredictionResults"
                component={PredictionResultsScreen}
                options={{ tabBarButton: () => null }}
            />
            <Tab.Screen name="NearbyColleges" component={NearbyCollegesScreen} />
            <Tab.Screen name="SavedColleges" component={SavedCollegesScreen} />
            <Tab.Screen name="ConnectCounselor" component={ConnectCounselorScreen} />
            <Tab.Screen name="CreateInstitution" component={CreateInstitutionScreen} />
            <Tab.Screen name="UploadCutoff" component={UploadCutoffScreen} />
            <Tab.Screen name="AITraining" component={AITrainingScreen} />
            <Tab.Screen name="FrequentQuestionsManager" component={FrequentQuestionsManager} />
            <Tab.Screen name="FeaturedColleges" component={FeaturedCollegesScreen} />
            <Tab.Screen name="UserManagement" component={ComingSoonScreen} initialParams={{ title: 'User Management' }} />
            <Tab.Screen name="SystemAnalytics" component={ComingSoonScreen} initialParams={{ title: 'System Analytics' }} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
            <Tab.Screen
                name="CompleteProfile"
                component={CompleteProfileScreen}
                options={{ tabBarButton: () => null }}
            />
            <Tab.Screen
                name="CollegeDetail"
                component={CollegeDetailScreen}
                options={{ tabBarButton: () => null }}
            />
            <Tab.Screen
                name="EditInstitution"
                component={EditInstitutionScreen}
                options={{ tabBarButton: () => null }}
            />
            <Tab.Screen
                name="BranchCutoffDetail"
                component={BranchCutoffDetailScreen}
                options={{ tabBarButton: () => null }}
            />
            <Tab.Screen name="AboutUs" component={AboutUsScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="HelpCenter" component={HelpCenterScreen} options={{ tabBarButton: () => null }} />
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
    const { isAuthenticated, user, loading } = useAuth();

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
