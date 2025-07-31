const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/** @type {import('@react-native/metro-config').MetroConfig} */

const config = {};
const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.unstable_enablePackageExports = false;
module.exports = mergeConfig(defaultConfig, config);
