// Metro config: lets the app import the shared, tested checker from ../src/lib
// (the same code the server uses).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const sharedLib = path.resolve(__dirname, "../src/lib");

config.watchFolders = [...(config.watchFolders ?? []), sharedLib];

// Package imports made by the shared checker (e.g. "tldts") resolve from THIS app's node_modules,
// not the server's, so the bundle never reaches outside the watched folders.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromShared = context.originModulePath.startsWith(sharedLib + path.sep);
  const isPackage = !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
  const ctx = fromShared && isPackage ? { ...context, originModulePath: path.join(__dirname, "package.json") } : context;
  return (defaultResolve ?? context.resolveRequest)(ctx, moduleName, platform);
};

module.exports = config;
