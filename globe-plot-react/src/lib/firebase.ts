// Import the Firebase SDK components we need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// Replace these placeholder values with your actual Firebase config from the console
const firebaseConfig = {
  apiKey: "AIzaSyCXNNdPRexpEKJ2GtWq886LukTjH3B0yGs",
  authDomain: "globe-plot.firebaseapp.com",
  projectId: "globe-plot",
  storageBucket: "globe-plot.firebasestorage.app",
  messagingSenderId: "320801669018",
  appId: "1:320801669018:web:9910fdf9ff941e9cffc423",
  measurementId: "G-5Q2MCKTC5L"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
// Persistent local cache enables offline reads and queued writes via IndexedDB.
// persistentMultipleTabManager allows multiple tabs to share the same cache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const storage = getStorage(app);

export default app; 