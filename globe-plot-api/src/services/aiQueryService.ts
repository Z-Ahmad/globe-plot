import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { firestore } from './firebase/admin';
import {
  Event,
  SerializedEvent,
  TripQueryResponse,
  QueryTelemetry,
  QueryCacheEntry
} from '../types/aiQuery';
import {
  serializeEventsForAI,
  createAIContext,
  estimateTokenCount
} from './eventSerializer';
import {
  classifyQuery,
  executeDeterministicFunction
} from './deterministicFunctions';
import { Timestamp } from 'firebase-admin/firestore';

dotenv.config();

// Initialize Mistral client
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || ''
});

// Pricing for Mistral Small (per million tokens)
const PRICING = {
  inputTokens: 1.0,  // $1 per 1M input tokens
  outputTokens: 3.0  // $3 per 1M output tokens
};

// Enhanced system prompt with examples
const SYSTEM_PROMPT = `You are an itinerary analysis assistant.

You are given structured trip data in JSON format containing a trip name, dates, and events.
Answer user questions using this data. Be helpful and use logical reasoning based on the provided information.

Date Handling Rules:
- All dates are in ISO 8601 format
- To calculate duration: parse dates and compute difference
- For accommodation nights: checkOut date minus checkIn date
- For travel duration: arrival date minus departure date
- Trip duration: trip.endDate minus trip.startDate

Important:
- Use the trip.startDate and trip.endDate to answer questions about trip length
- Use the events array to count activities, locations, and times
- If you can reasonably infer an answer from the data, provide it
- Only respond "The provided itinerary data does not contain enough information" if truly impossible to answer

Examples:

Q: "How many days is my trip?"
A: Calculate days between trip.startDate and trip.endDate

Q: "How many hotel nights do I have?"
A: Count accommodation events and sum (checkOut - checkIn) for each.

Q: "What is my longest layover?"
A: For consecutive travel events, compute (next departure - previous arrival). Report the maximum.

Q: "What is my busiest day?"
A: Count events per day, find the day with most events.

Be concise and friendly. Answer the question directly.`;

/**
 * Generate hash for query caching
 */
function generateQueryHash(tripId: string, question: string): string {
  return crypto
    .createHash('sha256')
    .update(`${tripId}:${question.toLowerCase().trim()}`)
    .digest('hex');
}

/**
 * Check cache for existing answer
 */
async function checkCache(
  tripId: string,
  question: string
): Promise<QueryCacheEntry | null> {
  try {
    const hash = generateQueryHash(tripId, question);
    const cacheRef = firestore.collection('aiQueryCache').doc(hash);
    const cacheDoc = await cacheRef.get();

    if (!cacheDoc.exists) {
      return null;
    }

    const cache = cacheDoc.data() as QueryCacheEntry;

    // Check if cache is expired
    if (cache.expiresAt.toMillis() < Date.now()) {
      // Delete expired cache entry
      await cacheRef.delete();
      return null;
    }

    return cache;
  } catch (error) {
    console.error('Cache check error:', error);
    return null;
  }
}

/**
 * Save query result to cache
 */
async function saveToCache(
  tripId: string,
  question: string,
  answer: string,
  tokensUsed: number
): Promise<void> {
  try {
    const hash = generateQueryHash(tripId, question);
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000); // 24 hours

    const cacheEntry: QueryCacheEntry = {
      tripId,
      questionHash: hash,
      answer,
      tokensUsed,
      createdAt: now,
      expiresAt
    };

    await firestore.collection('aiQueryCache').doc(hash).set(cacheEntry);
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

/**
 * Log query telemetry asynchronously (fire and forget)
 */
function logTelemetry(telemetry: QueryTelemetry): void {
  firestore
    .collection('aiQueryLogs')
    .add(telemetry)
    .catch(error => console.error('Telemetry logging error:', error));
}

/**
 * Validate and sanitize question input
 */
function validateQuestion(question: string): { valid: boolean; error?: string } {
  if (!question || typeof question !== 'string') {
    return { valid: false, error: 'Question must be a non-empty string' };
  }

  if (question.length > 500) {
    return { valid: false, error: 'Question too long (max 500 characters)' };
  }

  // Check for suspicious patterns (prompt injection attempts)
  const suspiciousPatterns = [
    /ignore previous instructions/i,
    /system:/i,
    /assistant:/i,
    /forget everything/i,
    /disregard/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(question)) {
      return { valid: false, error: 'Invalid question format' };
    }
  }

  return { valid: true };
}

/**
 * Sanitize AI response
 */
function sanitizeResponse(response: string): string {
  return response
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove markdown images
    .replace(/<script.*?<\/script>/gi, '') // Remove script tags
    .slice(0, 2000); // Limit length
}

/**
 * Main AI query function
 */
export async function queryTrip(
  userId: string,
  tripId: string,
  tripName: string,
  tripStartDate: Date,
  tripEndDate: Date,
  events: Event[],
  question: string
): Promise<TripQueryResponse> {
  const startTime = Date.now();

  // Validate question
  const validation = validateQuestion(question);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check cache first
  const cached = await checkCache(tripId, question);
  if (cached) {
    console.log('Cache hit for query');
    
    const latencyMs = Date.now() - startTime;
    
    // Log telemetry for cached query
    logTelemetry({
      userId,
      tripId,
      question,
      answer: cached.answer,
      tokensUsed: cached.tokensUsed,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      latencyMs,
      cached: true,
      deterministic: false,
      createdAt: Timestamp.now()
    });

    return {
      answer: cached.answer,
      tokensUsed: cached.tokensUsed,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      latencyMs,
      cached: true
    };
  }

  // Check if query can be handled deterministically
  const classification = classifyQuery(question);
  
  if (classification.isDeterministic && classification.functionName) {
    console.log(`Deterministic query detected: ${classification.functionName}`);
    
    const answer = executeDeterministicFunction(
      classification.functionName,
      events,
      tripStartDate,
      tripEndDate
    );
    
    const latencyMs = Date.now() - startTime;
    
    // Save to cache
    await saveToCache(tripId, question, answer, 0);
    
    // Log telemetry
    logTelemetry({
      userId,
      tripId,
      question,
      answer,
      tokensUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      latencyMs,
      cached: false,
      deterministic: true,
      createdAt: Timestamp.now()
    });

    return {
      answer,
      tokensUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      latencyMs,
      deterministic: true
    };
  }

  // Serialize events for AI context
  const serializedEvents = serializeEventsForAI(events);
  const context = createAIContext(
    tripName,
    tripStartDate.toISOString(),
    tripEndDate.toISOString(),
    serializedEvents
  );

  // Estimate token count
  const estimatedTokens = estimateTokenCount(context);
  console.log(`Estimated context tokens: ${estimatedTokens}`);

  // Check if context is too large
  if (estimatedTokens > 15000) {
    throw new Error('Trip is too large for AI analysis (too many events). Please try a more specific question.');
  }

  // Build the complete prompt
  const userPrompt = `Trip Data:\n${JSON.stringify(context, null, 2)}\n\nUser Question:\n${question}`;

  try {
    // Call Mistral API
    const response = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for deterministic responses
      maxTokens: 500
    });

    const rawAnswer = response.choices?.[0]?.message?.content;
    const answerText = typeof rawAnswer === 'string' ? rawAnswer : 'No answer generated';
    const answer = sanitizeResponse(answerText);
    const promptTokens = response.usage?.promptTokens || 0;
    const completionTokens = response.usage?.completionTokens || 0;
    const tokensUsed = promptTokens + completionTokens;

    // Calculate cost
    const estimatedCostUsd = 
      (promptTokens / 1000000) * PRICING.inputTokens +
      (completionTokens / 1000000) * PRICING.outputTokens;

    const latencyMs = Date.now() - startTime;

    // Save to cache
    await saveToCache(tripId, question, answer, tokensUsed);

    // Log telemetry
    logTelemetry({
      userId,
      tripId,
      question,
      answer,
      tokensUsed,
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      latencyMs,
      cached: false,
      deterministic: false,
      createdAt: Timestamp.now()
    });

    return {
      answer,
      tokensUsed,
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      latencyMs
    };

  } catch (error: any) {
    console.error('Mistral API error:', error);
    throw new Error(`AI query failed: ${error.message || 'Unknown error'}`);
  }
}
