import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import StudentDashboard from '../screens/StudentDashboard';
import AdminDashboard from '../screens/AdminDashboard';
import CreateInstitutionScreen from '../screens/CreateInstitutionScreen';
import UploadCutoffScreen from '../screens/UploadCutoffScreen';
import BrowseCollegesScreen from '../screens/BrowseCollegesScreen';
import PredictorScreen from '../screens/PredictorScreen';
import AICounselorScreen from '../screens/AICounselorScreen';
import CollegeDetailScreen from '../screens/CollegeDetailScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const { user, loading } = useAuth();

    if (loading) return null; // Or a splash screen

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Signup" component={SignupScreen} />
                </>
            ) : (
                <>
                    {user.role === 'admin' ? (
                        <>
                            <Stack.Screen name="AdminHome" component={AdminDashboard} />
                            <Stack.Screen name="CreateInstitution" component={CreateInstitutionScreen} />
                            <Stack.Screen name="UploadCutoff" component={UploadCutoffScreen} />
                        </>
                    ) : (
                        <>
                            <Stack.Screen name="StudentHome" component={StudentDashboard} />
                            <Stack.Screen name="BrowseColleges" component={BrowseCollegesScreen} />
                            <Stack.Screen name="Predictor" component={PredictorScreen} />
                            <Stack.Screen name="AICounselor" component={AICounselorScreen} />
                            <Stack.Screen name="CollegeDetail" component={CollegeDetailScreen} />
                        </>
                    )}
                </>
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;
