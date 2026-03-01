import OpenAI from 'openai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import {
  Event,
  SerializedEvent,
} from '../types/aiQuery';
import {
  AgentAction,
  AgentMessage,
  AgentChatResponse,
  GenerateItineraryResponse,
} from '../types/agent';
import {
  serializeEventsForAI,
  createAIContext,
  estimateTokenCount,
} from './eventSerializer';
import {
  classifyQuery,
  executeDeterministicFunction,
} from './deterministicFunctions';
import { normalizeEvent } from './eventNormalizer';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// GPT-4o-mini pricing per million tokens
const PRICING = {
  inputTokens: 0.15,
  outputTokens: 0.60,
};

const AGENT_SYSTEM_PROMPT = `You are a travel planning assistant with the ability to create, edit, and delete trip events.

You are given the user's trip data as context. You can:
1. Answer questions about the trip (dates, events, logistics)
2. Create new events (flights, hotels, activities, meals, etc.)
3. Edit existing events (change dates, locations, titles, etc.)
4. Delete events the user no longer wants

When the user asks you to make changes, use the provided tools to propose those changes.
When answering questions, respond directly without using tools.

Date/time format: Use ISO 8601 format (e.g. "2025-07-15T14:00:00").

Event categories and their valid types:
- travel: flight, train, car, boat, bus, other
- accommodation: hotel, hostel, airbnb, other
- experience: activity, tour, museum, concert, other
- meal: restaurant, other

For travel events, always provide departure and arrival with date and location.
For accommodation events, always provide checkIn and checkOut with date and location.
For experience events, always provide startDate and endDate.
For meal events, always provide a date.

Always set the top-level "start" field to the earliest date and "end" to the latest date for the event.

Be concise, friendly, and proactive. If the user's request is ambiguous, make reasonable assumptions and explain them.`;

const ITINERARY_SYSTEM_PROMPT = `You are a travel itinerary generator. Given a trip description, dates, and name, generate a realistic set of placeholder events.

Rules:
- Generate at most 25 events. Focus on key logistics (flights, transport, accommodation) and highlights.
- For trips over 7 days, consolidate accommodation into multi-night stays when in the same city.
- Include only 1-2 notable meals per city, not every meal.
- Use REALISTIC times — flights at 08:00 or 18:00, activities 09:00-17:00, meals at 12:00 or 19:00. NEVER use midnight T00:00:00 for anything except multi-day accommodation check-in/check-out.
- Use real place names, attractions, and restaurants.

Return a JSON object with an "events" array. Use this COMPACT schema — do NOT include redundant fields:

travel: { "category": "travel", "type": "flight"|"train"|"car"|"boat"|"bus", "title": "...", "departure": { "date": "ISO", "name": "...", "city": "...", "country": "..." }, "arrival": { "date": "ISO", "name": "...", "city": "...", "country": "..." } }

accommodation: { "category": "accommodation", "type": "hotel"|"hostel"|"airbnb", "title": "...", "checkIn": { "date": "ISO", "name": "...", "city": "...", "country": "..." }, "checkOut": { "date": "ISO", "name": "...", "city": "...", "country": "..." } }

experience: { "category": "experience", "type": "activity"|"tour"|"museum"|"concert", "title": "...", "startDate": "ISO", "endDate": "ISO", "name": "...", "city": "...", "country": "..." }

meal: { "category": "meal", "type": "restaurant", "title": "...", "date": "ISO", "name": "...", "city": "...", "country": "..." }

Do NOT include "start", "end", "location", or nested "location" objects — they will be derived automatically.`;

const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Create a new event in the trip itinerary.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['travel', 'accommodation', 'experience', 'meal'],
            description: 'The event category',
          },
          type: {
            type: 'string',
            enum: ['flight', 'train', 'car', 'boat', 'bus', 'hotel', 'hostel', 'airbnb', 'activity', 'tour', 'museum', 'concert', 'restaurant', 'other'],
            description: 'The specific event type',
          },
          title: { type: 'string', description: 'Event title' },
          start: { type: 'string', description: 'Start date/time in ISO 8601' },
          end: { type: 'string', description: 'End date/time in ISO 8601' },
          notes: { type: 'string', description: 'Optional notes' },
          location: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              city: { type: 'string' },
              country: { type: 'string' },
            },
            required: ['name'],
          },
          departure: {
            type: 'object',
            description: 'For travel events only',
            properties: {
              date: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
          arrival: {
            type: 'object',
            description: 'For travel events only',
            properties: {
              date: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
          checkIn: {
            type: 'object',
            description: 'For accommodation events only',
            properties: {
              date: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
          checkOut: {
            type: 'object',
            description: 'For accommodation events only',
            properties: {
              date: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
          startDate: { type: 'string', description: 'For experience events only' },
          endDate: { type: 'string', description: 'For experience events only' },
          date: { type: 'string', description: 'For meal events only' },
        },
        required: ['category', 'type', 'title', 'start', 'location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_event',
      description: 'Edit an existing event. Only include fields that should change.',
      parameters: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'The ID of the event to edit' },
          title: { type: 'string' },
          start: { type: 'string' },
          end: { type: 'string' },
          notes: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              city: { type: 'string' },
              country: { type: 'string' },
            },
          },
          departure: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
          arrival: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
          checkIn: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
          checkOut: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          date: { type: 'string' },
        },
        required: ['eventId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Delete an event from the trip.',
      parameters: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'The ID of the event to delete' },
          reason: { type: 'string', description: 'Brief explanation of why' },
        },
        required: ['eventId'],
      },
    },
  },
];

function generateActionId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function parseToolCallsToActions(
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
  existingEvents: Event[]
): AgentAction[] {
  const actions: AgentAction[] = [];

  for (const call of toolCalls) {
    const args = JSON.parse(call.function.arguments);

    switch (call.function.name) {
      case 'create_event': {
        const rawCreateEvent = {
          id: `pending-${generateActionId()}`,
          ...args,
          location: args.location || { name: '' },
        };
        const normalizedCreate = normalizeEvent(rawCreateEvent);
        actions.push({
          id: generateActionId(),
          type: 'create_event',
          event: normalizedCreate,
          status: 'proposed',
        });
        break;
      }

      case 'edit_event': {
        const existingEvent = existingEvents.find(e => e.id === args.eventId);
        const { eventId, ...updates } = args;
        const mergedEvent = {
          ...(existingEvent || {}),
          id: eventId,
          title: updates.title ?? existingEvent?.title ?? 'Unknown Event',
          ...updates,
        };
        const normalizedEdit = normalizeEvent(mergedEvent);
        actions.push({
          id: generateActionId(),
          type: 'edit_event',
          event: normalizedEdit,
          status: 'proposed',
        });
        break;
      }

      case 'delete_event': {
        const eventToDelete = existingEvents.find(e => e.id === args.eventId);
        actions.push({
          id: generateActionId(),
          type: 'delete_event',
          event: {
            id: args.eventId,
            title: eventToDelete?.title || 'Unknown Event',
          },
          reason: args.reason,
          status: 'proposed',
        });
        break;
      }
    }
  }

  return actions;
}

/**
 * Main agent chat function - handles multi-turn conversation with tool calling
 */
export async function agentChat(
  userId: string,
  tripId: string,
  tripName: string,
  tripStartDate: Date,
  tripEndDate: Date,
  events: Event[],
  messages: AgentMessage[]
): Promise<AgentChatResponse> {
  const startTime = Date.now();

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  if (lastUserMessage) {
    const classification = classifyQuery(lastUserMessage.content);
    if (classification.isDeterministic && classification.functionName) {
      const answer = executeDeterministicFunction(
        classification.functionName,
        events,
        tripStartDate,
        tripEndDate
      );
      return {
        reply: answer,
        actions: [],
        tokensUsed: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  const serializedEvents = serializeEventsForAI(events);
  const context = createAIContext(
    tripName,
    tripStartDate.toISOString(),
    tripEndDate.toISOString(),
    serializedEvents
  );

  const estimatedTokens = estimateTokenCount(context);
  if (estimatedTokens > 30000) {
    throw new Error('Trip is too large for AI analysis. Please try a more specific question.');
  }

  const systemMessage = `${AGENT_SYSTEM_PROMPT}\n\nCurrent Trip Data:\n${JSON.stringify(context, null, 2)}`;

  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 2000,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const tokensUsed = promptTokens + completionTokens;

    const estimatedCostUsd =
      (promptTokens / 1_000_000) * PRICING.inputTokens +
      (completionTokens / 1_000_000) * PRICING.outputTokens;

    let actions: AgentAction[] = [];
    let reply = assistantMessage.content || '';

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      actions = parseToolCallsToActions(assistantMessage.tool_calls, events);

      // Build tool responses and get a natural-language summary
      const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        ...openaiMessages,
        assistantMessage as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        ...assistantMessage.tool_calls.map(tc => ({
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: JSON.stringify({ success: true, status: 'proposed_to_user' }),
        })),
      ];

      const followUpResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: toolMessages,
        temperature: 0.3,
        max_tokens: 500,
      });

      reply = followUpResponse.choices[0]?.message?.content || reply;

      const followUpPrompt = followUpResponse.usage?.prompt_tokens || 0;
      const followUpCompletion = followUpResponse.usage?.completion_tokens || 0;
      const totalPrompt = promptTokens + followUpPrompt;
      const totalCompletion = completionTokens + followUpCompletion;

      return {
        reply,
        actions,
        tokensUsed: totalPrompt + totalCompletion,
        promptTokens: totalPrompt,
        completionTokens: totalCompletion,
        estimatedCostUsd:
          (totalPrompt / 1_000_000) * PRICING.inputTokens +
          (totalCompletion / 1_000_000) * PRICING.outputTokens,
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      reply,
      actions,
      tokensUsed,
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`AI agent error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Expand a lean event from the AI into the full nested format expected by normalizeEvent.
 * Handles flat {date, name, city, country} → {date, location: {name, city, country}}
 * and derives top-level location for experience/meal events.
 */
function expandLeanEvent(e: any): any {
  const expanded = { ...e };

  // Travel: flatten departure/arrival into nested location objects
  if (expanded.category === 'travel') {
    if (expanded.departure) {
      const { date, name, city, country, ...rest } = expanded.departure;
      expanded.departure = { date, location: { name: name || '', city: city || '', country: country || '' }, ...rest };
    }
    if (expanded.arrival) {
      const { date, name, city, country, ...rest } = expanded.arrival;
      expanded.arrival = { date, location: { name: name || '', city: city || '', country: country || '' }, ...rest };
    }
    // Derive top-level location from departure
    if (!expanded.location && expanded.departure?.location) {
      expanded.location = { ...expanded.departure.location };
    }
  }

  // Accommodation: flatten checkIn/checkOut
  if (expanded.category === 'accommodation') {
    if (expanded.checkIn) {
      const { date, name, city, country, ...rest } = expanded.checkIn;
      expanded.checkIn = { date, location: { name: name || '', city: city || '', country: country || '' }, ...rest };
    }
    if (expanded.checkOut) {
      const { date, name, city, country, ...rest } = expanded.checkOut;
      expanded.checkOut = { date, location: { name: name || '', city: city || '', country: country || '' }, ...rest };
    }
    if (!expanded.location && expanded.checkIn?.location) {
      expanded.location = { ...expanded.checkIn.location };
    }
  }

  // Experience / Meal: top-level name/city/country → location
  if ((expanded.category === 'experience' || expanded.category === 'meal') && !expanded.location) {
    expanded.location = {
      name: expanded.name || '',
      city: expanded.city || '',
      country: expanded.country || '',
    };
    delete expanded.name;
    delete expanded.city;
    delete expanded.country;
  }

  return expanded;
}

/**
 * Generate a placeholder itinerary from a trip description
 */
export async function generateItinerary(
  tripName: string,
  startDate: string,
  endDate: string,
  tripDescription: string
): Promise<GenerateItineraryResponse> {
  const startTime = Date.now();

  const userPrompt = `Generate a complete trip itinerary for the following:

Trip Name: ${tripName}
Start Date: ${startDate}
End Date: ${endDate}
Description: ${tripDescription}

Return ONLY a valid JSON array of events. Do not include any text before or after the JSON array.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ITINERARY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16000,
      response_format: { type: 'json_object' },
    });

    // Detect truncation — if the model ran out of tokens the JSON will be incomplete
    const finishReason = response.choices[0]?.finish_reason;
    if (finishReason === 'length') {
      console.error('Itinerary generation truncated (finish_reason=length). Increase max_tokens or simplify the trip.');
      throw new Error('Generated itinerary was too long and got truncated. Try a shorter trip or simpler description.');
    }

    const rawContent = response.choices[0]?.message?.content || '{}';
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const tokensUsed = promptTokens + completionTokens;

    const estimatedCostUsd =
      (promptTokens / 1_000_000) * PRICING.inputTokens +
      (completionTokens / 1_000_000) * PRICING.outputTokens;

    let events: Partial<Event>[] = [];
    try {
      const parsed = JSON.parse(rawContent);
      // Handle both { events: [...] } and direct array
      const rawEvents = Array.isArray(parsed) ? parsed : (parsed.events || parsed.itinerary || []);
      events = rawEvents.map((e: any) => {
        const expanded = expandLeanEvent(e);
        const withId = { ...expanded, id: `placeholder-${crypto.randomBytes(4).toString('hex')}`, notes: expanded.notes || 'placeholder' };
        return normalizeEvent(withId);
      });
    } catch (parseError) {
      console.error('Failed to parse itinerary response:', parseError);
      console.error('Raw content (first 500 chars):', rawContent.substring(0, 500));
      throw new Error('Failed to parse generated itinerary');
    }

    return {
      events,
      reply: `I've generated ${events.length} events for your "${tripName}" trip. Review them below and make any changes you'd like!`,
      tokensUsed,
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('OpenAI itinerary generation error:', error);
    throw new Error(`Itinerary generation failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Streaming version of generateItinerary — sends events one by one via the onEvent callback.
 * Uses OpenAI streaming + bracket-depth tracking to extract complete event objects as they close.
 */
export async function generateItineraryStream(
  tripName: string,
  startDate: string,
  endDate: string,
  tripDescription: string,
  onEvent: (event: any) => void
): Promise<{ reply: string; tokensUsed: number; promptTokens: number; completionTokens: number; estimatedCostUsd: number; latencyMs: number; eventCount: number }> {
  const startTime = Date.now();

  const userPrompt = `Generate a complete trip itinerary for the following:

Trip Name: ${tripName}
Start Date: ${startDate}
End Date: ${endDate}
Description: ${tripDescription}

Return ONLY a valid JSON object with an "events" array. Do not include any text before or after the JSON.`;

  let accumulated = '';
  let eventCount = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  // State for incremental event extraction
  let insideEventsArray = false;
  let braceDepth = 0;
  let currentEventStart = -1;
  let inString = false;
  let escapeNext = false;

  function processChunk(newText: string) {
    accumulated += newText;

    // Scan character by character for complete event objects
    for (let i = accumulated.length - newText.length; i < accumulated.length; i++) {
      const ch = accumulated[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (ch === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      // Detect the start of the events array
      if (!insideEventsArray && ch === '[') {
        insideEventsArray = true;
        continue;
      }

      if (!insideEventsArray) continue;

      if (ch === '{') {
        if (braceDepth === 0) {
          currentEventStart = i;
        }
        braceDepth++;
      } else if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0 && currentEventStart >= 0) {
          // We have a complete event object
          const eventJson = accumulated.substring(currentEventStart, i + 1);
          currentEventStart = -1;
          try {
            const rawEvent = JSON.parse(eventJson);
            const expanded = expandLeanEvent(rawEvent);
            const withId = {
              ...expanded,
              id: `placeholder-${crypto.randomBytes(4).toString('hex')}`,
              notes: expanded.notes || 'placeholder',
            };
            const normalized = normalizeEvent(withId);
            eventCount++;
            onEvent(normalized);
          } catch (parseErr) {
            console.error('Failed to parse streamed event:', parseErr);
          }
        }
      }
    }
  }

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ITINERARY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16000,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        processChunk(delta);
      }
      // Capture usage from the final chunk
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens || 0;
        completionTokens = chunk.usage.completion_tokens || 0;
      }
    }

    const tokensUsed = promptTokens + completionTokens;
    const estimatedCostUsd =
      (promptTokens / 1_000_000) * PRICING.inputTokens +
      (completionTokens / 1_000_000) * PRICING.outputTokens;

    return {
      reply: `I've generated ${eventCount} events for your "${tripName}" trip. Review them below and make any changes you'd like!`,
      tokensUsed,
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      latencyMs: Date.now() - startTime,
      eventCount,
    };
  } catch (error: any) {
    console.error('OpenAI streaming itinerary error:', error);
    throw new Error(`Streaming itinerary generation failed: ${error.message || 'Unknown error'}`);
  }
}

// Export expandLeanEvent for reuse
export { expandLeanEvent };
