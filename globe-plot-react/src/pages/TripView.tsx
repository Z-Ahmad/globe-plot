import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Event, ExperienceEvent, MealEvent } from '../types/trip';
import { EventEditor } from '@/components/Event/EventEditor';
import { 
  MapPinPlusInside, 
  X,
  Sparkles,
  List,
  ChevronLeft,
  Plus,
  Share2,
  Pencil,
  Check,
} from 'lucide-react';
import { ShareTripModal } from '@/components/ShareTripModal';
import { useTripStore } from '@/stores/tripStore';
import { formatDateRange } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { TripProvider, useTripContext } from '@/context/TripContext';
import { toast } from 'react-hot-toast';
import { DocumentUploadModal } from '@/components/DocumentUploadModal';
import { uploadDocument } from '@/lib/firebaseService';
import { useUserStore } from '../stores/userStore';
import { Loader2 } from 'lucide-react';
import { MapView } from '@/components/Map/MapView';
import { EventList } from '@/components/Event/EventList';
import { Itinerary } from '@/components/Itinerary';
import { TripQueryAssistant } from '@/components/AI/TripQueryAssistant';
import { cn } from '@/lib/utils';
import { useIsOnline } from '@/hooks/useIsOnline';

// Floating Action Button Component
const FloatingActionButton = React.memo(({ 
  icon: Icon, 
  onClick, 
  label,
  variant = "default",
  className = "",
  showLabel = false
}: { 
  icon: React.ElementType;
  onClick: () => void;
  label: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  showLabel?: boolean;
}) => {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={showLabel ? "sm" : "icon"}
      className={cn(
        showLabel
          ? "h-11 rounded-full px-4 shadow-lg hover:shadow-xl transition-shadow bg-background/90 backdrop-blur-sm"
          : "h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow",
        className
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />
      {showLabel && <span className="ml-2 text-sm font-medium">{label}</span>}
    </Button>
  );
});

FloatingActionButton.displayName = 'FloatingActionButton';

interface SidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  widthClassName: string;
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({
  isOpen,
  onClose,
  side,
  widthClassName,
  header,
  children,
  footer,
}) => {
  const sideClass = side === 'left' ? 'left-0 border-r' : 'right-0 border-l';
  const translateClass =
    side === 'left'
      ? (isOpen ? 'translate-x-0' : '-translate-x-full')
      : (isOpen ? 'translate-x-0' : 'translate-x-full');

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          "fixed top-0 h-full bg-background border-border z-50 transition-transform duration-300 ease-in-out flex flex-col",
          sideClass,
          widthClassName,
          translateClass
        )}
      >
        {header}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
        {footer ? <div className="p-4 border-t border-border">{footer}</div> : null}
      </div>
    </>
  );
};

// Custom hook to provide consistent handlers across components
function useEventHandlers() {
  const { updateEvent, addEvent, removeEvent, tripId } = useTripContext();
  const [currentEditingEvent, setCurrentEditingEvent] = useState<Event | null>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [pendingExtractedEvents, setPendingExtractedEvents] = useState<Event[]>([]);
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(null);
  const [showMultiEventReview, setShowMultiEventReview] = useState(false);
  const [reviewingEvents, setReviewingEvents] = useState<Event[]>([]);
  const [isSavingMultipleEvents, setIsSavingMultipleEvents] = useState(false);
  const user = useUserStore((state) => state.user);

  // Handlers for event actions
  const handleEditEvent = useCallback((event: Event) => {
    setCurrentEditingEvent(event);
    setShowEventEditor(true);
  }, []);

  const handleSaveEventEdit = useCallback(async (updatedEvent: Event) => {
    try {
      // Check if this is a new event
      const isNewEvent = !updatedEvent.id || (updatedEvent.id && updatedEvent.id.includes('-'));
      
      if (isNewEvent) {
        // Check if we're in multi-event review mode
        if (showMultiEventReview) {
          setReviewingEvents(prev => 
            prev.map(e => e.id === updatedEvent.id ? updatedEvent : e)
          );
          setShowEventEditor(false);
          setCurrentEditingEvent(null);
          return;
        }
        
        // Single event flow
        await addEvent(updatedEvent);
        console.log(`Added new event "${updatedEvent.title}"`);
        toast.success(`Event "${updatedEvent.title}" added to your trip!`);
        
        // Upload document if pending
        if (pendingDocumentFile && user && tripId) {
          try {
            setTimeout(async () => {
              try {
                console.log('Uploading document for newly created event:', updatedEvent.id);
                await uploadDocument(pendingDocumentFile, tripId, [updatedEvent.id]);
              } catch (docError) {
                console.error('Error uploading document:', docError);
                toast.error('Event saved but failed to upload document');
              }
              
              setPendingDocumentFile(null);
              setPendingExtractedEvents([]);
            }, 100);
          } catch (docError) {
            console.error('Error in document upload flow:', docError);
          }
        }
      } else {
        // Update existing event
        await updateEvent(updatedEvent.id, updatedEvent);
        console.log(`Updated event "${updatedEvent.title}"`);
      }
      
      setShowEventEditor(false);
      setCurrentEditingEvent(null);
      
      if (!isNewEvent && !showMultiEventReview) {
        setPendingDocumentFile(null);
        setPendingExtractedEvents([]);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [addEvent, updateEvent, pendingDocumentFile, user, tripId, showMultiEventReview]);

  const handleCloseEventEditor = useCallback(() => {
    setShowEventEditor(false);
    setCurrentEditingEvent(null);
    if (!showMultiEventReview) {
      setPendingDocumentFile(null);
      setPendingExtractedEvents([]);
    }
  }, [showMultiEventReview]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      if (showMultiEventReview) {
        setReviewingEvents(prev => prev.filter(e => e.id !== eventId));
      } else {
        await removeEvent(eventId);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }, [removeEvent, showMultiEventReview]);

  const handleSaveAllReviewedEvents = useCallback(async () => {
    if (reviewingEvents.length === 0) {
      toast.error('No events to save');
      return;
    }

    setIsSavingMultipleEvents(true);
    
    try {
      const savedEventIds: string[] = [];
      
      for (const event of reviewingEvents) {
        await addEvent(event);
        savedEventIds.push(event.id);
        console.log(`Added event "${event.title}" to trip`);
      }
      
      if (pendingDocumentFile && user && tripId && savedEventIds.length > 0) {
        try {
          await uploadDocument(pendingDocumentFile, tripId, savedEventIds);
          console.log('Document uploaded and associated with events:', savedEventIds);
        } catch (docError) {
          console.error('Error uploading document:', docError);
          toast.error('Events saved but failed to upload document');
        }
      }
      
      toast.success(`${reviewingEvents.length} event${reviewingEvents.length === 1 ? '' : 's'} added to your trip!`);
      
      setShowMultiEventReview(false);
      setReviewingEvents([]);
      setPendingDocumentFile(null);
      setPendingExtractedEvents([]);
      
    } catch (error) {
      console.error('Error saving multiple events:', error);
      toast.error('Failed to save some events: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSavingMultipleEvents(false);
    }
  }, [reviewingEvents, addEvent, pendingDocumentFile, user, tripId]);

  const handleCancelMultiEventReview = useCallback(() => {
    setShowMultiEventReview(false);
    setReviewingEvents([]);
    setPendingDocumentFile(null);
    setPendingExtractedEvents([]);
  }, []);

  const handleDocumentProcessingComplete = useCallback((extractedEvents: Event[], originalFile: File | null) => {
    console.log('Document processing complete:', { extractedEvents, originalFile });
    
    setShowDocumentUploadModal(false);
    
    if (extractedEvents.length > 1) {
      const eventsWithIds = extractedEvents.map(event => ({
        ...event,
        id: event.id || uuidv4()
      }));
      
      setReviewingEvents(eventsWithIds);
      setPendingExtractedEvents(eventsWithIds);
      setPendingDocumentFile(originalFile);
      setShowMultiEventReview(true);
      
      toast.success(`${extractedEvents.length} events extracted. Review and edit them below, then save to add to your trip.`, {
        duration: 5000,
      });
    } else if (extractedEvents.length === 1) {
      const firstEvent = {
        ...extractedEvents[0],
        id: extractedEvents[0].id || uuidv4()
      };
      
      setPendingExtractedEvents(extractedEvents);
      setPendingDocumentFile(originalFile);
      setCurrentEditingEvent(firstEvent);
      setShowEventEditor(true);
      
      toast.success(`1 event extracted. Review and save to add to your trip.`, {
        duration: 4000,
      });
    } else {
      const blankEvent: ExperienceEvent = {
        id: uuidv4(),
        category: 'experience',
        type: 'activity',
        title: 'New Event',
        start: '',
        startDate: '',
        endDate: '',
        location: {
          name: '',
          city: '',
          country: ''
        }
      };
      
      setPendingDocumentFile(originalFile);
      setCurrentEditingEvent(blankEvent);
      setShowEventEditor(true);
      
      if (originalFile) {
        toast('No events found in document. Please fill in the details manually.', {
          icon: 'ℹ️',
          duration: 4000,
        });
      }
    }
  }, []);

  const createNewEventInReview = useCallback(() => {
    const newEvent: ExperienceEvent = {
      id: uuidv4(),
      category: 'experience',
      type: 'activity',
      title: 'New Event',
      start: '',
      startDate: '',
      endDate: '',
      location: {
        name: '',
        city: '',
        country: ''
      }
    };
    
    setCurrentEditingEvent(newEvent);
    setShowEventEditor(true);
  }, []);

  const createNewEvent = useCallback(() => {
    setShowDocumentUploadModal(true);
  }, []);

  const emptyState = useMemo(() => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-primary text-2xl">🗓️</span>
      </div>
      <h2 className="text-xl font-semibold mb-2">No events added yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Add your first event to start planning your trip itinerary.
      </p>
      <Button onClick={createNewEvent} className="flex items-center gap-2">
        <MapPinPlusInside size={16} />
        <span>Add Your First Event</span>
      </Button>
    </div>
  ), [createNewEvent]);
  
  return {
    currentEditingEvent,
    showEventEditor,
    showDocumentUploadModal,
    showMultiEventReview,
    reviewingEvents,
    isSavingMultipleEvents,
    handleEditEvent,
    handleSaveEventEdit,
    handleCloseEventEditor,
    handleDeleteEvent,
    createNewEvent,
    createNewEventInReview,
    handleDocumentProcessingComplete,
    handleSaveAllReviewedEvents,
    handleCancelMultiEventReview,
    setShowDocumentUploadModal,
    emptyState
  };
}

// Inner content component
const TripContent = () => {
  const navigate = useNavigate();
  const { trip, tripId, loading } = useTripContext();
  const { user } = useUserStore();
  const [showItinerarySidebar, setShowItinerarySidebar] = useState(false);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const isOnline = useIsOnline();

  const isOwner = !!(trip && user && trip.userId === user.uid);

  const handleSaveDates = async () => {
    if (!tripId || !editStartDate || !editEndDate) return;
    try {
      await useTripStore.getState().updateTrip(tripId, {
        startDate: editStartDate,
        endDate: editEndDate,
      });
      setIsEditingDates(false);
      toast.success('Trip dates updated');
    } catch {
      toast.error('Failed to update dates');
    }
  };
  
  const { 
    currentEditingEvent, 
    showEventEditor,
    showDocumentUploadModal,
    showMultiEventReview,
    reviewingEvents,
    isSavingMultipleEvents,
    handleEditEvent,
    handleSaveEventEdit, 
    handleCloseEventEditor,
    handleDeleteEvent,
    createNewEvent,
    createNewEventInReview,
    handleDocumentProcessingComplete,
    handleSaveAllReviewedEvents,
    handleCancelMultiEventReview,
    setShowDocumentUploadModal,
    emptyState 
  } = useEventHandlers();

  const isNewEvent = useMemo(() => {
    if (!currentEditingEvent) return false;
    const hasValidId = currentEditingEvent.id && typeof currentEditingEvent.id === 'string' && currentEditingEvent.id.trim() !== '';
    return !hasValidId || (hasValidId && currentEditingEvent.id.includes('-'));
  }, [currentEditingEvent]);

  if (loading) {
    return (
      <div className="relative w-full overflow-hidden bg-background" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="absolute top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                <div className="h-3 w-32 rounded bg-muted animate-pulse hidden sm:block" />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="h-9 w-28 rounded-md bg-muted animate-pulse" />
              <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        <div className="absolute left-0 right-0 bottom-0 top-[57px] md:top-[65px]">
          <div className="w-full h-full p-0 md:p-6 lg:p-10 md:pt-2 lg:pt-2">
            <div className="relative w-full h-full rounded-none md:rounded-lg border-0 md:border md:border-border overflow-hidden bg-muted/60">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted">
                <div className="h-full w-1/3 rounded-r-full bg-primary/60 animate-pulse" />
              </div>
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/50 via-muted/20 to-muted/50" />
              <div className="absolute bottom-6 left-6 text-sm text-muted-foreground">
                Loading trip details...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Trip Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The trip you're looking for couldn't be found.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-full"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header Bar - Compact */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold leading-tight">{trip.name}</h1>
                {isOwner && (
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
                    title="Share trip"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isEditingDates ? (
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleSaveDates}
                    className="p-0.5 text-emerald-500 hover:text-emerald-600 transition-colors"
                    title="Save dates"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingDates(false)}
                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={isOwner ? () => {
                    setEditStartDate(trip.startDate.slice(0, 10));
                    setEditEndDate(trip.endDate.slice(0, 10));
                    setIsEditingDates(true);
                  } : undefined}
                  className={cn(
                    'text-xs text-muted-foreground flex items-center gap-1 truncate',
                    isOwner && 'hover:text-foreground transition-colors group'
                  )}
                >
                  <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                  {isOwner && (
                    <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button 
              onClick={() => setShowAISidebar(true)} 
              variant="outline"
              size="sm"
              disabled={!isOnline}
              title={!isOnline ? 'Travel Intelligence requires an internet connection' : undefined}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Travel Intelligence</span>
            </Button>
            <Button 
              onClick={createNewEvent} 
              size="sm"
              className="flex items-center gap-2"
            >
              <MapPinPlusInside size={16} />
              <span>Add Event</span>
            </Button>
          </div>

          {/* Mobile AI Action (kept minimal to avoid top-bar clutter) */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              onClick={() => setShowAISidebar(true)}
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={!isOnline}
              title={!isOnline ? 'Travel Intelligence requires an internet connection' : 'Travel Intelligence'}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button
              onClick={createNewEvent}
              variant="default"
              size="icon"
              className="h-9 w-9"
              title="Add Event"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map - Full Screen */}
      <div className="absolute left-0 right-0 bottom-0 top-[57px] md:top-[65px]">
        <div className="w-full h-full p-0 md:p-6 lg:p-10 md:pt-2 lg:pt-2">
          <MapView 
            className="w-full h-full rounded-none md:rounded-lg border-0 md:border md:border-border shadow-none md:shadow-sm"
            isVisible={true}
            onEditEventRequest={handleEditEvent}
          />
        </div>
      </div>

      {/* Floating Action Buttons - Mobile & Desktop */}
      <div className="fixed left-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-6 z-50 flex flex-col gap-3">
        <FloatingActionButton
          icon={List}
          onClick={() => setShowItinerarySidebar(true)}
          label="Itinerary"
          variant="secondary"
          showLabel={true}
          className="border border-border/70 dark:border-white/50"
        />
      </div>

      {/* Itinerary Sidebar */}
      <SidebarPanel
        isOpen={showItinerarySidebar}
        onClose={() => setShowItinerarySidebar(false)}
        side="left"
        widthClassName="w-[85vw] md:w-[400px]"
        header={
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="sm:inline">
                Itinerary
              </span>
              </h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowItinerarySidebar(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        }
        footer={
          <Button 
            onClick={createNewEvent} 
            className="w-full flex items-center gap-2"
          >
            <MapPinPlusInside size={16} />
            <span>Add Event</span>
          </Button>
        }
      >
        <Itinerary
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          onAddNew={createNewEvent}
          emptyState={emptyState}
          hideViewModeControls={true}
          lockViewMode="list"
          hideListAddButton={true}
        />
      </SidebarPanel>

      {/* AI Chat Sidebar */}
      {tripId && (
        <SidebarPanel
          isOpen={showAISidebar}
          onClose={() => setShowAISidebar(false)}
          side="right"
          widthClassName="w-[85vw] md:w-[450px]"
          header={
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-semibold">Travel Intelligence</h2>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowAISidebar(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          }
        >
          <div className="h-full overflow-hidden">
            <TripQueryAssistant 
              isOpen={true}
              onClose={() => setShowAISidebar(false)}
              tripId={tripId}
              embedded={true}
            />
          </div>
        </SidebarPanel>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showDocumentUploadModal}
        onClose={() => setShowDocumentUploadModal(false)}
        onProcessingComplete={handleDocumentProcessingComplete}
        tripId={tripId}
      />

      {/* Event Editor Dialog */}
      <EventEditor
        event={currentEditingEvent}
        isOpen={showEventEditor}
        onClose={handleCloseEventEditor}
        onSave={handleSaveEventEdit}
        showViewOnMap={!isNewEvent}
        shouldFetchDocuments={true}
      />

      {/* Multi-Event Review Modal */}
      {showMultiEventReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold mb-2">Review Extracted Events</h2>
              <p className="text-muted-foreground">
                {reviewingEvents.length} events were found in your document. Review and edit them below, then save to add them to your trip.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <EventList 
                events={reviewingEvents}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                onAddNew={createNewEventInReview}
                hideAddButton={true}
                emptyState={
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No events to review</p>
                    <Button onClick={createNewEventInReview} className="flex items-center gap-2">
                      <Plus size={16} />
                      <span>Add Event</span>
                    </Button>
                  </div>
                }
              />
            </div>
            
            <div className="p-6 border-t border-border flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={handleCancelMultiEventReview}
                disabled={isSavingMultipleEvents}
              >
                Cancel
              </Button>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {reviewingEvents.length} event{reviewingEvents.length === 1 ? '' : 's'} ready to save
                </span>
                <Button 
                  onClick={handleSaveAllReviewedEvents}
                  disabled={isSavingMultipleEvents || reviewingEvents.length === 0}
                  className="flex items-center gap-2"
                >
                  {isSavingMultipleEvents ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Events...</span>
                    </>
                  ) : (
                    <>
                      <span>Save {reviewingEvents.length} Event{reviewingEvents.length === 1 ? '' : 's'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOwner && (
        <ShareTripModal
          trip={trip}
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
        />
      )}
    </div>
  );
};

// Main component
export const TripView = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <TripProvider tripId={id || null}>
      <TripContent />
    </TripProvider>
  );
};
