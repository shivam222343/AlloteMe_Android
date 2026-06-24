import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignin = () => {
    GoogleSignin.configure({
        // ⚠️ Replace with the Client ID of "Android client 1" from Google Cloud Console
        // (the one registered with SHA1: F6:A5:A1:9D:E3:BC:3D:7A:1D:72:CD:2B:2E:AC:A7:13:73:AE:CE:FC)
        androidClientId: '1015159418208-gn3r9krisa8h73n1vg3h6frn20u5vg00.apps.googleusercontent.com',
        webClientId: '1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com',
        iosClientId: 'YOUR_IOS_CLIENT_ID_HERE', // If you have iOS setup
        offlineAccess: true,
        scopes: ['profile', 'email'],
    });
};
