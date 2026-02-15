import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if Firebase Admin is already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'globe-plot',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  // Validate required environment variables
  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.warn('Warning: Firebase Admin credentials not fully configured. Some features may not work.');
    console.warn('Required env vars: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
  } else {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: `${serviceAccount.projectId}.firebasestorage.app`
    });
    console.log('Firebase Admin SDK initialized successfully');
  }
}

export const auth = admin.auth();
export const firestore = admin.firestore();
export const storage = admin.storage();

export default admin;
