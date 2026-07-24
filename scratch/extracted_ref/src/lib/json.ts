export const safeJSONParse = (str: any, fallback: any = null) => {
  if (str === undefined || str === null) return fallback;
  if (typeof str !== 'string') return str;
  const trimmed = str.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '"undefined"' || trimmed === '"null"') {
    return fallback;
  }
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return fallback;
  }
};
