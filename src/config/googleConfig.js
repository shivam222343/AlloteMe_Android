import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignin = () => {
    GoogleSignin.configure({
        webClientId: '1015159418208-vip5a2c92nb8rk91gqfqpsis0utpe9vl.apps.googleusercontent.com',
        offlineAccess: true,
    });
};
