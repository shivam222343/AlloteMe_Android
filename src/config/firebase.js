import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyCc0DT69O-M8BEc1R8iwkPtZBHmmvCe-AI",
    authDomain: "myauth-91ca5.firebaseapp.com",
    projectId: "myauth-91ca5",
    storageBucket: "myauth-91ca5.appspot.com",
    messagingSenderId: "440104788015",
    appId: "1:440104788015:web:ee4a71256a787d545766da",
    measurementId: "G-DX9WQPF82Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
