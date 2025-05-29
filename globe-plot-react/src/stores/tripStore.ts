import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Event,
  Trip,
  Document
} from '../types/trip';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUserStore } from './userStore';
import { deleteDocument } from '../lib/firebaseService';

// Re-export types for backward compatibility
export * from '../types/trip';

interface TripState {
  trips: Trip[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  addTrip: (trip: Trip) => Promise<void>;
  removeTrip: (id: string) => Promise<void>;
  updateTrip: (id: string, trip: Partial<Trip>) => Promise<void>;
  addEvent: (tripId: string, event: Event) => Promise<void>;
  removeEvent: (tripId: string, eventId: string) => Promise<void>;
  updateEvent: (tripId: string, eventId: string, event: Partial<Event>) => Promise<void>;
  addDocument: (tripId: string, document: Document) => Promise<void>;
  removeDocument: (tripId: string, documentId: string) => Promise<void>;
  
  // Firestore sync
  fetchTrips: () => Promise<Trip[]>;
  setTrips: (trips: Trip[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setEventsForTrip: (tripId: string, newEvents: Event[]) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      loading: false,
      error: null,
      
      fetchTrips: async () => {
        const user = useUserStore.getState().user;
        
        // Skip if user is not authenticated
        if (!user) {
          set({ loading: false });
          return [];
        }
        
        set({ loading: true, error: null });
        
        try {
          // Fetch trips from Firestore
          const tripsRef = collection(db, 'trips');
          const q = query(tripsRef, where('userId', '==', user.uid));
          const tripSnapshot = await getDocs(q);
          
          // For each trip, fetch its events only (documents are now handled separately)
          const trips = await Promise.all(
            tripSnapshot.docs.map(async (tripDoc) => {
              const tripData = tripDoc.data();
              const tripId = tripDoc.id;
              
              // Fetch events for this trip
              const eventsQuery = query(collection(db, 'events'), 
                where('tripId', '==', tripId),
                where('userId', '==', user.uid)
              );
              const eventSnapshot = await getDocs(eventsQuery);
              
              const events = eventSnapshot.docs.map(doc => {
                const eventData = doc.data();
                return {
                  ...eventData,
                  id: doc.id,
                  // Convert Timestamp to ISO string for dates
                  start: eventData.start instanceof Timestamp ? 
                    eventData.start.toDate().toISOString() : eventData.start,
                  end: eventData.end instanceof Timestamp ? 
                    eventData.end.toDate().toISOString() : eventData.end,
                } as Event;
              });
              
              // Documents are now handled separately via firebaseService functions
              // Set empty array to maintain compatibility with Trip interface
              const documents: Document[] = [];
              
              // Return the complete trip object with events
              return {
                ...tripData,
                id: tripId,
                // Convert Timestamp to ISO string for dates
                startDate: tripData.startDate instanceof Timestamp ? 
                  tripData.startDate.toDate().toISOString() : tripData.startDate,
                endDate: tripData.endDate instanceof Timestamp ? 
                  tripData.endDate.toDate().toISOString() : tripData.endDate,
                events: events,
                documents: documents, // Empty array since documents are stored separately
              } as Trip;
            })
          );
          
          set({ trips, loading: false });
          
          // Return the trips for use by other functions
          return trips;
        } catch (error) {
          console.error('Error fetching trips:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch trips',
            loading: false
          });
          
          // Return empty array on error
          return [];
        }
      },
      
      addTrip: async (trip) => {
        const user = useUserStore.getState().user;
        
        // If not authenticated, just update local state with locally-generated ID
        if (!user) {
          set((state) => ({ trips: [...state.trips, trip] }));
          return;
        }
        
        try {
          // When authenticated, we'll use Firestore-generated IDs
          // First create reference for trip without setting data
          const tripsRef = collection(db, 'trips');
          const tripRef = doc(tripsRef); // This generates a new Firestore ID
          const firestoreTripId = tripRef.id;
          
          // Create a mapping of local IDs to Firestore IDs for events and documents
          const eventIdMap = new Map();
          const documentIdMap = new Map();
          
          // Generate Firestore IDs for all events
          const eventsCollection = collection(db, 'events');
          const eventsWithFirestoreIds = await Promise.all(
            trip.events.map(async (event) => {
              const eventRef = doc(eventsCollection); // Generate Firestore ID
              eventIdMap.set(event.id, eventRef.id);
              
              return {
                ...event,
                id: eventRef.id,
                tripId: firestoreTripId,
                userId: user.uid,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                // Convert dates
                start: event.start ? new Date(event.start) : null,
                end: event.end ? new Date(event.end) : null,
              };
            })
          );
          
          // Generate Firestore IDs for all documents
          const documentsCollection = collection(db, 'documents');
          const documentsWithFirestoreIds = await Promise.all(
            trip.documents.map(async (document) => {
              const documentRef = doc(documentsCollection); // Generate Firestore ID
              documentIdMap.set(document.id, documentRef.id);
              
              // Update associatedEvents references with new Firestore IDs
              const updatedAssociatedEvents = document.associatedEvents.map(
                (eventId) => eventIdMap.get(eventId) || eventId
              );
              
              return {
                ...document,
                id: documentRef.id,
                tripId: firestoreTripId,
                userId: user.uid,
                associatedEvents: updatedAssociatedEvents,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              };
            })
          );
          
          // Create the trip object with Firestore ID and updated relations
          const firestoreTrip = {
            ...trip,
            id: firestoreTripId,
            userId: user.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            // Convert dates to Timestamp for Firestore
            startDate: new Date(trip.startDate),
            endDate: new Date(trip.endDate),
            // Remove the events and documents arrays as they'll be separate collections
            events: [],
            documents: []
          };
          
          // Use a batch to write everything
          const batch = writeBatch(db);
          
          // Add trip
          batch.set(tripRef, firestoreTrip);
          
          // Add all events with Firestore IDs
          eventsWithFirestoreIds.forEach(event => {
            const eventRef = doc(db, 'events', event.id);
            batch.set(eventRef, event);
          });
          
          // Add all documents with Firestore IDs
          documentsWithFirestoreIds.forEach(document => {
            const documentRef = doc(db, 'documents', document.id);
            batch.set(documentRef, document);
          });
          
          // Commit the batch
          await batch.commit();
          
          // Now update local state with the Firestore IDs
          // We need to recreate the full trip object with the right references
          const localTripWithFirestoreIds = {
            ...trip,
            id: firestoreTripId,
            events: trip.events.map(event => ({
              ...event,
              id: eventIdMap.get(event.id)
            })),
            documents: trip.documents.map(document => ({
              ...document,
              id: documentIdMap.get(document.id),
              associatedEvents: document.associatedEvents.map(
                eventId => eventIdMap.get(eventId) || eventId
              )
            }))
          };
          
          // Replace the old trip with the new Firestore version instead of adding both
          set((state) => ({
            trips: state.trips.filter(t => t.id !== trip.id).concat(localTripWithFirestoreIds)
          }));
          
        } catch (error) {
          // If Firestore fails, fall back to local storage with original IDs
          console.error('Error adding trip to Firestore:', error);
          set((state) => ({ trips: [...state.trips, trip] }));
          set({ error: error instanceof Error ? error.message : 'Failed to save trip' });
        }
      },
      
      removeTrip: async (id) => {
        const user = useUserStore.getState().user;
        
        console.log(`Attempting to delete trip ${id}, authenticated user: ${user?.uid || 'none'}`);
        
        // Update local state first
        set((state) => ({ trips: state.trips.filter(trip => trip.id !== id) }));
        
        // Skip Firestore if user is not authenticated
        if (!user) {
          console.log('User not authenticated, skipping Firestore delete');
          return;
        }
        
        try {
          // Log user info for debugging
          console.log(`Deleting trip as user ${user.uid}`);
          
          // Get the trip to find associated events and documents
          const tripRef = doc(db, 'trips', id);
          console.log(`Checking if trip ${id} exists in Firestore`);
          
          const tripDoc = await getDoc(tripRef);
          
          if (!tripDoc.exists()) {
            console.warn(`Trip ${id} not found in Firestore, skipping delete`);
            return;
          }
          
          const tripData = tripDoc.data();
          console.log(`Trip data for ${id}:`, tripData);
          
          // Check ownership
          if (tripData.userId !== user.uid) {
            console.error(`Not authorized to delete this trip. Owner: ${tripData.userId}, Current user: ${user.uid}`);
            set({ error: 'Not authorized to delete this trip' });
            return;
          }
          
          // Delete the trip document first - this is the most important part
          try {
            console.log(`Directly deleting trip ${id}`);
            await deleteDoc(tripRef);
            console.log(`Successfully deleted trip ${id}`);
            
            // Even if cleanup fails later, the trip is now deleted, which is the main goal
          } catch (deleteError) {
            console.error(`Failed to delete trip ${id}:`, deleteError);
            throw deleteError; // Re-throw to be caught by outer catch
          }
            
          // Try to clean up related data, but don't fail if this part encounters errors
          try {
            console.log(`Now cleaning up related events and documents for trip ${id}`);
            
            // Find events to delete - include userId in the query for proper permissions
            const eventsQuery = query(
              collection(db, 'events'), 
              where('tripId', '==', id),
              where('userId', '==', user.uid)
            );
            const eventSnapshot = await getDocs(eventsQuery);
            console.log(`Found ${eventSnapshot.size} events to delete for trip ${id}`);
            
            // Delete events
            for (const eventDoc of eventSnapshot.docs) {
              try {
                console.log(`Deleting event ${eventDoc.id}`);
                await deleteDoc(eventDoc.ref);
              } catch (e) {
                console.error(`Failed to delete event ${eventDoc.id}:`, e);
                // Continue with other deletions
              }
            }
            
            // Find documents to delete - include userId in the query for proper permissions
            const documentsQuery = query(
              collection(db, 'documents'), 
              where('tripId', '==', id),
              where('userId', '==', user.uid)
            );
            const documentSnapshot = await getDocs(documentsQuery);
            console.log(`Found ${documentSnapshot.size} documents to delete for trip ${id}`);
            
            // Delete documents using the proper deleteDocument function
            for (const docSnapshot of documentSnapshot.docs) {
              try {
                console.log(`Deleting document ${docSnapshot.id} (includes Storage file)`);
                console.log(`Document data:`, docSnapshot.data());
                await deleteDocument(docSnapshot.id); // This handles both Firestore + Storage
                console.log(`Successfully completed deletion of document ${docSnapshot.id}`);
              } catch (e) {
                console.error(`Failed to delete document ${docSnapshot.id}:`, e);
                // Log more details about the error
                if (e && typeof e === 'object') {
                  console.error('Error details:', {
                    name: (e as any).name,
                    message: (e as any).message,
                    code: (e as any).code,
                    stack: (e as any).stack
                  });
                }
                // Continue with other deletions
              }
            }
            
          } catch (cleanupError) {
            // Log cleanup errors but don't fail the whole operation
            // The main trip deletion was already successful
            console.error(`Error during cleanup of related data:`, cleanupError);
            console.log(`Trip ${id} was still deleted successfully despite cleanup errors`);
          }
          
        } catch (error) {
          console.error('Error deleting trip from Firestore:', error);
          // Try to get more error details
          if (error && typeof error === 'object' && 'code' in error) {
            console.error('Error code:', error.code);
          }
          if (error && typeof error === 'object' && 'message' in error) {
            console.error('Error message:', error.message);
          }
          
          // Set user-visible error
          set({ error: error instanceof Error ? error.message : 'Failed to delete trip' });
          
          // Restore the trip in local state since deletion failed
          const trip = get().trips.find(t => t.id === id);
          if (trip) {
            set((state) => ({ trips: [...state.trips, trip!] }));
          }
        }
      },
      
      updateTrip: async (id, updatedTrip) => {
        const user = useUserStore.getState().user;
        
        // Update local state first
        set((state) => ({
        trips: state.trips.map(trip => 
          trip.id === id ? { ...trip, ...updatedTrip } : trip
        )
        }));
        
        // Skip Firestore if user is not authenticated
        if (!user) return;
        
        try {
          const tripRef = doc(db, 'trips', id);
          
          // Format data for Firestore (timestamps)
          const firestoreData: any = {
            ...updatedTrip,
            updatedAt: Timestamp.now(),
          };
          
          // Convert dates if present
          if (updatedTrip.startDate) {
            firestoreData.startDate = new Date(updatedTrip.startDate);
          }
          
          if (updatedTrip.endDate) {
            firestoreData.endDate = new Date(updatedTrip.endDate);
          }
          
          // Handle events separately if they're being updated
          if (updatedTrip.events) {
            // Don't include events array in the trip document update
            delete firestoreData.events;
            
            // No need to update events here as they're stored in a separate collection
            // Events should be updated using updateEvent, addEvent, removeEvent
          }
          
          // Handle documents separately if they're being updated
          if (updatedTrip.documents) {
            // Don't include documents array in the trip document update
            delete firestoreData.documents;
            
            // No need to update documents here as they're stored in a separate collection
            // Documents should be updated using addDocument, removeDocument
          }
          
          await updateDoc(tripRef, firestoreData);
          
        } catch (error) {
          console.error('Error updating trip in Firestore:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update trip' });
        }
      },
      
      addEvent: async (tripId, event) => {
        const user = useUserStore.getState().user;
        
        // If not authenticated, just use the local ID
        if (!user) {
          // Create a temporary UUID if no ID exists
          const eventWithId = event.id ? event : { ...event, id: crypto.randomUUID() };
          
          set((state) => ({
            trips: state.trips.map(trip =>
              trip.id === tripId
                ? { ...trip, events: [...trip.events, eventWithId] }
                : trip
            )
          }));
          return;
        }
        
        try {
          // Generate a new Firestore ID for the event
          const eventsCollection = collection(db, 'events');
          const eventRef = doc(eventsCollection); // This creates a new document reference with a Firestore ID
          const firestoreEventId = eventRef.id;
          
          // Create event object with Firestore ID
          const firestoreEvent = {
            ...event,
            id: firestoreEventId,
            tripId,
            userId: user.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            // Convert dates
            start: event.start ? new Date(event.start) : null,
            end: event.end ? new Date(event.end) : null,
          };
          
          // Save to Firestore
          await setDoc(eventRef, firestoreEvent);
          
          // Update local state with the Firestore ID
          set((state) => ({
            trips: state.trips.map(trip =>
              trip.id === tripId
                ? { 
                    ...trip, 
                    events: [...trip.events, { 
                      ...event, 
                      id: firestoreEventId 
                    }] 
                  }
                : trip
            )
          }));
          
        } catch (error) {
          // On error, update local state with original ID
          console.error('Error adding event to Firestore:', error);
          set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, events: [...trip.events, event] }
            : trip
        )
          }));
          set({ error: error instanceof Error ? error.message : 'Failed to save event' });
        }
      },
      
      removeEvent: async (tripId, eventId) => {
        const user = useUserStore.getState().user;
        
        console.log(`Attempting to delete event ${eventId} from trip ${tripId}`);
        
        // Update local state first
        set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, events: trip.events.filter(event => event.id !== eventId) }
            : trip
        )
        }));
        
        // Skip Firestore if user is not authenticated
        if (!user) return;
        
        try {
          // Delete from events collection
          const eventRef = doc(db, 'events', eventId);
          
          // Check if the event exists and belongs to the user
          const eventDoc = await getDoc(eventRef);
          if (!eventDoc.exists()) {
            console.warn(`Event ${eventId} not found in Firestore`);
            return;
          }
          
          const eventData = eventDoc.data();
          if (eventData.userId !== user.uid) {
            console.error('Not authorized to delete this event');
            set({ error: 'Not authorized to delete this event' });
            return;
          }
          
          // Now delete the event
          await deleteDoc(eventRef);
          console.log(`Successfully deleted event ${eventId}`);
          
          // Update any documents that reference this event - include userId in the query
          const documentsQuery = query(
            collection(db, 'documents'), 
            where('userId', '==', user.uid),
            where('tripId', '==', tripId)
          );
          
          const documentSnapshot = await getDocs(documentsQuery);
          console.log(`Found ${documentSnapshot.size} documents to check for event references`);
          
          // Update documents one by one instead of using a batch
          for (const doc of documentSnapshot.docs) {
            try {
              const documentData = doc.data();
              
              // Only update if this document references the event
              if (documentData.associatedEvents && documentData.associatedEvents.includes(eventId)) {
                const updatedAssociatedEvents = documentData.associatedEvents.filter(
                  (id: string) => id !== eventId
                );
                
                await updateDoc(doc.ref, { 
                  associatedEvents: updatedAssociatedEvents,
                  updatedAt: Timestamp.now()
                });
                
                console.log(`Updated document ${doc.id} to remove event reference`);
              }
            } catch (e) {
              console.error(`Failed to update document ${doc.id}:`, e);
              // Continue with other documents
            }
          }
          
        } catch (error) {
          console.error('Error removing event from Firestore:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to remove event' });
        }
      },
      
      updateEvent: async (tripId, eventId, updatedEvent) => {
        const user = useUserStore.getState().user;
        
        // Update local state first
        set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? {
                ...trip,
                events: trip.events.map(event =>
                  event.id === eventId 
                    ? { ...event, ...updatedEvent } as Event 
                    : event
                )
              }
            : trip
        )
        }));
        
        // Skip Firestore if user is not authenticated
        if (!user) return;
        
        try {
          const eventRef = doc(db, 'events', eventId);
          
          // Format data for Firestore
          const firestoreData: any = {
            ...updatedEvent,
            updatedAt: Timestamp.now(),
          };
          
          // Convert dates if present
          if (updatedEvent.start) {
            firestoreData.start = new Date(updatedEvent.start);
          }
          
          if (updatedEvent.end) {
            firestoreData.end = new Date(updatedEvent.end);
          }
          
          await updateDoc(eventRef, firestoreData);
          
        } catch (error) {
          console.error('Error updating event in Firestore:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update event' });
        }
      },
      
      addDocument: async (tripId, document) => {
        const user = useUserStore.getState().user;
        
        // If not authenticated, just use local ID
        if (!user) {
          set((state) => ({
            trips: state.trips.map(trip =>
              trip.id === tripId
                ? { ...trip, documents: [...trip.documents, document] }
                : trip
            )
          }));
          return;
        }
        
        try {
          // Generate a Firestore ID for the document
          const documentsCollection = collection(db, 'documents');
          const documentRef = doc(documentsCollection);
          const firestoreDocId = documentRef.id;
          
          // Create document with Firestore ID
          const firestoreDocument = {
            ...document,
            id: firestoreDocId,
            tripId,
            userId: user.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          // Save to Firestore
          await setDoc(documentRef, firestoreDocument);
          
          // Update local state with Firestore ID
          set((state) => ({
            trips: state.trips.map(trip =>
              trip.id === tripId
                ? { 
                    ...trip, 
                    documents: [...trip.documents, {
                      ...document,
                      id: firestoreDocId
                    }] 
                  }
                : trip
            )
          }));
          
        } catch (error) {
          // On error, update local state with original ID
          console.error('Error adding document to Firestore:', error);
          set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, documents: [...trip.documents, document] }
            : trip
        )
          }));
          set({ error: error instanceof Error ? error.message : 'Failed to save document' });
        }
      },
      
      removeDocument: async (tripId, documentId) => {
        const user = useUserStore.getState().user;
        
        console.log(`Attempting to delete document ${documentId} from trip ${tripId}`);
        
        // Update local state first
        set((state) => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, documents: trip.documents.filter(doc => doc.id !== documentId) }
            : trip
        )
        }));
        
        // Skip Firestore if user is not authenticated
        if (!user) return;
        
        try {
          // Delete from documents collection
          const documentRef = doc(db, 'documents', documentId);
          
          // Check if the document exists and belongs to the user
          const docSnapshot = await getDoc(documentRef);
          if (!docSnapshot.exists()) {
            console.warn(`Document ${documentId} not found in Firestore`);
            return;
          }
          
          const documentData = docSnapshot.data();
          if (documentData.userId !== user.uid) {
            console.error('Not authorized to delete this document');
            set({ error: 'Not authorized to delete this document' });
            return;
          }
          
          // Now delete the document
          await deleteDoc(documentRef);
          console.log(`Successfully deleted document ${documentId}`);
          
        } catch (error) {
          console.error('Error removing document from Firestore:', error);
          if (error && typeof error === 'object' && 'code' in error) {
            console.error('Error code:', error.code);
          }
          if (error && typeof error === 'object' && 'message' in error) {
            console.error('Error message:', error.message);
          }
          set({ error: error instanceof Error ? error.message : 'Failed to remove document' });
        }
      },
      
      setTrips: (trips) => set({ trips }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setEventsForTrip: (tripId, newEvents) => {
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === tripId
              ? {
                  ...trip,
                  // Assuming newEvents are already in the correct string format for dates
                  // as they come from enrichAndSaveEventCoordinates which processes them.
                  events: newEvents,
                }
              : trip
          ),
        }));
      },
    }),
    {
      name: 'trip-storage',
    }
  )
);
