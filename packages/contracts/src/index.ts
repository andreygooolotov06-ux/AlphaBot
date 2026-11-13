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
  // Lifecycle & Health
  | 'HANDSHAKE'
  | 'HANDSHAKE_ACK'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'GET_SYSTEM_STATUS'
  | 'UPDATE_CONFIG'
  // AI Operations
  | 'ANALYZE_CONTEXT'
  | 'GENERATE_SUGGESTIONS'
  | 'STREAM_SUGGESTION_CHUNK'
  | 'STREAM_SUGGESTION_END'
  // Memory & Profile Operations
  | 'SEARCH_MEMORY'
  | 'SAVE_MEMORY'
  | 'DELETE_MEMORY'
  | 'GET_PROFILE'
  | 'UPDATE_PROFILE';

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
  // Network & Transport
  ERR_LOCAL_DAEMON_OFFLINE = 'ERR_LOCAL_DAEMON_OFFLINE',
  ERR_UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  ERR_INVALID_PROTOCOL_VERSION = 'ERR_INVALID_PROTOCOL_VERSION',
  ERR_TIMEOUT = 'ERR_TIMEOUT',

  // Validation
  ERR_INVALID_PAYLOAD = 'ERR_INVALID_PAYLOAD',
  ERR_MISSING_REQUIRED_FIELD = 'ERR_MISSING_REQUIRED_FIELD',

  // AI & Providers
  ERR_ROUTER_NO_AVAILABLE_MODEL = 'ERR_ROUTER_NO_AVAILABLE_MODEL',
  ERR_PROVIDER_API_FAILURE = 'ERR_PROVIDER_API_FAILURE',
  ERR_PROVIDER_RATE_LIMIT = 'ERR_PROVIDER_RATE_LIMIT',
  ERR_PROVIDER_INVALID_KEY = 'ERR_PROVIDER_INVALID_KEY',

  // Storage & Memory
  ERR_STORAGE_READ_ERROR = 'ERR_STORAGE_READ_ERROR',
  ERR_STORAGE_WRITE_ERROR = 'ERR_STORAGE_WRITE_ERROR',
  ERR_PROFILE_NOT_FOUND = 'ERR_PROFILE_NOT_FOUND',
  ERR_MEMORY_LOOKUP_TIMEOUT = 'ERR_MEMORY_LOOKUP_TIMEOUT',

  // General
  ERR_INTERNAL = 'ERR_INTERNAL',
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
    sentiment?: 'positive' | 'neutral' | 'negative' | 'flirty' | 'angry' | 'curious';
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
  lastActiveTimestamp?: number;
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

export type SuggestionTone =
  | 'casual'
  | 'witty'
  | 'empathetic'
  | 'flirty'
  | 'formal'
  | 'inquisitive';

export interface SuggestionRequestPayload {
  context: OperatorContextPayload;
  desiredTone?: SuggestionTone;
  customInstruction?: string;
  variantCount?: number;
  streamResponse?: boolean;
}

export interface SuggestionItem {
  id: string;
  text: string;
  tone: SuggestionTone;
  confidence: number;
  reasoningBrief?: string;
}

export interface SuggestionAnalysis {
  sentiment: string;
  detectedIntent: string;
  recommendedAction: string;
}

export interface SuggestionResponsePayload {
  suggestions: SuggestionItem[];
  analysis?: SuggestionAnalysis;
  modelUsed: string;
  provider: ModelProviderId;
  latencyMs: number;
  cached: boolean;
}

export interface StreamChunkPayload {
  variantIndex: number;
  delta: string;
}

export interface StreamEndPayload {
  finalSuggestions: SuggestionItem[];
  latencyMs: number;
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
  lastError?: string;
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

export type MemoryCategory =
  | 'preference'
  | 'personal_fact'
  | 'boundary'
  | 'topic_interest'
  | 'timeline_event';

export interface MemoryRecord {
  id: string;
  profileId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidenceScore: number;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryQuery {
  profileId: string;
  queryText?: string;
  categories?: MemoryCategory[];
  limit?: number;
}

export interface IMemoryManager {
  search(query: MemoryQuery): Promise<MemoryRecord[]>;
  store(record: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryRecord>;
  summarizeContext(profileId: string): Promise<string>;
  deleteRecord(id: string): Promise<boolean>;
}

// ============================================================================
// 6. SQLite Database Entities (Host Daemon Tier)
// ============================================================================

export interface ProfileEntity {
  id: string;
  platform: string;
  display_name: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface DialogSessionEntity {
  id: string;
  profile_id: string;
  platform: string;
  status: 'active' | 'archived';
  started_at: number;
  ended_at: number | null;
  message_count: number;
}

export interface MessageEntity {
  id: string;
  session_id: string;
  profile_id: string;
  sender_role: ParticipantRole;
  content: string;
  sentiment: string | null;
  timestamp: number;
}

export interface MemoryFactEntity {
  id: string;
  profile_id: string;
  category: MemoryCategory;
  fact_key: string;
  fact_value: string;
  confidence: number;
  created_at: number;
  updated_at: number;
}

export interface OperatorTemplateEntity {
  id: string;
  category: string;
  title: string;
  content_template: string;
  tags: string | null;
  usage_count: number;
  created_at: number;
}

export interface AuditLogEntity {
  id: string;
  action_type: string;
  profile_id: string | null;
  model_used: string | null;
  latency_ms: number;
  success: number;
  error_message: string | null;
  timestamp: number;
}

// ============================================================================
// 7. Handshake & Config DTOs
// ============================================================================

export interface HandshakeRequest {
  clientVersion: string;
  protocolVersion: typeof ALPHADATE_PROTOCOL_VERSION;
  extensionId: string;
}

export interface HandshakeResponse {
  success: boolean;
  serverVersion: string;
  protocolVersion: typeof ALPHADATE_PROTOCOL_VERSION;
  activeProviders: ModelProviderId[];
}

// ============================================================================
// 8. Command Center Real-Time Synchronized Dialogues
// ============================================================================

export interface SyncedMessage {
  id: string;
  sender: 'man' | 'girl';
  text: string;
  timestamp: number;
  deliveredToCrm?: boolean;
}

export interface AutopilotLogEntry {
  id: string;
  timestamp: number;
  action: string;
  details?: string;
  status: 'success' | 'warning' | 'info';
}

export interface DialogueDossier {
  archetype: string;
  strategy: string;
  facts: string[];
  summary: string;
}

export interface SyncedDialogue {
  id: string; // unique dialogue ID (e.g. from URL /chat/8eubddc1-...)
  tabId?: number;
  platform: string;
  interlocutor: {
    id: string;
    name: string;
    age?: string;
    photo?: string;
    location?: string;
    status: string;
  };
  operatorProfile: {
    name: string;
    id?: string;
    location?: string;
  };
  messages: SyncedMessage[];
  lastActivity: number;
  unread: boolean;
  autopilotEnabled: boolean;
  autopilotLogs: AutopilotLogEntry[];
  dossier: DialogueDossier;
  draftReply?: {
    textEn: string;
    textRu: string;
    generatedAt: number;
  };
  isProcessingAi?: boolean;
}
