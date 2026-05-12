import * as Linking from 'expo-linking';

const linking = {
  enabled: true,
  prefixes: [Linking.createURL('/'), 'alloteme0077://', 'https://web.alloteme.online'],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      ForgotPassword: 'forgot-password',
      AppDrawer: {
        screens: {
          MainTabs: {
            screens: {
              Dashboard: 'dashboard',
              BrowseColleges: 'colleges',
              AICounselor: 'ai-counselor',
              Profile: 'profile',
              Counselors: 'counselors',
              CounselorDetail: 'counselors/:id',
              Predictor: 'predictor',
              PredictionResults: 'results',
              SavedColleges: 'saved',
              CollegeDetail: 'college/:id',
              Settings: 'settings',
              AboutUs: 'about',
              Pricing: 'pricing',
              DocumentVerification: 'documents',
              AdminDocumentManager: 'admin/documents',
              AdminStudentDocuments: 'admin/student-docs',
            },
          },
        },
      },
    },
  },
};

export default linking;
