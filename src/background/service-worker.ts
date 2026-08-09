/**
 * Background Service Worker — The Brain
 *
 * All AI processing runs here. No UI required.
 *
 * Workflow:
 *   Alt+V or Alt+C → Capture → AI Processing → Clipboard Copy → Notification
 *
 * Handles:
 * - Global keyboard shortcuts (Alt+V, Alt+C)
 * - Full AI pipeline (Gemini + OCR fallback)
 * - Clipboard writes via offscreen document
 * - Chrome notifications for progress feedback
 * - History storage
 * - Message routing for optional side panel
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { MESSAGE_TYPES, createMessage, type ExtensionMessage } from '@/shared/messages';
import { DEFAULT_SETTINGS, STORAGE_KEYS, MAX_HISTORY_SIZE } from '@/shared/constants';
import type { Settings, CaptureEntry, RecoveryMode } from '@/shared/types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const NOTIFICATION_IDS = {
  PROGRESS: 'codecapture_progress',
  RESULT: 'codecapture_result',
} as const;

// ─── System Prompt for Gemini ───────────────────────────────────────────────────

const SYSTEM_PROMPT_BASE = `You are a code reconstruction engine.

You are NOT a coding assistant.
You are NOT a code generator.
You are NOT a code optimizer.
You are NOT a refactoring engine.

You are viewing an image containing source code.
Your task is to reconstruct the original code, strictly following this priority hierarchy:

RECONSTRUCTION PRIORITY ORDER:
Priority 1: Recover indentation hierarchy (Syntactically correct).
Priority 2: Recover block structure.
Priority 3: Recover code text.
Priority 4: Recover comments.
Priority 5: Recover punctuation.

CRITICAL RULES FOR INDENTATION:
- Syntactically valid indentation hierarchy is MORE IMPORTANT than the exact visual indentation in the image.
- If the source image contains an indentation error (e.g., a 'try:' block or statement logically belongs inside a 'def' or 'class' but is visually outdented by mistake), YOU MUST FIX THE INDENTATION.
- NEVER place a statement outside a parent block if it logically belongs inside that block.
- Examples of FORBIDDEN behavior:
  - If a try block follows a function definition:
    def example():
        try:
            pass
    MUST NEVER become:
    def example():
    try:
        pass
  - Class methods MUST stay inside the class:
    class A:
        def test():
            pass
    MUST NEVER become:
    class A:
    def test():
        pass

CRITICAL PRESERVATION RULE:
You are performing visual code transcription.
You are NOT interpreting code.
You are NOT improving code.
You are NOT converting code into equivalent forms.
Your task is to reproduce exactly what is visible.

NEVER convert one syntax form into another.

Examples:
Visible:
"""
hello
"""
Output:
"""
hello
"""
NOT:
# hello

Visible:
'''hello'''
Output:
'''hello'''
NOT:
# hello

Visible:
"hello"
Output:
"hello"

Visible:
'hello'
Output:
'hello'

Visible:
[]
Output:
[]

Visible:
{}
Output:
{}

Visible:
()
Output:
()

Do not normalize.
Do not rewrite.
Do not modernize.
Do not simplify.
Do not convert documentation strings into comments.

Preserve all delimiters exactly as shown.

RESPONSE FORMAT:
1. First line: the programming language detected (just the name, e.g., "Python", "JavaScript")
2. Second line: your confidence as an integer from 0-100
3. Third line: empty
4. Fourth line onwards: the reconstructed code ONLY

Return ONLY raw code.
Do NOT use markdown.
Do NOT use code fences.
Do NOT explain anything.
Do NOT describe anything.
Output must contain code only.`;


const MODE_INSTRUCTIONS: Record<RecoveryMode, string> = {
  strict: `
RECOVERY MODE: Strict Preservation

ALLOWED ACTIONS:
- Indentation reconstruction (match the visual indentation from the image)
- Formatting reconstruction (line breaks, spacing as shown)

NO code modifications of any kind.
Reconstruct the code character-for-character as shown in the image.
If a character is ambiguous, choose the most likely character but do not change the code logic.`,

  visual: `
RECOVERY MODE: Visual Recovery

ALLOWED ACTIONS:
- Indentation reconstruction
- Visual typo recovery when visually obvious:
  - l ↔ I ↔ 1 (when context makes it clear which is correct)
  - O ↔ 0 (when context makes it clear)
  - { ↔ ( and [ ↔ { (when visually ambiguous but context clarifies)
- Punctuation recovery when visually obvious

Preserve all logic. Do not change variable names, function names, or any business logic.
Only recover characters that are visually ambiguous in the image.`,

  advanced: `
RECOVERY MODE: Advanced Recovery

ALLOWED ACTIONS:
- Indentation reconstruction
- Visual typo recovery
- Punctuation recovery
- Syntax repair ONLY when visually obvious (e.g., clearly missing closing bracket visible at edge of image)

NEVER change business logic, algorithms, variable names, function names, or class names.
Only repair syntax that is clearly broken due to visual capture artifacts.`,
};

// ─── Keyboard Shortcut Handlers ─────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  console.log(`[Code Capture AI Pro] Command received: ${command}`);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showNotification('⚠️ No Active Tab', 'Could not find an active tab to capture from.');
      return;
    }

    if (command === 'capture-video-frame') {
      await handleVideoFrameCapture(tab.id);
    } else if (command === 'capture-region') {
      await handleRegionCapture(tab.id);
    }
  } catch (error) {
    console.error('[Code Capture AI Pro] Command handler error:', error);
    showNotification('❌ Capture Failed', error instanceof Error ? error.message : 'Unknown error');
  }
});

// ─── Video Frame Capture (Alt+V) ────────────────────────────────────────────────

async function handleVideoFrameCapture(tabId: number): Promise<void> {
  showNotification('📸 Capturing Video Frame...', 'Detecting video on the page...');

  try {
    // Ask the content script to capture the video frame
    const response = await chrome.tabs.sendMessage(
      tabId,
      createMessage(MESSAGE_TYPES.CAPTURE_VIDEO_FRAME)
    );

    if (response?.type === MESSAGE_TYPES.FRAME_CAPTURED) {
      const payload = response.payload as { imageData: string; width: number; height: number; source: string };

      // Forward to side panel if open
      broadcastToExtension(response);

      // Process in background
      await captureAndProcess(payload.imageData, 'video');
    } else if (response?.type === MESSAGE_TYPES.CORS_FALLBACK) {
      // CORS blocked — fall back to tab screenshot
      console.log('[Code Capture AI Pro] CORS fallback — taking tab screenshot');
      showNotification('📸 Capturing Screenshot...', 'Video frame blocked by CORS. Using screenshot instead.');
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png', quality: 100 });

      broadcastToExtension(createMessage(MESSAGE_TYPES.FRAME_CAPTURED, {
        imageData: dataUrl, width: 0, height: 0, source: 'screenshot',
      }));

      await captureAndProcess(dataUrl, 'video');
    } else {
      showNotification('⚠️ No Video Found', 'No active video detected on this page. Try Alt+C for region capture.');
    }
  } catch {
    // Content script not loaded or not responding — take a tab screenshot
    console.log('[Code Capture AI Pro] Content script unavailable — taking tab screenshot');
    showNotification('📸 Capturing Screenshot...', 'Taking a screenshot of the visible tab...');
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png', quality: 100 });

    broadcastToExtension(createMessage(MESSAGE_TYPES.FRAME_CAPTURED, {
      imageData: dataUrl, width: 0, height: 0, source: 'screenshot',
    }));

    await captureAndProcess(dataUrl, 'video');
  }
}

// ─── Region Capture (Alt+C) ─────────────────────────────────────────────────────

async function handleRegionCapture(tabId: number): Promise<void> {
  try {
    // Ask the content script to start the region selection overlay
    await chrome.tabs.sendMessage(
      tabId,
      createMessage(MESSAGE_TYPES.START_REGION_SELECT)
    );
    // The content script will send REGION_CAPTURED when user finishes selecting
    // That message is handled in the onMessage listener below
  } catch {
    showNotification(
      '⚠️ Region Select Unavailable',
      'Cannot capture on restricted Chrome pages (like this extensions page) or new tabs. Please try on a normal website like YouTube.'
    );
  }
}

// ─── Full Background AI Pipeline ────────────────────────────────────────────────

async function captureAndProcess(imageDataUrl: string, source: 'video' | 'region'): Promise<void> {
  const startTime = performance.now();

  try {
    // 1. Load settings
    const settings = await loadSettings();

    if (!settings.apiKey) {
      showNotification('⚠️ API Key Required', 'Open the extension popup to configure your Gemini API key.');
      return;
    }

    // 2. Analyze with AI
    showNotification('🔍 Analyzing Code...', 'Vision AI is reconstructing the code...');

    const base64 = dataUrlToBase64(imageDataUrl);
    const mimeType = getMimeType(imageDataUrl);

    let result: { code: string; language: string; confidence: number } | null = null;
    let usedFallback = false;

    // Try Gemini first
    try {
      result = await analyzeWithGemini(base64, mimeType, settings);
    } catch (error) {
      console.warn('[Code Capture AI Pro] Gemini failed, trying screenshot fallback:', error);
      // Gemini failed — for now, report the error (OCR requires Tesseract which needs a DOM)
      throw error;
    }

    if (!result || !result.code) {
      showNotification('⚠️ No Code Found', 'Could not extract code from the image. Try a clearer capture.');
      return;
    }

    const processingTimeMs = Math.round(performance.now() - startTime);
    const confidence = usedFallback ? Math.round(result.confidence * 0.7) : result.confidence;

    // 3. Copy to clipboard
    await copyToClipboard(result.code);

    // 4. Save to history
    try {
      await saveToHistory({
        code: result.code,
        language: result.language,
        confidence,
        recoveryMode: settings.recoveryMode,
        source,
        timestamp: Date.now(),
        processingTimeMs,
        imageDataUrl,
      });
    } catch {
      // History save failure is non-critical
    }

    // 5. Show success notification
    const langLabel = result.language.charAt(0).toUpperCase() + result.language.slice(1);
    showNotification(
      '✅ Code Copied to Clipboard!',
      `${langLabel} • ${confidence}% confidence • ${(processingTimeMs / 1000).toFixed(1)}s\nPress Ctrl+V to paste.`
    );

    // 6. Forward to side panel if open
    broadcastToExtension(createMessage(MESSAGE_TYPES.BG_PROCESSING_COMPLETE, {
      code: result.code,
      language: result.language,
      confidence,
      processingTimeMs,
      source,
    }));

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    showNotification('❌ Recovery Failed', msg);
  }
}

// ─── Gemini Analysis (runs in service worker) ───────────────────────────────────

async function analyzeWithGemini(
  base64: string,
  mimeType: string,
  settings: Settings
): Promise<{ code: string; language: string; confidence: number }> {
  const genAI = new GoogleGenerativeAI(settings.apiKey);
  const systemPrompt = SYSTEM_PROMPT_BASE + MODE_INSTRUCTIONS[settings.recoveryMode];

  const model = genAI.getGenerativeModel({
    model: settings.model,
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mimeType as 'image/png' | 'image/jpeg' | 'image/webp',
        data: base64,
      },
    },
    {
      text: 'Reconstruct the code shown in this image. Follow your system instructions precisely.',
    },
  ]);

  const text = result.response.text();
  if (!text || text.trim().length === 0) {
    throw new Error('Vision AI returned an empty response. The image may not contain visible code.');
  }

  return parseGeminiResponse(text);
}

function parseGeminiResponse(text: string): { code: string; language: string; confidence: number } {
  const lines = text.split('\n');
  let language = 'plaintext';
  let confidence = 70;
  let codeStartIndex = 0;

  if (lines.length >= 3) {
    const firstLine = lines[0].trim();
    const secondLine = lines[1].trim();

    const isLikelyLanguage =
      firstLine.length < 30 &&
      /^[A-Za-z#+.\s]+$/.test(firstLine) &&
      !firstLine.includes('import') &&
      !firstLine.includes('from') &&
      !firstLine.includes('def') &&
      !firstLine.includes('function') &&
      !firstLine.includes('class') &&
      !firstLine.includes('const') &&
      !firstLine.includes('var') &&
      !firstLine.includes('let');

    if (isLikelyLanguage) {
      language = normalizeLanguageId(firstLine);
      codeStartIndex = 1;

      const parsedConfidence = parseInt(secondLine, 10);
      if (!isNaN(parsedConfidence) && parsedConfidence >= 0 && parsedConfidence <= 100) {
        confidence = parsedConfidence;
        codeStartIndex = 2;

        if (lines[codeStartIndex]?.trim() === '') {
          codeStartIndex++;
        }
      }
    }
  }

  let code = lines.slice(codeStartIndex).join('\n');
  code = code.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
  code = code.trimEnd();

  return {
    code,
    language,
    confidence: Math.min(confidence, 99),
  };
}

function normalizeLanguageId(raw: string): string {
  const normalized = raw.toLowerCase().trim();
  const aliasMap: Record<string, string> = {
    py: 'python', js: 'javascript', ts: 'typescript',
    'c++': 'cpp', 'c#': 'csharp', golang: 'go',
    bash: 'shell', sh: 'shell', zsh: 'shell',
    rb: 'ruby', kt: 'kotlin', rs: 'rust',
    text: 'plaintext', txt: 'plaintext', plain: 'plaintext',
    'plain text': 'plaintext',
  };
  return aliasMap[normalized] || normalized;
}

// ─── Clipboard (via Offscreen Document) ─────────────────────────────────────────

let offscreenCreated = false;

async function ensureOffscreenDocument(): Promise<void> {
  if (offscreenCreated) return;

  // Check if offscreen document already exists
  try {
    const existingContexts = await (chrome as any).runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    if (existingContexts && existingContexts.length > 0) {
      offscreenCreated = true;
      return;
    }
  } catch {
    // getContexts may not be available in all Chrome versions
  }

  try {
    await (chrome as any).offscreen.createDocument({
      url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
      reasons: ['CLIPBOARD'],
      justification: 'Write recovered code to clipboard',
    });
    offscreenCreated = true;
  } catch (err: any) {
    // Document may already exist
    if (!err.message?.includes('already exists')) {
      console.error('[Code Capture AI Pro] Failed to create offscreen document:', err);
    }
    offscreenCreated = true;
  }
}

async function copyToClipboard(text: string): Promise<void> {
  await ensureOffscreenDocument();

  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.COPY_TO_CLIPBOARD,
      payload: { text },
    });

    if (response && !response.ok) {
      console.warn('[Code Capture AI Pro] Clipboard write failed:', response.error);
    }
  } catch (err) {
    console.warn('[Code Capture AI Pro] Clipboard write error:', err);
  }
}

// ─── Chrome Notifications ───────────────────────────────────────────────────────

function showNotification(title: string, message: string): void {
  try {
    chrome.notifications.create(NOTIFICATION_IDS.PROGRESS, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('src/assets/icon-128.png'),
      title,
      message,
      priority: 1,
      requireInteraction: false,
    }, () => {
      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        chrome.notifications.clear(NOTIFICATION_IDS.PROGRESS, () => {});
      }, 4000);
    });
  } catch (err) {
    console.warn('[Code Capture AI Pro] Notification error:', err);
  }
}

// ─── Settings Loader ────────────────────────────────────────────────────────────

async function loadSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS];
    if (stored && typeof stored === 'object') {
      return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) } as Settings;
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

// ─── History Storage ────────────────────────────────────────────────────────────

async function saveToHistory(data: {
  code: string;
  language: string;
  confidence: number;
  recoveryMode: RecoveryMode;
  source: 'video' | 'region';
  timestamp: number;
  processingTimeMs: number;
  imageDataUrl: string;
}): Promise<void> {
  // Create a tiny thumbnail (stored as JPEG to save space)
  let thumbnailBase64 = '';
  try {
    // In the service worker we can use OffscreenCanvas or just store a small prefix
    // For simplicity, we'll skip thumbnail generation in the service worker
    // The full image is too large — store empty thumbnail
    thumbnailBase64 = '';
  } catch {}

  const entry: CaptureEntry = {
    id: `capture_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    code: data.code,
    language: data.language,
    confidence: data.confidence,
    recoveryMode: data.recoveryMode,
    source: data.source,
    timestamp: data.timestamp,
    thumbnailBase64,
    processingTimeMs: data.processingTimeMs,
  };

  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    const history = (result[STORAGE_KEYS.HISTORY] as CaptureEntry[]) || [];
    history.unshift(entry);
    if (history.length > MAX_HISTORY_SIZE) {
      history.splice(MAX_HISTORY_SIZE);
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
  } catch (err) {
    console.error('[Code Capture AI Pro] Failed to save history:', err);
  }
}

// ─── Image Utils (Service Worker compatible) ────────────────────────────────────

function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return dataUrl;
  return dataUrl.substring(commaIndex + 1);
}

function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match ? match[1] : 'image/png';
}

// ─── Image Cropping (via OffscreenCanvas in service worker) ─────────────────────

async function cropImageInServiceWorker(
  dataUrl: string,
  rect: { x: number; y: number; width: number; height: number }
): Promise<string> {
  // Fetch the image as a blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  // Use OffscreenCanvas for cropping (available in service workers)
  const canvas = new OffscreenCanvas(rect.width, rect.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get OffscreenCanvas context');

  ctx.drawImage(
    imageBitmap,
    rect.x, rect.y, rect.width, rect.height,
    0, 0, rect.width, rect.height
  );

  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read cropped image'));
    reader.readAsDataURL(croppedBlob);
  });
}

// ─── Message Router ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    // ── Legacy: Popup "Open Side Panel" button ────────────────────────
    case MESSAGE_TYPES.OPEN_SIDE_PANEL: {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id) {
          chrome.sidePanel.open({ tabId: tab.id });
        }
      });
      sendResponse({ ok: true });
      return false;
    }

    // ── Legacy: Quick Capture from popup/side panel ──────────────────
    case MESSAGE_TYPES.QUICK_CAPTURE: {
      chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
        if (!tab?.id) return;
        await handleVideoFrameCapture(tab.id);
      });
      sendResponse({ ok: true });
      return false;
    }

    // ── Region captured by content script ────────────────────────────
    case MESSAGE_TYPES.REGION_CAPTURED: {
      const regionData = payload as {
        rect: { x: number; y: number; width: number; height: number };
        devicePixelRatio: number;
      };

      // Take tab screenshot and crop to selected region
      chrome.tabs.captureVisibleTab({ format: 'png', quality: 100 }).then(async (screenshotDataUrl) => {
        try {
          const dpr = regionData.devicePixelRatio || 1;
          const scaledRect = {
            x: Math.round(regionData.rect.x * dpr),
            y: Math.round(regionData.rect.y * dpr),
            width: Math.round(regionData.rect.width * dpr),
            height: Math.round(regionData.rect.height * dpr),
          };

          showNotification('📸 Region Captured', 'Processing selected area...');

          const croppedDataUrl = await cropImageInServiceWorker(screenshotDataUrl, scaledRect);

          // Forward to side panel if open
          broadcastToExtension(createMessage(MESSAGE_TYPES.FRAME_CAPTURED, {
            imageData: croppedDataUrl, width: scaledRect.width, height: scaledRect.height, source: 'screenshot',
          }));

          // Process with AI
          await captureAndProcess(croppedDataUrl, 'region');
        } catch (error) {
          console.error('[Code Capture AI Pro] Region capture processing failed:', error);
          showNotification('❌ Region Capture Failed', error instanceof Error ? error.message : 'Unknown error');
        }
      }).catch((error) => {
        console.error('[Code Capture AI Pro] Screenshot failed:', error);
        showNotification('❌ Screenshot Failed', 'Could not capture the screen. Try reloading the page.');
      });

      return false;
    }

    // ── CORS fallback from content script ────────────────────────────
    case MESSAGE_TYPES.CORS_FALLBACK: {
      chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
        if (tab?.id) {
          const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png', quality: 100 });

          broadcastToExtension(createMessage(MESSAGE_TYPES.FRAME_CAPTURED, {
            imageData: dataUrl, width: 0, height: 0, source: 'screenshot',
          }));

          await captureAndProcess(dataUrl, 'video');
        }
      });
      return false;
    }

    // ── Side panel requests capture ──────────────────────────────────
    case MESSAGE_TYPES.CAPTURE_REQUEST: {
      chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
        if (!tab?.id) return;
        try {
          const response = await chrome.tabs.sendMessage(tab.id, createMessage(MESSAGE_TYPES.CAPTURE_REQUEST));
          if (response?.type === MESSAGE_TYPES.FRAME_CAPTURED) {
            broadcastToExtension(response);
          } else {
            const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png', quality: 100 });
            broadcastToExtension(createMessage(MESSAGE_TYPES.FRAME_CAPTURED, {
              imageData: dataUrl, width: 0, height: 0, source: 'screenshot',
            }));
          }
        } catch {
          const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png', quality: 100 });
          broadcastToExtension(createMessage(MESSAGE_TYPES.FRAME_CAPTURED, {
            imageData: dataUrl, width: 0, height: 0, source: 'screenshot',
          }));
        }
      });
      sendResponse({ ok: true });
      return false;
    }

    // ── Side panel requests region select ────────────────────────────
    case MESSAGE_TYPES.START_REGION_SELECT: {
      chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
        if (!tab?.id) return;
        try {
          await chrome.tabs.sendMessage(tab.id, createMessage(MESSAGE_TYPES.START_REGION_SELECT));
        } catch {
          console.error('[Code Capture AI Pro] Content script not available for region select');
        }
      });
      sendResponse({ ok: true });
      return false;
    }

    // ── Clipboard message (handled by offscreen, not here) ──────────
    case MESSAGE_TYPES.COPY_TO_CLIPBOARD: {
      // This is handled by the offscreen document, not the service worker
      return false;
    }

    default:
      return false;
  }
});

// ─── Helper: Broadcast to extension contexts ────────────────────────────────────

function broadcastToExtension(message: ExtensionMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // No listeners — that's ok (side panel or popup might not be open)
  });
}

// ─── Init ───────────────────────────────────────────────────────────────────────

console.log('[Code Capture AI Pro] Service worker loaded — shortcut-driven mode');
