import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignin = () => {
    GoogleSignin.configure({
        androidClientId: '291149459575-j0g5nnm06egi7ndopgr29kr3326ka0ef.apps.googleusercontent.com',
        webClientId: '1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com',
        iosClientId: 'YOUR_IOS_CLIENT_ID_HERE', // If you have iOS setup
        offlineAccess: true,
        scopes: ['profile', 'email'],
    });
};
