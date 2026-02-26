import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAnalytics,
  logEvent,
  Analytics,
  isSupported,
} from 'firebase/analytics';

// ─── Firebase Config ──────────────────────────────────────────────────────────
// Replace these values with your own from Firebase Console:
// https://console.firebase.google.com → Project Settings → Your apps → SDK setup
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? '',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         ?? '',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID          ?? '',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET      ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID              ?? '',
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID      ?? '',
};

// ─── Singleton init ───────────────────────────────────────────────────────────
let app: FirebaseApp;
let analytics: Analytics | null = null;

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    const firebaseApp = getFirebaseApp();
    analytics = getAnalytics(firebaseApp);
    return analytics;
  } catch {
    return null;
  }
}

// ─── Event Types ──────────────────────────────────────────────────────────────
export type FileType = 'image/jpeg' | 'image/png' | 'application/pdf';

export interface UploadEventParams {
  file_type: FileType;
  file_size_kb: number;
}

export interface CompressStartParams {
  file_type: FileType;
  original_size_kb: number;
  target_size_kb: number;
  reduction_target_pct: number;
}

export interface CompressSuccessParams {
  file_type: FileType;
  original_size_kb: number;
  compressed_size_kb: number;
  reduction_pct: number;
  within_target: boolean;
}

export interface CompressErrorParams {
  file_type: FileType;
  error_message: string;
}

export interface DownloadParams {
  file_type: FileType;
  compressed_size_kb: number;
  reduction_pct: number;
}

// ─── Typed Event Helpers ──────────────────────────────────────────────────────
async function track(eventName: string, params?: Record<string, unknown>): Promise<void> {
  const a = await getFirebaseAnalytics();
  if (!a) return;
  logEvent(a, eventName, params as Record<string, string | number | boolean>);
}

export const analytics_events = {
  /** User lands on the page */
  pageView: () => track('page_view', { page_title: 'CompressToLimit' }),

  /** File successfully selected & validated */
  fileUploaded: (p: UploadEventParams) =>
    track('file_uploaded', {
      file_type:    p.file_type,
      file_size_kb: Math.round(p.file_size_kb),
    }),

  /** User clicks "Compress Now" */
  compressStarted: (p: CompressStartParams) =>
    track('compress_started', {
      file_type:            p.file_type,
      original_size_kb:     Math.round(p.original_size_kb),
      target_size_kb:       Math.round(p.target_size_kb),
      reduction_target_pct: Math.round(p.reduction_target_pct),
    }),

  /** Compression finished successfully */
  compressSuccess: (p: CompressSuccessParams) =>
    track('compress_success', {
      file_type:         p.file_type,
      original_size_kb:  Math.round(p.original_size_kb),
      compressed_size_kb: Math.round(p.compressed_size_kb),
      reduction_pct:     parseFloat(p.reduction_pct.toFixed(1)),
      within_target:     p.within_target,
    }),

  /** Compression threw an error */
  compressError: (p: CompressErrorParams) =>
    track('compress_error', {
      file_type:     p.file_type,
      error_message: p.error_message.slice(0, 100),
    }),

  /** User downloads the compressed file */
  fileDownloaded: (p: DownloadParams) =>
    track('file_downloaded', {
      file_type:          p.file_type,
      compressed_size_kb: Math.round(p.compressed_size_kb),
      reduction_pct:      parseFloat(p.reduction_pct.toFixed(1)),
    }),

  /** User clicks Re-compress */
  recompressClicked: () => track('recompress_clicked'),

  /** User removes file and starts over */
  fileRemoved: () => track('file_removed'),
};
