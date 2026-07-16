// Safe localStorage wrapper to prevent crashes in cross-origin iframes (e.g., Incognito/Anonymous mode)
let storageAvailable = false;

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    storageAvailable = true;
  }
} catch (e) {
  storageAvailable = false;
}

const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    if (storageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn('safeStorage: error getting item from localStorage, falling back to memory', e);
      }
    }
    return key in memoryStore ? memoryStore[key] : null;
  },

  setItem(key: string, value: string): void {
    if (storageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn('safeStorage: error setting item in localStorage, falling back to memory', e);
      }
    }
    memoryStore[key] = String(value);
  },

  removeItem(key: string): void {
    if (storageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn('safeStorage: error removing item from localStorage, falling back to memory', e);
      }
    }
    delete memoryStore[key];
  },

  clear(): void {
    if (storageAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        console.warn('safeStorage: error clearing localStorage, falling back to memory', e);
      }
    }
    for (const key in memoryStore) {
      delete memoryStore[key];
    }
  }
};
