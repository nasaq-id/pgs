import { safeJSONParse } from "./json";

const shrinkBase64InObject = (obj: any, limit: number): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/') && obj.includes(';base64,')) {
      if (obj.length > limit) {
        console.warn(`[SafeStorage] Shrinking huge base64 image (size: ${obj.length} chars) to transparent GIF.`);
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
    // Fallback if not valid JSON string
    if (str.startsWith('data:image/') && str.includes(';base64,')) {
      if (str.length > limit) {
        console.warn(`[SafeStorage] Shrinking huge raw base64 image for key "${key}" (size: ${str.length} chars) to transparent GIF.`);
        return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    }
    return str;
  }
};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Failed to read key "${key}" from localStorage:`, e);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    let processedValue = value;
    try {
      processedValue = shrinkBase64Images(key, value);
    } catch (procErr) {
      console.error(`[SafeStorage] Error preprocessing value:`, procErr);
    }

    try {
      localStorage.setItem(key, processedValue);
      return true;
    } catch (e: any) {
      console.warn(`[SafeStorage] Failed to write key "${key}" to localStorage:`, e);
      
      // Check for quota exceeded error across different browsers
      const isQuotaError = 
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 || 
        e.code === 1014 || // Firefox private browsing code
        e.number === 0x8007000E ||
        (e.message && e.message.toLowerCase().includes('quota')) ||
        (e.message && e.message.toLowerCase().includes('limit'));

      if (isQuotaError) {
        console.warn(`[SafeStorage] Storage quota exceeded when writing "${key}". Cleaning up non-critical items...`);
        try {
          // List of non-critical keys to remove in order of priority to free up space
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
              localStorage.removeItem(k);
              console.log(`[SafeStorage] Pruned non-critical key: ${k}`);
            } catch (rmErr) {}
          }
          
          // Try setting again after pruning
          localStorage.setItem(key, processedValue);
          console.log(`[SafeStorage] Successfully saved key "${key}" after pruning.`);
          return true;
        } catch (retryErr) {
          console.error(`[SafeStorage] Failed to set key "${key}" even after pruning:`, retryErr);
          return false;
        }
      }
      return false;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Failed to remove key "${key}" from localStorage:`, e);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn("[SafeStorage] Failed to clear localStorage:", e);
    }
  }
};
