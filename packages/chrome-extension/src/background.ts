import {
  ALPHADATE_PROTOCOL_VERSION,
  ErrorCode,
  IPCRequest,
  IPCResponse,
} from '@alphadate/contracts';

console.log(`[AlphaDate SW] Background Service Worker initialized (Protocol v${ALPHADATE_PROTOCOL_VERSION})`);

// 1. Enable Side Panel on action click (Chrome 116+)
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('[AlphaDate SW] SidePanel behavior error:', err);
    });
  }
});

// 2. Gateway to Local Daemon (HTTP REST on 127.0.0.1:4789)
const LOCAL_DAEMON_HTTP = 'http://127.0.0.1:4789';

async function forwardToLocalDaemon(endpoint: string, method = 'GET', body?: unknown): Promise<any> {
  const url = `${LOCAL_DAEMON_HTTP}${endpoint}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-AlphaDate-Token': 'generate-a-secure-random-token-here',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: { code: ErrorCode.ERR_INTERNAL, message: `Daemon returned ${res.status}: ${errText}` },
      };
    }

    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: ErrorCode.ERR_LOCAL_DAEMON_OFFLINE,
        message: `Локальный демон недоступен на ${LOCAL_DAEMON_HTTP}. Убедитесь, что приложение запущено.`,
      },
    };
  }
}

// 3. Message dispatcher
chrome.runtime.onMessage.addListener((request: IPCRequest, _sender, sendResponse) => {
  console.log('[AlphaDate SW] Handling message:', request.type);

  if (request.type === 'HEARTBEAT') {
    forwardToLocalDaemon('/health', 'GET').then((data) => {
      sendResponse({
        id: `resp_${Date.now()}`,
        correlationId: request.id,
        success: data?.status === 'healthy',
        data,
        timestamp: Date.now(),
      } as IPCResponse);
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === 'GENERATE_SUGGESTIONS') {
    forwardToLocalDaemon('/v1/ai/suggestions', 'POST', request.payload).then((data) => {
      sendResponse(data);
    });
    return true;
  }

  if (request.type === 'GET_SYSTEM_STATUS') {
    forwardToLocalDaemon('/v1/system/status', 'GET').then((data) => {
      sendResponse(data);
    });
    return true;
  }

  if (request.type === 'SEARCH_MEMORY') {
    const profileId = (request.payload as any)?.profileId;
    forwardToLocalDaemon(`/v1/memory?profileId=${profileId}`, 'GET').then((data) => {
      sendResponse(data);
    });
    return true;
  }

  if (request.type === 'SAVE_MEMORY') {
    forwardToLocalDaemon('/v1/memory', 'POST', request.payload).then((data) => {
      sendResponse(data);
    });
    return true;
  }

  sendResponse({
    id: `resp_${Date.now()}`,
    correlationId: request.id,
    success: false,
    error: { code: ErrorCode.ERR_INVALID_PAYLOAD, message: `Unknown message type: ${request.type}` },
    timestamp: Date.now(),
  } as IPCResponse);

  return false;
});
