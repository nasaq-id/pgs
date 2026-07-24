import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global localStorage safety patch to prevent QuotaExceededError from crashing the app
try {
  const shrinkBase64InObject = (obj: any, limit: number): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      if (obj.startsWith('data:image/') && obj.includes(';base64,')) {
        if (obj.length > limit) {
          console.warn(`[LocalStoragePatch] Shrinking huge base64 image (size: ${obj.length} chars) to transparent GIF.`);
          return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => shrinkBase64InObject(item, limit));
    }
    if (typeof obj === 'object') {
      const newObj: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = shrinkBase64InObject(obj[key], limit);
        }
      }
      return newObj;
    }
    return obj;
  };

  const shrinkBase64Images = (key: string, str: string): string => {
    // For custom template bg, allow up to 650,000 chars (approx 500KB)
    // For other keys (teachers, students, etc), allow up to 133,000 chars (approx 100KB)
    const limit = key === 'mts_custom_template_bg' ? 650000 : 133000;
    
    try {
      const parsed = JSON.parse(str);
      const cleaned = shrinkBase64InObject(parsed, limit);
      return JSON.stringify(cleaned);
    } catch (e) {
      if (str.startsWith('data:image/') && str.includes(';base64,')) {
        if (str.length > limit) {
          console.warn(`[LocalStoragePatch] Shrinking huge raw base64 image for key "${key}" (size: ${str.length} chars) to transparent GIF.`);
          return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }
      }
      return str;
    }
  };

  const originalSetItem = window.localStorage.setItem;
  window.localStorage.setItem = function (key: string, value: string) {
    let processedValue = value;
    try {
      processedValue = shrinkBase64Images(key, value);
    } catch (procErr) {
      console.error('[LocalStoragePatch] Error preprocessing value:', procErr);
    }

    try {
      originalSetItem.call(window.localStorage, key, processedValue);
    } catch (e: any) {
      console.warn(`[LocalStoragePatch] Failed to set "${key}":`, e);

      const isQuotaError =
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 ||
        e.code === 1014 ||
        e.number === 0x8007000E ||
        (e.message && e.message.toLowerCase().includes('quota')) ||
        (e.message && e.message.toLowerCase().includes('limit'));

      if (isQuotaError) {
        console.warn(`[LocalStoragePatch] Storage quota exceeded for "${key}". Cleaning up non-critical items...`);
        try {
          const keysToPrune = [
            'mts_custom_template_bg',
            'mts_notifications',
            'mts_log_poin_siswa',
            'mts_asesmen_submissions',
            'mts_asesmen_comments',
            'mts_emateri',
            'mts_journals',
            'mts_presensi'
          ];

          for (const k of keysToPrune) {
            try {
              window.localStorage.removeItem(k);
            } catch (rmErr) {}
          }

          // Try setting again after pruning
          originalSetItem.call(window.localStorage, key, processedValue);
          console.log(`[LocalStoragePatch] Successfully set "${key}" after pruning.`);
        } catch (retryErr) {
          console.error(`[LocalStoragePatch] Still failed to set "${key}" even after pruning:`, retryErr);
        }
      }
    }
  };
} catch (patchErr) {
  console.error('[LocalStoragePatch] Failed to apply global localStorage patch:', patchErr);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
