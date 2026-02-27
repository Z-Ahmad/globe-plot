import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { apiPost } from '@/lib/apiClient';
import toast from 'react-hot-toast';

interface TripQueryAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  embedded?: boolean; // New prop for sidebar mode
}

interface QueryResponse {
  answer: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  cached?: boolean;
  deterministic?: boolean;
}

interface QueryHistoryItem {
  question: string;
  answer: string;
  timestamp: Date;
  deterministic?: boolean;
  cached?: boolean;
}

// Suggested questions for users
const SUGGESTED_QUESTIONS = [
  "How many days will I be traveling?",
  "How many countries am I visiting?",
  "What is my longest layover?",
  "How many hotel nights do I have?",
  "What is my busiest day?",
  "Which cities am I visiting?",
];

export const TripQueryAssistant: React.FC<TripQueryAssistantProps> = ({
  isOpen,
  onClose,
  tripId,
  embedded = false
}) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<QueryResponse | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [showDevInfo, setShowDevInfo] = useState(false);

  // Detect mobile
  const isMobile = window.innerWidth < 768;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setIsLoading(true);
    setCurrentAnswer(null);

    try {
      const response = await apiPost<QueryResponse>('trip-query', {
        tripId,
        question: question.trim()
      });

      const result = response.data;
      setCurrentAnswer(result);

      // Add to history
      setQueryHistory(prev => [{
        question: question.trim(),
        answer: result.answer,
        timestamp: new Date(),
        deterministic: result.deterministic,
        cached: result.cached
      }, ...prev]);

      // Clear input
      setQuestion('');

      // Show success toast with details
      if (result.deterministic) {
        toast.success('Answered instantly with deterministic calculation!', { icon: '⚡' });
      } else if (result.cached) {
        toast.success('Answer retrieved from cache!', { icon: '💾' });
      } else {
        toast.success('AI analysis complete!', { icon: '🤖' });
      }

    } catch (error: any) {
      console.error('Query error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to process query';
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (suggested: string) => {
    setQuestion(suggested);
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header with icon - only show if not embedded */}
      {!embedded && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">AI Trip Assistant</h3>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Ask questions about your trip and get instant answers powered by AI.
          </p>
        </>
      )}

      {/* Suggested questions */}
      {queryHistory.length === 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(q)}
                className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                disabled={isLoading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your trip..."
            disabled={isLoading}
            maxLength={500}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !question.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {question.length}/500 characters
        </p>
      </form>

      {/* Current answer */}
      {currentAnswer && (
        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-start justify-between mb-2">
            <p className="font-medium text-sm text-purple-900 dark:text-purple-100">
              Answer
            </p>
            <div className="flex gap-2">
              {currentAnswer.deterministic && (
                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                  ⚡ Instant
                </span>
              )}
              {currentAnswer.cached && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  💾 Cached
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200">
            {currentAnswer.answer}
          </p>
          
          {/* Dev info toggle */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => setShowDevInfo(!showDevInfo)}
              className="text-xs text-gray-500 mt-2 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showDevInfo ? 'Hide' : 'Show'} dev info
            </button>
          )}
          
          {/* Dev info */}
          {showDevInfo && process.env.NODE_ENV === 'development' && (
            <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                <span>Tokens: {currentAnswer.tokensUsed}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>Latency: {currentAnswer.latencyMs}ms</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3 h-3" />
                <span>Cost: ${currentAnswer.estimatedCostUsd.toFixed(6)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Query history */}
      {queryHistory.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">Recent queries:</p>
          <div className="space-y-3">
            {queryHistory.map((item, index) => (
              <div 
                key={index} 
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {item.question}
                  </p>
                  {(item.deterministic || item.cached) && (
                    <span className="text-xs text-gray-500 ml-2">
                      {item.deterministic ? '⚡' : '💾'}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  {item.answer}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                  {item.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate limit info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          💡 You have 30 AI queries per hour. Instant calculations don't count!
        </p>
      </div>
    </div>
  );

  // If embedded (sidebar mode), just return the content
  if (embedded) {
    return <div className="p-4 h-full overflow-y-auto">{content}</div>;
  }

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="px-4 pb-4">
          <DrawerHeader>
            <DrawerTitle>AI Trip Assistant</DrawerTitle>
            <DrawerDescription>
              Ask questions about your trip
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>AI Trip Assistant</DialogTitle>
          <DialogDescription>
            Ask questions about your trip and get instant answers
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
