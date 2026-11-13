/**
 * AlphaDate Personal AI — Background Service Worker v3.0
 * Features:
 * - Real-Time Command Center Multi-Dialogue Coordinator (3+ independent dialogues)
 * - Bidirectional CRM Synchronization & Message Dispatching
 * - Autonomous Autopilot Queue (per-dialogue independent queues)
 * - Independent Dossier & Memory Management
 * - Multi-Model Fallback Cascade (Gemini Flash / Pro)
 */

import { SyncedDialogue, SyncedMessage, AutopilotLogEntry } from '@alphadate/contracts';

const GEMINI_ROOT = 'https://generativelanguage.googleapis.com/v1beta';
const STORAGE_SYNCED_DIALOGUES = 'alphadate_synced_dialogues_v1';
const STORAGE_API_KEY = 'ai_alphadate_custom_api_key_v1';

// In-memory dialogue processing queues (isolated per dialogue ID)
const dialogueProcessingQueues = new Map<string, Promise<any>>();

// Seed dialogues for immediate 3-dialogue operational readiness
const INITIAL_SEED_DIALOGUES: Record<string, SyncedDialogue> = {
  '8eubddc1-ho1vgjxr-xr65f2lp-1ayvz25q': {
    id: '8eubddc1-ho1vgjxr-xr65f2lp-1ayvz25q',
    platform: 'alpha.date',
    interlocutor: {
      id: '8eubddc1-ho1vgjxr-xr65f2lp-1ayvz25q',
      name: 'Luis Lopez',
      age: '26',
      location: 'Mexico City, Mexico',
      status: 'online',
    },
    operatorProfile: {
      name: 'Huang',
      id: '1353686369',
      location: 'Mexico City',
    },
    messages: [
      {
        id: 'msg_l1',
        sender: 'girl',
        text: 'Hey Luis! Loved your energy in the photos. Are you always this adventurous?',
        timestamp: Date.now() - 3600000,
        deliveredToCrm: true,
      },
      {
        id: 'msg_l2',
        sender: 'man',
        text: 'Haha thanks! Yeah I love racing and extreme sports. But I hate waiting on this app.',
        timestamp: Date.now() - 1800000,
        deliveredToCrm: true,
      },
      {
        id: 'msg_l3',
        sender: 'girl',
        text: 'Patience makes the sweetest reward, you know 😉 What kind of racing do you do?',
        timestamp: Date.now() - 900000,
        deliveredToCrm: true,
      },
      {
        id: 'msg_l4',
        sender: 'man',
        text: "I'M GIVING YOU ONE LAST CHANCE TO WRITE DOWN MY PHONE NUMBER AND MOVE TO WHATSAPP!",
        timestamp: Date.now() - 60000,
        deliveredToCrm: true,
      },
    ],
    lastActivity: Date.now() - 60000,
    unread: true,
    autopilotEnabled: false,
    autopilotLogs: [
      {
        id: 'log_l1',
        timestamp: Date.now() - 60000,
        action: 'Входящее сообщение',
        details: 'Мужчина требует номер телефона капслоком. Сработала защита anti-offsite.',
        status: 'warning',
      },
      {
        id: 'log_l2',
        timestamp: Date.now() - 55000,
        action: 'AI-анализ',
        details: 'Определен архетип: Агрессивный напор. Применен фрейм-контроль.',
        status: 'info',
      },
    ],
    dossier: {
      archetype: '🔥 Агрессивный напор / Давит на телефон',
      strategy: '🛡️ Женский фрейм-контроль: отказ с дерзким вызовом',
      facts: ['🏎️ Увлекается экстремальными гонками', '⚡ Очень нетерпеливый', '📍 Мехико'],
      summary: 'Молодой парень 26 лет. Давит на передачу контактов. Требуется удерживать высокую женскую планку.',
    },
    draftReply: {
      textEn: "Whoa, someone is in a serious rush! 😉 You think I give my private number just because a man types in all caps? You haven't even made me laugh yet. Prove you're worth the chase first!",
      textRu: "Воу, кто-то очень спешит! 😉 Думаешь, я даю свой личный номер только потому, что мужчина пишет капслоком? Ты меня даже рассмешить толком не успел. Докажи сначала, что ты этого стоишь!",
      generatedAt: Date.now() - 50000,
    },
  },
  'c4f8bb2a-71da-45e9-9112-f04b2b8109ad': {
    id: 'c4f8bb2a-71da-45e9-9112-f04b2b8109ad',
    platform: 'alpha.date',
    interlocutor: {
      id: 'c4f8bb2a-71da-45e9-9112-f04b2b8109ad',
      name: 'David Miller',
      age: '34',
      location: 'New York, USA',
      status: 'online',
    },
    operatorProfile: {
      name: 'Huang',
      id: '1353686369',
      location: 'Mexico City',
    },
    messages: [
      {
        id: 'msg_d1',
        sender: 'man',
        text: 'Good evening! Your smile caught my attention while I was sketching a new loft design.',
        timestamp: Date.now() - 7200000,
        deliveredToCrm: true,
      },
      {
        id: 'msg_d2',
        sender: 'girl',
        text: 'An architect? That explains the keen eye for beauty) What style of architecture inspires you most?',
        timestamp: Date.now() - 5400000,
        deliveredToCrm: true,
      },
      {
        id: 'msg_d3',
        sender: 'man',
        text: 'I specialize in minimalist Scandinavian lofts with big windows and cozy fireplaces. Would you ever live in a home like that?',
        timestamp: Date.now() - 120000,
        deliveredToCrm: true,
      },
    ],
    lastActivity: Date.now() - 120000,
    unread: false,
    autopilotEnabled: true,
    autopilotLogs: [
      {
        id: 'log_d1',
        timestamp: Date.now() - 120000,
        action: 'Входящее сообщение',
        details: 'David Miller спросил про идеальный лофт.',
        status: 'info',
      },
      {
        id: 'log_d2',
        timestamp: Date.now() - 110000,
        action: 'Автопилот: генерация ответа',
        details: 'Сформирован ответ с романтическим подтекстом.',
        status: 'success',
      },
    ],
    dossier: {
      archetype: '🎨 Зрелый эстет / Романтик',
      strategy: '❤️ Теплый уют и визуализация совместного пространства',
      facts: ['🏛️ Архитектор лофтов', '☕ Любит скандинавский минимализм', '🗽 Нью-Йорк'],
      summary: 'Успешный архитектор 34 года, ищет душевное общение и эстетическую совместимость.',
    },
    draftReply: {
      textEn: "A fireplace and floor-to-ceiling windows? You just described my absolute dream evening. Only if there is hot cocoa and good jazz playing. What's your favourite detail in that loft?",
      textRu: 'Камин и панорамные окна? Ты только что описал вечер моей мечты. Но только если там есть горячее какао и джаз. Какая твоя любимая деталь в этом проекте?',
      generatedAt: Date.now() - 100000,
    },
  },
  'fa9012bc-e781-4209-ba54-cc190284ab91': {
    id: 'fa9012bc-e781-4209-ba54-cc190284ab91',
    platform: 'alpha.date',
    interlocutor: {
      id: 'fa9012bc-e781-4209-ba54-cc190284ab91',
      name: 'Marco Rossi',
      age: '29',
      location: 'Milan, Italy',
      status: 'online',
    },
    operatorProfile: {
      name: 'Huang',
      id: '1353686369',
      location: 'Mexico City',
    },
    messages: [
      {
        id: 'msg_m1',
        sender: 'girl',
        text: 'Ciao Marco! Tell me the truth: do you make the best pasta in Milan or do you leave that to nonna?',
        timestamp: Date.now() - 10000000,
        deliveredToCrm: true,
      },
      {
        id: 'msg_m2',
        sender: 'man',
        text: "Haha, don't tell nonna, but my truffle tagliolini can make any woman fall in love in 10 minutes 😉",
        timestamp: Date.now() - 300000,
        deliveredToCrm: true,
      },
    ],
    lastActivity: Date.now() - 300000,
    unread: false,
    autopilotEnabled: false,
    autopilotLogs: [
      {
        id: 'log_m1',
        timestamp: Date.now() - 300000,
        action: 'Входящее сообщение',
        details: 'Marco хвастается пастой с трюфелями.',
        status: 'info',
      },
    ],
    dossier: {
      archetype: '😏 Харизматичный итальянец / Игрок',
      strategy: '✨ Игривая дерзость и вызов кулинарным навыкам',
      facts: ['🍝 Готовит трюфельную пасту', '🇮🇹 Милан', '🐶 Лабрадор Лео'],
      summary: 'Харизматичный итальянец с хорошим чувством юмора, любит кулинарию и красивую жизнь.',
    },
    draftReply: {
      textEn: "Ten minutes? That is a bold promise, signore! I have very high culinary standards, so you'd better have the wine already poured. What wine would you pair with that?",
      textRu: 'Десять минут? Смелое обещание, синьор! У меня очень высокие кулинарные стандарты, так что вино уже должно быть налито. Какое вино ты к этому подашь?',
      generatedAt: Date.now() - 250000,
    },
  },
};

// ============================================================================
// Dialogue Storage Helpers
// ============================================================================

async function getStoredDialogues(): Promise<Record<string, SyncedDialogue>> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_SYNCED_DIALOGUES], (result) => {
      let data = result[STORAGE_SYNCED_DIALOGUES];
      if (!data || Object.keys(data).length === 0) {
        data = { ...INITIAL_SEED_DIALOGUES };
        chrome.storage.local.set({ [STORAGE_SYNCED_DIALOGUES]: data });
      }
      resolve(data);
    });
  });
}

async function saveStoredDialogues(dialogues: Record<string, SyncedDialogue>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_SYNCED_DIALOGUES]: dialogues }, () => resolve());
  });
}

function broadcastToCommandCenter(type: string, payload: any) {
  chrome.runtime.sendMessage({ type, payload }).catch(() => {});
}

// Auto-inject content script into all existing HTTP/HTTPS tabs on install/update
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const dialogues = await getStoredDialogues();
    console.log(`[AlphaDate] Background initialized. ${Object.keys(dialogues).length} dialogues ready.`);
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('[AlphaDate] tab injection onInstalled error:', e);
  }
});

// Extension action icon click -> Open Command Center window
chrome.action.onClicked.addListener(async (tab) => {
  await openCommandCenterWindow();
});

async function openCommandCenterWindow(): Promise<void> {
  const url = chrome.runtime.getURL('command-center.html');
  const existingTabs = await chrome.tabs.query({ url });
  if (existingTabs.length > 0 && existingTabs[0]?.id) {
    if (existingTabs[0].windowId) {
      await chrome.windows.update(existingTabs[0].windowId, { focused: true });
    }
    await chrome.tabs.update(existingTabs[0].id, { active: true });
    return;
  }
  await chrome.windows.create({
    url,
    type: 'popup',
    width: 1420,
    height: 900,
    top: 40,
    left: 60,
  });
}

// ============================================================================
// Central Message Router
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Command Center API Handlers
  if (message?.type === 'CMD_GET_ALL_DIALOGUES') {
    getStoredDialogues()
      .then((dialogues) => sendResponse({ ok: true, data: Object.values(dialogues) }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === 'CMD_OPEN_COMMAND_CENTER') {
    openCommandCenterWindow()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === 'CRM_SYNC_DIALOGUE') {
    handleCrmDialogueSync(message.payload, sender?.tab?.id)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === 'CMD_SEND_MESSAGE') {
    handleCommandCenterSendMessage(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === 'CMD_TOGGLE_AUTOPILOT') {
    handleToggleAutopilot(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === 'CMD_GENERATE_AI_REPLY') {
    handleCommandCenterGenerateReply(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === 'CMD_ADD_DOSSIER_FACT') {
    handleAddDossierFact(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === 'CMD_ADD_TEST_DIALOGUE') {
    handleAddTestDialogue()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // Legacy & In-Page HUD Handlers
  if (message?.type === 'ALPHADATE_AUTONOMOUS_CONDUCT') {
    handleAutonomousConduct(message, sender)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message?.type === 'ALPHADATE_GENERATE') {
    handleGenerate(message, sender)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message?.type === 'ALPHADATE_PING') {
    sendResponse({ ok: true, version: '3.0.0' });
    return false;
  }
});

// ============================================================================
// Multi-Dialogue Synchronization Engine
// ============================================================================

async function handleCrmDialogueSync(payload: any, tabId?: number): Promise<any> {
  if (!payload || !payload.dialogueId) {
    return { ok: false, error: 'Отсутствует dialogueId' };
  }

  const dialogues = await getStoredDialogues();
  const id = payload.dialogueId;

  let existing = dialogues[id];
  const incomingMessages: SyncedMessage[] = payload.messages || [];

  if (!existing) {
    // New dialogue discovered from CRM
    existing = {
      id,
      tabId,
      platform: 'alpha.date',
      interlocutor: {
        id,
        name: payload.interlocutor?.name || 'Мужчина',
        age: payload.interlocutor?.age || '—',
        photo: payload.interlocutor?.photo || '',
        location: payload.interlocutor?.location || '',
        status: 'online',
      },
      operatorProfile: {
        name: payload.operatorProfile?.name || 'Девушка',
        id: payload.operatorProfile?.id || '',
        location: payload.operatorProfile?.location || '',
      },
      messages: incomingMessages,
      lastActivity: Date.now(),
      unread: true,
      autopilotEnabled: false,
      autopilotLogs: [
        {
          id: `log_init_${Date.now()}`,
          timestamp: Date.now(),
          action: 'Синхронизация CRM',
          details: 'Диалог обнаружен в активной вкладке CRM.',
          status: 'info',
        },
      ],
      dossier: {
        archetype: 'Анализ диалога...',
        strategy: 'Определение тактики...',
        facts: [],
        summary: 'Новый контакт из CRM',
      },
    };
  } else {
    // Merge messages without duplicates
    if (tabId) existing.tabId = tabId;
    if (payload.interlocutor?.name) existing.interlocutor.name = payload.interlocutor.name;
    if (payload.interlocutor?.age) existing.interlocutor.age = payload.interlocutor.age;
    if (payload.operatorProfile?.name) existing.operatorProfile.name = payload.operatorProfile.name;

    const existingIds = new Set(existing.messages.map((m) => m.id));
    let hasNewManMessage = false;

    incomingMessages.forEach((msg) => {
      if (!existingIds.has(msg.id)) {
        existing.messages.push(msg);
        existingIds.add(msg.id);
        if (msg.sender === 'man') {
          hasNewManMessage = true;
          existing.unread = true;
          existing.lastActivity = msg.timestamp || Date.now();
        }
      }
    });

    // If new incoming message from man, check Autopilot!
    if (hasNewManMessage) {
      existing.autopilotLogs.push({
        id: `log_in_${Date.now()}`,
        timestamp: Date.now(),
        action: 'Входящее сообщение CRM',
        details: `Получено новое сообщение от ${existing.interlocutor.name}`,
        status: 'info',
      });

      // Trigger Autonomous Processing Queue
      enqueueDialogueProcessing(existing.id, existing.autopilotEnabled);
    }
  }

  dialogues[id] = existing;
  await saveStoredDialogues(dialogues);
  broadcastToCommandCenter('CMD_DIALOGUE_UPDATED', existing);

  return { ok: true, dialogue: existing };
}

// ============================================================================
// Autopilot & Independent Processing Queues
// ============================================================================

function enqueueDialogueProcessing(dialogueId: string, executeSendIfAutopilot: boolean) {
  const currentTask = dialogueProcessingQueues.get(dialogueId) || Promise.resolve();

  const nextTask = currentTask
    .then(async () => {
      const dialogues = await getStoredDialogues();
      const dialogue = dialogues[dialogueId];
      if (!dialogue) return;

      dialogue.isProcessingAi = true;
      broadcastToCommandCenter('CMD_DIALOGUE_UPDATED', dialogue);

      try {
        const apiKey = await getStoredApiKey();
        if (!apiKey) {
          dialogue.autopilotLogs.push({
            id: `log_err_${Date.now()}`,
            timestamp: Date.now(),
            action: 'Ошибка автопилота',
            details: 'Не указан Gemini API ключ в настройках',
            status: 'warning',
          });
          dialogue.isProcessingAi = false;
          dialogues[dialogueId] = dialogue;
          await saveStoredDialogues(dialogues);
          broadcastToCommandCenter('CMD_DIALOGUE_UPDATED', dialogue);
          return;
        }

        // Run isolated AI synthesis for this dialogue
        const clientCtx = {
          name: dialogue.interlocutor.name,
          dob: dialogue.interlocutor.age,
          manId: dialogue.interlocutor.id,
          girlInfo: `${dialogue.operatorProfile.name} (${dialogue.operatorProfile.location || ''})`,
          chat: dialogue.messages.map((m) => `${m.sender === 'man' ? 'Мужчина' : 'Девушка'}: ${m.text}`).slice(-18).join('\n'),
          lastManMessage: [...dialogue.messages].reverse().find((m) => m.sender === 'man')?.text || '',
          kb: dialogue.dossier.facts.join('; '),
        };

        const res = await handleAutonomousConduct({
          client: clientCtx,
          environment: 'chat',
          apiKey,
        }, null);

        const aiData = res.data;
        dialogue.draftReply = {
          textEn: aiData.main_text_en || '',
          textRu: aiData.main_text_ru || '',
          generatedAt: Date.now(),
        };

        if (aiData.archetype) dialogue.dossier.archetype = aiData.archetype;
        if (aiData.strategy) dialogue.dossier.strategy = aiData.strategy;

        dialogue.autopilotLogs.push({
          id: `log_ai_${Date.now()}`,
          timestamp: Date.now(),
          action: 'AI-генерация ответа',
          details: `Стратегия: ${aiData.strategy || 'Адаптивный ответ'}. Текст подготовлен.`,
          status: 'success',
        });

        // AUTOPILOT SENDING EXECUTION
        if (executeSendIfAutopilot && dialogue.autopilotEnabled && aiData.main_text_en) {
          dialogue.autopilotLogs.push({
            id: `log_send_start_${Date.now()}`,
            timestamp: Date.now(),
            action: 'АВТОПИЛОТ: Отправка в CRM',
            details: `Отправка сообщения: "${aiData.main_text_en.slice(0, 50)}..."`,
            status: 'info',
          });

          // Dispatch to CRM tab
          let dispatched = false;
          if (dialogue.tabId) {
            try {
              const tabRes = await chrome.tabs.sendMessage(dialogue.tabId, {
                type: 'CRM_DISPATCH_MESSAGE',
                text: aiData.main_text_en,
                dialogueId: dialogue.id,
              });
              if (tabRes?.ok) dispatched = true;
            } catch (e) {
              console.warn('[Background] Tab message error:', e);
            }
          }

          // Append to message history
          const newMsg: SyncedMessage = {
            id: `msg_ai_sent_${Date.now()}`,
            sender: 'girl',
            text: aiData.main_text_en,
            timestamp: Date.now(),
            deliveredToCrm: dispatched,
          };
          dialogue.messages.push(newMsg);
          dialogue.lastActivity = Date.now();
          dialogue.unread = false;

          dialogue.autopilotLogs.push({
            id: `log_send_done_${Date.now()}`,
            timestamp: Date.now(),
            action: 'АВТОПИЛОТ: Успешно доставлено',
            details: dispatched ? 'Сообщение вставлено и отправлено в CRM' : 'Сообщение зафиксировано в истории',
            status: 'success',
          });
        }
      } catch (err: any) {
        dialogue.autopilotLogs.push({
          id: `log_ai_err_${Date.now()}`,
          timestamp: Date.now(),
          action: 'Ошибка генерации',
          details: err.message,
          status: 'warning',
        });
      } finally {
        dialogue.isProcessingAi = false;
        dialogues[dialogueId] = dialogue;
        await saveStoredDialogues(dialogues);
        broadcastToCommandCenter('CMD_DIALOGUE_UPDATED', dialogue);
      }
    })
    .catch((err) => {
      console.error(`[Background] Error processing dialogue ${dialogueId}:`, err);
    });

  dialogueProcessingQueues.set(dialogueId, nextTask);
}

// ============================================================================
// Command Center Actions
// ============================================================================

async function handleCommandCenterSendMessage({ dialogueId, text }: any): Promise<any> {
  const dialogues = await getStoredDialogues();
  const dialogue = dialogues[dialogueId];
  if (!dialogue) throw new Error('Диалог не найден');

  // 1. Optimistic append to history
  const newMsg: SyncedMessage = {
    id: `msg_cmd_${Date.now()}`,
    sender: 'girl',
    text,
    timestamp: Date.now(),
    deliveredToCrm: false,
  };
  dialogue.messages.push(newMsg);
  dialogue.lastActivity = Date.now();
  dialogue.unread = false;

  dialogue.autopilotLogs.push({
    id: `log_op_send_${Date.now()}`,
    timestamp: Date.now(),
    action: 'РУЧНОЙ РЕЖИМ: Отправка из Command Center',
    details: `Оператор отправил: "${text.slice(0, 45)}..."`,
    status: 'info',
  });

  // 2. Dispatch to CRM tab
  let sentToCrm = false;
  if (dialogue.tabId) {
    try {
      const res = await chrome.tabs.sendMessage(dialogue.tabId, {
        type: 'CRM_DISPATCH_MESSAGE',
        text,
        dialogueId,
      });
      if (res?.ok) sentToCrm = true;
    } catch (_) {}
  } else {
    // Try to find any active alpha.date tab
    const tabs = await chrome.tabs.query({ url: ['https://alpha.date/*', 'http://alpha.date/*'] });
    if (tabs.length > 0 && tabs[0]?.id) {
      try {
        const res = await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'CRM_DISPATCH_MESSAGE',
          text,
          dialogueId,
        });
        if (res?.ok) {
          sentToCrm = true;
          dialogue.tabId = tabs[0].id;
        }
      } catch (_) {}
    }
  }

  newMsg.deliveredToCrm = sentToCrm;
  dialogues[dialogueId] = dialogue;
  await saveStoredDialogues(dialogues);
  broadcastToCommandCenter('CMD_DIALOGUE_UPDATED', dialogue);

  return { ok: true, message: newMsg, deliveredToCrm: sentToCrm };
}

async function handleToggleAutopilot({ dialogueId, enabled }: any): Promise<any> {
  const dialogues = await getStoredDialogues();
  const dialogue = dialogues[dialogueId];
  if (!dialogue) throw new Error('Диалог не найден');

  dialogue.autopilotEnabled = Boolean(enabled);
  dialogue.autopilotLogs.push({
    id: `log_ap_toggle_${Date.now()}`,
    timestamp: Date.now(),
    action: dialogue.autopilotEnabled ? 'Автопилот активирован' : 'Автопилот выключен',
    details: dialogue.autopilotEnabled
      ? 'AI будет автономно отвечать на входящие сообщения в CRM.'
      : 'Переведено в ручной режим.',
    status: dialogue.autopilotEnabled ? 'success' : 'info',
  });

  dialogues[dialogueId] = dialogue;
  await saveStoredDialogues(dialogues);
  broadcastToCommandCenter('CMD_DIALOGUE_UPDATED', dialogue);

  // If enabled and has unread man message, immediately trigger!
  if (dialogue.autopilotEnabled) {
    const lastMsg = dialogue.messages[dialogue.messages.length - 1];
    if (lastMsg && lastMsg.sender === 'man') {
      enqueueDialogueProcessing(dialogueId, true);
    }
  }

  return { ok: true, dialogue };
}

async function handleCommandCenterGenerateReply({ dialogueId, styleOverride }: any): Promise<any> {
  enqueueDialogueProcessing(dialogueId, false);
  return { ok: true, status: 'enqueued' };
}

async function handleAddDossierFact({ dialogueId, fact }: any): Promise<any> {
  const dialogues = await getStoredDialogues();
  const dialogue = dialogues[dialogueId];
  if (!dialogue) throw new Error('Диалог не найден');

  const clean = String(fact || '').trim();
  if (clean && !dialogue.dossier.facts.includes(clean)) {
    dialogue.dossier.facts.push(clean);
    dialogue.autopilotLogs.push({
      id: `log_fact_${Date.now()}`,
      timestamp: Date.now(),
      action: 'Память обновлена',
      details: `Добавлен новый факт в досье: "${clean}"`,
      status: 'info',
    });
    dialogues[dialogueId] = dialogue;
    await saveStoredDialogues(dialogues);
    broadcastToCommandCenter('CMD_DIALOGUE_UPDATED', dialogue);
  }

  return { ok: true, facts: dialogue.dossier.facts };
}

async function handleAddTestDialogue(): Promise<any> {
  const dialogues = await getStoredDialogues();
  const id = `test_sim_${Date.now()}`;
  const names = ['Alexandre Dupont', 'James Wilson', 'Sven Lindqvist', 'Carlos Mendoza', 'Kenji Sato'];
  const cities = ['Paris, France', 'London, UK', 'Stockholm, Sweden', 'Madrid, Spain', 'Tokyo, Japan'];
  const idx = Object.keys(dialogues).length % names.length;

  const newDialogue: SyncedDialogue = {
    id,
    platform: 'alpha.date',
    interlocutor: {
      id,
      name: names[idx]!,
      age: String(28 + (idx * 2)),
      location: cities[idx]!,
      status: 'online',
    },
    operatorProfile: {
      name: 'Huang',
      id: '1353686369',
      location: 'Mexico City',
    },
    messages: [
      {
        id: `msg_init_${Date.now()}`,
        sender: 'man',
        text: `Hello! I just saw your profile and wanted to say hi from ${cities[idx]!}. How is your day going?`,
        timestamp: Date.now(),
        deliveredToCrm: true,
      },
    ],
    lastActivity: Date.now(),
    unread: true,
    autopilotEnabled: false,
    autopilotLogs: [
      {
        id: `log_sim_${Date.now()}`,
        timestamp: Date.now(),
        action: 'Тестовый диалог создан',
        details: `Создан диалог для проверки независимой очереди и памяти`,
        status: 'info',
      },
    ],
    dossier: {
      archetype: '🌟 Новый собеседник',
      strategy: 'Первичная интрига и вовлечение',
      facts: [`📍 ${cities[idx]!}`],
      summary: 'Новый контакт для симуляции мульти-диалоговой нагрузки',
    },
  };

  dialogues[id] = newDialogue;
  await saveStoredDialogues(dialogues);
  broadcastToCommandCenter('CMD_DIALOGUE_UPDATED', newDialogue);

  return { ok: true, dialogue: newDialogue };
}

async function getStoredApiKey(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_API_KEY], (res) => {
      resolve((res[STORAGE_API_KEY] || '').trim());
    });
  });
}

// ============================================================================
// AI Multi-Model Routing
// ============================================================================

async function listModels(apiKey: string): Promise<string[]> {
  const url = `${GEMINI_ROOT}/models?pageSize=100&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(extractError(data, res.status));

  return (data.models || [])
    .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m: any) => String(m.name || '').replace(/^models\//, ''))
    .filter(Boolean);
}

function scoreModel(name: string): number {
  const n = name.toLowerCase();
  let score = 0;
  if (n.includes('flash-lite')) score += 1000;
  else if (n.includes('flash')) score += 900;
  else if (n.includes('pro')) score += 500;

  if (/gemini-3\.8/.test(n)) score += 380;
  else if (/gemini-3\.6/.test(n)) score += 360;
  else if (/gemini-3\.5/.test(n)) score += 350;
  else if (/gemini-3\./.test(n)) score += 300;
  else if (/gemini-2\./.test(n)) score += 200;
  else if (/gemini-1\.5/.test(n)) score += 150;

  if (n.includes('latest')) score += 40;
  if (n.includes('preview') || n.includes('experimental') || n.includes('exp')) score -= 150;
  if (n.includes('embedding') || n.includes('tts') || n.includes('live')) score -= 1000;

  return score;
}

function buildCandidates(available: string[], preferredModel?: string): string[] {
  const preferred = String(preferredModel || 'auto').replace(/^models\//, '').trim();
  const unique: string[] = [];
  const add = (name: string) => {
    if (name && available.includes(name) && !unique.includes(name)) unique.push(name);
  };

  if (preferred && preferred !== 'auto') add(preferred);

  const scored = [...available].sort((a, b) => scoreModel(b) - scoreModel(a));
  scored.forEach(add);
  return unique;
}

function isRetryableModelError(msg: string): boolean {
  return /model|not found|not available|unsupported|permission|quota|resource exhausted|429|404|overloaded/i.test(msg || '');
}

async function handleGenerate({ apiKey, prompt, preferredModel, images }: any, sender: any) {
  if (!apiKey) throw new Error('Не найден Gemini API ключ. Укажите его в настройках.');
  if (!prompt) throw new Error('Промпт не сформирован.');

  const available = await listModels(apiKey);
  const candidates = buildCandidates(available, preferredModel);
  if (!candidates.length) throw new Error('Нет доступных моделей Gemini для этого ключа.');

  const parts: any[] = [];
  if (images && Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      if (img?.data && img?.mimeType) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
    }
  }
  parts.push({ text: prompt });

  const failures: string[] = [];
  for (const model of candidates) {
    try {
      const url = `${GEMINI_ROOT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 1800,
          },
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(extractError(data, res.status));

      const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim();
      if (!text) throw new Error('Gemini вернул пустой ответ.');

      return { ok: true, text, model, usedImages: parts.length > 1 };
    } catch (err: any) {
      failures.push(`${model}: ${err.message}`);
      if (!isRetryableModelError(err.message)) throw err;
    }
  }

  throw new Error('Все модели Gemini отклонили запрос: ' + failures.slice(0, 3).join(' | '));
}

async function handleAutonomousConduct({ client, environment, overrideStyle, apiKey, images }: any, sender: any) {
  if (!apiKey) throw new Error('Не указан Gemini API ключ. Введите его в настройках суфлера.');

  const isLetters = environment === 'letters';
  const lastMsg = (client.lastManMessage || '').toLowerCase();
  const isDemandingContacts = /phone|number|whatsapp|telegr|insta|snap|call|write down|digits|cell|номер|телефон|ватсап|тг|контакт/.test(lastMsg);

  let systemPrompt = '';

  if (isLetters) {
    // === LETTERS / ПИСЬМА ===
    systemPrompt = `Ты — элитный персональный AI для топ-оператора на международном сайте знакомств.
ТЫ СОСТАВЛЯЕШЬ ПОЛНОЦЕННОЕ ПИСЬМО (Letters / Mail) от лица привлекательной девушки (${client.girlInfo || 'красивая, интересная девушка'}) для мужчины (${client.name || 'Мужчина'}, возраст: ${client.dob || '—'}, ID: ${client.manId || '—'}, баланс: ${client.balance || '—'}).

СПЕЦИФИКА СРЕДЫ: ЭТО ПИСЬМО (LETTERS), А НЕ ЧАТ!
Каждое открытое мужчиной письмо стоит денег/кредитов. Мужчина ждёт не сухую отписку, а красивую, интимную и захватывающую историю, которая тронет его душу и заставит во что бы то ни стало написать ответное письмо или купить медиа.

СТРУКТУРА ЭЛИТНОГО ПИСЬМА:
1. Тёплое, персональное обращение: упомяни деталь из его письма или его анкеты, покажи, что ты внимательна именно к нему.
2. Атмосферная личная история (1-2 коротких абзаца): живая картинка из твоего дня (уютный вечер, мысли о нём, приятный момент, искренние эмоции).
3. Интрига и женское очарование: намёк на что-то особенное или личную тайну, пробуждающую мужское воображение.
4. Открытый цепляющий финал: сильный глубокий вопрос, на который мужчине непременно захочется ответить развернуто.

${isDemandingContacts ? `ВНИМАНИЕ: МУЖЧИНА СПРАШИВАЕТ ИЛИ ДАВИТ НА КОНТАКТЫ/ТЕЛЕФОН!
СТРОЖАЙШИЙ ЗАПРЕТ: НИКАКИХ НОМЕРОВ ИЛИ СОЦСЕТЕЙ. НИ В КОЕМ СЛУЧАЕ НЕ ССЫЛАЙСЯ НА ПРАВИЛА САЙТА!
Тактика: Изящный женский фрейм-контроль. Объясни, что ты предпочитаешь сначала почувствовать настоящую душевную близость здесь, в красивых письмах, прежде чем спешить в мессенджеры. Заинтригуй его!` : ''}

${client.kb ? `ПРАВИЛА ОПЕРАТОРА / ИЗВЕСТНЫЕ ФАКТЫ О СОБЕСЕДНИКЕ:\n${client.kb}\n` : ''}
${client.selectedText ? `ВЫДЕЛЕННЫЙ ТЕКСТ / ЗАЦЕПКА ИЗ АНКЕТЫ:\n"${client.selectedText}"\n` : ''}
${overrideStyle ? `ДОПОЛНИТЕЛЬНЫЙ АКЦЕНТ СТИЛЯ:\n"${overrideStyle}"\n` : ''}

ИСТОРИЯ ПИСЕМ / КОНТЕКСТ:
${client.chat || 'Новая переписка! Напиши первое теплое интригующее письмо.'}

ПОСЛЕДНЕЕ ПИСЬМО / РЕПЛИКА МУЖЧИНЫ:
"${client.lastManMessage || 'Мужчина пока не писал или это первое письмо'}"

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "environment": "letters",
  "archetype": "Психологический типаж мужчины (напр. 'Зрелый романтик / Ищет душевность')",
  "strategy": "Тактический расчёт (напр. 'Создание уюта и намёк на сокровенное')",
  "subject_ru": "Интригующая тема письма на русском (до 40 символов)",
  "subject_en": "Английская тема письма",
  "main_text_ru": "Полный художественный текст письма на русском с абзацами",
  "main_text_en": "Качественный литературный английский перевод письма",
  "alt_bolder_ru": "Более смелый / чувственный альтернативный вариант письма на русском",
  "alt_bolder_en": "English bold alternative",
  "alt_softer_ru": "Более нежный / заботливый альтернативный вариант письма на русском",
  "alt_softer_en": "English soft alternative"
}`;
  } else {
    // === CHAT / ОНЛАЙН-ЧАТ ===
    systemPrompt = `Ты — элитный персональный AI для топ-оператора на международном сайте знакомств.
ТЫ ВЕДЕШЬ ОНЛАЙН-ЧАТ (Instant Chat) в реальном времени от лица девушки (${client.girlInfo || 'привлекательная девушка'}) с иностранным мужчиной (${client.name || 'Мужчина'}, возраст: ${client.dob || '—'}, ID: ${client.manId || '—'}, баланс: ${client.balance || '—'}).

СПЕЦИФИКА СРЕДЫ: ЭТО БЫСТРЫЙ ОНЛАЙН-ЧАТ (CHAT)!
Чат ведется на АНГЛИЙСКОМ языке (main_text_en пойдет сразу в чат мужчине, main_text_ru — для русскоговорящего оператора).
Здесь важен живой темп, лёгкая дерзость, кокетство и мгновенное вовлечение.
Длина: 1-2 живые, яркие фразы, как реальная сексуальная девушка печатает за 5 секунд со смартфона.
Обязательно заканчивай открытым вопросом или игривым вызовом!

ЖЕСТКИЕ ПРАВИЛА:
1. Строго женский род в русском переводе (-ла, -лась).
2. СТРОЖАЙШИЙ ЗАПРЕТ НА КЛИШЕ: Запрещено писать "Hi handsome", "How are you doing?", "Nice profile", "What are you looking for here?".
3. Оттолкнись от его последней реплики: подколи, подыграй или брось вызов. Не повторяй фразы из предыдущих сообщений!

${isDemandingContacts ? `⚠️ КРИТИЧЕСКИ ВАЖНО: МУЖЧИНА ТРЕБУЕТ НОМЕР ТЕЛЕФОНА / WHATSAPP / ВНЕ САЙТА (или пишет капслоком)!
ПРАВИЛА ПРИ ТРЕБОВАНИИ КОНТАКТОВ:
1. НИКОГДА не давай номер телефона, WhatsApp, Telegram, соцсети или email.
2. НИ В КОЕМ СЛУЧАЕ НЕ ПИШИ "rules forbid it", "moderators ban", "I am not allowed", "agency rules". Это звучит убого, роботизированно и убивает влечение.
3. ПРИМЕНИ ЖЕНСКИЙ ФРЕЙМ-КОНТРОЛЬ:
   - Подколи его за нетерпение или агрессивный тон капслоком.
   - Покажи, что ты самодостаточная желанная девушка, которая не отдаёт свой номер первому встречному просто за то, что он повысил голос.
   - Пример вайба: "Whoa, someone is in a rush! You think I give my private number just because a man types in all caps? 😉 You haven't even made me smile yet. Prove you're worth it first." или "Slow down, handsome. I don't jump into WhatsApp with strangers until I feel real sparks right here. Tell me what makes you think you've earned it?"
   - Заставь его продолжать писать в чате и тратить кредиты!` : ''}

${client.kb ? `ПРАВИЛА ОПЕРАТОРА / ИЗВЕСТНЫЕ ФАКТЫ О МУЖЧИНЕ:\n${client.kb}\n` : ''}
${client.selectedText ? `ВЫДЕЛЕННАЯ ЗАЦЕПКА (НАИВЫСШИЙ ПРИОРИТЕТ):\n"${client.selectedText}"\n` : ''}
${overrideStyle ? `СТИЛЕВОЙ АКЦЕНТ:\n"${overrideStyle}"\n` : ''}

ИСТОРИЯ ЧАТА (последние сообщения):
${client.chat || 'Новый диалог! Начни с яркой интриги или женского подкола.'}

ПОСЛЕДНЯЯ РЕПЛИКА МУЖЧИНЫ:
"${client.lastManMessage || 'Мужчина пока молчит'}"

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "environment": "chat",
  "archetype": "Психологический типаж (напр. 'Агрессивный напор / Требует телефон' или 'Игривый доминант')",
  "strategy": "Тактический прием (напр. 'Фрейм-контроль: отказ с кокетливым вызовом')",
  "main_text_en": "Английский живой ответ для вставки в чат (1-2 предложения, с вызовом/вопросом)",
  "main_text_ru": "Точный русский перевод для оператора с пояснением тона",
  "alt_bolder_en": "Более дерзкий английский ответ",
  "alt_bolder_ru": "Русский перевод дерзкого ответа",
  "alt_softer_en": "Более мягкий/кокетливый английский ответ",
  "alt_softer_ru": "Русский перевод мягкого ответа",
  "alt_frame_en": "Ответ с жестким женским фреймом на английском",
  "alt_frame_ru": "Русский перевод ответа с фреймом"
}`;
  }

  const rawRes = await handleGenerate({ apiKey, prompt: systemPrompt, images }, sender);
  let parsed: any = {};
  try {
    const jsonMatch = rawRes.text.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawRes.text);
  } catch {
    parsed = {
      environment,
      main_text_en: rawRes.text,
      main_text_ru: rawRes.text,
      archetype: 'Собеседник',
      strategy: 'Прямой ответ',
    };
  }

  return { ok: true, data: parsed, model: rawRes.model };
}

// Helpers
async function safeJson(response: Response): Promise<any> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function extractError(data: any, status: number): string {
  const msg = data?.error?.message || data?.raw || `Ошибка Gemini API (${status})`;
  if (status === 400 && /API_KEY_INVALID|API key not valid|keyInvalid/i.test(msg)) {
    return 'Неверный API ключ Gemini. Пожалуйста, проверьте правильность ключа в настройках Command Center.';
  }
  if (status === 429) {
    return 'Превышен лимит запросов Gemini (429 Rate Limit). Подождите несколько секунд и попробуйте снова.';
  }
  return msg;
}
