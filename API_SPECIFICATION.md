# Спецификация API: AlphaDate Personal AI

**Статус:** Утвержденная спецификация HTTP REST и WebSocket протокола.  
**Сервер:** Local Application Daemon (Node.js).  
**Клиент:** Chrome Extension (Manifest V3 Background SW / Side Panel).

---

## 1. Общие параметры подключения и безопасность

* **Локальный хост:** `127.0.0.1` (строго петлевой интерфейс, доступ из внешней сети закрыт).
* **HTTP REST порт:** `4789`
* **WebSocket порт:** `4790`
* **CORS Policy:** Сервер принимает запросы исключительно с источников:
  - `chrome-extension://<EXTENSION_ID>`
  - `http://127.0.0.1:4789`
* **Аутентификация:** Каждый HTTP-запрос обязан содержать заголовок:
  ```http
  X-AlphaDate-Token: <LOCAL_APP_SECRET_TOKEN>
  ```
  Для WebSocket токен передается в query-параметре: `ws://127.0.0.1:4790?token=<LOCAL_APP_SECRET_TOKEN>`.

---

## 2. HTTP REST Эндпоинты

### 2.1 Проверка состояния демона (`GET /health`)
Используется расширением для быстрой проверки доступности локального приложения.
* **Запрос:** `GET http://127.0.0.1:4789/health`
* **Ответ (200 OK):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptimeSeconds": 1420,
  "database": "connected"
}
```

---

### 2.2 Рукопожатие и согласование версии (`POST /v1/handshake`)
Выполняется при установке или обновлении расширения.
* **Запрос:** `POST http://127.0.0.1:4789/v1/handshake`
* **Тело запроса:**
```json
{
  "clientVersion": "0.1.0",
  "protocolVersion": "1.0.0",
  "extensionId": "abcdefghijklmnop..."
}
```
* **Ответ (200 OK):**
```json
{
  "success": true,
  "serverVersion": "0.1.0",
  "protocolVersion": "1.0.0",
  "activeProviders": ["gemini", "openai"]
}
```

---

### 2.3 Статус AI-моделей (`GET /v1/system/status`)
Возвращает информацию о доступности подключенных нейросетевых провайдеров.
* **Запрос:** `GET http://127.0.0.1:4789/v1/system/status`
* **Ответ (200 OK):**
```json
{
  "success": true,
  "providers": [
    {
      "id": "gemini",
      "name": "Google Gemini",
      "isAvailable": true,
      "currentLatencyMs": 420,
      "activeModelName": "gemini-1.5-flash"
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "isAvailable": true,
      "currentLatencyMs": 680,
      "activeModelName": "gpt-4o-mini"
    },
    {
      "id": "local",
      "name": "Local Ollama",
      "isAvailable": false,
      "activeModelName": "llama3:8b",
      "lastError": "Connection refused on 127.0.0.1:11434"
    }
  ]
}
```

---

### 2.4 Генерация вариантов ответов (`POST /v1/ai/suggestions`)
Основной рабочий запрос для получения вариантов ответов оператору.
* **Запрос:** `POST http://127.0.0.1:4789/v1/ai/suggestions`
* **Тело запроса (`IPCRequest<SuggestionRequestPayload>`):**
```json
{
  "id": "req_1794540123_abc",
  "version": "1.0.0",
  "type": "GENERATE_SUGGESTIONS",
  "timestamp": 1794540123000,
  "payload": {
    "context": {
      "platform": "tinder",
      "profile": {
        "id": "user_98765",
        "platform": "tinder",
        "displayName": "Елена",
        "age": 25,
        "bio": "Люблю горы, кофе и бордер-колли"
      },
      "recentMessages": [
        {
          "id": "msg_1",
          "sender": "operator",
          "text": "Привет! Отличные фото из походов. Куда в последний раз выбиралась?",
          "timestamp": 1794539900000
        },
        {
          "id": "msg_2",
          "sender": "interlocutor",
          "text": "Привет) Была на выходных на Алтае с собакой, впечатлений море!",
          "timestamp": 1794540100000
        }
      ],
      "currentInputDraft": ""
    },
    "desiredTone": "witty",
    "variantCount": 3
  }
}
```

* **Ответ (200 OK — `IPCResponse<SuggestionResponsePayload>`):**
```json
{
  "id": "resp_1794540124_xyz",
  "correlationId": "req_1794540123_abc",
  "success": true,
  "timestamp": 1794540124150,
  "data": {
    "suggestions": [
      {
        "id": "sug_1",
        "text": "Алтай с собакой — это мощно! Кто из вас больше устал: ты от подъемов или пес от счастья?",
        "tone": "witty",
        "confidence": 0.94,
        "reasoningBrief": "Увязка факта о породе собаки с недавней поездкой на Алтай"
      },
      {
        "id": "sug_2",
        "text": "Круто! В горах сейчас, наверное, воздух невероятный. Какую локацию брали штурмом?",
        "tone": "inquisitive",
        "confidence": 0.89,
        "reasoningBrief": "Поддержание диалога вопросом о деталях похода"
      },
      {
        "id": "sug_3",
        "text": "Обожаю людей, которые не сидят на месте на выходных. Пес, небось, теперь спит без задних лап?",
        "tone": "casual",
        "confidence": 0.91,
        "reasoningBrief": "Теплый эмпатичный комментарий"
      }
    ],
    "analysis": {
      "sentiment": "positive",
      "detectedIntent": "sharing_experience",
      "recommendedAction": "ask_about_dog_or_route"
    },
    "modelUsed": "gemini-1.5-flash",
    "provider": "gemini",
    "latencyMs": 820,
    "cached": false
  }
}
```

---

### 2.5 Управление памятью (`/v1/memory`)

* **Поиск фактов:** `GET /v1/memory?profileId=user_98765&category=preference`
* **Сохранение факта:** `POST /v1/memory`
  * Тело:
  ```json
  {
    "profileId": "user_98765",
    "category": "personal_fact",
    "key": "pet",
    "value": "Бордер-колли",
    "confidenceScore": 0.98
  }
  ```
* **Удаление факта:** `DELETE /v1/memory/:id`

---

## 3. WebSocket Протокол (`ws://127.0.0.1:4790`)

### 3.1 Сценарии использования
1. Потоковая генерация длинных ответов чанками для отображения эффекта печатания в реальном времени.
2. Мгновенная доставка системных уведомлений (например, "Провайдер Gemini недоступен, переключено на GPT-4o-mini").

### 3.2 События потока (Server -> Client)

#### Чанк потока (`STREAM_SUGGESTION_CHUNK`):
```json
{
  "id": "stream_chunk_42",
  "correlationId": "req_1794540123_abc",
  "success": true,
  "type": "STREAM_SUGGESTION_CHUNK",
  "data": {
    "variantIndex": 0,
    "delta": "Алтай с собакой — это"
  },
  "timestamp": 1794540123400
}
```

#### Завершение потока (`STREAM_SUGGESTION_END`):
```json
{
  "id": "stream_end_43",
  "correlationId": "req_1794540123_abc",
  "success": true,
  "type": "STREAM_SUGGESTION_END",
  "data": {
    "finalSuggestions": [...],
    "latencyMs": 750
  },
  "timestamp": 1794540123750
}
```

### 3.3 Heartbeat (Пинг-понг)
* Клиент (расширение) каждые **15 секунд** отправляет: `{"type": "HEARTBEAT", "timestamp": ...}`.
* Сервер отвечает: `{"type": "HEARTBEAT_ACK", "timestamp": ...}`.
* Если ответа нет в течение 5 секунд, клиент запускает процедуру переподключения.
