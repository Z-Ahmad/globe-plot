import React, { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore, Trip, Event } from '../stores/tripStore';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from 'date-fns';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { getEventStyle } from '../styles/eventStyles';
import { EventCard } from "@/components/EventCard";
import { EventEditor } from "@/components/EventEditor";

// Helper functions for date and time formatting
const formatDate = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};

const formatTime = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return dateStr;
  }
};

interface DocumentItem {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  events: any[];
}

export const NewTrip = () => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'review'>('form');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editingEvents, setEditingEvents] = useState<Event[]>([]);
  const [currentEditingEvent, setCurrentEditingEvent] = useState<Event | null>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);

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

  const handleProcessDocument = async (docId: string) => {
    const documentToProcess = documents.find(doc => doc.id === docId);
    if (!documentToProcess) return;

    // Update status to processing
    setDocuments(prev => prev.map(doc => 
      doc.id === docId ? { ...doc, status: 'processing' as const } : doc
    ));

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
        body: JSON.stringify({ text: uploadResult.text }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse document');
      }

      const parsedData = await parseResponse.json();
      
      // Update document with parsed events and completed status
      setDocuments(prev => prev.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              status: 'completed' as const, 
              events: parsedData.events || [] 
            } 
          : doc
      ));
    } catch (error) {
      console.error('Error processing document:', error);
      // Update document with error status
      setDocuments(prev => prev.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Failed to process document'
            } 
          : doc
      ));
    }
  };

  const handleProcessAllDocuments = async () => {
    setIsProcessing(true);
    
    const pendingDocs = documents.filter(doc => doc.status === 'pending');
    
    for (const doc of pendingDocs) {
      await handleProcessDocument(doc.id);
    }
    
    setIsProcessing(false);
  };

  const handleReviewEvents = () => {
    // Sort events by start date
    const allEvents = documents.flatMap(doc => 
      doc.events.map(event => ({
        ...event,
        id: event.id || uuidv4()
      }))
    ).sort((a, b) => {
      const aTime = a.start ? new Date(a.start).getTime() : 0;
      const bTime = b.start ? new Date(b.start).getTime() : 0;
      return aTime - bTime;
    });
    
    // Set editing events and switch to review step
    setEditingEvents(allEvents);
    setCurrentStep('review');
  };

  const sortEvents = (events: Event[]) => {
    const sorted = [...events].sort((a, b) => {
      const aTime = a.start ? new Date(a.start).getTime() : 0;
      const bTime = b.start ? new Date(b.start).getTime() : 0;
      return aTime - bTime;
    });
    setEditingEvents(sorted);
  };

  const handleEditEvent = (event: Event) => {
    setCurrentEditingEvent({...event});
    setShowEventEditor(true);
  };

  const handleSaveEventEdit = (updatedEvent: Event) => {
    if (!updatedEvent) return;
    
    // Update the event in the state
    const updatedEvents = editingEvents.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    );
    
    // Resort events to maintain chronological order
    sortEvents(updatedEvents);
    
    setShowEventEditor(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEditingEvents(prev => prev.filter(event => event.id !== eventId));
  };

  const handleSubmitWithEditedEvents = () => {
    // Generate a unique ID for the trip
    const tripId = uuidv4();
    
    // Make sure all events have proper start/end times before saving
    const normalizedEvents = editingEvents.map(event => {
      // Create a copy of the event
      let updatedEvent = {...event};
      
      // Update the start/end time based on category
      if (updatedEvent.category === 'accommodation') {
        // Update start time from check-in time
        if (updatedEvent.checkIn?.time) {
          updatedEvent.start = updatedEvent.checkIn.time;
        }
        // Update end time from check-out time
        if (updatedEvent.checkOut?.time) {
          updatedEvent.end = updatedEvent.checkOut.time;
        }
      } else if (updatedEvent.category === 'travel') {
        // Update start time from departure time
        if (updatedEvent.departure?.time) {
          updatedEvent.start = updatedEvent.departure.time;
        }
        // Update end time from arrival time
        if (updatedEvent.arrival?.time) {
          updatedEvent.end = updatedEvent.arrival.time;
        }
      } else if (updatedEvent.category === 'experience') {
        // Update start time from startTime
        if (updatedEvent.startTime) {
          updatedEvent.start = updatedEvent.startTime;
        }
        // Update end time from endTime
        if (updatedEvent.endTime) {
          updatedEvent.end = updatedEvent.endTime;
        }
      } else if (updatedEvent.category === 'meal') {
        // For meals, use the same time for both start and end
        if (updatedEvent.time) {
          updatedEvent.start = updatedEvent.time;
          updatedEvent.end = updatedEvent.time;
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
      dateRange: `${startDate} - ${endDate}`,
      events: normalizedEvents,
      documents: tripDocuments
    };
    
    addTrip(newTrip);
    navigate('/dashboard');
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
  
  return (
    <main className='max-w-2xl mx-auto p-6'>
      {currentStep === 'form' ? (
        // Form step
      <div className="bg-card border border-border rounded-lg p-8">
        <h1 className='text-2xl font-bold mb-6'>Create New Trip</h1>
        
          <form onSubmit={(e) => { e.preventDefault(); handleReviewEvents(); }}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="name">
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
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="startDate">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 bg-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="endDate">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 bg-background"
                required
              />
            </div>
          </div>
            
            <div className="mb-6 border border-dashed border-input rounded-md p-4">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Add Travel Documents (Optional)
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload trip confirmations to automatically extract flight, hotel, and activity details.
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="text-sm"
                  accept=".pdf,.eml,.txt,image/*"
                  multiple
                />
                
                {documents.length > 0 && (
                  <div className="flex flex-col space-y-4 mt-2">
                    <div className="text-sm font-medium">
                      Documents ({documents.length})
                      {pendingCount > 0 && (
                        <button
                          type="button"
                          onClick={handleProcessAllDocuments}
                          disabled={isProcessing || hasProcessingDocuments}
                          className="ml-4 px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-xs hover:bg-secondary/90 transition-colors"
                        >
                          {isProcessing ? 'Processing...' : 'Process All'}
                        </button>
                      )}
                    </div>
                    
                    {/* Status summary */}
                    {documents.length > 0 && (
                      <div className="flex text-xs space-x-3 text-muted-foreground">
                        {pendingCount > 0 && <span>⏳ {pendingCount} pending</span>}
                        {completedCount > 0 && <span className="text-green-600">✓ {completedCount} completed</span>}
                        {errorCount > 0 && <span className="text-red-500">✗ {errorCount} failed</span>}
                        {totalEvents > 0 && <span className="text-primary">🗓 {totalEvents} events found</span>}
                      </div>
                    )}
                    
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {documents.map(doc => (
                        <li key={doc.id} className="text-sm border border-border rounded-md p-2 bg-background">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                              {doc.status === 'pending' && <span className="text-muted-foreground">⏳</span>}
                              {doc.status === 'processing' && <span className="text-blue-500">⟳</span>}
                              {doc.status === 'completed' && <span className="text-green-600">✓</span>}
                              {doc.status === 'error' && <span className="text-red-500">✗</span>}
                              <span>{doc.file.name}</span>
                            </div>
                            <div className="flex space-x-1">
                              {doc.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleProcessDocument(doc.id)}
                                  disabled={isProcessing || hasProcessingDocuments}
                                  className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded hover:bg-secondary/90"
                                >
                                  Process
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded hover:bg-destructive/20"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          
                          {/* Error message */}
                          {doc.status === 'error' && doc.error && (
                            <div className="mt-1 text-xs text-red-500">{doc.error}</div>
                          )}
                          
                          {/* Found events */}
                          {doc.status === 'completed' && doc.events.length > 0 && (
                            <div className="mt-1 ml-6">
                              <span className="text-xs font-medium text-green-600">
                                Found {doc.events.length} events
                              </span>
                              <ul className="text-xs text-muted-foreground mt-1 ml-2">
                                {doc.events.slice(0, 2).map((event, i) => (
                                  <li key={i}>• {event.type}: {event.title}</li>
                                ))}
                                {doc.events.length > 2 && (
                                  <li>• ...and {doc.events.length - 2} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button" 
              className="mr-2 px-4 py-2 border border-border rounded-full text-foreground"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full"
                disabled={isProcessing || hasProcessingDocuments || !name || !startDate || !endDate}
              >
                Review Events
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Review step
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-2xl font-semibold mb-4">Review Trip: {name}</h2>
          
          {/* Event review section */}
          <div className="space-y-4">
            {editingEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary text-2xl">🗓️</span>
                </div>
                <h2 className="text-xl font-semibold mb-2">No events found</h2>
                <p className="text-muted-foreground">No events found. Try processing more documents.</p>
              </div>
            ) : (
              editingEvents.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  showEditControls={true}
                  onEdit={handleEditEvent}
                  onDelete={handleDeleteEvent}
                />
              ))
            )}
          </div>
          
          <div className="flex justify-end mt-6">
            <button 
              type="button" 
              className="mr-2 px-4 py-2 border border-border rounded-full text-foreground"
              onClick={() => setCurrentStep('form')}
            >
              Back to Form
            </button>
            <button 
              type="button"
              onClick={handleSubmitWithEditedEvents} 
              disabled={editingEvents.length === 0}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full"
            >
              Create Trip with {editingEvents.length} Events
            </button>
          </div>
        </div>
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
