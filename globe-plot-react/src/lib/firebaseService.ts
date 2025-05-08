import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Trip } from '@/types/trip';

// Auth Functions
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Trip Functions
// export const getTrips = async (userId: string): Promise<Trip[]> => {
//   try {
//     const tripsRef = collection(db, 'trips');
//     const q = query(tripsRef, where('userId', '==', userId));
//     const querySnapshot = await getDocs(q);
    
//     return querySnapshot.docs.map(doc => {
//       const data = doc.data();
//       return {
//         ...data,
//         id: doc.id,
//       } as Trip;
//     });
//   } catch (error) {
//     console.error('Error getting trips:', error);
//     throw error;
//   }
// };

// export const getTrip = async (tripId: string): Promise<Trip | null> => {
//   try {
//     const tripRef = doc(db, 'trips', tripId);
//     const tripDoc = await getDoc(tripRef);
    
//     if (tripDoc.exists()) {
//       const data = tripDoc.data();
//       return {
//         ...data,
//         id: tripDoc.id,
//       } as Trip;
//     }
    
//     return null;
//   } catch (error) {
//     console.error('Error getting trip:', error);
//     throw error;
//   }
// };

// export const saveTrip = async (trip: Trip): Promise<Trip> => {
//   try {
//     const tripRef = doc(db, 'trips', trip.id);
//     const userId = getCurrentUser()?.uid;
    
//     if (!userId) {
//       throw new Error('User not authenticated');
//     }
    
//     const tripData = {
//       ...trip,
//       userId,
//       updatedAt: Timestamp.now()
//     };
    
//     await setDoc(tripRef, tripData, { merge: true });
//     return trip;
//   } catch (error) {
//     console.error('Error saving trip:', error);
//     throw error;
//   }
// };

// export const createTrip = async (trip: Omit<Trip, 'id'>): Promise<Trip> => {
//   try {
//     const userId = getCurrentUser()?.uid;
    
//     if (!userId) {
//       throw new Error('User not authenticated');
//     }
    
//     // Create a new document with auto-generated ID
//     const tripsRef = collection(db, 'trips');
//     const newTripRef = doc(tripsRef);
    
//     const newTrip: Trip = {
//       ...trip,
//       id: newTripRef.id,
//       userId,
//       createdAt: Timestamp.now(),
//       updatedAt: Timestamp.now()
//     } as unknown as Trip;
    
//     await setDoc(newTripRef, newTrip);
    
//     return newTrip;
//   } catch (error) {
//     console.error('Error creating trip:', error);
//     throw error;
//   }
// };

// export const updateTrip = async (tripId: string, tripData: Partial<Trip>): Promise<void> => {
//   try {
//     const userId = getCurrentUser()?.uid;
    
//     if (!userId) {
//       throw new Error('User not authenticated');
//     }
    
//     const tripRef = doc(db, 'trips', tripId);
//     const tripDoc = await getDoc(tripRef);
    
//     if (!tripDoc.exists()) {
//       throw new Error('Trip not found');
//     }
    
//     // Verify ownership
//     if (tripDoc.data().userId !== userId) {
//       throw new Error('Not authorized to update this trip');
//     }
    
//     await updateDoc(tripRef, {
//       ...tripData,
//       updatedAt: Timestamp.now()
//     });
//   } catch (error) {
//     console.error('Error updating trip:', error);
//     throw error;
//   }
// };

// export const deleteTrip = async (tripId: string): Promise<void> => {
//   try {
//     const userId = getCurrentUser()?.uid;
    
//     if (!userId) {
//       throw new Error('User not authenticated');
//     }
    
//     const tripRef = doc(db, 'trips', tripId);
//     const tripDoc = await getDoc(tripRef);
    
//     if (!tripDoc.exists()) {
//       throw new Error('Trip not found');
//     }
    
//     // Verify ownership
//     if (tripDoc.data().userId !== userId) {
//       throw new Error('Not authorized to delete this trip');
//     }
    
//     await deleteDoc(tripRef);
//   } catch (error) {
//     console.error('Error deleting trip:', error);
//     throw error;
//   }
// }; 