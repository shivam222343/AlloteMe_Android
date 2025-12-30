import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// Register background handler
try {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);
    });
} catch (error) {
    console.log('Failed to set background handler (native firebase not initialized?):', error);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
