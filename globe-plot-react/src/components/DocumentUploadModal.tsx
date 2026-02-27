import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { Upload, FilePlus, Loader2, FileText, CheckCircle2, XCircle, WifiOff } from 'lucide-react';
import { useIsOnline } from '@/hooks/useIsOnline';
import { apiPost } from '@/lib/apiClient';
import { Event } from '@/stores/tripStore'; // Ensure this path is correct
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessingComplete: (extractedEvents: Event[], originalFile: File | null) => void;
  tripId: string | null; // tripId might be needed for context or future features
}

interface DocumentItem {
  file: File;
  id: string; // client-side id for the item
  status: 'pending' | 'uploading' | 'parsing' | 'completed' | 'error';
  error?: string;
  extractedEvents?: Event[];
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onProcessingComplete,
  tripId, // Not used directly but good to have for context
}) => {
  const [documentItem, setDocumentItem] = useState<DocumentItem | null>(null);
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);
  const isOnline = useIsOnline();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentItem({
        file,
        id: uuidv4(),
        status: 'pending',
      });
    }
  };

  const handleRemoveDocument = useCallback(() => {
    if (!isProcessingGlobal) {
      setDocumentItem(null);
    }
  }, [isProcessingGlobal]);

  const processDocument = useCallback(async () => {
    if (!documentItem || documentItem.status !== 'pending') return;

    setIsProcessingGlobal(true);
    setDocumentItem(prev => prev ? { ...prev, status: 'uploading' } : null);
    const processingToastId = `doc-processing-${documentItem.id}`;

    try {
      toast.loading(`Uploading ${documentItem.file.name}...`, { id: processingToastId });
      const formData = new FormData();
      formData.append('document', documentItem.file);

      const uploadResponse = await apiPost('documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (uploadResponse.status !== 200 || !uploadResponse.data?.text) {
        const errorMsg = uploadResponse.data?.message || 'Failed to upload document or extract text.';
        toast.error(errorMsg, { id: processingToastId });
        throw new Error(errorMsg);
      }
      const { text: extractedText } = uploadResponse.data;

      setDocumentItem(prev => prev ? { ...prev, status: 'parsing' } : null);
      toast.loading(`Analyzing document...`, { id: processingToastId });

      const parseResponse = await apiPost('documents/parse-mistral', { text: extractedText });

      if (parseResponse.status !== 200) {
        const errorMsg = parseResponse.data?.message || 'Failed to parse document.';
        toast.error(errorMsg, { id: processingToastId });
        throw new Error(errorMsg);
      }

      const parsedEvents: Event[] = (parseResponse.data?.events || []).map((event: any) => ({
        ...event,
        id: event.id || uuidv4(), // Ensure events from AI have an ID
      }));

      setDocumentItem(prev => prev ? { ...prev, status: 'completed', extractedEvents: parsedEvents } : null);
      toast.dismiss(processingToastId); // Dismiss the loading toast, show one on the parent component

      onProcessingComplete(parsedEvents, documentItem.file);
      // Parent component will close the modal after opening EventEditor

    } catch (error: any) {
      let toastMessage = error.message || 'Failed to process document';
      if (error.response?.data?.message) { // Use server's error message if available
        toastMessage = error.response.data.message;
      }
      
      // The apiClient interceptor handles 429 errors by showing its own toast.
      // For other errors, update our specific toast (identified by processingToastId) to an error state.
      // react-hot-toast will update the existing toast if the ID matches.
      if (error.response?.status !== 429) {
        toast.error(toastMessage, { id: processingToastId });
      }
      // If it was a 429 error, the apiClient's interceptor has already shown a toast,
      // so we don't need to show another one here.

      console.error('Error processing document in modal:', error);
      setDocumentItem(prev => prev ? { ...prev, status: 'error', error: toastMessage } : null);
    } finally {
      setIsProcessingGlobal(false);
    }
  }, [documentItem, onProcessingComplete]);

  const handleSkipAndCreateBlank = useCallback(() => {
    onProcessingComplete([], null); // Pass empty events and no file
    // Parent will close this modal and open EventEditor with a blank event
  }, [onProcessingComplete]);

  useEffect(() => {
    // Reset local state if the modal is closed externally or isOpen becomes false
    if (!isOpen) {
      setDocumentItem(null);
      setIsProcessingGlobal(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isProcessingGlobal) onClose(); }}>
      <DialogContent 
        className=""
        onInteractOutside={(e) => { if (isProcessingGlobal) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Add Event from Document</DialogTitle>
          <DialogDescription>
            You can use documents to automatically add events, or skip and add event details manually.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700 text-sm">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>Document processing requires an internet connection.</span>
            </div>
          )}
          {!documentItem ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isOnline ? 'border-primary/20 cursor-pointer hover:border-primary/40' : 'border-muted opacity-50 cursor-not-allowed'}`}
              onClick={() => isOnline && document.getElementById('single-file-upload-modal')?.click()}
            >
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                {isOnline ? <Upload size={24} className="text-primary" /> : <WifiOff size={24} className="text-muted-foreground" />}
              </div>
              <p className="font-medium mb-1">Upload Document</p>
              <p className="text-sm text-muted-foreground mb-4">Select a single PDF, EML, or image file.</p>
              <Button size="sm" variant="secondary" className="gap-2" type="button" disabled={!isOnline} onClick={() => document.getElementById('single-file-upload-modal')?.click()}>
                <FilePlus size={16} />
                Browse File
              </Button>
              <input 
                id="single-file-upload-modal" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.eml,.txt,image/*"
                disabled={!isOnline}
              />
            </div>
          ) : (
            <div className="bg-background border border-border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0"> {/* min-w-0 for truncation */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  documentItem.status === 'pending' ? "bg-muted text-muted-foreground" :
                  documentItem.status === 'uploading' || documentItem.status === 'parsing' ? "bg-blue-100 text-blue-600" :
                  documentItem.status === 'completed' ? "bg-green-100 text-green-600" :
                  "bg-red-100 text-red-600" // error
                }`}>
                  {documentItem.status === 'pending' && <FileText size={16} />}
                  {(documentItem.status === 'uploading' || documentItem.status === 'parsing') && <Loader2 size={16} className="animate-spin" />}
                  {documentItem.status === 'completed' && <CheckCircle2 size={16} />}
                  {documentItem.status === 'error' && <XCircle size={16} />}
                </div>
                <div className="overflow-hidden flex-grow"> {/* flex-grow for truncation */}
                  <p className="truncate font-medium" title={documentItem.file.name}>{documentItem.file.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {documentItem.status === 'pending' && `${Math.round(documentItem.file.size / 1024)} KB`}
                    {documentItem.status === 'uploading' && 'Uploading...'}
                    {documentItem.status === 'parsing' && 'Analyzing...'}
                    {documentItem.status === 'completed' && `${documentItem.extractedEvents?.length || 0} events found. Click "Process & Add".`}
                    {documentItem.status === 'error' && `Error: ${documentItem.error}`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRemoveDocument} disabled={isProcessingGlobal} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                <XCircle size={16} />
              </Button>
            </div>
          )}
           {documentItem && documentItem.status === 'error' && (
            <Button onClick={processDocument} disabled={isProcessingGlobal || documentItem.status !== 'error' || !isOnline} className="w-full">
              Retry Processing
            </Button>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4 border-t">
           <Button 
            variant="outline" 
            onClick={handleSkipAndCreateBlank} 
            disabled={isProcessingGlobal} 
            className="w-full sm:w-auto"
            >
            Skip & Add Blank Event
          </Button>
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <DialogClose asChild>
              <Button 
                variant="ghost" 
                onClick={() => {if (!isProcessingGlobal) onClose();}} // only call onClose if not processing
                disabled={isProcessingGlobal} 
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button 
              onClick={processDocument} 
              disabled={!documentItem || (documentItem.status !== 'pending' && documentItem.status !== 'completed') || isProcessingGlobal || !isOnline}
              title={!isOnline ? 'Document processing requires an internet connection' : undefined}
              className="w-full sm:w-auto"
            >
              {isProcessingGlobal && (documentItem?.status === 'uploading' || documentItem?.status === 'parsing') && (
                <><Loader2 size={16} className="animate-spin mr-2" /> Processing...</>
              )}
              {!isProcessingGlobal && documentItem?.status === 'pending' && "Process Document"}
              {!isProcessingGlobal && documentItem?.status === 'completed' && "Add Extracted Event(s)"}
              {!isProcessingGlobal && !documentItem && "Process Document"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
