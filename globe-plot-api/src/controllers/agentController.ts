import { Request, Response } from 'express';
import { firestore } from '../services/firebase/admin';
import { agentChat, generateItinerary, generateItineraryStream } from '../services/aiAgentService';
import { Event } from '../types/aiQuery';
import { AgentChatRequest, GenerateItineraryRequest } from '../types/agent';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * POST /api/agent/chat
 * Handle agentic AI conversation with tool calling
 */
export const handleAgentChat = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tripId, messages } = req.body as AgentChatRequest;

    if (!tripId || typeof tripId !== 'string') {
      res.status(400).json({ error: 'Invalid tripId' });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const tripDoc = await firestore.collection('trips').doc(tripId).get();
    if (!tripDoc.exists) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const tripData = tripDoc.data();
    if (!tripData) {
      res.status(404).json({ error: 'Trip data not found' });
      return;
    }

    const userId = req.user.uid;
    const isOwner = tripData.userId === userId;
    const hasSharedAccess = tripData.sharedWith && tripData.sharedWith[userId];

    if (!isOwner && !hasSharedAccess) {
      res.status(403).json({ error: 'No access to this trip' });
      return;
    }

    const eventsSnapshot = await firestore
      .collection('events')
      .where('tripId', '==', tripId)
      .get();

    const convertTimestamp = (val: any): string => {
      if (val instanceof Timestamp) return val.toDate().toISOString();
      if (val instanceof Date) return val.toISOString();
      return val;
    };

    const convertDates = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'date' || key === 'start' || key === 'end' ||
            key === 'startDate' || key === 'endDate') {
          result[key] = convertTimestamp(value);
        } else if (typeof value === 'object' && value !== null) {
          result[key] = convertDates(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    const events: Event[] = eventsSnapshot.docs.map(doc => ({
      ...convertDates(doc.data()),
      id: doc.id,
    } as Event));

    const tripStartDate = tripData.startDate instanceof Timestamp
      ? tripData.startDate.toDate()
      : new Date(tripData.startDate);

    const tripEndDate = tripData.endDate instanceof Timestamp
      ? tripData.endDate.toDate()
      : new Date(tripData.endDate);

    const result = await agentChat(
      userId,
      tripId,
      tripData.name || 'Untitled Trip',
      tripStartDate,
      tripEndDate,
      events,
      messages
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Agent chat error:', error);

    if (error.message?.includes('too large')) {
      res.status(413).json({ error: error.message });
      return;
    }

    res.status(500).json({
      error: 'Failed to process agent request',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/agent/generate-itinerary
 * Generate placeholder events from a trip description
 */
export const handleGenerateItinerary = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tripName, startDate, endDate, tripDescription } = req.body as GenerateItineraryRequest;

    if (!tripName || typeof tripName !== 'string') {
      res.status(400).json({ error: 'Trip name is required' });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start and end dates are required' });
      return;
    }

    if (!tripDescription || typeof tripDescription !== 'string') {
      res.status(400).json({ error: 'Trip description is required' });
      return;
    }

    if (tripDescription.length > 2000) {
      res.status(400).json({ error: 'Trip description too long (max 2000 characters)' });
      return;
    }

    const result = await generateItinerary(tripName, startDate, endDate, tripDescription);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Itinerary generation error:', error);

    res.status(500).json({
      error: 'Failed to generate itinerary',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/agent/generate-itinerary-stream
 * Generate placeholder events from a trip description, streamed via SSE
 */
export const handleGenerateItineraryStream = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tripName, startDate, endDate, tripDescription } = req.body as GenerateItineraryRequest;

    if (!tripName || typeof tripName !== 'string') {
      res.status(400).json({ error: 'Trip name is required' });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start and end dates are required' });
      return;
    }

    if (!tripDescription || typeof tripDescription !== 'string') {
      res.status(400).json({ error: 'Trip description is required' });
      return;
    }

    if (tripDescription.length > 2000) {
      res.status(400).json({ error: 'Trip description too long (max 2000 characters)' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    const result = await generateItineraryStream(
      tripName,
      startDate,
      endDate,
      tripDescription,
      (event) => {
        res.write(`data: ${JSON.stringify({ event })}\n\n`);
      }
    );

    // Send completion message
    res.write(`data: ${JSON.stringify({
      done: true,
      reply: result.reply,
      tokensUsed: result.tokensUsed,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      latencyMs: result.latencyMs,
      eventCount: result.eventCount,
    })}\n\n`);

    res.end();
  } catch (error: any) {
    console.error('Streaming itinerary generation error:', error);

    // If headers haven't been sent yet, send a JSON error
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate itinerary',
        message: error.message || 'Internal server error',
      });
    } else {
      // Headers already sent (SSE mode), send error as SSE event
      res.write(`data: ${JSON.stringify({ error: error.message || 'Generation failed' })}\n\n`);
      res.end();
    }
  }
};
