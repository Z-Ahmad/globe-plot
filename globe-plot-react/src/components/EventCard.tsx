import React, { useState } from 'react';
import { Event } from '@/types/trip';
import { format, parseISO } from 'date-fns';
import { getEventStyle } from '@/styles/eventStyles';
import { MoreHorizontal, Map, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (id: string) => void;
  onViewOnMap?: (id: string) => void;
}

// Helper functions for date/time formatting
const formatTime = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return '';
  }
};

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onEdit,
  onDelete,
  onViewOnMap
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { icon: Icon, color, bgColor, borderColor, hoverBgColor } = getEventStyle(event);

  const handleDelete = async () => {
    if (onDelete) {
      try {
        setIsDeleting(true);
        setDeleteError('');
        await onDelete(event.id);
        setShowDeleteDialog(false);
      } catch (err) {
        console.error('Error deleting event:', err);
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete event');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
      <div 
        className={`p-4 border ${borderColor} rounded-lg ${bgColor} hover:${hoverBgColor} transition-colors cursor-pointer`}
        onClick={() => onEdit && onEdit(event)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className="font-medium truncate">{event.title}</h4>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={getEventStyle(event).bgColor}>
                  {onEdit && (
                    <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onEdit(event);
                    }}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                  )}
                  
                  {onViewOnMap && (
                    <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onViewOnMap(event.id);
                    }}>
                      <Map className="mr-2 h-4 w-4" />
                      <span>View on Map</span>
                    </DropdownMenuItem>
                  )}
                  
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }} 
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground mt-1">
              <span>{formatTime(event.start)}</span>
              {event.end && (
                <>
                  <span>-</span>
                  <span>{formatTime(event.end)}</span>
                </>
              )}
            </div>
            
            <div className="mt-2 text-sm">
              {/* Location display based on event type */}
              {event.category === 'travel' && (
                <div className="flex items-center text-muted-foreground">
                  {event.departure?.location?.name} → {event.arrival?.location?.name}
                </div>
              )}
              
              {event.category !== 'travel' && (
                <div className="text-muted-foreground">
                  {event.location?.name || event.location?.city || 'No location specified'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to delete "{event.title}"? This action cannot be undone.
          </AlertDialogDescription>
          {deleteError && (
            <div className="bg-destructive/10 border border-destructive text-destructive p-3 my-3 rounded-md text-sm">
              <p className="font-medium">Error: {deleteError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 