import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore, Trip, Event, ExperienceEvent } from '../stores/tripStore';
import { v4 as uuidv4 } from 'uuid';
import { useUserStore } from '../stores/userStore';
import { enrichAndSaveEventCoordinates } from '@/lib/mapboxService';
import { uploadDocument, updateDocumentAssociatedEvents, DocumentMetadata } from '@/lib/firebaseService';
import { apiPost } from '@/lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

import { EventEditor } from "@/components/Event/EventEditor";
import { Button } from "@/components/ui/button";
import { Plus, Upload, FilePlus, FileText, FileX, Loader2, CheckCircle2, XCircle, ArrowRight, ArrowLeft, CalendarDays, CalendarSearch, MapPin, MapPinCheckInside, Sparkles, Check } from "lucide-react";
import { EventList } from "@/components/Event/EventList";
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { TripProvider } from '@/context/TripContext';

interface DocumentItem {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  events: any[];
  documentMetadata?: DocumentMetadata;
}

type FormStep = 'trip-details' | 'document-upload' | 'event-review';

export const NewTrip = () => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>('trip-details');
  const [editingEvents, setEditingEvents] = useState<Event[]>([]);
  const [currentEditingEvent, setCurrentEditingEvent] = useState<Event | null>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [totalEventsFound, setTotalEventsFound] = useState(0);
  const [tempTripId] = useState<string>(uuidv4());
  const [direction, setDirection] = useState<1 | -1>(1);

  const goForward = (step: FormStep) => { setDirection(1); setCurrentStep(step); };
  const goBack = (step: FormStep) => { setDirection(-1); setCurrentStep(step); };

  const API_URL = import.meta.env.VITE_API_URL;
  
  const navigate = useNavigate();
  const { addTrip } = useTripStore();
  const { user } = useUserStore.getState();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocuments = Array.from(files).map(file => ({
        file,
        id: uuidv4(),
        status: 'pending' as const,
        events: []
      }));
      
      setDocuments(prev => [...prev, ...newDocuments]);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const processDocuments = async () => {
    if (documents.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const pendingDocs = documents.filter(doc => doc.status === 'pending');
    let processedDocs = [...documents]; // Work with a local copy
    
    for (let i = 0; i < pendingDocs.length; i++) {
      const documentToProcess = pendingDocs[i];
      const docId = documentToProcess.id;
      
      // Update status to processing
      processedDocs = processedDocs.map(doc => 
        doc.id === docId ? { ...doc, status: 'processing' as const } : doc
      );
      setDocuments(processedDocs);
      
      try {
        // First, upload the document using the new API client
        const formData = new FormData();
        formData.append('document', documentToProcess.file);

        const uploadResponse = await apiPost('documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (uploadResponse.status !== 200) {
          throw new Error('Failed to upload document');
        }

        const uploadResult = uploadResponse.data;
        
        // Then, parse the text with Mistral using the new API client
        const parseResponse = await apiPost('documents/parse-mistral', { 
          text: uploadResult.text 
        });

        if (parseResponse.status !== 200) {
          throw new Error('Failed to parse document');
        }

        const parsedData = parseResponse.data;
        const newEvents = parsedData.events || [];
        
        // Update our local copy of processed docs
        processedDocs = processedDocs.map(doc => 
          doc.id === docId 
            ? { 
                ...doc, 
                status: 'completed' as const, 
                events: newEvents
              } 
            : doc
        );
        
        // Update the state
        setDocuments(processedDocs);
        
        // Update total events found
        const totalEvents = processedDocs.reduce((sum, doc) => sum + doc.events.length, 0);
        setTotalEventsFound(totalEvents);
        
      } catch (error) {
        console.error('Error processing document:', error);
        // Update document with error status
        // Note: Rate limiting errors (429) are already handled by the API client with toast messages
        processedDocs = processedDocs.map(doc => 
          doc.id === docId 
            ? { 
                ...doc, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Failed to process document'
              } 
            : doc
        );
        setDocuments(processedDocs);
      }
      
      // Update progress
      setProcessingProgress(Math.round(((i + 1) / pendingDocs.length) * 100));
    }
    
    // Make sure progress bar reaches 100% even with fast processing
    setProcessingProgress(100);
    
    // Use the final processed docs to extract all events
    console.log("Processed docs:", processedDocs);
    console.log("Events found:", processedDocs.flatMap(doc => doc.events));
    
    // Load events after all documents are processed (using processedDocs, not documents state)
    const allEvents = processedDocs.flatMap(doc => 
      doc.events.map(event => ({
        ...event,
        id: event.id || uuidv4()
      }))
    ).sort((a, b) => {
      const aTime = a.start ? new Date(a.start).getTime() : 0;
      const bTime = b.start ? new Date(b.start).getTime() : 0;
      return aTime - bTime;
    });
    
    console.log("All events to be added to review:", allEvents);
    
    // Show success notification before changing state
    if (allEvents.length > 0) {
      const completedDocsCount = processedDocs.filter(doc => doc.status === 'completed').length;
      toast.success(
        `${allEvents.length} ${allEvents.length === 1 ? 'event' : 'events'} found from ${completedDocsCount} documents`, 
        
      );
    } else {
      toast.error(
        "No events found", 
        {
          duration: 4000,
        }
      );
    }
    
    // Add a delay to let users see the progress bar complete and toast notification
    setTimeout(() => {
      setEditingEvents(allEvents);
      setIsProcessing(false);
      goForward('event-review');
    }, 1000); // 1 second delay
  };


  const sortEvents = (events: Event[]) => {
    const sorted = [...events].sort((a, b) => {
      const aTime = a.start ? new Date(a.start).getTime() : 0;
      const bTime = b.start ? new Date(b.start).getTime() : 0;
      return aTime - bTime;
    });
    return sorted;
  };

  const handleEditEvent = (event: Event) => {
    setCurrentEditingEvent({...event});
    setShowEventEditor(true);
  };

  const createNewEvent = (event: Event) => {
    setCurrentEditingEvent(event);
    setShowEventEditor(true);
  };

  const handleSaveEventEdit = (updatedEvent: Event) => {
    if (!updatedEvent) return;
    
    let updatedEvents: Event[];
    
    // For new events, add to the list
    if (!editingEvents.some(e => e.id === updatedEvent.id)) {
      updatedEvents = [...editingEvents, updatedEvent];
    } else {
      // Update existing event
      updatedEvents = editingEvents.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
    }
    
    // Resort events to maintain chronological order
    const sortedEvents = sortEvents(updatedEvents);
    setEditingEvents(sortedEvents);
    
    setShowEventEditor(false);
    setCurrentEditingEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEditingEvents(prev => prev.filter(event => event.id !== eventId));
  };

  const handleSubmitTrip = async () => {
    // Show loading state
    setIsProcessing(true);
    
    // Generate a unique ID for the trip
    const tripId = uuidv4();
    
    // Make sure all events have proper start/end times before saving
    let processedEvents = editingEvents.map(event => {
      // Create a copy of the event
      let updatedEvent = {...event};
      
      // Ensure required location objects exist
      if (!updatedEvent.location) {
        updatedEvent.location = { name: '', city: '', country: '' };
      }
      
      if (updatedEvent.category === 'travel') {
        if (!updatedEvent.departure) updatedEvent.departure = { date: '', location: { name: '', city: '', country: '' } };
        if (!updatedEvent.departure.location) updatedEvent.departure.location = { name: '', city: '', country: '' };
        
        if (!updatedEvent.arrival) updatedEvent.arrival = { date: '', location: { name: '', city: '', country: '' } };
        if (!updatedEvent.arrival.location) updatedEvent.arrival.location = { name: '', city: '', country: '' };
        
        // Ensure top-level location is populated from departure.location
        updatedEvent.location = {...updatedEvent.departure.location};
      }
      
      if (updatedEvent.category === 'accommodation') {
        if (!updatedEvent.checkIn) updatedEvent.checkIn = { date: '', location: { name: '', city: '', country: '' } };
        if (!updatedEvent.checkIn.location) updatedEvent.checkIn.location = { name: '', city: '', country: '' };
        
        if (!updatedEvent.checkOut) updatedEvent.checkOut = { date: '', location: { name: '', city: '', country: '' } };
        if (!updatedEvent.checkOut.location) updatedEvent.checkOut.location = { name: '', city: '', country: '' };
        
        // Ensure top-level location is populated from checkIn.location
        updatedEvent.location = {...updatedEvent.checkIn.location};
      }
      
      // Handle legacy data format (migrate city/country to appropriate location)
      if ('city' in updatedEvent || 'country' in updatedEvent) {
        const city = (updatedEvent as any).city || '';
        const country = (updatedEvent as any).country || '';
        
        // Move city/country to the appropriate location object based on event category
        if (updatedEvent.category === 'travel' && updatedEvent.departure) {
          updatedEvent.departure.location.city = city;
          updatedEvent.departure.location.country = country;
          // Also update the top-level location
          updatedEvent.location.city = city;
          updatedEvent.location.country = country;
        } 
        else if (updatedEvent.category === 'accommodation' && updatedEvent.checkIn) {
          updatedEvent.checkIn.location.city = city;
          updatedEvent.checkIn.location.country = country;
          // Also update the top-level location
          updatedEvent.location.city = city;
          updatedEvent.location.country = country;
        }
        else if (updatedEvent.location) {
          updatedEvent.location.city = city;
          updatedEvent.location.country = country;
        }
        
        // Remove the old top-level properties
        delete (updatedEvent as any).city;
        delete (updatedEvent as any).country;
      }
      
      // Update the start/end time based on category
      if (updatedEvent.category === 'accommodation') {
        // Update start time from check-in time
        if (updatedEvent.checkIn?.date) {
          updatedEvent.start = updatedEvent.checkIn.date;
        }
        // Update end time from check-out time
        if (updatedEvent.checkOut?.date) {
          updatedEvent.end = updatedEvent.checkOut.date;
        }
      } else if (updatedEvent.category === 'travel') {
        // Update start time from departure time
        if (updatedEvent.departure?.date) {
          updatedEvent.start = updatedEvent.departure.date;
        }
        // Update end time from arrival time
        if (updatedEvent.arrival?.date) {
          updatedEvent.end = updatedEvent.arrival.date;
        }
      } else if (updatedEvent.category === 'experience') {
        // Update start time from startDate
        const expEvent = updatedEvent as ExperienceEvent;
        if (expEvent.startDate) {
          updatedEvent.start = expEvent.startDate;
        }
        // Update end time from endDate
        if (expEvent.endDate) {
          updatedEvent.end = expEvent.endDate;
        }
      } else if (updatedEvent.category === 'meal') {
        // For meals, use the same time for both start and end
        if (updatedEvent.date) {
          updatedEvent.start = updatedEvent.date;
          updatedEvent.end = updatedEvent.date;
        }
      }
      
      return updatedEvent;
    });
    
    // If user is authenticated, geocode events before creating the trip
    if (user) {
      try {
        console.log(`NewTrip: User authenticated, attempting to geocode ${processedEvents.length} events for trip ${tripId}`);
        // Pass the tripId that will be assigned to newTrip.
        // forceUpdate is false as these are new events.
        processedEvents = await enrichAndSaveEventCoordinates(tripId, processedEvents, false);
        const geocodedCount = processedEvents.filter(e => 
          (e.location?.geolocation) || 
          (e.category === 'travel' && e.departure?.location?.geolocation) ||
          (e.category === 'accommodation' && e.checkIn?.location?.geolocation)
        ).length;
        console.log(`NewTrip: Geocoding complete, ${geocodedCount} events now have coordinates.`);
      } catch (geoError) {
        console.error('NewTrip: Error during geocoding events:', geoError);
        toast.error('Could not geocode locations for some events. They can be geocoded later from the map view.');
        // Continue with non-geocoded or partially geocoded events
      }
    }
    
    // Create new trip with edited events (documents will be uploaded after trip creation)
    const newTrip: Trip = {
      id: tripId,
      userId: user?.uid || '',
      name,
      startDate,
      endDate,
      events: processedEvents,
      documents: [] // Documents will be uploaded after trip creation
    };
    
    toast.promise(
      (async () => {
        try {
          // Add trip to store (which will now handle both local storage and Firestore)
          // and get back the version with final Firestore IDs
          const createdTrip: Trip | undefined = await addTrip(newTrip);
          
          // Upload documents AFTER trip creation with final Firestore IDs
          if (user && documents.length > 0) {
            console.log('NewTrip: Uploading documents with final Firestore IDs...');
            
            if (createdTrip) {
              console.log('NewTrip: Found created trip with final IDs:', createdTrip.id);
              
              for (const doc of documents) {
                if (doc.status === 'completed') {
                  try {
                    console.log('NewTrip: Processing document:', doc.file.name, 'with extracted events:', doc.events);
                    
                    // Find corresponding events in the created trip using the final Firestore IDs
                    const eventIdsFromThisDoc = doc.events
                      .map(docEvent => {
                        // Find the event in the created trip by matching properties
                        const matchingEvent = createdTrip.events.find((e: Event) => 
                          e.title === docEvent.title && 
                          e.category === docEvent.category &&
                          e.start === docEvent.start
                        );
                        console.log('NewTrip: Matching event for doc event:', {
                          docEvent: { title: docEvent.title, category: docEvent.category, start: docEvent.start },
                          foundMatch: !!matchingEvent,
                          matchingEventId: matchingEvent?.id
                        });
                        return matchingEvent?.id;
                      })
                      .filter(id => id) as string[];
                      
                    console.log(`NewTrip: Document ${doc.file.name} will be associated with final event IDs:`, eventIdsFromThisDoc);
                    
                    // Upload document to Firebase Storage with final trip and event IDs
                    const documentMetadata = await uploadDocument(doc.file, createdTrip.id, eventIdsFromThisDoc);
                    
                    console.log(`NewTrip: Successfully uploaded document:`, {
                      name: documentMetadata.name,
                      id: documentMetadata.id,
                      tripId: documentMetadata.tripId,
                      associatedEvents: documentMetadata.associatedEvents
                    });
                    
                  } catch (error) {
                    console.error('NewTrip: Error uploading document:', error);
                    // Continue with other documents
                  }
                }
              }
              
              
            } else {
              console.warn('NewTrip: addTrip did not return the created trip for document upload');
            }
          }
          
          // If successful, navigate to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard');
            setIsProcessing(false);
          }, 500);
          
          return createdTrip; // Return trip for success message
        } catch (error) {
          console.error('Error creating trip:', error);
          setIsProcessing(false);
          throw error; // Rethrow to trigger the error toast
        }
      })(),
      {
        loading: `Creating your trip "${name}"...`,
        success: `Trip "${name}" created successfully!`,
        error: `Failed to create trip: ${(err: Error) => err.message || 'Unknown error'}`,
      },
      {
        success: {
          duration: 4000,
          icon: <MapPinCheckInside size={20} />,
        },
      }
    );
  };

  // Count total events across all documents
  const totalEvents = documents.reduce((sum, doc) => sum + doc.events.length, 0);
  
  // Check if any documents are still processing
  const hasProcessingDocuments = documents.some(doc => doc.status === 'processing');
  
  // Count documents by status
  const pendingCount = documents.filter(doc => doc.status === 'pending').length;
  const completedCount = documents.filter(doc => doc.status === 'completed').length;
  const errorCount = documents.filter(doc => doc.status === 'error').length;
  
  // Empty state to display when there are no events
  const emptyState = (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-primary text-2xl">🗓️</span>
      </div>
      <h2 className="text-xl font-semibold mb-2">No events found</h2>
      <p className="text-muted-foreground mb-6">No events found. Try processing more documents or add events manually.</p>
      <Button onClick={() => createNewEvent({
        id: uuidv4(),
        category: 'experience',
        type: 'activity',
        title: 'New Event',
        start: '',
        location: {
          name: '',
          city: '',
          country: ''
        }
      } as any)} className="flex items-center gap-2">
        <Plus size={16} />
        <span>Add Your First Event</span>
      </Button>
    </div>
  );

  // Animation variants — custom prop carries slide direction (+1 forward, -1 back)
  const pageVariants = {
    initial: (d: number) => ({ opacity: 0, x: d * 60 }),
    animate: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -60 }),
  };

  const stepTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const documentItemVariants = {
    hidden: { x: -20, opacity: 0, scale: 0.95 },
    visible: { 
      x: 0, 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      x: 20, 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const progressVariants = {
    hidden: { scaleX: 0 },
    visible: { 
      scaleX: 1,
      transition: { duration: 0.5, ease: "easeInOut" }
    }
  };

  const renderTripDetailsStep = () => (
    <motion.div 
      key="trip-details"
      custom={direction}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={stepTransition}
      className="max-w-md mx-auto bg-card border border-border rounded-xl p-8 shadow-sm"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h1 className='text-2xl font-bold'>Create New Trip</h1>
        </motion.div>
        
          <form onSubmit={(e) => { e.preventDefault(); goForward('document-upload'); }}>
          <motion.div variants={itemVariants} className="mb-6">
            <label className="block text-sm font-medium mb-2" htmlFor="name">
              Trip Name
            </label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              placeholder="European Adventure"
              required
            />
          </motion.div>
          
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="startDate">
                Start Date
              </label>
              <div className="relative">
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-input rounded-md px-2 py-2 bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="endDate">
                End Date
              </label>
              <div className="relative">
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-input rounded-md px-2 py-2 bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex justify-between">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                type="submit" 
                disabled={!name || !startDate || !endDate}
                className="gap-2"
              >
                Continue
                <ArrowRight size={16} />
              </Button>
            </motion.div>
          </motion.div>
        </form>
      </motion.div>
    </motion.div>
  );

  const renderDocumentUploadStep = () => (
    <motion.div 
      key="document-upload"
      custom={direction}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={stepTransition}
      className="max-w-md mx-auto bg-card border border-border rounded-xl p-8 shadow-sm"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <h1 className='text-2xl font-bold'>Upload Travel Documents</h1>
        </motion.div>
        
        <motion.div variants={itemVariants} className="text-sm text-muted-foreground mb-6">
          <p>Upload booking confirmations, tickets, and reservations to automatically extract your itinerary.</p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="mb-6">
          {documents.length === 0 ? (
            <motion.div 
              whileHover={{ scale: 1.02, borderColor: "rgb(var(--primary))" }}
              whileTap={{ scale: 0.98 }}
              className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-all duration-300"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload size={24} className="text-primary" />
              </div>
              <p className="font-medium mb-1">Upload Documents</p>
              <p className="text-sm text-muted-foreground mb-4">Drag and drop or click to select files</p>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Button size="sm" variant="secondary" className="gap-2">
                  <FilePlus size={16} />
                  Browse Files
                </Button>
              </motion.div>
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.eml,.txt,image/*"
                multiple
              />
            </motion.div>
          ) : (
            <motion.div layout>
              <motion.div 
                variants={itemVariants}
                className="flex justify-between items-center mb-4"
              >
                <h2 className="font-medium">Uploaded Documents ({documents.length})</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                >
                  + Add More
                </motion.button>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".pdf,.eml,.txt,image/*"
                  multiple
                />
              </motion.div>
              
              <motion.ul 
                layout
                className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4"
              >
                <AnimatePresence>
                  {documents.map(doc => (
                    <motion.li 
                      key={doc.id}
                      variants={documentItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      className="bg-background border border-border rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          doc.status === 'pending' && "bg-muted text-muted-foreground",
                          doc.status === 'processing' && "bg-blue-100 text-blue-600",
                          doc.status === 'completed' && "bg-green-100 text-green-600",
                          doc.status === 'error' && "bg-red-100 text-red-600"
                        )}>
                          {doc.status === 'pending' && <FileText size={16} />}
                          {doc.status === 'processing' && <Loader2 size={16} className="animate-spin" />}
                          {doc.status === 'completed' && <CheckCircle2 size={16} />}
                          {doc.status === 'error' && <XCircle size={16} />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate font-medium">{doc.file.name}</p>
                          <motion.p 
                            key={doc.status}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-muted-foreground"
                          >
                            {doc.status === 'completed' ? 
                              `${doc.events.length} events found` : 
                              `${Math.round(doc.file.size / 1024)} KB`
                            }
                          </motion.p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, color: "rgb(239 68 68)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <FileX size={16} />
                      </motion.button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
              
              {/* Status summary */}
              {documents.length > 0 && (
                <motion.div 
                  variants={itemVariants}
                  className="flex items-center gap-4 text-xs text-muted-foreground mb-6"
                >
                  <AnimatePresence>
                    {pendingCount > 0 && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1"
                      >
                        <FileText size={12} /> {pendingCount} pending
                      </motion.span>
                    )}
                    {completedCount > 0 && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1 text-green-600"
                      >
                        <CheckCircle2 size={12} /> {completedCount} processed
                      </motion.span>
                    )}
                    {errorCount > 0 && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1 text-red-500"
                      >
                        <XCircle size={12} /> {errorCount} failed
                      </motion.span>
                    )}
                    {totalEvents > 0 && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1 text-primary ml-auto"
                      >
                        {totalEvents} events found
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
        
        <motion.div variants={itemVariants} className="flex justify-between mt-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => goBack('trip-details')}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
          </motion.div>
          
          {documents.length > 0 && pendingCount > 0 ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={processDocuments}
                disabled={isProcessing || hasProcessingDocuments}
                className="gap-2"
              >
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </motion.div>
                  ) : (
                    <motion.div
                      key="process"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2"
                    >
                      Process Documents
                      <ArrowRight size={16} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => goForward('event-review')} 
                className="gap-2"
              >
                Continue
                <ArrowRight size={16} />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );

  const renderProcessingStep = () => (
    <motion.div 
      key="processing"
      custom={direction}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={stepTransition}
      className="max-w-md mx-auto bg-card border border-border rounded-xl p-8 shadow-sm"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-primary" />
          </div>
          <h1 className='text-xl font-bold'>Processing Documents</h1>
        </motion.div>
        
        <motion.div variants={itemVariants} className="mb-4">
          <motion.div
            variants={progressVariants}
            initial="hidden"
            animate="visible"
          >
            <Progress value={processingProgress} className="h-2" />
          </motion.div>
        </motion.div>
        
        <motion.p variants={itemVariants} className="text-sm text-muted-foreground mb-6">
          Extracting events from your documents. This might take a moment...
        </motion.p>
        
        <motion.div 
          variants={itemVariants}
          className="p-4 bg-background rounded-lg border border-border mb-6"
        >
          <motion.div 
            layout
            className="flex justify-between items-center mb-2"
          >
            <span className='flex items-center gap-2'>
              <FileText size={16} />
              <span className="text-sm font-medium">Documents processed</span>
            </span>
            <motion.span 
              key={`${completedCount}-${documents.length}`}
              initial={{ scale: 1.2, color: "rgb(34 197 94)" }}
              animate={{ scale: 1, color: "inherit" }}
              transition={{ duration: 0.3 }}
              className="text-sm font-medium"
            >
              {completedCount}/{documents.length}
            </motion.span>
          </motion.div>
          <motion.div 
            layout
            className="flex justify-between items-center"
          >
            <span className="flex items-center gap-2">
              <CalendarSearch size={16} />
              <span className="text-sm font-medium">Events found</span>
            </span>
            <motion.span 
              key={totalEventsFound}
              initial={{ scale: 1.2, color: "rgb(34 197 94)" }}
              animate={{ scale: 1, color: "inherit" }}
              transition={{ duration: 0.3 }}
              className="text-sm font-medium"
            >
              {totalEventsFound}
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );

  const renderEventReviewStep = () => (
    <motion.div 
      key="event-review"
      custom={direction}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={stepTransition}
      className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-8 shadow-sm"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-6">
          <motion.div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <CalendarSearch className="w-5 h-5 text-primary" />
            </div>
            <h1 className='text-2xl font-bold'>Review Events for "{name}"</h1>
          </motion.div>
          <div className="flex justify-start">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => createNewEvent({
                id: uuidv4(),
                category: 'experience',
                type: 'activity',
                title: 'New Event',
                start: '',
                location: {
                  name: '',
                  city: '',
                  country: ''
                }
                } as any)} 
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Add Event</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <EventList 
            events={editingEvents}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
            onAddNew={() => createNewEvent({
              id: uuidv4(),
              category: 'experience',
              type: 'activity',
              title: 'New Event',
              start: '',
              location: {
                name: '',
                city: '',
                country: ''
              }
            } as any)}
            emptyState={emptyState}
          />
        </motion.div>
        
        <motion.div variants={itemVariants} className="flex justify-between mt-8">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="outline"
              onClick={() => goBack('document-upload')}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleSubmitTrip}
              disabled={isProcessing}
              className="gap-2"
            >
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="creating"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 size={16} className="animate-spin" />
                    Creating Trip...
                  </motion.div>
                ) : (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2"
                  >
                    <MapPinCheckInside size={16} />
                    Create Trip
                    {editingEvents.length > 0 && ` with ${editingEvents.length} Events`}
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );

  const STEPS: { id: FormStep; label: string }[] = [
    { id: 'trip-details', label: 'Trip Details' },
    { id: 'document-upload', label: 'Documents' },
    { id: 'event-review', label: 'Review' },
  ];
  const activeStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <TripProvider tripId={tempTripId}>
      <main className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Ambient background blobs */}
        <div className="absolute inset-0 bg-background pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Step progress indicator */}
        <div className="relative z-10 flex items-center gap-0 mb-8 w-full max-w-xs">
          {STEPS.map((step, index) => {
            const isCompleted = index < activeStepIndex;
            const isCurrent = index === activeStepIndex;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-300",
                    isCurrent && "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    isCompleted && "border-primary/60 bg-primary/10 text-primary",
                    !isCurrent && !isCompleted && "border-muted-foreground/30 text-muted-foreground/40"
                  )}>
                    {isCompleted ? <Check size={13} /> : index + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-medium whitespace-nowrap transition-colors duration-300",
                    isCurrent && "text-foreground",
                    isCompleted && "text-muted-foreground",
                    !isCurrent && !isCompleted && "text-muted-foreground/40"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-px mb-4 mx-2 transition-colors duration-500",
                    index < activeStepIndex ? "bg-primary/60" : "bg-muted-foreground/20"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step card */}
        <div className="relative z-10 w-full">
          <AnimatePresence mode="wait">
            {isProcessing && currentStep === 'document-upload' ? (
              renderProcessingStep()
            ) : (
              currentStep === 'trip-details' ? renderTripDetailsStep() :
              currentStep === 'document-upload' ? renderDocumentUploadStep() :
              renderEventReviewStep()
            )}
          </AnimatePresence>
        </div>

        {/* Event Editor Dialog */}
        <EventEditor
          event={currentEditingEvent}
          isOpen={showEventEditor}
          onClose={() => setShowEventEditor(false)}
          onSave={handleSaveEventEdit}
          showViewOnMap={false}
          shouldFetchDocuments={false}
        />
      </main>
    </TripProvider>
  );
};
