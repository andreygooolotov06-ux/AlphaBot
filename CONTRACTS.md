# Архитектурные контракты системы: AlphaDate Personal AI

**Статус:** Базовый стандарт взаимодействия компонентов.  
**Пакет реализации:** `packages/contracts` (`@alphadate/contracts`).  
**Текущая версия протокола:** `1.0.0`.

---

## 1. Фундаментальные правила контрактов

1. **Единый источник правды (Single Source of Truth):**
   * Все интерфейсы, перечисления (`enum`), DTO и протоколы обмена данными определяются **исключительно** в пакете `packages/contracts`.
   * Ни Frontend (Chrome Extension), ни Backend (Local App) не имеют права объявлять собственные копии типов сообщений. Все импортируется строго через `import { ... } from '@alphadate/contracts'`.

2. **Правило неизменяемости (Contract Immutability):**
   * Опубликованные интерфейсы версии `1.0.0` запрещено менять «на лету».
   * Если Агенту 2 (Backend) требуется новое поле в ответе — он обязан создать отдельную ветку `contract/<proposal>`, предложить изменение типа и согласовать его с Агентом 1 (Lead Architect).
   * Добавление необязательных полей (`field?: type`) допускается в минорных обновлениях. Удаление или переименование существующих полей в рамках одной мажорной версии строго запрещено.

3. **Runtime-валидация:**
   * Все входящие полезные нагрузки (payload) на стороне Local App Daemon и Background Service Worker валидируются перед обработкой.

---

## 2. Протокол взаимодействия (IPC / WebSocket Envelope)

Все сообщения между Chrome Extension и Local Application упаковываются в стандартный конверт запроса и ответа.

### 2.1 Конверт запроса (`IPCRequest<T>`)
```typescript
export interface IPCRequest<T = unknown> {
  /** Уникальный идентификатор сообщения (UUID v4) */
  id: string;
  /** Версия протокола (всегда ALPHADATE_PROTOCOL_VERSION = '1.0.0') */
  version: '1.0.0';
  /** Тип команды */
  type: MessageType;
  /** Данные запроса, соответствующие типу команды */
  payload: T;
  /** Временная метка отправки (Unix timestamp в миллисекундах) */
  timestamp: number;
}
```

### 2.2 Конверт ответа (`IPCResponse<T>`)
```typescript
export interface IPCResponse<T = unknown> {
  /** Уникальный идентификатор ответа */
  id: string;
  /** ID запроса, на который сформирован этот ответ (для корреляции) */
  correlationId: string;
  /** Флаг успешности выполнения операции */
  success: boolean;
  /** Полезная нагрузка в случае успеха */
  data?: T;
  /** Структурированная ошибка в случае неудачи */
  error?: AppError;
  /** Временная метка ответа */
  timestamp: number;
}
```

### 2.3 Каталог команд (`MessageType`)
```typescript
export type MessageType =
  // Служебные команды
  | 'HANDSHAKE'              // Инициализация соединения и проверка токена
  | 'HEARTBEAT'              // Пинг/понг для поддержания связи
  | 'GET_SYSTEM_STATUS'      // Статус провайдеров, памяти, базы данных
  | 'UPDATE_CONFIG'          // Обновление локальных настроек
  // Операционные команды
  | 'ANALYZE_CONTEXT'        // Экспресс-анализ последнего входящего сообщения
  | 'GENERATE_SUGGESTIONS'   // Генерация вариантов ответов
  | 'SEARCH_MEMORY'          // Поиск фактов о собеседнике
  | 'SAVE_MEMORY'            // Ручное или автоматическое сохранение факта
  | 'STREAM_SUGGESTION_CHUNK'// Потоковый чанк ответа (WebSocket)
  | 'STREAM_SUGGESTION_END'; // Завершение потока
```

---

## 3. Сущности предметной области (Domain Entities)

### 3.1 Сообщение диалога (`DialogMessage`)
```typescript
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
```

### 3.2 Профиль собеседника (`InterlocutorProfile`)
```typescript
export interface InterlocutorProfile {
  id: string;                     // Уникальный ID на платформе (username / internal id)
  platform: string;               // Название платформы ('tinder', 'badoo', 'custom', etc.)
  displayName: string;            // Отображаемое имя
  age?: number;
  location?: string;
  bio?: string;
  interests?: string[];
  notes?: string;                 // Заметки оператора
  lastActiveTimestamp?: number;
}
```

### 3.3 Контекст оператора (`OperatorContextPayload`)
```typescript
export interface OperatorContextPayload {
  platform: string;
  profile: InterlocutorProfile;
  recentMessages: DialogMessage[]; // Последние 5-15 сообщений для контекста
  currentInputDraft?: string;      // То, что оператор уже начал набирать руками
  operatorNotes?: string;
}
```

---

## 4. Контракты AI Core и подсказок

### 4.1 Запрос подсказок (`SuggestionRequestPayload`)
```typescript
export type SuggestionTone = 
  | 'casual'       // Непринужденный, легкий
  | 'witty'        // Остроумный, с юмором
  | 'empathetic'   // Чуткий, поддерживающий
  | 'flirty'       // Игривый, флиртующий
  | 'inquisitive'  // Задающий вовлекающий вопрос
  | 'formal';      // Вежливый, сдержанный

export interface SuggestionRequestPayload {
  context: OperatorContextPayload;
  desiredTone?: SuggestionTone;
  customInstruction?: string;      // Например: "спроси про ее собаку"
  variantCount?: number;           // По умолчанию 3
  streamResponse?: boolean;        // Требуется ли WebSocket-стриминг
}
```

### 4.2 Ответ с подсказками (`SuggestionResponsePayload`)
```typescript
export interface SuggestionItem {
  id: string;
  text: string;
  tone: SuggestionTone;
  confidence: number;              // От 0.0 до 1.0
  reasoningBrief?: string;         // Краткое пояснение: "Опирается на факт о любви к горам"
}

export interface SuggestionResponsePayload {
  suggestions: SuggestionItem[];
  analysis?: {
    sentiment: string;
    detectedIntent: string;
    recommendedAction: string;
  };
  modelUsed: string;
  provider: ModelProviderId;
  latencyMs: number;
  cached: boolean;
}
```

---

## 5. Контракты Model Router

```typescript
export type ModelProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'local';

export interface ModelProviderStatus {
  id: ModelProviderId;
  name: string;
  isAvailable: boolean;
  currentLatencyMs?: number;
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
```

---

## 6. Контракты Memory Manager

```typescript
export type MemoryCategory = 
  | 'preference'        // Любимые блюда, музыка, отдых
  | 'personal_fact'     // Профессия, питомцы, авто, семья
  | 'boundary'          // Неприятные темы, табу
  | 'topic_interest'    // То, что человек готов обсуждать часами
  | 'timeline_event';   // "Завтра идет к стоматологу", "Вернется в пятницу"

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
```

---

## 7. Каталог ошибок (`ErrorCode`)

```typescript
export enum ErrorCode {
  // Ошибки сети и транспорта
  ERR_LOCAL_DAEMON_OFFLINE = 'ERR_LOCAL_DAEMON_OFFLINE',
  ERR_UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  ERR_INVALID_PROTOCOL_VERSION = 'ERR_INVALID_PROTOCOL_VERSION',
  ERR_TIMEOUT = 'ERR_TIMEOUT',

  // Ошибки валидации
  ERR_INVALID_PAYLOAD = 'ERR_INVALID_PAYLOAD',
  ERR_MISSING_REQUIRED_FIELD = 'ERR_MISSING_REQUIRED_FIELD',

  // Ошибки AI-провайдеров
  ERR_ROUTER_NO_AVAILABLE_MODEL = 'ERR_ROUTER_NO_AVAILABLE_MODEL',
  ERR_PROVIDER_API_FAILURE = 'ERR_PROVIDER_API_FAILURE',
  ERR_PROVIDER_RATE_LIMIT = 'ERR_PROVIDER_RATE_LIMIT',
  ERR_PROVIDER_INVALID_KEY = 'ERR_PROVIDER_INVALID_KEY',

  // Ошибки базы данных и памяти
  ERR_STORAGE_READ_ERROR = 'ERR_STORAGE_READ_ERROR',
  ERR_STORAGE_WRITE_ERROR = 'ERR_STORAGE_WRITE_ERROR',
  ERR_PROFILE_NOT_FOUND = 'ERR_PROFILE_NOT_FOUND',

  // Общие
  ERR_INTERNAL = 'ERR_INTERNAL',
}
```
