const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      // Optionally enable React Refresh for faster development
      babel: {
        dangerouslyAddModulePathsToTranspile: ["@expo/vector-icons"],
      },
    },
    argv
  );

  // Exclude expo-sqlite from web bundle
  config.resolve.alias = {
    ...config.resolve.alias,
    "expo-sqlite": false,
  };

  return config;
};
