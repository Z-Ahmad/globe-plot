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

  const handleSaveEventEdit = () => {
    if (!currentEditingEvent) return;
    
    // Create updated event with proper start/end times
    let updatedEvent = {...currentEditingEvent};
    
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
        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className='text-2xl font-bold mb-6'>Review Trip: {name}</h1>
          <p className='text-muted-foreground mb-6'>
            {startDate} to {endDate} • {editingEvents.length} events
          </p>
          
          <div className="space-y-4 my-4">
            {editingEvents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No events found. Try processing more documents.</p>
              </div>
            ) : (
              editingEvents.map(event => {
                const { emoji, bgColor, borderColor, color } = getEventStyle(event);
                return (
                  <div key={event.id} className={`p-5 border rounded-lg shadow-sm ${borderColor} ${bgColor}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl mr-2">{emoji}</span>
                        <span className={`font-semibold text-lg ${color}`}>{event.title}</span>
                        <span className="text-xs bg-white/70 text-muted-foreground px-2 py-0.5 rounded-full">
                          {event.category} / {event.type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditEvent(event)} className="text-xs hover:bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEvent(event.id)} className="text-xs hover:bg-destructive/10 text-destructive px-2 py-1 rounded">
                          <Trash2Icon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {event.city}, {event.country}
                    </div>

                    {/* Travel Events */}
                    {event.category === "travel" && (
                      <div className="mt-2 text-xs">
                        {event.type === "flight" && (
                          <>
                            <div>
                              Flight: {event.flightNumber} {event.airline && `(${event.airline})`}
                            </div>
                            {event.departure && (
                              <div>
                                Departure: {event.departure.location?.name} @ {format(parseISO(event.departure.time), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                            {event.arrival && (
                              <div>
                                Arrival: {event.arrival.location?.name} @ {format(parseISO(event.arrival.time), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                            {event.seat && <div>Seat: {event.seat}</div>}
                            {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                          </>
                        )}
                        {/* Other travel types */}
                        {event.type === "train" && (
                          <>
                            <div>
                              Train: {event.trainNumber} {event.company && `(${event.company})`}
                            </div>
                            {event.departure && (
                              <div>
                                Departure: {event.departure.location?.name} @ {format(parseISO(event.departure.time), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                            {event.arrival && (
                              <div>
                                Arrival: {event.arrival.location?.name} @ {format(parseISO(event.arrival.time), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                            {event.seat && <div>Seat: {event.seat}</div>}
                            {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                          </>
                        )}
                        {event.type === "bus" && (
                          <>
                            <div>Bus: {event.company}</div>
                            {event.departure && (
                              <div>
                                Departure: {event.departure.location?.name} @ {format(parseISO(event.departure.time), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                            {event.arrival && (
                              <div>
                                Arrival: {event.arrival.location?.name} @ {format(parseISO(event.arrival.time), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                            {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                          </>
                        )}
                        {event.type === "car" && (
                          <>
                            <div>Car Rental: {event.company}</div>
                            {event.departure && (
                              <div>
                                Pick-up: {event.departure.location?.name} @ {format(parseISO(event.departure.time), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                            {event.arrival && (
                              <div>
                                Drop-off: {event.arrival.location?.name} @ {format(parseISO(event.arrival.time), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                            {event.carType && <div>Car Type: {event.carType}</div>}
                            {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                          </>
                        )}
                      </div>
                    )}

                    {/* Accommodation Events */}
                    {event.category === "accommodation" && (
                      <div className="mt-2 text-xs">
                        <div>Place: {event.placeName}</div>
                        {event.checkIn && (
                          <div>
                            Check-in: {event.checkIn.location?.name} @ {format(parseISO(event.checkIn.time), "MMM d, yyyy h:mm a")}
                          </div>
                        )}
                        {event.checkOut && (
                          <div>
                            Check-out: {event.checkOut.location?.name} @ {format(parseISO(event.checkOut.time), "MMM d, yyyy h:mm a")}
                          </div>
                        )}
                        {event.roomNumber && <div>Room: {event.roomNumber}</div>}
                        {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                      </div>
                    )}

                    {/* Experience Events */}
                    {event.category === "experience" && (
                      <div className="mt-2 text-xs">
                        {event.location && <div>Location: {event.location.name}</div>}
                        {event.startTime && <div>Start: {format(parseISO(event.startTime), "MMM d, yyyy h:mm a")}</div>}
                        {event.endTime && <div>End: {format(parseISO(event.endTime), "MMM d, yyyy h:mm a")}</div>}
                        {event.bookingReference && <div>Booking Ref: {event.bookingReference}</div>}
                      </div>
                    )}

                    {/* Meal Events */}
                    {event.category === "meal" && (
                      <div className="mt-2 text-xs">
                        {event.location && <div>Location: {event.location.name}</div>}
                        {event.time && <div>Time: {format(parseISO(event.time), "MMM d, yyyy h:mm a")}</div>}
                        {event.reservationReference && <div>Reservation Ref: {event.reservationReference}</div>}
                      </div>
                    )}
                  </div>
                );
              })
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
      {showEventEditor && currentEditingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Edit Event</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  value={currentEditingEvent.title} 
                  onChange={(e) => setCurrentEditingEvent({...currentEditingEvent, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input 
                    value={currentEditingEvent.city} 
                    onChange={(e) => setCurrentEditingEvent({...currentEditingEvent, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Input 
                    value={currentEditingEvent.country} 
                    onChange={(e) => setCurrentEditingEvent({...currentEditingEvent, country: e.target.value})}
                  />
                </div>
              </div>
              
              {/* Category-specific fields */}
              {currentEditingEvent.category === 'travel' && (
                <>
                  {/* Flight-specific fields */}
                  {currentEditingEvent.type === 'flight' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Airline</label>
                          <Input 
                            value={currentEditingEvent.airline || ''} 
                            onChange={(e) => setCurrentEditingEvent({...currentEditingEvent, airline: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Flight Number</label>
                          <Input 
                            value={currentEditingEvent.flightNumber || ''} 
                            onChange={(e) => setCurrentEditingEvent({...currentEditingEvent, flightNumber: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      {/* Departure */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Departure</label>
                        <Input 
                          type="datetime-local"
                          value={currentEditingEvent.departure?.time ? currentEditingEvent.departure.time.slice(0, 16) : ''} 
                          onChange={(e) => {
                            const updatedEvent = {
                              ...currentEditingEvent, 
                              departure: {
                                ...currentEditingEvent.departure,
                                time: e.target.value
                              },
                              // Also update start time
                              start: e.target.value
                            };
                            setCurrentEditingEvent(updatedEvent);
                          }}
                        />
                      </div>
                      
                      {/* Arrival */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Arrival</label>
                        <Input 
                          type="datetime-local"
                          value={currentEditingEvent.arrival?.time ? currentEditingEvent.arrival.time.slice(0, 16) : ''} 
                          onChange={(e) => {
                            const updatedEvent = {
                              ...currentEditingEvent, 
                              arrival: {
                                ...currentEditingEvent.arrival,
                                time: e.target.value
                              },
                              // Also update end time
                              end: e.target.value
                            };
                            setCurrentEditingEvent(updatedEvent);
                          }}
                        />
                      </div>

                      {/* Rest of travel type fields */}
                    </>
                  )}
                </>
              )}
              
              {currentEditingEvent.category === 'accommodation' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Place Name</label>
                    <Input 
                      value={currentEditingEvent.placeName || ''} 
                      onChange={(e) => setCurrentEditingEvent({...currentEditingEvent, placeName: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Check-in</label>
                      <Input 
                        type="datetime-local"
                        value={currentEditingEvent.checkIn?.time ? currentEditingEvent.checkIn.time.slice(0, 16) : ''} 
                        onChange={(e) => {
                          const updatedEvent = {
                            ...currentEditingEvent, 
                            checkIn: {
                              ...currentEditingEvent.checkIn,
                              time: e.target.value
                            },
                            // Also update start time automatically
                            start: e.target.value
                          };
                          setCurrentEditingEvent(updatedEvent);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Check-out</label>
                      <Input 
                        type="datetime-local"
                        value={currentEditingEvent.checkOut?.time ? currentEditingEvent.checkOut.time.slice(0, 16) : ''} 
                        onChange={(e) => {
                          const updatedEvent = {
                            ...currentEditingEvent, 
                            checkOut: {
                              ...currentEditingEvent.checkOut,
                              time: e.target.value
                            },
                            // Also update end time automatically
                            end: e.target.value
                          };
                          setCurrentEditingEvent(updatedEvent);
                        }}
                      />
                    </div>
                  </div>

                  {/* Rest of accommodation fields */}
                </>
              )}
              
              {/* Other event types similar to above */}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea 
                  value={currentEditingEvent.notes || ''} 
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCurrentEditingEvent({...currentEditingEvent, notes: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowEventEditor(false)}
                className="mr-2 px-4 py-2 border border-border rounded-full text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEventEdit}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
