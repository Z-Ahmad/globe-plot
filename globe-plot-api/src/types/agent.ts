import { Event, EventCategory, EventType } from './aiQuery';

export type AgentActionType = 'create_event' | 'edit_event' | 'delete_event';

export interface AgentAction {
  id: string;
  type: AgentActionType;
  event: Partial<Event> & { id: string; title: string };
  reason?: string;
  status: 'proposed' | 'confirmed' | 'rejected';
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  actions?: AgentAction[];
}

export interface AgentChatRequest {
  tripId: string;
  messages: AgentMessage[];
}

export interface AgentChatResponse {
  reply: string;
  actions: AgentAction[];
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface GenerateItineraryRequest {
  tripName: string;
  startDate: string;
  endDate: string;
  tripDescription: string;
}

export interface GenerateItineraryResponse {
  events: Partial<Event>[];
  reply: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}
