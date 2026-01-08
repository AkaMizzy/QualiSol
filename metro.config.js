// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle expo-sqlite on web
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Provide an empty stub for expo-sqlite on web
    if (platform === "web" && moduleName === "expo-sqlite") {
      return {
        filePath: require.resolve("./stubs/expo-sqlite.web.js"),
        type: "sourceFile",
      };
    }

    // Provide localStorage-based stub for expo-secure-store on web
    if (platform === "web" && moduleName === "expo-secure-store") {
      return {
        filePath: require.resolve("./stubs/expo-secure-store.web.js"),
        type: "sourceFile",
      };
    }

    // Use default resolution for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
