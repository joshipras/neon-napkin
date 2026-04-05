const bundleIdentifier = process.env.APP_BUNDLE_IDENTIFIER || 'com.comedywriting.app';
const appScheme = process.env.APP_SCHEME || 'comedywriting';
const appName = process.env.APP_NAME || 'On Deck: Joke Writing & Mics';
const appSlug = process.env.APP_SLUG || 'comedy-writing';
const easProjectId =
  process.env.EAS_PROJECT_ID || 'aac3137f-732c-4c3b-8f51-a5d86081d92d';
const appleTeamId = process.env.APPLE_TEAM_ID || '29BRJGDHT5';

module.exports = () => ({
  expo: {
    name: appName,
    slug: appSlug,
    version: '1.0.0',
    sdkVersion: '54.0.0',
    scheme: appScheme,
    orientation: 'portrait',
    assetBundlePatterns: ['**/*'],
    icon: './assets/app-icon.png',
    description:
      'A rehearsal workspace for comics to write jokes, track open mics, record sets, and sync notes across phone and web.',
    ios: {
      bundleIdentifier,
      supportsTablet: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription:
          'On Deck uses the microphone so you can record rehearsals and live sets inside each joke page.',
        NSLocationWhenInUseUsageDescription:
          'On Deck uses your location to label recordings with nearby venues and help you find open mics around you.',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      appleTeamId,
      eas: {
        projectId: easProjectId,
      },
    },
  },
});
