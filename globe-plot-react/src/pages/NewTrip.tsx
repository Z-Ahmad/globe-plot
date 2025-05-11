import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore, Trip, Event, ExperienceEvent } from '../stores/tripStore';
import { v4 as uuidv4 } from 'uuid';

import { EventEditor } from "@/components/EventEditor";
import { Button } from "@/components/ui/button";
import { Plus, Upload, FilePlus, FileText, FileX, Loader2, CheckCircle2, XCircle, ArrowRight, ArrowLeft, CalendarDays, CalendarSearch, MapPin, MapPinCheckInside } from "lucide-react";
import { EventList } from "@/components/EventList";
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DocumentItem {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  events: any[];
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

  const API_URL = import.meta.env.VITE_API_URL;
  
  const navigate = useNavigate();
  const { addTrip } = useTripStore();

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

  const handleProcessAllDocuments = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const pendingDocs = documents.filter(doc => doc.status === 'pending');
    let processedDocs = [...documents];
    
    for (let i = 0; i < pendingDocs.length; i++) {
      const docId = pendingDocs[i].id;
      const documentToProcess = processedDocs.find(doc => doc.id === docId);
      
      if (!documentToProcess) continue;
      
      // Update status to processing
      processedDocs = processedDocs.map(doc => 
        doc.id === docId ? { ...doc, status: 'processing' as const } : doc
      );
      setDocuments(processedDocs);
      
      try {
        // First, upload the document
        const formData = new FormData();
        formData.append('document', documentToProcess.file);

        const uploadResponse = await fetch(`${API_URL}/api/documents/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload document');
        }

        const uploadResult = await uploadResponse.json();
        
        // Then, parse the text with Mistral
        const parseResponse = await fetch(`${API_URL}/api/documents/parse-mistral`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: uploadResult.text 
          }),
        });

        if (!parseResponse.ok) {
          throw new Error('Failed to parse document');
        }

        const parsedData = await parseResponse.json();
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
      setCurrentStep('event-review');
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
    const normalizedEvents = editingEvents.map(event => {
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
    
    // Process all uploaded documents
    const tripDocuments = documents.map(doc => ({
      id: doc.id,
      name: doc.file.name,
      type: determineDocumentType(doc.file),
      url: URL.createObjectURL(doc.file),
      associatedEvents: [] as string[]
    }));
    
    // Create new trip with edited events
    const newTrip: Trip = {
      id: tripId,
      name,
      startDate,
      endDate,
      events: normalizedEvents,
      documents: tripDocuments
    };
    
    // Custom toast styling for trip creation
    const customToastStyle = {
      background: 'rgb(209, 250, 229)', // Light teal background (teal-100)
      color: 'rgb(6, 95, 70)',          // Dark teal text (teal-800)
      border: '1px solid rgb(167, 243, 208)', // Light teal border (teal-200)
      borderRadius: '8px',
      padding: '12px 16px',
    };
    
    // Use toast.promise for trip creation
    toast.promise(
      (async () => {
        try {
          // Add trip to store (which will now handle both local storage and Firestore)
          await addTrip(newTrip);
          
          // If successful, navigate to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard');
            setIsProcessing(false);
          }, 500);
          
          return newTrip; // Return trip for success message
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
        style: customToastStyle,
        success: {
          duration: 4000,
          icon: <MapPinCheckInside color="rgb(6, 95, 70)" size={24} />,
        },
      }
    );
  };

  // Helper function to determine document type
  const determineDocumentType = (file: File): "pdf" | "email" | "image" => {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.includes('pdf')) {
      return 'pdf';
    } else if (mimeType.includes('message') || mimeType.includes('eml') || mimeType.includes('email')) {
      return 'email';
    } else {
      return 'image';
    }
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

  const renderTripDetailsStep = () => (
    <div className="max-w-md mx-auto bg-card border border-border rounded-lg p-8 shadow-sm">
      <h1 className='text-2xl font-bold mb-6'>Create New Trip</h1>
      
      <form onSubmit={(e) => { e.preventDefault(); setCurrentStep('document-upload'); }}>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" htmlFor="name">
            Trip Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 bg-background"
            placeholder="European Adventure"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="startDate">
              Start Date
            </label>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-input rounded-md pl-10 pr-3 py-2 bg-background"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="endDate">
              End Date
            </label>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-input rounded-md pl-10 pr-3 py-2 bg-background"
                required
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!name || !startDate || !endDate}
            className="gap-2"
          >
            Continue
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </div>
  );

  const renderDocumentUploadStep = () => (
    <div className="max-w-md mx-auto bg-card border border-border rounded-lg p-8 shadow-sm">
      <h1 className='text-2xl font-bold mb-6'>Upload Travel Documents</h1>
      
      <div className="text-sm text-muted-foreground mb-6">
        <p>Upload booking confirmations, tickets, and reservations to automatically extract your itinerary.</p>
      </div>
      
      <div className="mb-6">
        {documents.length === 0 ? (
          <div 
            className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload size={24} className="text-primary" />
            </div>
            <p className="font-medium mb-1">Upload Documents</p>
            <p className="text-sm text-muted-foreground mb-4">Drag and drop or click to select files</p>
            <Button size="sm" variant="secondary" className="gap-2">
              <FilePlus size={16} />
              Browse Files
            </Button>
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              accept=".pdf,.eml,.txt,image/*"
              multiple
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium">Uploaded Documents ({documents.length})</h2>
              <button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
              >
                + Add More
              </button>
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.eml,.txt,image/*"
                multiple
              />
            </div>
            
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
              {documents.map(doc => (
                <li key={doc.id} className="bg-background border border-border rounded-lg p-3 flex items-center justify-between">
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
                      <p className="text-xs text-muted-foreground">
                        {doc.status === 'completed' ? 
                          `${doc.events.length} events found` : 
                          `${Math.round(doc.file.size / 1024)} KB`
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <FileX size={16} />
                  </button>
                </li>
              ))}
            </ul>
            
            {/* Status summary */}
            {documents.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
                {pendingCount > 0 && <span className="flex items-center gap-1"><FileText size={12} /> {pendingCount} pending</span>}
                {completedCount > 0 && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={12} /> {completedCount} processed</span>}
                {errorCount > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle size={12} /> {errorCount} failed</span>}
                {totalEvents > 0 && <span className="flex items-center gap-1 text-primary ml-auto">{totalEvents} events found</span>}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-6">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => setCurrentStep('trip-details')}
          className="gap-2"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        
        {documents.length > 0 && pendingCount > 0 ? (
          <Button 
            onClick={handleProcessAllDocuments}
            disabled={isProcessing || hasProcessingDocuments}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Process Documents
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={() => setCurrentStep('event-review')} 
            className="gap-2"
          >
            Continue
            <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="max-w-md mx-auto bg-card border border-border rounded-lg p-8 shadow-sm">
      <h1 className='text-xl font-bold mb-6 flex items-center gap-2'>
        <Loader2 size={20} className="animate-spin text-primary" />
        Processing Documents
      </h1>
      
      <Progress value={processingProgress} className="h-2 mb-4" />
      
      <p className="text-sm text-muted-foreground mb-6">
        Extracting events from your documents. This might take a moment...
      </p>
      
      <div className="p-4 bg-background rounded-lg border border-border mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className='flex items-center gap-2'>
            <FileText size={16} />
            <span className="text-sm font-medium">Documents processed</span>
          </span>
            <span className="text-sm font-medium">{completedCount}/{documents.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <CalendarSearch size={16} />
            <span className="text-sm font-medium">Events found</span>
          </span>
          <span className="text-sm font-medium">{totalEventsFound}</span>
        </div>
      </div>
    </div>
  );

  const renderEventReviewStep = () => (
    <div className="max-w-3xl mx-auto bg-card border border-border rounded-lg p-8 shadow-sm">
      <div className="mb-6">
        <h1 className='text-2xl font-bold'>Review Events for "{name}"</h1>
        <div className="flex justify-start mt-2">
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
        </div>
      </div>
      
      <EventList 
        events={editingEvents}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onAddNew={createNewEvent}
        emptyState={emptyState}
      />
      
      <div className="flex justify-between mt-8">
        <Button 
          variant="outline"
          onClick={() => setCurrentStep('document-upload')}
          className="gap-2"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button 
          onClick={handleSubmitTrip}
          disabled={isProcessing}
          className="gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating Trip...
            </>
          ) : (
            <>
              Create Trip
              {editingEvents.length > 0 && ` with ${editingEvents.length} Events`}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <main className='p-6 min-h-[calc(100vh-4rem)] flex items-center justify-center'>
      {isProcessing && currentStep === 'document-upload' ? (
        renderProcessingStep()
      ) : (
        currentStep === 'trip-details' ? renderTripDetailsStep() :
        currentStep === 'document-upload' ? renderDocumentUploadStep() :
        renderEventReviewStep()
      )}

      {/* Event Editor Dialog */}
      <EventEditor
        event={currentEditingEvent}
        isOpen={showEventEditor}
        onClose={() => setShowEventEditor(false)}
        onSave={handleSaveEventEdit}
      />
    </main>
  );
};
