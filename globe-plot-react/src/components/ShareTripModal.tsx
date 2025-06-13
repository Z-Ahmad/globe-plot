import React, { useState, useEffect } from 'react';
import { Trip, ShareInvitation } from '../types/trip';
import { 
  createShareInvitation, 
  listenForTripInvitations, 
  revokeTripAccess 
} from '../lib/firebaseService';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Send, Trash2, Loader2, User, Clock, CheckCircle, Ban } from 'lucide-react';

interface ShareTripModalProps {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareTripModal = ({ trip, open, onOpenChange }: ShareTripModalProps) => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [invitations, setInvitations] = useState<ShareInvitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  useEffect(() => {
    if (!trip || !open) {
      setInvitations([]); // Clear invitations when modal is closed or trip is not available
      return;
    }

    setLoadingInvites(true);
    const unsubscribe = listenForTripInvitations(
      trip.id, 
      trip.userId, 
      (fetchedInvitations) => {
        setInvitations(fetchedInvitations);
        setLoadingInvites(false); // Set loading to false once we have data
      }
    );

    // Cleanup listener on unmount or when dependencies change
    return () => unsubscribe();
    
  }, [trip, open]);

  const handleSendInvitation = async () => {
    if (!trip || !email) {
      toast.error("Please enter an email address.");
      return;
    }
    setIsSending(true);
    try {
      await createShareInvitation(trip.id, trip.name, email);
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRevokeAccess = async (invitation: ShareInvitation) => {
    if (!trip) return;
    try {
      await revokeTripAccess(trip.id, invitation.id, invitation.inviteeUid);
      toast.success(`Access revoked for ${invitation.inviteeEmail}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke access.");
    }
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{trip.name}"</DialogTitle>
          <DialogDescription>
            Invite others to view and edit this trip. You can revoke access at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-4">
          <h3 className="text-sm font-medium mb-2">Invite someone new</h3>
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <Input 
              type="email" 
              placeholder="user@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSending}
            />
            <Button onClick={handleSendInvitation} disabled={isSending} size="icon">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="pt-4">
          <h3 className="text-sm font-medium mb-2">Who has access</h3>
          {loadingInvites ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invitations.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{inv.inviteeEmail}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {inv.status === 'pending' && <><Clock className="h-3 w-3" /><span>Pending</span></>}
                        {inv.status === 'accepted' && <><CheckCircle className="h-3 w-3 text-green-500" /><span>Accepted</span></>}
                        {inv.status === 'declined' && <><Ban className="h-3 w-3 text-red-500" /><span>Declined</span></>}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRevokeAccess(inv)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">You haven't shared this trip with anyone yet.</p>
          )}
        </div>

        <DialogFooter className='pt-4'>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 