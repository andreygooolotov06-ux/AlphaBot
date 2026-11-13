import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  InterlocutorProfile,
  SuggestionItem,
  SuggestionTone,
  IPCResponse,
  SuggestionResponsePayload,
} from '@alphadate/contracts';

interface DialogueTab {
  id: string;
  name: string;
  platform: string;
  profile: InterlocutorProfile;
  suggestions: SuggestionItem[];
  facts: string[];
}

const DEFAULT_DIALOGUES: DialogueTab[] = [
  {
    id: 'user_anna_1',
    name: 'Анна (24)',
    platform: 'tinder',
    profile: {
      id: 'user_anna_1',
      platform: 'tinder',
      displayName: 'Анна',
      age: 24,
      location: 'Москва',
      bio: 'Архитектор. Люблю спешелти кофе, пешие прогулки и выставки современного искусства.',
      notes: 'Отвечает развернуто, ценит внимание к деталям.',
    },
    facts: ['☕ Спешелти кофе', '🏛️ Архитектор', '🎨 Выставки'],
    suggestions: [
      {
        id: 'sug_1',
        text: 'Кофе и архитектура — идеальный дуэт для прогулки. Есть любимое здание в центре, мимо которого никогда не пройдешь просто так?',
        tone: 'inquisitive',
        confidence: 0.94,
        reasoningBrief: 'Увязка профессии с темой прогулок',
      },
      {
        id: 'sug_2',
        text: 'Спешелти кофе — это уже диагноз) Знаю пару спотов с идеальным V60, можем как-нибудь устроить дегустацию ;)',
        tone: 'witty',
        confidence: 0.91,
        reasoningBrief: 'Легкий флирт через общую тему кофе',
      },
      {
        id: 'sug_3',
        text: 'Очень вдохновляющая анкета! На какую выставку ходила в последний раз?',
        tone: 'casual',
        confidence: 0.88,
        reasoningBrief: 'Простой открытый вопрос для поддержания диалога',
      },
    ],
  },
  {
    id: 'user_elena_2',
    name: 'Елена (27)',
    platform: 'badoo',
    profile: {
      id: 'user_elena_2',
      platform: 'badoo',
      displayName: 'Елена',
      age: 27,
      location: 'СПб',
      bio: 'Путешествия, горы, бордер-колли по кличке Марс.',
      notes: 'Собачница, любит активный отдых.',
    },
    facts: ['🐶 Бордер-колли Марс', '⛰️ Горы', '✈️ Путешествия'],
    suggestions: [
      {
        id: 'sug_e1',
        text: 'Марс — потрясающее имя для бордера! Он у тебя космический непоседа или образцово воспитанный пес?)',
        tone: 'witty',
        confidence: 0.95,
        reasoningBrief: 'Комплимент кличке собаки',
      },
    ],
  },
];

export function App() {
  const [dialogues, setDialogues] = useState<DialogueTab[]>(DEFAULT_DIALOGUES);
  const [activeTabId, setActiveTabId] = useState<string>('user_anna_1');
  const [isDaemonOnline, setIsDaemonOnline] = useState<boolean>(false);
  const [activeModel, setActiveModel] = useState<string>('Проверка...');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [newFact, setNewFact] = useState<string>('');
  const [selectedTone, setSelectedTone] = useState<SuggestionTone>('witty');

  const currentDialogue = dialogues.find((d) => d.id === activeTabId) ?? dialogues[0]!;

  // 1. Health check to Background Service Worker
  const checkDaemonStatus = () => {
    chrome.runtime.sendMessage({ type: 'HEARTBEAT', id: `hb_${Date.now()}` }, (response: IPCResponse) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        setIsDaemonOnline(false);
        setActiveModel('Демон офлайн');
      } else {
        setIsDaemonOnline(true);
        setActiveModel('Gemini 1.5 Flash (WAL)');
      }
    });
  };

  useEffect(() => {
    checkDaemonStatus();
    const interval = setInterval(checkDaemonStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 2. Insert suggestion directly into page input
  const insertSuggestion = (text: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'INSERT_SUGGESTION', text }, (res) => {
          if (res?.success) {
            showToast('✓ Вставлено в поле ввода');
          } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(text);
            showToast('✓ Скопировано в буфер (окно ввода не найдено)');
          }
        });
      } else {
        navigator.clipboard.writeText(text);
        showToast('✓ Скопировано в буфер');
      }
    });
  };

  // 3. Generate new suggestions via Local Daemon
  const generateSuggestions = () => {
    setIsLoading(true);
    const payload = {
      context: {
        platform: currentDialogue.platform,
        profile: currentDialogue.profile,
        recentMessages: [
          { id: '1', sender: 'operator', text: 'Привет!', timestamp: Date.now() - 60000 },
          { id: '2', sender: 'interlocutor', text: currentDialogue.profile.bio ?? 'Привет)', timestamp: Date.now() },
        ],
      },
      desiredTone: selectedTone,
      customInstruction: customPrompt,
      variantCount: 3,
    };

    chrome.runtime.sendMessage(
      {
        type: 'GENERATE_SUGGESTIONS',
        id: `gen_${Date.now()}`,
        payload,
      },
      (res: IPCResponse<SuggestionResponsePayload>) => {
        setIsLoading(false);
        if (res?.success && res.data?.suggestions) {
          setDialogues((prev) =>
            prev.map((d) => (d.id === activeTabId ? { ...d, suggestions: res.data!.suggestions } : d))
          );
          showToast(`✓ Сгенерировано (${res.data.latencyMs} мс)`);
        } else {
          showToast(`Ошибка: ${res?.error?.message ?? 'Сбой связи'}`);
        }
      }
    );
  };

  // 4. Add fact to memory
  const addFact = () => {
    if (!newFact.trim()) return;
    setDialogues((prev) =>
      prev.map((d) =>
        d.id === activeTabId ? { ...d, facts: [...d.facts, newFact.trim()] } : d
      )
    );
    // Also dispatch to memory manager
    chrome.runtime.sendMessage({
      type: 'SAVE_MEMORY',
      id: `save_${Date.now()}`,
      payload: {
        profileId: currentDialogue.id,
        category: 'preference',
        key: 'note',
        value: newFact.trim(),
        confidenceScore: 1.0,
      },
    });
    setNewFact('');
    showToast('✓ Факт сохранен в память');
  };

  return (
    <div id="app">
      {/* Header */}
      <header class="header">
        <div class="brand">
          <div class="brand-dot"></div>
          <span>AlphaDate AI</span>
        </div>
        <div class={`status-badge ${isDaemonOnline ? 'status-online' : 'status-offline'}`}>
          <span style={{ fontSize: '10px' }}>●</span>
          <span>{isDaemonOnline ? activeModel : 'Демон офлайн'}</span>
        </div>
      </header>

      {/* Multi-dialogue Tab Bar */}
      <nav class="tabs-nav">
        {dialogues.map((d) => (
          <button
            key={d.id}
            class={`tab-btn ${d.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTabId(d.id)}
          >
            {d.name}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main class="content">
        {/* Interlocutor Card */}
        <section class="card">
          <div class="card-header">
            <span class="card-title">{currentDialogue.profile.displayName}, {currentDialogue.profile.age}</span>
            <span class="meta-sub">{currentDialogue.profile.location} • {currentDialogue.platform.toUpperCase()}</span>
          </div>
          <p style={{ fontSize: '12px', color: '#c7cbd2' }}>{currentDialogue.profile.bio}</p>

          {/* Memory Facts */}
          <div class="facts-container">
            {currentDialogue.facts.map((f, i) => (
              <span key={i} class="fact-pill">{f}</span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <input
              type="text"
              class="custom-input"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              placeholder="+ Новый факт (напр: любит горы)"
              value={newFact}
              onInput={(e) => setNewFact((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && addFact()}
            />
            <button class="btn btn-secondary" onClick={addFact}>Сохранить</button>
          </div>
        </section>

        {/* Suggestion List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>Варианты ответов</span>
            <span style={{ fontSize: '10px', color: '#8b92a0' }}>Горячие клавиши: Alt+1, Alt+2, Alt+3</span>
          </div>

          {currentDialogue.suggestions.map((sug, idx) => (
            <div key={sug.id || idx} class="suggestion-card">
              <div class="sug-header">
                <span class={`tone-badge tone-${sug.tone}`}>{sug.tone}</span>
                <span class="sug-confidence">{(sug.confidence * 100).toFixed(0)}% уверенность</span>
              </div>
              <p class="sug-text">{sug.text}</p>
              {sug.reasoningBrief && <p class="sug-reasoning">{sug.reasoningBrief}</p>}
              <div class="sug-actions">
                <button class="btn btn-primary" onClick={() => insertSuggestion(sug.text)}>
                  Вставить (Alt+{idx + 1})
                </button>
                <button
                  class="btn btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(sug.text);
                    showToast('✓ Скопировано в буфер');
                  }}
                >
                  Копировать
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Generation Controls */}
        <section class="card controls-card">
          <span class="card-title">Управление генерацией</span>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            {(['witty', 'casual', 'inquisitive', 'flirty'] as SuggestionTone[]).map((t) => (
              <button
                key={t}
                class={`btn ${selectedTone === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '4px 6px', fontSize: '10px', textTransform: 'capitalize' }}
                onClick={() => setSelectedTone(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            class="custom-input"
            rows={2}
            placeholder="Инструкция: например, предложи встретиться на выходных..."
            value={customPrompt}
            onInput={(e) => setCustomPrompt((e.target as HTMLTextAreaElement).value)}
          />

          <button
            class="generate-btn"
            disabled={isLoading}
            onClick={generateSuggestions}
          >
            {isLoading ? 'Генерация вариантов...' : '⚡ Сгенерировать варианты'}
          </button>
        </section>
      </main>

      {/* Toast Notification */}
      {toastMessage && <div class="toast">{toastMessage}</div>}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
