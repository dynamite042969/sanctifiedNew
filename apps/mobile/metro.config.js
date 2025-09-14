// apps/mobile/metro.config.js
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// allow monorepo root node_modules
defaultConfig.watchFolders = [path.resolve(__dirname, '../../')];
defaultConfig.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../', 'node_modules'),
];
defaultConfig.resolver.unstable_enableSymlinks = true;

module.exports = mergeConfig(defaultConfig, {});
