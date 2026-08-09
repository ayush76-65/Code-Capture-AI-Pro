/**
 * Offscreen document for clipboard operations.
 *
 * Service workers cannot access the Clipboard API directly.
 * This offscreen document receives COPY_TO_CLIPBOARD messages
 * and writes the provided text to the system clipboard.
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'COPY_TO_CLIPBOARD') {
    const text = message.payload?.text as string;
    if (!text) {
      sendResponse({ ok: false, error: 'No text provided' });
      return false;
    }

    // Use a textarea fallback for clipboard write since offscreen
    // documents may not have focus for navigator.clipboard
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      sendResponse({ ok: true });
    } catch (err) {
      // Fallback to navigator.clipboard
      navigator.clipboard.writeText(text)
        .then(() => sendResponse({ ok: true }))
        .catch((e) => sendResponse({ ok: false, error: e.message }));
      return true; // Keep channel open for async response
    } finally {
      document.body.removeChild(textarea);
    }

    return false;
  }
});

console.log('[Code Capture AI Pro] Offscreen document loaded');
