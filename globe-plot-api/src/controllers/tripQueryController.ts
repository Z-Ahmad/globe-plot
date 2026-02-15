import { Request, Response } from 'express';
import { firestore } from '../services/firebase/admin';
import { queryTrip } from '../services/aiQueryService';
import { Event, TripQueryRequest } from '../types/aiQuery';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * POST /api/trip-query
 * Handle AI-powered trip queries
 */
export const handleTripQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    // Authentication is enforced by middleware
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tripId, question } = req.body as TripQueryRequest;

    // Validate request body
    if (!tripId || typeof tripId !== 'string') {
      res.status(400).json({ error: 'Invalid tripId' });
      return;
    }

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Invalid question' });
      return;
    }

    // Fetch trip from Firestore
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

    // Verify user has access to trip (owner or shared)
    const userId = req.user.uid;
    const isOwner = tripData.userId === userId;
    const hasSharedAccess = tripData.sharedWith && tripData.sharedWith[userId];

    if (!isOwner && !hasSharedAccess) {
      res.status(403).json({ error: 'No access to this trip' });
      return;
    }

    // Fetch events for the trip
    const eventsSnapshot = await firestore
      .collection('events')
      .where('tripId', '==', tripId)
      .get();

    // Convert Firestore events to Event type
    const events: Event[] = eventsSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamps to ISO strings
      const convertTimestamp = (val: any): string => {
        if (val instanceof Timestamp) {
          return val.toDate().toISOString();
        }
        if (val instanceof Date) {
          return val.toISOString();
        }
        return val;
      };

      // Deep convert all date fields
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

      return {
        ...convertDates(data),
        id: doc.id
      } as Event;
    });

    if (events.length === 0) {
      res.status(200).json({
        answer: 'This trip has no events yet. Add some events to your trip to ask questions about it!',
        tokensUsed: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: 0
      });
      return;
    }

    // Convert trip dates
    const tripStartDate = tripData.startDate instanceof Timestamp 
      ? tripData.startDate.toDate()
      : new Date(tripData.startDate);
    
    const tripEndDate = tripData.endDate instanceof Timestamp
      ? tripData.endDate.toDate()
      : new Date(tripData.endDate);

    // Execute AI query
    const result = await queryTrip(
      userId,
      tripId,
      tripData.name || 'Untitled Trip',
      tripStartDate,
      tripEndDate,
      events,
      question
    );

    res.status(200).json(result);

  } catch (error: any) {
    console.error('Trip query error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('too large')) {
      res.status(413).json({ error: error.message });
      return;
    }

    if (error.message?.includes('Invalid question')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({
      error: 'Failed to process query',
      message: error.message || 'Internal server error'
    });
  }
};
