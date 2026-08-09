/**
 * Typed message definitions for chrome.runtime messaging between
 * content script, background service worker, side panel, and popup.
 */

export const MESSAGE_TYPES = {
  // Background → Content Script
  CAPTURE_REQUEST: 'CAPTURE_REQUEST',
  START_REGION_SELECT: 'START_REGION_SELECT',
  CAPTURE_VIDEO_FRAME: 'CAPTURE_VIDEO_FRAME',

  // Content Script → Background → Side Panel
  FRAME_CAPTURED: 'FRAME_CAPTURED',
  REGION_CAPTURED: 'REGION_CAPTURED',
  CORS_FALLBACK: 'CORS_FALLBACK',
  NO_VIDEO_FOUND: 'NO_VIDEO_FOUND',
  VIDEO_INFO: 'VIDEO_INFO',

  // Background internal
  TAB_SCREENSHOT: 'TAB_SCREENSHOT',

  // Side Panel → Background → Content Script
  REQUEST_VIDEO_INFO: 'REQUEST_VIDEO_INFO',

  // Popup → Background
  OPEN_SIDE_PANEL: 'OPEN_SIDE_PANEL',
  QUICK_CAPTURE: 'QUICK_CAPTURE',

  // Background ↔ Offscreen document (clipboard)
  COPY_TO_CLIPBOARD: 'COPY_TO_CLIPBOARD',
  CLIPBOARD_RESULT: 'CLIPBOARD_RESULT',

  // Background processing status (for optional side panel forwarding)
  BG_PROCESSING_COMPLETE: 'BG_PROCESSING_COMPLETE',
  BG_PROCESSING_STATUS: 'BG_PROCESSING_STATUS',
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface FrameCapturedPayload {
  imageData: string;
  width: number;
  height: number;
  source: 'video' | 'screenshot';
}

export interface RegionCapturedPayload {
  imageData: string;
  width: number;
  height: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VideoInfoPayload {
  found: boolean;
  width: number;
  height: number;
  currentTime: number;
  src: string;
}

export interface CorsFallbackPayload {
  reason: string;
}

export function createMessage(type: MessageType, payload?: unknown): ExtensionMessage {
  return { type, payload };
}
