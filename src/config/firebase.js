import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyBAuqpEBqYUxccqTBwoX5Hc4huRmP3jIFo",
    authDomain: "auraandroid-ac697.firebaseapp.com",
    projectId: "auraandroid-ac697",
    storageBucket: "auraandroid-ac697.firebasestorage.app",
    messagingSenderId: "291149459575",
    appId: "1:291149459575:web:aura-android-web-app-id", // Note: Web appId might differ, but setting project defaults.
    measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
