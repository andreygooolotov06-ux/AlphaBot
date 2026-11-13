import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { SyncedDialogue, SyncedMessage, AutopilotLogEntry } from '@alphadate/contracts';

const STORAGE_API_KEY = 'ai_alphadate_custom_api_key_v1';

export function CommandCenterApp() {
  const [dialogues, setDialogues] = useState<SyncedDialogue[]>([]);
  const [activeDialogueId, setActiveDialogueId] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'autopilot'>('all');
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [newFactInput, setNewFactInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load of Dialogues & API Key
  const loadDialogues = () => {
    chrome.runtime.sendMessage({ type: 'CMD_GET_ALL_DIALOGUES' }, (res) => {
      if (res?.ok && Array.isArray(res.data) && res.data.length > 0) {
        setDialogues(res.data);
        if (!activeDialogueId || !res.data.some((d: SyncedDialogue) => d.id === activeDialogueId)) {
          setActiveDialogueId(res.data[0].id);
        }
      }
    });

    chrome.storage.local.get([STORAGE_API_KEY], (res) => {
      if (res[STORAGE_API_KEY]) {
        setApiKey(res[STORAGE_API_KEY]);
      }
    });
  };

  useEffect(() => {
    loadDialogues();

    // Listen to real-time updates from Background Worker
    const listener = (msg: any) => {
      if (msg?.type === 'CMD_DIALOGUE_UPDATED' && msg.payload) {
        const updated: SyncedDialogue = msg.payload;
        setDialogues((prev) => {
          const index = prev.findIndex((d) => d.id === updated.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updated;
            return next;
          }
          return [updated, ...prev];
        });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    const interval = setInterval(loadDialogues, 4000);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      clearInterval(interval);
    };
  }, [activeDialogueId]);

  // Scroll to bottom of chat on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogues, activeDialogueId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Active dialogue resolution
  const activeDialogue = dialogues.find((d) => d.id === activeDialogueId) || dialogues[0];

  // 2. Action: Send Message from Command Center into CRM
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeDialogue) return;

    setIsSending(true);
    chrome.runtime.sendMessage(
      {
        type: 'CMD_SEND_MESSAGE',
        payload: {
          dialogueId: activeDialogue.id,
          text,
        },
      },
      (res) => {
        setIsSending(false);
        if (res?.ok) {
          setInputText('');
          showToast(res.deliveredToCrm ? '✓ Отправлено в CRM!' : '✓ Добавлено в переписку');
        } else {
          showToast(`Ошибка отправки: ${res?.error || 'Сбой'}`);
        }
      }
    );
  };

  // 3. Action: Toggle Autopilot
  const handleToggleAutopilot = (dialogueId: string, enabled: boolean) => {
    chrome.runtime.sendMessage(
      {
        type: 'CMD_TOGGLE_AUTOPILOT',
        payload: { dialogueId, enabled },
      },
      (res) => {
        if (res?.ok) {
          showToast(enabled ? '🤖 Автопилот включен' : '👤 Переведено в ручной режим');
        }
      }
    );
  };

  // 4. Action: Regenerate AI Reply with Style
  const handleRegenerateAi = (styleOverride: string = '') => {
    if (!activeDialogue) return;
    chrome.runtime.sendMessage(
      {
        type: 'CMD_GENERATE_AI_REPLY',
        payload: {
          dialogueId: activeDialogue.id,
          styleOverride,
        },
      },
      (res) => {
        if (res?.ok) {
          showToast('✦ Генерация ответа запущена...');
        }
      }
    );
  };

  // 5. Action: Add Fact to Dossier
  const handleAddFact = () => {
    const fact = newFactInput.trim();
    if (!fact || !activeDialogue) return;
    chrome.runtime.sendMessage(
      {
        type: 'CMD_ADD_DOSSIER_FACT',
        payload: {
          dialogueId: activeDialogue.id,
          fact,
        },
      },
      (res) => {
        if (res?.ok) {
          setNewFactInput('');
          showToast('✓ Факт сохранен в памяти');
        }
      }
    );
  };

  // 6. Action: Add New Concurrent Test Dialogue
  const handleAddTestDialogue = () => {
    chrome.runtime.sendMessage({ type: 'CMD_ADD_TEST_DIALOGUE' }, (res) => {
      if (res?.ok && res.dialogue) {
        showToast('✓ Создан новый независимый диалог!');
        setActiveDialogueId(res.dialogue.id);
      }
    });
  };

  // 7. Save API Key
  const handleSaveApiKey = () => {
    const key = apiKey.trim();
    chrome.storage.local.set({ [STORAGE_API_KEY]: key }, () => {
      showToast('✓ API ключ Gemini сохранен!');
      setIsSettingsOpen(false);
    });
  };

  // Filtered dialogues
  const filteredDialogues = dialogues.filter((d) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = d.interlocutor.name.toLowerCase().includes(q);
      const matchId = d.id.toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    if (filter === 'unread') return d.unread;
    if (filter === 'autopilot') return d.autopilotEnabled;
    return true;
  });

  return (
    <div class="cmd-root">
      {/* 1. Global Header Bar */}
      <header class="cmd-header">
        <div class="cmd-brand">
          <span class="cmd-singularity-glyph">✦</span>
          <div>
            <div class="cmd-title">ALPHADATE COMMAND CENTER</div>
            <div class="cmd-subtitle">Автономный пульт управления диалогами CRM</div>
          </div>
        </div>

        <div class="cmd-header-stats">
          <div class="cmd-stat-pill">
            <span class="cmd-stat-dot online"></span>
            <span>CRM: <b>{dialogues.length} диалогов онлайн</b></span>
          </div>
          <div class="cmd-stat-pill">
            <span>🧠 <b>Gemini Multi-Model Active</b></span>
          </div>
          <button
            type="button"
            class="cmd-btn-secondary"
            onClick={handleAddTestDialogue}
            title="Добавить независимый тестовый диалог для проверки многопоточности"
          >
            + Тестовый диалог
          </button>
          <button
            type="button"
            class="cmd-btn-icon"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Настройки Gemini API"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Slide-down Settings Drawer */}
      {isSettingsOpen && (
        <div class="cmd-settings-bar">
          <div class="cmd-settings-row">
            <span>🔑 <b>Google Gemini API Ключ:</b></span>
            <input
              type="text"
              class="cmd-input"
              value={apiKey}
              onInput={(e: any) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
            />
            <button type="button" class="cmd-btn-primary" onClick={handleSaveApiKey}>
              Сохранить
            </button>
            <button type="button" class="cmd-btn-secondary" onClick={() => setIsSettingsOpen(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* 2. Main 3-Column Layout */}
      <div class="cmd-workspace">
        
        {/* Left Column: Dialogues List (Multi-Dialogue Hub) */}
        <aside class="cmd-col-sidebar">
          <div class="cmd-search-wrap">
            <input
              type="text"
              class="cmd-search-input"
              placeholder="🔍 Поиск по имени или ID..."
              value={searchQuery}
              onInput={(e: any) => setSearchQuery(e.target.value)}
            />
          </div>

          <div class="cmd-filters-row">
            <button
              type="button"
              class={`cmd-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Все ({dialogues.length})
            </button>
            <button
              type="button"
              class={`cmd-filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Входящие ({dialogues.filter((d) => d.unread).length})
            </button>
            <button
              type="button"
              class={`cmd-filter-btn ${filter === 'autopilot' ? 'active' : ''}`}
              onClick={() => setFilter('autopilot')}
            >
              Автопилот ({dialogues.filter((d) => d.autopilotEnabled).length})
            </button>
          </div>

          <div class="cmd-dialogues-list">
            {filteredDialogues.map((d) => {
              const isActive = d.id === activeDialogueId;
              const lastMsg = d.messages[d.messages.length - 1];
              const shortId = d.id.length > 10 ? `${d.id.slice(0, 8)}...` : d.id;

              return (
                <div
                  key={d.id}
                  class={`cmd-dialogue-card ${isActive ? 'active' : ''} ${d.unread ? 'unread' : ''}`}
                  onClick={() => setActiveDialogueId(d.id)}
                >
                  <div class="cmd-card-avatar">
                    {d.interlocutor.name.slice(0, 1).toUpperCase()}
                    {d.unread && <span class="cmd-unread-dot" />}
                  </div>

                  <div class="cmd-card-info">
                    <div class="cmd-card-header">
                      <span class="cmd-card-name">
                        {d.interlocutor.name}{d.interlocutor.age ? `, ${d.interlocutor.age}` : ''}
                      </span>
                      <span class="cmd-card-time">
                        {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div class="cmd-card-preview">
                      {lastMsg ? (
                        <span>
                          {lastMsg.sender === 'girl' ? 'Ты: ' : ''}
                          {lastMsg.text}
                        </span>
                      ) : (
                        <em>Диалог начат</em>
                      )}
                    </div>

                    <div class="cmd-card-footer">
                      <span class="cmd-tag-id">ID: {shortId}</span>
                      <span class={`cmd-tag-mode ${d.autopilotEnabled ? 'autopilot' : 'manual'}`}>
                        {d.autopilotEnabled ? '🤖 Автопилот' : '👤 Ручной'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Column: Live Conversation Feed & Composer */}
        <main class="cmd-col-center">
          {activeDialogue ? (
            <div class="cmd-chat-container">
              {/* Chat Header */}
              <div class="cmd-chat-header">
                <div class="cmd-chat-user-meta">
                  <div class="cmd-chat-avatar">
                    {activeDialogue.interlocutor.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div class="cmd-chat-name">
                      {activeDialogue.interlocutor.name}
                      {activeDialogue.interlocutor.age ? `, ${activeDialogue.interlocutor.age}` : ''}
                      <span class="cmd-online-badge">● Онлайн</span>
                    </div>
                    <div class="cmd-chat-submeta">
                      ID: <b>{activeDialogue.id}</b> · Анкета: <b>{activeDialogue.operatorProfile.name}</b>
                      {activeDialogue.interlocutor.location ? ` · 📍 ${activeDialogue.interlocutor.location}` : ''}
                    </div>
                  </div>
                </div>

                <div class="cmd-chat-header-actions">
                  <div class="cmd-autopilot-toggle-pill">
                    <label class="cmd-toggle-label">
                      <input
                        type="checkbox"
                        checked={activeDialogue.autopilotEnabled}
                        onChange={(e: any) => handleToggleAutopilot(activeDialogue.id, e.target.checked)}
                      />
                      <span>🤖 <b>Автопилот</b> ({activeDialogue.autopilotEnabled ? 'ВКЛ' : 'ВЫКЛ'})</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Messages Stream */}
              <div class="cmd-messages-stream">
                {activeDialogue.messages.map((m) => {
                  const isGirl = m.sender === 'girl';
                  return (
                    <div key={m.id} class={`cmd-msg-row ${isGirl ? 'outgoing' : 'incoming'}`}>
                      <div class="cmd-msg-bubble">
                        <div class="cmd-msg-sender">{isGirl ? 'Девушка (Ты)' : activeDialogue.interlocutor.name}</div>
                        <div class="cmd-msg-text">{m.text}</div>
                        <div class="cmd-msg-time">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isGirl && <span class="cmd-msg-status" title="Синхронизировано с CRM">✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div class="cmd-composer">
                {/* AI Draft Quick Bar */}
                {activeDialogue.draftReply && (
                  <div class="cmd-draft-bar">
                    <div class="cmd-draft-content">
                      <div class="cmd-draft-en">✦ <b>AI черновик (EN):</b> {activeDialogue.draftReply.textEn}</div>
                      <div class="cmd-draft-ru">🇷🇺 <b>Перевод:</b> {activeDialogue.draftReply.textRu}</div>
                    </div>
                    <button
                      type="button"
                      class="cmd-btn-draft-paste"
                      onClick={() => setInputText(activeDialogue.draftReply?.textEn || '')}
                      title="Вставить в поле ввода"
                    >
                      ⚡ Вставить
                    </button>
                  </div>
                )}

                <div class="cmd-composer-input-row">
                  <textarea
                    class="cmd-composer-textarea"
                    placeholder={`Напишите ответ для ${activeDialogue.interlocutor.name} (Ctrl+Enter для отправки в CRM)...`}
                    value={inputText}
                    onInput={(e: any) => setInputText(e.target.value)}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  <div class="cmd-composer-buttons">
                    <button
                      type="button"
                      class="cmd-btn-secondary"
                      onClick={() => handleRegenerateAi()}
                      title="Перегенерировать AI ответ"
                    >
                      🔄 AI
                    </button>
                    <button
                      type="button"
                      class="cmd-btn-primary"
                      disabled={isSending || !inputText.trim()}
                      onClick={() => handleSendMessage()}
                    >
                      {isSending ? '...' : 'Отправить в CRM'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div class="cmd-empty-state">
              <span class="cmd-empty-glyph">💬</span>
              <h3>Нет выбранного диалога</h3>
              <p>Выберите собеседника слева или добавьте тестовый диалог</p>
            </div>
          )}
        </main>

        {/* Right Column: AI Tactical Station & Independent Dossier */}
        <aside class="cmd-col-tactical">
          {activeDialogue ? (
            <div class="cmd-tactical-container">
              
              {/* 1. Tactical AI Engine Card */}
              <div class="cmd-tactical-card">
                <div class="cmd-card-title-row">
                  <span class="cmd-tactical-title">🧠 AI Tactical Station</span>
                  <button
                    type="button"
                    class="cmd-btn-mini"
                    onClick={() => handleRegenerateAi()}
                    title="Обновить ответ"
                  >
                    🔄
                  </button>
                </div>

                <div class="cmd-tactical-badges">
                  <div class="cmd-archetype-badge">
                    {activeDialogue.dossier.archetype || 'Анализ психотипа...'}
                  </div>
                  <div class="cmd-strategy-badge">
                    {activeDialogue.dossier.strategy || 'Тактический план...'}
                  </div>
                </div>

                {/* Tone chips */}
                <div class="cmd-tone-chips">
                  <button type="button" class="cmd-chip" onClick={() => handleRegenerateAi('bolder')}>
                    😏 Дерзко
                  </button>
                  <button type="button" class="cmd-chip" onClick={() => handleRegenerateAi('softer')}>
                    ❤️ Нежно
                  </button>
                  <button type="button" class="cmd-chip" onClick={() => handleRegenerateAi('frame')}>
                    🛡️ Фрейм
                  </button>
                  <button type="button" class="cmd-chip" onClick={() => handleRegenerateAi('balanced')}>
                    ✨ Базовый
                  </button>
                </div>

                {activeDialogue.draftReply && (
                  <div class="cmd-tactical-reply-box">
                    <div class="cmd-reply-label">Готовый ответ на английском:</div>
                    <div class="cmd-reply-text">{activeDialogue.draftReply.textEn}</div>
                    <div class="cmd-reply-trans">{activeDialogue.draftReply.textRu}</div>
                    
                    <button
                      type="button"
                      class="cmd-btn-primary full-width"
                      style="margin-top: 8px;"
                      onClick={() => handleSendMessage(activeDialogue.draftReply?.textEn)}
                    >
                      📨 Отправить этот AI ответ в CRM
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Independent Dossier & Memory */}
              <div class="cmd-tactical-card">
                <span class="cmd-tactical-title">🗂️ Досье и память собеседника</span>
                <p class="cmd-dossier-summary">{activeDialogue.dossier.summary}</p>

                <div class="cmd-facts-list">
                  {activeDialogue.dossier.facts.map((fact, idx) => (
                    <span key={idx} class="cmd-fact-pill">
                      {fact}
                    </span>
                  ))}
                </div>

                <div class="cmd-add-fact-row">
                  <input
                    type="text"
                    class="cmd-input-sm"
                    placeholder="+ Новый факт о клиенте..."
                    value={newFactInput}
                    onInput={(e: any) => setNewFactInput(e.target.value)}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter') handleAddFact();
                    }}
                  />
                  <button type="button" class="cmd-btn-secondary" onClick={handleAddFact}>
                    +
                  </button>
                </div>
              </div>

              {/* 3. Autopilot Activity Log */}
              <div class="cmd-tactical-card flex-1">
                <span class="cmd-tactical-title">⚡ История действий автопилота</span>
                <div class="cmd-audit-logs">
                  {activeDialogue.autopilotLogs.map((log) => (
                    <div key={log.id} class={`cmd-audit-entry ${log.status}`}>
                      <div class="cmd-log-meta">
                        <span class="cmd-log-action">{log.action}</span>
                        <span class="cmd-log-time">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <div class="cmd-log-details">{log.details}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : null}
        </aside>

      </div>

      {/* Global Toast */}
      {toastMessage && (
        <div class="cmd-toast">
          <span>✦</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

// Mount Preact App
const rootEl = document.getElementById('app');
if (rootEl) {
  render(<CommandCenterApp />, rootEl);
}