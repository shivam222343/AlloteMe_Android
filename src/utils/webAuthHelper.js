import { Platform } from 'react-native';

let useWebGoogleLogin = () => {
    return () => console.log('Google login not available on this platform');
};

if (Platform.OS === 'web') {
    try {
        const { useGoogleLogin } = require('@react-oauth/google');
        useWebGoogleLogin = useGoogleLogin;
    } catch (e) {
        console.error('Failed to load web google login', e);
    }
}

export { useWebGoogleLogin };
