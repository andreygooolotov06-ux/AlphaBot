/**
 * AlphaDate Personal AI — Background Service Worker v2.0
 * High-performance Gemini Multi-Model Routing, Multimodal Vision, and Screen Capture
 */

const GEMINI_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

// Auto-inject content script into all existing HTTP/HTTPS tabs on install/update
chrome.runtime.onInstalled.addListener(async () => {
  try {
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

// Listen to extension icon click -> toggle overlay on page (with fallback injection)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'ALPHADATE_TOGGLE_MENU' });
  } catch (err) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id!, { type: 'ALPHADATE_TOGGLE_MENU' }).catch(() => {});
      }, 150);
    } catch (e) {
      console.warn('[AlphaDate] executeScript failed on action click:', e);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'ALPHADATE_GENERATE') {
    handleGenerate(message, sender)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message?.type === 'ALPHADATE_ANALYZE_PROFILE') {
    handleProfileAnalysis(message)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message?.type === 'ALPHADATE_INVITES') {
    handleInvites(message)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message?.type === 'ALPHADATE_CAPTURE_IMAGE') {
    handleCaptureImage(message, sender)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message?.type === 'ALPHADATE_ANALYZE_PHOTO') {
    handlePhotoAnalysis(message, sender)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (message?.type === 'ALPHADATE_PING') {
    sendResponse({ ok: true, version: '2.0.0' });
    return false;
  }
});

// ============================================================================
// Model Scoring & Candidate List
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

// ============================================================================
// Multi-Modal & Screenshot Processing
// ============================================================================

async function captureTabImagePart(windowId: number, imageRect: any = null, viewport: any = null) {
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 90 });
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (imageRect && viewport?.width && viewport?.height) {
    const scaleX = bitmap.width / viewport.width;
    const scaleY = bitmap.height / viewport.height;
    const pad = 10;
    sx = Math.max(0, Math.floor((imageRect.left - pad) * scaleX));
    sy = Math.max(0, Math.floor((imageRect.top - pad) * scaleY));
    sw = Math.min(bitmap.width - sx, Math.ceil((imageRect.width + pad * 2) * scaleX));
    sh = Math.min(bitmap.height - sy, Math.ceil((imageRect.height + pad * 2) * scaleY));
    if (sw < 80 || sh < 80) { sx = 0; sy = 0; sw = bitmap.width; sh = bitmap.height; }
  }

  const maxSide = 1200;
  const ratio = Math.min(1, maxSide / Math.max(sw, sh));
  const outW = Math.max(1, Math.round(sw * ratio));
  const outH = Math.max(1, Math.round(sh * ratio));
  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
  bitmap.close();

  const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
  const buffer = await croppedBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  const base64 = btoa(binary);
  return { inlineData: { mimeType: 'image/jpeg', data: base64 } };
}

async function fetchImagePart(url: string) {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error(`Не удалось загрузить фото (${response.status})`);
  const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0] || 'image/jpeg';
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 8 * 1024 * 1024) throw new Error('Фото слишком большое для анализа.');
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return { inlineData: { mimeType: contentType, data: btoa(binary) } };
}

async function handleCaptureImage({ imageRect, viewport }: any, sender: any) {
  if (sender?.tab?.windowId == null) throw new Error('Не удалось получить активную вкладку.');
  const imagePart = await captureTabImagePart(sender.tab.windowId, imageRect, viewport);
  return { ok: true, imagePart };
}

// ============================================================================
// Core Generation Handlers
// ============================================================================

async function handleGenerate({ apiKey, prompt, preferredModel, imageUrl, imagePart: customPart, images }: any, sender: any) {
  if (!apiKey) throw new Error('Не найден Gemini API ключ. Укажите его в настройках (🔑 Доступы).');
  if (!prompt) throw new Error('Промпт не сформирован.');

  const available = await listModels(apiKey);
  const candidates = buildCandidates(available, preferredModel);
  if (!candidates.length) throw new Error('Нет доступных моделей Gemini для этого ключа.');

  const parts: any[] = [];

  // 1. Attached photos (base64)
  if (images && Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      if (img?.data && img?.mimeType) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
    }
  }

  // 2. Custom image part or URL fetch
  if (customPart?.inlineData) {
    parts.push(customPart);
  } else if (imageUrl) {
    try {
      const fetched = await fetchImagePart(imageUrl);
      parts.push(fetched);
    } catch (e) {
      console.warn('[AlphaDate] Failed to fetch image from URL:', e);
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

async function handleProfileAnalysis({ apiKey, prompt, preferredModel }: any) {
  if (!apiKey) throw new Error('Gemini API key не указан.');
  const available = await listModels(apiKey);
  const candidates = buildCandidates(available, preferredModel);

  for (const model of candidates) {
    try {
      const url = `${GEMINI_ROOT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 1200,
          },
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(extractError(data, res.status));
      const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim();
      return { ok: true, text, model };
    } catch (err: any) {
      if (!isRetryableModelError(err.message)) throw err;
    }
  }
  throw new Error('Не удалось выполнить глубокий анализ анкеты.');
}

async function handlePhotoAnalysis({ apiKey, preferredModel, imageUrl, imageRect, viewport, imagePart: suppliedPart }: any, sender: any) {
  if (!apiKey) throw new Error('API-ключ не указан.');
  const available = await listModels(apiKey);
  const candidates = buildCandidates(available, preferredModel);

  let imagePart = suppliedPart?.inlineData ? suppliedPart : null;
  if (!imagePart && imageUrl) {
    try { imagePart = await fetchImagePart(imageUrl); } catch (_) {}
  }
  if (!imagePart && sender?.tab?.windowId != null) {
    try { imagePart = await captureTabImagePart(sender.tab.windowId, imageRect, viewport); } catch (_) {}
  }

  if (!imagePart) return { ok: true, detail: 'NONE', description: '', confidence: 0 };

  const prompt = `Проанализируй ТОЛЬКО фотографию мужчины из анкеты. Найди ОДНУ конкретную и безопасную деталь для первого контакта: предмет, питомец, транспорт, часы, одежда, хобби, локация или необычный фон.
Верни ТОЛЬКО валидный JSON:
{"detail":"короткая деталь или NONE","description":"одно предложение о том, что видно","confidence":90}`;

  for (const model of candidates) {
    try {
      const url = `${GEMINI_ROOT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [imagePart, { text: prompt }] }],
          generationConfig: { temperature: 0.15, maxOutputTokens: 350 },
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(extractError(data, res.status));
      const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim();
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : {};
      return {
        ok: true,
        model,
        detail: parsed.detail || 'NONE',
        description: parsed.description || '',
        confidence: Number(parsed.confidence || 0),
      };
    } catch (err: any) {
      if (!isRetryableModelError(err.message)) throw err;
    }
  }
  return { ok: true, detail: 'NONE', description: '', confidence: 0 };
}

async function handleInvites({ apiKey, prompt, preferredModel }: any) {
  if (!apiKey) throw new Error('API-ключ не указан.');
  const available = await listModels(apiKey);
  const candidates = buildCandidates(available, preferredModel);

  for (const model of candidates) {
    try {
      const url = `${GEMINI_ROOT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.1, maxOutputTokens: 1600 },
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(extractError(data, res.status));
      const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim();
      return { ok: true, text, model };
    } catch (err: any) {
      if (!isRetryableModelError(err.message)) throw err;
    }
  }
  throw new Error('Не удалось сгенерировать инвайты.');
}

// Helpers
async function safeJson(response: Response): Promise<any> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function extractError(data: any, status: number): string {
  const msg = data?.error?.message || data?.raw || `Ошибка Gemini API (${status})`;
  if (status === 400 && /API_KEY_INVALID|API key not valid|keyInvalid/i.test(msg)) {
    return 'Неверный API ключ Gemini. Пожалуйста, проверьте правильность ключа и сохраните его на панели суфлера.';
  }
  if (status === 429) {
    return 'Превышен лимит запросов Gemini (429 Rate Limit). Подождите несколько секунд и попробуйте снова.';
  }
  return msg;
}
