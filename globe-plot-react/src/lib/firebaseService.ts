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
  Timestamp,
  writeBatch
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

export const deleteTrip = async (tripId: string): Promise<void> => {
  try {
    const userId = getCurrentUser()?.uid;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    console.log(`firebaseService.deleteTrip: Deleting trip ${tripId} for user ${userId}`);
    
    const tripRef = doc(db, 'trips', tripId);
    const tripDoc = await getDoc(tripRef);
    
    if (!tripDoc.exists()) {
      console.log(`Trip ${tripId} not found in Firestore`);
      return;
    }
    
    const tripData = tripDoc.data();
    console.log(`Trip data:`, tripData);
    
    // Verify ownership
    if (tripData.userId !== userId) {
      throw new Error(`Not authorized to delete this trip. Owner: ${tripData.userId}, Current user: ${userId}`);
    }
    
    // Delete the trip document directly
    await deleteDoc(tripRef);
    console.log(`Successfully deleted trip ${tripId}`);
    
    // Find and delete related events - include userId in query for proper permissions
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(
      eventsRef, 
      where('tripId', '==', tripId), 
      where('userId', '==', userId)
    );
    const eventsSnapshot = await getDocs(eventsQuery);
    
    console.log(`Found ${eventsSnapshot.docs.length} events to delete`);
    
    for (const eventDoc of eventsSnapshot.docs) {
      await deleteDoc(eventDoc.ref);
      console.log(`Deleted event ${eventDoc.id}`);
    }
    
    // Find and delete related documents - include userId in query for proper permissions
    const docsRef = collection(db, 'documents');
    const docsQuery = query(
      docsRef, 
      where('tripId', '==', tripId), 
      where('userId', '==', userId)
    );
    const docsSnapshot = await getDocs(docsQuery);
    
    console.log(`Found ${docsSnapshot.docs.length} documents to delete`);
    
    for (const docSnapshot of docsSnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      console.log(`Deleted document ${docSnapshot.id}`);
    }
    
  } catch (error) {
    console.error('Error in firebaseService.deleteTrip:', error);
    throw error;
  }
}; 

/**
 * Updates a single event's location coordinates in Firestore
 */
export const updateEventCoordinates = async (
  eventId: string,
  coordinates: { lat: number; lng: number },
  locationType: 'location' | 'departure.location' | 'arrival.location' | 'checkIn.location' | 'checkOut.location'
): Promise<void> => {
  try {
    const userId = getCurrentUser()?.uid;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Get event reference
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (!eventDoc.exists()) {
      throw new Error(`Event ${eventId} not found in Firestore`);
    }
    
    // Verify ownership
    if (eventDoc.data().userId !== userId) {
      throw new Error('Not authorized to update this event');
    }
    
    // Create update data based on location type
    const updateData: Record<string, any> = {};
    updateData[`${locationType}.geolocation`] = coordinates;
    updateData['updatedAt'] = Timestamp.now();
    
    // Update Firestore
    await updateDoc(eventRef, updateData);
    
    console.log(`Updated coordinates for ${eventId}, location: ${locationType}`);
  } catch (error) {
    console.error('Error updating event coordinates:', error);
    throw error;
  }
};

/**
 * Batch updates coordinates for multiple events in Firestore
 */
export const batchUpdateEventCoordinates = async (
  updates: Array<{
    eventId: string,
    coordinates: { lat: number; lng: number },
    locationType: 'location' | 'departure.location' | 'arrival.location' | 'checkIn.location' | 'checkOut.location'
  }>
): Promise<void> => {
  try {
    const userId = getCurrentUser()?.uid;
    
    console.log(`Starting batch update with ${updates.length} updates, user: ${userId}`);
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    if (updates.length === 0) return;
    
    // Process in batches of 500 to avoid Firestore limits
    const batchSize = 500;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      console.log(`Processing batch ${i/batchSize + 1} with ${batch.length} updates`);
      
      // Create a Firestore batch
      const firestoreBatch = writeBatch(db);
      let successCount = 0;
      let errorCount = 0;
      
      // Add each update to the batch
      for (const update of batch) {
        try {
          console.log(`Checking event ${update.eventId} for ${update.locationType}`);
          
          const eventRef = doc(db, 'events', update.eventId);
          const eventDoc = await getDoc(eventRef);
          
          if (!eventDoc.exists()) {
            console.log(`Event ${update.eventId} not found in Firestore`);
            errorCount++;
            continue;
          }
          
          const eventData = eventDoc.data();
          if (eventData.userId !== userId) {
            console.log(`Event ${update.eventId} - ownership mismatch. Event owner: ${eventData.userId}, Current user: ${userId}`);
            errorCount++;
            continue;
          }
          
          // Create update data
          const updateData: Record<string, any> = {};
          updateData[`${update.locationType}.geolocation`] = update.coordinates;
          updateData['updatedAt'] = Timestamp.now();
          
          console.log(`Adding to batch: ${update.eventId}, location: ${update.locationType}, coords: ${JSON.stringify(update.coordinates)}`);
          firestoreBatch.update(eventRef, updateData);
          successCount++;
        } catch (error) {
          console.error(`Error processing event ${update.eventId}:`, error);
          errorCount++;
        }
      }
      
      // Commit the batch
      if (successCount > 0) {
        await firestoreBatch.commit();
        console.log(`Batch committed: ${successCount} events updated, ${errorCount} errors`);
      } else {
        console.log(`No events to update in this batch`);
      }
    }
  } catch (error) {
    console.error('Error batch updating event coordinates:', error);
    throw error;
  }
}; 

// User specific functions for map refresh cooldown
/**
 * Retrieves the last map refresh timestamp for a user.
 * @param userId The ID of the user.
 * @returns A Promise that resolves to the timestamp (number in milliseconds) or null.
 */
export const getUserLastRefreshTimestamp = async (userId: string): Promise<number | null> => {
  if (!userId) {
    console.error("getUserLastRefreshTimestamp: userId is required.");
    return null;
  }
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData && userData.lastMapRefreshAt && userData.lastMapRefreshAt instanceof Timestamp) {
        return userData.lastMapRefreshAt.toMillis();
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user last refresh timestamp:', error);
    // It's generally safer not to throw here, as a missing timestamp is not a critical failure
    // for the calling function, which should handle the null case.
    return null; 
  }
};

/**
 * Updates the last map refresh timestamp for a user to the current server time.
 * @param userId The ID of the user.
 */
export const updateUserLastRefreshTimestamp = async (userId: string): Promise<void> => {
  if (!userId) {
    console.error("updateUserLastRefreshTimestamp: userId is required.");
    return;
  }
  try {
    const userRef = doc(db, 'users', userId);
    // Use setDoc with merge: true to create the document if it doesn't exist,
    // or update it if it does.
    await setDoc(userRef, {
      lastMapRefreshAt: Timestamp.now()
    }, { merge: true });
    console.log(`Set/Updated lastMapRefreshAt for user ${userId}`);
  } catch (error) {
    console.error('Error setting/updating user last refresh timestamp:', error);
    // Depending on requirements, you might want to re-throw or handle differently
    // For now, just logging the error.
  }
}; 