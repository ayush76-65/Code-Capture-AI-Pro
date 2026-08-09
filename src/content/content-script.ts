/**
 * Content script injected into all pages.
 * Handles video detection, frame extraction, and region selection trigger.
 */

import {
  MESSAGE_TYPES,
  createMessage,
  type FrameCapturedPayload,
  type VideoInfoPayload,
} from '@/shared/messages';

// ─── Video Detection ───────────────────────────────────────────────────────────

function findPrimaryVideo(): HTMLVideoElement | null {
  const videos = Array.from(document.querySelectorAll('video'));

  if (videos.length === 0) return null;

  // Prefer the largest visible playing video
  const candidates = videos
    .filter((v) => {
      const rect = v.getBoundingClientRect();
      return rect.width > 50 && rect.height > 50;
    })
    .sort((a, b) => {
      // Prefer playing videos
      const aPlaying = !a.paused && !a.ended ? 1 : 0;
      const bPlaying = !b.paused && !b.ended ? 1 : 0;
      if (aPlaying !== bPlaying) return bPlaying - aPlaying;

      // Then by area
      const aArea = a.videoWidth * a.videoHeight;
      const bArea = b.videoWidth * b.videoHeight;
      return bArea - aArea;
    });

  return candidates[0] || videos[0] || null;
}

function getVideoInfo(): VideoInfoPayload {
  const video = findPrimaryVideo();
  if (!video) {
    return { found: false, width: 0, height: 0, currentTime: 0, src: '' };
  }

  return {
    found: true,
    width: video.videoWidth || video.clientWidth,
    height: video.videoHeight || video.clientHeight,
    currentTime: video.currentTime,
    src: video.src || video.currentSrc || '',
  };
}

// ─── Frame Capture ─────────────────────────────────────────────────────────────

function captureVideoFrame(): FrameCapturedPayload | null {
  const video = findPrimaryVideo();
  if (!video) return null;

  const width = video.videoWidth || video.clientWidth;
  const height = video.videoHeight || video.clientHeight;

  if (width === 0 || height === 0) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    // Test if canvas is tainted (CORS)
    const imageData = canvas.toDataURL('image/png');

    return {
      imageData,
      width,
      height,
      source: 'video',
    };
  } catch (error) {
    // Canvas is tainted due to CORS
    console.warn('[Code Capture AI Pro] CORS restriction on video frame capture:', error);
    return null;
  }
}

// ─── Region Selector ───────────────────────────────────────────────────────────

let regionSelector: RegionSelector | null = null;

class RegionSelector {
  private overlay: HTMLDivElement;
  private selectionBox: HTMLDivElement;
  private startX = 0;
  private startY = 0;
  private isSelecting = false;
  private onComplete: ((rect: DOMRect) => void) | null = null;
  private onCancel: (() => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.selectionBox = document.createElement('div');
    this.setupOverlay();
    this.setupSelectionBox();
  }

  private setupOverlay(): void {
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '2147483647',
      cursor: 'crosshair',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      userSelect: 'none',
    });

    // Instruction label
    const label = document.createElement('div');
    Object.assign(label.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 20px',
      backgroundColor: 'rgba(13, 17, 23, 0.9)',
      color: '#e6edf3',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '1px solid #30363d',
      zIndex: '2147483647',
      pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    });
    label.textContent = 'Drag to select code region • ESC to cancel';
    this.overlay.appendChild(label);
  }

  private setupSelectionBox(): void {
    Object.assign(this.selectionBox.style, {
      position: 'fixed',
      border: '2px solid #238636',
      backgroundColor: 'rgba(35, 134, 54, 0.1)',
      zIndex: '2147483647',
      pointerEvents: 'none',
      display: 'none',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
    });
  }

  start(): Promise<DOMRect | null> {
    return new Promise((resolve) => {
      this.onComplete = (rect) => {
        this.cleanup();
        resolve(rect);
      };
      this.onCancel = () => {
        this.cleanup();
        resolve(null);
      };

      document.body.appendChild(this.overlay);
      document.body.appendChild(this.selectionBox);

      this.overlay.addEventListener('mousedown', this.handleMouseDown);
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      document.addEventListener('keydown', this.handleKeyDown);
    });
  }

  private handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${e.clientX}px`;
    this.selectionBox.style.top = `${e.clientY}px`;
    this.selectionBox.style.width = '0';
    this.selectionBox.style.height = '0';
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isSelecting) return;
    e.preventDefault();

    const x = Math.min(this.startX, e.clientX);
    const y = Math.min(this.startY, e.clientY);
    const w = Math.abs(e.clientX - this.startX);
    const h = Math.abs(e.clientY - this.startY);

    Object.assign(this.selectionBox.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
    });
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (!this.isSelecting) return;
    this.isSelecting = false;

    const x = Math.min(this.startX, e.clientX);
    const y = Math.min(this.startY, e.clientY);
    const w = Math.abs(e.clientX - this.startX);
    const h = Math.abs(e.clientY - this.startY);

    // Minimum selection size
    if (w < 20 || h < 20) {
      this.onCancel?.();
      return;
    }

    const rect = new DOMRect(x, y, w, h);
    this.onComplete?.(rect);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.onCancel?.();
    }
  };

  private cleanup(): void {
    this.overlay.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);

    this.overlay.remove();
    this.selectionBox.remove();
    this.isSelecting = false;
    this.onComplete = null;
    this.onCancel = null;
  }
}

// ─── Message Handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type } = message;

  switch (type) {
    // ── Capture video frame (used by both Alt+V and legacy flows) ────
    case MESSAGE_TYPES.CAPTURE_VIDEO_FRAME:
    case MESSAGE_TYPES.CAPTURE_REQUEST: {
      // Try to capture video frame first
      const frame = captureVideoFrame();
      if (frame) {
        sendResponse(createMessage(MESSAGE_TYPES.FRAME_CAPTURED, frame));
      } else {
        // No video or CORS failure — request screenshot from background
        sendResponse(createMessage(MESSAGE_TYPES.CORS_FALLBACK, {
          reason: findPrimaryVideo()
            ? 'Video frame capture blocked by CORS. Using tab screenshot fallback.'
            : 'No video element found on this page.',
        }));
      }
      return false;
    }

    // ── Start region selection (Alt+C or side panel button) ──────────
    case MESSAGE_TYPES.START_REGION_SELECT: {
      // Start region selection asynchronously
      if (regionSelector) return false;

      regionSelector = new RegionSelector();
      regionSelector.start().then((rect) => {
        regionSelector = null;

        if (!rect) {
          // User cancelled
          return;
        }

        // Send the selection rect to background — it will take a screenshot and crop
        chrome.runtime.sendMessage(
          createMessage(MESSAGE_TYPES.REGION_CAPTURED, {
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
            devicePixelRatio: window.devicePixelRatio || 1,
          })
        );
      });

      sendResponse({ ok: true });
      return false;
    }

    // ── Video info request (side panel) ─────────────────────────────
    case MESSAGE_TYPES.REQUEST_VIDEO_INFO: {
      sendResponse(createMessage(MESSAGE_TYPES.VIDEO_INFO, getVideoInfo()));
      return false;
    }

    default:
      return false;
  }
});

// Indicate content script is loaded
console.log('[Code Capture AI Pro] Content script loaded');
