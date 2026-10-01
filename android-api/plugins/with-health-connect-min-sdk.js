const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Health Connect's client library declares minSdk 26, but the app must install
 * on Android 7.0 / API 24 (RNF-09). `tools:overrideLibrary` lets the manifest
 * merger accept it; the JS side (`src/lib/health-connect.ts`) only touches the
 * library when `Platform.Version >= 26`, so older phones never load it.
 */
const LIBRARIES = ['androidx.health.connect.client', 'dev.matinzd.healthconnect'];

module.exports = function withHealthConnectMinSdk(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const usesSdk = manifest['uses-sdk']?.[0] ?? { $: {} };
    const existing = (usesSdk.$['tools:overrideLibrary'] ?? '').split(',').filter(Boolean);
    usesSdk.$['tools:overrideLibrary'] = [...new Set([...existing, ...LIBRARIES])].join(',');
    manifest['uses-sdk'] = [usesSdk];
    return config;
  });
};
