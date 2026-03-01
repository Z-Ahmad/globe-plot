import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles, Send, Loader2, User, Bot,
  Plus, Pencil, Trash2, Check, X,
  Plane, Hotel, MapPin, UtensilsCrossed,
} from 'lucide-react';
import { apiPost } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useTripContext } from '@/context/TripContext';
import { AgentMessage, AgentAction, AgentChatResponse, Event } from '@/types/trip';
import { v4 as uuidv4 } from 'uuid';

interface TripQueryAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  embedded?: boolean;
}

const SUGGESTED_PROMPTS = [
  "How many days is my trip?",
  "What cities am I visiting?",
  "Add a dinner reservation tomorrow evening",
  "What's my busiest day?",
  "Suggest an activity for my free day",
  "How many hotel nights do I have?",
];

function getCategoryIcon(category?: string) {
  switch (category) {
    case 'travel': return Plane;
    case 'accommodation': return Hotel;
    case 'experience': return MapPin;
    case 'meal': return UtensilsCrossed;
    default: return MapPin;
  }
}

function getActionLabel(type: AgentAction['type']) {
  switch (type) {
    case 'create_event': return 'Create';
    case 'edit_event': return 'Edit';
    case 'delete_event': return 'Delete';
  }
}

function getActionColor(type: AgentAction['type']) {
  switch (type) {
    case 'create_event': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    case 'edit_event': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
    case 'delete_event': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';
  }
}

function getActionIcon(type: AgentAction['type']) {
  switch (type) {
    case 'create_event': return Plus;
    case 'edit_event': return Pencil;
    case 'delete_event': return Trash2;
  }
}

const ActionCard: React.FC<{
  action: AgentAction;
  onConfirm: (action: AgentAction) => void;
  onReject: (action: AgentAction) => void;
}> = ({ action, onConfirm, onReject }) => {
  const ActionIcon = getActionIcon(action.type);
  const CategoryIcon = getCategoryIcon(action.event.category);
  const isResolved = action.status !== 'proposed';

  return (
    <div className={cn(
      'rounded-lg border p-3 mt-2 transition-opacity',
      getActionColor(action.type),
      isResolved && 'opacity-60'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ActionIcon className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {getActionLabel(action.type)}
          </span>
        </div>
        {!isResolved && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              onClick={() => onConfirm(action)}
              title="Confirm"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
              onClick={() => onReject(action)}
              title="Reject"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {action.status === 'confirmed' && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="h-3 w-3" /> Applied
          </span>
        )}
        {action.status === 'rejected' && (
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <X className="h-3 w-3" /> Skipped
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <CategoryIcon className="h-4 w-4 shrink-0 opacity-70" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{action.event.title}</p>
          {action.event.location?.city && (
            <p className="text-xs opacity-70 truncate">
              {[action.event.location.city, action.event.location.country].filter(Boolean).join(', ')}
            </p>
          )}
          {action.event.start && (
            <p className="text-xs opacity-70">
              {new Date(action.event.start).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
          {action.reason && (
            <p className="text-xs opacity-70 italic mt-0.5">{action.reason}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const TripQueryAssistant: React.FC<TripQueryAssistantProps> = ({
  isOpen,
  onClose,
  tripId,
  embedded = false,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addEvent, updateEvent, removeEvent } = useTripContext();
  const isMobile = window.innerWidth < 768;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleConfirmAction = useCallback(async (targetAction: AgentAction) => {
    try {
      if (targetAction.type === 'create_event') {
        const newEvent = {
          ...targetAction.event,
          id: uuidv4(),
        } as Event;
        await addEvent(newEvent);
        toast.success(`Created "${targetAction.event.title}"`);
      } else if (targetAction.type === 'edit_event') {
        const { id, ...updates } = targetAction.event;
        await updateEvent(id, updates as Partial<Event>);
        toast.success(`Updated "${targetAction.event.title}"`);
      } else if (targetAction.type === 'delete_event') {
        await removeEvent(targetAction.event.id);
        toast.success(`Deleted "${targetAction.event.title}"`);
      }

      setMessages(prev => prev.map(msg => ({
        ...msg,
        actions: msg.actions?.map(a =>
          a.id === targetAction.id ? { ...a, status: 'confirmed' as const } : a
        ),
      })));
    } catch (error) {
      console.error('Failed to apply action:', error);
      toast.error(`Failed to apply change: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addEvent, updateEvent, removeEvent]);

  const handleRejectAction = useCallback((targetAction: AgentAction) => {
    setMessages(prev => prev.map(msg => ({
      ...msg,
      actions: msg.actions?.map(a =>
        a.id === targetAction.id ? { ...a, status: 'rejected' as const } : a
      ),
    })));
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: AgentMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const conversationForApi = updatedMessages.map(({ role, content }) => ({ role, content }));

      const response = await apiPost<AgentChatResponse>('agent/chat', {
        tripId,
        messages: conversationForApi,
      });

      const { reply, actions } = response.data;

      const assistantMessage: AgentMessage = {
        role: 'assistant',
        content: reply,
        actions: actions.length > 0 ? actions : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Agent error:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Something went wrong. Please try again.';

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I ran into an issue: ${errorMessage}`,
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, tripId]);

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const content = (
    <div className="flex flex-col h-full">
      {!embedded && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">AI Trip Assistant</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Ask questions, create events, or edit your itinerary with AI.
          </p>
        </>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Try asking:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedPrompt(q)}
                  className="text-xs px-2.5 py-1.5 bg-muted hover:bg-muted/80 rounded-full transition-colors text-left"
                  disabled={isLoading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn(
            'flex gap-2',
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          )}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
            )}

            <div className={cn(
              'max-w-[85%] rounded-xl px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted rounded-bl-sm'
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.actions?.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onConfirm={handleConfirmAction}
                  onReject={handleRejectAction}
                />
              ))}
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="bg-muted rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or request a change..."
            disabled={isLoading}
            maxLength={500}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  if (embedded) {
    return <div className="p-4 h-full overflow-hidden flex flex-col">{content}</div>;
  }

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="px-4 pb-4 max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>AI Trip Assistant</DrawerTitle>
            <DrawerDescription>
              Ask questions or make changes to your trip
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Trip Assistant</DialogTitle>
          <DialogDescription>
            Ask questions or make changes to your trip
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">{content}</div>
      </DialogContent>
    </Dialog>
  );
};
