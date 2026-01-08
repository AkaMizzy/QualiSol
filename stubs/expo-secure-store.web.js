// Empty stub for expo-secure-store on web platform
// Uses localStorage as a fallback for web

const storage = typeof window !== "undefined" ? window.localStorage : null;

module.exports = {
  getItemAsync: async (key) => {
    if (!storage) return null;
    return storage.getItem(key);
  },
  setItemAsync: async (key, value) => {
    if (!storage) return;
    storage.setItem(key, value);
  },
  deleteItemAsync: async (key) => {
    if (!storage) return;
    storage.removeItem(key);
  },
  // Legacy method names
  getValueWithKeyAsync: async (key) => {
    if (!storage) return null;
    return storage.getItem(key);
  },
  setValueWithKeyAsync: async (value, key) => {
    if (!storage) return;
    storage.setItem(key, value);
  },
  deleteValueWithKeyAsync: async (key) => {
    if (!storage) return;
    storage.removeItem(key);
  },
};
