import { ALPHADATE_PROTOCOL_VERSION } from '@alphadate/contracts';

console.log(`[AlphaDate Content Script] Loaded on ${window.location.hostname} (v${ALPHADATE_PROTOCOL_VERSION})`);

/**
 * Inserts text into the currently active or first found input field on the page.
 */
function insertTextIntoActiveElement(text: string): boolean {
  const activeEl = document.activeElement as HTMLElement | null;

  // Check if active element is an input/textarea
  if (
    activeEl instanceof HTMLTextAreaElement ||
    (activeEl instanceof HTMLInputElement && activeEl.type === 'text')
  ) {
    const start = activeEl.selectionStart ?? activeEl.value.length;
    const end = activeEl.selectionEnd ?? activeEl.value.length;
    activeEl.setRangeText(text, start, end, 'end');
    activeEl.dispatchEvent(new Event('input', { bubbles: true }));
    activeEl.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Check contenteditable
  if (activeEl?.isContentEditable) {
    document.execCommand('insertText', false, text);
    activeEl.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // Fallback: search common message box selectors
  const fallbackSelectors = [
    'textarea',
    '[contenteditable="true"]',
    'input[type="text"]',
    '[role="textbox"]',
  ];

  for (const sel of fallbackSelectors) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) {
      el.focus();
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el.isContentEditable) {
        el.innerText = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    }
  }

  return false;
}

// 1. Listen for commands from Side Panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'INSERT_SUGGESTION') {
    const success = insertTextIntoActiveElement(message.text);
    sendResponse({ success });
    return true;
  }

  if (message.action === 'EXTRACT_PAGE_CONTEXT') {
    // Collect visible page title and possible interlocutor info
    const title = document.title;
    sendResponse({
      title,
      url: window.location.href,
    });
    return true;
  }
  return false;
});

// 2. Keyboard shortcuts (Alt+1, Alt+2, Alt+3)
window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === '1' || e.key === '2' || e.key === '3')) {
    chrome.runtime.sendMessage(
      {
        type: 'QUICK_KEY_PRESS',
        index: Number(e.key) - 1,
      },
      (res) => {
        if (res?.text) {
          insertTextIntoActiveElement(res.text);
        }
      }
    );
  }
});
