import {
  ALPHADATE_PROTOCOL_VERSION,
  IPCRequest,
  IPCResponse,
} from '@alphadate/contracts';

console.log(`[AlphaDate Extension] Service Worker initialized (Protocol v${ALPHADATE_PROTOCOL_VERSION})`);

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message: IPCRequest, _sender, sendResponse) => {
  console.log('[AlphaDate Extension] Received internal message:', message.type);

  // Relay or process through local application daemon
  const response: IPCResponse = {
    id: `resp_${Date.now()}`,
    correlationId: message.id,
    success: true,
    data: { status: 'acknowledged' },
    timestamp: Date.now(),
  };

  sendResponse(response);
  return true;
});
