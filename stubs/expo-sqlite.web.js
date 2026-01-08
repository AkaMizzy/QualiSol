// Empty stub for expo-sqlite on web platform
// This prevents the bundler from trying to load the WebAssembly module

module.exports = {
  openDatabaseAsync: async () => null,
  openDatabaseSync: () => null,
  deleteDatabaseAsync: async () => {},
  deleteDatabaseSync: () => {},
};
