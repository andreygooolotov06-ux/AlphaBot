/**
 * @alphadate/contracts
 * Fundamental technical contracts and interfaces for AlphaDate Personal AI.
 * 
 * RULES:
 * 1. This package is the SINGLE SOURCE OF TRUTH across all components.
 * 2. Changes to these contracts require consensus and a dedicated PR before implementation.
 * 3. Never duplicate types in other packages — always import from @alphadate/contracts.
 */

export const ALPHADATE_PROTOCOL_VERSION = '1.0.0';

// ============================================================================
// 1. IPC / WebSocket Communication Protocol (Extension <-> Local App)
// ============================================================================

export type MessageType =
  | 'HANDSHAKE'
  | 'HEARTBEAT'
  | 'ANALYZE_CONTEXT'
  | 'GENERATE_SUGGESTIONS'
  | 'SEARCH_MEMORY'
  | 'SAVE_MEMORY'
  | 'GET_MODEL_STATUS'
  | 'UPDATE_CONFIG';

export interface IPCRequest<T = unknown> {
  id: string;
  version: typeof ALPHADATE_PROTOCOL_VERSION;
  type: MessageType;
  payload: T;
  timestamp: number;
}

export interface IPCResponse<T = unknown> {
  id: string;
  correlationId: string;
  success: boolean;
  data?: T;
  error?: AppError;
  timestamp: number;
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export enum ErrorCode {
  INVALID_PAYLOAD = 'ERR_INVALID_PAYLOAD',
  UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  LOCAL_DAEMON_OFFLINE = 'ERR_LOCAL_DAEMON_OFFLINE',
  ROUTER_NO_AVAILABLE_MODEL = 'ERR_ROUTER_NO_AVAILABLE_MODEL',
  PROVIDER_API_FAILURE = 'ERR_PROVIDER_API_FAILURE',
  STORAGE_ERROR = 'ERR_STORAGE_ERROR',
  MEMORY_LOOKUP_TIMEOUT = 'ERR_MEMORY_LOOKUP_TIMEOUT',
  UNKNOWN = 'ERR_UNKNOWN',
}

// ============================================================================
// 2. Chat & Operator Domain Entities
// ============================================================================

export type ParticipantRole = 'operator' | 'interlocutor' | 'system' | 'ai_assistant';

export interface DialogMessage {
  id: string;
  sender: ParticipantRole;
  text: string;
  timestamp: number;
  metadata?: {
    sentiment?: 'positive' | 'neutral' | 'negative' | 'flirty' | 'angry';
    translatedText?: string;
    detectedLanguage?: string;
    rawElementId?: string;
  };
}

export interface InterlocutorProfile {
  id: string;
  platform: string;
  displayName: string;
  age?: number;
  location?: string;
  bio?: string;
  interests?: string[];
  notes?: string;
  sentimentTrend?: string;
}

export interface OperatorContextPayload {
  platform: string;
  profile: InterlocutorProfile;
  recentMessages: DialogMessage[];
  currentInputDraft?: string;
  operatorNotes?: string;
}

// ============================================================================
// 3. AI Core & Suggestion Contracts
// ============================================================================

export type SuggestionTone = 'casual' | 'witty' | 'empathetic' | 'flirty' | 'formal' | 'inquisitive';

export interface SuggestionRequestPayload {
  context: OperatorContextPayload;
  desiredTone?: SuggestionTone;
  customInstruction?: string;
  variantCount?: number;
}

export interface SuggestionItem {
  id: string;
  text: string;
  tone: SuggestionTone;
  confidence: number;
  reasoningBrief?: string;
}

export interface SuggestionResponsePayload {
  suggestions: SuggestionItem[];
  modelUsed: string;
  provider: ModelProviderId;
  latencyMs: number;
  cached: boolean;
}

// ============================================================================
// 4. Model Router Contracts
// ============================================================================

export type ModelProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'local';

export interface ModelProviderStatus {
  id: ModelProviderId;
  name: string;
  isAvailable: boolean;
  currentLatencyMs?: number;
  rpmLimitRemaining?: number;
  activeModelName: string;
}

export interface ModelRouteOptions {
  taskPriority: 'speed' | 'quality' | 'cost' | 'privacy';
  preferredProvider?: ModelProviderId;
  maxTokens?: number;
  temperature?: number;
}

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface IModelProvider {
  readonly id: ModelProviderId;
  isReady(): Promise<boolean>;
  generate(prompt: PromptPayload, options?: ModelRouteOptions): Promise<string>;
}

// ============================================================================
// 5. Memory Manager Contracts
// ============================================================================

export interface MemoryRecord {
  id: string;
  profileId: string;
  category: 'preference' | 'personal_fact' | 'boundary' | 'topic_interest' | 'timeline_event';
  key: string;
  value: string;
  confidenceScore: number;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryQuery {
  profileId: string;
  queryText?: string;
  categories?: MemoryRecord['category'][];
  limit?: number;
}

export interface IMemoryManager {
  search(query: MemoryQuery): Promise<MemoryRecord[]>;
  store(record: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryRecord>;
  summarizeContext(profileId: string): Promise<string>;
}
